import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Code2,
  Columns,
  Eye,
  Download,
  Copy,
  Check,
  FileCode,
  FileType,
  Printer,
  ChevronDown,
} from "lucide-react";
import { videoService } from "../../../services/video.service";

interface SideBySideReportReviewProps {
  videoId: number;
  markdownContent: string;
  defaultFilename?: string;
  onContentChange?: (updatedContent: string) => void;
}

export default function SideBySideReportReview({
  videoId,
  markdownContent,
  defaultFilename = "video_report",
  onContentChange,
}: SideBySideReportReviewProps) {
  const [content, setContent] = useState(markdownContent);
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showExportMenu]);

  // Keep internal state synchronized if parent updates markdownContent
  React.useEffect(() => {
    setContent(markdownContent);
  }, [markdownContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (onContentChange) {
      onContentChange(val);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${defaultFilename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleDownloadDocx = async () => {
    try {
      setIsDownloadingDocx(true);
      const blob = await videoService.downloadSummaryDocx(videoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${defaultFilename}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download DOCX:", err);
    } finally {
      setIsDownloadingDocx(false);
      setShowExportMenu(false);
    }
  };

  const handlePrintPdf = () => {
    setShowExportMenu(false);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Convert basic markdown to styled HTML for print/PDF
    const renderedHtml = renderBasicMarkdown(content);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${defaultFilename} - Báo Cáo Phân Tích</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 40px; max-width: 800px; margin: auto; }
            h1 { font-size: 24px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 0; }
            h2 { font-size: 18px; color: #1e293b; margin-top: 28px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
            h3 { font-size: 15px; color: #4338ca; margin-top: 20px; }
            p { margin: 10px 0; font-size: 13.5px; }
            ul { padding-left: 20px; font-size: 13.5px; }
            li { margin: 6px 0; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; }
            .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${renderedHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  // Safe and clean custom Markdown to HTML Parser (headers, lists, inline code, bold, paragraphs)
  const renderBasicMarkdown = (md: string) => {
    const lines = md.split("\n");
    const htmlLines: string[] = [];
    let inList = false;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) {
          htmlLines.push("</ul>");
          inList = false;
        }
        continue;
      }

      if (trimmed.startsWith("# ")) {
        if (inList) { htmlLines.push("</ul>"); inList = false; }
        htmlLines.push(`<h1>${formatInline(trimmed.substring(2))}</h1>`);
      } else if (trimmed.startsWith("## ")) {
        if (inList) { htmlLines.push("</ul>"); inList = false; }
        htmlLines.push(`<h2>${formatInline(trimmed.substring(3))}</h2>`);
      } else if (trimmed.startsWith("### ")) {
        if (inList) { htmlLines.push("</ul>"); inList = false; }
        htmlLines.push(`<h3>${formatInline(trimmed.substring(4))}</h3>`);
      } else if (trimmed.startsWith("- ")) {
        if (!inList) {
          htmlLines.push("<ul>");
          inList = true;
        }
        htmlLines.push(`<li>${formatInline(trimmed.substring(2))}</li>`);
      } else {
        if (inList) { htmlLines.push("</ul>"); inList = false; }
        htmlLines.push(`<p>${formatInline(trimmed)}</p>`);
      }
    }
    if (inList) htmlLines.push("</ul>");
    return htmlLines.join("\n");
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})\]/g, '<span class="badge">$1</span>');
  };

  // Line numbers for editor pane
  const lineCount = (content.match(/\n/g) || []).length + 1;

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden transition-all">
      {/* Top Action & View Bar (VS Code / GitHub style) */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-2.5 gap-2">
        {/* Left: Document indicator */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <FileCode size={15} />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              {defaultFilename}.md
            </span>
            <span className="ml-2 text-[10px] text-[var(--color-text-muted)]">
              Báo cáo Phân tích & Tóm tắt Chuyên đề
            </span>
          </div>
        </div>

        {/* Center: View Switcher (Editor / Split / Preview) */}
        <div className="flex items-center rounded-xl bg-[var(--color-surface)] p-0.5 border border-[var(--color-border)] text-xs">
          <button
            type="button"
            onClick={() => setViewMode("editor")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition ${
              viewMode === "editor"
                ? "bg-[var(--color-primary)] text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            title="Chỉ mở trình soạn thảo Markdown"
          >
            <Code2 size={13} />
            <span className="hidden sm:inline">Source Code</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition ${
              viewMode === "split"
                ? "bg-[var(--color-primary)] text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            title="Xem song song Code & Live Preview"
          >
            <Columns size={13} />
            <span className="hidden sm:inline">Song song (Split)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition ${
              viewMode === "preview"
                ? "bg-[var(--color-primary)] text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            title="Chỉ mở xem trước đã render"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>

        {/* Right: Actions & Export Multi-format */}
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.2 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)] transition"
            title="Sao chép toàn bộ Markdown"
          >
            {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{isCopied ? "Đã chép" : "Sao chép"}</span>
          </button>

          {/* Export Dropdown (.md, .docx, .pdf) */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-1.2 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] shadow-xs transition"
              title="Tùy chọn tải báo cáo (.md, .docx, .pdf)"
            >
              <Download size={13} />
              <span>Xuất Báo Cáo</span>
              <ChevronDown size={12} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  disabled={isDownloadingDocx}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition"
                >
                  <FileType size={15} className="text-blue-500" />
                  <div>
                    <div className="font-bold">Microsoft Word (.docx)</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Bản in chuẩn báo cáo hành chính</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadMd}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition"
                >
                  <FileText size={15} className="text-emerald-500" />
                  <div>
                    <div className="font-bold">Markdown (.md)</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Mã nguồn tài liệu kỹ thuật</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition border-t border-[var(--color-border)]/50 mt-1 pt-1.5"
                >
                  <Printer size={15} className="text-rose-500" />
                  <div>
                    <div className="font-bold">In hoặc Lưu PDF (.pdf)</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Hộp thoại In / PDF trình duyệt</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Body: Dual Pane (Code Editor Left, Live Rendered Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)] h-[540px] bg-[var(--color-surface)]">
        {/* PANE 1: Markdown / Code Editor */}
        {(viewMode === "split" || viewMode === "editor") && (
          <div
            className={`flex flex-col h-full bg-[var(--color-surface)] ${
              viewMode === "editor" ? "col-span-full" : ""
            }`}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/30 text-[11px] text-[var(--color-text-muted)] font-mono">
              <span className="flex items-center gap-1">
                <Code2 size={12} className="text-[var(--color-primary)]" />
                <span>Text Editor (Markdown)</span>
              </span>
              <span>{lineCount} dòng</span>
            </div>

            <div className="flex-1 flex relative overflow-hidden font-mono text-xs">
              {/* Line numbers column */}
              <div className="w-10 bg-[var(--color-surface-muted)]/40 border-r border-[var(--color-border)]/40 p-3 select-none text-right text-[var(--color-text-muted)]/50 leading-relaxed font-mono">
                {Array.from({ length: Math.min(lineCount, 80) }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={content}
                onChange={handleChange}
                spellCheck={false}
                placeholder="Nhập nội dung Markdown báo cáo tại đây..."
                className="flex-1 h-full resize-none bg-transparent p-3 text-[var(--color-text-primary)] outline-none leading-relaxed overflow-y-auto scrollbar-thin selection:bg-[var(--color-primary)]/20"
              />
            </div>
          </div>
        )}

        {/* PANE 2: Live Formatted Preview (Rich HTML) */}
        {(viewMode === "split" || viewMode === "preview") && (
          <div
            className={`flex flex-col h-full bg-[var(--color-surface-muted)]/10 overflow-hidden ${
              viewMode === "preview" ? "col-span-full" : ""
            }`}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/30 text-[11px] text-[var(--color-text-muted)] font-mono">
              <span className="flex items-center gap-1">
                <Eye size={12} className="text-emerald-500" />
                <span>Live Rendered Preview</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Interactive
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 prose prose-slate dark:prose-invert max-w-none text-xs sm:text-[13px] leading-relaxed">
              <div
                dangerouslySetInnerHTML={{ __html: renderBasicMarkdown(content) }}
                className="space-y-3.5 [&_h1]:text-base [&_h1]:font-extrabold [&_h1]:text-[var(--color-text-primary)] [&_h1]:border-b [&_h1]:border-[var(--color-border)] [&_h1]:pb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[var(--color-text-primary)] [&_h2]:mt-5 [&_h2]:border-b [&_h2]:border-[var(--color-border)]/40 [&_h2]:pb-1.5 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-[var(--color-primary)] [&_h3]:mt-3.5 [&_p]:text-[var(--color-text-secondary)] [&_p]:leading-relaxed [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_li]:text-[var(--color-text-secondary)] [&_.badge]:font-mono [&_.badge]:bg-[var(--color-primary)]/10 [&_.badge]:text-[var(--color-primary)] [&_.badge]:px-1.5 [&_.badge]:py-0.5 [&_.badge]:rounded-md [&_.badge]:font-bold [&_.badge]:text-[11px] [&_code]:font-mono [&_code]:bg-[var(--color-surface-muted)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:border [&_code]:border-[var(--color-border)]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
