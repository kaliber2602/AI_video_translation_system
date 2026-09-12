import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronLeft,
  Circle,
  Clock3,
  Save,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";

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

const STEP_ID_TO_NUM: Record<string, number> = {
  upload: 1,
  transcript: 2,
  translation: 3,
  subtitle: 4,
  dubbing: 5,
  "review-export": 6,
};

const STEP_NUM_TO_ID: Record<number, string> = {
  1: "upload",
  2: "transcript",
  3: "translation",
  4: "subtitle",
  5: "dubbing",
  6: "review-export",
};

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

function formatSnapshotTime(snapshot: any): string {
  if (!snapshot) return "";
  try {
    if (snapshot.saved_at_epoch && typeof snapshot.saved_at_epoch === "number") {
      const d = new Date(snapshot.saved_at_epoch);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      }
    }
    if (snapshot.saved_at) {
      let iso = String(snapshot.saved_at);
      if (!iso.endsWith("Z") && !iso.includes("+")) {
        iso += "Z";
      }
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      }
    }
  } catch (e) {
    console.error("Error formatting snapshot time:", e);
  }
  return "";
}

// Inner component that uses the pipeline context
function VideoPipelineContent() {
  const { t } = useTranslation(["pipeline", "common"]);
  const navigate = useNavigate();
  const { projectId, videoId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = usePipeline();
  
  const initialQueryStep = searchParams.get("step");
  const [activeStep, setActiveStep] = useState<string>(() =>
    initialQueryStep && STEP_ID_TO_NUM[initialQueryStep] ? initialQueryStep : "upload"
  );
  const [isSaved, setIsSaved] = useState(true);
  const [projectName, setProjectName] = useState<string>("");
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

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

        Promise.all([
          videoService.getVideo(vidNum),
          videoService.getStepsSummary(vidNum).catch(() => null),
        ])
          .then(([videoData, summaryData]: [any, any]) => {
            console.log("📹 Loaded video data:", videoData);
            if (summaryData) {
              console.log("📊 Loaded steps summary:", summaryData);
              dispatch({
                type: "SET_STEPS_SUMMARY",
                payload: summaryData,
              });
            }

            dispatch({
              type: "SET_VIDEO",
              payload: {
                videoId: videoData.id,
                filename: videoData.original_filename || videoData.title,
                fileSize: videoData.file_size || 0,
                status: videoData.status,
                progress: videoData.progress,
                currentStep: videoData.current_step,
                duration: videoData.duration,
                outputPath: videoData.output_path,
                dubbedAudioPath: videoData.dubbed_audio_path,
                subtitlePath: videoData.subtitle_path,
                transcriptPath: videoData.transcript_path,
                extractedVocalPath: videoData.extracted_vocal_path,
                projectId: videoData.project_id,
                hasTranslation: videoData.has_translation,
                translationPath: videoData.translation_path,
                snapshot_data: videoData.snapshot_data,
              },
            });

            if (videoData.target_language) {
              dispatch({
                type: "SET_TARGET_LANGUAGE",
                payload: videoData.target_language,
              });
            }

            if (videoData.snapshot_data) {
              const formattedTime = formatSnapshotTime(videoData.snapshot_data);
              if (formattedTime) {
                setLastSavedTime(formattedTime);
              }
            }

            // Route to appropriate step: respect URL query param first, then saved snapshot, then steps summary, then available assets
            const queryStepParam = searchParams.get("step");
            let targetStep = 2; // Default to transcript if uploaded
            
            const savedStep = videoData.snapshot_data?.active_step;
            const savedStepNum =
              typeof savedStep === "number"
                ? savedStep
                : typeof savedStep === "string" && STEP_ID_TO_NUM[savedStep]
                ? STEP_ID_TO_NUM[savedStep]
                : typeof savedStep === "string" && !isNaN(parseInt(savedStep))
                ? parseInt(savedStep)
                : null;

            if (queryStepParam && STEP_ID_TO_NUM[queryStepParam]) {
              targetStep = STEP_ID_TO_NUM[queryStepParam];
            } else if (savedStepNum && savedStepNum >= 1 && savedStepNum <= 6) {
              targetStep = savedStepNum;
            } else if (summaryData?.steps?.export?.status === "completed" || videoData.output_path || videoData.status === "completed") {
              targetStep = 6;
            } else if (summaryData?.steps?.dubbing?.status === "completed" || videoData.dubbed_audio_path) {
              targetStep = 5;
            } else if (summaryData?.steps?.subtitle?.status === "completed" || videoData.subtitle_path) {
              targetStep = 4;
            } else if (summaryData?.steps?.translation?.status === "completed" || videoData.has_translation) {
              targetStep = 4;
            } else if (summaryData?.steps?.transcript?.status === "completed" || videoData.transcript_path) {
              targetStep = 3;
            } else if (summaryData?.steps?.audio?.status === "completed" || videoData.extracted_vocal_path) {
              targetStep = 2;
            }

            dispatch({ type: "SET_STEP", payload: targetStep });
            const resolvedStepId = STEP_NUM_TO_ID[targetStep] || "upload";
            setActiveStep(resolvedStepId);
            if (searchParams.get("step") !== resolvedStepId) {
              setSearchParams({ step: resolvedStepId }, { replace: true });
            }
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
      const stepId = STEP_NUM_TO_ID[state.step] || "upload";
      setActiveStep(stepId);
      if (searchParams.get("step") !== stepId) {
        setSearchParams({ step: stepId }, { replace: true });
      }
    }
  }, [projectId, videoId, location.state, dispatch, state.step, searchParams, setSearchParams]);

  // Polling for active background tasks (Phase 4 Re-hydration & Live Sync)
  useEffect(() => {
    const vidId = state.video?.videoId;
    if (!vidId) return;

    const currentActiveTask = state.stepsSummary?.active_task;
    const isRunning = Boolean(
      currentActiveTask &&
      (currentActiveTask.status === "processing" || currentActiveTask.status === "queued")
    );

    if (!isRunning) return;

    console.log("🔄 Background task active, polling steps-summary for video:", vidId);

    const timer = setInterval(async () => {
      try {
        const freshSummary = await videoService.getStepsSummary(vidId);
        if (freshSummary) {
          dispatch({
            type: "SET_STEPS_SUMMARY",
            payload: freshSummary,
          });

          const stillRunning = Boolean(
            freshSummary.active_task &&
            (freshSummary.active_task.status === "processing" || freshSummary.active_task.status === "queued")
          );

          if (!stillRunning) {
            console.log("✅ Background task finished! Refreshing video data and notifying navbar...");
            clearInterval(timer);
            // Refresh video metadata
            try {
              const freshVideo = await videoService.getVideo(vidId);
              dispatch({
                type: "SET_VIDEO",
                payload: {
                  videoId: freshVideo.id,
                  filename: freshVideo.original_filename || freshVideo.title,
                  fileSize: freshVideo.file_size || 0,
                  status: freshVideo.status,
                  progress: freshVideo.progress,
                  currentStep: freshVideo.current_step,
                  duration: freshVideo.duration,
                  outputPath: freshVideo.output_path,
                  dubbedAudioPath: freshVideo.dubbed_audio_path,
                  subtitlePath: freshVideo.subtitle_path,
                  transcriptPath: freshVideo.transcript_path,
                  extractedVocalPath: freshVideo.extracted_vocal_path,
                  projectId: freshVideo.project_id,
                  hasTranslation: freshVideo.has_translation,
                  translationPath: freshVideo.translation_path,
                  snapshot_data: freshVideo.snapshot_data,
                },
              });
            } catch (e) {
              console.warn("Failed to refresh video metadata:", e);
            }

            // Dispatch global events for Navbar NotificationBell and Quotas
            window.dispatchEvent(new CustomEvent("notifications-updated"));
            window.dispatchEvent(new CustomEvent("subscription-updated"));
            setSaveSuccessMessage("Tác vụ xử lý ngầm đã hoàn tất thành công!");
            setTimeout(() => setSaveSuccessMessage(null), 5000);
          }
        }
      } catch (pollErr) {
        console.warn("Error polling steps summary:", pollErr);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [state.video?.videoId, state.stepsSummary?.active_task?.status, dispatch]);

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

  // Decouple Step Checkpoint Completion from Step Index (UX-02, UX-07, Phase 4)
  const isStepCheckpointCompleted = (stepId: string): boolean => {
    // 1. Authoritative check via backend stepsSummary
    const stepSummary = state.stepsSummary?.steps?.[stepId];
    if (stepSummary && stepSummary.status === "completed") {
      return true;
    }

    // 2. Fallback check via context state / video attributes
    switch (stepId) {
      case "upload":
        return Boolean(state.video?.videoId);
      case "transcript":
        return Boolean(
          state.stepsSummary?.steps?.transcript?.status === "completed" ||
          state.video?.transcriptPath ||
          state.transcript ||
          state.video?.hasTranslation ||
          state.video?.translationPath ||
          state.subtitles ||
          state.video?.subtitlePath ||
          state.video?.dubbedAudioPath ||
          state.dubbedVideo?.output_path ||
          (state.video as any)?.outputPath ||
          (state.video as any)?.output_path
        );
      case "translation":
        return Boolean(
          state.stepsSummary?.steps?.translation?.status === "completed" ||
          (state.translation?.segments && state.translation.segments.length > 0) ||
          state.video?.hasTranslation ||
          state.video?.translationPath ||
          state.subtitles ||
          state.video?.subtitlePath ||
          state.video?.dubbedAudioPath ||
          state.dubbedVideo?.output_path ||
          (state.video as any)?.outputPath ||
          (state.video as any)?.output_path
        );
      case "subtitle":
        return Boolean(
          state.stepsSummary?.steps?.subtitle?.status === "completed" ||
          state.subtitles ||
          state.video?.subtitlePath ||
          state.video?.dubbedAudioPath ||
          state.dubbedVideo?.output_path ||
          (state.video as any)?.outputPath ||
          (state.video as any)?.output_path
        );
      case "dubbing":
        return Boolean(
          state.stepsSummary?.steps?.dubbing?.status === "completed" ||
          state.dubbedVideo?.output_path ||
          (state.dubbedVideo as any)?.s3_path ||
          state.video?.outputPath ||
          (state.video as any)?.output_path ||
          state.video?.dubbedAudioPath ||
          state.video?.status === "completed" ||
          (state.video?.progress !== undefined && state.video.progress >= 85)
        );
      case "review-export":
        return Boolean(
          state.stepsSummary?.steps?.export?.status === "completed" ||
          state.dubbedVideo?.output_path ||
          (state.dubbedVideo as any)?.s3_path ||
          state.video?.outputPath ||
          (state.video as any)?.output_path ||
          state.video?.status === "completed" ||
          state.video?.currentStep === "completed" ||
          (state.video?.progress !== undefined && state.video.progress >= 100)
        );
      default:
        return false;
    }
  };

  const canNavigateToStep = (index: number): boolean => {
    if (index === 0) return true;
    // Allow reviewing already completed steps or current active step
    if (index <= activeStepIndex && isStepCheckpointCompleted(pipelineSteps[index].id)) return true;
    // Strict DAG Check: All prior prerequisite steps must be completed
    for (let i = 0; i < index; i++) {
      const prevStepId = pipelineSteps[i].id;
      if (!isStepCheckpointCompleted(prevStepId)) {
        return false;
      }
    }
    return true;
  };

  // True pipeline completion percentage based on actual completed milestones (UX-07)
  const completedMilestonesCount = pipelineSteps.filter((s) => isStepCheckpointCompleted(s.id)).length;
  const progress = Math.round((completedMilestonesCount / pipelineSteps.length) * 100);

  const handleStepChange = (stepId: string) => {
    const targetIndex = pipelineSteps.findIndex((s) => s.id === stepId);
    if (!canNavigateToStep(targetIndex)) {
      return;
    }
    setActiveStep(stepId);
    setIsSaved(false);
    
    // Update the context step and sync URL query params
    const stepNum = STEP_ID_TO_NUM[stepId] || 1;
    dispatch({ type: "SET_STEP", payload: stepNum });
    setSearchParams({ step: stepId }, { replace: true });
  };

  const handleSave = async () => {
    const currentVideoId = state.video?.videoId || (videoId && videoId !== "new" ? parseInt(videoId) : null);
    if (!currentVideoId) {
      console.warn("No active video to save snapshot");
      return;
    }

    try {
      setIsSaving(true);
      const stepNum = STEP_ID_TO_NUM[activeStep] || state.step || 1;
      const res = await videoService.savePipelineSnapshot(currentVideoId, {
        active_step: stepNum,
        current_step: activeStep,
        target_language: state.targetLanguage,
        progress: progress,
      });

      console.log("💾 [SNAPSHOT API RESPONSE]", res);

      const formattedTime =
        formatSnapshotTime(res?.snapshot_data) ||
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

      setLastSavedTime(formattedTime);
      setIsSaved(true);
      setSaveSuccessMessage(`${t("pipeline:header.savedSuccess")} (${formattedTime})`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);

      // Synchronize pipeline context with fresh database record
      if (res) {
        dispatch({
          type: "SET_VIDEO",
          payload: {
            ...state.video,
            videoId: res.id,
            filename: res.original_filename || res.title,
            fileSize: res.file_size || 0,
            status: res.status,
            progress: res.progress,
            currentStep: res.current_step,
            duration: res.duration,
            outputPath: res.output_path,
            dubbedAudioPath: res.dubbed_audio_path,
            subtitlePath: res.subtitle_path,
            transcriptPath: res.transcript_path,
            extractedVocalPath: res.extracted_vocal_path,
            projectId: res.project_id,
            hasTranslation: res.has_translation,
            translationPath: res.translation_path,
            snapshot_data: res.snapshot_data,
          },
        });
      }
    } catch (err: any) {
      console.error("❌ Failed to save pipeline snapshot:", err);
    } finally {
      setIsSaving(false);
    }
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
              {projectDisplayName} • {videoDisplayName}
              {state.video?.fileSize ? ` (${(state.video.fileSize / (1024 * 1024)).toFixed(1)} MB)` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {saveSuccessMessage && (
            <span className="hidden items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 sm:inline-flex animate-fade-in">
              <Check size={13} />
              {saveSuccessMessage}
            </span>
          )}

          <div className="hidden items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] xl:flex">
            <Clock3 size={15} />
            <span>
              {lastSavedTime
                ? t("pipeline:header.savedAt", { time: lastSavedTime })
                : isSaved
                ? t("pipeline:header.savedJustNow")
                : t("pipeline:header.unsavedChanges")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-200 ease-out active:scale-95 sm:px-4 ${
              isSaving
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-wait"
                : isSaved
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                : "border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:opacity-90 shadow-sm cursor-pointer"
            }`}
          >
            {isSaving ? (
              <Loader2 size={15} className="animate-spin text-[var(--color-primary)]" />
            ) : (
              <Save size={15} />
            )}
            <span className="hidden sm:inline">
              {isSaving
                ? t("pipeline:header.saving")
                : isSaved
                ? t("pipeline:header.saved")
                : t("pipeline:header.save")}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row lg:items-start lg:p-8">
        <div className="overflow-x-auto lg:hidden">
          <div className="flex min-w-max gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)]">
            {pipelineSteps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isCompleted = isStepCheckpointCompleted(step.id);
              const canNavigate = canNavigateToStep(index);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepChange(step.id)}
                  disabled={!canNavigate}
                  className={`flex min-w-[130px] items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ease-out ${
                    isActive
                      ? "bg-[var(--color-primary-soft)] shadow-2xs"
                      : canNavigate
                      ? "hover:bg-[var(--color-surface-muted)] cursor-pointer"
                      : "opacity-40 cursor-not-allowed"
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

        {/* Collapsible Left Steps Sidebar (Fixed Height - No Ugly Stretching) */}
        {isSidebarCollapsed ? (
          <aside className="hidden w-[64px] shrink-0 flex-col items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-4 px-1.5 shadow-[var(--shadow-card)] lg:flex transition-all duration-300 h-fit self-start lg:sticky lg:top-24">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              title={t("pipeline:header.expandSidebar")}
              aria-label={t("pipeline:header.expandSidebar")}
              className="mb-4 flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition active:scale-95"
            >
              <ChevronRight size={15} />
            </button>

            <div className="flex flex-col gap-2">
              {pipelineSteps.map((step, index) => {
                const isActive = activeStep === step.id;
                const isCompleted = isStepCheckpointCompleted(step.id);
                const canNavigate = canNavigateToStep(index);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepChange(step.id)}
                    disabled={!canNavigate}
                    title={`${step.number}. ${step.title}`}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                      isActive
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)] shadow-sm"
                        : isCompleted
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    } ${!canNavigate ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {isCompleted ? (
                      <Check size={16} />
                    ) : isActive ? (
                      <Circle size={10} fill="currentColor" />
                    ) : (
                      <span className="text-[11px] font-bold">{step.number}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        ) : (
          <aside className="hidden w-[260px] shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] lg:block transition-all duration-300 h-fit self-start lg:sticky lg:top-24">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Video Pipeline
                </p>
                <h2 className="text-sm font-black text-[var(--color-text-primary)]">
                  Processing Steps
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                title={t("pipeline:header.collapseSidebar")}
                aria-label={t("pipeline:header.collapseSidebar")}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition"
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            <div className="space-y-1">
              {pipelineSteps.map((step, index) => {
                const isActive = activeStep === step.id;
                const isCompleted = isStepCheckpointCompleted(step.id);
                const canNavigate = canNavigateToStep(index);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepChange(step.id)}
                    disabled={!canNavigate}
                    className={`group relative flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                      isActive
                        ? "bg-[var(--color-primary-soft)] shadow-2xs"
                        : canNavigate
                        ? "hover:bg-[var(--color-surface-muted)] cursor-pointer"
                        : "opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out ${
                        isCompleted
                          ? "bg-[var(--color-primary)] text-white"
                          : isActive
                            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]"
                            : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={14} />
                      ) : isActive ? (
                        <Circle size={10} fill="currentColor" />
                      ) : (
                        <span className="text-[11px] font-bold">
                          {step.number}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-bold truncate ${
                          isActive
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="truncate text-[10px] text-[var(--color-text-muted)]">
                        {step.description}
                      </p>
                    </div>

                    {isActive && (
                      <ChevronRight
                        size={13}
                        className="ml-auto text-[var(--color-primary)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface-muted)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] block">
                    {t("pipeline:header.overallProgress")}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {t("pipeline:header.stepsReady", { count: completedMilestonesCount, total: pipelineSteps.length })}
                  </span>
                </div>
                <span className="text-xs font-black text-[var(--color-primary)]">
                  {progress}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </aside>
        )}

        <section className="min-w-0 flex-1">
          {/* Active Background Task Soft-Locking Banner (Phase 4) */}
          {state.stepsSummary?.active_task &&
            (state.stepsSummary.active_task.status === "processing" ||
              state.stepsSummary.active_task.status === "queued") && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm backdrop-blur-xs animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                        Tác vụ ngầm đang chạy: {state.stepsSummary.active_task.step || state.stepsSummary.active_task.current_step || "Đang xử lý"}
                      </h4>
                      {typeof state.stepsSummary.active_task.progress === "number" && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                          {state.stepsSummary.active_task.progress}%
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      {state.stepsSummary.active_task.message || "Hệ thống đang xử lý tác vụ trong Celery worker. Thao tác điều hướng và chỉnh sửa đồng thời được bảo vệ để tránh xung đột."}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[11px] font-semibold text-amber-500">Đang đồng bộ</span>
                </div>
              </div>
            )}

          {isLoadingVideo ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
              <Loader2 size={36} className="animate-spin text-[var(--color-primary)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t("pipeline:header.loadingVideo")}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t("pipeline:header.syncingStatus")}
              </p>
            </div>
          ) : videoError ? (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-6 text-red-500">
              <p className="text-base font-bold">{t("pipeline:header.failedToLoad")}</p>
              <p className="mt-1 text-sm">{videoError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
              >
                {t("pipeline:header.retry")}
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