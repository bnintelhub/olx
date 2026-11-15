import React from 'react';

export const HeroLightTrails: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
    >
      {/* 
        High-Energy Luminous Neon Lime/Yellow Light Streak
        Matches the glowing beam shooting towards the product card in the reference design
      */}
      <div
        className="absolute w-[180%] h-12 bottom-12 -left-1/3 animate-light-streak-lime pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(163, 230, 53, 0) 30%, rgba(163, 230, 53, 0.45) 55%, rgba(250, 204, 21, 0.8) 70%, rgba(255, 255, 255, 0.95) 75%, rgba(163, 230, 53, 0.5) 80%, transparent 100%)',
          filter: 'blur(8px)',
          transform: 'rotate(-8deg)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Intense Core Laser Beam */}
      <div
        className="absolute w-[140%] h-1.5 bottom-16 -left-1/4 animate-light-streak-core pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(163, 230, 53, 0) 25%, #a3e635 60%, #ffffff 75%, #a3e635 85%, transparent 100%)',
          filter: 'blur(1px)',
          transform: 'rotate(-8deg)',
          boxShadow: '0 0 16px rgba(163, 230, 53, 0.9), 0 0 32px rgba(16, 185, 129, 0.6)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Ambient Radial Flare behind the product card region */}
      <div className="absolute right-[8%] top-[25%] w-[320px] h-[320px] rounded-full bg-[radial-gradient(circle,rgba(163,230,53,0.18)_0%,rgba(16,185,129,0.12)_45%,transparent_70%)] blur-2xl pointer-events-none" />
    </div>
  );
};
