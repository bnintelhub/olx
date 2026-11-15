import React from 'react';

export const HeroWaves: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
    >
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1440 430"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Rich Teal to Emerald Wave Gradient */}
          <linearGradient id="wave-grad-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0" />
            <stop offset="20%" stopColor="#10b981" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#34d399" stopOpacity="0.6" />
            <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#002F34" stopOpacity="0" />
          </linearGradient>

          {/* Lime / Neon Green Accent Ribbon */}
          <linearGradient id="wave-grad-lime" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="5%" stopColor="#a3e635" stopOpacity="0" />
            <stop offset="40%" stopColor="#a3e635" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#34d399" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>

          {/* Broad Translucent Wave Fill for Atmospheric Depth */}
          <linearGradient id="wave-fill-depth" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
          </linearGradient>

          {/* Soft Wave Glow Filter */}
          <filter id="wave-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Translucent Depth Fill Wave */}
        <path
          d="M0,180 Q360,90 720,230 T1440,160 L1440,430 L0,430 Z"
          fill="url(#wave-fill-depth)"
          className="animate-wave-1"
        />

        {/* Primary Upper Flowing Emerald Wave Line */}
        <path
          d="M-50,160 C260,60 520,310 880,180 C1180,70 1360,250 1500,170"
          stroke="url(#wave-grad-emerald)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#wave-glow)"
          className="animate-wave-1"
        />

        {/* Secondary Lime-Cyan Flowing Wave Line */}
        <path
          d="M-20,250 C320,360 660,150 960,280 C1240,390 1380,210 1480,260"
          stroke="url(#wave-grad-lime)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#wave-glow)"
          className="animate-wave-2"
        />

        {/* Dynamic Dotted Mesh Wave (Stipple Particle Field following the curve) */}
        <g opacity="0.45" className="animate-wave-1">
          {Array.from({ length: 42 }).map((_, i) => {
            const x = i * 36;
            const y1 = 280 + Math.sin(i * 0.22) * 55;
            const y2 = y1 + 14;
            const y3 = y1 + 28;
            return (
              <g key={i}>
                <circle cx={x} cy={y1} r={1.5} fill="#a3e635" opacity={0.6 + (i % 3) * 0.15} />
                <circle cx={x + 12} cy={y2} r={1.2} fill="#34d399" opacity={0.4 + (i % 2) * 0.2} />
                <circle cx={x + 20} cy={y3} r={1} fill="#06b6d4" opacity={0.3} />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
