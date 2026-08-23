import type React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectBoxProps {
  value: string;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function SelectBox({
  value,
  onChange,
  children,
  disabled = false,
}: SelectBoxProps) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        className="h-11 w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 pr-10 text-xs font-medium text-[var(--color-text-primary)] outline-none transition-all duration-200 ease-out focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] transition-transform duration-200 ease-out"
      />
    </div>
  );
}
