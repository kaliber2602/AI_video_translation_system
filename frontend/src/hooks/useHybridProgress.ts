import { useState, useEffect, useRef, useCallback } from "react";
import { videoService } from "../services/video.service";

export interface ProgressState {
  progress: number;
  message: string;
  step: string;
  status: string;
  isLive: boolean; // true if streaming via WebSocket, false if fallback REST polling
}

/**
 * useHybridProgress: Production Hybrid Mechanism (1 & 3)
 * - Initial Render: Calls REST GET /steps-summary once to retrieve immediate state snapshot (Resilience/F5).
 * - Active Interactive View: Connects to WebSocket /ws/videos/{videoId}/progress (Mechanism 1) for zero-latency, 50ms updates.
 * - Disconnect/Error/Background fallback: Reverts to Short-Polling (Mechanism 3, 1.5s interval) seamlessly without UI stutter.
 */
export function useHybridProgress(
  videoId: number | null | undefined,
  targetStep?: string,
  onStepComplete?: (step: string) => void,
  enabled: boolean = true
) {
  const [progressState, setProgressState] = useState<ProgressState>({
    progress: 0,
    message: "",
    step: targetStep || "",
    status: "idle",
    isLive: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isUnmountedRef = useRef<boolean>(false);

  // Save latest callbacks in refs to keep connectWebSocket stable
  const onStepCompleteRef = useRef(onStepComplete);
  onStepCompleteRef.current = onStepComplete;
  const targetStepRef = useRef(targetStep);
  targetStepRef.current = targetStep;

  // 1. Fetch REST Snapshot (Mechanism 3 - Snapshot & Fallback)
  const fetchSnapshot = useCallback(async () => {
    if (!videoId) return;
    try {
      const summary = await videoService.getStepsSummary(videoId);
      if (isUnmountedRef.current) return;

      const activeTask = summary?.active_task;
      if (activeTask) {
        const stepMatch = !targetStepRef.current || activeTask.current_step === targetStepRef.current;
        if (stepMatch && typeof activeTask.progress === "number") {
          setProgressState((prev) => ({
            ...prev,
            progress: activeTask.progress,
            message: activeTask.message || prev.message,
            step: activeTask.current_step || prev.step,
            status: activeTask.status || "processing",
          }));
        }

        if (activeTask.status === "completed" || activeTask.progress >= 100) {
          if (onStepCompleteRef.current && (!targetStepRef.current || activeTask.current_step === targetStepRef.current)) {
            onStepCompleteRef.current(targetStepRef.current || activeTask.current_step || "");
          }
        }
      }
    } catch (err) {
      console.warn("[useHybridProgress] Failed to fetch REST snapshot:", err);
    }
  }, [videoId]);

  // 2. Start Polling Loop (Mechanism 3)
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    console.log(`[useHybridProgress] 🔄 Fallback to HTTP Polling for Video #${videoId}`);
    setProgressState((prev) => ({ ...prev, isLive: false }));

    fetchSnapshot();

    pollTimerRef.current = window.setInterval(() => {
      fetchSnapshot();
    }, 1500);
  }, [videoId, fetchSnapshot]);

  // Stop Polling Loop
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // 3. Setup WebSocket Connection (Mechanism 1)
  const connectWebSocket = useCallback(() => {
    if (!videoId) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = localStorage.getItem("access_token") || "";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/videos/${videoId}/progress${token ? `?token=${token}` : ""}`;

    let pingTimer: number | null = null;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }
        console.log(`[useHybridProgress] ⚡ WebSocket Connected (Mechanism 1) for Video #${videoId}`);
        stopPolling();
        setProgressState((prev) => ({ ...prev, isLive: true }));

        // Heartbeat keepalive every 15s to keep socket alive and prevent proxy timeouts
        pingTimer = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send("ping");
            } catch (_) {}
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === "pong") return;
          const data = JSON.parse(event.data);
          if (data.type === "connection_ack") return;

          const stepMatch = !targetStepRef.current || data.step === targetStepRef.current;
          if (stepMatch && typeof data.progress === "number") {
            setProgressState({
              progress: data.progress,
              message: data.message || "",
              step: data.step || targetStepRef.current || "",
              status: data.status || "processing",
              isLive: true,
            });

            if (data.progress >= 100 || data.status === "completed") {
              if (onStepCompleteRef.current && (!targetStepRef.current || data.step === targetStepRef.current)) {
                onStepCompleteRef.current(targetStepRef.current || data.step);
              }
            }
          }
        } catch (e) {
          console.debug("[useHybridProgress] WebSocket message parse error:", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("[useHybridProgress] WebSocket error, fallback to polling:", err);
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        startPolling();
      };

      ws.onclose = () => {
        console.log(`[useHybridProgress] 🔌 WebSocket Disconnected for Video #${videoId}`);
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        wsRef.current = null;
        if (!isUnmountedRef.current) {
          startPolling();
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (!isUnmountedRef.current) {
              connectWebSocket();
            }
          }, 3000);
        }
      };
    } catch (wsErr) {
      console.warn("[useHybridProgress] WebSocket init failed, fallback to polling:", wsErr);
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      startPolling();
    }
  }, [videoId, startPolling, stopPolling]);

  // Lifecycle
  useEffect(() => {
    isUnmountedRef.current = false;
    if (!videoId || !enabled) return;

    fetchSnapshot();
    connectWebSocket();

    return () => {
      isUnmountedRef.current = true;
      stopPolling();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [videoId, enabled, fetchSnapshot, connectWebSocket, stopPolling]);

  return {
    progress: progressState.progress,
    message: progressState.message,
    status: progressState.status,
    step: progressState.step,
    isLive: progressState.isLive,
    refreshSnapshot: fetchSnapshot,
  };
}
