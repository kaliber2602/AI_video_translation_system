import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PipelineStepLayoutProps {
  stepBadge?: string;
  stepCategory?: string;
  stepTitle: string;
  stepDescription: string;
  error?: string | null;
  onDismissError?: () => void;
  headerActions?: ReactNode;
  toolPanelTitle?: string;
  toolPanelIcon?: ReactNode;
  toolPanel: ReactNode;
  children: ReactNode;
  defaultToolPanelOpen?: boolean;
  isPanelOpen?: boolean;
  onTogglePanel?: (open: boolean) => void;
  hideDefaultToggle?: boolean;
  panelWidth?: string;
  customPanelHeader?: ReactNode;
  panelBodyClassName?: string;
}

export default function PipelineStepLayout({
  stepBadge,
  stepCategory,
  stepTitle,
  stepDescription,
  error,
  onDismissError,
  headerActions,
  toolPanelTitle = "Tools",
  toolPanelIcon,
  toolPanel,
  children,
  defaultToolPanelOpen = true,
  isPanelOpen,
  onTogglePanel,
  hideDefaultToggle = false,
  panelWidth = "lg:w-[320px]",
  customPanelHeader,
  panelBodyClassName,
}: PipelineStepLayoutProps) {
  const { t } = useTranslation(["pipeline", "common"]);
  const [internalIsOpen, setInternalIsOpen] = useState(defaultToolPanelOpen);

  const isOpen = isPanelOpen !== undefined ? isPanelOpen : internalIsOpen;
  const togglePanel = (nextState?: boolean) => {
    const next = nextState !== undefined ? nextState : !isOpen;
    if (onTogglePanel) {
      onTogglePanel(next);
    }
    setInternalIsOpen(next);
  };

  return (
    <div className="space-y-5 w-full">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-[var(--color-primary)]">
            {stepBadge} {stepCategory && `· ${stepCategory}`}
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {stepTitle}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
            {stepDescription}
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {headerActions}

          {/* Unified Tool Panel Toggle Button (if not overridden by custom step actions) */}
          {!hideDefaultToggle && (
            <button
              type="button"
              onClick={() => togglePanel()}
              title={
                isOpen
                  ? t("pipeline:toolPanel.collapse", "Collapse tool panel")
                  : t("pipeline:toolPanel.expand", "Expand tool panel")
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs active:scale-95 ${
                isOpen
                  ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]"
                  : "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>
                {isOpen
                  ? t("pipeline:toolPanel.hideTools", "Hide tools")
                  : t("pipeline:toolPanel.showTools", "Show tools")}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3.5 text-red-500 text-xs flex items-center justify-between">
          <span className="font-medium">
            {t("common:error", "Error")}: {error}
          </span>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              className="underline hover:text-red-400 font-semibold ml-3"
            >
              {t("common:dismiss", "Dismiss")}
            </button>
          )}
        </div>
      )}

      {/* Main Studio Workspace: Central Content & Right Sticky Tool Panel */}
      <div className="flex flex-col lg:flex-row gap-5 items-start relative">
        {/* CENTER / HERO WORKSPACE (Expands to 100% when tool panel is closed) */}
        <div className="flex-1 min-w-0 w-full transition-all duration-300">
          {children}
        </div>

        {/* RIGHT TOOL / TRANSCRIPT PANEL (COLLAPSIBLE WITH HEADER CONTROL) */}
        {isOpen && (
          <div className={`w-full ${panelWidth} shrink-0 lg:sticky lg:top-24 transition-all duration-300`}>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col overflow-hidden">
              {/* Tool / Panel Header */}
              {customPanelHeader ? (
                customPanelHeader
              ) : (
                <div className="p-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {toolPanelIcon || (
                      <SlidersHorizontal
                        size={15}
                        className="text-[var(--color-primary)] shrink-0"
                      />
                    )}
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] truncate">
                      {toolPanelTitle}
                    </h4>
                  </div>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => togglePanel(false)}
                    title={t("pipeline:toolPanel.collapse", "Collapse tool panel")}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition active:scale-95"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Panel Body */}
              <div className={`p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar ${panelBodyClassName || ""}`}>
                {toolPanel}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
