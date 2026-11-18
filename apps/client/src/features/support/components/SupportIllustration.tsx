import React from 'react';

export const SupportIllustration: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 320 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Background Foliage Leaves */}
        <path
          d="M70 140 C50 110 55 60 90 40 C95 70 85 120 70 140 Z"
          fill="#0a5243"
          opacity="0.8"
        />
        <path
          d="M90 145 C80 100 100 50 130 35 C130 70 115 120 90 145 Z"
          fill="#0e5f4e"
          opacity="0.6"
        />

        {/* Character Body / Shoulders */}
        <path
          d="M100 200 C100 160 130 145 160 145 C190 145 220 160 220 200 Z"
          fill="#2ea072"
        />
        {/* Collar Accent */}
        <path
          d="M148 145 L160 162 L172 145 C164 148 156 148 148 145 Z"
          fill="#23815b"
        />

        {/* Neck */}
        <rect x="151" y="128" width="18" height="20" rx="4" fill="#f8c19a" />

        {/* Head / Face */}
        <ellipse cx="160" cy="100" rx="22" ry="26" fill="#ffd1b3" />

        {/* Hair */}
        <path
          d="M138 96 C137 72 150 68 165 68 C182 68 185 78 184 96 C180 84 172 78 160 78 C148 78 142 86 138 96 Z"
          fill="#1f2421"
        />
        <path
          d="M136 95 C135 90 138 82 142 80 C140 86 140 92 136 95 Z"
          fill="#1f2421"
        />

        {/* Eyes & Smile */}
        <ellipse cx="153" cy="98" rx="2" ry="2.5" fill="#2d312e" />
        <ellipse cx="167" cy="98" rx="2" ry="2.5" fill="#2d312e" />
        <path
          d="M155 110 Q160 116 165 110"
          stroke="#b86947"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Headset / Headphones */}
        <path
          d="M138 98 C136 70 184 70 182 98"
          stroke="#475569"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Left Ear Cushion */}
        <rect x="133" y="90" width="8" height="18" rx="4" fill="#002f34" />
        {/* Right Ear Cushion */}
        <rect x="179" y="90" width="8" height="18" rx="4" fill="#002f34" />
        {/* Mic boom */}
        <path
          d="M137 104 C137 118 148 118 153 117"
          stroke="#475569"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="154" cy="117" r="2.5" fill="#002f34" />

        {/* Laptop Base & Screen */}
        <path
          d="M170 195 L245 195 L235 152 L178 152 Z"
          fill="#1e293b"
          rx="2"
        />
        {/* Laptop Screen Bezel */}
        <path
          d="M180 155 L233 155 L231 188 L178 188 Z"
          fill="#0f172a"
        />
        {/* Screen Glow / Content */}
        <text
          x="205"
          y="174"
          fill="#ffffff"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          letterSpacing="1"
          opacity="0.9"
        >
          BLX
        </text>
        {/* Laptop Hinge/Base */}
        <rect x="165" y="193" width="85" height="5" rx="2.5" fill="#64748b" />

        {/* Floating Speech Bubble with "..." */}
        <g transform="translate(205, 50)">
          <path
            d="M5 0 H40 C43 0 45 2 45 5 V25 C45 28 43 30 40 30 H18 L10 37 V30 H5 C2 30 0 28 0 25 V5 C0 2 2 0 5 0 Z"
            fill="#ffffff"
          />
          <circle cx="15" cy="15" r="2.5" fill="#334155" />
          <circle cx="23" cy="15" r="2.5" fill="#334155" />
          <circle cx="31" cy="15" r="2.5" fill="#334155" />
        </g>

        {/* Floating Shield with Checkmark */}
        <g transform="translate(262, 75)">
          <path
            d="M16 0 C24 3 32 0 32 0 C32 16 26 28 16 34 C6 28 0 16 0 0 C0 0 8 3 16 0 Z"
            fill="#34d399"
          />
          <path
            d="M10 16 L14 20 L22 12"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};
