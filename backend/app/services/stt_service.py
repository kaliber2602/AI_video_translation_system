from faster_whisper import WhisperModel

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
