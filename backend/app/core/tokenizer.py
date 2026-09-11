# app/core/tokenizer.py
import re
from typing import Optional


class TokenizerService:
    """
    Service for counting words and tokens across multiple languages including:
    - Vietnamese (handles full Unicode compound words and diacritics)
    - English and Latin languages
    - CJK (Chinese, Japanese Kanji/Kana, Korean Hangul where each logograph is counted as a word token)
    - General Unicode text
    """

    # Matches Unicode words including Vietnamese accented characters
    WORD_REGEX = re.compile(
        r"\b[\w\u00C0-\u024F\u1EA0-\u1EF9]+(?:'[\w]+)?\b",
        re.UNICODE
    )

    # Matches individual CJK characters
    CJK_REGEX = re.compile(
        r"[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]"
    )

    @classmethod
    def count_words(cls, text: Optional[str]) -> int:
        """
        Calculates the normalized word count of a given text.
        CJK characters are counted individually as words.
        Non-CJK words are counted by standard word boundary tokenization.
        """
        if not text or not text.strip():
            return 0

        clean_text = text.strip()

        # Count CJK ideographs / syllabaries
        cjk_matches = cls.CJK_REGEX.findall(clean_text)
        cjk_count = len(cjk_matches)

        # Remove CJK before counting Latin / Vietnamese / Cyrillic words
        non_cjk_text = cls.CJK_REGEX.sub(" ", clean_text)
        word_matches = cls.WORD_REGEX.findall(non_cjk_text)
        standard_count = len(word_matches)

        return cjk_count + standard_count

    @classmethod
    def estimate_video_words(cls, duration_seconds: Optional[float]) -> int:
        """
        Estimates the expected word count of a video based on standard average speech tempo.
        Typical conversational and media speech rate is ~140-160 words per minute (WPM).
        We use a baseline of 150 WPM (2.5 words per second).
        """
        if not duration_seconds or duration_seconds <= 0:
            return 150  # Minimum 1 minute equivalent

        minutes = max(0.2, duration_seconds / 60.0)
        return max(10, int(round(minutes * 150)))

    @classmethod
    def count_segments_words(cls, segments: list) -> int:
        """
        Calculates total word count across a list of subtitle or transcript segments.
        """
        total = 0
        if not segments:
            return 0

        for seg in segments:
            if isinstance(seg, dict):
                text = seg.get("translated_text") or seg.get("text") or ""
                total += cls.count_words(text)
            elif isinstance(seg, str):
                total += cls.count_words(seg)

        return total
