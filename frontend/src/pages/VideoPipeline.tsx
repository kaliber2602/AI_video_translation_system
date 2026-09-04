import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Save,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import UploadStep from "../components/pipeline/UploadStep";
import TranscriptStep from "../components/pipeline/TranscriptStep";
import TranslationStep from "../components/pipeline/TranslationStep";
import SubtitleStep from "../components/pipeline/SubtitleStep";
import DubbingStep from "../components/pipeline/DubbingStep";
import ReviewExportStep from "../components/pipeline/ReviewExportStep";

import { videoService } from "../services/video.service";

// Import Pipeline context
import { usePipeline } from "../hooks/usePipeline";
import { PipelineProvider } from "../contexts/PipelineContext";

function renderStep(step: string) {
  switch (step) {
    case "upload":
      return <UploadStep />;
    case "transcript":
      return <TranscriptStep />;
    case "translation":
      return <TranslationStep />;
    case "subtitle":
      return <SubtitleStep />;
    case "dubbing":
      return <DubbingStep />;
    case "review-export":
      return <ReviewExportStep />;
    default:
      return <UploadStep />;
  }
}

// Inner component that uses the pipeline context
function VideoPipelineContent() {
  const { t } = useTranslation(["pipeline", "common"]);
  const navigate = useNavigate();
  const { projectId, videoId } = useParams();
  const location = useLocation();
  const { state, dispatch } = usePipeline();
  
  const [activeStep, setActiveStep] = useState("upload");
  const [isSaved, setIsSaved] = useState(true);
  const [projectName, setProjectName] = useState<string>("");
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Initialize project and video data from URL/state
  useEffect(() => {
    console.log("🔍 VideoPipeline mounted");
    console.log("🔍 URL params - projectId:", projectId, "videoId:", videoId);
    console.log("🔍 Location state:", location.state);

    // Get projectId from URL params or location state
    const projectIdFromState = location.state?.projectId;
    const projectIdFromUrl = projectId ? parseInt(projectId) : undefined;
    const projectNameFromState = location.state?.projectName || location.state?.project?.name;
    
    // Use projectId from state first, then from URL
    const finalProjectId = projectIdFromState || projectIdFromUrl;
    
    if (finalProjectId) {
      console.log("📁 Setting project ID:", finalProjectId);
      setProjectName(projectNameFromState || `Project ${finalProjectId}`);
      dispatch({
        type: "SET_PROJECT",
        payload: finalProjectId,
      });
    } else {
      console.warn("⚠️ No projectId found in URL or state");
    }

    // If videoId is not "new", load existing video data
    if (videoId && videoId !== "new") {
      const vidNum = parseInt(videoId);
      if (!isNaN(vidNum) && (!state.video || state.video.videoId !== vidNum)) {
        console.log("📹 Loading existing video:", vidNum);
        setIsLoadingVideo(true);
        setVideoError(null);

        videoService.getVideo(vidNum)
          .then((videoData: any) => {
            console.log("📹 Loaded video data:", videoData);
            dispatch({
              type: "SET_VIDEO",
              payload: {
                videoId: videoData.id,
                filename: videoData.original_filename || videoData.title,
                fileSize: videoData.file_size || 0,
                status: videoData.status,
                duration: videoData.duration,
                outputPath: videoData.output_path,
                dubbedAudioPath: videoData.dubbed_audio_path,
                subtitlePath: videoData.subtitle_path,
                transcriptPath: videoData.transcript_path,
                extractedVocalPath: videoData.extracted_vocal_path,
                projectId: videoData.project_id,
              },
            });

            if (videoData.target_language) {
              dispatch({
                type: "SET_TARGET_LANGUAGE",
                payload: videoData.target_language,
              });
            }

            // Route to appropriate step based on available assets
            let targetStep = 2; // Default to transcript if uploaded
            if (videoData.output_path || videoData.status === "completed") {
              targetStep = 6;
            } else if (videoData.dubbed_audio_path) {
              targetStep = 5;
            } else if (videoData.subtitle_path) {
              targetStep = 4;
            } else if (videoData.transcript_path) {
              targetStep = 3;
            } else if (videoData.extracted_vocal_path) {
              targetStep = 2;
            }

            dispatch({ type: "SET_STEP", payload: targetStep });
          })
          .catch((err: any) => {
            console.error("❌ Failed to load video details:", err);
            setVideoError(err.message || "Failed to load video");
          })
          .finally(() => {
            setIsLoadingVideo(false);
          });
      }
    }

    // Set active step based on current step from context or URL
    if (state.step) {
      const stepMap: { [key: number]: string } = {
        1: "upload",
        2: "transcript",
        3: "translation",
        4: "subtitle",
        5: "dubbing",
        6: "review-export",
      };
      setActiveStep(stepMap[state.step] || "upload");
    }
  }, [projectId, videoId, location.state, dispatch, state.step]);

  const pipelineSteps = [
    {
      id: "upload",
      number: "01",
      title: t("pipeline:steps.upload.title"),
      description: t("pipeline:steps.upload.description"),
    },
    {
      id: "transcript",
      number: "02",
      title: t("pipeline:steps.transcript.title"),
      description: t("pipeline:steps.transcript.description"),
    },
    {
      id: "translation",
      number: "03",
      title: t("pipeline:steps.translation.title"),
      description: t("pipeline:steps.translation.description"),
    },
    {
      id: "subtitle",
      number: "04",
      title: t("pipeline:steps.subtitle.title"),
      description: t("pipeline:steps.subtitle.description"),
    },
    {
      id: "dubbing",
      number: "05",
      title: t("pipeline:steps.dubbing.title"),
      description: t("pipeline:steps.dubbing.description"),
    },
    {
      id: "review-export",
      number: "06",
      title: t("pipeline:steps.reviewExport.title"),
      description: t("pipeline:steps.reviewExport.description"),
    },
  ];

  const activeStepIndex = pipelineSteps.findIndex(
    (step) => step.id === activeStep,
  );

  const progress = Math.round(
    ((activeStepIndex + 1) / pipelineSteps.length) * 100,
  );

  const handleStepChange = (stepId: string) => {
    setActiveStep(stepId);
    setIsSaved(false);
    
    // Update the context step
    const stepMap: { [key: string]: number } = {
      "upload": 1,
      "transcript": 2,
      "translation": 3,
      "subtitle": 4,
      "dubbing": 5,
      "review-export": 6,
    };
    dispatch({ type: "SET_STEP", payload: stepMap[stepId] || 1 });
  };

  const handleSave = () => {
    setIsSaved(true);
    // You could save the current state here
    console.log("💾 Saving pipeline state...");
  };

  const handleBackToProjects = () => {
    // Navigate back to the project detail page
    if (projectId) {
      navigate(`/workspace/project/${projectId}`);
    } else {
      navigate("/workspace");
    }
  };

  // Get the display name for the header
  const videoDisplayName = state.video?.filename || location.state?.videoName || "New Video";
  const projectDisplayName = projectName || location.state?.projectName || `Project ${projectId || ''}`;

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200 page-enter">
      <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-[var(--color-border)] liquid-glass px-4 py-4 backdrop-blur-xl transition-colors duration-200 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={handleBackToProjects}
            aria-label={t("common:back")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-all duration-200 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-[var(--color-text-primary)] sm:text-lg">
                {videoDisplayName}
              </h1>

              <span className="rounded-full bg-[#FFF2D8] px-3 py-0.5 text-xs font-bold text-[#C68A1C] dark:bg-amber-950/50 dark:text-amber-300">
                {t("pipeline:header.inProgress")}
              </span>
            </div>

            <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
              {projectDisplayName} / {videoDisplayName}
              {state.video?.videoId && ` · ID: ${state.video.videoId}`}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] xl:flex">
            <Clock3 size={15} />
            <span>
              {isSaved ? t("pipeline:header.savedJustNow") : t("pipeline:header.unsavedChanges")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-200 ease-out active:scale-95 sm:px-4 ${
              isSaved
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                : "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
            }`}
          >
            <Save size={15} />
            <span className="hidden sm:inline">
              {isSaved ? t("common:saved") : t("common:save")}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row lg:p-8">
        <div className="overflow-x-auto lg:hidden">
          <div className="flex min-w-max gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)]">
            {pipelineSteps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isCompleted = index < activeStepIndex;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepChange(step.id)}
                  className={`flex min-w-[130px] items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ease-out ${
                    isActive
                      ? "bg-[var(--color-primary-soft)] shadow-2xs"
                      : "hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out ${
                      isCompleted
                        ? "bg-[var(--color-primary)] text-white"
                        : isActive
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={14} />
                    ) : isActive ? (
                      <Circle size={12} fill="currentColor" />
                    ) : (
                      <span className="text-[10px] font-bold">
                        {step.number}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-xs font-bold ${
                        isActive
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {step.title}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-[var(--color-text-muted)]">
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="hidden w-[280px] shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] lg:block">
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Video Pipeline
            </p>

            <h2 className="mt-1 text-base font-black text-[var(--color-text-primary)]">
              Processing Steps
            </h2>
            {projectId && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Project: {projectDisplayName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            {pipelineSteps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isCompleted = index < activeStepIndex;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepChange(step.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                    isActive
                      ? "bg-[var(--color-primary-soft)] shadow-2xs"
                      : "hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out ${
                      isCompleted
                        ? "bg-[var(--color-primary)] text-white"
                        : isActive
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]"
                          : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={16} />
                    ) : isActive ? (
                      <Circle size={13} fill="currentColor" />
                    ) : (
                      <span className="text-xs font-bold">
                        {step.number}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold ${
                        isActive
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {step.title}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                      {step.description}
                    </p>
                  </div>

                  {isActive && (
                    <ChevronRight
                      size={15}
                      className="ml-auto text-[var(--color-primary)]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                {t("pipeline:header.overallProgress")}
              </span>

              <span className="text-xs font-black text-[var(--color-primary)]">
                {progress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-2.5 text-[11px] leading-4 text-[var(--color-text-muted)]">
              {t("pipeline:header.autoSaveNotice")}
            </p>
          </div>

          {/* Project info card */}
          {state.projectId && (
            <div className="mt-4 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Project Information
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                {projectDisplayName}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                ID: {state.projectId}
              </p>
              {state.video?.videoId && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Video ID: {state.video.videoId}
                </p>
              )}
            </div>
          )}
        </aside>

        <section className="min-w-0 flex-1">
          {isLoadingVideo ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
              <Loader2 size={36} className="animate-spin text-[var(--color-primary)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Loading video data...
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Syncing status and processing steps
              </p>
            </div>
          ) : videoError ? (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-6 text-red-500">
              <p className="text-base font-bold">Failed to load video</p>
              <p className="mt-1 text-sm">{videoError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
              >
                Retry
              </button>
            </div>
          ) : (
            <div key={activeStep} className="animate-fade-in">
              {renderStep(activeStep)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Main export - wraps with PipelineProvider
export default function VideoPipeline() {
  return (
    <PipelineProvider>
      <VideoPipelineContent />
    </PipelineProvider>
  );
}