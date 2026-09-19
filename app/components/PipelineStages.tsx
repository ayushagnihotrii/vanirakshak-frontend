"use client";

import React, { useState } from "react";
import { Radio, Activity, Cpu, Lock, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CanvasRevealEffect } from "./ui/canvas-reveal-effect";

export interface StageInfo {
  id: string;
  step: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  stats: { label: string; value: string }[];
  icon: typeof Radio;
  color: string;
}

export const STAGES: StageInfo[] = [
  {
    id: "stage-ingest",
    step: "01",
    badge: "STAGE 01 • INGESTION",
    title: "Edge-First Audio Ingestion",
    subtitle: "Lossless acoustic capture & spectral baseline calibration",
    description:
      "VaniRakshak hooks directly into incoming raw PCM audio streams, sampling micro-transients and background acoustic ambient profiles with zero buffer latency.",
    stats: [
      { label: "Capture Latency", value: "< 12 ms" },
      { label: "Sample Depth", value: "16-bit PCM" },
      { label: "Channel Isolation", value: "Real-time" },
    ],
    icon: Radio,
    color: "amber",
  },
  {
    id: "stage-spectral",
    step: "02",
    badge: "STAGE 02 • MULTI-TIER ANALYSIS",
    title: "Deep Spectral Inspection",
    subtitle: "Frequency domain decomposition & artifact tracking",
    description:
      "Instantaneous Short-Time Fourier Transform (STFT) and bi-spectral analysis scan for neural vocoder phase discontinuities, synthetic smoothing, and diffusion footprint.",
    stats: [
      { label: "Inference Window", value: "1.5s Sliding" },
      { label: "Feature Vectors", value: "Acoustic + FFT" },
      { label: "Detection Engine", value: "AASIST / LFCC" },
    ],
    icon: Activity,
    color: "sky",
  },
  {
    id: "stage-spoof",
    step: "03",
    badge: "STAGE 03 • BIOMETRIC DEFENSE",
    title: "Acoustic Spoof Detection",
    subtitle: "Synthetic voice scoring & speaker resonance verification",
    description:
      "Cross-analyzes vocal tract resonance and authentic biological micro-jitter against generative voice synthesis engines (ElevenLabs, Bark, VALL-E, XTTS).",
    stats: [
      { label: "Spoof Confidence", value: "Multi-Model" },
      { label: "Speaker Sim", value: "Cosine Dist" },
      { label: "False Reject Rate", value: "< 0.4%" },
    ],
    icon: Cpu,
    color: "emerald",
  },
  {
    id: "stage-interlock",
    step: "04",
    badge: "STAGE 04 • AUTONOMOUS ACTION",
    title: "Real-Time Interlock & Quarantine",
    subtitle: "Zero-latency mitigation before transaction commit",
    description:
      "Autonomous risk adjudication immediately enforces security policy: triggering an interactive dynamic challenge phrase or instantly isolating the suspicious channel.",
    stats: [
      { label: "Decision Time", value: "< 45 ms" },
      { label: "Action Options", value: "Allow / Block" },
      { label: "Interlock", value: "Hardware & API" },
    ],
    icon: Lock,
    color: "rose",
  },
];

