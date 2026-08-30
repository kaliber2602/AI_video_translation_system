# app/services/subtitle_service.py
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional


class SubtitleService:
    """Service for generating subtitles in various formats"""
    
    @staticmethod
    def format_time_srt(seconds: float) -> str:
        """Format time for SRT format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    @staticmethod
    def format_time_vtt(seconds: float) -> str:
        """Format time for WebVTT format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"
    
    @staticmethod
    def format_time_ass(seconds: float) -> str:
        """Format time for ASS format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centis = int((seconds % 1) * 100)
        return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"
    
    @staticmethod
    def generate_srt(segments: List[Dict], text_key: str = "translated_text") -> str:
        """Generate SRT subtitle content"""
        content = []
        for i, seg in enumerate(segments, 1):
            text = seg.get(text_key, "")
            content.append(str(i))
            content.append(f"{SubtitleService.format_time_srt(seg['start'])} --> {SubtitleService.format_time_srt(seg['end'])}")
            content.append(text)
            content.append("")
        return "\n".join(content)
    
    @staticmethod
    def generate_vtt(segments: List[Dict], text_key: str = "translated_text") -> str:
        """Generate WebVTT subtitle content"""
        content = ["WEBVTT", ""]
        for i, seg in enumerate(segments, 1):
            text = seg.get(text_key, "")
            content.append(str(i))
            content.append(f"{SubtitleService.format_time_vtt(seg['start'])} --> {SubtitleService.format_time_vtt(seg['end'])}")
            content.append(text)
            content.append("")
        return "\n".join(content)
    
    @staticmethod
    def generate_ass(
        segments: List[Dict],
        text_key: str = "translated_text",
        font_size: int = 20,
        position: str = "bottom",
        font_name: str = "Arial"
    ) -> str:
        """Generate ASS subtitle content with styling"""
        position_map = {"top": 6, "middle": 4, "bottom": 2}
        alignment = position_map.get(position, 2)
        
        content = [
            "[Script Info]",
            "Title: Subtitles",
            "ScriptType: v4.00+",
            "PlayResX: 1920",
            "PlayResY: 1080",
            "",
            "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
            f"Style: Default,{font_name},{font_size},&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,{alignment},10,10,10,1",
            "",
            "[Events]",
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
        ]
        
        for seg in segments:
            text = seg.get(text_key, "")
            content.append(
                f"Dialogue: 0,{SubtitleService.format_time_ass(seg['start'])},{SubtitleService.format_time_ass(seg['end'])},Default,,0,0,0,,{text}"
            )
        
        return "\n".join(content)
    
    @staticmethod
    def generate_subtitles(
        segments: List[Dict],
        format: str = "srt",
        text_key: str = "translated_text",
        font_size: int = 20,
        position: str = "bottom"
    ) -> str:
        """Generate subtitles in specified format"""
        format_map = {
            "srt": SubtitleService.generate_srt,
            "vtt": SubtitleService.generate_vtt,
            "ass": lambda s, tk: SubtitleService.generate_ass(s, tk, font_size, position)
        }
        
        generator = format_map.get(format, SubtitleService.generate_srt)
        return generator(segments, text_key)
    
    @staticmethod
    def save_subtitles(
        segments: List[Dict],
        output_path: str,
        format: str = "srt",
        text_key: str = "translated_text",
        font_size: int = 20,
        position: str = "bottom"
    ) -> str:
        """Generate and save subtitles to file"""
        content = SubtitleService.generate_subtitles(
            segments=segments,
            format=format,
            text_key=text_key,
            font_size=font_size,
            position=position
        )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return output_path
    
    @staticmethod
    def get_subtitle_format_info(format: str) -> Dict[str, Any]:
        """Get information about a subtitle format"""
        formats = {
            "srt": {
                "name": "SubRip",
                "extension": ".srt",
                "mime_type": "text/plain",
                "description": "Most widely supported subtitle format"
            },
            "vtt": {
                "name": "WebVTT",
                "extension": ".vtt",
                "mime_type": "text/vtt",
                "description": "HTML5 video subtitle format"
            },
            "ass": {
                "name": "Advanced SubStation Alpha",
                "extension": ".ass",
                "mime_type": "text/plain",
                "description": "Advanced styling and positioning"
            }
        }
        return formats.get(format, formats["srt"])