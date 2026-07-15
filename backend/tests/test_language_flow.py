from app.services import detect_language, translate_text


def test_detect_language_for_vietnamese():
    detected = detect_language("Xin chào thế giới")
    assert detected == "vi"


def test_translate_text_respects_target_language():
    translated = translate_text("hello", target_language="vi")
    assert translated.startswith("[vi]")
