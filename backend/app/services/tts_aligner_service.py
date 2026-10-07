# app/services/tts_aligner_service.py
import os
import subprocess
import json
import requests
import tempfile
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import logging
import numpy as np
from pydub import AudioSegment
from app.core.config import OUTPUT_DIR

try:
    import soundfile as sf
except Exception:
    sf = None

logger = logging.getLogger("app.services.tts_aligner_service")

# Global singleton cho local XTTS model
_xtts_model_instance = None

def get_xtts_model():
    """Lazy load singleton instance của XTTS-v2 in-process trong Celery worker."""
    global _xtts_model_instance
    if _xtts_model_instance is not None:
        return _xtts_model_instance

    logger.info("[Coqui XTTS-v2] Khởi tạo mô hình XTTS-v2 cục bộ trong Celery Worker...")
    try:
        import torch
        from packaging import version
        import transformers.utils.import_utils as _u
        import transformers.pytorch_utils as _tpu

        # Compatibility shims giữa transformers 4.46+ và coqui-tts
        if not hasattr(_u, "is_torch_greater_or_equal"):
            _u.is_torch_greater_or_equal = lambda v: version.parse(torch.__version__.split('+')[0]) >= version.parse(v)
        if not hasattr(_u, "is_torchcodec_available"):
            _u.is_torchcodec_available = lambda: False
        if not hasattr(_tpu, "isin_mps_friendly"):
            _tpu.isin_mps_friendly = torch.isin

        os.environ["COQUI_TOS_AGREED"] = "1"
        from TTS.api import TTS

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"[Coqui XTTS-v2] Đang tải weights mô hình lên device: {device}")
        _xtts_model_instance = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
        logger.info("[Coqui XTTS-v2] Tải mô hình thành công và sẵn sàng phục vụ.")
        return _xtts_model_instance
    except Exception as e:
        logger.exception(f"[Coqui XTTS-v2] Lỗi khởi tạo mô hình XTTS: {e}")
        raise RuntimeError(f"Không thể khởi tạo mô hình Coqui XTTS-v2 cục bộ: {e}")


