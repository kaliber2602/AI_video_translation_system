import os
import subprocess
from pathlib import Path


def run_ffmpeg(command: list[str]) -> None:
    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(
            "FFmpeg failed:\n" + result.stderr[-5000:]
        )


def split_video(input_path: str, output_dir: str, segment_seconds: int = 5) -> list[str]:
    os.makedirs(output_dir, exist_ok=True)

    output_pattern = os.path.join(output_dir, "segment_%03d.mp4")

    command = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-map", "0",
        "-c", "copy",
        "-segment_time", str(segment_seconds),
        "-f", "segment",
        "-reset_timestamps", "1",
        output_pattern,
    ]

    run_ffmpeg(command)

    return sorted(
        str(path)
        for path in Path(output_dir).glob("segment_*.mp4")
    )


def convert_quality(input_path: str, output_path: str, height: int) -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    scale = (
        f"scale=-2:{height}:force_original_aspect_ratio=decrease,"
        "pad=ceil(iw/2)*2:ceil(ih/2)*2"
    )

    command = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-vf", scale,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-movflags", "+faststart",
        output_path,
    ]

    run_ffmpeg(command)


def convert_all_qualities(input_path: str, output_dir: str) -> dict[str, str]:
    qualities = {
        "360p": 360,
        "720p": 720,
        "1080p": 1080,
    }

    results = {}

    for name, height in qualities.items():
        output_path = os.path.join(
            output_dir,
            name,
            "video.mp4",
        )

        convert_quality(input_path, output_path, height)
        results[name] = output_path

    return results