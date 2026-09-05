import type { ReactNode } from "react";
import { FolderX } from "lucide-react";
import Button from "./Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  action,
  children,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-6 py-12 text-center transition-colors duration-200 ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs">
        {icon || <FolderX size={26} />}
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--color-text-primary)]">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          {description}
        </p>
      )}

      {action ? (
        <div className="mt-5">{action}</div>
      ) : (
        actionLabel && onAction && (
          <div className="mt-5">
            <Button variant="primary" size="md" onClick={onAction} leftIcon={actionIcon}>
              {actionLabel}
            </Button>
          </div>
        )
      )}

      {children}
    </div>
  );
}
