export interface SettingsSliderProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}

export default function SettingsSlider({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  formatValue,
  disabled = false,
  className = "",
}: SettingsSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;

  return (
    <div className={`space-y-2 py-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] sm:text-sm">
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {description}
            </p>
          )}
        </div>
        <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)] shadow-sm">
          {displayValue}
        </span>
      </div>

      <div className="relative flex items-center py-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percentage}%, var(--color-border) ${percentage}%, var(--color-border) 100%)`,
          }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
        <span>{formatValue ? formatValue(min) : `${min}${unit}`}</span>
        <span>{formatValue ? formatValue(max) : `${max}${unit}`}</span>
      </div>
    </div>
  );
}
