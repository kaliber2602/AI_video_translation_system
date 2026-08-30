# app/services/hls_service.py - NEW FILE
import os
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from app.services.s3_service import upload_file


def run_ffmpeg(command: list[str]) -> None:
    """Run FFmpeg command with error handling"""
    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed:\n{result.stderr[-5000:]}")


def convert_to_hls_adaptive(
    input_path: str,
    output_dir: str,
    segment_seconds: int = 5,
) -> dict:
    """
    Convert video to HLS format with adaptive bitrate streaming.
    
    This is a POST-PROCESSING step after translation.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    qualities = {
        "360p": {
            "resolution": "scale=-2:360",
            "bitrate": "800k",
            "bitrate_bps": 800000,
            "width": 640,
            "height": 360,
        },
        "720p": {
            "resolution": "scale=-2:720",
            "bitrate": "2500k",
            "bitrate_bps": 2500000,
            "width": 1280,
            "height": 720,
        },
        "1080p": {
            "resolution": "scale=-2:1080",
            "bitrate": "5000k",
            "bitrate_bps": 5000000,
            "width": 1920,
            "height": 1080,
        },
    }
    
    variants = []
    quality_results = {}
    
    for name, settings in qualities.items():
        quality_dir = os.path.join(output_dir, name)
        os.makedirs(quality_dir, exist_ok=True)
        
        print(f"🎬 Generating HLS for {name}...", flush=True)
        
        # Generate HLS for this quality
        command = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-b:v", settings["bitrate"],
            "-vf", settings["resolution"],
            "-hls_time", str(segment_seconds),
            "-hls_playlist_type", "vod",
            "-hls_segment_filename", os.path.join(quality_dir, "segment_%03d.ts"),
            os.path.join(quality_dir, "playlist.m3u8"),
        ]
        
        run_ffmpeg(command)
        
        segments = sorted(
            str(path)
            for path in Path(quality_dir).glob("segment_*.ts")
        )
        
        quality_results[name] = {
            "playlist": os.path.join(quality_dir, "playlist.m3u8"),
            "segments": segments,
            "segment_count": len(segments),
            "bitrate": settings["bitrate"],
            "bitrate_bps": settings["bitrate_bps"],
            "resolution": f"{settings['width']}x{settings['height']}",
        }
        
        variants.append({
            "playlist_path": f"{name}/playlist.m3u8",
            "bitrate": settings["bitrate_bps"],
            "resolution": f"{settings['width']}x{settings['height']}",
        })
    
    # Generate master playlist
    master_path = os.path.join(output_dir, "master.m3u8")
    content = ["#EXTM3U"]
    for variant in variants:
        content.append(
            f'#EXT-X-STREAM-INF:BANDWIDTH={variant["bitrate"]},'
            f'RESOLUTION={variant["resolution"]}'
        )
        content.append(variant["playlist_path"])
    
    with open(master_path, "w") as f:
        f.write("\n".join(content))
    
    return {
        "master_playlist": master_path,
        "qualities": quality_results,
        "output_dir": output_dir,
    }


def upload_hls_to_s3(
    hls_result: dict,
    s3_prefix: str,
) -> dict:
    """
    Upload all HLS files (.m3u8 and .ts) to S3
    """
    output_dir = hls_result["output_dir"]
    uploaded = {
        "master_playlist": None,
        "playlists": [],
        "segments": [],
    }
    
    content_type_map = {
        ".m3u8": "application/x-mpegURL",
        ".ts": "video/mp2t",
    }
    
    for root, dirs, files in os.walk(output_dir):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, output_dir)
            
            ext = os.path.splitext(file)[1]
            content_type = content_type_map.get(ext, "application/octet-stream")
            
            s3_key = f"{s3_prefix}/{relative_path}".replace("\\", "/")
            upload_file(local_path, s3_key, content_type)
            
            if ext == ".m3u8":
                if "master.m3u8" in file:
                    uploaded["master_playlist"] = s3_key
                else:
                    uploaded["playlists"].append(s3_key)
            elif ext == ".ts":
                uploaded["segments"].append(s3_key)
    
    return uploaded