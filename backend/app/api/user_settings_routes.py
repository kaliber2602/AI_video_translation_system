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