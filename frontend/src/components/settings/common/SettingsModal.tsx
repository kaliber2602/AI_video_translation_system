import type React from "react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export default function SettingsModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = "md",
}: SettingsModalProps) {
  const { t } = useTranslation(["common"]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Box */}
      <div
        className={`relative z-10 w-full ${maxWidthClasses[maxWidth]} overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-scale-in`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--color-border)]/60 px-6 py-5">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {title}
              </h3>
              {subtitle && (
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label={t("common:close", "Close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
