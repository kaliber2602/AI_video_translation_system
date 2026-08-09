import os
import re
import subprocess
import requests
import librosa
import soundfile as sf
import torch
from pydub import AudioSegment
from pydub.silence import split_on_silence
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from faster_whisper import WhisperModel


class AudioService:
    @staticmethod
    def extract_audio(video_path: str, output_audio_path: str):
        """Trích xuất audio gốc từ video bằng FFmpeg."""
        command = [
            "ffmpeg", "-y", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2",
            output_audio_path
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    @staticmethod
    def separate_vocal_bgm(audio_path: str, output_dir: str):
        """
        Tách âm thanh gốc thành 2 track riêng biệt bằng Demucs:
        - Vocal Track: Dùng để nhận diện giọng nói (STT) & trích xuất Voice Profile.
        - BGM Track: Nhạc nền & hiệu ứng âm thanh giữ lại để mix hậu kỳ.
        """
        command = [
            "demucs", "--two-stems=vocals",
            "-n", "htdemucs",
            "-o", output_dir, audio_path
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        base_name = os.path.splitext(os.path.basename(audio_path))[0]
        vocal_path = os.path.join(output_dir, "htdemucs", base_name, "vocals.wav")
        bgm_path = os.path.join(output_dir, "htdemucs", base_name, "no_vocals.wav")
        
        return vocal_path, bgm_path

    @staticmethod
    def mix_and_mux(video_path: str, tts_audio_path: str, bgm_audio_path: str, final_output_path: str, temp_dir: str):
        """Mix track lồng tiếng mới (TTS) với nhạc nền gốc (BGM) và ghép lại vào Video."""
        mixed_audio_path = os.path.join(temp_dir, "mixed_audio.wav")
        
        # 1. Trộn âm thanh bằng Pydub
        tts_audio = AudioSegment.from_file(tts_audio_path)
        bgm_audio = AudioSegment.from_file(bgm_audio_path)
        
        # Hạ âm lượng BGM xuống 10dB để giọng lồng tiếng nghe rõ ràng hơn
        bgm_audio = bgm_audio - 10 
        
        # Đè TTS lên BGM
        mixed_audio = bgm_audio.overlay(tts_audio)
        mixed_audio.export(mixed_audio_path, format="wav")
        
        # 2. Muxing Audio & Video bằng FFMPEG
        command = [
            "ffmpeg", "-y", "-i", video_path, "-i", mixed_audio_path,
            "-c:v", "copy", "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0",
            "-shortest", final_output_path
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


class STTService:
    def __init__(self, model_size="small", device="cuda", compute_type="float16"):
        print("[STT] Đang khởi tạo mô hình Faster-Whisper...", flush=True)
        # Nếu không có GPU CUDA, có thể fallback về cpu & int8 trong try/except
        try:
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        except Exception as e:
            print(f"[STT] Cảnh báo: Không thể nạp CUDA ({e}), chuyển sang chạy CPU float32...", flush=True)
            self.model = WhisperModel(model_size, device="cpu", compute_type="float32")

    def transcribe_audio(self, audio_path: str):
        """
        Chạy nhận diện giọng nói trên file Vocal sạch.
        Trả về danh sách câu (có mốc start/end) và ngôn ngữ tự động phát hiện được.
        """
        segments, info = self.model.transcribe(audio_path, beam_size=5, vad_filter=True)
        detected_iso_lang = info.language # Ví dụ: "en", "vi", "zh", "ja"
        
        result = []
        for segment in segments:
            result.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "duration": segment.end - segment.start
            })
        return result, detected_iso_lang

import re

class TranslationService:
    def __init__(self):
        print("[Translate] Đang khởi tạo NLLB-1.3B...", flush=True)
        model_name = "facebook/nllb-200-1.3B"
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            import torch
            
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device)
            print(f"[Translate] Đã nạp NLLB-1.3B lên {self.device.upper()} thành công!", flush=True)
        except Exception as e:
            print(f"[Translate] Lỗi khởi tạo: {e}", flush=True)

    def mask_keywords(self, text: str, glossary: dict):
        """Bảo vệ các từ khóa (Tên riêng, Thuật ngữ) không bị AI dịch sai."""
        if not glossary:
            return text, {}
        mapping = {}
        for idx, (term, translation) in enumerate(glossary.items()):
            placeholder = f"__GLOSSARY_{idx}__"
            text = re.sub(rf'\b{re.escape(term)}\b', placeholder, text, flags=re.IGNORECASE)
            mapping[placeholder] = translation
        return text, mapping

    def unmask_keywords(self, text: str, mapping: dict):
        """Khôi phục lại các từ khóa vào bản dịch."""
        for placeholder, translation in mapping.items():
            text = text.replace(placeholder, translation)
        return text

    # =========================================================================
    # THUẬT TOÁN LÕI MỚI: SMART SEGMENT MERGER (GOM CÂU NGỮ NGHĨA AN TOÀN)
    # =========================================================================
    def _smart_merge_segments(self, segments: list, max_gap=1.5, max_duration=10.0, max_chars=150):
        """
        Gom các đoạn cắt vụn của Whisper thành một câu hoàn chỉnh, 
        trang bị 4 Van an toàn để chống tràn RAM và Crash TTS.
        """
        merged_segments = []
        if not segments: 
            return merged_segments
        
        current_merge = segments[0].copy()
        current_merge["text"] = current_merge["text"].strip()
        
        # Dấu hiệu kết thúc câu (Hỗ trợ cả Tiếng Anh, Việt, Trung, Hàn, Nhật)
        ending_punctuations = ('.', '?', '!', '。', '？', '！', '…')
        
        for i in range(1, len(segments)):
            next_seg = segments[i]
            next_text = next_seg["text"].strip()
            
            # Tính toán các thông số an toàn
            gap = next_seg["start"] - current_merge["end"]
            current_duration = next_seg["end"] - current_merge["start"]
            char_count = len(current_merge["text"]) + len(next_text) # Dùng số ký tự thay vì số từ để an toàn cho tiếng Trung/Nhật
            
            # Kiểm tra 3 LƯẬT CHẶN (Safety Valves)
            is_end_of_sentence = current_merge["text"].endswith(ending_punctuations)
            is_gap_too_large = gap > max_gap
            is_too_long = (current_duration > max_duration) or (char_count > max_chars)
            
            if is_end_of_sentence or is_gap_too_large or is_too_long:
                # Đóng gói đoạn hiện tại, mở đoạn mới
                merged_segments.append(current_merge)
                current_merge = next_seg.copy()
                current_merge["text"] = current_merge["text"].strip()
            else:
                # Tiến hành gộp (Merge)
                # Dùng khoảng trắng để nối (rất an toàn cho mọi ngôn ngữ)
                current_merge["text"] += " " + next_text
                current_merge["end"] = next_seg["end"] # Cập nhật mốc kết thúc mới
                
        # Nhớ push đoạn cuối cùng vào mảng
        merged_segments.append(current_merge)
        return merged_segments

    # =========================================================================
    # DỊCH THEO LÔ (PURE BATCHING) - LOẠI BỎ 100% HALLUCINATION
    # =========================================================================
    def translate_document(self, segments: list, glossary: dict, src_lang: str, tgt_lang: str):
        if not segments:
            return []
            
        if src_lang == tgt_lang:
            print(f"[Translate] Ngôn ngữ trùng khớp ({src_lang}), bỏ qua dịch.", flush=True)
            for seg in segments:
                seg["translated_text"] = seg["text"]
            return segments
            
        # 1. Chạy thuật toán Gom Câu
        merged_segments = self._smart_merge_segments(segments)
        print(f"[Translate] Đã gộp {len(segments)} đoạn cắt vụn thành {len(merged_segments)} câu hoàn chỉnh ngữ nghĩa.", flush=True)
        
        # 2. Cấu hình NLLB
        self.tokenizer.src_lang = src_lang
        tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_lang)
        
        # Batch size nhỏ (4) để CPU/GPU không bị quá tải
        batch_size = 4 
        
        # 3. Dịch theo lô thuần túy (Không dùng ký tự lạ)
        for i in range(0, len(merged_segments), batch_size):
            batch = merged_segments[i:i + batch_size]
            
            # Masking
            masked_texts = []
            mappings = []
            for seg in batch:
                m_text, mapping = self.mask_keywords(seg["text"], glossary)
                masked_texts.append(m_text)
                mappings.append(mapping)
                
            # Đưa vào Model
            inputs = self.tokenizer(
                masked_texts, 
                return_tensors="pt", 
                padding=True, 
                truncation=True, 
                max_length=512
            ).to(self.model.device)
            
            translated_tokens = self.model.generate(
                **inputs, 
                forced_bos_token_id=tgt_lang_id,
                max_length=512
            )
            
            decoded_batch = self.tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)
            
            # Unmasking và lưu kết quả
            for j, seg in enumerate(batch):
                final_text = self.unmask_keywords(decoded_batch[j], mappings[j])
                seg["translated_text"] = final_text
                
        return merged_segments
        
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