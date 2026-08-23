interface FolderIconProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function FolderIcon({
  size = "md",
  className = "",
}: FolderIconProps) {
  const dimensions = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-10 w-10 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
    xl: "h-14 w-14 rounded-2xl",
  };

  const svgSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-7 w-7",
  };

  return (
    <div
      className={`relative flex ${dimensions[size]} shrink-0 items-center justify-center bg-gradient-to-br from-[var(--color-primary-soft)] via-[var(--color-surface-muted)] to-[var(--color-surface)] shadow-2xs border border-color-mix(in srgb, var(--color-border) 80%, transparent) group-hover:border-[var(--color-primary)]/50 group-hover:shadow-sm transition-all duration-200 ease-out ${className}`}
    >
      <svg
        className={`${svgSizes[size]} text-[var(--color-primary)] transition-transform duration-200 ease-out group-hover:scale-105`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Back Plate & Tab */}
        <path
          d="M3 7.5C3 6.39543 3.89543 5.5 5 5.5H9.17157C9.70201 5.5 10.2107 5.71071 10.5858 6.08579L12.4142 7.91421C12.7893 8.28929 13.298 8.5 13.8284 8.5H19C20.1046 8.5 21 9.39543 21 10.5V17.5C21 18.6046 20.1046 19.5 19 19.5H5C3.89543 19.5 3 18.6046 3 17.5V7.5Z"
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Front Glossy Folder Flap */}
        <path
          d="M3 11C3 9.89543 3.89543 9 5 9H19C20.1046 9 21 9.89543 21 11V17.5C21 18.6046 20.1046 19.5 19 19.5H5C3.89543 19.5 3 18.6046 3 17.5V11Z"
          fill="currentColor"
          fillOpacity="0.85"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Subtle Specular Top Shine */}
        <path
          d="M6 10H18"
          stroke="white"
          strokeOpacity="0.45"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
