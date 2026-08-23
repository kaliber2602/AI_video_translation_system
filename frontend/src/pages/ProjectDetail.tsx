import { ArrowLeft, MoreHorizontal, Plus, Search, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "../components/project/VideoCard";

const videos = [
  {
    id: 1,
    title: "NLP Introduction",
    filename: "nlp-introduction.mp4",
    duration: "12:15",
    size: "820 MB",
    updated: "May 25, 2024",
    status: "completed" as const,
  },
  {
    id: 2,
    title: "What is Natural Language Processing?",
    filename: "what-is-nlp.mp4",
    duration: "18:42",
    size: "1.2 GB",
    updated: "May 23, 2024",
    status: "editing" as const,
  },
  {
    id: 3,
    title: "NLP Tokenization Explained",
    filename: "tokenization.mp4",
    duration: "09:30",
    size: "650 MB",
    updated: "May 20, 2024",
    status: "processing" as const,
  },
  {
    id: 4,
    title: "NLP Applications",
    filename: "nlp-applications.mp4",
    duration: "14:20",
    size: "940 MB",
    updated: "May 18, 2024",
    status: "draft" as const,
  },
];

export default function ProjectDetail() {
  const { t } = useTranslation(["project", "navigation", "common"]);
  const navigate = useNavigate();
  const { projectId } = useParams();

  const handleBackToProjects = () => {
    navigate("/workspace");
  };

  const handleOpenVideo = (videoId: number) => {
    navigate(`/workspace/project/${projectId}/video/${videoId}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200">
      <main className="mx-auto w-full max-w-[1600px] px-8 py-8">
        {/* Back to Workspace */}
        <button
          type="button"
          onClick={handleBackToProjects}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]"
        >
          <ArrowLeft size={17} />
          {t("navigation:backToProjects")}
        </button>

        {/* Project Header */}
        <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3D1] text-[#E5A52C]">
                <span className="text-2xl">📁</span>
              </div>

              <div>
                <h1 className="text-[28px] font-bold tracking-[-0.6px] text-[var(--color-text-primary)]">
                  NLP Tutorials
                </h1>

                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  4 videos · 3.6 GB · Updated May 25, 2024
                </p>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
              A collection of videos about Natural Language Processing,
              including translated content, subtitles, dubbing, and generated
              documents.
            </p>
          </div>

          {/* Project Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <MoreHorizontal size={18} />
              {t("common:more")}
            </button>

            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
            >
              <Upload size={18} />
              {t("project:uploadVideo")}
            </button>
          </div>
        </section>

        {/* Search and Folder Toolbar */}
        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)] sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />

            <input
              type="text"
              placeholder={t("project:searchVideosPlaceholder")}
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-background)] pl-11 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            />
          </div>

          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-5 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
          >
            <Plus size={17} />
            {t("project:newFolder")}
          </button>
        </section>

        {/* Video List */}
        <section className="grid gap-5 xl:grid-cols-2">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onOpen={() => handleOpenVideo(video.id)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}