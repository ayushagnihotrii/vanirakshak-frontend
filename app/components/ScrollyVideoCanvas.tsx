"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { STAGES } from "./PipelineStages";

const TOTAL_FRAMES = 220;

export default function ScrollyVideoCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Array of loaded images
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const targetFrameRef = useRef<number>(0);
  const currentFrameRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const canvasSizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });
  const lastDrawnImgRef = useRef<HTMLImageElement | null>(null);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [displayedFrame, setDisplayedFrame] = useState(0);

  // Active stage (0, 1, 2, 3) or null if closed (default: closed so canvas & hero are 100% clean)
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const stageSectionRef = useRef<HTMLDivElement | null>(null);

  // Sync canvas internal resolution with physical client size (called on resize, not per-frame)
  const syncCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    canvasSizeRef.current = { width: w, height: h, dpr };
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }, []);

  // Click outside listener: dismiss stage card when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        stageSectionRef.current &&
        !stageSectionRef.current.contains(event.target as Node)
      ) {
        setActiveStage(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Helper to get formatted frame path (with cache-buster to ensure clean frames load)
  const getFrameUrl = (frameIndex: number) => {
    const frameNum = Math.min(TOTAL_FRAMES, Math.max(1, frameIndex + 1));
    const padNum = String(frameNum).padStart(4, "0");
    return `/frames/frame_${padNum}.webp?v=2`;
  };

  // Draw a specific frame onto the canvas using cached dimensions & integer pixel coordinates
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Use cached dimensions to prevent synchronous layout reflows (eliminates 1ms jitter)
    let { width: canvasWidth, height: canvasHeight, dpr } = canvasSizeRef.current;
    if (canvasWidth === 0 || canvasHeight === 0) {
      syncCanvasDimensions();
      ({ width: canvasWidth, height: canvasHeight, dpr } = canvasSizeRef.current);
      if (canvasWidth === 0 || canvasHeight === 0) return;
    }

    // Find requested frame or fallback to last successfully drawn frame (prevents flicker/jump)
    let img: HTMLImageElement | null = imagesRef.current[frameIndex] || null;
    if (!img || !img.complete || img.naturalWidth === 0) {
      img = lastDrawnImgRef.current;
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;
    lastDrawnImgRef.current = img;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Calculate aspect ratio cover with integer pixel snapping
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
    }

    const snappedDrawWidth = Math.round(drawWidth);
    const snappedDrawHeight = Math.round(drawHeight);
    const snappedOffsetX = Math.round(offsetX);
    const snappedOffsetY = Math.round(offsetY);

    // High quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(img, snappedOffsetX, snappedOffsetY, snappedDrawWidth, snappedDrawHeight);

    // Seamlessly erase the video's baked-in black dots on the right side
    const scaleX = snappedDrawWidth / 1920;
    const scaleY = snappedDrawHeight / 1080;
    ctx.drawImage(
      img,
      1775,
      535,
      6,
      125,
      Math.round(snappedOffsetX + 1744 * scaleX),
      Math.round(snappedOffsetY + 535 * scaleY),
      Math.round(28 * scaleX),
      Math.round(125 * scaleY)
    );

    // Fully cover the background video's baked-in taskbar with seamless original background color
    const bakedNavHeight = Math.round(Math.max(0, snappedOffsetY) + 154 * scaleY);
    ctx.fillStyle = "#F0EDE2";
    ctx.fillRect(0, 0, canvasWidth, bakedNavHeight);

    ctx.restore();
  }, [syncCanvasDimensions]);

  // Load priority batch then stream remaining frames
  useEffect(() => {
    let isCancelled = false;
    const priorityIndices = [0, 20, 50, 80, 110, 140, 170, 200, 219];
    let loadedPriority = 0;

    priorityIndices.forEach((idx) => {
      const img = new Image();
      img.src = getFrameUrl(idx);
      img.onload = () => {
        if (isCancelled) return;
        imagesRef.current[idx] = img;
        loadedPriority++;
        if (loadedPriority === 1) {
          drawFrame(idx);
        }
        if (loadedPriority >= Math.min(4, priorityIndices.length)) {
          setIsReady(true);
        }
      };
    });

    const remainingIndices: number[] = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (!priorityIndices.includes(i)) {
        remainingIndices.push(i);
      }
    }

    let loadedRemaining = 0;
    const batchSize = 6;
    let curBatch = 0;

    const loadNextBatch = () => {
      if (isCancelled) return;
      const start = curBatch * batchSize;
      const end = Math.min(start + batchSize, remainingIndices.length);
      if (start >= remainingIndices.length) {
        setIsReady(true);
        return;
      }

      const nextIndices = remainingIndices.slice(start, end);
      let batchLoaded = 0;

      nextIndices.forEach((idx) => {
        const img = new Image();
        img.src = getFrameUrl(idx);
        img.onload = () => {
          if (isCancelled) return;
          imagesRef.current[idx] = img;
          loadedRemaining++;
          setLoadingProgress(
            Math.round(
              ((loadedPriority + loadedRemaining) / TOTAL_FRAMES) * 100
            )
          );
          batchLoaded++;
          if (batchLoaded === nextIndices.length) {
            curBatch++;
            setTimeout(loadNextBatch, 16);
          }
        };
        img.onerror = () => {
          batchLoaded++;
          if (batchLoaded === nextIndices.length) {
            curBatch++;
            setTimeout(loadNextBatch, 16);
          }
        };
      });
    };

    const timer = setTimeout(loadNextBatch, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [drawFrame]);

  // Handle Smooth Scroll & Frame Interpolation (Lerping)
  useEffect(() => {
    let lastRenderedFrame = -1;
    let lastReportedPct = -1;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxScroll = rect.height - window.innerHeight;

      if (maxScroll <= 0) return;

      const currentScroll = -rect.top;
      const rawProgress = Math.max(0, Math.min(1, currentScroll / maxScroll));

      // Throttle React state update to only when rounded integer percentage changes
      // (prevents 60-120 re-renders/sec, eliminating the 1ms main-thread jitter)
      const pct = Math.round(rawProgress * 100);
      if (pct !== lastReportedPct) {
        lastReportedPct = pct;
        setScrollProgress(rawProgress);
      }

      const target = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.round(rawProgress * (TOTAL_FRAMES - 1)))
      );
      targetFrameRef.current = target;
    };

    const handleResize = () => {
      syncCanvasDimensions();
      handleScroll();
      if (lastRenderedFrame >= 0) {
        drawFrame(lastRenderedFrame);
      }
    };

    // Animation render loop
    const renderLoop = () => {
      const delta = targetFrameRef.current - currentFrameRef.current;
      if (Math.abs(delta) > 0.005) {
        currentFrameRef.current += delta * 0.18;
      } else {
        currentFrameRef.current = targetFrameRef.current;
      }

      const frameToDraw = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.round(currentFrameRef.current))
      );

      if (frameToDraw !== lastRenderedFrame) {
        drawFrame(frameToDraw);
        lastRenderedFrame = frameToDraw;
        setDisplayedFrame(frameToDraw);
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    syncCanvasDimensions();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    handleScroll();
    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [drawFrame, syncCanvasDimensions]);

  // Jump to specific stage - opens stage card or toggles if clicked again
  const handleStageClick = (idx: number) => {
    setActiveStage((prev) => (prev === idx ? null : idx));

    // Smoothly rotate the mic canvas to this stage's representative frame
    if (containerRef.current) {
      const containerTop =
        containerRef.current.getBoundingClientRect().top + window.scrollY;
      const maxScroll = containerRef.current.scrollHeight - window.innerHeight;
      const targetProgress = (idx + 0.1) / 4;
      const targetScrollY = containerTop + targetProgress * maxScroll;

      window.scrollTo({
        top: targetScrollY,
        behavior: "smooth",
      });
    }
  };

  // Jump to live console dashboard
  const scrollToConsole = () => {
    const el = document.getElementById("console-dashboard");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[460vh] bg-slate-950 select-none"
    >
      {/* Sticky Fullscreen Stage with Original #F0EDE2 Background */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-[#F0EDE2]">
        {/* Canvas Visualizer (100% unobstructed on the right/center) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: isReady ? 1 : 0 }}
        />

        {/* Loading Progress Bar (Top edge) */}
        {loadingProgress < 100 && (
          <div className="absolute top-0 inset-x-0 z-40 h-1 bg-stone-300/30 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        )}

        {/* Right-Hand Controls: Bright Yellow Clickable Buttons (Matching User's Arrow & Pic 1) + Stage Card Popover */}
        {/* Docked strictly to the right side where the 4 dots are, 100% clearing the text. Dismisses on click outside. */}
        <div
          ref={stageSectionRef}
          className="absolute right-4 sm:right-8 md:right-12 top-1/2 -translate-y-1/2 z-30 flex flex-row-reverse items-center gap-3 sm:gap-4 pointer-events-auto"
        >
          {/* 4 Yellow Bright Clickable Stage Buttons (Matching User's Pic 1 & Dots on Right) */}
          <div className="flex flex-col items-center gap-4 py-3 px-2 rounded-full bg-[#E2DDD3]/80 border border-stone-400/40 backdrop-blur-md shadow-md shadow-stone-800/10">
            {STAGES.map((stage, idx) => {
              const isActive = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageClick(idx)}
                  className="group relative flex items-center justify-center p-1 transition-transform hover:scale-125 cursor-pointer"
                  title={`Stage ${stage.step}: ${stage.title}`}
                  aria-label={`Select Stage ${stage.step}`}
                >
                  {/* Hover tooltip (appearing to the left of the button) */}
                  <span className="absolute right-full mr-3.5 px-2.5 py-1 rounded-md bg-stone-950/95 text-amber-300 text-[10px] font-mono tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-40 border border-amber-500/30">
                    STAGE {stage.step} • {stage.title.split(" ")[0]}
                  </span>

                  {isActive ? (
                    /* Active Yellow Button with Outer Ring (Exact Match to Pic 1 Top Button) */
                    <div className="relative flex items-center justify-center">
                      <div className="h-6 w-6 rounded-full border-2 border-stone-800 flex items-center justify-center bg-amber-400/25 shadow-md shadow-amber-400/50">
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    /* Inactive Yellow Subtle Dot that lights up bright yellow on hover (Matching Pic 1 Lower Dots) */
                    <div className="h-2.5 w-2.5 rounded-full bg-stone-600/70 group-hover:bg-amber-400 group-hover:scale-125 group-hover:shadow-md group-hover:shadow-amber-400/70 transition-all duration-200" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Stage Card (Shown ONLY when a button is clicked, dismisses on click outside) */}
          {activeStage !== null && (
            <div className="max-sm:fixed max-sm:bottom-24 max-sm:inset-x-3 max-sm:w-auto sm:relative sm:w-[320px] md:w-[355px] max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-6rem)] z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-right-3 zoom-in-95">
              <div className="relative rounded-2xl border border-amber-500/35 bg-[#141210]/95 p-4 sm:p-5 backdrop-blur-2xl shadow-2xl shadow-black/85 text-stone-100 ring-1 ring-amber-500/20">
                {/* Header: [ • 01 ] Pill Badge, Phase X/4, and Close Button */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {STAGES[activeStage].step}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-stone-400 font-bold tracking-wider">
                      PHASE {activeStage + 1}/4
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStage(null);
                      }}
                      className="text-stone-400 hover:text-white p-0.5 rounded hover:bg-stone-800/80 transition-colors cursor-pointer"
                      title="Close"
                      aria-label="Close"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-amber-100 mb-1 leading-snug">
                  {STAGES[activeStage].title}
                </h3>
                <p className="text-xs font-semibold text-amber-400 mb-2 leading-tight">
                  {STAGES[activeStage].subtitle}
                </p>
                <p className="text-xs text-stone-300 leading-relaxed mb-3 sm:mb-4">
                  {STAGES[activeStage].description}
                </p>

                {/* Segmented Micro-Telemetry Bar */}
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#0B0A09] border border-stone-800/90 p-2 backdrop-blur-md">
                  {STAGES[activeStage].stats.map((st, sIdx) => (
                    <div key={sIdx} className="text-center px-1">
                      <div className="text-[8px] uppercase font-mono tracking-wider text-stone-400 mb-0.5 truncate">
                        {st.label}
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-white truncate">
                        {st.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Seamless Gradient Transition to Dark Console */}
        <div
          className="absolute bottom-0 inset-x-0 h-48 z-20 pointer-events-none transition-opacity duration-300"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(18, 17, 16, 0.4) 40%, rgba(18, 17, 16, 0.95) 85%, #121110 100%)",
            opacity: Math.min(1, Math.max(0, (scrollProgress - 0.75) * 4)),
          }}
        />

        {/* Bottom Control Bar with Frame counter & Scrub percent */}
        <div
          className="absolute bottom-4 sm:bottom-6 inset-x-0 z-30 flex items-center justify-between px-4 sm:px-10 text-xs font-mono pointer-events-none transition-opacity duration-300"
          style={{
            opacity: scrollProgress > 0.95 ? 0 : 1,
          }}
        >
          <div className="hidden sm:block ml-4 sm:ml-12 rounded-full border border-stone-400/30 bg-[#F6F5F2]/90 px-3 py-1 text-stone-800 backdrop-blur-md font-semibold shadow-sm">
            FRAME {String(displayedFrame + 1).padStart(3, "0")} / {TOTAL_FRAMES}
          </div>

          <button
            onClick={scrollToConsole}
            className="pointer-events-auto rounded-full bg-stone-900/90 hover:bg-stone-950 text-stone-100 px-3.5 py-1.5 sm:px-4 sm:py-2 font-sans font-semibold text-[11px] sm:text-xs border border-stone-700/60 backdrop-blur-md shadow-lg transition-all hover:scale-105 cursor-pointer"
          >
            Launch Live Mic Console ↓
          </button>

          <div className="rounded-full border border-stone-400/30 bg-[#F6F5F2]/90 px-2.5 py-1 sm:px-3 text-[10px] sm:text-xs text-stone-800 backdrop-blur-md font-semibold shadow-sm">
            {Math.round(scrollProgress * 100)}% EXPLORED
          </div>
        </div>
      </div>
    </div>
  );
}
