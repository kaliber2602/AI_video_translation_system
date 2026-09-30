import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  HardDrive,
  MoreVertical,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import FolderIcon from "../common/FolderIcon";
import ElasticCard from "../common/ElasticCard";
import type { Project } from "../../types/project";

interface ProjectCardViewProps {
  projects: Project[];
  onProjectClick: (projectId: number) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onToggleFavorite?: (project: Project) => void;
  onRestoreProject?: (project: Project) => void;
  isTrashMode?: boolean;
}

interface ProjectCardItemProps {
  project: Project;
  index: number;
  onProjectClick: (projectId: number) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onToggleFavorite?: (project: Project) => void;
  onRestoreProject?: (project: Project) => void;
  isTrashMode?: boolean;
  formatDate: (dateStr: string) => string;
  getStaggerClass: (index: number) => string;
}

function ProjectCardItem({
  project,
  index,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onToggleFavorite,
  onRestoreProject,
  isTrashMode = false,
  formatDate,
  getStaggerClass,
}: ProjectCardItemProps) {
  const { t } = useTranslation(["workspace", "common"]);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const thumbnails = project.video_thumbnails || [];
  const currentVideo = thumbnails[currentVideoIndex] || thumbnails[0] || null;

  // Auto-rotation timer: 4500ms cycle, paused on hover
  useEffect(() => {
    if (thumbnails.length <= 1 || isHovered) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % thumbnails.length);
    }, 4500);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [thumbnails.length, isHovered]);

  return (
    <ElasticCard
      project={project}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isTrashMode) onProjectClick(project.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!isTrashMode) onProjectClick(project.id);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      elasticity={0.48}
      maxDisplacement={320}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-white/10 text-left shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 ease-out hover:shadow-[0_16px_40px_rgba(0,0,0,0.32)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] animate-fade-up w-full aspect-[0.78/1] cursor-pointer select-none ${
        isTrashMode ? "opacity-90 hover:border-red-400/50" : "hover:border-[var(--color-primary)]/60"
      } ${getStaggerClass(index)}`}
    >
      {/* ========================================================================= */}
      {/* LAYER 1: FULL-CARD BACKGROUND IMAGES WITH CROSSFADE TRANSITION            */}
      {/* ========================================================================= */}
      {thumbnails.length > 0 ? (
        thumbnails.map((item, idx) => {
          const url = item.thumbnail_url || (item.id ? `/api/videos/${item.id}/thumbnail` : null);
          const isActive = idx === currentVideoIndex;
          if (!url) return null;
          return (
            <img
              key={item.id ?? idx}
              src={url}
              alt={item.title || project.name}
              loading={idx === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 h-full w-full object-cover object-center will-change-[opacity,transform] transition-[opacity,transform] duration-800 ease-in-out motion-reduce:transition-none motion-reduce:scale-100 ${
                isActive
                  ? "opacity-100 scale-100 z-1"
                  : "opacity-0 scale-[1.015] pointer-events-none z-0"
              }`}
            />
          );
        })
      ) : (
        /* Atmospheric gradient background when project has no video thumbnails yet */
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-stone-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner transition-transform duration-500 group-hover:scale-110">
            <FolderIcon size="lg" className="opacity-40" />
          </div>
          <span className="mt-2 text-[11px] font-medium text-white/40 tracking-wide">
            Trống • Chưa có video
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LAYER 2: CONTINUOUS SUBTLE GRADIENT SCRIMS (NO HARSH BLOCKS OR GLOBAL TINT)*/}
      {/* ========================================================================= */}
      {/* Top Header Scrim: Soft translucent fade just enough for white text legibility */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 via-black/25 to-transparent z-5" />

      {/* Middle: 100% transparent so the video thumbnail's vivid colors and identity shine through */}

      {/* Bottom Scrim: Soft charcoal atmospheric fade for footer and info */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-5" />

      {/* ========================================================================= */}
      {/* SECTION 1: HEADER (LIGHTWEIGHT FLOATING TEXT & MINIMALIST CONTROLS)       */}
      {/* ========================================================================= */}
      <div className="relative z-10 p-4 pb-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-white tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
              {project.name}
            </h3>
          </div>

          {/* Right Action Icons: Star & Three-dot menu (subtle floating glass) */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {!isTrashMode && onToggleFavorite && (
              <button
                type="button"
                title={
                  project.is_favorite
                    ? t("workspace:favorite.removeFromFavorites")
                    : t("workspace:favorite.addToFavorites")
                }
                aria-label={
                  project.is_favorite
                    ? t("workspace:favorite.removeFromFavorites")
                    : t("workspace:favorite.addToFavorites")
                }
                onClick={() => onToggleFavorite(project)}
                className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition cursor-pointer shadow-md ${
                  project.is_favorite
                    ? "bg-amber-500/30 border border-amber-400/50 text-amber-300"
                    : "bg-white/10 hover:bg-white/25 text-white/80 hover:text-white border border-white/10"
                }`}
              >
                <Star size={14} className={project.is_favorite ? "fill-amber-400" : ""} />
              </button>
            )}

            {/* Three-dot dropdown menu */}
            <div className="relative">
              <button
                type="button"
                aria-label={t("common:more")}
                onClick={() =>
                  setActiveDropdownId(
                    activeDropdownId === project.id ? null : project.id
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 transition hover:bg-white/25 hover:text-white cursor-pointer shadow-md"
              >
                <MoreVertical size={15} />
              </button>

              {activeDropdownId === project.id && (
                <>
                  <div
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setActiveDropdownId(null)}
                  />
                  <div className="absolute right-0 top-10 z-40 w-44 overflow-hidden rounded-2xl border border-white/20 bg-neutral-900/95 backdrop-blur-xl p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.5)] animate-dropdown-reveal">
                    {isTrashMode ? (
                      <>
                        {onRestoreProject && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownId(null);
                              onRestoreProject(project);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                          >
                            <RotateCcw size={13} />
                            <span>{t("workspace:trash.restore", "Khôi phục")}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDropdownId(null);
                            onDeleteProject(project);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/20"
                        >
                          <Trash2 size={13} />
                          <span>{t("workspace:trash.permanentDelete", "Xóa vĩnh viễn")}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDropdownId(null);
                            onEditProject(project);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                        >
                          <Edit size={13} />
                          <span>{t("common:edit")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDropdownId(null);
                            onDeleteProject(project);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/20"
                        >
                          <Trash2 size={13} />
                          <span>{t("workspace:trash.moveToTrashBtn", "Chuyển vào thùng rác")}</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent video caption - pure floating typography */}
        <p className="text-xs text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] truncate max-w-[90%] font-medium">
          {project.recent_project ? (
            <span>Gần đây: <strong className="text-white font-semibold">{project.recent_project}</strong></span>
          ) : (
            <span className="italic text-white/50">Chưa có video gần đây</span>
          )}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: CENTRAL AREA & FLOATING MEDIA METADATA (NO VISIBLE CONTROLS)  */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex flex-col justify-end flex-1 px-4 py-2">
        {/* Bottom of Central Area: Pure floating video title & duration with subtle fade */}
        <div className="flex flex-col gap-1.5 mt-auto">
          {currentVideo && (
            <div
              key={currentVideo.id ?? currentVideoIndex}
              className="flex items-center justify-between gap-2.5 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] animate-fade-in transition-opacity duration-300"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shrink-0 shadow-xs" />
                <span className="truncate text-xs font-semibold tracking-tight text-white/95">
                  {currentVideo.title}
                </span>
              </div>
              {currentVideo.duration && (
                <span className="shrink-0 text-[10.5px] font-medium font-mono text-white/80">
                  {currentVideo.duration}
                </span>
              )}
            </div>
          )}

          {/* Matched Semantic Snippet if available */}
          {project.matched_snippets && project.matched_snippets.length > 0 && (
            <div className="rounded-xl border border-white/15 bg-black/40 backdrop-blur-md p-1.5 text-left shadow-sm">
              <div className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-300 mb-0.5">
                <Sparkles size={10} className="shrink-0" />
                <span>Khớp thoại ({project.matched_snippets[0].timestamp_formatted}):</span>
              </div>
              <p className="text-[9.5px] italic text-white/90 line-clamp-1">
                "{project.matched_snippets[0].text}"
              </p>
            </div>
          )}

          {/* Project Tags (subtle translucent frosted tags directly floating over image) */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 backdrop-blur-md px-1.5 py-0.5 text-[9.5px] font-medium text-white/90 shadow-2xs"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: tag.color || "var(--color-primary)",
                    }}
                  />
                  <span className="truncate max-w-[70px]">{tag.name}</span>
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="inline-flex items-center rounded-md border border-white/10 bg-white/10 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-medium text-white/70">
                  +{project.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Trash mode restore / permanent delete buttons */}
          {isTrashMode && (
            <div className="mt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {onRestoreProject && (
                <button
                  type="button"
                  onClick={() => onRestoreProject(project)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 backdrop-blur-md py-1.5 text-xs font-bold text-emerald-300 shadow-md hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>{t("workspace:trash.restore", "Khôi phục")}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onDeleteProject(project)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/20 backdrop-blur-md py-1.5 px-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500 hover:text-white transition cursor-pointer shadow-md"
                title={t("workspace:trash.permanentDelete", "Xóa vĩnh viễn")}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: PROJECT METADATA FOOTER (BORDERLESS FLOATING ROW AT BOTTOM)     */}
      {/* ========================================================================= */}
      <div className="relative z-10 px-4 pb-4 pt-0.5 flex items-center justify-between text-xs text-white/85">
        <div className="flex items-center gap-2.5">
          {/* Video Count */}
          <span className="inline-flex items-center gap-1.5 font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            <Video size={13} className="text-[var(--color-primary)]" />
            <span>{project.video_count || 0}</span>
          </span>

          {/* Storage Size (All Files) */}
          <span className="inline-flex items-center gap-1.5 font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            <HardDrive size={13} className="opacity-75 text-white/80" />
            <span>{project.size || "0 B"}</span>
          </span>
        </div>

        {/* Last Modified Date */}
        <div className="flex items-center gap-1.5 text-[11px] text-white/75 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          <Clock size={12} className="opacity-70" />
          <span className="truncate">
            {isTrashMode && project.deleted_at
              ? t("workspace:trash.deletedAt", { date: formatDate(project.deleted_at) })
              : formatDate(project.updated_at)}
          </span>
        </div>
      </div>
    </ElasticCard>
  );
}

export default function ProjectCardView({
  projects,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onToggleFavorite,
  onRestoreProject,
  isTrashMode = false,
}: ProjectCardViewProps) {
  const { i18n } = useTranslation(["workspace", "common"]);
  const [currentPage, setCurrentPage] = useState(0);
  const [columnCount, setColumnCount] = useState(4);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Dynamic column calculation with STRICT COLUMN CAP (max 4 on desktop, max 5 on ultra-wide)
  // Cards must wrap into multiple rows instead of filling a single infinite row.
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;

    const calculateColumns = (availableWidth: number) => {
      // Responsive column targets:
      // Mobile (< 600px): 1 column
      // Small tablet (600px - 767px): 2 columns
      // Tablet (768px - 1023px): 2-3 columns
      // Desktop (1024px - 1799px): 4 columns MAX
      // Very wide desktop (>= 1800px): 5 columns MAX
      if (availableWidth < 580) {
        return 1;
      }
      if (availableWidth < 880) {
        return 2;
      }
      if (availableWidth < 1200) {
        return 3;
      }
      if (availableWidth < 1800) {
        return 4; // Capped at 4 columns on desktop!
      }
      return 5; // Capped at 5 columns maximum on very wide screens!
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          const newCols = calculateColumns(width);
          setColumnCount(newCols);
        }
      }
    });

    observer.observe(el);

    const initialWidth = el.getBoundingClientRect().width;
    if (initialWidth > 0) {
      setColumnCount(calculateColumns(initialWidth));
    }

    return () => observer.disconnect();
  }, []);

  // Maximum items displayed per gallery page: 2 rows of the capped column count
  // (e.g. 4 cols * 2 rows = 8 cards/page; 3 cols * 2 rows = 6 cards/page)
  // This keeps the gallery compact vertically (at most 2 rows), with height: auto strictly following the actual rows!
  const rowsPerPage = 2;
  const itemsPerPage = Math.max(1, columnCount * rowsPerPage);

  const totalPages = Math.ceil(projects.length / itemsPerPage);

  // Ensure valid page bounds when totalPages changes
  useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getStaggerClass = (index: number) => {
    const staggerIndex = (index % 6) + 1;
    return `stagger-${staggerIndex}`;
  };

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Keyboard Navigation: ArrowLeft / ArrowRight
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  // Touch Swipe Gesture Support
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 45; // Minimum px distance for swipe

    if (diff > threshold && canGoNext) {
      handleNext();
    } else if (diff < -threshold && canGoPrev) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const showControls = totalPages > 1;

  // Sliced projects for the current gallery page
  const currentProjects = projects.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div
      ref={galleryRef}
      className="relative w-full h-auto py-2 outline-none select-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Project gallery"
    >
      {/* 
        Responsive Wrapped Card Gallery Stage
        - Strictly capped columns: max 4 on desktop, max 5 on ultra-wide
        - Cards naturally wrap to next rows (e.g. 7 cards => 4 cards in Row 1, 3 cards in Row 2)
        - height: auto strictly follows content rows, with zero empty white space underneath
        - Navigation arrows positioned comfortably in stage gutters
      */}
      <div className="relative w-full h-auto rounded-3xl bg-[var(--color-surface)]/25 border border-[var(--color-border)]/35 p-4 sm:px-12 sm:py-5 lg:px-14 lg:py-6 shadow-xs">
        {/* Navigation Arrow: Left */}
        {showControls && (
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            aria-label="Previous project page"
            className={`absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/20 bg-neutral-900/85 text-white backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200 cursor-pointer motion-reduce:transition-none ${
              canGoPrev
                ? "hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:scale-110 active:scale-95"
                : "opacity-25 cursor-not-allowed pointer-events-none"
            }`}
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Wrapped Grid Content Area: height strictly follows the number of rows */}
        <div
          className="w-full h-auto grid gap-x-4 sm:gap-x-5 gap-y-5 sm:gap-y-6 items-stretch transition-opacity duration-300"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          }}
        >
          {currentProjects.map((project, index) => (
            <div key={project.id} className="w-full flex justify-center">
              <div className="w-full max-w-[360px]">
                <ProjectCardItem
                  project={project}
                  index={index}
                  onProjectClick={onProjectClick}
                  onEditProject={onEditProject}
                  onDeleteProject={onDeleteProject}
                  onToggleFavorite={onToggleFavorite}
                  onRestoreProject={onRestoreProject}
                  isTrashMode={isTrashMode}
                  formatDate={formatDate}
                  getStaggerClass={getStaggerClass}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrow: Right */}
        {showControls && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Next project page"
            className={`absolute right-2 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/20 bg-neutral-900/85 text-white backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200 cursor-pointer motion-reduce:transition-none ${
              canGoNext
                ? "hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:scale-110 active:scale-95"
                : "opacity-25 cursor-not-allowed pointer-events-none"
            }`}
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
