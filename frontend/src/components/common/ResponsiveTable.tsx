import type { ReactNode } from "react";

export interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}

export default function ResponsiveTable({
  children,
  className = "",
  minWidth = "min-w-[720px]",
}: ResponsiveTableProps) {
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs transition-colors duration-200 ${className}`}>
      <div className="w-full overflow-x-auto scrollbar-thin">
        <div className={`inline-block w-full align-middle ${minWidth}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
