import Toggle from "./Toggle";

export interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export default function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-5 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>

      <Toggle
        checked={checked}
        onChange={onChange}
      />
    </div>
  );
}
