import app.pipeline.video_translation as pipeline


def test_process_video_translation_orchestrates_pipeline(monkeypatch, tmp_path):
    calls = []

    class Audio:
        def extract_audio(self, video, audio):
            calls.append("extract_audio")

        def separate_vocal_bgm(self, audio, directory):
            calls.append("separate_vocal_bgm")
            return str(tmp_path / "vocals.wav"), str(tmp_path / "bgm.wav")

        def mix_and_mux(self, *args):
            calls.append("mix_and_mux")

    class STT:
        def transcribe_audio(self, vocal):
            calls.append("transcribe_audio")
            return [{"start": 0.0, "end": 2.0, "text": "Hello"}], "en"

    class Translation:
        def translate_document(self, segments, glossary, src_lang, tgt_lang):
            calls.append(("translate_document", src_lang, tgt_lang))
            segments[0]["translated_text"] = "Xin chao"
            return segments

    class TTS:
        def generate_tts_with_alignment(self, **kwargs):
            calls.append(("generate_tts_with_alignment", kwargs["tgt_lang"]))

    monkeypatch.setattr(pipeline, "audio_service", Audio())
    monkeypatch.setattr(pipeline, "stt_service", STT())
    monkeypatch.setattr(pipeline, "translation_service", Translation())
    monkeypatch.setattr(pipeline, "tts_aligner", TTS())

    output = tmp_path / "output.mp4"
    result = pipeline.process_video_translation(
        str(tmp_path / "input.mp4"),
        str(output),
        "vi",
        {},
    )

    assert result[0] == str(output)
    assert result[1] == "en"
    assert result[2][0]["translated_text"] == "Xin chao"
    assert [c if isinstance(c, str) else c[0] for c in calls] == [
        "extract_audio",
        "separate_vocal_bgm",
        "transcribe_audio",
        "translate_document",
        "generate_tts_with_alignment",
        "mix_and_mux",
    ]


def test_pipeline_language_mapping(monkeypatch, tmp_path):
    captured = {}

    class Audio:
        def extract_audio(self, *args): pass
        def separate_vocal_bgm(self, *args):
            return str(tmp_path / "v.wav"), str(tmp_path / "b.wav")
        def mix_and_mux(self, *args): pass

    class STT:
        def transcribe_audio(self, path):
            return [{"start": 0.0, "end": 1.0, "text": "Hello"}], "en"

    class Translation:
        def translate_document(self, segments, glossary, src_lang, tgt_lang):
            captured["src"] = src_lang
            captured["tgt"] = tgt_lang
            return segments

    class TTS:
        def generate_tts_with_alignment(self, **kwargs):
            captured["xtts"] = kwargs["tgt_lang"]

    monkeypatch.setattr(pipeline, "audio_service", Audio())
    monkeypatch.setattr(pipeline, "stt_service", STT())
    monkeypatch.setattr(pipeline, "translation_service", Translation())
    monkeypatch.setattr(pipeline, "tts_aligner", TTS())

    pipeline.process_video_translation(
        str(tmp_path / "input.mp4"),
        str(tmp_path / "output.mp4"),
        "vi",
        {},
    )

    assert captured == {"src": "eng_Latn", "tgt": "vie_Latn", "xtts": "vi"}
