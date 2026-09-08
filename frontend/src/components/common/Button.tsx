import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:scale-[0.985] shadow-xs hover:shadow-sm",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)]/50 active:scale-[0.985] shadow-xs",
  ghost:
    "bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 active:scale-[0.985]",
  danger:
    "bg-[var(--color-danger)] text-white hover:opacity-90 active:scale-[0.985] shadow-xs",
  "danger-ghost":
    "border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 active:scale-[0.985]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg font-semibold",
  md: "h-10 px-4 text-sm gap-2 rounded-xl font-semibold",
  lg: "h-12 px-5 text-base gap-2.5 rounded-xl font-bold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      icon,
      rightIcon,
      children,
      className = "",
      disabled,
      type = "button",
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const leadingIcon = icon || leftIcon;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center transition-all duration-180 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <Loader2 className="animate-spin shrink-0" size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />
        ) : (
          leadingIcon && <span className="shrink-0">{leadingIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
