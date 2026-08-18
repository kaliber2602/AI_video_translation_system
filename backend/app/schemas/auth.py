from pydantic import BaseModel, EmailStr, Field


# =========================================================
# Register
# =========================================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)


class RegisterResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool


# =========================================================
# Login
# =========================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# =========================================================
# Refresh Token
# =========================================================

class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# =========================================================
# Current User
# =========================================================

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    avatar_url: str | None = None
    role: str
    is_active: bool


# =========================================================
# Change Password
# =========================================================

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# =========================================================
# Forgot Password
# =========================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


# =========================================================
# Reset Password - Stateless OTP
# =========================================================

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    reset_token: str
    new_password: str = Field(min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str