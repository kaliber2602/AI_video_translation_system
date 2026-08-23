export interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export default function Toggle({
  checked,
  onChange,
}: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked
          ? "bg-[var(--color-primary)]"
          : "bg-[var(--color-border)]"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--color-surface)] shadow-sm transition ${
          checked
            ? "left-6"
            : "left-1"
        }`}
      />
    </button>
  );
}
