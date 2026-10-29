import React from 'react';

export function PokeballIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon ${className}`}
    >
      <defs>
        <linearGradient id="pkTop" x1="0" y1="0" x2="32" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="pkBtn" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2" />
      <path d="M2 16 A 14 14 0 0 1 30 16 Z" fill="url(#pkTop)" />
      <path d="M2 16 A 14 14 0 0 0 30 16 Z" fill="#f8fafc" />
      <rect x="2" y="14.5" width="28" height="3" fill="#1e293b" />
      <circle cx="16" cy="16" r="5" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2.5" fill="url(#pkBtn)" />
    </svg>
  );
}

export function SwordsIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`game-icon ${className}`}
    >
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" stroke="#38bdf8" />
      <path d="M13 19l6-6" stroke="#f59e0b" />
      <path d="M16 16l4 4" stroke="#f59e0b" />
      <path d="M19 21l2-2" stroke="#f59e0b" />
      <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" stroke="#38bdf8" />
      <path d="M11 19l-6-6" stroke="#f59e0b" />
      <path d="M8 16l-4 4" stroke="#f59e0b" />
      <path d="M5 21l-2-2" stroke="#f59e0b" />
    </svg>
  );
}

export function CardsIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`game-icon ${className}`}
    >
      <rect x="3" y="5" width="12" height="16" rx="2" fill="#1e293b" stroke="#0284c7" strokeWidth="1.5" />
      <rect x="8" y="3" width="13" height="17" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="14.5" cy="11.5" r="3.5" fill="#0284c7" />
      <circle cx="14.5" cy="11.5" r="1.5" fill="#f59e0b" />
    </svg>
  );
}

export function TrophyIcon({ size = 24, tier = 'gold', className = '' }) {
  let mainGradStart = '#f59e0b';
  let mainGradEnd = '#fef08a';
  let accentColor = '#b45309';

  if (tier === 'silver') {
    mainGradStart = '#94a3b8';
    mainGradEnd = '#f1f5f9';
    accentColor = '#475569';
  } else if (tier === 'bronze') {
    mainGradStart = '#b45309';
    mainGradEnd = '#fed7aa';
    accentColor = '#78350f';
  } else if (tier === 'platinum') {
    mainGradStart = '#cbd5e1';
    mainGradEnd = '#f8fafc';
    accentColor = '#64748b';
  } else if (tier === 'diamond') {
    mainGradStart = '#22d3ee';
    mainGradEnd = '#ecfeff';
    accentColor = '#0e7490';
  } else if (tier === 'master') {
    mainGradStart = '#ec4899';
    mainGradEnd = '#fbcfe8';
    accentColor = '#9d174d';
  } else if (tier === 'locked') {
    mainGradStart = '#334155';
    mainGradEnd = '#64748b';
    accentColor = '#1e293b';
  }

  const gradId = `trophyGrad_${tier}_${Math.random().toString(36).substring(2, 6)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon ${className}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={mainGradEnd} />
          <stop offset="100%" stopColor={mainGradStart} />
        </linearGradient>
      </defs>
      {/* Handles */}
      <path d="M5 8 C 1 8, 1 18, 9 18" stroke={mainGradStart} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M27 8 C 31 8, 31 18, 23 18" stroke={mainGradStart} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Cup Body */}
      <path d="M8 5 L 24 5 L 22 17 C 22 21, 10 21, 10 17 Z" fill={`url(#${gradId})`} stroke={accentColor} strokeWidth="1.5" />
      {/* Stem */}
      <rect x="14" y="21" width="4" height="5" fill={mainGradStart} />
      {/* Base */}
      <path d="M10 26 L 22 26 L 24 29 L 8 29 Z" fill={accentColor} stroke={mainGradStart} strokeWidth="1" />
      {/* Star Emblem */}
      <polygon points="16,8 17.5,11.5 21,11.5 18,13.5 19,17 16,15 13,17 14,13.5 11,11.5 14.5,11.5" fill={accentColor} />
    </svg>
  );
}

