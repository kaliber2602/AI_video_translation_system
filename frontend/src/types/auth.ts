export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  full_name: string;
  avatar: string | null;
  role: string;
  is_active: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  reset_token: string | null;
}

export interface ResetPasswordRequest {
  otp: string;
  reset_token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  message: string;

}

export interface LogoutAllResponse {
  message: string;
}

export interface PasswordResetRouteState {
  email: string;
  resetToken: string;
  otp?: string;
}

export interface UpdateAvatarResponse {
  avatar: string;
}