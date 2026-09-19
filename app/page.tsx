"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Activity,
  ArrowUp,
  ArrowRight,
  CheckCircle2,
  Mic,
  Play,
  Square,
  Volume2,
  Lock,
  Sparkles,
  AlertOctagon,
  Download,
  Smartphone,
} from "lucide-react";
import ScrollyVideoCanvas from "./components/ScrollyVideoCanvas";
import { ContainerScroll } from "./components/container-scroll-animation";
import PipelineStages from "./components/PipelineStages";
import RotateOrientationOverlay from "./components/RotateOrientationOverlay";

type RiskAction = "ALLOW" | "CHALLENGE" | "BLOCK";

type AnalysisResult = {
  session_id?: string;
  window_index?: number;
  timestamp?: number;
  risk_score: number;
  action: RiskAction;
  spoof_score: number;
  speaker_similarity: number;
  snr_db: number;
  challenge_phrase?: string | null;
};

type EventLog = {
  id: number;
  time: string;
  message: string;
  severity: "info" | "warning" | "critical";
};

const BACKEND_WS = "ws://localhost:8000/ws/stream";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [risk, setRisk] = useState(0);
  const [alertMessage, setAlertMessage] = useState("No active security alert");
  const [alertPayload, setAlertPayload] = useState("");
  const [action, setAction] = useState<RiskAction>("ALLOW");
  const [spoofScore, setSpoofScore] = useState(0);
  const [speakerSimilarity, setSpeakerSimilarity] = useState(1);
  const [snr, setSnr] = useState(0);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedAirtelPack, setSelectedAirtelPack] = useState<number>(199);
  const [airtelActivated, setAirtelActivated] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const transactionLocked = action === "BLOCK" || risk >= 70;

  const riskLabel = useMemo(() => {
    if (risk >= 70) return "CRITICAL";
    if (risk >= 35) return "SUSPICIOUS";
    return "LOW RISK";
  }, [risk]);

  function addEvent(
    message: string,
    severity: EventLog["severity"] = "info"
  ) {
    setEvents((current) => [
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        message,
        severity,
      },
      ...current,
    ].slice(0, 12));
  }

  function selectAirtelPack(price: number) {
    setSelectedAirtelPack(price);
    setAirtelActivated(true);
    addEvent(
      `[AIRTEL 5G+] ₹${price} recharge confirmed. VaniRakshak Security Shield activated complimentary on mobile line.`,
      "info"
    );
  }

  function applyResult(result: AnalysisResult) {
    setRisk(result.risk_score);
    setAction(result.action);
    setSpoofScore(result.spoof_score);
    setSpeakerSimilarity(result.speaker_similarity);
    setSnr(result.snr_db);
    setChallenge(result.challenge_phrase ?? null);

    if (result.action === "BLOCK") {
      setAlertMessage("CRITICAL ALERT • Transaction blocked");
      setAlertPayload(
        `WEBHOOK/SMS/EMAIL ALERT → risk=${result.risk_score}, action=BLOCK`
      );
    } else if (result.action === "CHALLENGE") {
      setAlertMessage("SECURITY ALERT • Caller verification required");
      setAlertPayload(
        `WEBHOOK/SMS/EMAIL ALERT → risk=${result.risk_score}, action=CHALLENGE`
      );
    } else {
      setAlertMessage("No active security alert");
      setAlertPayload("");
    }

    if (result.action === "BLOCK") {
      addEvent(
        `Critical risk detected: transaction interlock activated`,
        "critical"
      );
    } else if (result.action === "CHALLENGE") {
      addEvent("Suspicious call: dynamic challenge requested", "warning");
    } else {
      addEvent("Call analysis normal: transaction allowed", "info");
    }
  }

  function connectToBackend() {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const sessionId = `r5-demo-${Date.now()}`;
    const ws = new WebSocket(
      `${BACKEND_WS}?session_id=${encodeURIComponent(sessionId)}`
    );

    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setDemoMode(false);
      addEvent("Connected to VaniRakshak backend", "info");
      startMicrophone(ws);
    };

    ws.onmessage = (message) => {
      try {
        const result: AnalysisResult = JSON.parse(message.data);
        applyResult(result);
      } catch {
        addEvent("Received an invalid backend message", "warning");
      }
    };

    ws.onerror = () => {
      addEvent(
        "Backend connection failed — demo mode can be used",
        "warning"
      );
    };

    ws.onclose = () => {
      setConnected(false);
      socketRef.current = null;
      addEvent("Backend connection closed", "warning");
    };

    async function startMicrophone(ws: WebSocket) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
          },
        });

        mediaStreamRef.current = stream;

        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }).webkitAudioContext;

        const audioContext = new AudioContextClass({
          sampleRate: 16000,
        });

        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);

        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const input = event.inputBuffer.getChannelData(0);

          let sum = 0;

          for (let i = 0; i < input.length; i++) {
            sum += input[i] * input[i];
          }

          const rms = Math.sqrt(sum / input.length);
          setAudioLevel(Math.min(100, Math.round(rms * 300)));

          const pcm = new Int16Array(input.length);

          for (let i = 0; i < input.length; i++) {
            const sample = Math.max(-1, Math.min(1, input[i]));
            pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
          }

          ws.send(pcm.buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        addEvent("Microphone streaming started", "info");
        setMicLive(true);
      } catch {
        addEvent("Microphone access failed", "warning");
      }
    }
  }

  function disconnect() {
    processorRef.current?.disconnect();
    processorRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;

    socketRef.current?.close();
    socketRef.current = null;

    setConnected(false);
    setMicLive(false);
    addEvent("Microphone streaming stopped", "info");
  }

  function startDemo() {
    disconnect();

    setDemoMode(true);
    addEvent("Demo mode started", "info");

    let step = 0;

    const demoResults: AnalysisResult[] = [
      {
        risk_score: 18,
        action: "ALLOW",
        spoof_score: 0.08,
        speaker_similarity: 0.91,
        snr_db: 29,
        challenge_phrase: null,
      },
      {
        risk_score: 43,
        action: "CHALLENGE",
        spoof_score: 0.55,
        speaker_similarity: 0.68,
        snr_db: 18,
        challenge_phrase: "Say: Mango 8 nadi 4 blue",
      },
      {
        risk_score: 87,
        action: "BLOCK",
        spoof_score: 0.91,
        speaker_similarity: 0.38,
        snr_db: 11,
        challenge_phrase: null,
      },
    ];

    applyResult(demoResults[0]);

    demoTimerRef.current = setInterval(() => {
      step++;

      if (step < demoResults.length) {
        applyResult(demoResults[step]);
      } else {
        step = 0;
      }
    }, 4000);
  }

  useEffect(() => {
    return () => {
      socketRef.current?.close();

      if (demoTimerRef.current) {
        clearInterval(demoTimerRef.current);
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#121110] text-stone-100 selection:bg-amber-500/30 selection:text-white">
      {/* Mobile Horizontal Orientation Prompt (Auto-Dismisses When Turned Landscape) */}
      <RotateOrientationOverlay />

      {/* Replicated VaniRakshak Studio Taskbar (Matching User Design) */}
      {/* Replicated VaniRakshak Studio Taskbar (Matching User Design) */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-[#D8D2C6] bg-[#F0EDE2] shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 sm:px-6 md:px-10 py-2 sm:py-3.5">
          {/* Logo & Brand Typography */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer select-none group shrink-0"
          >
            {/* Official VaniRakshak Logo */}
            <Image
              src="/vanirakshak-logo.jpg"
              alt="VaniRakshak"
              width={38}
              height={38}
              className="rounded-lg transition-transform duration-300 group-hover:scale-105 shadow-sm ring-1 ring-stone-400/20 sm:w-[42px] sm:h-[42px]"
              priority
            />

            {/* Brand Tagline */}
            <div className="flex flex-col justify-center">
              <div className="font-extrabold tracking-[0.14em] text-[#1E1A17] text-[13.5px] sm:text-[15px] leading-tight uppercase font-sans">
                VAANI
              </div>
              <div className="font-extrabold tracking-[0.14em] text-[#1E1A17] text-[13.5px] sm:text-[15px] leading-tight uppercase font-sans">
                RAKSHAK
              </div>
              <div className="hidden sm:block text-[7.5px] font-semibold tracking-[0.24em] text-[#73685F] uppercase mt-0.5 leading-none font-sans">
                SAVING VOICES • SECURING TOMORROW
              </div>
            </div>
          </div>

          {/* Navigation Links from the Image */}
          <nav className="flex items-center gap-2 sm:gap-6 md:gap-11">
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 sm:gap-9 md:gap-11">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-xs sm:text-[13px] font-semibold tracking-[0.16em] uppercase text-[#4A433B] hover:text-[#1E1A17] transition-colors cursor-pointer"
              >
                HOME
              </button>

              <button
                onClick={() => {
                  document.getElementById("pipeline-stages")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-xs sm:text-[13px] font-semibold tracking-[0.16em] uppercase text-[#4A433B] hover:text-[#1E1A17] transition-colors cursor-pointer"
              >
                FEATURES
              </button>

              <button
                onClick={() => {
                  document.getElementById("console-dashboard")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-xs sm:text-[13px] font-semibold tracking-[0.16em] uppercase text-[#4A433B] hover:text-[#1E1A17] transition-colors cursor-pointer"
              >
                OUR AI
              </button>

              <button
                onClick={() => {
                  document.getElementById("console-dashboard")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-xs sm:text-[13px] font-semibold tracking-[0.16em] uppercase text-[#4A433B] hover:text-[#1E1A17] transition-colors cursor-pointer"
              >
                IMPACT
              </button>
            </div>

            {/* VaniRakshak Working Mobile App Icon & Download Action */}
            <a
              href="https://drive.google.com/file/d/1HLIVbGuyS5sdVHKHcEn0hdfYruQy3nWQ/view?usp=drivesdk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-stone-900 to-[#181614] text-white border border-stone-700/80 shadow-md hover:shadow-lg hover:border-[#3DDC84]/70 hover:from-black hover:to-stone-900 transition-all duration-200 group cursor-pointer hover:scale-[1.03] active:scale-95 shrink-0"
              title="Download VaniRakshak Working Android App (APK)"
            >
              {/* Minimalist Highlighted Android Application Icon */}
              <div className="h-6 w-6 sm:h-7.5 sm:w-7.5 rounded-lg bg-gradient-to-br from-[#3DDC84]/25 via-[#10b981]/15 to-[#0b1f14] border border-[#3DDC84]/70 ring-1 ring-[#3DDC84]/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(61,220,132,0.35)] group-hover:shadow-[0_0_16px_rgba(61,220,132,0.6)] group-hover:border-[#3DDC84] transition-all duration-200">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-[#3DDC84] transition-transform duration-200 group-hover:scale-110 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.996-3.4572c.1556-.2696.0631-.6138-.2064-.7694-.2691-.1556-.6133-.0631-.7689.2065l-2.0296 3.5152C15.228 8.1633 13.6547 7.79 12 7.79c-1.6547 0-3.228.3733-4.8725 1.0265L5.0979 5.3013c-.1556-.2696-.4998-.3621-.7689-.2065-.2695.1556-.362.4998-.2064.7694l1.996 3.4572C2.6845 11.2335.3432 15.0397 0 19.5h24c-.3432-4.4603-2.6845-8.2665-6.1185-10.1786" />
                </svg>
              </div>

              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-stone-100 group-hover:text-white font-sans leading-none">
                    Working App
                  </span>
                  <span className="text-[7.5px] sm:text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-[#3DDC84]/20 text-[#3DDC84] border border-[#3DDC84]/40 uppercase tracking-tight">
                    APK
                  </span>
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3DDC84] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#3DDC84]"></span>
                  </span>
                </div>
                <span className="text-[8px] sm:text-[9px] font-mono text-stone-400 group-hover:text-[#3DDC84] transition-colors mt-0.5 leading-none flex items-center gap-1">
                  <span>click to download</span>
                  <Download className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-[#3DDC84] animate-bounce shrink-0" />
                </span>
              </div>
            </a>

            {/* Subtle Live Telemetry Badge & Quick Controller */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#D9D3C8]">
              <div
                onClick={connected || demoMode ? disconnect : startDemo}
                title={connected ? "Connected to Backend. Click to disconnect." : demoMode ? "Demo mode running. Click to stop." : "Click to run simulated demo"}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition cursor-pointer border ${
                  connected
                    ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/20"
                    : demoMode
                      ? "border-amber-600/40 bg-amber-600/10 text-amber-800 hover:bg-amber-600/20"
                      : "border-[#D9D3C8] bg-[#EDE8E0] text-[#6E6358] hover:bg-[#E2DDD3]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    connected
                      ? "bg-emerald-600 animate-pulse"
                      : demoMode
                        ? "bg-amber-600 animate-pulse"
                        : "bg-[#8C7F72]"
                  }`}
                />
                <span>
                  {connected
                    ? "MIC LIVE"
                    : demoMode
                      ? "DEMO"
                      : "STANDBY"}
                </span>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Immersive 3D Scrollytelling Visualizer (Unobstructed 3D Microphone) */}
      <ScrollyVideoCanvas />

      {/* Dedicated 4-Stage Autonomous Defense Architecture Section */}
      <PipelineStages />

      {/* Real-time Security Console with Aceternity 3D Container Scroll Animation */}
      <div id="console-dashboard" className="relative z-10 scroll-mt-14 overflow-hidden">
        {/* Clean Luxury Studio Ambient Spotlight */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 15%, rgba(245, 158, 11, 0.06) 0%, transparent 65%)",
          }}
        />
        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 sm:px-3.5 py-1 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-3 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Active Monitoring Deck
              </div>
              <h2 className="text-2xl sm:text-5xl md:text-6xl font-black tracking-tight text-stone-100 px-2 text-center">
                Live Acoustic Security Console
              </h2>
              <p className="mt-2.5 sm:mt-3 max-w-2xl text-xs sm:text-sm md:text-base text-stone-400 font-sans px-3 text-center">
                Real-time SASV speaker verification, neural vocoder spoof screening, and autonomous interlock
              </p>
            </div>
          }
        >
          {/* Hardware Console Interior */}
          <div className="p-3.5 sm:p-8 space-y-5 sm:space-y-6 bg-radial from-[#1e1b17] to-[#121110]">
            {/* Quick action bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-stone-800/80 pb-4 sm:pb-6">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-mono text-xs uppercase tracking-wider text-stone-300 font-semibold truncate">
                  Acoustic Interlock Core
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-stone-800 text-amber-400 border border-stone-700 font-bold shrink-0">
                  v2.4 READY
                </span>
              </div>

              {/* Quick action controls */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={connectToBackend}
                  disabled={connected}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs font-bold transition shadow-lg ${
                    connected
                      ? "border border-stone-800 bg-stone-900 text-stone-500 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20 active:scale-95 cursor-pointer"
                  }`}
                >
                  <Mic className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{connected ? "Mic Stream Active" : "Connect Mic Stream"}</span>
                </button>

                <button
                  onClick={startDemo}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-stone-700 bg-stone-900 px-3 sm:px-4 py-2 text-xs font-semibold text-stone-200 transition hover:bg-stone-800 active:scale-95 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Run Demo</span>
                </button>

                {(connected || demoMode) && (
                  <button
                    onClick={disconnect}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-stone-700 bg-stone-900/80 px-3 sm:px-4 py-2 text-xs font-semibold text-stone-300 transition hover:bg-rose-950/40 hover:border-rose-800/80 hover:text-rose-300 active:scale-95 cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">Disconnect</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main dashboard responsive layout: Left (2 cols) for security telemetry & interlock; Right (1 col) for vertical Airtel Carrier Integration */}
            <div className="grid gap-5 sm:gap-6 lg:grid-cols-3 items-stretch">
              {/* Left 2 Columns: All Security Telemetry, Evidence Breakdown, and Interlock Controls */}
              <div className="lg:col-span-2 space-y-5 sm:space-y-6">
                {/* Row 1: Threat Risk Meter + Alert Center & Dispatch */}
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                  {/* Risk meter */}
                  <div className="rounded-2xl border border-stone-800/90 bg-[#181614] p-4 sm:p-6 shadow-xl shadow-black/30">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                        <h3 className="font-bold text-stone-200 text-sm tracking-wide">Overall Threat Risk</h3>
                      </div>
                      <span className="font-mono text-xs text-stone-500">0–100 SCALE</span>
                    </div>

                    <div className="flex flex-col items-center py-4 sm:py-6">
                      <div className="relative flex h-44 w-44 sm:h-52 sm:w-52 items-center justify-center rounded-full border-[14px] sm:border-[18px] border-stone-800/70">
                        <div
                          className={`absolute inset-[-14px] sm:inset-[-18px] rounded-full border-[14px] sm:border-[18px] border-transparent transition-all duration-700 ${
                            risk >= 70
                              ? "border-t-rose-500"
                              : risk >= 35
                                ? "border-t-amber-500"
                                : "border-t-emerald-400"
                          }`}
                          style={{
                            transform: `rotate(${risk * 3.6}deg)`,
                          }}
                        />

                        <div className="text-center">
                          <div className="text-5xl sm:text-6xl font-black text-stone-100 tracking-tight">{risk}</div>
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-stone-400">
                            RISK SCORE
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-6 text-center">
                        <div
                          className={`text-base sm:text-lg font-black tracking-wide ${
                            risk >= 70
                              ? "text-rose-400"
                              : risk >= 35
                                ? "text-amber-400"
                                : "text-emerald-400"
                          }`}
                        >
                          {riskLabel}
                        </div>
                        <div className="mt-1 font-mono text-xs text-stone-400">
                          DECISION: <span className="font-bold text-stone-200">{action}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alert Center & Dispatch */}
                  <div className="rounded-2xl border border-stone-800/90 bg-[#181614] p-4 sm:p-6 shadow-xl shadow-black/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <AlertOctagon className="h-4 w-4 text-amber-400 shrink-0" />
                        <h3 className="font-bold text-stone-200 text-sm tracking-wide">Alert Center & Dispatch</h3>
                      </div>

                      <div className="rounded-xl border border-stone-800/80 bg-[#100f0e] p-3 sm:p-4">
                        <div className="text-xs sm:text-sm font-semibold text-stone-200">
                          {alertMessage}
                        </div>

                        <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
                          <div className="rounded-lg border border-stone-800/80 bg-[#141210] p-1.5 sm:p-2">
                            <div className="font-mono text-[9px] sm:text-[10px] uppercase text-stone-500">UI Console</div>
                            <div className="mt-1 font-bold text-emerald-400 text-[11px] sm:text-xs">ACTIVE</div>
                          </div>

                          <div className="rounded-lg border border-stone-800/80 bg-[#141210] p-1.5 sm:p-2">
                            <div className="font-mono text-[9px] sm:text-[10px] uppercase text-stone-500">Webhook</div>
                            <div className="mt-1 font-bold text-amber-400 text-[11px] sm:text-xs">SIMULATED</div>
                          </div>

                          <div className="rounded-lg border border-stone-800/80 bg-[#141210] p-1.5 sm:p-2">
                            <div className="font-mono text-[9px] sm:text-[10px] uppercase text-stone-500">SMS / Email</div>
                            <div className="mt-1 font-bold text-amber-400 text-[11px] sm:text-xs">SIMULATED</div>
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-4 rounded-lg border border-stone-800/80 bg-[#141210] p-2.5 sm:p-3">
                          <div className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-stone-500">
                            Simulated Dispatch Payload
                          </div>

                          <div className="mt-1 font-mono text-xs text-stone-300 truncate">
                            {alertPayload || "No active security alert payload"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4 text-[10px] sm:text-[11px] font-mono text-stone-500 flex items-center justify-between">
                      <span>AUDIT CHANNELS: 3 SECURE</span>
                      <span className="text-emerald-400 font-bold">READY</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Explainability Evidence & Signal Breakdown */}
                <div className="rounded-2xl border border-stone-800/90 bg-[#181614] p-4 sm:p-6 shadow-xl shadow-black/30">
                  <div className="mb-4 sm:mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-amber-400 shrink-0" />
                      <h3 className="font-bold text-stone-200 text-xs sm:text-sm tracking-wide">
                        Explainability Evidence & Signal Breakdown
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] sm:text-xs text-stone-500">4 CORE VECTORS</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    <EvidenceCard
                      title="Deepfake / Spoof"
                      value={`${Math.round(spoofScore * 100)}%`}
                      description="Synthetic vocoder likelihood"
                    />

                    <EvidenceCard
                      title="Speaker Similarity"
                      value={`${Math.round(speakerSimilarity * 100)}%`}
                      description="ECAPA-TDNN reference match"
                    />

                    <EvidenceCard
                      title="Channel SNR"
                      value={`${snr.toFixed(1)} dB`}
                      description="Acoustic background clarity"
                    />

                    <EvidenceCard
                      title="Live Audio Level"
                      value={`${Math.round(audioLevel)}%`}
                      description={micLive ? "16kHz PCM stream" : "Microphone idle"}
                    />
                  </div>

                  <div className="mt-4 sm:mt-5 rounded-xl border border-stone-800/80 bg-[#100f0e] p-3 sm:p-4">
                    <div className="mb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                      Decision Matrix Logic
                    </div>

                    <p className="text-xs sm:text-sm leading-relaxed text-stone-300">
                      VaniRakshak correlates spectral phase artifacts, speaker acoustic embeddings, and channel noise profiles in real time before releasing or isolating the call stream.
                    </p>
                  </div>
                </div>

                {/* Row 3: Pre-Transaction Interlock & Active Challenge-Response (Moved Above with Zero Gap) */}
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                  {/* Transaction interlock */}
                  <div
                    className={`rounded-2xl border p-4 sm:p-6 shadow-xl shadow-black/30 transition-all duration-300 ${
                      transactionLocked
                        ? "border-rose-900/60 bg-rose-950/20"
                        : "border-stone-800/90 bg-[#181614]"
                    }`}
                  >
                    <div className="mb-4 sm:mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className={`h-4 w-4 shrink-0 ${transactionLocked ? "text-rose-400" : "text-emerald-400"}`} />
                        <div>
                          <h3 className="font-bold text-stone-100 text-xs sm:text-sm">Pre-Transaction Interlock</h3>
                          <p className="text-[11px] sm:text-xs text-stone-400">Autonomous risk enforcement</p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 sm:px-3 py-1 font-mono text-[10px] sm:text-xs font-bold tracking-wider ${
                          transactionLocked
                            ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                            : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                        }`}
                      >
                        {transactionLocked ? "LOCKED" : "ARMED / READY"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-stone-800/80 bg-[#100f0e] p-3.5 sm:p-5">
                      <div className="mb-3 sm:mb-4 flex justify-between text-xs sm:text-sm">
                        <span className="text-stone-400">Protected Transaction:</span>
                        <span className="font-mono font-bold text-stone-100">Wire Transfer ₹50,000</span>
                      </div>

                      <button
                        disabled={transactionLocked}
                        className={`w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-xs sm:text-sm transition shadow-lg ${
                          transactionLocked
                            ? "cursor-not-allowed bg-rose-950/80 border border-rose-800/50 text-rose-300"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 cursor-pointer active:scale-95"
                        }`}
                      >
                        {transactionLocked
                          ? "🔒 Security Interlock Active — Transfer Frozen"
                          : "✓ Authorize Transaction"}
                      </button>

                      <p className="mt-2.5 sm:mt-3 text-center text-[11px] sm:text-xs text-stone-500">
                        {transactionLocked
                          ? "Acoustic spoof suspicion triggered safety quarantine."
                          : "Call verified within safe biological acoustic baseline."}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Challenge */}
                  <div className="rounded-2xl border border-stone-800/90 bg-[#181614] p-4 sm:p-6 shadow-xl shadow-black/30">
                    <div className="mb-4 sm:mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-stone-100 text-xs sm:text-sm">Active Challenge-Response</h3>
                        <p className="text-[11px] sm:text-xs text-stone-400">Anti-replay & latency tripwire</p>
                      </div>
                      <span className="font-mono text-[10px] sm:text-xs text-amber-400 font-semibold">
                        {challenge ? "CHALLENGE PENDING" : "STANDBY"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-dashed border-stone-700/80 bg-[#100f0e] p-4 sm:p-6">
                      {challenge ? (
                        <>
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                            Acoustic Challenge Verification Prompt:
                          </div>
                          <p className="mt-2 text-lg sm:text-xl font-mono font-black leading-relaxed text-stone-100">
                            {challenge}
                          </p>
                          <p className="mt-2 text-[11px] sm:text-xs text-stone-400">
                            Caller must articulate the dynamic phrase above to satisfy the VAD tripwire.
                          </p>
                        </>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-[11px] sm:text-xs text-stone-400 leading-relaxed">
                            No active challenge requested. When spoof likelihood crosses the suspicion threshold (risk ≥ 35), a dynamic cryptographic challenge phrase is automatically assigned.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (1 col): Vertical Airtel Telecom Security Carrier Integration Module */}
              <div className="lg:col-span-1 h-full">
                <section className="rounded-2xl border-2 border-amber-500/70 bg-[#161412] p-4 sm:p-5 shadow-[0_0_35px_rgba(245,158,11,0.22),0_0_75px_rgba(228,0,0,0.16)] ring-1 ring-amber-400/40 relative overflow-hidden flex flex-col justify-between h-full group transition-all duration-300">
                  {/* Ambient brand background spotlights */}
                  <div
                    className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none opacity-30 blur-3xl"
                    style={{
                      background: "radial-gradient(circle, #E40000 0%, transparent 70%)",
                    }}
                  />
                  <div
                    className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full pointer-events-none opacity-25 blur-3xl"
                    style={{
                      background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
                    }}
                  />

                  <div>
                    {/* Dedicated Judge Spotlight & Commercial Feasibility Callout */}
                    <div className="relative z-10 mb-3.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#E40000]/15 to-amber-500/15 border border-amber-500/40 shadow-inner">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400">
                            JUDGES SPOTLIGHT • GTM FEASIBILITY
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-800/90 text-stone-300 border border-stone-700/80 font-bold">
                          FEASIBILITY DEMO
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-300 leading-snug font-sans">
                        <span className="text-amber-400 font-bold">We can do this too:</span> While VaniRakshak is not yet officially integrated with Airtel, this section demonstrates our plug-and-play carrier API architecture — showing how cellular providers can bundle automated zero-cost voice protection into everyday recharge plans.
                      </p>
                    </div>

                    {/* Vertical Header */}
                    <div className="relative z-10 border-b border-stone-800/80 pb-3 mb-3.5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {/* Official Airtel Brand Mark */}
                        <div className="flex items-center gap-1.5 rounded-lg bg-[#E40000] px-2.5 py-1 shadow-md shadow-red-950/50">
                          <span className="text-white font-black text-xs tracking-tight font-sans lowercase">airtel</span>
                          <span className="text-[8px] font-mono font-bold bg-white/20 text-white px-1 py-0.5 rounded">5G+</span>
                        </div>

                        {/* Live Carrier Telemetry Status */}
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-300 bg-[#100f0e] px-2.5 py-1 rounded-lg border border-stone-800/90">
                          <span className={`h-2 w-2 rounded-full ${airtelActivated ? "bg-emerald-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
                          <span className="font-semibold text-emerald-400">
                            {airtelActivated ? "SHIELD ARMED" : "CARRIER SYNC"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-stone-100 text-sm tracking-wide">
                          Airtel Carrier Security Shield
                        </h3>
                      </div>
                      <div className="inline-block mb-1.5">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                          100% COMPLIMENTARY BUNDLE
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed">
                        Recharge with eligible packs to activate VaniRakshak Voice Shield free on your mobile line.
                      </p>
                    </div>

                    {/* Vertical 3 Recharge Packs Stack */}
                    <div className="relative z-10 space-y-3.5">
                      {/* Pack 1: Exact ₹199 Recharge Pack */}
                      <div
                        onClick={() => selectAirtelPack(199)}
                        className={`relative rounded-xl border p-3.5 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                          selectedAirtelPack === 199
                            ? "border-amber-500/80 bg-gradient-to-b from-[#1c1813] to-[#12100e] ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10"
                            : "border-stone-800/90 bg-[#100f0e] hover:border-stone-700 hover:bg-[#141210]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] font-semibold text-stone-400">AIRTEL MOBILITY • 28D</span>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                            EXACT PACK
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 my-1">
                          <span className="text-2xl font-black text-stone-100 font-mono tracking-tight">₹199</span>
                          <span className="text-[10px] font-mono text-stone-400">/ recharge</span>
                        </div>

                        <p className="text-[11px] text-stone-300 font-medium leading-tight mb-2">
                          Recharge with exact ₹199 Airtel pack to receive VaniRakshak Security Shield complimentary.
                        </p>

                        <div className="rounded-md bg-emerald-950/40 border border-emerald-500/30 p-2 mb-2.5">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span>VaniRakshak Shield: FREE</span>
                          </div>
                          <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">
                            Real-time synthetic voice screening & spoof alert on incoming calls.
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAirtelPack(199);
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-[11px] font-bold font-mono transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                            selectedAirtelPack === 199
                              ? "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20"
                              : "bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700"
                          }`}
                        >
                          <span>{selectedAirtelPack === 199 ? "✓ ₹199 PACK ARMED" : "SELECT ₹199 PACK"}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Pack 2: ₹499 Recharge Pack */}
                      <div
                        onClick={() => selectAirtelPack(499)}
                        className={`relative rounded-xl border p-3.5 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                          selectedAirtelPack === 499
                            ? "border-amber-500/80 bg-gradient-to-b from-[#1c1813] to-[#12100e] ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10"
                            : "border-stone-800/90 bg-[#100f0e] hover:border-stone-700 hover:bg-[#141210]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] font-semibold text-stone-400">AIRTEL 5G • 84D</span>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            PRO DEFENSE
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 my-1">
                          <span className="text-2xl font-black text-stone-100 font-mono tracking-tight">₹499</span>
                          <span className="text-[10px] font-mono text-stone-400">/ recharge</span>
                        </div>

                        <p className="text-[11px] text-stone-300 font-medium leading-tight mb-2">
                          Recharge with ₹499 Airtel pack to receive VaniRakshak Pro Security Shield complimentary.
                        </p>

                        <div className="rounded-md bg-emerald-950/40 border border-emerald-500/30 p-2 mb-2.5">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span>VaniRakshak Pro: FREE</span>
                          </div>
                          <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">
                            Neural vocoder phase artifact analysis & ECAPA-TDNN biometric match.
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAirtelPack(499);
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-[11px] font-bold font-mono transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                            selectedAirtelPack === 499
                              ? "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20"
                              : "bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700"
                          }`}
                        >
                          <span>{selectedAirtelPack === 499 ? "✓ ₹499 PACK ARMED" : "SELECT ₹499 PACK"}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Pack 3: ₹3000 Recharge Pack */}
                      <div
                        onClick={() => selectAirtelPack(3000)}
                        className={`relative rounded-xl border p-3.5 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                          selectedAirtelPack === 3000
                            ? "border-amber-500/80 bg-gradient-to-b from-[#1c1813] to-[#12100e] ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10"
                            : "border-stone-800/90 bg-[#100f0e] hover:border-stone-700 hover:bg-[#141210]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] font-semibold text-stone-400">AIRTEL INFINITY • 365D</span>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/40">
                            ANNUAL 365D
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 my-1">
                          <span className="text-2xl font-black text-stone-100 font-mono tracking-tight">₹3,000</span>
                          <span className="text-[10px] font-mono text-stone-400">/ annual</span>
                        </div>

                        <p className="text-[11px] text-stone-300 font-medium leading-tight mb-2">
                          Recharge with ₹3000 annual pack to receive full VaniRakshak Suite complimentary.
                        </p>

                        <div className="rounded-md bg-emerald-950/40 border border-emerald-500/30 p-2 mb-2.5">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span>Enterprise Shield: FREE</span>
                          </div>
                          <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">
                            Autonomous financial interlock & multi-SIM family security.
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAirtelPack(3000);
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-[11px] font-bold font-mono transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                            selectedAirtelPack === 3000
                              ? "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20"
                              : "bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700"
                          }`}
                        >
                          <span>{selectedAirtelPack === 3000 ? "✓ ₹3,000 PACK ARMED" : "SELECT ₹3,000 PACK"}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Footer */}
                  <div className="relative z-10 mt-3 pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 font-sans space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="leading-tight text-stone-300">
                        Proposed telco pilot: Auto-provisioned via Airtel Thanks App on recharge.
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-stone-400 flex items-center justify-between pt-0.5">
                      <span>ARMED: <span className="text-amber-400 font-bold">₹{selectedAirtelPack} PACK</span></span>
                      <span className="text-emerald-400 font-semibold">Carrier API Feasible</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </ContainerScroll>
      </div>

      <div className="mx-auto max-w-7xl px-3.5 sm:px-6 pb-16">
        {/* Live event log */}
        <section className="rounded-2xl border border-stone-800/90 bg-[#181614] p-4 sm:p-6 shadow-xl shadow-black/30">
          <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div>
              <h3 className="font-bold text-stone-100 text-sm">Live System Audit Log</h3>
              <p className="text-xs text-stone-400">Real-time classification telemetry</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] sm:text-xs text-stone-400">
                {events.length} events logged
              </span>

              {events.length > 5 && (
                <button
                  onClick={() => setShowAllEvents((value) => !value)}
                  className="rounded-lg border border-stone-700 bg-stone-900/80 px-2.5 sm:px-3 py-1 text-xs text-stone-300 hover:border-stone-500 hover:text-white transition cursor-pointer"
                >
                  {showAllEvents ? "Show Recent" : "Show All"}
                </button>
              )}
            </div>
          </div>

          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-800/80 p-6 sm:p-8 text-center text-xs text-stone-500 font-mono">
              Waiting for incoming audio stream telemetry...
            </div>
          ) : (
            <div className="space-y-2">
              {(showAllEvents ? events : events.slice(0, 5)).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start sm:items-center gap-2.5 sm:gap-4 rounded-lg border border-stone-800/80 bg-[#100f0e] px-3 sm:px-4 py-2 sm:py-2.5 transition"
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 mt-1 sm:mt-0 ${
                      event.severity === "critical"
                        ? "bg-rose-500 shadow-sm shadow-rose-500/50"
                        : event.severity === "warning"
                          ? "bg-amber-400 shadow-sm shadow-amber-400/50"
                          : "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                    }`}
                  />

                  <span className="w-16 sm:w-20 font-mono text-[11px] sm:text-xs text-stone-500 shrink-0">
                    {event.time}
                  </span>

                  <span className="text-[11px] sm:text-xs text-stone-300 font-medium break-words leading-tight">
                    {event.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function EvidenceCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-stone-800/80 bg-[#100f0e] p-3 sm:p-4 shadow-sm flex flex-col justify-between">
      <div className="text-[11px] sm:text-xs font-semibold text-stone-400 tracking-wide truncate">{title}</div>
      <div className="my-1 sm:mt-2 sm:mb-1 text-xl sm:text-2xl font-black text-stone-100 tracking-tight">{value}</div>
      <div className="text-[10px] sm:text-[11px] text-stone-500 leading-tight line-clamp-2">{description}</div>
    </div>
  );
}