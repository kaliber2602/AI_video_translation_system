from app.core.languages import SOURCE_LANGUAGE_MAP, TARGET_LANGUAGE_MAP


def test_vietnamese_target_mapping():
    config = TARGET_LANGUAGE_MAP["vi"]
    assert config["nllb"] == "vie_Latn"
    assert config["xtts"] == "vi"


def test_english_source_mapping():
    assert SOURCE_LANGUAGE_MAP["en"] == "eng_Latn"


def test_chinese_target_mapping():
    config = TARGET_LANGUAGE_MAP["zh"]
    assert config["nllb"] == "zho_Hans"
    assert config["xtts"] == "zh-cn"


def test_expected_source_languages_exist():
    assert {"en", "vi", "fr", "ja", "zh", "ko", "es"} <= set(SOURCE_LANGUAGE_MAP)


def test_expected_target_languages_exist():
    assert {"en", "vi", "fr", "ja", "es", "zh"} <= set(TARGET_LANGUAGE_MAP)
