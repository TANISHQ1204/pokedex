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

export function GymBadgeIcon({ size = 24, color = '#f59e0b', isUnlocked = true, className = '' }) {
  const primaryColor = isUnlocked ? color : '#64748b';
  const borderColor = isUnlocked ? '#fef08a' : '#334155';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon ${className}`}
    >
      {/* Shield Outer */}
      <path
        d="M16 3 L 28 8 V 18 C 28 25, 16 29, 16 29 C 16 29, 4 25, 4 18 V 8 L 16 3 Z"
        fill={isUnlocked ? '#1e293b' : '#0f172a'}
        stroke={borderColor}
        strokeWidth="2"
      />
      {/* Inner Gem Facet */}
      <polygon
        points="16,8 23,13 20,22 12,22 9,13"
        fill={primaryColor}
        opacity={isUnlocked ? '0.9' : '0.4'}
      />
      {/* Gem Highlight */}
      {isUnlocked && (
        <polygon points="16,10 20,13 18,19 14,19 12,13" fill="#ffffff" opacity="0.4" />
      )}
    </svg>
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

