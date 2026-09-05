# app/services/hls_service.py
import os
import shutil
import subprocess
import uuid
import logging
from pathlib import Path
from typing import Dict, List, Optional

from app.services.s3_service import upload_file, upload_hls_directory
from app.core.config import OUTPUT_DIR, AWS_S3_BUCKET

logger = logging.getLogger("app.services.hls_service")


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
    qualities: Optional[List[str]] = None,
) -> dict:
    """
    Convert video to HLS format with adaptive bitrate streaming.
    
    Args:
        input_path: Path to input video
        output_dir: Directory to save HLS files
        segment_seconds: Duration of each segment in seconds
        qualities: List of qualities to generate (default: all)
    
    Returns:
        dict with HLS result information
    """
    os.makedirs(output_dir, exist_ok=True)
    logger.info(f"🎬 Converting {input_path} to HLS adaptive format")
    
    # Define quality profiles
    quality_profiles = {
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
    
    # Filter qualities if specified
    if qualities:
        quality_profiles = {k: v for k, v in quality_profiles.items() if k in qualities}
    
    # Add 240p for mobile if not specified
    if "240p" not in quality_profiles:
        quality_profiles["240p"] = {
            "resolution": "scale=-2:240",
            "bitrate": "300k",
            "bitrate_bps": 300000,
            "width": 426,
            "height": 240,
        }
    
    variants = []
    quality_results = {}
    
    # Get input video info
    probe_cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        input_path
    ]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    original_width, original_height = map(int, result.stdout.strip().split(',')) if result.stdout else (1920, 1080)
    logger.info(f"📹 Original video resolution: {original_width}x{original_height}")
    
    for name, settings in quality_profiles.items():
        # Skip qualities that are higher than original
        if settings["height"] > original_height:
            logger.info(f"⏭️ Skipping {name} (higher than original {original_height}p)")
            continue
            
        quality_dir = os.path.join(output_dir, name)
        os.makedirs(quality_dir, exist_ok=True)
        
        logger.info(f"🎬 Generating HLS for {name}...")
        
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
        
        try:
            run_ffmpeg(command)
        except RuntimeError as e:
            logger.error(f"❌ Failed to generate {name}: {e}")
            continue
        
        segments = sorted(
            str(path)
            for path in Path(quality_dir).glob("segment_*.ts")
        )
        
        if not segments:
            logger.warning(f"⚠️ No segments generated for {name}")
            continue
        
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
    content.append("#EXT-X-VERSION:3")
    
    for variant in variants:
        content.append(
            f'#EXT-X-STREAM-INF:BANDWIDTH={variant["bitrate"]},'
            f'RESOLUTION={variant["resolution"]}'
        )
        content.append(variant["playlist_path"])
    
    with open(master_path, "w") as f:
        f.write("\n".join(content))
    
    logger.info(f"✅ HLS conversion complete: {len(quality_results)} qualities generated")
    
    return {
        "master_playlist": master_path,
        "qualities": quality_results,
        "output_dir": output_dir,
        "variants": variants,
    }


def upload_hls_to_s3(
    hls_result: dict,
    video_id: int,
    language: str,
) -> dict:
    """
    Upload all HLS files (.m3u8 and .ts) to S3 with proper structure.
    
    Args:
        hls_result: Result from convert_to_hls_adaptive
        video_id: Video ID for S3 path
        language: Target language for S3 path
    
    Returns:
        dict with uploaded file information
    """
    output_dir = hls_result["output_dir"]
    s3_prefix = f"videos/{video_id}/hls/{language}"
    
    logger.info(f"📤 Uploading HLS files for video {video_id} to S3: {s3_prefix}")
    
    content_type_map = {
        ".m3u8": "application/x-mpegURL",
        ".ts": "video/mp2t",
    }
    
    uploaded = {
        "master_playlist": None,
        "playlists": [],
        "segments": [],
        "qualities": [],
    }
    
    # Walk through all files in the HLS directory
    for root, dirs, files in os.walk(output_dir):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, output_dir)
            
            # Determine content type
            ext = os.path.splitext(file)[1]
            content_type = content_type_map.get(ext, "application/octet-stream")
            
            # Build S3 key
            s3_key = f"{s3_prefix}/{relative_path}".replace("\\", "/")
            
            # Upload file
            try:
                upload_file(local_path, s3_key, content_type)
                logger.info(f"   Uploaded: {relative_path} -> {s3_key}")
                
                # Track uploaded files
                if ext == ".m3u8":
                    if "master.m3u8" in file:
                        uploaded["master_playlist"] = s3_key
                    else:
                        uploaded["playlists"].append(s3_key)
                elif ext == ".ts":
                    uploaded["segments"].append(s3_key)
                    
            except Exception as e:
                logger.error(f"❌ Failed to upload {relative_path}: {e}")
    
    # Track qualities
    for quality in hls_result.get("qualities", {}).keys():
        uploaded["qualities"].append(quality)
    
    logger.info(f"✅ HLS upload complete: {len(uploaded['segments'])} segments, {len(uploaded['playlists'])} playlists")
    logger.info(f"   Master playlist: {uploaded['master_playlist']}")
    logger.info(f"   S3 URI: s3://{AWS_S3_BUCKET}/{uploaded['master_playlist']}")
    
    return uploaded


def process_video_to_hls(
    input_path: str,
    video_id: int,
    language: str,
    qualities: Optional[List[str]] = None,
) -> dict:
    """
    Complete HLS processing: convert and upload to S3.
    
    Args:
        input_path: Path to input video
        video_id: Video ID
        language: Target language
        qualities: List of qualities to generate
    
    Returns:
        dict with HLS processing results
    """
    # Create unique directory for this HLS conversion
    hls_dir = OUTPUT_DIR / f"hls_{video_id}_{uuid.uuid4().hex[:8]}"
    
    try:
        # Convert to HLS
        hls_result = convert_to_hls_adaptive(
            input_path=input_path,
            output_dir=str(hls_dir),
            segment_seconds=5,
            qualities=qualities
        )
        
        # Upload to S3
        upload_result = upload_hls_to_s3(
            hls_result=hls_result,
            video_id=video_id,
            language=language
        )
        
        # Clean up local HLS files (optional, to save space)
        import shutil
        shutil.rmtree(hls_dir, ignore_errors=True)
        logger.info(f"🧹 Cleaned up local HLS directory: {hls_dir}")
        
        return {
            "hls_result": hls_result,
            "upload_result": upload_result,
            "master_playlist_s3": upload_result.get("master_playlist"),
            "qualities": upload_result.get("qualities", []),
            "segment_count": len(upload_result.get("segments", [])),
        }
        
    except Exception as e:
        logger.error(f"❌ HLS processing failed: {e}")
        # Clean up on failure
        import shutil
        shutil.rmtree(hls_dir, ignore_errors=True)
        raise