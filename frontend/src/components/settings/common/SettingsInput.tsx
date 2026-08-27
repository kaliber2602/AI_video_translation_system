import type React from "react";
import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "../../../lib/toast";

export interface SettingsInputProps {
  label?: string;
  description?: string;
  type?: "text" | "password" | "email" | "number";
  value: string | number;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  prefixIcon?: React.ReactNode;
  suffix?: React.ReactNode;
  allowCopy?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

export default function SettingsInput({
  label,
  description,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  prefixIcon,
  suffix,
  allowCopy = false,
  error,
  helperText,
  className = "",
}: SettingsInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const isPasswordType = type === "password";
  const effectiveType = isPasswordType && showPassword ? "text" : type;

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(String(value));
    setHasCopied(true);
    toast.success("Copied to clipboard", "The value has been copied.");
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}

      {description && (
        <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
      )}

      <div className="relative flex items-center">
        {prefixIcon && (
          <div className="pointer-events-none absolute left-3.5 text-[var(--color-text-muted)]">
            {prefixIcon}
          </div>
        )}

        <input
          type={effectiveType}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`h-10 w-full rounded-xl border bg-[var(--color-input-background)] px-3.5 text-xs font-medium text-[var(--color-text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-background)] disabled:opacity-75 ${
            prefixIcon ? "pl-10" : ""
          } ${isPasswordType || allowCopy || suffix ? "pr-10" : ""} ${
            error
              ? "border-rose-500 focus:border-rose-500"
              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
          }`}
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}

          {allowCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus:outline-none transition-colors"
              title="Copy"
              tabIndex={-1}
            >
              {hasCopied ? (
                <Check size={15} className="text-emerald-500" />
              ) : (
                <Copy size={15} />
              )}
            </button>
          )}

          {suffix}
        </div>
      </div>

      {error && <p className="text-[11px] font-medium text-rose-500">{error}</p>}
      {!error && helperText && (
        <p className="text-[11px] text-[var(--color-text-muted)]">{helperText}</p>
      )}
    </div>
  );
}