const StageCardWithCanvasReveal = ({
  stage,
  idx,
  isSelected,
  onClick,
}: {
  stage: StageInfo;
  idx: number;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const [hovered, setHovered] = useState(false);

  // Vibrant luminous yellow pixel design for all 4 stage cards
  const yellowColors: number[][] = [
    [250, 204, 21], // yellow-400
    [245, 158, 11], // amber-500
    [254, 240, 138], // yellow-200 highlight
  ];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group/canvas-card relative rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer min-h-[360px] sm:min-h-[420px] ${
        isSelected
          ? "border-amber-500/70 bg-[#161412] shadow-xl shadow-amber-500/15 ring-1 ring-amber-500/40 -translate-y-1"
          : "border-stone-800/90 bg-[#121110]/95 hover:border-stone-600 hover:shadow-2xl hover:shadow-black/70 hover:-translate-y-1"
      }`}
    >
      {/* Aceternity UI Canvas Reveal Effect on Hover / Selection */}
      <AnimatePresence>
        {(hovered || isSelected) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 h-full w-full pointer-events-none z-0 overflow-hidden"
          >
            <CanvasRevealEffect
              animationSpeed={2.8}
              containerClassName="bg-[#0A0908]"
              colors={yellowColors}
              dotSize={2.5}
              showGradient={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signature Aceternity Corner Tech Crosshairs */}
      <div className="absolute top-2.5 left-2.5 w-2 h-2 border-t border-l border-stone-600/50 pointer-events-none z-20 group-hover/canvas-card:border-amber-400 transition-colors" />
      <div className="absolute top-2.5 right-2.5 w-2 h-2 border-t border-r border-stone-600/50 pointer-events-none z-20 group-hover/canvas-card:border-amber-400 transition-colors" />
      <div className="absolute bottom-2.5 left-2.5 w-2 h-2 border-b border-l border-stone-600/50 pointer-events-none z-20 group-hover/canvas-card:border-amber-400 transition-colors" />
      <div className="absolute bottom-2.5 right-2.5 w-2 h-2 border-b border-r border-stone-600/50 pointer-events-none z-20 group-hover/canvas-card:border-amber-400 transition-colors" />

      {/* Card Content Overlay (z-10 ensures full text legibility over canvas animation) */}
      <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-between h-full bg-gradient-to-t from-[#0E0C0A]/95 via-[#0E0C0A]/60 to-transparent">
        <div>
          {/* Header: Step & Badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-0.5 text-[9px] font-mono font-bold tracking-wider text-amber-400 uppercase backdrop-blur-md shadow-xs">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-amber-400 ${
                  isSelected ? "animate-pulse" : ""
                }`}
              />
              {stage.step}
            </div>
            <span className="text-[10px] font-mono text-stone-400 font-semibold tracking-wider">
              PHASE {idx + 1}/4
            </span>
          </div>

          {/* Title & Subtitle */}
          <h3 className="text-base sm:text-lg font-black tracking-tight text-white mb-1 leading-snug group-hover/canvas-card:text-amber-200 transition-colors">
            {stage.title}
          </h3>
          <p className="text-xs font-semibold text-amber-400/90 mb-3 leading-tight">
            {stage.subtitle}
          </p>
          <p className="text-xs text-stone-300/90 leading-relaxed mb-5">
            {stage.description}
          </p>
        </div>

        {/* Segmented Micro-Telemetry Grid */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#090807]/90 border border-stone-800/90 p-2 mt-auto backdrop-blur-md">
          {stage.stats.map((st, sIdx) => (
            <div key={sIdx} className="text-center px-0.5">
              <div className="text-[8px] uppercase font-mono tracking-wider text-stone-400 mb-0.5 truncate">
                {st.label}
              </div>
              <div className="text-[11px] font-bold text-white truncate font-mono">
                {st.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function PipelineStages() {
  const [activeStage, setActiveStage] = useState(0);

  return (
    <section
      id="pipeline-stages"
      className="relative z-10 py-12 sm:py-20 px-4 sm:px-10 max-w-7xl mx-auto scroll-mt-20 select-none"
    >
      {/* Section Header */}
      <div className="flex flex-col items-center text-center mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] sm:text-xs font-mono font-bold tracking-widest text-amber-400 uppercase mb-3 shadow-xs">
          <ShieldCheck className="h-3.5 w-3.5" />
          4-Stage Autonomous Defense Architecture
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-stone-100">
          How VaniRakshak Protects Voice Streams
        </h2>
        <p className="mt-2.5 max-w-2xl text-xs sm:text-sm md:text-base text-stone-400 font-sans px-2">
          From microsecond raw acoustic ingestion to sub-45ms transaction interlock quarantine, our multi-tiered verification pipeline operates seamlessly at the edge. Hover over any stage card to reveal the active neural dot matrix.
        </p>
      </div>

      {/* 4-Stage Progressive Pipeline Cards with Aceternity Canvas Reveal Effect */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {STAGES.map((stage, idx) => (
          <StageCardWithCanvasReveal
            key={stage.id}
            stage={stage}
            idx={idx}
            isSelected={activeStage === idx}
            onClick={() => setActiveStage(idx)}
          />
        ))}
      </div>
    </section>
  );
}
