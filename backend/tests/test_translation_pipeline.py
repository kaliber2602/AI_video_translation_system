from app.services import (
    build_json_content,
    build_txt_content,
    build_vtt_content,
    create_burned_subtitle_video,
    translate_text,
)


def test_translate_text_prefixes_marker():
    result = translate_text("hello")
    assert result.startswith("[translated]")


def test_create_burned_subtitle_video_returns_output_path(tmp_path):
    video_path = tmp_path / "sample.mp4"
    video_path.write_bytes(b"fake-video")
    subtitle_path = tmp_path / "sample.srt"
    subtitle_path.write_text("1\n00:00:00,000 --> 00:00:05,000\nhello\n", encoding="utf-8")

    output_path = create_burned_subtitle_video(str(video_path), str(subtitle_path))
    assert output_path.endswith(".subtitled.mp4")


def test_build_export_contents_include_transcript_and_metadata():
    transcript = "Hello world\nThis is a test"
    chapters = [{"title": "Intro", "start": "00:00:00", "text": "Hello world"}]

    txt_content = build_txt_content(transcript)
    vtt_content = build_vtt_content(transcript)
    json_content = build_json_content(transcript, chapters)

    assert "Hello world" in txt_content
    assert "WEBVTT" in vtt_content
    assert '"transcript"' in json_content
    assert '"chapters"' in json_content
