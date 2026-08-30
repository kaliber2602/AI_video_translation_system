# app/services/export_service.py
import os
import json
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.core.config import OUTPUT_DIR


class ExportService:
    """Service for exporting video assets in various formats"""
    
    def __init__(self):
        self.export_dir = OUTPUT_DIR / "exports"
        self.export_dir.mkdir(parents=True, exist_ok=True)
    
    def export_final_video(
        self,
        video_path: str,
        format: str = "mp4",
        quality: Optional[str] = None,
        output_filename: Optional[str] = None
    ) -> str:
        """Export final video with quality options"""
        if not output_filename:
            output_filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
        
        output_path = self.export_dir / output_filename
        
        command = ["ffmpeg", "-y", "-i", video_path]
        
        if quality:
            quality_map = {
                "360p": "scale=-2:360",
                "720p": "scale=-2:720",
                "1080p": "scale=-2:1080",
                "4K": "scale=-2:2160"
            }
            if quality in quality_map:
                command.extend(["-vf", quality_map[quality]])
        
        command.extend(["-c:v", "libx264", "-c:a", "aac", str(output_path)])
        
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return str(output_path)
    
    def export_subtitles(
        self,
        subtitle_path: str,
        format: str = "srt",
        output_filename: Optional[str] = None
    ) -> str:
        """Export subtitles in different format"""
        if not output_filename:
            output_filename = f"subtitles_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
        
        output_path = self.export_dir / output_filename
        
        # If converting format, use the service
        if subtitle_path.endswith(f".{format}"):
            shutil.copy(subtitle_path, output_path)
        else:
            # Convert using ffmpeg or use subtitle service
            from app.services.subtitle_service import SubtitleService
            
            with open(subtitle_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse and convert
            # Simple implementation - just copy for now
            shutil.copy(subtitle_path, output_path)
        
        return str(output_path)
    
    def export_audio(
        self,
        audio_path: str,
        format: str = "mp3",
        output_filename: Optional[str] = None
    ) -> str:
        """Export audio in different format"""
        if not output_filename:
            output_filename = f"audio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
        
        output_path = self.export_dir / output_filename
        
        codec_map = {
            "mp3": "libmp3lame",
            "wav": "pcm_s16le",
            "aac": "aac",
            "ogg": "libvorbis"
        }
        
        command = ["ffmpeg", "-y", "-i", audio_path]
        
        if format in codec_map:
            command.extend(["-acodec", codec_map[format]])
        else:
            command.extend(["-acodec", "copy"])
        
        command.append(str(output_path))
        
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return str(output_path)
    
    def export_transcript(
        self,
        transcript_path: str,
        format: str = "txt",
        output_filename: Optional[str] = None
    ) -> str:
        """Export transcript as text or JSON"""
        if not output_filename:
            output_filename = f"transcript_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
        
        output_path = self.export_dir / output_filename
        
        with open(transcript_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if format == "txt":
            segments = data.get("segments", [])
            text_content = ""
            for seg in segments:
                text_content += f"[{seg.get('start', 0):.1f}s - {seg.get('end', 0):.1f}s] {seg.get('text', '')}\n"
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text_content)
        else:
            shutil.copy(transcript_path, output_path)
        
        return str(output_path)
    
    def export_translation(
        self,
        translation_path: str,
        format: str = "txt",
        output_filename: Optional[str] = None
    ) -> str:
        """Export translation as text or JSON"""
        if not output_filename:
            output_filename = f"translation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
        
        output_path = self.export_dir / output_filename
        
        with open(translation_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if format == "txt":
            segments = data.get("segments", [])
            text_content = ""
            for seg in segments:
                text_content += f"[{seg.get('start', 0):.1f}s - {seg.get('end', 0):.1f}s] {seg.get('translated_text', '')}\n"
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text_content)
        else:
            shutil.copy(translation_path, output_path)
        
        return str(output_path)
    
    def get_available_exports(self, video) -> List[Dict[str, Any]]:
        """Get all available export options for a video"""
        exports = []
        
        if video.output_path and os.path.exists(video.output_path):
            exports.append({
                "type": "final_video",
                "label": "Final Video",
                "formats": ["mp4", "mov", "avi"],
                "qualities": ["360p", "720p", "1080p"]
            })
        
        if video.subtitle_path and os.path.exists(video.subtitle_path):
            exports.append({
                "type": "subtitles",
                "label": "Subtitle File",
                "formats": ["srt", "vtt", "ass"]
            })
        
        if video.dubbed_audio_path and os.path.exists(video.dubbed_audio_path):
            exports.append({
                "type": "audio",
                "label": "Audio File",
                "formats": ["wav", "mp3", "aac"]
            })
        
        if video.transcript_path and os.path.exists(video.transcript_path):
            exports.append({
                "type": "transcript",
                "label": "Transcript",
                "formats": ["json", "txt"]
            })
        
        return exports