class TTSAlignerService:
    def __init__(self, tts_api_url: str = None):
        self.tts_api_url = tts_api_url or os.getenv("TTS_API_URL", "http://tts-service:8001/generate_tts")
        logger.info(f"TTSAlignerService initialized with API: {self.tts_api_url}")

    def generate_tts_with_alignment(
        self,
        segments: List[Dict[str, Any]],
        output_path: str,
        temp_dir: str,
        vocal_path: Optional[str] = None,
        tgt_lang: str = "en",
        video_id: Optional[int] = None,
        voice_id: Optional[str] = None,
        model: Optional[str] = None,
        progress_callback: Optional[Any] = None
    ) -> str:
        """
        Generate TTS for each segment, save chunks 1:1, generate manifest.json,
        and combine into master audio file.
        """
        if not segments:
            raise ValueError("No segments provided for TTS generation")
        
        logger.info(f"Generating TTS for {len(segments)} segments, target language: {tgt_lang}, video_id: {video_id}, voice_id: {voice_id}, model: {model}")
        
        # Determine persistent chunks directory
        if video_id:
            chunks_dir = OUTPUT_DIR / f"tts_{video_id}" / tgt_lang / "chunks"
        else:
            chunks_dir = Path(temp_dir) / "chunks"
        chunks_dir.mkdir(parents=True, exist_ok=True)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Extract voice profile once for all segments
        speaker_wav_data = None
        if vocal_path and os.path.exists(vocal_path):
            logger.info(f"Using vocal track for voice cloning: {vocal_path}")
            speaker_wav_data = self._get_speaker_wav(vocal_path)
        
        if speaker_wav_data is None:
            logger.warning("No speaker voice provided, using default voice")
        
        # Generate TTS for each segment
        audio_segments = []
        manifest_chunks = []
        
        total_segs = len(segments)
        for idx, seg in enumerate(segments):
            text = seg.get("translated_text", seg.get("text", ""))
            if not text or len(text.strip()) < 1:
                logger.warning(f"Segment {idx} has empty text, skipping")
                continue
            
            try:
                # Generate TTS with speaker voice
                audio_data = self._call_tts_service(
                    text,
                    tgt_lang,
                    speaker_wav_data,
                    voice_id=voice_id,
                    model=model,
                    segment_idx=idx + 1,
                    total_segments=total_segs
                )
                
                # Dedicated chunk path
                chunk_filename = f"seg_{idx:04d}.wav"
                chunk_path = str(chunks_dir / chunk_filename)
                
                if audio_data is None or sf is None:
                    raise RuntimeError(f"Không thể tạo âm thanh cho đoạn {idx+1}/{total_segs}.")

                sf.write(chunk_path, audio_data, 22050)
                audio_seg = AudioSegment.from_file(chunk_path)
                
                # Get original duration
                original_duration = float(seg.get("end", 0)) - float(seg.get("start", 0))
                speed_factor = 1.0
                if original_duration > 0:
                    current_duration = len(audio_seg) / 1000.0
                    if current_duration > original_duration * 1.15 or current_duration < original_duration * 0.85:
                        speed_factor = max(0.5, min(2.0, current_duration / original_duration))
                        audio_seg = self._time_stretch_audio(audio_seg, speed_factor)
                        # Re-export stretched chunk
                        audio_seg.export(chunk_path, format="wav")
                        logger.info(f"Time-stretched segment {idx}: {current_duration:.2f}s -> {len(audio_seg)/1000:.2f}s (factor: {speed_factor:.2f})")
                
                audio_segments.append((float(seg.get("start", 0)), audio_seg))
                
                # Hash text for change detection
                text_hash = hashlib.md5(text.strip().encode("utf-8")).hexdigest()[:10]
                
                manifest_chunks.append({
                    "id": idx,
                    "segment_id": seg.get("id", idx),
                    "start": float(seg.get("start", 0)),
                    "end": float(seg.get("end", 0)),
                    "duration": round(len(audio_seg) / 1000.0, 3),
                    "target_duration": round(original_duration, 3),
                    "text": text,
                    "hash": text_hash,
                    "file_name": chunk_filename,
                    "file_path": chunk_path,
                    "speed_factor": round(speed_factor, 2),
                    "updated_at": datetime.utcnow().isoformat()
                })
                
                if progress_callback and len(segments) > 0:
                    pct = min(100, int(((idx + 1) / len(segments)) * 100))
                    try:
                        progress_callback(pct, idx + 1, len(segments))
                    except Exception as cb_err:
                        logger.warning(f"TTS progress callback failed: {cb_err}")
                
            except Exception as e:
                logger.error(f"Failed to generate TTS for segment {idx}: {e}")
                raise e
        
        if not audio_segments:
            raise Exception("No TTS segments were generated successfully")
        
        # Combine all segments with silence gaps
        combined_audio = self._combine_audio_segments(audio_segments)
        
        # Export combined audio
        combined_audio.export(output_path, format="wav")
        logger.info(f"TTS generated successfully: {output_path} ({os.path.getsize(output_path)} bytes)")
        
        # Verify file is valid
        if os.path.getsize(output_path) < 1024:
            raise Exception(f"TTS file is too small ({os.path.getsize(output_path)} bytes), generation failed")
        
        # Write manifest.json
        manifest_data = {
            "video_id": video_id,
            "language": tgt_lang,
            "total_segments": len(manifest_chunks),
            "master_audio_path": output_path,
            "chunks_dir": str(chunks_dir),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "chunks": manifest_chunks
        }
        
        manifest_paths = [
            chunks_dir / "manifest.json",
            Path(os.path.dirname(output_path)) / f"manifest_{tgt_lang}.json"
        ]
        for mp in manifest_paths:
            try:
                with open(mp, "w", encoding="utf-8") as mf:
                    json.dump(manifest_data, mf, indent=2, ensure_ascii=False)
            except Exception as m_err:
                logger.warning(f"Could not save manifest to {mp}: {m_err}")
        
        # Sync chunks & manifest to S3 if storage_manager is available
        if video_id:
            try:
                from app.services.s3_service import storage_manager
                for chunk_info in manifest_chunks:
                    c_key = f"dubbing/{video_id}/{tgt_lang}/chunks/{chunk_info['file_name']}"
                    storage_manager.upload_file(chunk_info["file_path"], c_key, content_type="audio/wav")
                m_key = f"dubbing/{video_id}/{tgt_lang}/manifest.json"
                storage_manager.upload_file(str(chunks_dir / "manifest.json"), m_key, content_type="application/json")
                logger.info(f"Uploaded {len(manifest_chunks)} TTS chunks & manifest to Object Storage")
            except Exception as s3_err:
                logger.warning(f"Could not upload TTS chunks to S3: {s3_err}")
        
        return output_path

    def _call_tts_service(
        self,
        text: str,
        tgt_lang: str,
        speaker_wav_data: Optional[bytes] = None,
        voice_id: Optional[str] = None,
        model: Optional[str] = None,
        segment_idx: Optional[int] = None,
        total_segments: Optional[int] = None
    ) -> Optional[np.ndarray]:
        """Call the TTS service to generate audio with voice cloning or ElevenLabs API."""
        try:
            seg_info = f"[{segment_idx}/{total_segments}]" if (segment_idx and total_segments) else (f"[{segment_idx}]" if segment_idx else "")

            clean_model = (model or "").lower().strip()
            eleven_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
            is_elevenlabs = "eleven" in clean_model or (voice_id and "eleven" in voice_id.lower())
            is_edge = "edge" in clean_model
            is_xtts = ("xtts" in clean_model or "coqui" in clean_model)
            # If user hasn't specified any model, default based on voice_id or provider
            if not is_edge and not is_xtts and not is_elevenlabs:
                if speaker_wav_data is not None:
                    is_xtts = True
                else:
                    is_edge = True

            # ------------------------------------------------------------------
            # 1. ElevenLabs API Branch
            # ------------------------------------------------------------------
            if is_elevenlabs:
                if not eleven_key:
                    raise RuntimeError("ElevenLabs API Key chưa được cấu hình. Vui lòng kiểm tra cài đặt ELEVENLABS_API_KEY.")
                eleven_voice = voice_id.replace("eleven_", "") if voice_id and voice_id.startswith("eleven_") else (voice_id or "21m00Tcm4TlvDq8ikWAM")
                eleven_url = f"https://api.elevenlabs.io/v1/text-to-speech/{eleven_voice}"
                eleven_headers = {
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": eleven_key,
                }
                eleven_payload = {
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                }
                logger.info(f"[ElevenLabs] {seg_info} [voice: {eleven_voice}] [lang: {tgt_lang}] Generating speech...")
                res = requests.post(eleven_url, json=eleven_payload, headers=eleven_headers, timeout=60)
                if res.status_code == 200:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
                        f.write(res.content)
                        temp_mp3 = f.name
                    try:
                        pydub_seg = AudioSegment.from_file(temp_mp3)
                        wav_temp = temp_mp3.replace(".mp3", ".wav")
                        pydub_seg.export(wav_temp, format="wav")
                        audio, sr = sf.read(wav_temp)
                        if sr != 22050:
                            from scipy import signal
                            audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                        if os.path.exists(wav_temp):
                            os.unlink(wav_temp)
                        return audio
                    finally:
                        if os.path.exists(temp_mp3):
                            os.unlink(temp_mp3)
                else:
                    err_detail = res.text[:200]
                    logger.error(f"[ElevenLabs] Service error {res.status_code}: {err_detail}")
                    raise RuntimeError(f"ElevenLabs API trả về lỗi ({res.status_code}): {err_detail}")

            # ------------------------------------------------------------------
            # 2. Coqui XTTS-v2 Voice Cloning Branch
            # ------------------------------------------------------------------
            if is_xtts:
                xtts_supported = {"en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh", "zh-cn", "ja", "hu", "ko", "hi"}
                clean_target = (tgt_lang or "").lower().split("_")[0].strip()
                if clean_target not in xtts_supported:
                    raise RuntimeError(f"Mô hình Coqui XTTS-v2 không hỗ trợ ngôn ngữ '{tgt_lang}'. Vui lòng chọn Microsoft Edge-TTS hoặc ElevenLabs.")

                # Chạy inference trực tiếp bằng local XTTS model trong worker
                try:
                    logger.info(f"[Coqui XTTS-v2] {seg_info} [voice_clone: {'provided' if speaker_wav_data else 'default'}] [lang: {tgt_lang}] Generating speech locally...")
                    tts_model = get_xtts_model()

                    # Chuẩn bị file audio speaker wav mẫu
                    temp_spk_path = None
                    if speaker_wav_data:
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as spk_f:
                            spk_f.write(speaker_wav_data)
                            temp_spk_path = spk_f.name

                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as out_f:
                        temp_out_wav = out_f.name

                    try:
                        xtts_lang = clean_target
                        if temp_spk_path and os.path.exists(temp_spk_path):
                            tts_model.tts_to_file(
                                text=text,
                                speaker_wav=temp_spk_path,
                                language=xtts_lang,
                                file_path=temp_out_wav
                            )
                        else:
                            tts_model.tts_to_file(
                                text=text,
                                language=xtts_lang,
                                file_path=temp_out_wav
                            )

                        audio, sr = sf.read(temp_out_wav)
                        if sr != 22050:
                            from scipy import signal
                            audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                        return audio
                    finally:
                        if temp_spk_path and os.path.exists(temp_spk_path):
                            os.unlink(temp_spk_path)
                        if os.path.exists(temp_out_wav):
                            os.unlink(temp_out_wav)

                except Exception as xtts_err:
                    logger.exception(f"[Coqui XTTS-v2] Local XTTS inference failed: {xtts_err}")
                    raise RuntimeError(f"Lỗi tạo giọng nói Coqui XTTS-v2 cục bộ: {xtts_err}")

            # ------------------------------------------------------------------
            # 3. Direct Edge-TTS Branch (Microsoft Studio-quality Neural TTS)
            # ------------------------------------------------------------------
            if is_edge:
                import asyncio
                import edge_tts

                voice_map = {
                    "vi_female_loan": "vi-VN-HoaiMyNeural",
                    "vi_male_nam": "vi-VN-NamMinhNeural",
                    "female_warm": "vi-VN-HoaiMyNeural",
                    "female": "vi-VN-HoaiMyNeural",
                    "male": "vi-VN-NamMinhNeural",
                    "en_female": "en-US-JennyNeural",
                    "en_male": "en-US-GuyNeural",
                    "rachel": "en-US-JennyNeural",
                    "domi": "en-US-JennyNeural",
                    "antoni": "en-US-GuyNeural",
                    "adam": "en-US-GuyNeural",
                }
                lang_defaults = {
                    "vi": "vi-VN-HoaiMyNeural",
                    "en": "en-US-JennyNeural",
                    "ja": "ja-JP-NanamiNeural",
                    "ko": "ko-KR-SunHiNeural",
                    "zh": "zh-CN-XiaoxiaoNeural",
                    "fr": "fr-FR-DeniseNeural",
                    "de": "de-DE-KatjaNeural",
                    "es": "es-ES-ElviraNeural",
                    "ru": "ru-RU-SvetlanaNeural",
                }
                clean_lang = (tgt_lang or "vi").lower().split("-")[0].split("_")[0]
                default_voice = lang_defaults.get(clean_lang, "vi-VN-HoaiMyNeural")
                target_voice = voice_map.get((voice_id or "").lower(), (voice_id if voice_id and "-" in voice_id else default_voice))

                # Strip non-speech symbols / punctuation-only text
                import re
                import time
                has_speech_content = bool(re.search(r"[\w\d]", text, re.UNICODE))
                if not has_speech_content:
                    logger.warning(f"[Edge-TTS] {seg_info} Text contains no alphanumeric characters ('{text}'), generating silence fallback.")
                    return np.zeros(int(22050 * 0.5), dtype=np.float32)

                audio_success = False
                temp_edge_mp3 = None

                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
                    temp_edge_mp3 = f.name

                async def _run_edge():
                    comm = edge_tts.Communicate(text, target_voice)
                    await comm.save(temp_edge_mp3)

                try:
                    asyncio.run(_run_edge())
                    if os.path.exists(temp_edge_mp3) and os.path.getsize(temp_edge_mp3) > 100:
                        audio_success = True
                except Exception as edge_err:
                    logger.warning(f"[Edge-TTS] {seg_info} Edge-TTS single attempt failed ({edge_err}). Immediate fallback...")

                if not audio_success:
                    if temp_edge_mp3 and os.path.exists(temp_edge_mp3):
                        os.unlink(temp_edge_mp3)
                        temp_edge_mp3 = None

                if not audio_success or not temp_edge_mp3:
                    logger.warning(f"[Edge-TTS] {seg_info} Edge-TTS could not synthesize '{text[:60]}...'. Falling back to Google TTS engine...")
                    try:
                        import urllib.request
                        import urllib.parse
                        import io
                        clean_q = re.sub(r'[\r\n\t]+', ' ', text).strip()
                        g_lang = (tgt_lang or "vi").lower().split("-")[0].split("_")[0]
                        g_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(clean_q)}&tl={g_lang}&client=tw-ob"
                        g_req = urllib.request.Request(g_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                        with urllib.request.urlopen(g_req, timeout=10) as g_resp:
                            g_data = g_resp.read()
                        if len(g_data) > 500:
                            g_seg = AudioSegment.from_file(io.BytesIO(g_data), format="mp3")
                            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f_gw:
                                g_wav = f_gw.name
                            g_seg.export(g_wav, format="wav")
                            audio, sr = sf.read(g_wav)
                            if sr != 22050:
                                from scipy import signal
                                audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                            if os.path.exists(g_wav):
                                os.unlink(g_wav)
                            logger.info(f"[Google-TTS Fallback] {seg_info} Successfully generated speech fallback ({len(audio)/22050:.2f}s)!")
                            return audio
                    except Exception as g_err:
                        logger.warning(f"[Google-TTS Fallback] {seg_info} Fallback failed: {g_err}")

                    logger.warning(f"[Edge-TTS] {seg_info} Generating silence fallback.")
                    return np.zeros(int(22050 * 0.5), dtype=np.float32)

                if os.path.exists(temp_edge_mp3) and os.path.getsize(temp_edge_mp3) > 100:
                    try:
                        pydub_seg = AudioSegment.from_file(temp_edge_mp3)
                        wav_temp = temp_edge_mp3.replace(".mp3", ".wav")
                        pydub_seg.export(wav_temp, format="wav")
                        audio, sr = sf.read(wav_temp)
                        if sr != 22050:
                            from scipy import signal
                            audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                        if os.path.exists(wav_temp):
                            os.unlink(wav_temp)
                        return audio
                    finally:
                        if os.path.exists(temp_edge_mp3):
                            os.unlink(temp_edge_mp3)
                else:
                    logger.warning(f"[Edge-TTS] Empty audio file generated for '{text}', falling back to silence.")
                    return np.zeros(int(22050 * 0.5), dtype=np.float32)

            raise RuntimeError(f"Mô hình TTS '{model}' không được hệ thống hỗ trợ.")
        except RuntimeError:
            raise
        except requests.exceptions.Timeout:
            logger.error("TTS service timeout after 120 seconds")
            raise RuntimeError("Dịch vụ TTS phản hồi quá lâu (quá thời gian chờ 120s).")
        except Exception as e:
            logger.error(f"Error calling TTS service: {e}")
            raise RuntimeError(f"Lỗi khi thực thi TTS ({model}): {str(e)}")

    def _get_speaker_wav(self, vocal_path: str) -> Optional[bytes]:
        """Extract speaker voice sample from vocal track."""
        if not vocal_path or not os.path.exists(vocal_path):
            logger.warning(f"Vocal path not found: {vocal_path}")
            return None
        
        try:
            if sf is not None:
                # Read vocal audio via soundfile
                audio, sr = sf.read(vocal_path)
                if len(audio.shape) > 1:
                    audio = np.mean(audio, axis=1)
                sample_duration = min(10, len(audio) / sr)
                sample_samples = int(sample_duration * sr)
                audio_sample = audio[:sample_samples]
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                    sf.write(f.name, audio_sample, sr)
                    with open(f.name, "rb") as audio_file:
                        audio_data = audio_file.read()
                    os.unlink(f.name)
                logger.info(f"Extracted speaker sample: {sample_duration:.1f}s, {len(audio_data)} bytes")
                return audio_data
            else:
                # Read vocal audio via pydub fallback
                seg = AudioSegment.from_file(vocal_path)
                sample_seg = seg[:10000]
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                    sample_seg.export(f.name, format="wav")
                    with open(f.name, "rb") as audio_file:
                        audio_data = audio_file.read()
                    os.unlink(f.name)
                logger.info(f"Extracted speaker sample via pydub: {len(sample_seg)/1000:.1f}s, {len(audio_data)} bytes")
                return audio_data
        except Exception as e:
            logger.error(f"Failed to extract voice profile: {e}")
            return None

    def _time_stretch_audio(self, audio: AudioSegment, speed_factor: float) -> AudioSegment:
        """Time-stretch audio using FFmpeg."""
        try:
            # Save temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                temp_input = f.name
                audio.export(temp_input, format="wav")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                temp_output = f.name
            
            # Use FFmpeg for time stretching
            cmd = [
                "ffmpeg", "-y",
                "-i", temp_input,
                "-filter:a", f"atempo={speed_factor}",
                temp_output
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            # Load stretched audio
            stretched = AudioSegment.from_file(temp_output)
            
            # Clean up
            os.unlink(temp_input)
            os.unlink(temp_output)
            
            return stretched
            
        except Exception as e:
            logger.error(f"Time-stretch failed: {e}")
            return audio

    def _combine_audio_segments(self, audio_segments: List[tuple]) -> AudioSegment:
        """Combine audio segments with appropriate gaps."""
        if not audio_segments:
            raise ValueError("No audio segments to combine")
        
        # Sort by start time
        audio_segments.sort(key=lambda x: x[0])
        
        # Start with first segment
        combined = audio_segments[0][1]
        last_end = audio_segments[0][0] + len(audio_segments[0][1]) / 1000.0
        
        for start_time, audio_seg in audio_segments[1:]:
            gap = start_time - last_end
            
            if gap > 0:
                # Add silence gap
                silence = AudioSegment.silent(duration=int(gap * 1000))
                combined += silence
            
            combined += audio_seg
            last_end = start_time + len(audio_seg) / 1000.0
        
        return combined

    def extract_voice_profile(self, vocal_path: str) -> Optional[bytes]:
        """Extract voice profile from vocal track for voice cloning."""
        return self._get_speaker_wav(vocal_path)

    def resynthesize_single_segment(
        self,
        video_id: int,
        segment_id: int,
        new_text: str,
        tgt_lang: str = "vi",
        vocal_path: Optional[str] = None,
        speed: float = 1.0,
        voice_id: Optional[str] = None,
        model: Optional[str] = None,
        master_output_path: Optional[str] = None,
        segments_meta: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Micro-resynthesize a single segment in < 1s, overwrite its chunk,
        update manifest, and in-place re-splice the master audio.
        """
        logger.info(f"⚡ [Micro-TTS] Resynthesizing segment #{segment_id} for video #{video_id} (lang: {tgt_lang})")
        
        # 1. Locate directories
        tts_base = OUTPUT_DIR / f"tts_{video_id}"
        chunks_dir = tts_base / tgt_lang / "chunks"
        if not chunks_dir.exists():
            chunks_dir = tts_base / "chunks"
        chunks_dir.mkdir(parents=True, exist_ok=True)
        
        manifest_file = tts_base / tgt_lang / "chunks" / "manifest.json"
        if not manifest_file.exists():
            manifest_file = tts_base / f"manifest_{tgt_lang}.json"
        
        # 2. Extract speaker voice if available
        speaker_wav_data = None
        if vocal_path and os.path.exists(vocal_path):
            speaker_wav_data = self._get_speaker_wav(vocal_path)
        
        # 3. Call TTS for new text
        audio_data = self._call_tts_service(
            new_text,
            tgt_lang,
            speaker_wav_data,
            voice_id=voice_id,
            model=model,
            segment_idx=segment_id
        )
        
        chunk_filename = f"seg_{segment_id:04d}.wav"
        chunk_path = str(chunks_dir / chunk_filename)
        
        if audio_data is None or sf is None:
            raise RuntimeError(f"Không thể tạo âm thanh giọng đọc cho đoạn #{segment_id}.")
        
        sf.write(chunk_path, audio_data, 22050)
        audio_seg = AudioSegment.from_file(chunk_path)
        
        # 4. Find segment timing metadata
        target_duration = 0.0
        start_time = 0.0
        if segments_meta:
            for s in segments_meta:
                if s.get("id") == segment_id or segments_meta.index(s) == segment_id:
                    start_time = float(s.get("start", 0))
                    target_duration = float(s.get("end", 0)) - start_time
                    break
        
        # 5. Apply time-stretch or user speed
        current_duration = len(audio_seg) / 1000.0
        speed_factor = speed
        if target_duration > 0 and speed == 1.0:
            if current_duration > target_duration * 1.15 or current_duration < target_duration * 0.85:
                speed_factor = max(0.5, min(2.0, current_duration / target_duration))
        
        if speed_factor != 1.0:
            audio_seg = self._time_stretch_audio(audio_seg, speed_factor)
            audio_seg.export(chunk_path, format="wav")
            logger.info(f"⚡ [Micro-TTS] Segment #{segment_id} time-stretched (factor: {speed_factor:.2f})")
        
        final_duration = round(len(audio_seg) / 1000.0, 3)
        
        # Also copy to snippet dir for backwards compatibility
        snippet_dir = OUTPUT_DIR / f"{video_id}" / "snippets"
        snippet_dir.mkdir(parents=True, exist_ok=True)
        audio_seg.export(str(snippet_dir / f"seg_{segment_id}.wav"), format="wav")
        
        # 6. Update manifest
        manifest_data = None
        if manifest_file.exists():
            try:
                with open(manifest_file, "r", encoding="utf-8") as mf:
                    manifest_data = json.load(mf)
            except Exception as e:
                logger.warning(f"Could not load existing manifest: {e}")
        
        text_hash = hashlib.md5(new_text.strip().encode("utf-8")).hexdigest()[:10]
        
        if manifest_data and "chunks" in manifest_data:
            chunk_found = False
            for ch in manifest_data["chunks"]:
                if ch.get("id") == segment_id or ch.get("segment_id") == segment_id:
                    ch["text"] = new_text
                    ch["duration"] = final_duration
                    ch["hash"] = text_hash
                    ch["file_path"] = chunk_path
                    ch["speed_factor"] = round(speed_factor, 2)
                    ch["updated_at"] = datetime.utcnow().isoformat()
                    chunk_found = True
                    break
            if not chunk_found:
                manifest_data["chunks"].append({
                    "id": segment_id,
                    "segment_id": segment_id,
                    "start": start_time,
                    "end": start_time + final_duration,
                    "duration": final_duration,
                    "target_duration": target_duration or final_duration,
                    "text": new_text,
                    "hash": text_hash,
                    "file_name": chunk_filename,
                    "file_path": chunk_path,
                    "speed_factor": round(speed_factor, 2),
                    "updated_at": datetime.utcnow().isoformat()
                })
            manifest_data["updated_at"] = datetime.utcnow().isoformat()
            
            with open(manifest_file, "w", encoding="utf-8") as mf:
                json.dump(manifest_data, mf, indent=2, ensure_ascii=False)
            
            # 7. Fast in-place micro-splicing of master audio track
            try:
                audio_segments = []
                for ch in manifest_data["chunks"]:
                    c_p = ch.get("file_path")
                    if c_p and os.path.exists(c_p):
                        c_audio = AudioSegment.from_file(c_p)
                        audio_segments.append((float(ch.get("start", 0)), c_audio))
                if audio_segments:
                    recombined = self._combine_audio_segments(audio_segments)
                    m_path = master_output_path or str(tts_base / f"tts_{tgt_lang}.wav")
                    recombined.export(m_path, format="wav")
                    logger.info(f"⚡ [Micro-TTS] Master audio re-spliced in < 0.2s: {m_path}")
            except Exception as mix_err:
                logger.warning(f"Could not re-splice master audio: {mix_err}")
        
        # 8. Upload modified chunk to S3
        try:
            from app.services.s3_service import storage_manager
            s3_chunk_key = f"dubbing/{video_id}/{tgt_lang}/chunks/{chunk_filename}"
            storage_manager.upload_file(chunk_path, s3_chunk_key, content_type="audio/wav")
            if manifest_file.exists():
                storage_manager.upload_file(str(manifest_file), f"dubbing/{video_id}/{tgt_lang}/manifest.json", content_type="application/json")
            if master_output_path and os.path.exists(master_output_path):
                storage_manager.upload_file(master_output_path, f"dubbing/{video_id}/dubbed_audio_{tgt_lang}.wav", content_type="audio/wav")
        except Exception as s3_err:
            logger.warning(f"Could not sync micro-resynthesized chunk to S3: {s3_err}")
            
        return {
            "status": "success",
            "video_id": video_id,
            "segment_id": segment_id,
            "duration": final_duration,
            "chunk_path": chunk_path,
            "audio_url": f"/api/videos/{video_id}/tts/segments/{segment_id}/audio",
            "master_audio_url": f"/api/videos/{video_id}/audio/stream?kind=dubbed",
            "text": new_text,
            "speed": speed
        }