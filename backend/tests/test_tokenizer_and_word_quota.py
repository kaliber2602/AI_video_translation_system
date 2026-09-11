# tests/test_tokenizer_and_word_quota.py
import pytest
from app.core.tokenizer import TokenizerService
from app.services.subscription_service import (
    deduct_user_words,
    refund_user_words,
    get_user_effective_quota,
)


def test_tokenizer_vietnamese():
    text = "Xin chào các bạn đến với hệ thống dịch video bằng AI"
    count = TokenizerService.count_words(text)
    assert count == 12


def test_tokenizer_english():
    text = "Hello world! This is a state-of-the-art AI video pipeline."
    count = TokenizerService.count_words(text)
    assert count >= 8


def test_tokenizer_cjk():
    text = "你好世界 Hello"
    count = TokenizerService.count_words(text)
    # 4 CJK characters + 1 English word = 5 words/tokens
    assert count == 5


def test_tokenizer_estimate_video():
    # 60s -> ~150 words
    words = TokenizerService.estimate_video_words(60)
    assert words == 150

    # 120s -> ~300 words
    words_2m = TokenizerService.estimate_video_words(120)
    assert words_2m == 300


def test_word_quota_structure():
    quota = get_user_effective_quota(1)
    assert "words" in quota
    words = quota["words"]
    assert "total_words" in words
    assert "used_words" in words
    assert "remaining_words" in words
    assert words["total_words"] >= 5000


def test_deduct_and_refund_user_words():
    # Deduct 50 words
    deducted = deduct_user_words(
        user_id=1,
        words_amount=50,
        service_type="TRANSLATION",
        description="Test word deduction",
        video_id=99999,
    )
    assert deducted is True

    # Check quota reflects usage
    quota = get_user_effective_quota(1)
    assert quota["words"]["used_words"] >= 50

    # Refund 50 words
    refunded = refund_user_words(
        user_id=1,
        words_amount=50,
        description="Test word refund",
        video_id=99999,
    )
    assert refunded is True


def test_supported_languages_mapping():
    from app.core.languages import TARGET_LANGUAGE_MAP, SOURCE_LANGUAGE_MAP, SUPPORTED_LANGUAGES

    # Verify all 12 languages are mapped
    expected_codes = ["vi", "en", "zh", "ja", "ko", "fr", "de", "es", "ar", "ru", "pt", "it"]
    assert len(SUPPORTED_LANGUAGES) == 12
    for code in expected_codes:
        assert code in TARGET_LANGUAGE_MAP
        assert code in SOURCE_LANGUAGE_MAP
        assert "nllb" in TARGET_LANGUAGE_MAP[code]
        assert "xtts" in TARGET_LANGUAGE_MAP[code]

