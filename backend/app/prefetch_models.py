"""Pre-download AI models at Docker build time, so runtime requests never
have to wait on (or fail because of) a multi-GB download.

Usage:
    python scripts/prefetch_models.py whisper
    python scripts/prefetch_models.py nllb
    python scripts/prefetch_models.py diarization
    python scripts/prefetch_models.py all

Split into subcommands on purpose so each one can be its own Dockerfile
RUN layer: if a download times out partway through, only that layer needs
to be retried on the next `docker compose build` — earlier successful
layers stay cached instead of re-downloading everything from scratch.

Retries + a longer per-request timeout are set here because the default
huggingface_hub timeout (10s) is too short for multi-GB files on slower
connections.
"""

import os
import sys
import time

# Give each HTTP request up to 120s instead of the 10s default, and let
# huggingface_hub resume/retry partial downloads.
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "120")
os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "30")

MAX_ATTEMPTS = 5
RETRY_BACKOFF_SECONDS = 10


def _with_retries(label: str, fn) -> None:
    last_exc = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            print(f"[prefetch] {label}: attempt {attempt}/{MAX_ATTEMPTS}...", flush=True)
            fn()
            print(f"[prefetch] {label}: done.", flush=True)
            return
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            wait = RETRY_BACKOFF_SECONDS * attempt
            print(
                f"[prefetch] {label}: attempt {attempt} failed ({exc}). "
                f"Retrying in {wait}s...",
                flush=True,
            )
            time.sleep(wait)
    raise RuntimeError(f"{label} failed after {MAX_ATTEMPTS} attempts: {last_exc}")


def prefetch_whisper() -> None:
    from faster_whisper import WhisperModel

    model_size = os.getenv("WHISPER_MODEL", "small")
    device = os.getenv("WHISPER_DEVICE", "cpu")
    compute_type = "int8" if device == "cpu" else "float16"

    def _download():
        WhisperModel(model_size, device=device, compute_type=compute_type)

    _with_retries(f"faster-whisper '{model_size}'", _download)


def prefetch_nllb() -> None:
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    model_name = "facebook/nllb-200-distilled-600M"

    def _download():
        AutoTokenizer.from_pretrained(model_name)
        AutoModelForSeq2SeqLM.from_pretrained(model_name)

    _with_retries("NLLB-200 (~2.4GB)", _download)


def prefetch_diarization() -> None:
    token = os.getenv("HF_TOKEN", "")
    if not token:
        print(
            "[prefetch] HF_TOKEN not set — skipping diarization model "
            "download at build time. It will be downloaded lazily on first "
            "use instead.",
            flush=True,
        )
        return

    from pyannote.audio import Pipeline

    def _download():
        Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=token)

    _with_retries("pyannote diarization", _download)


COMMANDS = {
    "whisper": prefetch_whisper,
    "nllb": prefetch_nllb,
    "diarization": prefetch_diarization,
}


def main() -> int:
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    to_run = COMMANDS.values() if target == "all" else [COMMANDS[target]]

    exit_code = 0
    for step in to_run:
        try:
            step()
        except Exception as exc:  # noqa: BLE001
            print(f"[prefetch] ERROR: {exc}", flush=True)
            # Diarization is optional — don't fail the build over it, the
            # app can still retry lazily at request time.
            if step is prefetch_diarization:
                continue
            exit_code = 1
    return exit_code


if __name__ == "__main__":
    sys.exit(main())