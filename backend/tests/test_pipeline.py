from app.pipeline import _create_fallback_transcript, create_chapters, create_transcript_from_audio, extract_audio


def test_create_transcript_and_chapters():
    transcript = create_transcript_from_audio("/tmp/audio.wav")
    chapters = create_chapters(transcript)
    assert "Hello and welcome" not in transcript
    assert "transcription" in transcript.lower()
    assert len(chapters) >= 2


def test_extract_audio_returns_path(tmp_path):
    video_path = tmp_path / "sample.mp4"
    video_path.write_bytes(b"fake-video")

    output_path = extract_audio(str(video_path))
    assert output_path.endswith(".wav")


def test_fallback_transcript_scales_with_duration(monkeypatch):
    monkeypatch.setattr("app.pipeline._get_media_duration", lambda path: 45.0)

    transcript = _create_fallback_transcript("/tmp/demo.wav")
    lines = transcript.splitlines()

    assert len(lines) >= 5
    assert lines[0].startswith("[")
