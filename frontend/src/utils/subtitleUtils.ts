// frontend/src/utils/subtitleUtils.ts

export interface SubtitleSegmentLike {
  start: number;
  end: number;
  text?: string;
  translated_text?: string;
  speaker?: string;
  [key: string]: any;
}

/**
 * Intelligently wraps text into balanced lines (e.g. max 2 lines),
 * preferring breaks at punctuation marks (, . ? ! ; :) and respecting existing manual newlines.
 */
export function formatSubtitleLines(
  text: string,
  maxLines: number = 2,
  maxChars: number = 38
): string {
  if (!text) return "";

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // If user explicitly created manual line breaks (\n):
  if (normalized.includes("\n")) {
    const rawLines = normalized
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (maxLines === 1) {
      return rawLines.join(" ");
    }
    if (maxLines > 0 && rawLines.length > maxLines) {
      return rawLines.slice(0, maxLines).join("\n");
    }
    return rawLines.join("\n");
  }

  const clean = normalized.replace(/\s+/g, " ");
  if (maxLines === 1 || clean.length <= maxChars) {
    return clean;
  }

  const words = clean.split(" ");
  if (words.length <= 1) return clean;

  if (maxLines === 2) {
    const totalLen = clean.length;
    const midTarget = Math.floor(totalLen / 2);
    let bestIdx = -1;
    let minDist = totalLen;
    let curPos = 0;

    // Search for punctuation boundary near center (within 35% of total text)
    for (let i = 0; i < words.length - 1; i++) {
      curPos += words[i].length + 1;
      const dist = Math.abs(curPos - midTarget);
      if (/[,.?!;:]$/.test(words[i])) {
        if (dist < totalLen * 0.35 && dist < minDist) {
          minDist = dist;
          bestIdx = i + 1;
        }
      }
    }

    // Fallback: find closest word boundary to middle
    if (bestIdx === -1) {
      bestIdx = 1;
      let clen = 0;
      for (let i = 0; i < words.length; i++) {
        clen += words[i].length + 1;
        if (clen >= midTarget) {
          bestIdx = Math.max(1, i);
          break;
        }
      }
    }

    const line1 = words.slice(0, bestIdx).join(" ");
    const line2 = words.slice(bestIdx).join(" ");
    return `${line1}\n${line2}`;
  }

  // maxLines > 2 or 0 (unlimited)
  const lines: string[] = [];
  let curWords: string[] = [];
  let curLen = 0;
  for (const w of words) {
    if (curLen + w.length + 1 > maxChars && curWords.length > 0) {
      lines.push(curWords.join(" "));
      curWords = [w];
      curLen = w.length;
    } else {
      curWords.push(w);
      curLen += w.length + 1;
    }
  }
  if (curWords.length > 0) lines.push(curWords.join(" "));
  if (maxLines > 0) return lines.slice(0, maxLines).join("\n");
  return lines.join("\n");
}

/**
 * Splits a single long segment into two sequential segments with proportional timestamps.
 * If explicitSplitTime is passed, it splits at that timestamp and aligns words accordingly.
 */
export function splitSegmentIntoTwo<T extends SubtitleSegmentLike>(
  segment: T,
  explicitSplitTime?: number
): [T, T] {
  const text = (segment.translated_text || segment.text || "").trim();
  const duration = Math.max(0.4, segment.end - segment.start);
  const words = text.split(/\s+/).filter(Boolean);

  let midIdx = Math.max(1, Math.floor(words.length / 2));

  // If explicit split time given, estimate word boundary based on time ratio
  if (explicitSplitTime !== undefined && explicitSplitTime > segment.start && explicitSplitTime < segment.end) {
    const timeRatio = Math.max(0.1, Math.min(0.9, (explicitSplitTime - segment.start) / duration));
    midIdx = Math.max(1, Math.min(words.length - 1, Math.round(words.length * timeRatio)));
  } else {
    // Prefer punctuation break near center
    for (let i = Math.max(1, midIdx - 2); i < Math.min(words.length - 1, midIdx + 3); i++) {
      if (/[,.?!;:]$/.test(words[i])) {
        midIdx = i + 1;
        break;
      }
    }
  }

  const firstText = words.slice(0, midIdx).join(" ");
  const secondText = words.slice(midIdx).join(" ");

  const ratio = firstText.length / Math.max(1, text.length);
  const splitTime = explicitSplitTime !== undefined
    ? Number(Math.max(segment.start + 0.2, Math.min(segment.end - 0.2, explicitSplitTime)).toFixed(3))
    : Number(
        Math.max(segment.start + 0.3, Math.min(segment.end - 0.3, segment.start + duration * ratio)).toFixed(3)
      );

  const seg1: T = {
    ...segment,
    end: splitTime,
    translated_text: firstText,
    ...(segment.text ? { text: firstText } : {}),
  };

  const seg2: T = {
    ...segment,
    id: Date.now(),
    start: splitTime,
    translated_text: secondText,
    ...(segment.text ? { text: secondText } : {}),
  };

  return [seg1, seg2];
}

/**
 * Automatically splits all segments in a list that exceed maxChars or maxDuration.
 */
export function autoSplitLongSegments<T extends SubtitleSegmentLike>(
  segments: T[],
  maxChars: number = 48,
  maxDuration: number = 5.0
): T[] {
  const result: T[] = [];
  for (const seg of segments) {
    const text = (seg.translated_text || seg.text || "").trim();
    const duration = seg.end - seg.start;

    if ((text.length > maxChars || duration > maxDuration) && duration >= 2.0 && text.split(/\s+/).length >= 4) {
      const [seg1, seg2] = splitSegmentIntoTwo(seg);
      result.push(seg1, seg2);
    } else {
      result.push(seg);
    }
  }
  return result;
}
