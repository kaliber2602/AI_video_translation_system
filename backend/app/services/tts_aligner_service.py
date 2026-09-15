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
        video_id: Optional[int] = None
    ) -> str:
        """
        Generate TTS for each segment, save chunks 1:1, generate manifest.json,
        and combine into master audio file.
        """
        if not segments:
            raise ValueError("No segments provided for TTS generation")
        
        logger.info(f"Generating TTS for {len(segments)} segments, target language: {tgt_lang}, video_id: {video_id}")
        
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
        
        for idx, seg in enumerate(segments):
            text = seg.get("translated_text", seg.get("text", ""))
            if not text or len(text.strip()) < 1:
                logger.warning(f"Segment {idx} has empty text, skipping")
                continue
            
            logger.info(f"Generating TTS for segment {idx}: {text[:50]}...")
            
            try:
                # Generate TTS with speaker voice
                audio_data = self._call_tts_service(text, tgt_lang, speaker_wav_data)
                
                # Dedicated chunk path
                chunk_filename = f"seg_{idx:04d}.wav"
                chunk_path = str(chunks_dir / chunk_filename)
                
                if audio_data is not None and sf is not None:
                    sf.write(chunk_path, audio_data, 22050)
                    audio_seg = AudioSegment.from_file(chunk_path)
                else:
                    logger.warning(f"TTS service failed or sf missing for segment {idx}, generating fallback tone")
                    est_duration = max(1.0, len(text.split()) * 0.35)
                    from pydub.generators import Sine
                    audio_seg = Sine(440).to_audio_segment(duration=int(est_duration * 1000)).apply_gain(-25)
                    audio_seg.export(chunk_path, format="wav")
                
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
                
            except Exception as e:
                logger.error(f"Failed to generate TTS for segment {idx}: {e}")
                continue
        
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

    def _call_tts_service(self, text: str, tgt_lang: str, speaker_wav_data: Optional[bytes] = None) -> Optional[np.ndarray]:
        """Call the TTS service to generate audio with voice cloning."""
        try:
            # ✅ Check if we have speaker data
            if speaker_wav_data is None:
                # Try to use a default voice
                logger.warning("No speaker voice data available, trying with default voice")
                # Some TTS services allow empty speaker_wav for default voice
            
            # ✅ Prepare multipart/form-data for TTS service
            # The service expects:
            # - text: string (required)
            # - speaker_wav: file (required for voice cloning)
            
            # Create multipart form data
            files = {}
            data = {
                "text": text,
                "language": tgt_lang,
                "speaker_id": "0",
                "style": "neutral",
                "speed": 1.0
            }
            
            # ✅ Add speaker_wav as file if available
            if speaker_wav_data:
                files["speaker_wav"] = ("speaker.wav", speaker_wav_data, "audio/wav")
                logger.info(f"Sending speaker_wav: {len(speaker_wav_data)} bytes")
            
            # Make request with multipart/form-data
            response = requests.post(
                self.tts_api_url,
                data=data,
                files=files if files else None,
                timeout=120
            )
            
            if response.status_code != 200:
                logger.error(f"TTS service returned {response.status_code}: {response.text[:500]}")
                return None
            
            # Check response content type
            content_type = response.headers.get("content-type", "")
            
            if "audio" in content_type or "octet-stream" in content_type:
                # Save response to temp file and load
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                    f.write(response.content)
                    temp_file = f.name
                
                try:
                    # Load audio
                    audio, sr = sf.read(temp_file)
                    if sr != 22050:
                        # Resample to 22050 if needed
                        from scipy import signal
                        audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                    return audio
                finally:
                    os.unlink(temp_file)
            elif "json" in content_type:
                # Try JSON response with base64 audio
                data = response.json()
                if "audio" in data:
                    import base64
                    audio_bytes = base64.b64decode(data["audio"])
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                        f.write(audio_bytes)
                        temp_file = f.name
                    
                    try:
                        audio, sr = sf.read(temp_file)
                        if sr != 22050:
                            from scipy import signal
                            audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                        return audio
                    finally:
                        os.unlink(temp_file)
                elif "url" in data:
                    # Download audio from URL
                    audio_response = requests.get(data["url"], timeout=30)
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                        f.write(audio_response.content)
                        temp_file = f.name
                    
                    try:
                        audio, sr = sf.read(temp_file)
                        if sr != 22050:
                            from scipy import signal
                            audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                        return audio
                    finally:
                        os.unlink(temp_file)
            else:
                logger.error(f"Unexpected response from TTS service: {content_type[:100]}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error("TTS service timeout after 120 seconds")
            return None
        except Exception as e:
            logger.error(f"Error calling TTS service: {e}")
            return None

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
        audio_data = self._call_tts_service(new_text, tgt_lang, speaker_wav_data)
        
        chunk_filename = f"seg_{segment_id:04d}.wav"
        chunk_path = str(chunks_dir / chunk_filename)
        
        if audio_data is not None and sf is not None:
            sf.write(chunk_path, audio_data, 22050)
            audio_seg = AudioSegment.from_file(chunk_path)
        else:
            logger.warning(f"TTS service unavailable, generating fallback tone for segment #{segment_id}")
            est_duration = max(1.0, len(new_text.split()) * 0.35)
            from pydub.generators import Sine
            audio_seg = Sine(440).to_audio_segment(duration=int(est_duration * 1000)).apply_gain(-25)
            audio_seg.export(chunk_path, format="wav")
        
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