import {
  Bell,
  ChevronDown,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { logout } from "../../services/auth.service";
import { clearTokens } from "../../services/api/token";

export default function WorkspaceTopbar() {
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSettings = () => {
    setProfileOpen(false);
    navigate("/workspace/settings");
  };

  const handleWorkspace = () => {
    setProfileOpen(false);
    navigate("/workspace");
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    console.log(
      "%c========== LOGOUT START ==========",
      "color: orange; font-weight: bold;"
    );

    try {
      setLoggingOut(true);
      setProfileOpen(false);

      console.log("[LOGOUT] Calling logout API...");

      /*
       * Gọi backend logout.
       *
       * Nếu backend yêu cầu access token / refresh token,
       * interceptor sẽ tự xử lý Authorization.
       */
      await logout();

      console.log("[LOGOUT] Logout API success.");
    } catch (error) {
      /*
       * Logout phía server fail không được phép
       * ngăn logout phía client.
       */
      console.error(
        "[LOGOUT] Logout API failed:",
        error
      );
    } finally {
      /*
       * QUAN TRỌNG:
       *
       * Dù API logout thành công hay thất bại,
       * luôn xóa cả access token và refresh token.
       */
      console.log(
        "[LOGOUT] Clearing access token and refresh token..."
      );

      clearTokens();

      console.log(
        "[LOGOUT] Tokens cleared."
      );

      console.log(
        "[LOGOUT] Redirecting to /login..."
      );

      navigate("/login", {
        replace: true,
      });

      setLoggingOut(false);

      console.log(
        "%c========== LOGOUT END ==========",
        "color: orange; font-weight: bold;"
      );
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-[84px] items-center border-b border-[#E7EFEE] bg-white/90 px-6 backdrop-blur-xl lg:px-8">
      {/* LOGO */}
      <button
        type="button"
        onClick={handleWorkspace}
        className="flex w-[220px] shrink-0 items-center gap-3 text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F9F5] text-[#16BFA7]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
          >
            <circle
              cx="7"
              cy="16"
              r="3"
              fill="currentColor"
            />

            <circle
              cx="24"
              cy="8"
              r="3"
              fill="currentColor"
            />

            <circle
              cx="24"
              cy="24"
              r="3"
              fill="currentColor"
            />

            <path
              d="M9.5 15L21.5 9"
              stroke="currentColor"
              strokeWidth="2"
            />

            <path
              d="M9.5 17L21.5 23"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#142238]">
            VIDNOVA
          </h1>

          <p className="text-[10px] font-semibold tracking-[5px] text-[#16BFA9]">
            SINCE 2026
          </p>
        </div>
      </button>

      {/* GLOBAL SEARCH */}
      <div className="mx-auto flex w-full max-w-[540px] items-center rounded-full border border-[#E3ECEB] bg-[#F8FBFB] px-4 py-2.5 shadow-sm">
        <Search
          size={19}
          className="text-[#81919B]"
        />

        <input
          type="text"
          placeholder="Search anything..."
          className="flex-1 bg-transparent px-3 text-sm text-[#344454] outline-none placeholder:text-[#8D9AA3]"
        />

        <Search
          size={18}
          className="text-[#7D8C97]"
        />
      </div>

      {/* ACTIONS */}
      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/workspace")}
          className="flex items-center gap-2 rounded-xl bg-[#15C2A8] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(21,194,168,.25)] transition hover:bg-[#0FB39B]"
        >
          <Plus size={18} />
          New Project
        </button>

        {/* NOTIFICATION */}
        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#E8EFEE] bg-white shadow-sm transition hover:bg-[#F4FAF9]"
        >
          <Bell
            size={19}
            className="text-[#52626F]"
          />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#18C3AA]" />
        </button>

        {/* PROFILE */}
        <div className="relative">
          <button
            type="button"
            disabled={loggingOut}
            onClick={() =>
              setProfileOpen((prev) => !prev)
            }
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-[#F5FAF9] disabled:opacity-60"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D8F3EE] text-sm font-bold text-[#159C8B]">
              U
            </div>

            <ChevronDown
              size={17}
              className={`text-[#687780] transition ${
                profileOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {/* DROPDOWN */}
          {profileOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                onClick={() =>
                  setProfileOpen(false)
                }
                className="fixed inset-0 z-40 cursor-default"
              />

              <div className="absolute right-0 top-[58px] z-50 w-[250px] overflow-hidden rounded-2xl border border-[#E3ECEB] bg-white shadow-[0_18px_50px_rgba(30,70,80,0.14)]">
                {/* PROFILE HEADER */}
                <div className="border-b border-[#EDF2F1] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D8F3EE] text-sm font-bold text-[#159C8B]">
                      U
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#263641]">
                        Nguyen Anh Tuan
                      </p>

                      <p className="truncate text-xs text-[#8A999D]">
                        tuan.nguyen@example.com
                      </p>
                    </div>
                  </div>
                </div>

                {/* MENU */}
                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleWorkspace}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#53666B] transition hover:bg-[#F4FAF9] hover:text-[#18BFA7] disabled:opacity-50"
                  >
                    <User size={17} />
                    My Workspace
                  </button>

                  <button
                    type="button"
                    onClick={handleSettings}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#53666B] transition hover:bg-[#F4FAF9] hover:text-[#18BFA7] disabled:opacity-50"
                  >
                    <Settings size={17} />
                    Settings
                  </button>
                </div>

                {/* LOGOUT */}
                <div className="border-t border-[#EDF2F1] p-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#D06464] transition hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LogOut size={17} />

                    {loggingOut
                      ? "Logging out..."
                      : "Log out"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}