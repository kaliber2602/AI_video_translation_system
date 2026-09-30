const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const REMEMBERED_EMAIL_KEY = "vidnova_remembered_email";

function getStorage(): Storage {
  // If tokens are in localStorage, persistent mode is active
  if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
    return localStorage;
  }
  // If tokens are in sessionStorage, session mode is active
  if (sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
    return sessionStorage;
  }
  return localStorage;
}

export function setTokens(
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean = true
) {
  // Clean up any stale tokens in both storages first
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAccessToken(accessToken: string) {
  const storage = getStorage();
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function setRefreshToken(refreshToken: string) {
  const storage = getStorage();
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasTokens(): boolean {
  return Boolean(getAccessToken() && getRefreshToken());
}

export function saveRememberedEmail(email: string) {
  localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
}

export function getRememberedEmail(): string | null {
  return localStorage.getItem(REMEMBERED_EMAIL_KEY);
}

export function clearRememberedEmail() {
  localStorage.removeItem(REMEMBERED_EMAIL_KEY);
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