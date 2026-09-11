import pytest
import os
import tempfile
from app.services.subtitle_service import (
    SubtitleService,
    hex_to_ass_color,
    wrap_text_lines,
    apply_ass_effect,
)

def test_hex_to_ass_color():
    # White #FFFFFF -> &H00FFFFFF
    assert hex_to_ass_color("#FFFFFF") == "&H00FFFFFF"
    # Black #000000 -> &H00000000
    assert hex_to_ass_color("#000000") == "&H00000000"
    # Pure Red #FF0000 -> BGR &H000000FF
    assert hex_to_ass_color("#FF0000") == "&H000000FF"
    # Pure Blue #0000FF -> BGR &H00FF0000
    assert hex_to_ass_color("#0000FF") == "&H00FF0000"
    # Fallback default
    assert hex_to_ass_color("invalid", "&H00FFFFFF") == "&H00FFFFFF"


def test_wrap_text_lines():
    long_text = "Trí tuệ nhân tạo và học sâu đang làm thay đổi toàn bộ thế giới công nghệ hiện đại."
    # 1 line limit
    single_line = wrap_text_lines(long_text, max_lines=1)
    assert "\n" not in single_line

    # 2 lines limit
    double_lines = wrap_text_lines(long_text, max_lines=2, max_chars=30)
    assert double_lines.count("\n") <= 1

    # Unlimited
    assert wrap_text_lines("Dòng ngắn", max_lines=0) == "Dòng ngắn"


def test_apply_ass_effect():
    text = "Xin chào các bạn"
    # none
    assert apply_ass_effect(text, "none") == text
    # fade
    assert r"\fad(" in apply_ass_effect(text, "fade")
    # pop
    assert r"\fscx" in apply_ass_effect(text, "pop")
    # slide
    assert r"\fsp" in apply_ass_effect(text, "slide")
    # karaoke
    karaoke_res = apply_ass_effect(text, "karaoke", primary_ass="&H0000FFFF")
    assert r"\c" in karaoke_res


def test_subtitle_service_generation():
    service = SubtitleService()
    segments = [
        {"start": 0.0, "end": 3.5, "text": "Hello world", "translated_text": "Xin chào thế giới"},
        {"start": 3.6, "end": 7.0, "text": "Artificial intelligence", "translated_text": "Trí tuệ nhân tạo"},
    ]

    # Test ASS generation with custom styling
    ass_content = service.generate_ass(
        segments=segments,
        text_key="translated_text",
        font_name="Montserrat",
        font_size=24,
        position="bottom",
        primary_color="#FFE600",
        outline_color="#000000",
        max_lines=1,
        effect="pop",
    )
    assert "Montserrat" in ass_content
    assert "Xin chào thế giới" in ass_content
    assert r"\fscx" in ass_content

    # Test SRT generation
    srt_content = service.generate_srt(segments=segments, text_key="translated_text", max_lines=1)
    assert "1\n00:00:00,000 --> 00:00:03,500\nXin chào thế giới" in srt_content

    # Test VTT generation
    vtt_content = service.generate_vtt(segments=segments, text_key="translated_text")
    assert "WEBVTT" in vtt_content
    assert "Xin chào thế giới" in vtt_content


def test_save_all_subtitles():
    service = SubtitleService()
    segments = [
        {"start": 1.0, "end": 4.0, "text": "Test segment", "translated_text": "Phân đoạn kiểm thử"}
    ]

    with tempfile.TemporaryDirectory() as tmpdir:
        paths = service.save_all_subtitles(
            segments=segments,
            base_dir=tmpdir,
            language="vi",
            text_key="translated_text",
            font_name="Roboto",
            font_size=20,
            primary_color="#FFFFFF",
            outline_color="#000000",
            max_lines=2,
            effect="fade",
        )
        assert "srt" in paths and os.path.exists(paths["srt"])
        assert "vtt" in paths and os.path.exists(paths["vtt"])
        assert "ass" in paths and os.path.exists(paths["ass"])


def test_aspect_ratio_resolution():
    service = SubtitleService()

    # Square (1:1)
    square_layout = service.resolve_aspect_layout(aspect_ratio="1:1")
    assert square_layout["play_res_x"] == 1080
    assert square_layout["play_res_y"] == 1080
    assert square_layout["max_chars"] == 26

    # From dimensions: 720x720 -> 1:1
    dim_square = service.resolve_aspect_layout(video_width=720, video_height=720)
    assert dim_square["aspect"] == "1:1"

    # Portrait (9:16)
    portrait_layout = service.resolve_aspect_layout(aspect_ratio="9:16")
    assert portrait_layout["play_res_x"] == 1080
    assert portrait_layout["play_res_y"] == 1920
    assert portrait_layout["max_chars"] == 22

    # Landscape (16:9)
    landscape_layout = service.resolve_aspect_layout(aspect_ratio="16:9")
    assert landscape_layout["play_res_x"] == 1920
    assert landscape_layout["play_res_y"] == 1080
    assert landscape_layout["max_chars"] == 38


def test_long_segment_auto_split():
    service = SubtitleService()
    # 106-character segment over 6 seconds (like user's problematic sentence)
    long_sentence = "Khi được đưa ra một câu, bản năng đầu tiên của bạn là đọc từ trái sang phải để hiểu ý nghĩa của những từ đó."
    segments = [
        {"start": 0.0, "end": 6.0, "translated_text": long_sentence}
    ]

    split_segs = service.split_long_segments(segments, max_chars=45, max_duration=5.0)
    assert len(split_segs) == 2
    assert split_segs[0]["start"] == 0.0
    assert split_segs[0]["end"] < 6.0
    assert split_segs[1]["start"] == split_segs[0]["end"]
    assert split_segs[1]["end"] == 6.0
    # Both parts are well under 70 chars
    assert len(split_segs[0]["translated_text"]) < 70
    assert len(split_segs[1]["translated_text"]) < 70

