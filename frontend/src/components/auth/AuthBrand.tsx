export default function AuthBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm">
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          fill="none"
        >
          <circle cx="7" cy="16" r="3" fill="currentColor" />
          <circle cx="24" cy="8" r="3" fill="currentColor" />
          <circle cx="24" cy="24" r="3" fill="currentColor" />
          <path d="M9.5 15L21.5 9" stroke="currentColor" strokeWidth="2" />
          <path d="M9.5 17L21.5 23" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      <div>
        <h1 className="text-[22px] font-black tracking-tight text-[var(--color-text-primary)]">
          VIDNOVA
        </h1>

        <p className="text-[9px] font-bold tracking-[4px] text-[var(--color-primary)]">
          SINCE 2026
        </p>
      </div>
    </div>
  );
}