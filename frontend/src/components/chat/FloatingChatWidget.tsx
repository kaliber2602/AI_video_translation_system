import { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  Play,
  Minimize2,
  Maximize2,
  PanelLeft,
  Trash2,
  PlusCircle,
  Cpu,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { videoService } from "../../services/video.service";

interface Citation {
  project_id?: number;
  project_name?: string;
  video_id?: number;
  video_title?: string;
  start_time: number;
  end_time: number;
  timestamp_formatted: string;
  text: string;
  speaker?: string;
}

interface ChatMessage {
  id?: number;
  role: "user" | "assistant" | "system";
  message: string;
  citations?: Citation[];
  created_at?: string;
}

interface ChatSession {
  id: string;
  title: string;
  videoId?: number | null;
  projectId?: number | null;
  messages: ChatMessage[];
  updatedAt: string;
}

const STORAGE_KEY = "vidnova_chat_sessions";

export default function FloatingChatWidget() {
  const location = useLocation();
  const navigate = useNavigate();

  // Only render on authenticated workspace/admin/editor routes
  const isExcludedRoute =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/pricing" ||
    location.pathname.startsWith("/payments/vnpay/return");

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(true);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [selectedTone, setSelectedTone] = useState("Tự nhiên, súc tích");

  // Multi-session state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load sessions from localStorage
  const loadStoredSessions = (): ChatSession[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load chat sessions from localStorage:", e);
    }
    return [];
  };

  const saveSessionsToStorage = (updatedSessions: ChatSession[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (e) {
      console.warn("Failed to save chat sessions to localStorage:", e);
    }
  };

  // Detect context from URL
  useEffect(() => {
    const videoMatch = location.pathname.match(/\/video\/(\d+)/);
    if (videoMatch && videoMatch[1]) {
      setActiveVideoId(Number(videoMatch[1]));
    } else {
      setActiveVideoId(null);
    }

    const projMatch = location.pathname.match(/\/project\/(\d+)/);
    if (projMatch && projMatch[1]) {
      setSelectedProjectId(Number(projMatch[1]));
    }
  }, [location.pathname]);

  // Initialize or restore session when chat widget opens
  useEffect(() => {
    if (!isOpen) return;

    const stored = loadStoredSessions();
    if (stored.length > 0) {
      setSessions(stored);
      // If no active session or current active session is not in stored, pick the most recent
      if (!activeSessionId || !stored.find((s) => s.id === activeSessionId)) {
        setActiveSessionId(stored[0].id);
      }
    } else {
      // Create initial session
      createNewSession(activeVideoId, selectedProjectId);
    }
  }, [isOpen, activeVideoId, selectedProjectId]);

  const createNewSession = (vidId: number | null = activeVideoId, projId: number | null = selectedProjectId) => {
    const newId = `session_${Date.now()}`;
    const initialGreeting: ChatMessage = {
      role: "assistant",
      message: vidId
        ? `Xin chào! Tôi đã sẵn sàng hỗ trợ bạn phân tích video #${vidId}. Bạn có thể đặt câu hỏi về nội dung, nhân vật hoặc tìm kiếm câu nói cụ thể.`
        : "Xin chào! Tôi là trợ lý AI VidNova. Bạn có thể hỏi tôi về nội dung, phụ đề, ý chính hoặc tìm kiếm câu nói trong các video của bạn!",
      created_at: new Date().toISOString(),
    };

    const newSession: ChatSession = {
      id: newId,
      title: "Đoạn chat mới",
      videoId: vidId,
      projectId: projId,
      messages: [initialGreeting],
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      saveSessionsToStorage(updated);
      return updated;
    });
    setActiveSessionId(newId);
  };

  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  const messages = currentSession ? currentSession.messages : [];

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleNewChat = () => {
    createNewSession();
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      saveSessionsToStorage(filtered);
      if (activeSessionId === sessionId) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        } else {
          // If deleted last session, create a fresh one
          setTimeout(() => createNewSession(), 0);
        }
      }
      return filtered;
    });
  };

  const handleClearAllSessions = async () => {
    if (activeVideoId) {
      try {
        await videoService.clearVideoChatHistory(activeVideoId);
      } catch (err) {
        console.warn("Error clearing backend chat history:", err);
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setSessions([]);
    createNewSession();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (isExcludedRoute) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputValue).trim();
    if (!prompt || isLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      message: prompt,
      created_at: new Date().toISOString(),
    };

    // Update active session messages immediately with user message
    let targetSessionId = activeSessionId;
    if (!targetSessionId || !sessions.find((s) => s.id === targetSessionId)) {
      const newId = `session_${Date.now()}`;
      targetSessionId = newId;
      setActiveSessionId(newId);
    }

    setSessions((prev) => {
      let found = false;
      const updated = prev.map((s) => {
        if (s.id === targetSessionId) {
          found = true;
          // Set session title to the first user question if it's currently default
          const title = s.title === "Đoạn chat mới" ? (prompt.length > 28 ? prompt.slice(0, 28) + "..." : prompt) : s.title;
          return {
            ...s,
            title,
            messages: [...s.messages, userMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });

      if (!found) {
        const title = prompt.length > 28 ? prompt.slice(0, 28) + "..." : prompt;
        const newSess: ChatSession = {
          id: targetSessionId,
          title,
          videoId: activeVideoId,
          projectId: selectedProjectId,
          messages: [userMsg],
          updatedAt: new Date().toISOString(),
        };
        const all = [newSess, ...prev];
        saveSessionsToStorage(all);
        return all;
      }

      saveSessionsToStorage(updated);
      return updated;
    });

    setInputValue("");
    setIsLoading(true);

    try {
      if (activeVideoId) {
        const historyForBackend = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.message }));

        const res = await videoService.chatWithVideo(
          activeVideoId,
          prompt,
          historyForBackend,
          selectedModel,
          selectedTone
        );

        const asstMsg: ChatMessage = {
          id: res.id,
          role: "assistant",
          message: res.message,
          citations: res.citations,
          created_at: res.created_at,
        };

        setSessions((prev) => {
          const updated = prev.map((s) =>
            s.id === targetSessionId
              ? { ...s, messages: [...s.messages, asstMsg], updatedAt: new Date().toISOString() }
              : s
          );
          saveSessionsToStorage(updated);
          return updated;
        });
      } else if (selectedProjectId) {
        // Workspace-level RAG Chat with Project
        const res = await videoService.chatWithProject(
          selectedProjectId,
          prompt,
          selectedModel,
          selectedTone
        );

        const asstMsg: ChatMessage = {
          role: "assistant",
          message: res.message,
          citations: res.citations?.map((c: any) => ({
            project_id: selectedProjectId,
            video_id: c.video_id,
            video_title: c.video_title,
            start_time: c.start_time,
            end_time: c.end_time,
            timestamp_formatted: c.timestamp_formatted,
            text: c.text,
            speaker: `${c.video_title || "Video"} • Phân đoạn`,
          })),
          created_at: res.created_at,
        };

        setSessions((prev) => {
          const updated = prev.map((s) =>
            s.id === targetSessionId
              ? { ...s, messages: [...s.messages, asstMsg], updatedAt: new Date().toISOString() }
              : s
          );
          saveSessionsToStorage(updated);
          return updated;
        });
      } else {
        // Global Workspace-Level RAG Chat across ALL projects & videos
        const res = await videoService.chatWithWorkspace(
          prompt,
          selectedModel,
          selectedTone
        );

        const asstMsg: ChatMessage = {
          role: "assistant",
          message: res.message,
          citations: res.citations?.map((c: any) => ({
            project_id: c.project_id,
            project_name: c.project_name,
            video_id: c.video_id,
            video_title: c.video_title,
            start_time: c.start_time,
            end_time: c.end_time,
            timestamp_formatted: c.timestamp_formatted,
            text: c.text,
            speaker: `${c.project_name || "Dự án"} • ${c.video_title || "Video"}`,
          })),
          created_at: res.created_at,
        };

        setSessions((prev) => {
          const updated = prev.map((s) =>
            s.id === targetSessionId
              ? { ...s, messages: [...s.messages, asstMsg], updatedAt: new Date().toISOString() }
              : s
          );
          saveSessionsToStorage(updated);
          return updated;
        });
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        message: "Rất tiếc, đã có lỗi kết nối khi xử lý câu trả lời. Vui lòng thử lại sau giây lát.",
        created_at: new Date().toISOString(),
      };
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, messages: [...s.messages, errorMsg], updatedAt: new Date().toISOString() }
            : s
        );
        saveSessionsToStorage(updated);
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJumpToTimestamp = (citation: Citation) => {
    const targetSec = Math.max(0, Math.floor(citation.start_time));
    const targetVidId = citation.video_id || activeVideoId;
    const targetProjId = citation.project_id || selectedProjectId || 1;
    const currentSearchParams = new URLSearchParams(location.search);
    const currentStep = currentSearchParams.get("step");

    // If jump from workspace or different video, navigate directly to target project & video
    if (targetVidId && (targetVidId !== activeVideoId || targetProjId !== selectedProjectId)) {
      navigate(
        `/workspace/project/${targetProjId}/video/${targetVidId}?step=review-export&t=${targetSec}`
      );
      return;
    }

    // If on the same video but not yet on review-export step, switch to review-export step
    if (targetVidId && currentStep !== "review-export") {
      navigate(
        `/workspace/project/${targetProjId}/video/${targetVidId}?step=review-export&t=${targetSec}`
      );
      return;
    }

    // If already on the same video AND at step=review-export, seek video directly
    if (activeVideoId) {
      const videoEl = document.querySelector("video") as HTMLVideoElement | null;
      if (videoEl) {
        videoEl.currentTime = targetSec;
        videoEl.play().catch(() => {});
      }
      currentSearchParams.set("t", String(targetSec));
      navigate({ search: currentSearchParams.toString() }, { replace: true });
    } else if (citation.project_id || selectedProjectId) {
      const pid = citation.project_id || selectedProjectId;
      navigate(`/workspace/project/${pid}`);
    }
  };

  const quickPrompts = activeVideoId
    ? [
        "Tổng kết nội dung video này",
        "Có đoạn nào nói về chi phí hay giá không?",
        "Trích xuất các mốc thời gian quan trọng",
      ]
    : [
        "Tìm video có nhắc đến trí tuệ nhân tạo",
        "Hướng dẫn dịch video sang tiếng Anh",
        "Kiểm tra gói cước và quota của tôi",
      ];

  const toneOptions = [
    "Tự nhiên, súc tích",
    "Dễ hiểu (ELI5 / Cho người mới)",
    "Chuyên sâu kỹ thuật",
    "Gạch đầu dòng ngắn gọn",
    "Trang trọng, học thuật",
  ];

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-indigo-500 text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-indigo-500/50 cursor-pointer group"
          title="VidNova AI Video Assistant (RAG & Chat)"
        >
          <Sparkles className="h-6 w-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-black text-white items-center justify-center">
              AI
            </span>
          </span>
        </button>
      )}

      {/* Chatbox Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl backdrop-blur-xl transition-all duration-200 overflow-hidden ${
            isExpanded
              ? "h-[740px] w-[720px] max-w-[calc(100vw-3rem)]"
              : showHistoryDrawer
              ? "h-[600px] w-[560px] max-w-[calc(100vw-2rem)]"
              : "h-[600px] w-[420px] max-w-[calc(100vw-2rem)]"
          }`}
        >
          {/* Header (Clean, ChatGPT-style) */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-sm">
                <Bot size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                    VidNova AI
                  </h3>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-500">
                    RAG Live
                  </span>
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[190px]">
                  {activeVideoId
                    ? `Video #${activeVideoId}`
                    : "Workspace Assistant"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* History Sidebar Toggle */}
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                  showHistoryDrawer
                    ? "bg-[var(--color-surface-muted)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                }`}
                title={showHistoryDrawer ? "Ẩn danh sách phiên chat" : "Hiện danh sách phiên chat"}
              >
                <PanelLeft size={15} />
              </button>

              {/* New Chat */}
              <button
                type="button"
                onClick={handleNewChat}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] transition"
                title="Tạo hội thoại mới"
              >
                <PlusCircle size={14} />
              </button>

              {/* Expand / Minimize */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] transition"
                title={isExpanded ? "Thu nhỏ" : "Phóng to"}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] transition"
                title="Đóng chatbox"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Main Container with Sidebar + Chat Area */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Sidebar: Pure Chat Sessions */}
            <div
              className={`flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 transition-all duration-200 shrink-0 ${
                showHistoryDrawer ? "w-52" : "w-0 overflow-hidden border-none"
              }`}
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
                <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Sessions
                </span>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition"
                  title="Đoạn chat mới"
                >
                  <PlusCircle size={11} /> Mới
                </button>
              </div>

              {/* Sidebar Items List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
                {sessions.length === 0 ? (
                  <p className="p-2 text-[10px] text-[var(--color-text-muted)] italic leading-relaxed">
                    Chưa có phiên hội thoại nào.
                  </p>
                ) : (
                  sessions.map((s) => {
                    const isActive = s.id === activeSessionId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectSession(s.id)}
                        className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] transition cursor-pointer ${
                          isActive
                            ? "bg-[var(--color-primary)] text-white font-medium shadow-sm"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                        }`}
                        title={s.title}
                      >
                        <div className="flex items-center gap-1.5 truncate pr-1">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              isActive ? "bg-white" : "bg-emerald-500 opacity-60"
                            }`}
                          />
                          <span className="truncate">{s.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 transition shrink-0 ${
                            isActive ? "text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                          }`}
                          title="Xóa phiên này"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={handleClearAllSessions}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition cursor-pointer"
                  title="Xóa toàn bộ lịch sử các phiên chat"
                >
                  <Trash2 size={11} /> Xóa tất cả các phiên
                </button>
              </div>
            </div>

            {/* Right: Main Chat Messages & Input Area */}
            <div className="flex flex-1 flex-col overflow-hidden bg-[var(--color-surface)]">
              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2.5 ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {m.role === "assistant" && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] mt-0.5">
                        <Sparkles size={12} />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] leading-relaxed ${
                        m.role === "user"
                          ? "bg-[var(--color-primary)] text-white font-medium rounded-tr-none"
                          : "border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] rounded-tl-none shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.message}</p>

                      {/* Timestamp Citations */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-[var(--color-border)]/60 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                            Đoạn trích dẫn liên quan:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {m.citations.map((cite, cIdx) => {
                              const vName = cite.video_title ? cite.video_title.replace(/\.[^/.]+$/, "") : "";
                              const shortVName = vName.length > 18 ? vName.slice(0, 18) + "..." : vName;
                              const showVideoTag = !activeVideoId && Boolean(shortVName);

                              return (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => handleJumpToTimestamp(cite)}
                                  title={cite.text}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)]/10 px-2 py-1 text-[10px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition cursor-pointer"
                                >
                                  <Play size={10} className="fill-current" />
                                  {showVideoTag && (
                                    <span className="font-medium opacity-80 border-r border-[var(--color-primary)]/30 pr-1.5">
                                      {shortVName}
                                    </span>
                                  )}
                                  <span>{cite.timestamp_formatted}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {m.role === "user" && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] mt-0.5">
                        <User size={12} />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs pl-2">
                    <Loader2 size={14} className="animate-spin text-[var(--color-primary)]" />
                    <span>AI đang phân tích và tạo câu trả lời...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              <div className="px-3 py-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none">
                {quickPrompts.map((qp, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => handleSendMessage(qp)}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition shrink-0"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Footer Input - ChatGPT Style */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 focus-within:border-[var(--color-primary)] focus-within:bg-[var(--color-surface)] focus-within:shadow-sm transition-all p-2.5 gap-2">
                  <textarea
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      activeVideoId
                        ? "Hỏi tóm tắt, giải thích nội dung hoặc tìm mốc câu thoại..."
                        : "Tìm kiếm lời thoại, hỏi đáp AI trong toàn bộ dự án..."
                    }
                    className="w-full bg-transparent border-none outline-none text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none max-h-24 scrollbar-none leading-relaxed"
                  />

                  {/* Actions / Selectors Bar inside Capsule */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-[var(--color-border)]/40">
                    <div className="flex items-center gap-2">
                      {/* Model Selector Pill */}
                      <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 shadow-xs hover:border-[var(--color-primary)]/60 transition">
                        <Cpu size={11} className="text-[var(--color-primary)] shrink-0" />
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="bg-transparent text-[10px] font-medium text-[var(--color-text-secondary)] outline-none cursor-pointer pr-1"
                          title="Chọn mô hình AI xử lý"
                        >
                          <option value="auto">Auto (Free Fast)</option>
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash (Google)</option>
                          <option value="groq-llama-3.3-70b">Groq Llama 3.3 (Cực nhanh)</option>
                          <option value="ollama-local">Ollama Local (Offline)</option>
                        </select>
                      </div>

                      {/* Tone Selector Pill */}
                      <div className="hidden sm:flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 shadow-xs hover:border-[var(--color-primary)]/60 transition">
                        <select
                          value={selectedTone}
                          onChange={(e) => setSelectedTone(e.target.value)}
                          className="bg-transparent text-[10px] text-[var(--color-text-secondary)] outline-none cursor-pointer pr-1"
                          title="Phong cách trả lời"
                        >
                          {toneOptions.map((tone) => (
                            <option key={tone} value={tone}>
                              {tone}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isLoading}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-30 disabled:hover:bg-[var(--color-primary)] transition shrink-0 cursor-pointer shadow-xs"
                      title="Gửi câu hỏi"
                    >
                      <Send size={12} className={inputValue.trim() ? "translate-x-0.5" : ""} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
