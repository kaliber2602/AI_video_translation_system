from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.services.auth_service import (
    register_user,
    login_user,
    refresh_access_token,
    get_current_user,
    change_password,
    request_password_reset,
    reset_password,
    logout_user,
    logout_all_user_sessions,
)

from app.core.security import (
    get_user_id_from_token,
)

from app.schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    UserResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    LogoutRequest,
    LogoutResponse,
    LogoutAllResponse,
)


# =========================================================
# Router
# =========================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =========================================================
# Security
# =========================================================

bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
) -> int:

    token = credentials.credentials

    try:

        return get_user_id_from_token(
            token,
            "access",
        )

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc


# =========================================================
# Register
# POST /auth/register
# =========================================================

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    request: RegisterRequest,
):

    try:

        user = register_user(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
        )

        return {
            "id": user[0],
            "email": user[1],
            "full_name": user[2],
            "role": user[4],
            "is_active": user[5],
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user.",
        ) from exc


# =========================================================
# Login
# POST /auth/login
# =========================================================

@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    request: LoginRequest,
    http_request: Request,
):

    try:

        return login_user(
            email=request.email,
            password=request.password,
            user_agent=http_request.headers.get(
                "user-agent"
            ),
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to login.",
        ) from exc


# =========================================================
# Refresh
# POST /auth/refresh
# =========================================================

@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
)
def refresh(
    request: RefreshTokenRequest,
):

    try:

        return refresh_access_token(
            refresh_token=request.refresh_token,
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh access token.",
        ) from exc


# =========================================================
# Current User
# GET /auth/me
# =========================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def me(
    user_id: int = Depends(get_current_user_id),
):

    try:

        user = get_current_user(
            user_id=user_id,
        )

        return {
            "id": user[0],
            "email": user[1],
            "full_name": user[3],
            "avatar_url": user[4],
            "role": user[5],
            "is_active": user[6],
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get current user.",
        ) from exc


# =========================================================
# Change Password
# PUT /auth/change-password
# =========================================================

@router.put(
    "/change-password",
    status_code=status.HTTP_200_OK,
)
def update_password(
    request: ChangePasswordRequest,
    user_id: int = Depends(get_current_user_id),
):

    try:

        change_password(
            user_id=user_id,
            current_password=request.current_password,
            new_password=request.new_password,
        )

        return {
            "message": "Password changed successfully."
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password.",
        ) from exc


# =========================================================
# Forgot Password
# POST /auth/forgot-password
# =========================================================

@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
)
def forgot_password(
    request: ForgotPasswordRequest,
):

    try:

        request_password_reset(
            email=request.email,
        )

    except Exception:

        import logging

        logging.getLogger(
            "app.api.auth"
        ).exception(
            "Password reset email failed"
        )

    return {
        "message": (
            "If the email is registered, "
            "a password reset OTP has been sent."
        )
    }


# =========================================================
# Reset Password
# POST /auth/reset-password
# =========================================================

@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
)
def reset_password_endpoint(
    request: ResetPasswordRequest,
):

    try:

        reset_password(
            reset_token=request.reset_token,
            otp=request.otp,
            new_password=request.new_password,
        )

        return {
            "message": "Password reset successfully."
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password.",
        ) from exc


# =========================================================
# Logout
# POST /auth/logout
# =========================================================

@router.post(
    "/logout",
    response_model=LogoutResponse,
)
def logout(
    request: LogoutRequest,
):

    try:

        logout_user(
            refresh_token=request.refresh_token,
        )

        return {
            "message": "Logged out successfully."
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout.",
        ) from exc


# =========================================================
# Logout All
# POST /auth/logout-all
# =========================================================

@router.post(
    "/logout-all",
    response_model=LogoutAllResponse,
)
def logout_all(
    user_id: int = Depends(get_current_user_id),
):

    try:

        logout_all_user_sessions(
            user_id=user_id,
        )

        return {
            "message": "All sessions have been logged out."
        }

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout all sessions.",
        ) from exc