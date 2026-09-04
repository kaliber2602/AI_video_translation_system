# app/services/export_service.py
import os
import subprocess
import shutil
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("app.services.export_service")

class ExportService:
    def __init__(self):
        self.exports_dir = "outputs/exports"
        os.makedirs(self.exports_dir, exist_ok=True)

    def export_final_video(
        self,
        video_path: str,
        format: str = "mp4",
        quality: str = "1080p"
    ) -> str:
        """Export final video with specified quality."""
        # Check if input video exists and is valid
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        file_size = os.path.getsize(video_path)
        if file_size < 1024:
            raise ValueError(f"Video file is too small ({file_size} bytes), likely corrupted")
        
        # Generate output filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"export_{timestamp}.{format}"
        output_path = os.path.join(self.exports_dir, output_filename)
        
        # Ensure exports directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Parse quality to height
        quality_map = {
            "360p": 360,
            "720p": 720,
            "1080p": 1080,
            "4K": 2160
        }
        height = quality_map.get(quality, 1080)
        
        logger.info(f"Exporting video: {video_path} -> {output_path} (quality: {quality})")
        
        try:
            # First, verify the input video with ffprobe
            probe_cmd = [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=format_name,format_long_name",
                "-show_entries", "stream=codec_name,width,height",
                "-of", "default=noprint_wrappers=1",
                video_path
            ]
            probe_result = subprocess.run(probe_cmd, capture_output=True, text=True)
            if probe_result.returncode != 0:
                logger.error(f"FFprobe failed: {probe_result.stderr}")
                # Try a simpler approach - just copy the file
                logger.info("Attempting to copy file directly...")
                shutil.copy2(video_path, output_path)
                return output_path
            
            logger.info(f"Video info: {probe_result.stdout}")
            
            # If the video is already at or below target quality, copy it
            if quality in ["360p", "720p"]:
                # Check if video is already at target resolution
                if "height" in probe_result.stdout:
                    import re
                    height_match = re.search(r'height=(\d+)', probe_result.stdout)
                    if height_match:
                        current_height = int(height_match.group(1))
                        if current_height <= height:
                            logger.info(f"Video already at or below {quality}, copying directly")
                            shutil.copy2(video_path, output_path)
                            return output_path
            
            # Use FFmpeg to re-encode
            command = [
                "ffmpeg", "-y",
                "-i", video_path,
                "-vf", f"scale=-2:{height}",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                "-movflags", "+faststart",
                output_path
            ]
            
            logger.info(f"Running FFmpeg command: {' '.join(command)}")
            result = subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"FFmpeg failed with error: {result.stderr}")
                # Fallback: try to copy the original file
                logger.info("Fallback: Copying original file")
                shutil.copy2(video_path, output_path)
                return output_path
            
            # Verify output
            if not os.path.exists(output_path):
                raise FileNotFoundError(f"Output file not created: {output_path}")
            
            out_size = os.path.getsize(output_path)
            if out_size < 1024:
                logger.warning(f"Output file is very small ({out_size} bytes), may be corrupted")
                # Fallback: copy original
                shutil.copy2(video_path, output_path)
                logger.info(f"Fallback: Copied original to {output_path}")
            
            logger.info(f"✅ Video exported successfully: {output_path} ({out_size} bytes)")
            return output_path
            
        except Exception as e:
            logger.error(f"Export failed: {str(e)}")
            # Last resort: copy the file
            try:
                shutil.copy2(video_path, output_path)
                logger.info(f"Emergency fallback: Copied original to {output_path}")
                return output_path
            except Exception as copy_error:
                logger.error(f"Emergency fallback also failed: {copy_error}")
                raise

    def export_audio(self, audio_path: str, format: str = "mp3") -> str:
        """Export audio in specified format."""
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"audio_{timestamp}.{format}"
        output_path = os.path.join(self.exports_dir, output_filename)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        command = [
            "ffmpeg", "-y",
            "-i", audio_path,
            "-vn",
            "-acodec", "mp3" if format == "mp3" else "pcm_s16le",
            "-ab", "192k" if format == "mp3" else "",
            output_path
        ]
        
        try:
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            logger.info(f"✅ Audio exported: {output_path}")
            return output_path
        except subprocess.CalledProcessError as e:
            logger.error(f"Audio export failed: {e}")
            raise

    def export_transcript(self, transcript_path: str, format: str = "json") -> str:
        """Export transcript in specified format."""
        if not os.path.exists(transcript_path):
            raise FileNotFoundError(f"Transcript file not found: {transcript_path}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"transcript_{timestamp}.{format}"
        output_path = os.path.join(self.exports_dir, output_filename)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Simple copy for now
        shutil.copy2(transcript_path, output_path)
        logger.info(f"✅ Transcript exported: {output_path}")
        return output_path

    def export_translation(self, translation_path: str, format: str = "json") -> str:
        """Export translation in specified format."""
        if not os.path.exists(translation_path):
            raise FileNotFoundError(f"Translation file not found: {translation_path}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"translation_{timestamp}.{format}"
        output_path = os.path.join(self.exports_dir, output_filename)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        shutil.copy2(translation_path, output_path)
        logger.info(f"✅ Translation exported: {output_path}")
        return output_path

    def get_available_exports(self, video) -> dict:
        """Get available export options for a video."""
        exports = {
            "final_video": {
                "available": False,
                "formats": ["mp4", "mov", "avi"],
                "qualities": ["360p", "720p", "1080p", "4K"]
            },
            "audio": {
                "available": False,
                "formats": ["mp3", "wav"]
            },
            "transcript": {
                "available": False,
                "formats": ["json", "txt"]
            },
            "translation": {
                "available": False,
                "formats": ["json", "txt"]
            },
            "subtitles": {
                "available": False,
                "formats": ["srt", "vtt", "ass"]
            }
        }
        
        # Check final video
        if video.output_path and os.path.exists(video.output_path):
            file_size = os.path.getsize(video.output_path)
            if file_size >= 1024:  # At least 1KB
                exports["final_video"]["available"] = True
        
        # Check audio
        if video.dubbed_audio_path and os.path.exists(video.dubbed_audio_path):
            exports["audio"]["available"] = True
        
        # Check transcript
        if video.transcript_path and os.path.exists(video.transcript_path):
            exports["transcript"]["available"] = True
        
        # Check translation
        if video.transcript_path:
            translation_dir = os.path.dirname(video.transcript_path)
            if os.path.exists(translation_dir):
                translation_files = [f for f in os.listdir(translation_dir) if f.startswith("translation_")]
                if translation_files:
                    exports["translation"]["available"] = True
        
        # Check subtitles
        if video.subtitle_path and os.path.exists(video.subtitle_path):
            exports["subtitles"]["available"] = True
        
        return exports