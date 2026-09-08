import { useState, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import Dialog from "./Dialog";
import Button from "./Button";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isLoading = false,
}: ConfirmationDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("[ConfirmationDialog] Action error:", err);
    } finally {
      setInternalLoading(false);
    }
  };

  const busy = isLoading || internalLoading;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!busy) onClose();
      }}
      maxWidth="sm"
      showCloseButton={!busy}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isDestructive
              ? "bg-red-500/10 text-red-500"
              : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
          }`}
        >
          {isDestructive ? <AlertTriangle size={22} /> : <Info size={22} />}
        </div>

        <div className="flex-1">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] leading-tight">
            {title}
          </h3>
          <div className="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {message}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
        <Button
          variant="secondary"
          size="md"
          disabled={busy}
          onClick={onClose}
        >
          {cancelLabel}
        </Button>

        <Button
          variant={isDestructive ? "danger" : "primary"}
          size="md"
          isLoading={busy}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
