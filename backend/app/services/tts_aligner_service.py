import os
import requests
from pydub import AudioSegment
from pydub.silence import split_on_silence

class TTSAlignerService:
    def __init__(self, tts_api_url="http://127.0.0.1:8002/generate_tts"):
        self.tts_api_url = tts_api_url

    def extract_voice_profile(self, vocal_path: str, temp_dir: str, target_duration_sec: int = 12):
        """
        Trích xuất Voice Profile bằng thuật toán VAD (Voice Activity Detection):
        Tự động lọc bỏ các đoạn lặng và tiếng thở, gom đúng 12s mẫu giọng nói sắc nét nhất.
        """
        print("[VAD] Đang lọc khoảng lặng và trích xuất Voice Profile chuẩn 12s...", flush=True)
        profile_path = os.path.join(temp_dir, "speaker_profile.wav")
        
        audio = AudioSegment.from_file(vocal_path)
        
        # Tách các đoạn giọng nói (loại bỏ khoảng lặng > 500ms)
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

    def speed_up_audio(self, audio_path: str, output_path: str, target_duration: float):
        """Time-stretch ép thời gian bằng Librosa mà không làm biến dạng cao độ (Pitch)."""
        import librosa
        import soundfile as sf
        y, sr = librosa.load(audio_path, sr=None)
        current_duration = librosa.get_duration(y=y, sr=sr)
        
        if current_duration > target_duration and target_duration > 0:
            rate = current_duration / target_duration
            # Giới hạn tốc độ đọc tối đa gấp 1.8 lần để giọng nghe không bị quá nhanh
            rate = min(rate, 1.8) 
            y_stretched = librosa.effects.time_stretch(y, rate=rate)
            sf.write(output_path, y_stretched, sr)
        else:
            sf.write(output_path, y, sr)

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

            # Gọi Microservice TTS
            try:
                with open(speaker_profile_path, "rb") as f_speaker:
                    response = requests.post(
                        self.tts_api_url,
                        data={"text": translated_text, "language": tgt_lang},
                        files={"speaker_wav": f_speaker},
                        timeout=60
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

            # Ép tốc độ đọc khớp với khung thời gian gốc
            self.speed_up_audio(chunk_tts_path, adjusted_tts_path, target_duration=original_duration)
            
            tts_segment = AudioSegment.from_file(adjusted_tts_path)
            tts_duration_sec = len(tts_segment) / 1000.0

            # Chèn khoảng lặng (Silence Gap) nếu có khoảng trống thời gian giữa 2 câu
            silence_gap = seg["start"] - current_timeline
            if silence_gap > 0:
                silence = AudioSegment.silent(duration=int(silence_gap * 1000))
                master_audio += silence
                current_timeline += silence_gap

            # Nối câu lồng tiếng mới vào track chính
            master_audio += tts_segment
            current_timeline += tts_duration_sec

        master_audio.export(output_path, format="wav")
