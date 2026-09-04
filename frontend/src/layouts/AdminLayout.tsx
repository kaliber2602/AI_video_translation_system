import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Cpu,
  CreditCard,
  FileText,
  Globe,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { useTheme } from "../app/providers/ThemeContext";
import { useLanguage } from "../app/providers/LanguageContext";
import { getMe, logout } from "../services/auth.service";
import { getSystemHealth } from "../services/admin.service";
import { clearTokens } from "../services/api/token";
import { toast } from "../lib/toast";
import type { UserResponse } from "../types/auth";
import type { SystemHealthResponse } from "../types/admin";

export default function AdminLayout() {
  const { t } = useTranslation(["admin", "common", "navigation"]);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, changeLanguage } = useLanguage();

  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [healthData, setHealthData] = useState<SystemHealthResponse | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  useEffect(() => {
    getMe()
      .then((user) => setCurrentUser(user))
      .catch((err) => console.error("[AdminLayout] Error fetching user:", err));

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000); // Polling telemetry every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchTelemetry = async () => {
    try {
      setIsHealthLoading(true);
      const data = await getSystemHealth();
      setHealthData(data);
    } catch (error) {
      console.error("[AdminLayout] Error fetching health telemetry:", error);
    } finally {
      setIsHealthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout().catch(() => {});
    } finally {
      clearTokens();
      toast.success("Đã đăng xuất thành công.");
      navigate("/login");
    }
  };

  const navItems = [
    {
      path: "/admin/dashboard",
      label: t("admin:nav.dashboard"),
      icon: LayoutDashboard,
    },
    {
      path: "/admin/jobs",
      label: t("admin:nav.jobs"),
      icon: Cpu,
    },
    {
      path: "/admin/models",
      label: t("admin:nav.models"),
      icon: Layers,
    },
    {
      path: "/admin/users",
      label: t("admin:nav.users"),
      icon: Users,
    },
    {
      path: "/admin/finance",
      label: t("admin:nav.finance"),
      icon: CreditCard,
    },
    {
      path: "/admin/logs",
      label: t("admin:nav.logs"),
      icon: FileText,
    },
    {
      path: "/admin/contacts",
      label: t("admin:nav.contacts"),
      icon: Mail,
    },
    {
      path: "/admin/tools",
      label: t("admin:nav.tools"),
      icon: Wrench,
    },
  ];

  const overallStatus = healthData?.overall_status || "healthy";

  return (
    <div className="flex min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      {/* =======================================================
          SIDEBAR DESKTOP
      ======================================================== */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-6">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-emerald-400 text-white shadow-sm font-bold text-lg">
              V
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[var(--color-text-primary)]">VIDNOVA</span>
                <span className="rounded bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-red-600 dark:text-red-400">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] font-medium text-[var(--color-text-muted)]">Control & Telemetry</p>
            </div>
          </Link>
        </div>

        {/* Live System Health Badge (Clickable) */}
        <div className="p-4 border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setIsHealthModalOpen(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-subtle)] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    overallStatus === "healthy"
                      ? "bg-emerald-400"
                      : overallStatus === "warning"
                      ? "bg-amber-400"
                      : "bg-red-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    overallStatus === "healthy"
                      ? "bg-emerald-500"
                      : overallStatus === "warning"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                />
              </span>
              <div>
                <p className="text-xs font-bold capitalize text-[var(--color-text-primary)]">
                  {overallStatus === "healthy"
                    ? t("admin:health.allOperational")
                    : overallStatus === "warning"
                    ? t("admin:health.degraded")
                    : t("admin:health.critical")}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  {healthData?.services.length || 0} services monitored
                </p>
              </div>
            </div>
            <Activity size={15} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === "/admin/dashboard" && location.pathname === "/admin");
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white shadow-xs font-bold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-[var(--color-text-muted)]"} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="opacity-80" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Back to Workspace link */}
        <div className="border-t border-[var(--color-border)] p-3">
          <Link
            to="/workspace"
            className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] transition"
          >
            <ArrowLeft size={16} />
            <span>{t("admin:nav.backToWorkspace")}</span>
          </Link>
        </div>
      </aside>

      {/* =======================================================
          MAIN CONTENT WRAPPER
      ======================================================== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--color-text-primary)] hidden sm:inline">
                {t("admin:nav.adminCenter")}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] hidden md:inline">
                • {new Date().toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Refresh telemetry button */}
            <button
              type="button"
              onClick={fetchTelemetry}
              disabled={isHealthLoading}
              title={t("admin:health.refreshTelemetry")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={15} className={isHealthLoading ? "animate-spin" : ""} />
            </button>

            {/* Language toggle */}
            <button
              type="button"
              onClick={() => changeLanguage(language === "vi" ? "en" : "vi")}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-2.5 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] transition cursor-pointer"
            >
              <Globe size={14} />
              <span className="uppercase">{language}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition cursor-pointer"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1.5 pl-2.5">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">
                  {currentUser?.full_name || "Administrator"}
                </span>
                <span className="text-[10px] text-amber-500 font-extrabold uppercase">
                  {currentUser?.role || "admin"}
                </span>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold">
                {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : "A"}
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Main Routed Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* =======================================================
          MOBILE DRAWER
      ======================================================== */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="relative flex w-72 flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] p-4 shadow-xl z-10">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white font-bold">
                  V
                </div>
                <span className="font-bold text-sm">VIDNOVA ADMIN</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-[var(--color-border)]">
              <Link
                to="/workspace"
                className="flex items-center gap-2 rounded-xl p-2.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
              >
                <ArrowLeft size={16} />
                <span>{t("admin:nav.backToWorkspace")}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          HEALTH TELEMETRY MODAL
      ======================================================== */}
      {isHealthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsHealthModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl z-10 animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[var(--color-primary)]" size={20} />
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  {t("admin:dashboard.servicesTitle")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHealthModalOpen(false)}
                className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {healthData?.services.map((svc) => (
                <div
                  key={svc.name}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 bg-[var(--color-surface-muted)]"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        svc.status === "healthy"
                          ? "bg-emerald-500"
                          : svc.status === "warning"
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-primary)]">{svc.name}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{svc.message || "Running"}</p>
                    </div>
                  </div>
                  {svc.latency_ms !== undefined && (
                    <span className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 text-[11px] font-mono font-bold text-[var(--color-text-secondary)]">
                      {svc.latency_ms}ms
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHealthModalOpen(false)}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
