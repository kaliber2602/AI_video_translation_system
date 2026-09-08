import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getUnreadCount } from "../../services/notification.service";
import { getAccessToken } from "../../services/api/token";

interface NotificationContextValue {
  unreadCount: number;
  loadingCount: boolean;
  fetchUnreadCount: () => Promise<void>;
  decrementUnreadCount: (amount?: number) => void;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const POLLING_INTERVAL_MS = 30000; // 30 seconds

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  const fetchCount = useCallback(async () => {
    // Only poll when authenticated
    const token = getAccessToken();
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      setLoadingCount(true);
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Non-blocking failure: polling errors must never disrupt the application
      console.warn("[NotificationContext] Failed to poll unread count:", error);
    } finally {
      setLoadingCount(false);
    }
  }, []);

  const decrementUnreadCount = useCallback((amount: number = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Setup interval and event listeners
  useEffect(() => {
    const startPolling = () => {
      stopPolling();
      const token = getAccessToken();
      if (!token) return;

      intervalRef.current = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchCount();
        }
      }, POLLING_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Initial load
    fetchCount();
    startPolling();

    // Pause when hidden, resume and fetch when visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchCount();
        startPolling();
      } else {
        stopPolling();
      }
    };

    const handleWindowFocus = () => {
      fetchCount();
    };

    const handleNotificationsUpdated = () => {
      fetchCount();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("notifications-updated", handleNotificationsUpdated);
    };
  }, [fetchCount]);

  const value: NotificationContextValue = {
    unreadCount,
    loadingCount,
    fetchUnreadCount: fetchCount,
    decrementUnreadCount,
    resetUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
