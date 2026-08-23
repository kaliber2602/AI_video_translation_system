import type React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectBoxProps {
  value: string;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
}

export default function SelectBox({
  value,
  onChange,
  children,
}: SelectBoxProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        className="h-11 w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 pr-10 text-sm text-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
      >
        {children}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
      />
    </div>
  );
}
