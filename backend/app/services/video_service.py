# app/services/video_service.py
import os
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

from app.core.config import OUTPUT_DIR, UPLOAD_DIR


class VideoService:
    """Service for video processing operations"""
    
    @staticmethod
    def get_video_info(video_path: str) -> Dict[str, Any]:
        """
        Get video metadata using ffprobe
        
        Args:
            video_path: Path to video file
        
        Returns:
            Dict with duration, resolution, fps, etc.
        """
        import json
        
        try:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v", "quiet",
                    "-print_format", "json",
                    "-show_format",
                    "-show_streams",
                    video_path
                ],
                capture_output=True,
                text=True,
                check=True
            )
            
            data = json.loads(result.stdout)
            
            # Extract video & audio streams
            video_stream = None
            audio_stream = None
            for stream in data.get("streams", []):
                if stream.get("codec_type") == "video" and video_stream is None:
                    video_stream = stream
                elif stream.get("codec_type") == "audio" and audio_stream is None:
                    audio_stream = stream
            
            fps_val = 30.0
            if video_stream and "r_frame_rate" in video_stream:
                parts = str(video_stream["r_frame_rate"]).split("/")
                if len(parts) == 2 and float(parts[1]) > 0:
                    fps_val = round(float(parts[0]) / float(parts[1]), 2)
                elif len(parts) == 1:
                    try:
                        fps_val = round(float(parts[0]), 2)
                    except ValueError:
                        pass

            w = int(video_stream.get("width", 0)) if video_stream else 0
            h = int(video_stream.get("height", 0)) if video_stream else 0
            res_str = f"{w}x{h}" if w and h else ("1080p" if h == 1080 else f"{h}p" if h else "1080p")

            info = {
                "duration": float(data.get("format", {}).get("duration", 0)),
                "size": int(data.get("format", {}).get("size", 0)),
                "bitrate": int(data.get("format", {}).get("bit_rate", 0)),
                "codec": video_stream.get("codec_name") if video_stream else "h264",
                "video_codec": video_stream.get("codec_name") if video_stream else "h264",
                "width": w,
                "height": h,
                "resolution": res_str,
                "fps": fps_val,
                "pixel_format": video_stream.get("pix_fmt") if video_stream else "yuv420p",
                "audio_codec": audio_stream.get("codec_name") if audio_stream else "aac",
                "audio_channels": int(audio_stream.get("channels", 2)) if audio_stream else 2,
                "sample_rate": int(audio_stream.get("sample_rate", 44100)) if audio_stream else 44100,
            }
            
            return info
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def convert_quality(
        input_path: str,
        output_path: str,
        quality: str = "1080p"
    ) -> str:
        """
        Convert video to specified quality
        
        Args:
            input_path: Input video path
            output_path: Output video path
            quality: 360p, 720p, 1080p, 4K
        
        Returns:
            Output path
        """
        quality_map = {
            "360p": "scale=-2:360",
            "720p": "scale=-2:720",
            "1080p": "scale=-2:1080",
            "4K": "scale=-2:2160"
        }
        
        scale_filter = quality_map.get(quality, "scale=-2:1080")
        
        command = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vf", scale_filter,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "aac",
            "-movflags", "+faststart",
            output_path
        ]
        
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return output_path
    
    @staticmethod
    def extract_thumbnail(
        video_path: str,
        output_path: str,
        timestamp: float = 1.0,
        width: int = 640
    ) -> str:
        """Extract a high quality thumbnail from video at specified timestamp"""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        safe_ts = max(0.0, float(timestamp))
        command = [
            "ffmpeg", "-y",
            "-ss", f"{safe_ts:.3f}",
            "-i", video_path,
            "-frames:v", "1",
            "-vf", f"scale={width}:-1",
            "-q:v", "2",
            output_path
        ]
        
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return output_path
    
    @staticmethod
    def get_video_duration(video_path: str) -> float:
        """Get video duration in seconds"""
        try:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v", "quiet",
                    "-show_format",
                    "-print_format", "json",
                    video_path
                ],
                capture_output=True,
                text=True,
                check=True
            )
            import json
            data = json.loads(result.stdout)
            return float(data.get("format", {}).get("duration", 0))
        except Exception:
            return 0