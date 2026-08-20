import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  getAccessToken,
  getRefreshToken,
} from "../../services/api/token";

export default function ProtectedRoute() {
  const location = useLocation();

  const accessToken =
    getAccessToken();

  const refreshToken =
    getRefreshToken();

  console.log(
    "%c[PROTECTED ROUTE]",
    "color: orange; font-weight: bold;"
  );

  console.log(
    "[PROTECTED ROUTE] Path:",
    location.pathname
  );

  console.log(
    "[PROTECTED ROUTE] Has access token:",
    Boolean(accessToken)
  );

  console.log(
    "[PROTECTED ROUTE] Has refresh token:",
    Boolean(refreshToken)
  );

  // ============================================================
  // NO AUTHENTICATION
  // ============================================================

  if (!accessToken && !refreshToken) {
    console.log(
      "[PROTECTED ROUTE] No tokens -> redirect /login"
    );

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // ============================================================
  // AUTHENTICATED
  // ============================================================

  console.log(
    "[PROTECTED ROUTE] Authentication exists -> allow"
  );

  return <Outlet />;
}