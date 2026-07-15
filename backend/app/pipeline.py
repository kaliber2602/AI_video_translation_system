"""Core AI pipeline stages: audio extraction, STT, diarization, chaptering.

All stages here call real models/tools (ffmpeg, faster-whisper, pyannote.audio).
There is no synthetic/placeholder output: if a required tool or model is
missing, the corresponding function raises a clear RuntimeError instead of
silently faking data, so failures are visible instead of hidden.
"""

import os
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Optional, TypedDict

from app.services import UPLOAD_DIR

try:
    from faster_whisper import WhisperModel  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    WhisperModel = None

try:
    from pyannote.audio import Pipeline as PyannotePipeline  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    PyannotePipeline = None


class Segment(TypedDict):
    start: float
    end: float
    text: str
    speaker: Optional[str]


# ---------------------------------------------------------------------------
# Audio extraction
# ---------------------------------------------------------------------------

def extract_audio(video_path: str) -> str:
    """Extract mono 16kHz WAV audio from a video using ffmpeg (required)."""
    output_path = UPLOAD_DIR / f"{Path(video_path).stem}.wav"
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError(
            "ffmpeg not found on PATH. Install ffmpeg (already included in the "
            "provided Dockerfile) to extract audio."
        )

    result = subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            video_path,
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-acodec",
            "pcm_s16le",
            str(output_path),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not output_path.exists():
        raise RuntimeError(f"ffmpeg failed to extract audio: {result.stderr.strip()}")
    return str(output_path)


# ---------------------------------------------------------------------------
# Speech-to-text (faster-whisper)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_whisper_model() -> "WhisperModel":
    if WhisperModel is None:
        raise RuntimeError(
            "faster-whisper is not installed. Run: "
            "pip install -r requirements.txt"
        )
    model_size = os.getenv("WHISPER_MODEL", "small")
    device = os.getenv("WHISPER_DEVICE", "cpu")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8" if device == "cpu" else "float16")
    return WhisperModel(model_size, device=device, compute_type=compute_type)


def transcribe_segments(audio_path: str, language: Optional[str] = None) -> list[Segment]:
    """Run real speech-to-text and return timestamped segments."""
    model = _get_whisper_model()
    raw_segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        language=language,
        vad_filter=True,
    )
    segments: list[Segment] = []
    for seg in raw_segments:
        text = seg.text.strip()
        if not text:
            continue
        segments.append({"start": seg.start, "end": seg.end, "text": text, "speaker": None})

    if not segments:
        raise RuntimeError(
            "Whisper produced no speech segments for this audio. The file may be "
            "silent, corrupted, or in an unsupported format."
        )
    return segments


def create_transcript_from_audio(audio_path: str, language: Optional[str] = None) -> str:
    """Convenience wrapper returning a flat, human-readable transcript string."""
    segments = transcribe_segments(audio_path, language=language)
    return "\n".join(f"[{_format_ts(s['start'])}] {s['text']}" for s in segments)


def _format_ts(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


# ---------------------------------------------------------------------------
# Speaker diarization (pyannote.audio) — optional, gated model on Hugging Face
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_diarization_pipeline():
    if PyannotePipeline is None:
        return None
    token = os.getenv("HF_TOKEN")
    if not token:
        return None
    try:
        return PyannotePipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1", use_auth_token=token
        )
    except Exception:
        return None


def diarize(audio_path: str) -> Optional[list[dict]]:
    """Return [{start, end, speaker}, ...] or None if diarization unavailable.

    Requires: pip install pyannote.audio, an accepted license + HF_TOKEN env
    var for the gated pyannote/speaker-diarization-3.1 model.
    """
    pipeline = _get_diarization_pipeline()
    if pipeline is None:
        return None
    diarization = pipeline(audio_path)
    turns = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        turns.append({"start": turn.start, "end": turn.end, "speaker": speaker})
    return turns


def assign_speakers(segments: list[Segment], diarization_turns: Optional[list[dict]]) -> list[Segment]:
    """Label each transcript segment with the diarized speaker with the most overlap."""
    if not diarization_turns:
        return segments
    for seg in segments:
        best_speaker, best_overlap = None, 0.0
        for turn in diarization_turns:
            overlap = min(seg["end"], turn["end"]) - max(seg["start"], turn["start"])
            if overlap > best_overlap:
                best_overlap, best_speaker = overlap, turn["speaker"]
        seg["speaker"] = best_speaker
    return segments


# ---------------------------------------------------------------------------
# Chaptering — grouped dynamically from real segment timing/content, not fixed
# ---------------------------------------------------------------------------

def create_chapters(
    segments: list[Segment],
    gap_seconds: float = 6.0,
    min_chapter_seconds: float = 30.0,
) -> list[dict]:
    """Group segments into chapters based on pauses and a minimum duration.

    A new chapter starts when there is a silence gap >= gap_seconds between
    two segments AND the current chapter already spans >= min_chapter_seconds.
    This adapts to the actual content instead of returning a fixed count.
    """
    if not segments:
        return []

    chapters: list[dict] = []
    current = {
        "title": None,
        "start": segments[0]["start"],
        "end": segments[0]["end"],
        "texts": [segments[0]["text"]],
    }

    for prev, seg in zip(segments, segments[1:]):
        gap = seg["start"] - prev["end"]
        chapter_span = prev["end"] - current["start"]
        if gap >= gap_seconds and chapter_span >= min_chapter_seconds:
            chapters.append(current)
            current = {"title": None, "start": seg["start"], "end": seg["end"], "texts": [seg["text"]]}
        else:
            current["end"] = seg["end"]
            current["texts"].append(seg["text"])

    chapters.append(current)

    result = []
    for idx, chap in enumerate(chapters, start=1):
        full_text = " ".join(chap["texts"])
        title_source = chap["texts"][0]
        title = title_source[:60] + ("..." if len(title_source) > 60 else "")
        result.append(
            {
                "title": f"Chapter {idx}: {title}",
                "start": _format_ts(chap["start"]),
                "end": _format_ts(chap["end"]),
                "text": full_text,
            }
        )
    return result