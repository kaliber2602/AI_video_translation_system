import os
import requests
import librosa
import soundfile as sf
from pydub import AudioSegment
from pydub.silence import split_on_silence
import torch

class TTSAlignerService:
    def __init__(self, tts_api_url="http://127.0.0.1:8002/generate_tts"):
        self.tts_api_url = tts_api_url
        
        # Auto-detect and set appropriate threads
        cuda_available = torch.cuda.is_available()
        
        # ✅ FIX: Use librosa.util.set_num_threads() instead of librosa.set_num_threads()
        if hasattr(librosa, 'util') and hasattr(librosa.util, 'set_num_threads'):
            librosa.util.set_num_threads(4 if cuda_available else 2)
        else:
            # Fallback: use os environment variables
            os.environ["OMP_NUM_THREADS"] = str(4 if cuda_available else 2)
            os.environ["OPENBLAS_NUM_THREADS"] = str(4 if cuda_available else 2)
        
        if cuda_available:
            print("[TTS Aligner] ✅ CUDA detected", flush=True)
        else:
            print("[TTS Aligner] ⚠️ CUDA not detected, using CPU", flush=True)

    def extract_voice_profile(self, vocal_path: str, temp_dir: str, target_duration_sec: int = 12):
        """
        Trích xuất Voice Profile bằng thuật toán VAD (Voice Activity Detection):
        Tự động lọc bỏ các đoạn lặng và tiếng thở, gom đúng 12s mẫu giọng nói sắc nét nhất.
        """
        print("[VAD] Đang lọc khoảng lặng và trích xuất Voice Profile chuẩn 12s...", flush=True)
        profile_path = os.path.join(temp_dir, "speaker_profile.wav")
        
        try:
            audio = AudioSegment.from_file(vocal_path)
            
            chunks = split_on_silence(
                audio,
                min_silence_len=500,
                silence_thresh=audio.dBFS - 14,
                keep_silence=100
            )
            
            if not chunks:
                print("[VAD] Cảnh báo: Không tách được khoảng lặng, cắt 12s đầu làm mặc định.", flush=True)
                audio[:target_duration_sec * 1000].export(profile_path, format="wav")
                return profile_path

            target_duration_ms = target_duration_sec * 1000
            clean_audio = AudioSegment.empty()
            
            for chunk in chunks:
                clean_audio += chunk
                if len(clean_audio) >= target_duration_ms:
                    break
                    
            clean_audio = clean_audio[:target_duration_ms]
            print(f"[VAD] Trích xuất thành công {len(clean_audio)/1000}s mẫu giọng chuẩn.", flush=True)
            clean_audio.export(profile_path, format="wav")
            return profile_path
            
        except Exception as e:
            print(f"[VAD] Error: {e}, using fallback", flush=True)
            audio = AudioSegment.from_file(vocal_path)
            audio[:target_duration_sec * 1000].export(profile_path, format="wav")
            return profile_path

    def speed_up_audio(self, audio_path: str, output_path: str, target_duration: float):
        """Time-stretch ép thời gian bằng Librosa mà không làm biến dạng cao độ (Pitch)."""
        try:
            # Auto-detect CUDA for audio processing
            use_gpu = torch.cuda.is_available()
            sr = 44100 if use_gpu else 16000  # Higher sample rate on GPU
            
            y, sr = librosa.load(audio_path, sr=sr, mono=True)
            current_duration = librosa.get_duration(y=y, sr=sr)
            
            if current_duration > target_duration and target_duration > 0:
                rate = current_duration / target_duration
                rate = min(rate, 1.8)
                y_stretched = librosa.effects.time_stretch(y, rate=rate)
                sf.write(output_path, y_stretched, sr)
            else:
                sf.write(output_path, y, sr)
                
        except Exception as e:
            print(f"[TTS] Speed up failed: {e}, using fallback", flush=True)
            import shutil
            shutil.copy(audio_path, output_path)

    def generate_tts_with_alignment(self, segments: list, output_path: str, temp_dir: str, vocal_path: str, tgt_lang: str):
        """Sinh giọng lồng tiếng cho từng câu, ép vừa Timeline và ghép thành 1 track duy nhất."""
        speaker_profile_path = self.extract_voice_profile(vocal_path, temp_dir)
        
        master_audio = AudioSegment.empty()
        current_timeline = 0.0

        for idx, seg in enumerate(segments):
            translated_text = seg.get("translated_text", seg["text"])
            original_duration = seg["end"] - seg["start"]
            
            chunk_tts_path = os.path.join(temp_dir, f"tts_chunk_{idx}.wav")
            adjusted_tts_path = os.path.join(temp_dir, f"tts_adjusted_{idx}.wav")

            try:
                with open(speaker_profile_path, "rb") as f_speaker:
                    response = requests.post(
                        self.tts_api_url,
                        data={"text": translated_text, "language": tgt_lang},
                        files={"speaker_wav": f_speaker},
                        timeout=120
                    )
                
                if response.status_code == 200:
                    with open(chunk_tts_path, "wb") as f_out:
                        f_out.write(response.content)
                else:
                    print(f"Lỗi TTS API (Segment {idx}): {response.text}", flush=True)
                    continue
            except Exception as e:
                print(f"Lỗi kết nối TTS Server: {e}", flush=True)
                continue

            self.speed_up_audio(chunk_tts_path, adjusted_tts_path, target_duration=original_duration)
            
            tts_segment = AudioSegment.from_file(adjusted_tts_path)
            tts_duration_sec = len(tts_segment) / 1000.0

            silence_gap = seg["start"] - current_timeline
            if silence_gap > 0:
                silence = AudioSegment.silent(duration=int(silence_gap * 1000))
                master_audio += silence
                current_timeline += silence_gap

            master_audio += tts_segment
            current_timeline += tts_duration_sec

        master_audio.export(output_path, format="wav")