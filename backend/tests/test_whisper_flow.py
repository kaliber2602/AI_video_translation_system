from app.pipeline import create_transcript_from_audio


def test_transcript_generation_falls_back_cleanly():
    transcript = create_transcript_from_audio("/tmp/demo.wav")
    assert "Hello and welcome" not in transcript
    assert "transcription" in transcript.lower()
