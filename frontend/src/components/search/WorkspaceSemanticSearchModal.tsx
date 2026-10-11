import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Play,
  Folder,
  FileVideo,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  Command,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { videoService } from "../../services/video.service";

interface SemanticMatchItem {
  video_id: number;
  video_title?: string;
  project_id?: number;
  project_name?: string;
  timestamp_formatted?: string;
  start_time?: number;
  end_time?: number;
  text?: string;
  translated_text?: string;
  relevance_score?: number;
  rerank_score?: number;
}

interface WorkspaceSemanticSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function WorkspaceSemanticSearchModal({
  isOpen,
  onClose,
  initialQuery = "",
}: WorkspaceSemanticSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SemanticMatchItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setQuery(initialQuery);
        handleSearch(initialQuery);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setHasSearched(false);
      setError(null);
    }
  }, [isOpen, initialQuery]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);
      const res = await videoService.searchWorkspaceSemantic(trimmed, 30);
      if (res && Array.isArray(res.results)) {
        setResults(res.results);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      console.error("[SemanticSearchModal] Search error:", err);
      setError("Không thể thực hiện tìm kiếm ngữ nghĩa. Vui lòng thử lại.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Group results by Project -> Video, sorted descending by relevance
  const groupedResults = useMemo(() => {
    // Sort input results descending by relevance first
    const sortedResults = [...results].sort(
      (a, b) => (b.relevance_score ?? b.rerank_score ?? 0) - (a.relevance_score ?? a.rerank_score ?? 0)
    );

    const projectMap: Record<
      string,
      {
        projectId: number | null;
        projectName: string;
        maxScore: number;
        videos: Record<
          number,
          {
            videoId: number;
            videoTitle: string;
            maxScore: number;
            segments: SemanticMatchItem[];
          }
        >;
      }
    > = {};

    sortedResults.forEach((item) => {
      const pKey = item.project_name || (item.project_id ? `Dự án #${item.project_id}` : "Dự án khác");
      const vKey = item.video_id;
      const score = item.relevance_score ?? item.rerank_score ?? 0;

      if (!projectMap[pKey]) {
        projectMap[pKey] = {
          projectId: item.project_id || null,
          projectName: pKey,
          maxScore: score,
          videos: {},
        };
      } else if (score > projectMap[pKey].maxScore) {
        projectMap[pKey].maxScore = score;
      }

      if (!projectMap[pKey].videos[vKey]) {
        projectMap[pKey].videos[vKey] = {
          videoId: item.video_id,
          videoTitle: item.video_title || `Video #${item.video_id}`,
          maxScore: score,
          segments: [],
        };
      } else if (score > projectMap[pKey].videos[vKey].maxScore) {
        projectMap[pKey].videos[vKey].maxScore = score;
      }

      projectMap[pKey].videos[vKey].segments.push(item);
    });

    // Return projects ordered descending by their top-scoring result
    return Object.values(projectMap)
      .sort((a, b) => b.maxScore - a.maxScore)
      .map((proj) => ({
        ...proj,
        // Also order videos inside project descending by top score
        sortedVideos: Object.values(proj.videos).sort((va, vb) => vb.maxScore - va.maxScore),
      }));
  }, [results]);

  // Quick Citation Chips (Unique videos with timestamps)
  const citationChips = useMemo(() => {
    return results.slice(0, 5);
  }, [results]);

  const handleRouteToVideo = (item: SemanticMatchItem) => {
    onClose();
    const pid = item.project_id || 1;
    const vid = item.video_id;
    const sec = item.start_time ? Math.floor(item.start_time) : 0;
    navigate(`/workspace/project/${pid}/video/${vid}?step=review-export&t=${sec}`);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-10 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden mt-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-muted)]/30"
        >
          <Search size={18} className="text-[var(--color-primary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch(query);
              }
            }}
            placeholder="Tìm kiếm theo ngữ nghĩa..."
            className="flex-1 bg-transparent text-sm sm:text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
          />

          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-[var(--color-primary)] shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setHasSearched(false);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] transition"
            >
              <X size={14} />
            </button>
          ) : null}

          <div className="hidden sm:flex items-center gap-1 rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)] border border-[var(--color-border)]/60">
            <Command size={10} />
            <span>ESC</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] transition"
          >
            <X size={18} />
          </button>
        </form>

        {/* Modal Body / Results Display - Only rendered when user has searched or during search */}
        {hasSearched && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {error ? (
              <div className="py-8 text-center">
                <AlertCircle size={28} className="mx-auto text-[var(--color-danger)] mb-2" />
                <p className="text-xs text-[var(--color-danger)] font-medium">{error}</p>
              </div>
            ) : results.length === 0 && !isLoading ? (
              <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                Không tìm thấy phân đoạn video nào khớp với nội dung <span className="font-semibold text-[var(--color-text-primary)]">"{query}"</span>.
              </div>
            ) : (
            <>
              {/* Grouped Match Results (Exact format from reference screenshot) */}
              <div className="space-y-6">
                {groupedResults.map((pGroup, pIdx) => (
                  <div key={pIdx} className="space-y-3">
                    {/* Project Header */}
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider border-b border-[var(--color-border)]/60 pb-1.5">
                      <Folder size={14} className="text-[var(--color-primary)]" />
                      <span>{pGroup.projectName.startsWith("Dự án") ? pGroup.projectName : `Dự án ${pGroup.projectName}`}</span>
                    </div>

                    {/* Videos in Project */}
                    <div className="space-y-3 pl-2 sm:pl-3">
                      {pGroup.sortedVideos.map((vGroup, vIdx) => (
                        <div key={vIdx} className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                            <FileVideo size={13} className="text-[var(--color-primary)]" />
                            <span>Video {vGroup.videoTitle}...:</span>
                          </div>

                          {/* Dialogue Segments inside Video */}
                          <div className="space-y-2">
                            {vGroup.segments.map((seg, sIdx) => (
                              <div
                                key={sIdx}
                                className="group/item flex items-start justify-between gap-3 p-2.5 rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/20 hover:bg-[var(--color-surface-muted)]/60 hover:border-[var(--color-primary)]/40 transition-colors"
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Timestamp button */}
                                    <button
                                      type="button"
                                      onClick={() => handleRouteToVideo(seg)}
                                      className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary-soft)]/40 px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition cursor-pointer"
                                      title="Nhảy đến mốc thời gian này"
                                    >
                                      <Clock size={11} />
                                      <span>[{seg.timestamp_formatted || "00:00"}]</span>
                                    </button>

                                    {/* Original dialog text */}
                                    <span className="text-xs font-medium text-[var(--color-text-primary)]">
                                      "{seg.text}"
                                    </span>
                                  </div>

                                  {/* Translated text if available */}
                                  {seg.translated_text && seg.translated_text !== seg.text && (
                                    <p className="mt-1 text-xs text-[var(--color-text-muted)] italic leading-relaxed">
                                      (Dịch: "{seg.translated_text}")
                                    </p>
                                  )}
                                </div>

                                {/* Route button on the same row */}
                                <button
                                  type="button"
                                  onClick={() => handleRouteToVideo(seg)}
                                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition shadow-2xs cursor-pointer group-hover/item:border-[var(--color-primary)]"
                                  title="Mở video tại vị trí này"
                                >
                                  <Play size={11} className="fill-current" />
                                  <span>Xem Video</span>
                                  <ExternalLink size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Best Match Summary Note (Mirroring screenshot bottom note) */}
              {results.length > 0 && (
                <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/20 p-3 text-xs text-[var(--color-text-primary)] leading-relaxed">
                  <p>
                    Nội dung phù hợp nhất thuộc{" "}
                    <strong>{results[0].project_name || `Dự án #${results[0].project_id}`}</strong> (video{" "}
                    <strong>{results[0].video_title || `Video #${results[0].video_id}`}</strong>) tại mốc{" "}
                    <button
                      type="button"
                      onClick={() => handleRouteToVideo(results[0])}
                      className="font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-0.5"
                    >
                      [{results[0].timestamp_formatted || "00:00"}]
                    </button>
                    . Bạn có thể nhấn vào mốc thời gian hoặc nút "Xem Video" để mở trình xem chi tiết.
                  </p>
                </div>
              )}

              {/* Related Citations Chips (Bottom Section from screenshot) */}
              {citationChips.length > 0 && (
                <div className="pt-2 border-t border-[var(--color-border)]/60">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                    Đoạn trích dẫn liên quan:
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {citationChips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => handleRouteToVideo(chip)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary)]/40 px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition cursor-pointer"
                      >
                        <Play size={11} className="text-[var(--color-primary)] fill-current" />
                        <span className="truncate max-w-[140px] font-semibold text-[var(--color-text-primary)]">
                          {chip.video_title || `Video #${chip.video_id}`}
                        </span>
                        <span className="text-[11px] font-bold text-[var(--color-primary)]">
                          {chip.timestamp_formatted || "00:00"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  </div>
);
}
