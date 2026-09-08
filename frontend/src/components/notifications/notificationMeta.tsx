import type { ReactNode } from "react";
import {
  Bell,
  CreditCard,
  HardDrive,
  ShieldAlert,
  Users,
  Video,
} from "lucide-react";

export interface NotificationMeta {
  icon: ReactNode;
  categoryLabel: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Returns centralized visual styling, icon, and labels for a notification.
 * Safely defaults for unknown/future types without crashing.
 */
export function getNotificationMeta(
  type: string = "system",
  event?: string
): NotificationMeta {
  const normalizedType = (type || "").toLowerCase().trim();
  const normalizedEvent = (event || "").toLowerCase().trim();

  // 1. Pipeline events
  if (normalizedType === "pipeline" || normalizedEvent.startsWith("video.pipeline")) {
    const isFailed = normalizedEvent.includes("failed") || normalizedEvent.includes("error");
    return {
      icon: isFailed ? <ShieldAlert size={16} /> : <Video size={16} />,
      categoryLabel: "Pipeline",
      badgeBg: isFailed
        ? "bg-[var(--color-danger-soft)]"
        : "bg-[var(--color-primary-soft)]",
      badgeText: isFailed
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-primary)]",
    };
  }

  // 2. Quota / Storage
  if (normalizedType === "quota" || normalizedEvent.startsWith("quota")) {
    return {
      icon: <HardDrive size={16} />,
      categoryLabel: "Quota",
      badgeBg: "bg-amber-500/15 dark:bg-amber-500/20",
      badgeText: "text-amber-600 dark:text-amber-400",
    };
  }

  // 3. Collaboration
  if (normalizedType === "collaboration" || normalizedEvent.startsWith("project.member")) {
    return {
      icon: <Users size={16} />,
      categoryLabel: "Collaboration",
      badgeBg: "bg-purple-500/15 dark:bg-purple-500/20",
      badgeText: "text-purple-600 dark:text-purple-400",
    };
  }

  // 4. Billing / Finance
  if (normalizedType === "billing" || normalizedEvent.startsWith("billing")) {
    return {
      icon: <CreditCard size={16} />,
      categoryLabel: "Billing",
      badgeBg: "bg-emerald-500/15 dark:bg-emerald-500/20",
      badgeText: "text-emerald-600 dark:text-emerald-400",
    };
  }

  // 5. Security
  if (normalizedType === "security" || normalizedEvent.startsWith("security")) {
    return {
      icon: <ShieldAlert size={16} />,
      categoryLabel: "Security",
      badgeBg: "bg-rose-500/15 dark:bg-rose-500/20",
      badgeText: "text-rose-600 dark:text-rose-400",
    };
  }

  // 6. System (Default Fallback)
  return {
    icon: <Bell size={16} />,
    categoryLabel: "System",
    badgeBg: "bg-[var(--color-surface-muted)]",
    badgeText: "text-[var(--color-text-secondary)]",
  };
}

/**
 * Validates whether an action_url is a safe internal application route.
 * Rejects external domains, protocols (javascript:, data:, vbscript:) and open redirects.
 */
export function sanitizeInternalActionUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  // Disallow absolute protocols, data, and protocol-relative links
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return null;
  }

  // Disallow paths not starting with standard single slash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  // Only allow internal routes
  const [pathname] = trimmed.split("?");
  const allowedRoots = ["/workspace", "/settings", "/admin"];

  const isAllowed = allowedRoots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`)
  );

  return isAllowed ? trimmed : null;
}

/**
 * Formats an ISO datetime string into human-friendly relative time.
 * Supports Vietnamese and English.
 */
export function formatRelativeTime(
  isoDateStr: string,
  lang: string = "en"
): string {
  if (!isoDateStr) return "";

  try {
    const date = new Date(isoDateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const isVi = lang === "vi";

    if (diffInSeconds < 60) {
      return isVi ? "Vừa xong" : "Just now";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return isVi ? `${diffInMinutes} phút trước` : `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return isVi ? `${diffInHours} giờ trước` : `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return isVi ? `${diffInDays} ngày trước` : `${diffInDays}d ago`;
    }

    return date.toLocaleDateString(isVi ? "vi-VN" : "en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
