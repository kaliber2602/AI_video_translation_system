from app.services.translation_service import TranslationService


def make_service():
    return TranslationService.__new__(TranslationService)


def test_mask_and_unmask_keywords():
    service = make_service()
    text, mapping = service.mask_keywords(
        "I use FastAPI and PostgreSQL.",
        {"FastAPI": "FastAPI", "PostgreSQL": "PostgreSQL"},
    )
    assert "__GLOSSARY_0__" in text
    assert "__GLOSSARY_1__" in text
    assert service.unmask_keywords(text, mapping) == "I use FastAPI and PostgreSQL."


def test_mask_keywords_without_glossary():
    service = make_service()
    text, mapping = service.mask_keywords("Hello world", {})
    assert text == "Hello world"
    assert mapping == {}


def test_smart_merge_segments():
    service = make_service()
    segments = [
        {"start": 0.0, "end": 1.0, "text": "Hello"},
        {"start": 1.1, "end": 2.0, "text": "world"},
    ]
    result = service._smart_merge_segments(segments)
    assert len(result) == 1
    assert result[0]["text"] == "Hello world"
    assert result[0]["end"] == 2.0


def test_smart_merge_stops_at_sentence():
    service = make_service()
    segments = [
        {"start": 0.0, "end": 1.0, "text": "Hello."},
        {"start": 1.1, "end": 2.0, "text": "How are you?"},
    ]
    result = service._smart_merge_segments(segments)
    assert len(result) == 2


def test_smart_merge_respects_duration():
    service = make_service()
    segments = [
        {"start": 0.0, "end": 5.0, "text": "One"},
        {"start": 5.1, "end": 11.0, "text": "Two"},
    ]
    result = service._smart_merge_segments(segments, max_duration=10.0)
    assert len(result) == 2


def test_translate_document_skips_same_language():
    service = make_service()
    segments = [
        {"start": 0.0, "end": 1.0, "text": "Xin chao"},
        {"start": 1.0, "end": 2.0, "text": "The gioi"},
    ]
    result = service.translate_document(
        segments, {}, "vie_Latn", "vie_Latn"
    )
    assert result[0]["translated_text"] == "Xin chao"
    assert result[1]["translated_text"] == "The gioi"
