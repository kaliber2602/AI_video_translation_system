from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from app.api.auth_routes import (
    get_current_user_id,
)

from app.schemas.user_settings import (
    UserSettingsPatch,
    UserSettingsResponse,
    UserSettingsUpdate,
    TTSPreviewRequest,
)

from app.services.user_settings_service import (
    get_user_settings,
    update_user_settings,
    patch_user_settings,
    reset_user_settings,
)


router = APIRouter(
    prefix="/settings",
    tags=["User Settings"],
)


# =========================================================
# GET /api/settings
# =========================================================

@router.get(
    "",
    response_model=UserSettingsResponse,
    status_code=status.HTTP_200_OK,
)
def get_settings(
    user_id: int = Depends(
        get_current_user_id
    ),
):

    try:

        settings = get_user_settings(
            user_id=user_id,
        )

        if settings is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User settings not found.",
            )

        return settings

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user settings.",
        ) from exc


# =========================================================
# PUT /api/settings
# =========================================================

@router.put(
    "",
    response_model=UserSettingsResponse,
    status_code=status.HTTP_200_OK,
)
def update_settings(
    request: UserSettingsUpdate,
    user_id: int = Depends(
        get_current_user_id
    ),
):

    try:

        settings = update_user_settings(
            user_id=user_id,
            data=request,
        )

        if settings is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User settings not found.",
            )

        return settings

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user settings.",
        ) from exc


# =========================================================
# PATCH /api/settings
# =========================================================

@router.patch(
    "",
    response_model=UserSettingsResponse,
    status_code=status.HTTP_200_OK,
)
def patch_settings(
    request: UserSettingsPatch,
    user_id: int = Depends(
        get_current_user_id
    ),
):

    try:

        settings = patch_user_settings(
            user_id=user_id,
            data=request,
        )

        if settings is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User settings not found.",
            )

        return settings

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user settings.",
        ) from exc


# =========================================================
# POST /api/settings/reset
# =========================================================

@router.post(
    "/reset",
    response_model=UserSettingsResponse,
    status_code=status.HTTP_200_OK,
)
def reset_settings(
    user_id: int = Depends(
        get_current_user_id
    ),
):

    try:

        settings = reset_user_settings(
            user_id=user_id,
        )

        if settings is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User settings not found.",
            )

        return settings

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset user settings.",
        ) from exc


# =========================================================
# POST /api/settings/tts/preview
# =========================================================

@router.post(
    "/tts/preview",
    status_code=status.HTTP_200_OK,
)
async def tts_preview(
    request: TTSPreviewRequest,
    user_id: int = Depends(get_current_user_id),
):
    """
    Generate audio preview for TTS voice settings.
    Attempts edge-tts / tts-service, falls back cleanly to synthesized chime audio.
    """
    sample_text = request.text.strip() or "Hello! This is a preview of the selected voice synthesis model."
    lang = request.language or "en"

    # 1. Try edge-tts for high-quality audio
    try:
        import edge_tts
        from fastapi.responses import Response

        voice = "vi-VN-HoaiMyNeural" if lang == "vi" else "en-US-JennyNeural"
        communicate = edge_tts.Communicate(sample_text, voice)
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio":
                audio_chunks.append(chunk["data"])
        if audio_chunks:
            return Response(
                content=b"".join(audio_chunks),
                media_type="audio/mpeg",
                headers={"Content-Disposition": "inline; filename=preview.mp3"}
            )
    except Exception as exc:
        pass

    # 2. Fallback: generate a valid short synthetic WAV preview
    import io, math, struct, wave
    from fastapi.responses import Response

    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(22050)
        for i in range(int(22050 * 1.5)):
            t = i / 22050.0
            val = int(14000 * math.sin(2 * math.pi * 440 * t) * math.exp(-2.0 * t))
            wav_file.writeframesraw(struct.pack('<h', max(-32768, min(32767, val))))
    buf.seek(0)
    return Response(
        content=buf.read(),
        media_type="audio/wav",
        headers={"Content-Disposition": "inline; filename=preview.wav"}
    )