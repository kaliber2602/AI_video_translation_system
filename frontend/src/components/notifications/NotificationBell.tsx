import { useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../app/providers/NotificationContext";
import NotificationDropdown from "./NotificationDropdown";

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const { t } = useTranslation(["notifications", "common"]);
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} ${t("notifications:unreadCountLabel", "unread notifications")}`
            : t("notifications:title", "Notifications")
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs transition hover:bg-[var(--color-surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
      >
        <Bell
          size={19}
          className={`transition-colors ${
            isOpen
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-text-secondary)]"
          }`}
        />

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-extrabold text-white shadow-xs animate-in zoom-in duration-200 ring-2 ring-[var(--color-surface)]"
            aria-hidden="true"
          >
            {displayCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
