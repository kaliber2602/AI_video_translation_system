import api from "./api/axios";
import { getRefreshToken } from "./api/token";

import type {
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  LogoutResponse,
} from "../types/auth";

export const register = async (
  data: RegisterRequest
): Promise<RegisterResponse> => {
  const response =
    await api.post<RegisterResponse>(
      "/api/auth/register",
      data
    );

  return response.data;
};


export const refreshToken = async (
  data: RefreshTokenRequest
): Promise<RefreshTokenResponse> => {
  const response =
    await api.post<RefreshTokenResponse>(
      "/api/auth/refresh",
      data
    );

  return response.data;
};


export async function logout(refreshToken?: string): Promise<LogoutResponse | void> {
  const token = refreshToken || getRefreshToken();
  if (!token) {
    return;
  }

  const response = await api.post<LogoutResponse>("/api/auth/logout", {
    refresh_token: token,
  });
  return response.data;
}

export const getMe =
  async (): Promise<UserResponse> => {
    const response =
      await api.get<UserResponse>(
        "/api/auth/me"
      );

    return response.data;
  };

export const changePassword = async (
  data: ChangePasswordRequest
): Promise<void> => {
  await api.put(
    "/api/auth/change-password",
    data
  );
};

export const forgotPassword = async (
  data: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> => {
  const response =
    await api.post<ForgotPasswordResponse>(
      "/api/auth/forgot-password",
      data
    );

  return response.data;
};

export const resetPassword = async (
  data: ResetPasswordRequest
): Promise<ResetPasswordResponse> => {
  const response =
    await api.post<ResetPasswordResponse>(
      "/api/auth/reset-password",
      data
    );

  return response.data;
};

export async function login(data: {
  email: string;
  password: string;
}) {
  console.log(
    "%c[AUTH SERVICE] login() called",
    "color: blue; font-weight: bold;"
  );

  console.log(
    "[AUTH SERVICE] data:",
    {
      email: data.email,
      passwordLength: data.password.length,
    }
  );

  console.log(
    "[AUTH SERVICE] Sending POST /api/auth/login"
  );

  const response = await api.post(
    "/api/auth/login",
    data
  );

  console.log(
    "%c[AUTH SERVICE] Response received",
    "color: green; font-weight: bold;"
  );

  console.log(
    "[AUTH SERVICE] status:",
    response.status
  );

  console.log(
    "[AUTH SERVICE] data:",
    response.data
  );

  return response.data;
}

export const updateAvatar = async (
  file: File
): Promise<UserResponse> => {
  const formData = new FormData();

  formData.append("avatar", file);

  const response = await api.put<UserResponse>(
    "/api/auth/me/avatar",
    formData,
    {
      headers: {
        "Content-Type": undefined,
      },
    }
  );

  return response.data;
};

export const updateProfile = async (data: {
  full_name: string;
}): Promise<UserResponse> => {
  const response = await api.put<UserResponse>("/api/auth/me", data);
  return response.data;
};

export const deleteAccount = async (confirmation = "DELETE"): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/api/auth/account/delete", {
    confirmation,
  });
  return response.data;
};

export const getSessions = async (): Promise<any[]> => {
  const response = await api.get<any[]>("/api/auth/sessions");
  return response.data;
};

export const revokeSession = async (sessionId: string): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/api/auth/sessions/${sessionId}`);
  return response.data;
};

export const logoutAll = async (): Promise<LogoutResponse> => {
  const response = await api.post<LogoutResponse>("/api/auth/logout-all");
  return response.data;
};

export const getSecurityLogs = async (): Promise<any[]> => {
  const response = await api.get<any[]>("/api/auth/security-logs");
  return response.data;
};