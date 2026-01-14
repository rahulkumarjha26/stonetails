# Stone Tails | The Artifact

<div align="center">
  <p align="center">
    <strong>"Wear Wisdom. Philosophy you can touch."</strong>
  </p>
  <p align="center">
    A bridge between ancient Stoic philosophy and modern generative intelligence.
  </p>
</div>

---

## 🏛️ The Vision

**Stone Tails** is a luxury philosophy brand dedicated to making the wisdom of the past tangible. **The Artifact (Series One)** is our flagship experience—a physical basalt-hewn pendant that serves as a vessel for the mind of Marcus Aurelius.

This repository contains the digital soul of The Artifact: a high-fidelity, interactive web experience that allows users to "shatter" the stone barrier and engage in real-time, voice-activated conversations with the Roman Emperor himself.

## ✨ Core Experience

- **Stoic Luxury Aesthetic**: A "Grey Stone & Champagne" design system built for premium visual storytelling.
- **Interactive 3D Narrative**: Powered by **Three.js** and **GSAP**, featuring a physics-based "shattering" effect of the volcanic basalt cuboid.
- **NFC Bridge**: A simulated NFC connection sequence that bridges the physical artifact with the digital interface.
- **Gemini Live Integration**: Real-time, low-latency voice conversations with a custom-tuned Marcus Aurelius AI model.
- **Fluid Visualizer**: A custom GLSL shader-based orb that reacts to the Emperor's voice and presence.

## 🛠️ Technology Stack

- **Frontend**: React 19 + Vite
- **3D Engine**: Three.js
- **Animations**: GSAP (GreenSock) + ScrollTrigger
- **Smooth Scrolling**: Lenis
- **AI/Voice**: Google Gemini Live API
- **Styling**: Vanilla CSS (Stoic Luxury Design System)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key

### Local Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/rahulkumarjha26/stonetails.git
   cd stonetails
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env.local` file in the root and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🌐 Deployment

This project is optimized for deployment on **Netlify**.

1. **Build**: `npm run build`
2. **Publish Directory**: `dist`
3. **Environment Variables**: Ensure `VITE_GEMINI_API_KEY` is set in your Netlify site settings.
4. **Routing**: A `_redirects` file is included in the `public` folder to handle React Router's client-side navigation.

---

<div align="center">
  <p><em>"You have power over your mind—not outside events. Realize this, and you will find strength."</em></p>
  <p><strong>Stone Tails © 2026</strong></p>
</div>
