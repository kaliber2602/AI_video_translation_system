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
            
            # Extract video stream
            video_stream = None
            for stream in data.get("streams", []):
                if stream.get("codec_type") == "video":
                    video_stream = stream
                    break
            
            info = {
                "duration": float(data.get("format", {}).get("duration", 0)),
                "size": int(data.get("format", {}).get("size", 0)),
                "bitrate": int(data.get("format", {}).get("bit_rate", 0)),
                "codec": video_stream.get("codec_name") if video_stream else None,
                "width": int(video_stream.get("width", 0)) if video_stream else 0,
                "height": int(video_stream.get("height", 0)) if video_stream else 0,
                "fps": float(video_stream.get("r_frame_rate", "0/1").split("/")[0]) if video_stream else 0,
                "pixel_format": video_stream.get("pix_fmt") if video_stream else None,
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
        timestamp: float = 0
    ) -> str:
        """Extract a thumbnail from video at specified timestamp"""
        command = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-ss", str(timestamp),
            "-vframes", "1",
            "-vf", "scale=320:-1",
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