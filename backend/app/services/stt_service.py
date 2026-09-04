from faster_whisper import WhisperModel
import torch

class STTService:
    def __init__(self, model_size="small"):
        print("[STT] Đang khởi tạo mô hình Faster-Whisper...", flush=True)
        
        # Auto-detect CUDA
        cuda_available = torch.cuda.is_available()
        
        if cuda_available:
            device = "cuda"
            compute_type = "float16"
            print(f"[STT] ✅ CUDA detected, using GPU", flush=True)
        else:
            device = "cpu"
            compute_type = "int8"
            print(f"[STT] ⚠️ CUDA not detected, using CPU", flush=True)
        
        try:
            self.model = WhisperModel(
                model_size, 
                device=device, 
                compute_type=compute_type,
                cpu_threads=4 if device == "cpu" else 0,
                num_workers=1
            )
            print(f"[STT] ✅ Model loaded successfully on {device.upper()}", flush=True)
        except Exception as e:
            print(f"[STT] ❌ Failed to load on {device}: {e}", flush=True)
            print("[STT] 🔄 Falling back to CPU with int8...", flush=True)
            self.model = WhisperModel(
                model_size, 
                device="cpu", 
                compute_type="int8",
                cpu_threads=4,
                num_workers=1
            )

    def transcribe_audio(self, audio_path: str):
        """
        Chạy nhận diện giọng nói trên file Vocal sạch.
        Trả về danh sách câu (có mốc start/end) và ngôn ngữ tự động phát hiện được.
        """
        segments, info = self.model.transcribe(
            audio_path, 
            beam_size=5, 
            vad_filter=True,
            language=None,
            condition_on_previous_text=False,
            temperature=0.0,
            patience=1.0
        )
        detected_iso_lang = info.language
        
        result = []
        for segment in segments:
            result.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "duration": segment.end - segment.start
            })
        return result, detected_iso_lang