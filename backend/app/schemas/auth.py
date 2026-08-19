from pydantic import BaseModel, EmailStr, Field, field_validator


# =========================================================
# Shared validators
# =========================================================

def validate_password_strength(value: str) -> str:

    if not any(c.isupper() for c in value):
        raise ValueError(
            "Password must contain an uppercase letter."
        )

    if not any(c.islower() for c in value):
        raise ValueError(
            "Password must contain a lowercase letter."
        )

    if not any(c.isdigit() for c in value):
        raise ValueError(
            "Password must contain a number."
        )

    if not any(not c.isalnum() for c in value):
        raise ValueError(
            "Password must contain a special character."
        )

    return value


# =========================================================
# Register
# =========================================================

class RegisterRequest(BaseModel):

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    full_name: str = Field(
        min_length=2,
        max_length=100,
    )

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str):
        return value.strip().lower()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str):

        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "Full name must contain at least 2 characters."
            )

        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):
        return validate_password_strength(value)


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

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str):
        return value.strip().lower()


class LoginResponse(BaseModel):

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# =========================================================
# Refresh Token
# =========================================================

class RefreshTokenRequest(BaseModel):

    refresh_token: str = Field(
        min_length=1,
        max_length=4096,
    )


class RefreshTokenResponse(BaseModel):

    access_token: str
    refresh_token: str
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

    current_password: str = Field(
        min_length=1,
        max_length=128,
    )

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str):
        return validate_password_strength(value)


# =========================================================
# Forgot Password
# =========================================================

class ForgotPasswordRequest(BaseModel):

    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str):
        return value.strip().lower()


class ForgotPasswordResponse(BaseModel):

    message: str


# =========================================================
# Reset Password
# =========================================================

class ResetPasswordRequest(BaseModel):

    otp: str = Field(
        min_length=6,
        max_length=6,
    )

    reset_token: str = Field(
        min_length=1,
        max_length=4096,
    )

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, value: str):

        if not value.isdigit():
            raise ValueError(
                "OTP must contain only digits."
            )

        return value

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str):
        return validate_password_strength(value)


class ResetPasswordResponse(BaseModel):

    message: str


# =========================================================
# Logout
# =========================================================

class LogoutRequest(BaseModel):

    refresh_token: str = Field(
        min_length=1,
        max_length=4096,
    )


class LogoutResponse(BaseModel):

    message: str


# =========================================================
# Logout All
# =========================================================

class LogoutAllResponse(BaseModel):

    message: str