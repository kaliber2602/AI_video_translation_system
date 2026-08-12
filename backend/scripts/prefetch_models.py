import os
import sys
import time
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from faster_whisper import WhisperModel

# Kéo dài thời gian chờ mạng để tránh timeout
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "120")
os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "30")

MAX_ATTEMPTS = 5

def _with_retries(label: str, fn):
    """Hàm tự động thử lại khi rớt mạng, hỗ trợ nối file tải dở."""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            print(f"[prefetch] {label}: Thử tải lần {attempt}/{MAX_ATTEMPTS}...", flush=True)
            fn()
            print(f"[prefetch] {label}: TẢI XONG!", flush=True)
            return
        except Exception as e:
            print(f"[prefetch] Lỗi tải {label} ở lần {attempt}: {e}", flush=True)
            if attempt == MAX_ATTEMPTS:
                print(f"[prefetch] THẤT BẠI HOÀN TOÀN sau {MAX_ATTEMPTS} lần thử. Vui lòng kiểm tra lại mạng.")
                raise e
            print("Đang thử lại sau 5 giây (Hệ thống sẽ tải tiếp phần bị đứt)...", flush=True)
            time.sleep(5)


def prefetch_whisper():
    def _download():
        WhisperModel("large-v3", device="cpu", compute_type="int8", download_root="/opt/model-cache/hf")
    _with_retries("Faster-Whisper large-v3", _download)


def prefetch_nllb():
    def _download():
        model_name = "facebook/nllb-200-1.3B"
        AutoTokenizer.from_pretrained(model_name)
        AutoModelForSeq2SeqLM.from_pretrained(model_name)
    _with_retries("NLLB-200-1.3B ", _download)


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target in ("whisper", "all"):
        prefetch_whisper()
    if target in ("nllb", "all"):
        prefetch_nllb()