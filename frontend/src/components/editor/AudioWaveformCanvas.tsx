// frontend/src/components/editor/AudioWaveformCanvas.tsx
import React, { useEffect, useRef, useState } from "react";

interface AudioWaveformCanvasProps {
  audioUrl?: string | null;
  duration: number;
  zoom: number; // pixels per second
  height?: number;
  barColor?: string;
  backgroundColor?: string;
}

// Global cache for decoded peaks so we don't re-decode on zoom changes
const peakCache = new Map<string, Float32Array>();

export const AudioWaveformCanvas: React.FC<AudioWaveformCanvasProps> = ({
  audioUrl,
  duration,
  zoom,
  height = 36,
  barColor = "#f59e0b",
  backgroundColor = "transparent",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rawPeaks, setRawPeaks] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const totalWidth = Math.max(800, (duration || 60) * zoom);

  // 1. Fetch & Decode Audio Data when audioUrl changes
  useEffect(() => {
    if (!audioUrl) {
      setRawPeaks(null);
      return;
    }

    if (peakCache.has(audioUrl)) {
      setRawPeaks(peakCache.get(audioUrl)!);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    async function decodeAudio() {
      try {
        const response = await fetch(audioUrl!);
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const AudioCtxClass =
          window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtxClass();

        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (isCancelled) return;

        // Downsample audio data to 8000 peak points for efficient caching
        const numSamples = 8000;
        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(channelData.length / numSamples);
        const peaks = new Float32Array(numSamples);

        for (let i = 0; i < numSamples; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j]);
          }
          peaks[i] = Math.min(1, (sum / blockSize) * 2.8); // normalize with speech gain
        }

        peakCache.set(audioUrl!, peaks);
        setRawPeaks(peaks);
        audioCtx.close();
      } catch (err) {
        // Audio decode may fail if video stream doesn't expose CORS or audio track
        console.warn("Waveform audio decode fallback to synthetic envelope:", err);
        setRawPeaks(null);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    decodeAudio();

    return () => {
      isCancelled = true;
    };
  }, [audioUrl]);

  // 2. Render peaks onto HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, totalWidth, height);
    } else {
      ctx.clearRect(0, 0, totalWidth, height);
    }

    const barWidth = 2.5;
    const barGap = 1.5;
    const step = barWidth + barGap;
    const numBars = Math.floor(totalWidth / step);
    const midY = height / 2;

    ctx.fillStyle = barColor;

    if (rawPeaks && rawPeaks.length > 0) {
      // Render from real decoded peaks
      const peakStep = rawPeaks.length / numBars;

      for (let i = 0; i < numBars; i++) {
        const peakIdx = Math.floor(i * peakStep);
        const amp = rawPeaks[peakIdx] || 0.05;
        const barH = Math.max(3, amp * (height * 0.88));
        const x = i * step;
        const y = midY - barH / 2;

        ctx.fillRect(x, y, barWidth, barH);
      }
    } else {
      // Realistic Organic Speech Envelope Generator
      // Generates speech bursts with pauses (simulating conversation)
      for (let i = 0; i < numBars; i++) {
        const t = (i / numBars) * (duration || 60);
        // Speech cadence modulator (words separated by micro pauses)
        const cadence = Math.sin(t * 2.8) * Math.cos(t * 1.1);
        const isPause = (Math.sin(t * 0.7) + Math.cos(t * 0.4)) < -0.4;
        
        let amp = 0.08;
        if (!isPause) {
          const detail = (Math.sin(i * 0.9) * 0.3 + Math.cos(i * 1.7) * 0.4 + 0.7);
          amp = Math.min(1, Math.max(0.12, Math.abs(cadence) * detail * 0.9));
        }

        const barH = Math.max(2.5, amp * (height * 0.85));
        const x = i * step;
        const y = midY - barH / 2;

        ctx.fillRect(x, y, barWidth, barH);
      }
    }
  }, [totalWidth, height, rawPeaks, barColor, backgroundColor, duration]);

  return (
    <div className="relative h-full flex items-center overflow-hidden">
      <canvas ref={canvasRef} className="block pointer-events-none" />
      {isLoading && (
        <span className="absolute left-3 text-[10px] font-mono text-amber-400/80 pointer-events-none">
          Đang phân tích phổ sóng âm thanh...
        </span>
      )}
    </div>
  );
};
