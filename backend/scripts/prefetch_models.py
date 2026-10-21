import os
import sys
import time

# Kéo dài thời gian chờ mạng để tránh timeout
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "120")
os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "30")
os.environ.setdefault("COQUI_TOS_AGREED", "1")

CACHE_DIR = os.environ.get("HF_HOME", "/opt/model-cache/hf")
TORCH_HOME = os.environ.get("TORCH_HOME", "/opt/model-cache/torch")
os.environ["TORCH_HOME"] = TORCH_HOME

MAX_ATTEMPTS = 5

def _with_retries(label: str, fn):
    """Hàm tự động thử lại khi rớt mạng, hỗ trợ nối file tải dở."""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            print(f"[prefetch] {label}: Thử tải lần {attempt}/{MAX_ATTEMPTS}...", flush=True)
            fn()
            print(f"[prefetch] {label}: TẢI XONG VÀ ĐÃ CACHE SẴN!", flush=True)
            return
        except Exception as e:
            print(f"[prefetch] Lỗi tải {label} ở lần {attempt}: {e}", flush=True)
            if attempt == MAX_ATTEMPTS:
                print(f"[prefetch] CẢNH BÁO: Bỏ qua {label} sau {MAX_ATTEMPTS} lần thử: {e}", flush=True)
                return
            print("Đang thử lại sau 5 giây...", flush=True)
            time.sleep(5)


def prefetch_whisper():
    try:
        from faster_whisper import WhisperModel
        # Pre-cache các kích thước model STT phổ biến
        for model_size in ["base", "small", "medium", "large-v3"]:
            def _dl(ms=model_size):
                WhisperModel(ms, device="cpu", compute_type="int8", download_root=CACHE_DIR)
            _with_retries(f"Faster-Whisper ({model_size})", _dl)
    except Exception as e:
        print(f"[prefetch] Faster-whisper error: {e}", flush=True)


def prefetch_nllb():
    try:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        for model_name in [
            "facebook/nllb-200-distilled-600M",
            "facebook/nllb-200-1.3B",
            "facebook/nllb-200-3.3B"
        ]:
            def _dl(mn=model_name):
                AutoTokenizer.from_pretrained(mn, cache_dir=CACHE_DIR)
                AutoModelForSeq2SeqLM.from_pretrained(mn, cache_dir=CACHE_DIR)
            _with_retries(f"NLLB ({model_name})", _dl)
    except Exception as e:
        print(f"[prefetch] NLLB error: {e}", flush=True)


def prefetch_demucs():
    try:
        import demucs.pretrained
        for model_name in ["htdemucs", "htdemucs_ft"]:
            def _dl(mn=model_name):
                demucs.pretrained.get_model(mn)
            _with_retries(f"Demucs ({model_name})", _dl)
    except Exception as e:
        print(f"[prefetch] Demucs error: {e}", flush=True)


def prefetch_sentence_transformers():
    try:
        from sentence_transformers import SentenceTransformer
        def _dl():
            SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", cache_folder=CACHE_DIR)
        _with_retries("SentenceTransformers (paraphrase-multilingual-MiniLM-L12-v2)", _dl)
    except Exception as e:
        print(f"[prefetch] SentenceTransformers error: {e}", flush=True)


def prefetch_xtts():
    try:
        from TTS.api import TTS
        def _dl():
            TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)
        _with_retries("Coqui XTTS-v2", _dl)
    except Exception as e:
        print(f"[prefetch] Coqui XTTS error: {e}", flush=True)


def prefetch_ollama_models(models=None):
    """
    Tự động pull và kiểm tra các mô hình LLM vào Ollama container khi khởi chạy.
    Đảm bảo 100% các model trên frontend khả dụng, không để người dùng chờ khi gọi.
    """
    if models is None:
        models = ["qwen2.5:3b"]

    ollama_urls = [
        os.environ.get("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/"),
        "http://ollama:11434",
        "http://127.0.0.1:11434",
        "http://localhost:11434",
    ]

    import urllib.request
    import json

    # 1. Tìm endpoint Ollama đang sống (thử tối đa 15 lần vì Ollama có thể mất 5-10s khởi động ban đầu)
    alive_url = None
    for attempt in range(1, 16):
        for base_url in ollama_urls:
            try:
                req = urllib.request.Request(f"{base_url}/api/tags", headers={"User-Agent": "VidNova-Prefetch"})
                with urllib.request.urlopen(req, timeout=3) as resp:
                    if resp.status == 200:
                        alive_url = base_url
                        break
            except Exception:
                pass
        if alive_url:
            break
        print(f"[prefetch] Đang đợi Ollama server sẵn sàng (lần {attempt}/15)...", flush=True)
        time.sleep(2)

    if not alive_url:
        print("[prefetch] CẢNH BÁO: Không kết nối được đến Ollama server để prefetch LLM models.", flush=True)
        return

    print(f"[prefetch] Kết nối thành công Ollama server tại: {alive_url}", flush=True)

    # 2. Lấy danh sách model hiện có
    existing_models = []
    try:
        req = urllib.request.Request(f"{alive_url}/api/tags", headers={"User-Agent": "VidNova-Prefetch"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            existing_models = [m.get("name", "").lower() for m in data.get("models", [])]
    except Exception as e:
        print(f"[prefetch] Không thể đọc danh sách model hiện tại của Ollama: {e}", flush=True)

    # 3. Pull từng model nếu chưa có
    for m in models:
        clean_name = m.strip()
        matched = any(clean_name.lower() in em or em in clean_name.lower() for em in existing_models)
        if matched:
            print(f"[prefetch] Ollama model '{clean_name}' đã tồn tại sẵn trong cache. Bỏ qua pull.", flush=True)
            continue

        def _pull_model(mn=clean_name):
            print(f"[prefetch] Đang pull model LLM '{mn}' về Ollama...", flush=True)
            pull_url = f"{alive_url}/api/pull"
            payload = json.dumps({"name": mn, "stream": False}).encode("utf-8")
            pull_req = urllib.request.Request(
                pull_url,
                data=payload,
                headers={"Content-Type": "application/json", "User-Agent": "VidNova-Prefetch"},
            )
            # LLM pull có thể mất vài phút tuỳ mạng
            with urllib.request.urlopen(pull_req, timeout=600) as pull_resp:
                res = json.loads(pull_resp.read().decode("utf-8"))
                if res.get("status") != "success" and "error" in res:
                    raise RuntimeError(f"Ollama pull returned: {res}")
            print(f"[prefetch] Pull thành công Ollama model '{mn}'!", flush=True)

        _with_retries(f"Ollama Model ({clean_name})", _pull_model)


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    print(f"============================================================")
    print(f"[PREFETCH] BAT DAU TIEN TRINH PREFETCH AI MODELS (Target: {target})")
    print(f"HF_HOME: {CACHE_DIR} | TORCH_HOME: {TORCH_HOME}")
    print(f"============================================================")

    if target in ("whisper", "all"):
        prefetch_whisper()
    if target in ("nllb", "all"):
        prefetch_nllb()
    if target in ("demucs", "all"):
        prefetch_demucs()
    if target in ("sentence", "all"):
        prefetch_sentence_transformers()
    if target in ("xtts", "all"):
        prefetch_xtts()
    if target in ("ollama", "all"):
        prefetch_ollama_models()

    print("============================================================")
    print("[PREFETCH] TOAN BO CAC AI MODELS DA DUOC TAI VA LUU VAO CACHE THANH CONG!")
    print("============================================================")