function emblemShape(design, primary, stroke, unlocked) {
  const opacity = unlocked ? 0.92 : 0.38;
  const highlight = unlocked ? 0.45 : 0.12;
  const common = {
    fill: primary,
    opacity,
    stroke,
    strokeWidth: 1.4,
    strokeLinejoin: 'round',
  };

  switch (design) {
    case 'star':
      return (
        <>
          <polygon points="16,3 19.6,11.2 28.5,12.2 21.8,18.1 23.8,26.8 16,22.3 8.2,26.8 10.2,18.1 3.5,12.2 12.4,11.2" {...common} />
          <circle cx="16" cy="16" r="3.2" fill="#fff" opacity={highlight} />
        </>
      );
    case 'crystal':
    case 'gem':
      return (
        <>
          <polygon points="16,3 27,12 23,28 9,28 5,12" {...common} />
          <path d="M16 3 L12 12 L16 28 L20 12 Z" fill="#fff" opacity={highlight} />
          <path d="M5 12 L27 12" stroke={stroke} strokeWidth="1" opacity="0.7" />
        </>
      );
    case 'dna':
      return (
        <>
          <path d="M10 4 C 23 10, 9 22, 22 28" stroke={primary} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M22 4 C 9 10, 23 22, 10 28" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.85" />
          <path d="M10 10 L22 10 M9 16 L23 16 M10 22 L22 22" stroke={primary} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'crown':
      return (
        <>
          <path d="M5 24 L6 10 L13 16 L16 7 L19 16 L26 10 L27 24 Z" {...common} />
          <circle cx="16" cy="19" r="2" fill="#fff" opacity={highlight} />
        </>
      );
    case 'prism':
      return (
        <>
          <polygon points="16,3 29,27 3,27" {...common} />
          <polygon points="16,10 23,24 9,24" fill="#fff" opacity={highlight} />
        </>
      );
    case 'sun':
      return (
        <>
          <circle cx="16" cy="16" r="7" {...common} />
          <path d="M16 2v4M16 26v4M2 16h4M26 16h4M6 6l3 3M23 23l3 3M26 6l-3 3M9 23l-3 3" stroke={primary} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case 'pokeball':
      return (
        <>
          <circle cx="16" cy="16" r="12" {...common} />
          <path d="M4 16h24" stroke={stroke} strokeWidth="2.2" />
          <circle cx="16" cy="16" r="4.5" fill="#0f172a" stroke={stroke} strokeWidth="1.8" />
          <circle cx="16" cy="16" r="2" fill={primary} />
        </>
      );
    case 'fossil':
      return (
        <>
          <path d="M9 25 C 3 20, 5 9, 15 7 C 25 5, 28 14, 22 19 C 17 23, 13 17, 17 14 C 20 12, 23 15, 21 17" stroke={primary} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M9 25 L 5 29 M22 19 L 27 23" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'fang':
      return (
        <>
          <path d="M5 7 C 12 10, 20 10, 27 7 L 23 18 L 20 15 L 18 29 L 15 18 L 13 23 L 9 15 Z" {...common} />
        </>
      );
    case 'heart':
      return (
        <>
          <path d="M16 28 C 2 18, 4 7, 12 6 C 15 6, 16 9, 16 9 C 16 9, 17 6, 20 6 C 28 7, 30 18, 16 28 Z" {...common} />
          <ellipse cx="12" cy="12" rx="3.5" ry="2.2" fill="#fff" opacity={highlight} transform="rotate(-30 12 12)" />
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M3 16 C 9 7, 23 7, 29 16 C 23 25, 9 25, 3 16 Z" {...common} />
          <circle cx="16" cy="16" r="4.2" fill="#0f172a" stroke={stroke} strokeWidth="1.2" />
          <circle cx="16" cy="16" r="1.8" fill={primary} />
        </>
      );
    case 'compass':
      return (
        <>
          <circle cx="16" cy="16" r="12" {...common} />
          <polygon points="16,5.5 19,16 16,26.5 13,16" fill={stroke} opacity={0.9} />
          <circle cx="16" cy="16" r="2" fill="#0f172a" />
        </>
      );
    case 'laurel':
      return (
        <>
          <path d="M10 25 C 3 18, 4 9, 10 5" stroke={primary} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M22 25 C 29 18, 28 9, 22 5" stroke={primary} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M10 10 L5 8 M9 15 L4 14 M10 20 L6 21 M22 10 L27 8 M23 15 L28 14 M22 20 L26 21" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <polygon points="16,10 17.5,14 22,14 18.5,16.5 20,21 16,18 12,21 13.5,16.5 10,14 14.5,14" fill={stroke} />
        </>
      );
    case 'skull':
      return (
        <>
          <path d="M16 3 C 8 3, 5 9, 5 16 C 5 21, 8 23, 10 24 L 10 28 L 22 28 L 22 24 C 24 23, 27 21, 27 16 C 27 9, 24 3, 16 3 Z" {...common} />
          <circle cx="11.5" cy="15" r="2.4" fill="#0f172a" />
          <circle cx="20.5" cy="15" r="2.4" fill="#0f172a" />
          <path d="M14 21h4M16 21v3" stroke={stroke} strokeWidth="1.5" />
        </>
      );
    case 'ribbon':
      return (
        <>
          <path d="M16 13 C 10 5, 3 7, 5 12 C 7 17, 13 17, 16 15 C 19 17, 25 17, 27 12 C 29 7, 22 5, 16 13 Z" {...common} />
          <path d="M13 18 L 9 29 L 16 25 L 23 29 L 19 18" fill={primary} opacity={opacity} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </>
      );
    case 'medal':
      return (
        <>
          <path d="M10 3 L 14 14 L 18 14 L 22 3 Z" fill={stroke} opacity="0.8" />
          <path d="M13 3 L 16 11 L 19 3" fill={primary} opacity={opacity} />
          <circle cx="16" cy="20" r="8.5" {...common} />
          <polygon points="16,15 17.5,19 22,19 18.5,21.5 20,26 16,23 12,26 13.5,21.5 10,19 14.5,19" fill="#fff" opacity={highlight} />
        </>
      );
    case 'wing':
      return (
        <>
          <path d="M4 14 C 10 4, 22 4, 28 10 C 21 9, 16 12, 13 17 C 11 21, 9 24, 7 28 C 7 21, 4 18, 4 14 Z" {...common} />
          <path d="M8 15 C 13 10, 20 9, 25 11 M10 19 C 14 16, 18 14, 22 14" stroke={stroke} strokeWidth="1.2" fill="none" opacity="0.8" />
        </>
      );
    case 'hex':
      return (
        <>
          <polygon points="16,3 27,9.5 27,22.5 16,29 5,22.5 5,9.5" {...common} />
          <polygon points="16,9 22,12.5 22,19.5 16,23 10,19.5 10,12.5" fill="#fff" opacity={highlight} />
        </>
      );
    case 'moon':
      return (
        <>
          <path d="M20 4 C 10 5, 5 13, 8 20 C 10 25, 15 28, 20 27 C 14 24, 12 19, 14 14 C 15 10, 17 7, 20 4 Z" {...common} />
          <circle cx="23" cy="8" r="1.4" fill={stroke} />
          <circle cx="26" cy="13" r="1" fill={stroke} />
        </>
      );
    case 'gear':
      return (
        <>
          <path d="M13 3h6l1 4 4 2 4-1 3 5-3 3v5l3 3-3 5-4-1-4 2-1 4h-6l-1-4-4-2-4 1-3-5 3-3v-5l-3-3 3-5 4 1 4-2 Z" {...common} />
          <circle cx="16" cy="16" r="4" fill="#0f172a" stroke={stroke} strokeWidth="1.5" />
        </>
      );
    case 'sword':
      return (
        <>
          <path d="M6 26 L 22 6 L 26 6 L 26 10 L 10 28 Z" fill={primary} opacity={opacity} stroke={stroke} strokeWidth="1.2" />
          <path d="M26 26 L 10 6 L 6 6 L 6 10 L 22 28 Z" fill={stroke} opacity={0.7} stroke={stroke} strokeWidth="1.2" />
          <path d="M8 22 L 13 27 M24 22 L 19 27" stroke={primary} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'dragon':
      return (
        <>
          <path d="M5 24 C 8 10, 17 5, 27 8 C 23 11, 21 14, 22 18 C 18 17, 16 20, 16 24 C 13 20, 10 20, 5 24 Z" {...common} />
          <circle cx="22" cy="11" r="1.3" fill="#0f172a" />
          <path d="M25 8 L 29 5 M26 12 L 30 12" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case 'fist':
      return (
        <>
          <path d="M9 15V9a2 2 0 0 1 4 0v5V7a2 2 0 0 1 4 0v7V8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v8c0 5-3 8-8 8h-2c-4 0-7-2-9-6l-2-4a2 2 0 0 1 3-2l2 3Z" {...common} />
        </>
      );
    case 'snow':
      return (
        <>
          <path d="M16 3v26M5 9.5l22 13M27 9.5l-22 13" stroke={primary} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M16 8l-3-3M16 8l3-3M16 24l-3 3M16 24l3 3M7 12l1.5 4M9 18l-4-1M25 12l-1.5 4M23 18l4-1" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'bolt':
      return (
        <>
          <polygon points="18,2 6,18 14,18 11,30 27,12 18,12" {...common} />
        </>
      );
    case 'flame':
      return (
        <>
          <path d="M16 2 C 20 9, 27 11, 25 20 C 24 26, 20 29, 16 29 C 11 29, 7 25, 7 19 C 7 13, 12 11, 13 6 C 15 9, 16 12, 16 15 C 18 12, 18 7, 16 2 Z" {...common} />
          <path d="M16 18 C 18 21, 18 24, 16 26 C 14 24, 14 21, 16 18 Z" fill="#fff" opacity={highlight} />
        </>
      );
    case 'droplet':
      return (
        <>
          <path d="M16 3 C 21 10, 26 14, 26 20 C 26 26, 21 29, 16 29 C 11 29, 6 26, 6 20 C 6 14, 11 10, 16 3 Z" {...common} />
          <path d="M11 20 C 11 23, 13 25, 16 25" stroke="#fff" strokeWidth="1.7" opacity={highlight} fill="none" strokeLinecap="round" />
        </>
      );
    case 'leaf':
      return (
        <>
          <path d="M27 5 C 12 5, 4 12, 5 22 C 6 27, 11 28, 16 25 C 23 21, 26 14, 27 5 Z" {...common} />
          <path d="M7 27 C 11 18, 17 13, 25 8" stroke={stroke} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      );
    case 'shield':
    default:
      return (
        <>
          <path d="M16 3 L 28 8 V 18 C 28 25, 16 29, 16 29 C 16 29, 4 25, 4 18 V 8 L 16 3 Z" {...common} />
          <polygon points="16,8 23,13 20,22 12,22 9,13" fill="#fff" opacity={highlight} />
        </>
      );
  }
}

export function AwardEmblemIcon({
  size = 24,
  design = 'shield',
  color = '#f59e0b',
  isUnlocked = true,
  className = '',
}) {
  const primary = isUnlocked ? color : '#64748b';
  const stroke = isUnlocked ? '#fef08a' : '#334155';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon award-emblem ${className}`.trim()}
      data-design={design}
    >
      <path
        d="M16 1.5 L 30 8.5 V 19 C 30 26.5, 16 30.5, 16 30.5 C 16 30.5, 2 26.5, 2 19 V 8.5 Z"
        fill={isUnlocked ? '#1e293b' : '#0f172a'}
        stroke={stroke}
        strokeWidth="1.3"
        opacity="0.95"
      />
      {emblemShape(design, primary, stroke, isUnlocked)}
    </svg>
  );
}

export function GymBadgeIcon({ size = 24, color = '#f59e0b', isUnlocked = true, className = '', design = 'shield' }) {
  return (
    <AwardEmblemIcon
      size={size}
      design={design}
      color={color}
      isUnlocked={isUnlocked}
      className={className}
    />
  );
}

export function PokedexBookIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`game-icon ${className}`}
    >
      <rect x="4" y="3" width="16" height="18" rx="2" fill="#b91c1c" stroke="#334155" strokeWidth="1.5" />
      <path d="M4 7 H20" stroke="#7f1d1d" strokeWidth="1.5" />
      <circle cx="8" cy="5" r="1.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.75" />
      <circle cx="12" cy="5" r="0.75" fill="#ef4444" />
      <circle cx="14" cy="5" r="0.75" fill="#eab308" />
      <circle cx="16" cy="5" r="0.75" fill="#22c55e" />
      <rect x="7" y="10" width="10" height="8" rx="1" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
    </svg>
  );
}

export function SparkleStarIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`game-icon ${className}`}
    >
      <path
        d="M12 2 L 14.5 9.5 L 22 12 L 14.5 14.5 L 12 22 L 9.5 14.5 L 2 12 L 9.5 9.5 Z"
        fill="url(#sparkleGrad)"
      />
      <defs>
        <linearGradient id="sparkleGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LockPadlockIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`game-icon ${className}`}
    >
      <rect x="5" y="11" width="14" height="10" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
      <path d="M8 11 V7 A4 4 0 0 1 16 7 V11" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill="#f59e0b" />
      <path d="M12 16.5 V18.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChartBarIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`game-icon ${className}`}
    >
      <path d="M4 20V10" stroke="#38bdf8" />
      <path d="M10 20V4" stroke="#38bdf8" />
      <path d="M16 20v-6" stroke="#38bdf8" />
      <path d="M3 20h18" stroke="#f59e0b" />
    </svg>
  );
}

export function UsersFriendsIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`game-icon ${className}`}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="#38bdf8" />
      <circle cx="9" cy="7" r="4" stroke="#38bdf8" fill="#0f172a" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="#f59e0b" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#f59e0b" />
    </svg>
  );
}

export function GamepadIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`game-icon ${className}`}
    >
      <path d="M7.5 8h9a4 4 0 0 1 3.8 5.2l-1 3.2a2.4 2.4 0 0 1-4.1 1l-1.4-1.6H10l-1.4 1.6a2.4 2.4 0 0 1-4.1-1l-1-3.2A4 4 0 0 1 7.5 8Z" />
      <path d="M7.5 11v4M5.5 13h4" />
      <path d="M16 11.5h.01M18 13.5h.01" strokeWidth="2.8" />
    </svg>
  );
}

export function LinkLabIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`game-icon ${className}`}
    >
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.8 10.8 15.5 7M8.8 13.2l6.7 3.8" />
    </svg>
  );
}

export function TypeWeaverIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`game-icon ${className}`}
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6.3 6.3 2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function CatchRushIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`game-icon ${className}`}
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

export function MemoryDexIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`game-icon ${className}`}
    >
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

const ARCADE_ICONS = {
  'link-lab': LinkLabIcon,
  'type-weaver': TypeWeaverIcon,
  'catch-rush': CatchRushIcon,
  'memory-dex': MemoryDexIcon,
};

export function ArcadeGameIcon({ gameId, size = 24, className = '' }) {
  const Icon = ARCADE_ICONS[gameId] || GamepadIcon;
  return <Icon size={size} className={className} />;
}

