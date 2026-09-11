import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProjectPaginationProps {
  totalItems?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export default function ProjectPagination({
  totalItems = 0,
  currentPage = 1,
  pageSize = 12,
  onPageChange,
  onPageSizeChange,
}: ProjectPaginationProps) {
  const { t } = useTranslation(["common"]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems > 0 ? (validPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(totalItems, validPage * pageSize);

  // Generate page numbers with ellipsis for cleaner UX
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (validPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (validPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", validPage - 1, validPage, validPage + 1, "...", totalPages);
    }
    return pages;
  };

  return (
    <div className="mt-6 flex flex-col gap-4 px-1 text-sm text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between border-t border-[var(--color-border)]/50 pt-4">
      <span>
        {t("common:showingItems", {
          start: startItem,
          end: endItem,
          total: totalItems,
          defaultValue: `Hiển thị ${startItem}–${endItem} trên tổng số ${totalItems} dự án`,
        })}
      </span>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          disabled={validPage <= 1}
          onClick={() => onPageChange?.(validPage - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          aria-label={t("common:previous", "Trang trước")}
        >
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers().map((p, idx) =>
          typeof p === "string" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-xs font-mono text-[var(--color-text-muted)]">
              ...
            </span>
          ) : (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange?.(p)}
              className={`flex h-9 min-w-[36px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition cursor-pointer ${
                validPage === p
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              }`}
              aria-label={`Trang ${p}`}
              aria-current={validPage === p ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={validPage >= totalPages}
          onClick={() => onPageChange?.(validPage + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          aria-label={t("common:next", "Trang sau")}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <span>{t("common:itemsPerPage", "Số lượng mỗi trang:")}</span>

        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] outline-none transition hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] cursor-pointer"
          aria-label={t("common:itemsPerPage", "Số lượng mỗi trang")}
        >
          <option value={6}>6</option>
          <option value={12}>12</option>
          <option value={24}>24</option>
          <option value={48}>48</option>
        </select>
      </div>
    </div>
  );
}