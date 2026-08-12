# Language mappings used by the video translation pipeline.

TARGET_LANGUAGE_MAP = {
    "en": {"nllb": "eng_Latn", "xtts": "en"},
    "vi": {"nllb": "vie_Latn", "xtts": "vi"},
    "fr": {"nllb": "fra_Latn", "xtts": "fr"},
    "ja": {"nllb": "jpn_Jpan", "xtts": "ja"},
    "es": {"nllb": "spa_Latn", "xtts": "es"},
    "zh": {"nllb": "zho_Hans", "xtts": "zh-cn"},
}

SOURCE_LANGUAGE_MAP = {
    "en": "eng_Latn",
    "vi": "vie_Latn",
    "fr": "fra_Latn",
    "ja": "jpn_Jpan",
    "zh": "zho_Hans",
    "ko": "kor_Hang",
    "es": "spa_Latn",
}
