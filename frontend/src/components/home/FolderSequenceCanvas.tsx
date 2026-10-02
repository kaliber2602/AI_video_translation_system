import React, { useEffect, useRef, useState, useCallback } from "react";

// Global cache across all mounted instances to eliminate white screens when switching folders
const globalImageCache = new Map<string, HTMLImageElement>();

interface FolderSequenceCanvasProps {
  folderPath: string; // e.g., "/assets/hero-illustration_1"
  frameCount?: number; // total number of frames in folder, default 300
  totalFrames?: number; // alias for frameCount
  prefix?: string; // default "ezgif-frame-"
  extension?: string; // default ".jpg"
  progress: number; // 0 to 1 float
  className?: string;
  canvasClassName?: string;
  priorityFrameCount?: number;
  onLoaded?: () => void;
}

export const FolderSequenceCanvas: React.FC<FolderSequenceCanvasProps> = ({
  folderPath,
  frameCount = 300,
  totalFrames,
  prefix = "ezgif-frame-",
  extension = ".jpg",
  progress,
  className = "",
  canvasClassName = "",
  priorityFrameCount = 45,
  onLoaded,
}) => {
  const resolvedFrameCount = Math.max(1, totalFrames ?? frameCount);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const isLoadedRef = useRef<boolean[]>([]);
  const lastRenderedIndexRef = useRef<number>(-1);
  const lastDrawnImageRef = useRef<HTMLImageElement | null>(null);
  const [initialReady, setInitialReady] = useState(false);

  // Target and current interpolated (Lerped) frame indices
  const targetFrameRef = useRef<number>(0);
  const currentFrameRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  // Formatter for exact filenames: e.g. "ezgif-frame-001.jpg"
  const getFrameUrl = useCallback(
    (index: number) => {
      const paddedIndex = String(index + 1).padStart(3, "0");
      return `${folderPath}/${prefix}${paddedIndex}${extension}`;
    },
    [folderPath, prefix, extension]
  );

  // Ultra-Sharp 2.25x (Super-sampled +50% twice) Native Retina Renderer with Bicubic Filtering
  const drawFrame = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false,
    });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    // 2.25x Supersample (+50% twice over base 1.0/1.5x)
    const baseDpr = Math.max(window.devicePixelRatio || 1, 2);
    const superSampleDpr = baseDpr * 2.25;

    const iw = img.naturalWidth || 1280;
    const ih = img.naturalHeight || 720;

    // 2.25x internal buffer resolution multiplier (e.g. 2880x1620 internal canvas backing store)
    const boostedSourceW = Math.round(iw * 2.25);
    const boostedSourceH = Math.round(ih * 2.25);

    const screenTargetW = Math.max(1, Math.round(rect.width * superSampleDpr));
    const screenTargetH = Math.max(1, Math.round(rect.height * superSampleDpr));

    const targetInternalW = Math.max(screenTargetW, boostedSourceW);
    const targetInternalH = Math.max(screenTargetH, boostedSourceH);

    if (canvas.width !== targetInternalW || canvas.height !== targetInternalH) {
      canvas.width = targetInternalW;
      canvas.height = targetInternalH;
    }

    const cw = canvas.width;
    const ch = canvas.height;
    if (cw === 0 || ch === 0) return;

    // Strict bicubic high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Clean background fill
    ctx.fillStyle = "#F8F9FA";
    ctx.fillRect(0, 0, cw, ch);

    // Precise cover math preserving exact 16:9 aspect ratio centered with zero distortion
    const scale = Math.max(cw / iw, ch / ih);
    const renderW = Math.round(iw * scale);
    const renderH = Math.round(ih * scale);
    const offsetX = Math.round((cw - renderW) / 2);
    const offsetY = Math.round((ch - renderH) / 2);

    ctx.drawImage(img, 0, 0, iw, ih, offsetX, offsetY, renderW, renderH);
    lastDrawnImageRef.current = img;
  }, []);

  // Preload priority frames first, then progressively stream all remaining frames into global cache
  useEffect(() => {
    let isCancelled = false;
    imagesRef.current = new Array(resolvedFrameCount).fill(null);
    isLoadedRef.current = new Array(resolvedFrameCount).fill(false);
    lastRenderedIndexRef.current = -1;

    // If we have a previously drawn image from another folder, immediately draw it to prevent white flash
    if (lastDrawnImageRef.current && canvasRef.current) {
      drawFrame(lastDrawnImageRef.current);
    }

    let priorityLoaded = 0;
    const neededPriority = Math.min(priorityFrameCount, resolvedFrameCount);

    const loadImage = (idx: number, isPriority: boolean = false) => {
      return new Promise<void>((resolve) => {
        if (isCancelled) return resolve();
        const url = getFrameUrl(idx);

        // Check global cache first to prevent any re-downloading or white flashes
        if (globalImageCache.has(url)) {
          const cachedImg = globalImageCache.get(url)!;
          imagesRef.current[idx] = cachedImg;
          isLoadedRef.current[idx] = true;

          if (idx === 0 && lastRenderedIndexRef.current === -1) {
            drawFrame(cachedImg);
            lastRenderedIndexRef.current = 0;
          }

          if (isPriority) {
            priorityLoaded++;
            if (priorityLoaded >= neededPriority) {
              setInitialReady(true);
              onLoaded?.();
            }
          }
          return resolve();
        }

        const img = new Image();
        img.src = url;
        img.decoding = "async";
        img.onload = () => {
          if (isCancelled) return resolve();
          globalImageCache.set(url, img);
          imagesRef.current[idx] = img;
          isLoadedRef.current[idx] = true;

          // Render first frame immediately once loaded
          if (idx === 0 && lastRenderedIndexRef.current === -1) {
            drawFrame(img);
            lastRenderedIndexRef.current = 0;
          }

          if (isPriority) {
            priorityLoaded++;
            if (priorityLoaded >= neededPriority) {
              setInitialReady(true);
              onLoaded?.();
            }
          }
          resolve();
        };
        img.onerror = () => {
          if (isPriority) {
            priorityLoaded++;
            if (priorityLoaded >= neededPriority) {
              setInitialReady(true);
              onLoaded?.();
            }
          }
          resolve();
        };
      });
    };

    // Priority parallel loading
    const priorityPromises: Promise<void>[] = [];
    for (let i = 0; i < neededPriority; i++) {
      priorityPromises.push(loadImage(i, true));
    }

    Promise.all(priorityPromises).then(() => {
      if (isCancelled) return;
      setInitialReady(true);

      // Background streaming for complete frame collection
      const queueRemaining = async () => {
        const batchSize = 12;
        for (let i = neededPriority; i < resolvedFrameCount; i += batchSize) {
          if (isCancelled) break;
          const batch: Promise<void>[] = [];
          for (let b = 0; b < batchSize && i + b < resolvedFrameCount; b++) {
            batch.push(loadImage(i + b, false));
          }
          await Promise.all(batch);
          await new Promise((r) => setTimeout(r, 4));
        }
      };
      queueRemaining();
    });

    return () => {
      isCancelled = true;
    };
  }, [folderPath, resolvedFrameCount, getFrameUrl, priorityFrameCount, drawFrame, onLoaded]);

  // Exact 100% full-frame linear mapping: maps [0, 1] strictly to [0, resolvedFrameCount - 1]
  useEffect(() => {
    const clampedProgress = Math.max(0, Math.min(1, isNaN(progress) ? 0 : progress));
    const exactTarget = clampedProgress * (resolvedFrameCount - 1);
    targetFrameRef.current = Math.min(resolvedFrameCount - 1, Math.max(0, exactTarget));
  }, [progress, resolvedFrameCount]);

  // Buttery-Smooth Lerp Animation Loop with Continuous RequestAnimationFrame
  useEffect(() => {
    let isRunning = true;

    const tick = () => {
      if (!isRunning) return;

      const target = targetFrameRef.current;
      const current = currentFrameRef.current;
      const diff = target - current;

      // Dynamic cinematic smoothing: snappy on large jumps, buttery on slow scrub
      if (Math.abs(diff) > 0.02) {
        currentFrameRef.current += diff * 0.22;
      } else {
        currentFrameRef.current = target;
      }

      const activeIndex = Math.min(
        resolvedFrameCount - 1,
        Math.max(0, Math.round(currentFrameRef.current))
      );

      if (activeIndex !== lastRenderedIndexRef.current) {
        // Nearest frame fallback if target frame is still streaming in
        let frameToDraw: HTMLImageElement | null = imagesRef.current[activeIndex];

        if (!frameToDraw || !isLoadedRef.current[activeIndex]) {
          let bestDistance = Infinity;
          let bestIdx = -1;
          for (let i = activeIndex; i >= 0; i--) {
            if (imagesRef.current[i] && isLoadedRef.current[i]) {
              bestIdx = i;
              bestDistance = activeIndex - i;
              break;
            }
          }
          for (let i = activeIndex + 1; i < resolvedFrameCount; i++) {
            if (imagesRef.current[i] && isLoadedRef.current[i]) {
              if (i - activeIndex < bestDistance) {
                bestIdx = i;
              }
              break;
            }
          }
          if (bestIdx !== -1) {
            frameToDraw = imagesRef.current[bestIdx];
          } else if (lastDrawnImageRef.current) {
            // Keep last drawn image instead of showing white space!
            frameToDraw = lastDrawnImageRef.current;
          }
        }

        if (frameToDraw && frameToDraw.complete) {
          drawFrame(frameToDraw);
          lastRenderedIndexRef.current = activeIndex;
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [resolvedFrameCount, drawFrame]);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      const activeIndex = Math.min(
        resolvedFrameCount - 1,
        Math.max(0, Math.round(currentFrameRef.current))
      );
      const currentImg =
        imagesRef.current[activeIndex] ||
        imagesRef.current[lastRenderedIndexRef.current] ||
        lastDrawnImageRef.current ||
        imagesRef.current[0];
      if (currentImg && currentImg.complete) {
        drawFrame(currentImg);
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [drawFrame, resolvedFrameCount]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none bg-[#F8F9FA] ${className}`}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          imageRendering: "-webkit-optimize-contrast",
        }}
        className={`w-full h-full object-cover block transition-opacity duration-300 ${
          initialReady ? "opacity-100" : "opacity-95"
        } ${canvasClassName}`}
      />

      {/* 
        Seamless Apple-style luminous light-theme edge feathering:
        100% invisible blending between frame borders and the surrounding #F8F9FA page.
      */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 48%, rgba(248, 249, 250, 0.3) 72%, #F8F9FA 96%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#F8F9FA] via-[#F8F9FA]/70 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA]/70 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#F8F9FA] via-[#F8F9FA]/70 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-[#F8F9FA] via-[#F8F9FA]/70 to-transparent z-10" />
    </div>
  );
};

export default FolderSequenceCanvas;
