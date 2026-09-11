# Language mappings used by the video translation pipeline.

SUPPORTED_LANGUAGES = [
    {"code": "vi", "name": "Vietnamese", "native_name": "Tiếng Việt", "nllb": "vie_Latn", "xtts": "vi"},
    {"code": "en", "name": "English", "native_name": "English", "nllb": "eng_Latn", "xtts": "en"},
    {"code": "zh", "name": "Chinese", "native_name": "中文", "nllb": "zho_Hans", "xtts": "zh-cn"},
    {"code": "ja", "name": "Japanese", "native_name": "日本語", "nllb": "jpn_Jpan", "xtts": "ja"},
    {"code": "ko", "name": "Korean", "native_name": "한국어", "nllb": "kor_Hang", "xtts": "ko"},
    {"code": "fr", "name": "French", "native_name": "Français", "nllb": "fra_Latn", "xtts": "fr"},
    {"code": "de", "name": "German", "native_name": "Deutsch", "nllb": "deu_Latn", "xtts": "de"},
    {"code": "es", "name": "Spanish", "native_name": "Español", "nllb": "spa_Latn", "xtts": "es"},
    {"code": "ar", "name": "Arabic", "native_name": "العربية", "nllb": "arb_Arab", "xtts": "ar"},
    {"code": "ru", "name": "Russian", "native_name": "Русский", "nllb": "rus_Cyrl", "xtts": "ru"},
    {"code": "pt", "name": "Portuguese", "native_name": "Português", "nllb": "por_Latn", "xtts": "pt"},
    {"code": "it", "name": "Italian", "native_name": "Italiano", "nllb": "ita_Latn", "xtts": "it"},
]

TARGET_LANGUAGE_MAP = {
    item["code"]: {"nllb": item["nllb"], "xtts": item["xtts"]}
    for item in SUPPORTED_LANGUAGES
}

SOURCE_LANGUAGE_MAP = {
    item["code"]: item["nllb"]
    for item in SUPPORTED_LANGUAGES
}
