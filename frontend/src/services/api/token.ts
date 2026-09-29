const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function setTokens(
  accessToken: string,
  refreshToken: string
) {
  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    accessToken
  );

  localStorage.setItem(
    REFRESH_TOKEN_KEY,
    refreshToken
  );
}

export function getAccessToken(): string | null {
  return localStorage.getItem(
    ACCESS_TOKEN_KEY
  );
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(
    REFRESH_TOKEN_KEY
  );
}

export function setAccessToken(
  accessToken: string
) {
  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    accessToken
  );
}

export function setRefreshToken(
  refreshToken: string
) {
  localStorage.setItem(
    REFRESH_TOKEN_KEY,
    refreshToken
  );
}

export function clearTokens() {
  localStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  localStorage.removeItem(
    REFRESH_TOKEN_KEY
  );
}

export function hasTokens(): boolean {
  return Boolean(
    getAccessToken() &&
    getRefreshToken()
  );
}

export function getUserIdFromToken(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed?.sub || null;
  } catch {
    return null;
  }
}