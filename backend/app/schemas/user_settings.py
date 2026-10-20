from typing import Any, Dict, Optional

from pydantic import BaseModel, field_validator


SUPPORTED_LANGUAGES = {"en", "vi"}


class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = "default_theme"
    language: Optional[str] = "vi"
    preferences: Optional[Dict[str, Any]] = None

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language '{value}'. "
                f"Supported languages: {', '.join(sorted(SUPPORTED_LANGUAGES))}"
            )
        return value


class UserSettingsPatch(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

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
    theme: str = "default_theme"
    language: str = "vi"
    preferences: Optional[Dict[str, Any]] = None


class TTSPreviewRequest(BaseModel):
    text: str
    language: str = "en"
    voice_id: Optional[str] = None
    speed: float = 1.0
    pitch: float = 0.0
