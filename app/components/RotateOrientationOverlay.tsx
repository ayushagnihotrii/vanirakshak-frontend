"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw } from "lucide-react";

export default function RotateOrientationOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if device is a phone/mobile or small touchscreen
      const isMobileDevice =
        /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) ||
        (window.matchMedia &&
          window.matchMedia("(hover: none) and (pointer: coarse)").matches) ||
        window.innerWidth < 800;

      // Check if current screen orientation is portrait (height > width)
      const isPortrait =
        window.innerHeight > window.innerWidth ||
        (window.matchMedia &&
          window.matchMedia("(orientation: portrait)").matches);

      // Only show on mobile devices in portrait mode if not manually dismissed
      if (isMobileDevice && isPortrait && !dismissed) {
        setShowOverlay(true);
      } else {
        // Automatically hides as soon as horizontal / landscape orientation is detected!
        setShowOverlay(false);
      }
    };

    // Initial check
    checkOrientation();

    // Listen to window resize, orientationchange, and screen.orientation
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener("change", checkOrientation);
    }

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
      if (window.screen && window.screen.orientation) {
        window.screen.orientation.removeEventListener("change", checkOrientation);
      }
    };
  }, [dismissed]);

  if (!showOverlay) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="rotate-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0C0B0A]/96 backdrop-blur-2xl p-6 text-center select-none"
      >
        {/* Ambient Warm Golden Spotlight */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(245, 158, 11, 0.18) 0%, transparent 70%)",
          }}
        />

        {/* Studio Content Card */}
        <div className="relative z-10 max-w-sm w-full rounded-3xl border border-amber-500/40 bg-[#161412]/95 p-7 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.22)] ring-1 ring-amber-400/25 flex flex-col items-center">
          {/* Logo & Category */}
          <div className="flex items-center gap-2 mb-6">
            <Image
              src="/vanirakshak-logo.jpg"
              alt="VaniRakshak"
              width={28}
              height={28}
              className="rounded-md ring-1 ring-amber-500/30"
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
              VaniRakshak 3D Studio
            </span>
          </div>

          {/* Animated 3D Phone Rotation Visual */}
          <div className="relative w-36 h-36 flex items-center justify-center my-2">
            {/* Luminous Outer Circle Arc with Rotation Indicator */}
            <div className="absolute inset-0 rounded-full border border-dashed border-amber-500/40 animate-[spin_10s_linear_infinite]" />
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-[#161412] px-1 text-amber-400">
              <RotateCw className="w-4 h-4 animate-spin [animation-duration:3s]" />
            </div>

            {/* Glowing Backdrop Blob */}
            <div className="absolute w-20 h-20 rounded-full bg-amber-500/15 blur-xl pointer-events-none" />

            {/* Rotating Smartphone Graphic (0deg -> 90deg -> 0deg) */}
            <motion.div
              animate={{
                rotate: [0, 90, 90, 0],
                scale: [1, 1.08, 1.08, 1],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.45, 0.75, 1],
              }}
              className="relative w-14 h-24 rounded-2xl border-2 border-amber-400 bg-stone-900/90 shadow-[0_0_20px_rgba(245,158,11,0.35)] flex flex-col items-center justify-between p-2"
            >
              {/* Phone Speaker Notch */}
              <div className="w-4 h-1 rounded-full bg-amber-400/70 mb-1" />

              {/* Screen Graphic Showing 3D Microphone Icon */}
              <div className="w-full flex-1 rounded-lg bg-black/60 border border-amber-500/20 flex items-center justify-center p-1">
                <div className="w-4 h-6 rounded-full border border-amber-400/80 bg-amber-400/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                </div>
              </div>

              {/* Phone Bottom Home Indicator */}
              <div className="w-5 h-0.5 rounded-full bg-amber-400/60 mt-1" />
            </motion.div>
          </div>

          {/* Heading */}
          <h3 className="mt-5 text-xl font-black tracking-tight text-stone-100 uppercase">
            Rotate To Landscape
          </h3>

          {/* Subtitle */}
          <p className="mt-2 text-xs text-stone-300 leading-relaxed font-sans px-2">
            Please turn your phone horizontally to experience the cinematic 3D interactive microphone and live defense console.
          </p>

          {/* Live Detector Pulse */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-mono text-amber-400">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>Detecting Horizontal Rotation...</span>
          </div>

          {/* Dismiss Button (Fallback if user has portrait lock on) */}
          <button
            onClick={() => setDismissed(true)}
            className="mt-5 text-[11px] font-mono text-stone-400 hover:text-amber-300 underline underline-offset-4 transition-colors cursor-pointer active:scale-95"
          >
            Continue in portrait mode anyway →
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
