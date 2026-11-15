import React from 'react';

export const HeroParticles: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
    >
      {/* 4-point Diamond Stars like reference image */}
      <span
        className="absolute top-[22%] left-[42%] text-[#a3e635] text-xs font-serif animate-pulse opacity-80 drop-shadow-[0_0_8px_rgba(163,230,53,0.9)]"
        style={{ animationDuration: '3s' }}
      >
        ✦
      </span>

      <span
        className="absolute bottom-[28%] right-[12%] text-[#facc15] text-[10px] font-serif animate-pulse opacity-75 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]"
        style={{ animationDuration: '4.5s', animationDelay: '1s' }}
      >
        ✦
      </span>

      <span
        className="absolute top-[35%] right-[32%] text-emerald-300 text-[11px] font-serif animate-pulse opacity-60 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]"
        style={{ animationDuration: '3.8s', animationDelay: '2s' }}
      >
        ✦
      </span>

      {/* Floating Micro-Glow Dots */}
      <span
        className="absolute top-[18%] left-[60%] w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-particle opacity-60 blur-[0.5px]"
        style={{ animationDelay: '0.8s' }}
      />
      <span
        className="absolute bottom-[36%] left-[25%] w-1.5 h-1.5 rounded-full bg-cyan-300 animate-particle opacity-40 blur-[0.5px]"
        style={{ animationDelay: '2.5s' }}
      />
      <span
        className="absolute top-[55%] right-[22%] w-1 h-1 rounded-full bg-emerald-400 animate-particle opacity-50 blur-[0.5px]"
        style={{ animationDelay: '1.4s' }}
      />
    </div>
  );
};
