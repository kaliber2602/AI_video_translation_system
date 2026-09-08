import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert, Loader2 } from "lucide-react";
import { getAccessToken, getRefreshToken } from "../../services/api/token";
import { getMe } from "../../services/auth.service";
import { toast } from "../../lib/toast";
import type { UserResponse } from "../../types/auth";

export default function AdminRoute() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  useEffect(() => {
    let isMounted = true;

    if (!accessToken && !refreshToken) {
      setIsLoading(false);
      return;
    }

    const checkAdminRole = async () => {
      try {
        const user = await getMe();
        if (!isMounted) return;
        setCurrentUser(user);

        if (user.role === "admin" && user.is_active) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          toast.error("Bạn không có quyền quản trị viên để truy cập trang này.");
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("[ADMIN ROUTE] Failed to verify user role:", error);
        setIsAuthorized(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkAdminRole();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshToken]);

  // 1. Not logged in
  if (!accessToken && !refreshToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2. Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-background)]">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            Đang xác thực quyền Quản trị viên...
          </p>
        </div>
      </div>
    );
  }

  // 3. Authenticated but forbidden (Not Admin)
  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-background)] p-4">
        <div className="flex max-w-md flex-col items-center text-center rounded-2xl border border-red-500/20 bg-[var(--color-surface)] p-8 shadow-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            Quyền truy cập bị từ chối
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Tài khoản <span className="font-semibold">{currentUser?.email}</span> (vai trò: <span className="uppercase font-bold text-amber-500">{currentUser?.role || "user"}</span>) không có quyền quản trị viên nền tảng VidNova.
          </p>
          <div className="mt-6 flex gap-3">
            <Navigate to="/workspace" replace />
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Admin
  return <Outlet />;
}
