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


def split_video_to_hls(
    input_path: str, 
    output_dir: str, 
    segment_seconds: int = 5,
    quality_name: str = "",
    bitrate: str = "",
    resolution: str = "",
) -> dict:
    """
    Split video into HLS segments (.ts files) and generate playlist (.m3u8)
    
    Args:
        input_path: Input video path
        output_dir: Output directory for HLS files
        segment_seconds: Duration of each segment
        quality_name: Name for this quality variant (e.g., "360p")
        bitrate: Video bitrate (e.g., "800k")
        resolution: Scale filter (e.g., "scale=-2:360")
    
    Returns:
        dict with paths to playlist and segments
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Build FFmpeg command
    command = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-hls_time", str(segment_seconds),
        "-hls_playlist_type", "vod",
        "-hls_segment_filename", os.path.join(output_dir, "segment_%03d.ts"),
    ]
    
    # Add quality/bitrate parameters if provided
    if bitrate:
        command.extend(["-b:v", bitrate])
    if resolution:
        command.extend(["-vf", resolution])
    
    # Output playlist
    playlist_path = os.path.join(output_dir, "playlist.m3u8")
    command.append(playlist_path)
    
    run_ffmpeg(command)
    
    # Get list of segments
    segments = sorted(
        str(path)
        for path in Path(output_dir).glob("segment_*.ts")
    )
    
    return {
        "playlist": playlist_path,
        "segments": segments,
        "segment_count": len(segments),
    }


def generate_master_playlist(
    variants: list[dict],
    output_path: str,
) -> str:
    """
    Generate master .m3u8 playlist listing all quality variants
    
    Args:
        variants: List of dicts with keys:
            - playlist_path: Path to variant playlist
            - bitrate: Bitrate in bps (e.g., 800000)
            - resolution: Resolution string (e.g., "640x360")
            - name: Quality name (e.g., "360p")
        output_path: Where to save master playlist
    
    Returns:
        Path to master playlist
    """
    content = ["#EXTM3U"]
    
    for variant in variants:
        content.append(
            f'#EXT-X-STREAM-INF:BANDWIDTH={variant["bitrate"]},'
            f'RESOLUTION={variant["resolution"]}'
        )
        content.append(variant["playlist_path"])
    
    with open(output_path, "w") as f:
        f.write("\n".join(content))
    
    return output_path


def convert_to_hls_adaptive(
    input_path: str,
    output_dir: str,
    segment_seconds: int = 5,
) -> dict:
    """
    Convert video to HLS with adaptive bitrate (multiple qualities)
    
    Returns:
        dict with paths to all playlists and segments organized by quality
    """
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
        print(f"🎬 Generating HLS for {name}...", flush=True)
        
        result = split_video_to_hls(
            input_path=input_path,
            output_dir=quality_dir,
            segment_seconds=segment_seconds,
            quality_name=name,
            bitrate=settings["bitrate"],
            resolution=settings["resolution"],
        )
        
        quality_results[name] = {
            "playlist": result["playlist"],
            "segments": result["segments"],
            "segment_count": result["segment_count"],
            "bitrate": settings["bitrate"],
            "bitrate_bps": settings["bitrate_bps"],
            "resolution": f"{settings['width']}x{settings['height']}",
        }
        
        variants.append({
            "playlist_path": f"{name}/playlist.m3u8",
            "bitrate": settings["bitrate_bps"],
            "resolution": f"{settings['width']}x{settings['height']}",
            "name": name,
        })
    
    # Generate master playlist
    master_path = os.path.join(output_dir, "master.m3u8")
    generate_master_playlist(variants, master_path)
    
    return {
        "master_playlist": master_path,
        "qualities": quality_results,
    }


# Keep these for backward compatibility if needed
def split_video(input_path: str, output_dir: str, segment_seconds: int = 5) -> list[str]:
    """Legacy function - use split_video_to_hls for new code"""
    os.makedirs(output_dir, exist_ok=True)
    output_pattern = os.path.join(output_dir, "segment_%03d.mp4")
    
    command = [
        "ffmpeg", "-y", "-i", input_path,
        "-map", "0", "-c", "copy",
        "-segment_time", str(segment_seconds),
        "-f", "segment", "-reset_timestamps", "1",
        output_pattern,
    ]
    
    run_ffmpeg(command)
    
    return sorted(
        str(path)
        for path in Path(output_dir).glob("segment_*.mp4")
    )


def convert_quality(input_path: str, output_path: str, height: int) -> None:
    """Legacy function - use split_video_to_hls for new code"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    scale = f"scale=-2:{height}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2"
    
    command = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", scale,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-movflags", "+faststart",
        output_path,
    ]
    
    run_ffmpeg(command)


def convert_all_qualities(input_path: str, output_dir: str) -> dict[str, str]:
    """Legacy function - use convert_to_hls_adaptive for new code"""
    qualities = {"360p": 360, "720p": 720, "1080p": 1080}
    results = {}
    
    for name, height in qualities.items():
        output_path = os.path.join(output_dir, name, "video.mp4")
        convert_quality(input_path, output_path, height)
        results[name] = output_path
    
    return results