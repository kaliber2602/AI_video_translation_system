import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
  error?: Error;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const isChunk =
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("Importing a module script failed") ||
      error.message?.includes("error loading dynamically imported module");
    return { hasError: true, isChunkError: isChunk, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RouteErrorBoundary] Uncaught route error:", error, errorInfo);
    const isChunk =
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("Importing a module script failed") ||
      error.message?.includes("error loading dynamically imported module");

    if (isChunk) {
      const storageKey = "chunk_load_failed_reload";
      const hasReloaded = sessionStorage.getItem(storageKey);
      if (!hasReloaded) {
        sessionStorage.setItem(storageKey, "true");
        window.location.reload();
      }
    }
  }

  private handleManualReload = () => {
    sessionStorage.removeItem("chunk_load_failed_reload");
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-background)] p-4 text-[var(--color-text-primary)]">
          <div className="flex max-w-md flex-col items-center text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-4">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-lg font-bold">
              {this.state.isChunkError
                ? "Ứng dụng vừa được cập nhật phiên bản mới"
                : "Đã xảy ra lỗi khi tải trang"}
            </h2>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              {this.state.isChunkError
                ? "Hệ thống đã cập nhật các tính năng và module mới. Vui lòng tải lại trang để tải bộ nhớ đệm mới nhất."
                : (this.state.error?.message || "Vui lòng làm mới trang để tiếp tục.")}
            </p>
            <button
              type="button"
              onClick={this.handleManualReload}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
            >
              <RefreshCw size={14} />
              Tải lại trang (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
