import os
import gc
from faster_whisper import WhisperModel
import torch

_model_cache = {}

def unload_whisper_models():
    """Giải phóng toàn bộ cache mô hình Faster-Whisper và thu hồi VRAM GPU."""
    global _model_cache
    _model_cache.clear()
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    print("[STT] 🧹 Đã giải phóng bộ nhớ Faster-Whisper khỏi VRAM.", flush=True)

class STTService:
    def __init__(self, model_size="small"):
        # Auto-detect CUDA
        env_device = os.getenv("WHISPER_DEVICE")
        cuda_available = torch.cuda.is_available()
        device = env_device if env_device else ("cuda" if cuda_available else "cpu")
        if device == "cuda" and not cuda_available:
            print("[STT] ⚠️ WHISPER_DEVICE=cuda nhưng torch.cuda.is_available()=False, fallback sang CPU.", flush=True)
            device = "cpu"

        env_compute = os.getenv("WHISPER_COMPUTE_TYPE")
        if env_compute:
            compute_type = env_compute
        else:
            compute_type = "int8_float16" if device == "cuda" else "int8"
        
        cache_key = f"{model_size}_{device}_{compute_type}"

        if cache_key in _model_cache:
            print(f"[STT] ⚡ Reusing cached Faster-Whisper model ({cache_key})", flush=True)
            self.model = _model_cache[cache_key]
            return

        print(f"[STT] Đang khởi tạo mô hình Faster-Whisper ({model_size}) trên {device.upper()}...", flush=True)
        if cuda_available:
            print(f"[STT] ✅ CUDA detected, using GPU", flush=True)
        else:
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
            _model_cache[cache_key] = self.model
        except Exception as e:
            print(f"[STT] ❌ Failed to load on {device}: {e}", flush=True)
            print("[STT] 🔄 Falling back to CPU with int8...", flush=True)
            fallback_key = f"{model_size}_cpu_int8"
            if fallback_key in _model_cache:
                self.model = _model_cache[fallback_key]
            else:
                self.model = WhisperModel(
                    model_size, 
                    device="cpu", 
                    compute_type="int8",
                    cpu_threads=4,
                    num_workers=1
                )
                _model_cache[fallback_key] = self.model

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