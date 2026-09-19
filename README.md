# VaniRakshak Frontend 🛡️🎙️
> **AI Voice Fraud Detection & Acoustic Security Console**  
> *Real-time SASV speaker verification, neural vocoder spoof screening, and autonomous pre-transaction interlock.*

---

## 🌟 Key Features

- **3D Scrolly Video Microphone Visualizer**: Smooth, hardware-accelerated interactive 3D microphone scroll canvas navigating through deep acoustic ingestion stages.
- **Interactive Pipeline Stages**:
  - **Stage 01 • Edge-First Audio Ingestion**: Sub-12ms raw PCM audio sampling and acoustic calibration.
  - **Stage 02 • Deep Spectral Inspection**: STFT decomposition scanning for neural vocoder phase artifacts.
  - **Stage 03 • Acoustic Spoof Detection**: Cross-analysis of vocal tract resonance and authentic biological micro-jitter against generative engines (ElevenLabs, Bark, VALL-E).
  - **Stage 04 • Real-Time Interlock & Quarantine**: Sub-45ms autonomous financial and call session tripwire.
- **Live Acoustic Security Console**:
  - Dynamic Overall Threat Risk meter with live radar sweep.
  - Alert Center & Dispatch with real-time incident notifications.
  - Explainability Evidence & Signal Breakdown with spectral phase indicators and biological jitter trackers.
  - Pre-Transaction Financial Interlock & Dynamic Cryptographic Challenge-Response.
  - Live Audio Spectrum Waveform & Biometric Confidence Gauges.
- **Airtel Carrier Security Shield (Commercial Feasibility Showcase)**:
  - Plug-and-play cellular carrier integration architecture demonstrating zero-latency voice protection bundled directly into recharge tiers (₹199, ₹499, ₹3,000).

---

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (App Router + Turbopack)](https://nextjs.org/)
- **UI & Styling**: Vanilla CSS + Tailwind CSS + Lucide Icons
- **3D & Animation**: Canvas 2D frame interpolation + Framer Motion 3D perspective transforms
- **Interactive Effects**: Canvas Reveal Effect dot matrix with Three.js / React Three Fiber

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the assigned local port) in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

---

## 📡 Live Backend Connection
By default, the console attempts to connect to the VaniRakshak low-latency inference streaming WebSocket:
`ws://localhost:8000/ws/stream`

When offline, interactive demo modes simulate real-time neural spoof detection, acoustic anomalies, and dynamic challenge-response phrases.
