import os
import gc
import ctypes
import torch

# Ensure NVIDIA cuBLAS and CUDA libraries are dynamically linked for CTranslate2 / Faster-Whisper
for _lib_path in [
    '/usr/local/lib/python3.12/site-packages/nvidia/cublas/lib',
    '/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib',
    '/usr/local/lib/python3.12/site-packages/nvidia/cuda_runtime/lib',
]:
    if os.path.exists(_lib_path):
        for _f in sorted(os.listdir(_lib_path)):
            if _f.endswith('.so') or '.so.' in _f:
                try:
                    ctypes.CDLL(os.path.join(_lib_path, _f))
                except Exception:
                    pass

from faster_whisper import WhisperModel

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
    def __init__(self, model_size=None):
        raw_model = (model_size or os.getenv("WHISPER_MODEL", "small")).strip().lower()
        # Normalization mapping for common UI/DB codes
        model_map = {
            "whisper_tiny": "tiny",
            "whisper-tiny": "tiny",
            "tiny": "tiny",
            "whisper_base": "base",
            "whisper-base": "base",
            "base": "base",
            "whisper_small": "small",
            "whisper-small": "small",
            "small": "small",
            "whisper_medium": "medium",
            "whisper-medium": "medium",
            "medium": "medium",
            "whisper_large": "large-v3",
            "whisper-large": "large-v3",
            "whisper_large_v3": "large-v3",
            "whisper-large-v3": "large-v3",
            "whisperx_large_v3": "large-v3",
            "whisperx-large-v3": "large-v3",
            "whisper_turbo": "turbo",
            "whisper-turbo": "turbo",
            "turbo": "turbo",
        }
        normalized_model = model_map.get(raw_model, raw_model)
        model_size = normalized_model

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

    def transcribe_audio(self, audio_path: str, progress_callback=None):
        """
        Chạy nhận diện giọng nói trên file Vocal sạch.
        Trả về danh sách câu (có mốc start/end) và ngôn ngữ tự động phát hiện được.
        Hỗ trợ fallback tự động xử lý chuẩn hóa audio nếu gặp sự cố giải mã PyAV/avcodec.
        Hỗ trợ progress_callback(progress_percent, current_timestamp, total_duration) để cập nhật tiến độ thời gian thực.
        """
        def _get_audio_duration(file_path: str) -> float:
            try:
                import subprocess
                cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file_path]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=True)
                return max(0.1, float(res.stdout.strip()))
            except Exception:
                return 0.0

        total_audio_duration = _get_audio_duration(audio_path)

        def _run_transcription(path_to_transcribe):
            nonlocal total_audio_duration
            if total_audio_duration <= 0.0 and path_to_transcribe != audio_path:
                total_audio_duration = _get_audio_duration(path_to_transcribe)

            segments, info = self.model.transcribe(
                path_to_transcribe, 
                beam_size=5, 
                vad_filter=True,
                language=None,
                condition_on_previous_text=False,
                temperature=0.0,
                patience=1.0
            )
            detected_iso_lang = info.language
            result = []
            audio_dur = total_audio_duration if total_audio_duration > 0.0 else getattr(info, "duration", 0.0)

            for segment in segments:
                seg_dict = {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "duration": segment.end - segment.start
                }
                result.append(seg_dict)
                if progress_callback and audio_dur > 0:
                    pct = min(100, int((segment.end / audio_dur) * 100))
                    try:
                        progress_callback(pct, segment.end, audio_dur)
                    except Exception as cb_err:
                        print(f"[STT] ⚠️ Progress callback warning: {cb_err}", flush=True)

            return result, detected_iso_lang

        try:
            return _run_transcription(audio_path)
        except Exception as err:
            err_str = str(err).lower()
            if "avcodec" in err_str or "invalid argument" in err_str or "decode" in err_str:
                import subprocess
                import tempfile
                print(f"[STT] ⚠️ Gặp sự cố giải mã audio PyAV ({err}), đang chuẩn hóa lại sang 16kHz mono WAV...", flush=True)
                clean_tmp = tempfile.NamedTemporaryFile(suffix="_stt_norm.wav", delete=False)
                clean_tmp.close()
                try:
                    subprocess.run(
                        ["ffmpeg", "-y", "-i", audio_path, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", clean_tmp.name],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        check=True
                    )
                    return _run_transcription(clean_tmp.name)
                finally:
                    if os.path.exists(clean_tmp.name):
                        try:
                            os.remove(clean_tmp.name)
                        except Exception:
                            pass
            raise