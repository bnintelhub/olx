import React from 'react';
import { HeroWaves } from './HeroWaves';
import { HeroParticles } from './HeroParticles';
import { HeroLightTrails } from './HeroLightTrails';
import './hero-banner.css';

interface AnimatedHeroBackgroundProps {
  parallaxX?: number; // Normalized -1 to +1 from mouse movement
  parallaxY?: number; // Normalized -1 to +1 from mouse movement
}

export const AnimatedHeroBackground: React.FC<AnimatedHeroBackgroundProps> = ({
  parallaxX = 0,
  parallaxY = 0,
}) => {
  // Smooth subtle multi-layered parallax offsets (2px - 6px)
  const blobTransform = `translate3d(${parallaxX * 6}px, ${parallaxY * 6}px, 0)`;
  const wavesTransform = `translate3d(${parallaxX * 3}px, ${parallaxY * 2.5}px, 0)`;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#002225]"
    >
      {/* ========================================================
          LAYER 1: Deep Dark Teal & Emerald Base Gradient
          ======================================================== */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00282b] via-[#00363a] to-[#00191b]" />

      {/* Atmospheric Top-Left Emerald Ambient Glow */}
      <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.28)_0%,rgba(5,150,105,0.14)_45%,transparent_70%)] blur-3xl pointer-events-none" />

      {/* Subtle Dotted Tech Grid Overlay */}
      <div className="absolute inset-0 bg-hero-grid opacity-35" />

      {/* Radial Edge Vignette to keep text readable on left & right */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,18,20,0.65)_100%)]" />

      {/* ========================================================
          LAYER 2: Optimized Organic Blurred Gradient Blobs
          ======================================================== */}
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{ transform: blobTransform, willChange: 'transform' }}
      >
        {/* Emerald / Teal Glow Blob - Center Left */}
        <div className="absolute -top-12 -left-12 w-[380px] sm:w-[480px] h-[380px] sm:h-[480px] rounded-full bg-emerald-500/25 blur-2xl md:blur-[42px] animate-blob-1" />

        {/* Lime / Cyan Accent Blob - Center Right */}
        <div className="absolute bottom-[-15%] right-[-8%] w-[420px] sm:w-[520px] h-[360px] sm:h-[420px] rounded-full bg-[#10b981]/20 blur-2xl md:blur-[45px] animate-blob-2" />
      </div>

      {/* ========================================================
          LAYER 3: SVG Flowing Curved Waves & Dotted Mesh
          ======================================================== */}
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{ transform: wavesTransform, willChange: 'transform' }}
      >
        <HeroWaves />
      </div>

      {/* ========================================================
          LAYER 4: Micro-Particles & Diamond Stars
          ======================================================== */}
      <HeroParticles />

      {/* ========================================================
          LAYER 5: Neon Lime Glowing Light Streak & Core Laser
          ======================================================== */}
      <HeroLightTrails />

      {/* Edge border highlight for container integration */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.4)]" />
    </div>
  );
};
