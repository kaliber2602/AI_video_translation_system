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
    def hex_to_ass_color(hex_str: Optional[str], default: str = "&H00FFFFFF", alpha: int = 0) -> str:
        """Convert standard #RRGGBB hex color to ASS &HAABBGGRR format."""
        if not hex_str:
            return default
        clean = hex_str.strip().lstrip("#")
        if clean.lower() in ["transparent", "none"]:
            return "&HFF000000"
        if len(clean) == 3:
            clean = "".join([c * 2 for c in clean])
        if len(clean) >= 6 and all(c in "0123456789abcdefABCDEF" for c in clean[:6]):
            r = clean[0:2]
            g = clean[2:4]
            b = clean[4:6]
            return f"&H{alpha:02X}{b.upper()}{g.upper()}{r.upper()}"
        return default

    CJK_PUNCTUATION_NO_LINE_START = set("。！？!?,，、）)]}」』》〉”’;:；：~～…")
    CJK_PUNCTUATION_NO_LINE_END = set("（([{「『《〈“‘")

    @staticmethod
    def is_cjk_char(ch: str) -> bool:
        """Check if character is within Chinese, Japanese, or Korean Unicode ranges."""
        if not ch:
            return False
        cp = ord(ch)
        return (
            0x4E00 <= cp <= 0x9FFF or   # CJK Unified Ideographs
            0x3400 <= cp <= 0x4DBF or   # CJK Extension A
            0x20000 <= cp <= 0x2A6DF or # CJK Extension B
            0x3040 <= cp <= 0x309F or   # Hiragana
            0x30A0 <= cp <= 0x30FF or   # Katakana
            0xAC00 <= cp <= 0xD7AF or   # Hangul Syllables
            0x1100 <= cp <= 0x11FF      # Hangul Jamo
        )

    @staticmethod
    def is_cjk_dominant(text: str) -> bool:
        """Return True if 20% or more characters in the text are CJK ideographs/syllables."""
        if not text:
            return False
        total = sum(1 for ch in text if not ch.isspace())
        if total == 0:
            return False
        cjk_count = sum(1 for ch in text if SubtitleService.is_cjk_char(ch))
        return (cjk_count / total) >= 0.20

    @staticmethod
    def _break_cjk_into_two_lines(clean_text: str, target_chars: int = 18) -> List[str]:
        """Split a long CJK text chunk into two balanced lines respecting punctuation and Kinshoku Shori."""
        total_len = len(clean_text)
        if total_len <= target_chars:
            return [clean_text]

        mid_target = total_len // 2
        best_idx = -1
        min_dist = total_len

        # 1. Look for natural CJK punctuation near the middle (within 35% of center)
        for i in range(1, total_len):
            ch = clean_text[i - 1]
            if ch in "，、,。！？!?;； ":
                dist = abs(i - mid_target)
                if dist < total_len * 0.35 and dist < min_dist:
                    min_dist = dist
                    best_idx = i

        # 2. If no punctuation near center, find a break position that doesn't violate Kinshoku Shori
        if best_idx == -1:
            for offset in range(total_len // 2):
                for candidate in (mid_target + offset, mid_target - offset):
                    if 1 <= candidate < total_len:
                        prev_ch = clean_text[candidate - 1]
                        next_ch = clean_text[candidate]
                        if (next_ch not in SubtitleService.CJK_PUNCTUATION_NO_LINE_START and 
                            prev_ch not in SubtitleService.CJK_PUNCTUATION_NO_LINE_END):
                            best_idx = candidate
                            break
                if best_idx != -1:
                    break

        if best_idx <= 0 or best_idx >= total_len:
            best_idx = max(1, mid_target)

        line1 = clean_text[:best_idx].strip()
        line2 = clean_text[best_idx:].strip()
        return [line1, line2]

    @staticmethod
    def _break_cjk_multi_lines(clean_text: str, max_chars: int = 18, max_lines: int = 0) -> List[str]:
        """Break CJK text into multiple lines of at most max_chars length."""
        lines = []
        rem = clean_text.strip()
        while rem:
            if len(rem) <= max_chars:
                lines.append(rem)
                break
            best_break = max_chars
            # Look backwards for punctuation
            for i in range(min(len(rem), max_chars), max(1, max_chars // 2), -1):
                if rem[i - 1] in "，、,。！？!?;； ":
                    best_break = i
                    break
            else:
                for i in range(min(len(rem), max_chars), max(1, max_chars // 2), -1):
                    if (rem[i] not in SubtitleService.CJK_PUNCTUATION_NO_LINE_START and 
                        rem[i - 1] not in SubtitleService.CJK_PUNCTUATION_NO_LINE_END):
                        best_break = i
                        break
            lines.append(rem[:best_break].strip())
            rem = rem[best_break:].strip()
            if max_lines > 0 and len(lines) >= max_lines:
                break
        return lines

    @staticmethod
    def _break_into_two_lines(clean_text: str, words: List[str], max_chars: int = 38) -> List[str]:
        """Split a long text chunk into two balanced lines, preferring natural punctuation."""
        if SubtitleService.is_cjk_dominant(clean_text):
            cjk_budget = min(max_chars, 18)
            return SubtitleService._break_cjk_into_two_lines(clean_text, target_chars=cjk_budget)

        if not words:
            return [""]
        if len(words) == 1:
            return [clean_text]

        total_len = len(clean_text)
        mid_target = total_len // 2

        # 1. Search for punctuation (, . ! ? ; :) near center (between 30% and 70% of text)
        best_idx = -1
        min_dist_to_mid = total_len

        cur_pos = 0
        for i, w in enumerate(words[:-1]):
            cur_pos += len(w) + 1
            dist = abs(cur_pos - mid_target)
            if w.endswith((",", ".", "?", "!", ";", ":")):
                if dist < total_len * 0.35 and dist < min_dist_to_mid:
                    min_dist_to_mid = dist
                    best_idx = i + 1

        # 2. If no punctuation near center, find word boundary closest to center
        if best_idx == -1:
            best_idx = 1
            cur_len = 0
            for i, w in enumerate(words):
                cur_len += len(w) + 1
                if cur_len >= mid_target:
                    best_idx = max(1, i)
                    break

        line1 = " ".join(words[:best_idx])
        line2 = " ".join(words[best_idx:])
        return [line1, line2]

    @staticmethod
    def _break_single_line(line: str, max_chars: int = 38) -> List[str]:
        """Break a single line that exceeds max_chars into balanced sub-lines."""
        if SubtitleService.is_cjk_dominant(line):
            cjk_budget = min(max_chars, 18)
            if len(line) <= cjk_budget:
                return [line]
            return SubtitleService._break_cjk_into_two_lines(line, target_chars=cjk_budget)

        words = line.split()
        if len(words) <= 1 or len(line) <= max_chars:
            return [line]
        return SubtitleService._break_into_two_lines(line, words, max_chars=max_chars)

    @staticmethod
    def _break_multi_lines(words: List[str], max_chars: int = 38, max_lines: int = 0) -> List[str]:
        """Break words across multiple lines based on max_chars."""
        lines = []
        cur_words: List[str] = []
        cur_len = 0
        for w in words:
            if cur_len + len(w) + 1 > max_chars and cur_words:
                lines.append(" ".join(cur_words))
                cur_words = [w]
                cur_len = len(w)
            else:
                cur_words.append(w)
                cur_len += len(w) + 1
        if cur_words:
            lines.append(" ".join(cur_words))

        if max_lines > 0:
            lines = lines[:max_lines]
        return lines

    @staticmethod
    def wrap_text_lines(
        text: str,
        max_lines: int = 2,
        max_chars: int = 38,
        newline_token: str = "\\N"
    ) -> str:
        """
        Wrap and limit text to max_lines lines.
        Intelligently preserves existing manual newlines if present,
        and cleanly splits long lines at natural phrase boundaries.
        Supports space-less CJK scripts (Chinese, Japanese, Korean) with Kinshoku Shori rules.
        """
        if not text:
            return ""

        # Normalize carriage returns
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()

        # If user explicitly entered manual line breaks (\n):
        if "\n" in normalized:
            raw_lines = [l.strip() for l in normalized.split("\n") if l.strip()]
            if max_lines == 1:
                return " ".join(raw_lines)
            if 0 < max_lines < len(raw_lines):
                raw_lines = raw_lines[:max_lines]
            final_lines: List[str] = []
            for line in raw_lines:
                effective_budget = min(max_chars, 18) if SubtitleService.is_cjk_dominant(line) else max_chars
                if len(line) > effective_budget:
                    final_lines.extend(SubtitleService._break_single_line(line, max_chars=effective_budget))
                else:
                    final_lines.append(line)
            if max_lines > 0:
                final_lines = final_lines[:max_lines]
            return newline_token.join(final_lines)

        # Single continuous chunk: clean excess whitespace
        clean_text = " ".join(normalized.split())
        if not clean_text:
            return ""

        is_cjk = SubtitleService.is_cjk_dominant(clean_text)
        effective_budget = min(max_chars, 18) if is_cjk else max_chars

        if max_lines == 1 or len(clean_text) <= effective_budget:
            return clean_text

        # CJK handling when text does not use spaces
        if is_cjk and " " not in clean_text:
            if max_lines == 2:
                lines = SubtitleService._break_cjk_into_two_lines(clean_text, target_chars=effective_budget)
                return newline_token.join(lines)
            lines = SubtitleService._break_cjk_multi_lines(clean_text, max_chars=effective_budget, max_lines=max_lines)
            return newline_token.join(lines)

        words = clean_text.split()
        if not words:
            return ""

        # Smart breaking into 2 balanced lines
        if max_lines == 2:
            lines = SubtitleService._break_into_two_lines(clean_text, words, max_chars=effective_budget)
            return newline_token.join(lines)

        # If max_lines > 2 or 0 (unlimited lines)
        lines = SubtitleService._break_multi_lines(words, max_chars=effective_budget, max_lines=max_lines)
        return newline_token.join(lines)

    @staticmethod
    def split_long_segments(
        segments: List[Dict],
        max_chars: int = 50,
        max_duration: float = 5.0,
    ) -> List[Dict]:
        """
        Detects segments that are excessively long or span too long a duration,
        and splits them into 2 sequential chunks with proportional timestamps.
        Fully supports both Western space-separated languages and CJK scripts.
        """
        result = []
        for seg in segments:
            text = seg.get("translated_text", seg.get("text", "")).strip()
            duration = seg.get("end", 0.0) - seg.get("start", 0.0)

            is_cjk = SubtitleService.is_cjk_dominant(text)
            effective_chars = min(max_chars, 24) if is_cjk else max_chars

            if (len(text) > effective_chars or duration > max_duration) and duration >= 2.0:
                words = text.split()
                # Western languages with spaces
                if len(words) >= 4:
                    mid_idx = len(words) // 2
                    for i in range(max(1, mid_idx - 2), min(len(words) - 1, mid_idx + 3)):
                        if words[i].endswith((",", ".", "?", "!", ";")):
                            mid_idx = i + 1
                            break

                    first_text = " ".join(words[:mid_idx])
                    second_text = " ".join(words[mid_idx:])
                    mid_time = round(seg["start"] + (duration * (len(first_text) / max(1, len(text)))), 2)
                    mid_time = max(seg["start"] + 0.8, min(seg["end"] - 0.8, mid_time))

                    seg1 = dict(seg)
                    seg1["end"] = mid_time
                    if "translated_text" in seg1:
                        seg1["translated_text"] = first_text
                    if "text" in seg1:
                        seg1["text"] = first_text

                    seg2 = dict(seg)
                    seg2["start"] = mid_time
                    if "translated_text" in seg2:
                        seg2["translated_text"] = second_text
                    if "text" in seg2:
                        seg2["text"] = second_text

                    result.append(seg1)
                    result.append(seg2)
                    continue
                elif is_cjk and len(text) >= 12:
                    # CJK ideographic splitting without space boundaries
                    cjk_parts = SubtitleService._break_cjk_into_two_lines(text, target_chars=len(text) // 2)
                    if len(cjk_parts) == 2 and cjk_parts[0] and cjk_parts[1]:
                        first_text, second_text = cjk_parts[0], cjk_parts[1]
                        mid_time = round(seg["start"] + (duration * (len(first_text) / max(1, len(text)))), 2)
                        mid_time = max(seg["start"] + 0.8, min(seg["end"] - 0.8, mid_time))

                        seg1 = dict(seg)
                        seg1["end"] = mid_time
                        if "translated_text" in seg1:
                            seg1["translated_text"] = first_text
                        if "text" in seg1:
                            seg1["text"] = first_text

                        seg2 = dict(seg)
                        seg2["start"] = mid_time
                        if "translated_text" in seg2:
                            seg2["translated_text"] = second_text
                        if "text" in seg2:
                            seg2["text"] = second_text

                        result.append(seg1)
                        result.append(seg2)
                        continue

            result.append(seg)
        return result

    @staticmethod
    def apply_ass_effect(text: str, effect: str = "none", primary_ass: str = "&H00FFFFFF") -> str:
        """Inject ASS override tags for chosen animation effect."""
        eff = (effect or "none").lower().strip()
        if eff == "fade":
            # Smooth 250ms fade-in, 200ms fade-out
            return f"{{\\fad(250,200)}}{text}"
        elif eff == "pop":
            # Modern pop-scale (112% down to 100%)
            return f"{{\\t(0,100,\\fscx112\\fscy112)\\t(100,220,\\fscx100\\fscy100)\\fad(100,100)}}{text}"
        elif eff == "slide":
            # Slide up effect with subtle letter spacing
            return f"{{\\fad(150,150)\\t(0,150,\\fsp2)\\t(150,300,\\fsp0)}}{text}"
        elif eff == "karaoke":
            # Vibrant accent highlight with pop
            return f"{{\\c{primary_ass}&\\t(0,180,\\fscx108\\fscy108)\\t(180,320,\\fscx100\\fscy100)\\fad(100,100)}}{text}"
        # Default / None
        return text
    
    @staticmethod
    def generate_srt(segments: List[Dict], text_key: str = "translated_text", max_lines: int = 2, bilingual: bool = False) -> str:
        """Generate SRT subtitle content with line limit wrapping and optional bilingual dual-line."""
        content = []
        for i, seg in enumerate(segments, 1):
            orig_text = (seg.get("text") or "").strip()
            trans_text = (seg.get(text_key) or seg.get("translated_text") or "").strip()
            if bilingual and orig_text and trans_text and orig_text.lower() != trans_text.lower():
                wrapped_orig = SubtitleService.wrap_text_lines(orig_text, max_lines=1, newline_token=" ")
                wrapped_trans = SubtitleService.wrap_text_lines(trans_text, max_lines=max_lines, newline_token="\n")
                text = f"{wrapped_orig}\n{wrapped_trans}"
            else:
                raw_text = trans_text or orig_text or seg.get("text", "")
                text = SubtitleService.wrap_text_lines(raw_text, max_lines=max_lines, newline_token="\n")

            content.append(str(i))
            content.append(f"{SubtitleService.format_time_srt(seg['start'])} --> {SubtitleService.format_time_srt(seg['end'])}")
            content.append(text)
            content.append("")
        return "\n".join(content)
    
    @staticmethod
    def generate_vtt(segments: List[Dict], text_key: str = "translated_text", max_lines: int = 2, bilingual: bool = False) -> str:
        """Generate WebVTT subtitle content with line limit wrapping and optional bilingual dual-line."""
        content = ["WEBVTT", ""]
        for i, seg in enumerate(segments, 1):
            orig_text = (seg.get("text") or "").strip()
            trans_text = (seg.get(text_key) or seg.get("translated_text") or "").strip()
            if bilingual and orig_text and trans_text and orig_text.lower() != trans_text.lower():
                wrapped_orig = SubtitleService.wrap_text_lines(orig_text, max_lines=1, newline_token=" ")
                wrapped_trans = SubtitleService.wrap_text_lines(trans_text, max_lines=max_lines, newline_token="\n")
                text = f"{wrapped_orig}\n{wrapped_trans}"
            else:
                raw_text = trans_text or orig_text or seg.get("text", "")
                text = SubtitleService.wrap_text_lines(raw_text, max_lines=max_lines, newline_token="\n")

            content.append(str(i))
            content.append(f"{SubtitleService.format_time_vtt(seg['start'])} --> {SubtitleService.format_time_vtt(seg['end'])}")
            content.append(text)
            content.append("")
        return "\n".join(content)
    
    @staticmethod
    def resolve_aspect_layout(
        aspect_ratio: Optional[str] = None,
        is_portrait: bool = False,
        video_width: Optional[int] = None,
        video_height: Optional[int] = None,
        position: str = "bottom",
        font_size: int = 20,
    ) -> Dict[str, Any]:
        """Resolves target PlayRes, margins, and character budgets per aspect ratio."""
        aspect = "16:9"
        if video_width and video_height and video_width > 0 and video_height > 0:
            ratio = float(video_width) / float(video_height)
            if 0.9 <= ratio <= 1.1:
                aspect = "1:1"
            elif ratio <= 0.65:
                aspect = "9:16"
            elif ratio <= 0.85:
                aspect = "4:5"
            elif 1.25 <= ratio <= 1.45:
                aspect = "4:3"
            else:
                aspect = "16:9"
        elif aspect_ratio:
            clean = aspect_ratio.strip().lower()
            if clean in ["1:1", "square", "vuong"]:
                aspect = "1:1"
            elif clean in ["9:16", "portrait", "doc", "vertical"]:
                aspect = "9:16"
            elif clean in ["4:5"]:
                aspect = "4:5"
            elif clean in ["4:3"]:
                aspect = "4:3"
            else:
                aspect = "16:9"
        elif is_portrait:
            aspect = "9:16"

        if aspect == "9:16":
            return {
                "aspect": "9:16",
                "play_res_x": 1080,
                "play_res_y": 1920,
                "margin_v": 240 if position == "bottom" else (80 if position == "top" else 40),
                "margin_lr": 45,
                "max_chars": 22,
                "scaled_font_size": int(font_size * 2.6) if font_size < 35 else font_size,
            }
        elif aspect == "1:1":
            return {
                "aspect": "1:1",
                "play_res_x": 1080,
                "play_res_y": 1080,
                "margin_v": 95 if position == "bottom" else (50 if position == "top" else 30),
                "margin_lr": 35,
                "max_chars": 26,
                "scaled_font_size": int(font_size * 2.1) if font_size < 35 else font_size,
            }
        elif aspect == "4:5":
            return {
                "aspect": "4:5",
                "play_res_x": 1080,
                "play_res_y": 1350,
                "margin_v": 140 if position == "bottom" else (60 if position == "top" else 35),
                "margin_lr": 40,
                "max_chars": 24,
                "scaled_font_size": int(font_size * 2.3) if font_size < 35 else font_size,
            }
        elif aspect == "4:3":
            return {
                "aspect": "4:3",
                "play_res_x": 1440,
                "play_res_y": 1080,
                "margin_v": 85 if position == "bottom" else (45 if position == "top" else 25),
                "margin_lr": 30,
                "max_chars": 32,
                "scaled_font_size": int(font_size * 2.2) if font_size < 35 else font_size,
            }
        else:  # 16:9
            return {
                "aspect": "16:9",
                "play_res_x": 1920,
                "play_res_y": 1080,
                "margin_v": 85 if position == "bottom" else (45 if position == "top" else 25),
                "margin_lr": 30,
                "max_chars": 38,
                "scaled_font_size": int(font_size * 2.2) if font_size < 35 else font_size,
            }

    @staticmethod
    def resolve_font_for_script(
        font_name: Optional[str],
        language: Optional[str] = None,
        sample_text: Optional[str] = None
    ) -> str:
        """
        Dynamically map generic/Latin fonts to proper CJK font families when CJK text is detected.
        Supported CJK families in container: Noto Sans CJK SC, TC, JP, KR.
        """
        clean_font = (font_name or "").strip()
        lang = (language or "").lower().strip()
        is_cjk = SubtitleService.is_cjk_dominant(sample_text or "")

        # If font is already explicitly set to a CJK font, preserve it
        if any(cjk in clean_font.lower() for cjk in ["cjk", "yahei", "simhei", "pingfang", "gothic", "meiryo", "mincho"]):
            return clean_font

        # If font is not provided or is a standard Latin default, map to appropriate CJK font
        latin_defaults = {
            "", "arial", "montserrat", "roboto", "inter", "helvetica",
            "impact", "bebas neue", "oswald", "playfair display", "be vietnam pro", "sans-serif"
        }
        if clean_font.lower() in latin_defaults or is_cjk:
            if lang in ["zh-tw", "zh-hk", "zh-hant"]:
                return "Noto Sans CJK TC"
            elif lang in ["zh", "zh-cn", "zh-hans"]:
                return "Noto Sans CJK SC"
            elif lang in ["ja", "jpn"]:
                return "Noto Sans CJK JP"
            elif lang in ["ko", "kor"]:
                return "Noto Sans CJK KR"
            elif is_cjk:
                return "Noto Sans CJK SC"

        return clean_font or "Montserrat"

    @staticmethod
    def generate_ass(
        segments: List[Dict],
        text_key: str = "translated_text",
        font_size: int = 20,
        position: str = "bottom",
        font_name: str = "Arial",
        primary_color: str = "#FFFFFF",
        outline_color: str = "#000000",
        back_color: str = "#00000080",
        max_lines: int = 2,
        effect: str = "none",
        bold: bool = True,
        is_portrait: bool = False,
        aspect_ratio: Optional[str] = None,
        video_width: Optional[int] = None,
        video_height: Optional[int] = None,
        alignment: str = "center",
        position_y: Optional[float] = None,
        line_spacing: Optional[float] = 1.2,
        bilingual: bool = False,
        language: Optional[str] = None,
    ) -> str:
        """Generate ASS subtitle content with styling, colors, limits, animation effects, alignment, and multi-aspect ratio adaptation."""
        align_clean = (alignment or "center").lower().strip()
        align_col = 2  # default center
        if align_clean in ["left", "justify"]:
            align_col = 1
        elif align_clean == "right":
            align_col = 3

        pos_clean = (position or "bottom").lower().strip()
        if pos_clean == "top":
            ass_alignment = 6 + align_col  # 7, 8, 9
        elif pos_clean == "middle":
            ass_alignment = 3 + align_col  # 4, 5, 6
        else:
            ass_alignment = align_col      # 1, 2, 3

        layout = SubtitleService.resolve_aspect_layout(
            aspect_ratio=aspect_ratio,
            is_portrait=is_portrait,
            video_width=video_width,
            video_height=video_height,
            position=pos_clean,
            font_size=font_size,
        )

        play_res_x = layout["play_res_x"]
        play_res_y = layout["play_res_y"]
        margin_v = layout["margin_v"]

        # Calculate exact MarginV if position_y (% from top) is provided
        if position_y is not None:
            try:
                py = max(5.0, min(95.0, float(position_y)))
                if pos_clean == "top":
                    margin_v = int((py / 100.0) * play_res_y)
                elif pos_clean == "middle":
                    margin_v = int(abs(py - 50.0) / 100.0 * play_res_y)
                else:  # bottom
                    margin_v = int(((100.0 - py) / 100.0) * play_res_y)
                margin_v = max(10, margin_v)
            except Exception:
                pass

        margin_lr = layout["margin_lr"]
        scaled_font_size = layout["scaled_font_size"]
        max_chars = layout["max_chars"]

        primary_ass = SubtitleService.hex_to_ass_color(primary_color, default="&H00FFFFFF", alpha=0)
        outline_ass = SubtitleService.hex_to_ass_color(outline_color, default="&H00000000", alpha=0)
        back_ass = SubtitleService.hex_to_ass_color(back_color, default="&H80000000", alpha=128)
        bold_flag = 1 if bold else 0
        outline_width = 3 if outline_color.lower() not in ["none", "transparent"] else 0
        shadow_dist = 2 if outline_width > 0 else 0

        # Secondary style for bilingual source text (slightly smaller, subtle muted tint)
        orig_font_size = max(12, int(scaled_font_size * 0.78))
        orig_primary_ass = "&H00D0D0D0"  # Subtle light grey for original text

        # Detect CJK from segments and resolve appropriate font
        sample_text = ""
        for s in segments[:10]:
            t = (s.get(text_key) or s.get("translated_text") or s.get("text") or "").strip()
            if t:
                sample_text += t + " "
        resolved_font = SubtitleService.resolve_font_for_script(font_name, language=language, sample_text=sample_text)
        
        content = [
            "[Script Info]",
            "Title: Subtitles",
            "ScriptType: v4.00+",
            f"PlayResX: {play_res_x}",
            f"PlayResY: {play_res_y}",
            "",
            "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
            f"Style: Default,{resolved_font},{scaled_font_size},{primary_ass},&H0000FFFF,{outline_ass},{back_ass},{bold_flag},0,0,0,100,100,0,0,1,{outline_width},{shadow_dist},{ass_alignment},{margin_lr},{margin_lr},{margin_v},1",
            "",
            "[Events]",
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
        ]
        
        for seg in segments:
            orig_text = (seg.get("text") or "").strip()
            trans_text = (seg.get(text_key) or seg.get("translated_text") or "").strip()

            if bilingual and orig_text and trans_text and orig_text.lower() != trans_text.lower():
                is_orig_cjk = SubtitleService.is_cjk_dominant(orig_text)
                is_trans_cjk = SubtitleService.is_cjk_dominant(trans_text)
                orig_budget = min(max_chars, 18) if is_orig_cjk else int(max_chars * 1.2)
                trans_budget = min(max_chars, 18) if is_trans_cjk else max_chars
                wrapped_orig = SubtitleService.wrap_text_lines(
                    orig_text,
                    max_lines=1,
                    max_chars=orig_budget,
                    newline_token=" ",
                )
                wrapped_trans = SubtitleService.wrap_text_lines(
                    trans_text,
                    max_lines=max_lines,
                    max_chars=trans_budget,
                    newline_token="\\N",
                )
                bilingual_line = f"{{\\fs{orig_font_size}\\c{orig_primary_ass}&}}{wrapped_orig}\\N{{\\fs{scaled_font_size}\\c{primary_ass}&}}{wrapped_trans}"
                effect_text = SubtitleService.apply_ass_effect(bilingual_line, effect=effect, primary_ass=primary_ass)
            else:
                raw_text = trans_text or orig_text or seg.get("text", "")
                is_raw_cjk = SubtitleService.is_cjk_dominant(raw_text)
                effective_budget = min(max_chars, 18) if is_raw_cjk else max_chars
                wrapped_text = SubtitleService.wrap_text_lines(
                    raw_text,
                    max_lines=max_lines,
                    max_chars=effective_budget,
                    newline_token="\\N",
                )
                effect_text = SubtitleService.apply_ass_effect(wrapped_text, effect=effect, primary_ass=primary_ass)

            content.append(
                f"Dialogue: 0,{SubtitleService.format_time_ass(seg['start'])},{SubtitleService.format_time_ass(seg['end'])},Default,,0,0,0,,{effect_text}"
            )
        
        return "\n".join(content)
    
    @staticmethod
    def generate_subtitles(
        segments: List[Dict],
        format: str = "srt",
        text_key: str = "translated_text",
        font_size: int = 20,
        position: str = "bottom",
        font_name: str = "Arial",
        primary_color: str = "#FFFFFF",
        outline_color: str = "#000000",
        max_lines: int = 2,
        effect: str = "none",
        is_portrait: bool = False,
        aspect_ratio: Optional[str] = None,
        video_width: Optional[int] = None,
        video_height: Optional[int] = None,
        alignment: str = "center",
        position_y: Optional[float] = None,
        line_spacing: Optional[float] = 1.2,
        bilingual: bool = False,
        language: Optional[str] = None,
    ) -> str:
        """Generate subtitles in specified format with aspect ratio and positioning support"""
        fmt = (format or "srt").lower().lstrip(".")
        if fmt == "srt":
            return SubtitleService.generate_srt(segments, text_key=text_key, max_lines=max_lines, bilingual=bilingual)
        elif fmt == "vtt":
            return SubtitleService.generate_vtt(segments, text_key=text_key, max_lines=max_lines, bilingual=bilingual)
        elif fmt == "ass":
            return SubtitleService.generate_ass(
                segments=segments,
                text_key=text_key,
                font_size=font_size,
                position=position,
                font_name=font_name,
                primary_color=primary_color,
                outline_color=outline_color,
                max_lines=max_lines,
                effect=effect,
                is_portrait=is_portrait,
                aspect_ratio=aspect_ratio,
                video_width=video_width,
                video_height=video_height,
                alignment=alignment,
                position_y=position_y,
                line_spacing=line_spacing,
                bilingual=bilingual,
                language=language,
            )
        return SubtitleService.generate_srt(segments, text_key=text_key, max_lines=max_lines)
    
    @staticmethod
    def save_subtitles(
        segments: List[Dict],
        output_path: str,
        format: str = "srt",
        text_key: str = "translated_text",
        font_size: int = 20,
        position: str = "bottom",
        font_name: str = "Arial",
        primary_color: str = "#FFFFFF",
        outline_color: str = "#000000",
        max_lines: int = 2,
        effect: str = "none",
        is_portrait: bool = False,
        aspect_ratio: Optional[str] = None,
        video_width: Optional[int] = None,
        video_height: Optional[int] = None,
        alignment: str = "center",
        position_y: Optional[float] = None,
        line_spacing: Optional[float] = 1.2,
        bilingual: bool = False,
        language: Optional[str] = None,
    ) -> str:
        """Generate and save subtitles to file"""
        content = SubtitleService.generate_subtitles(
            segments=segments,
            format=format,
            text_key=text_key,
            font_size=font_size,
            position=position,
            font_name=font_name,
            primary_color=primary_color,
            outline_color=outline_color,
            max_lines=max_lines,
            effect=effect,
            is_portrait=is_portrait,
            aspect_ratio=aspect_ratio,
            video_width=video_width,
            video_height=video_height,
            alignment=alignment,
            position_y=position_y,
            line_spacing=line_spacing,
            bilingual=bilingual,
            language=language,
        )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return output_path
    
    @staticmethod
    def save_all_subtitles(
        segments: List[Dict],
        base_dir: str,
        language: str,
        text_key: str = "translated_text",
        font_size: int = 20,
        position: str = "bottom",
        font_name: str = "Arial",
        primary_color: str = "#FFFFFF",
        outline_color: str = "#000000",
        max_lines: int = 2,
        effect: str = "none",
        is_portrait: bool = False,
        aspect_ratio: Optional[str] = None,
        video_width: Optional[int] = None,
        video_height: Optional[int] = None,
        auto_split: bool = True,
        alignment: str = "center",
        position_y: Optional[float] = None,
        line_spacing: Optional[float] = 1.2,
        bilingual: bool = False,
    ) -> Dict[str, str]:
        """Generate and save subtitles in srt, vtt, and ass formats with automatic long-chunk splitting and aspect ratio adaptation."""
        os.makedirs(base_dir, exist_ok=True)

        # 1. Cleanly split long segments so subtitles never squash into 4 lines
        if auto_split and segments:
            # Determine threshold based on aspect ratio
            effective_chars = 36 if (aspect_ratio in ["1:1", "9:16", "4:5"] or is_portrait) else 50
            clean_segments = SubtitleService.split_long_segments(segments, max_chars=effective_chars, max_duration=5.0)
        else:
            clean_segments = segments

        paths = {}
        for fmt in ["srt", "vtt", "ass"]:
            out_path = os.path.join(base_dir, f"subtitles_{language}.{fmt}")
            SubtitleService.save_subtitles(
                segments=clean_segments,
                output_path=out_path,
                format=fmt,
                text_key=text_key,
                font_size=font_size,
                position=position,
                font_name=font_name,
                primary_color=primary_color,
                outline_color=outline_color,
                max_lines=max_lines,
                effect=effect,
                is_portrait=is_portrait,
                aspect_ratio=aspect_ratio,
                video_width=video_width,
                video_height=video_height,
                alignment=alignment,
                position_y=position_y,
                line_spacing=line_spacing,
                bilingual=bilingual,
                language=language,
            )
            paths[fmt] = out_path
        return paths
    
    @staticmethod
    def srt_to_vtt(srt_content: str) -> str:
        """Convert SRT string content to WebVTT format."""
        lines = srt_content.splitlines()
        vtt_lines = ["WEBVTT", ""]
        for line in lines:
            if "-->" in line:
                vtt_lines.append(line.replace(",", "."))
            else:
                vtt_lines.append(line)
        return "\n".join(vtt_lines)
    
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
                "description": "Advanced styling, colors, and animations"
            }
        }
        return formats.get(format, formats["srt"])


# Module-level helper aliases
hex_to_ass_color = SubtitleService.hex_to_ass_color
wrap_text_lines = SubtitleService.wrap_text_lines
apply_ass_effect = SubtitleService.apply_ass_effect