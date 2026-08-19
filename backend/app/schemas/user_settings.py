from typing import Optional

from pydantic import BaseModel, field_validator


SUPPORTED_LANGUAGES = {"en", "vi"}


class UserSettingsUpdate(BaseModel):
    theme: str
    language: str
    default_target_language: Optional[str] = None
    default_translation_model: Optional[str] = None
    default_tts_model: Optional[str] = None

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        if value not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language '{value}'. "
                f"Supported languages: {', '.join(sorted(SUPPORTED_LANGUAGES))}"
            )

        return value


class UserSettingsPatch(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    default_target_language: Optional[str] = None
    default_translation_model: Optional[str] = None
    default_tts_model: Optional[str] = None

    @field_validator("language")
    @classmethod
    def validate_language(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is not None and value not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language '{value}'. "
                f"Supported languages: {', '.join(sorted(SUPPORTED_LANGUAGES))}"
            )

        return value


class UserSettingsResponse(BaseModel):
    id: int
    user_id: int
    theme: str
    language: str
    default_target_language: Optional[str] = None
    default_translation_model: Optional[str] = None
    default_tts_model: Optional[str] = None