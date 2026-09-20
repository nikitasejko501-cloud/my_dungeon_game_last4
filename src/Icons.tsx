import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export function GameIcon({ name, size = 48, className = '' }: IconProps) {
  const icons: Record<string, React.ReactNode> = {
    'sword': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <linearGradient id="sword-blade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8e8f0" />
            <stop offset="50%" stopColor="#b0b0c0" />
            <stop offset="100%" stopColor="#707080" />
          </linearGradient>
          <linearGradient id="sword-hilt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4a843" />
            <stop offset="100%" stopColor="#8a6a20" />
          </linearGradient>
        </defs>
        <polygon points="32,4 36,8 36,40 28,40 28,8" fill="url(#sword-blade)" stroke="#505060" strokeWidth="0.5" />
        <rect x="20" y="38" width="24" height="5" rx="1" fill="url(#sword-hilt)" stroke="#5a4010" strokeWidth="0.5" />
        <rect x="30" y="42" width="4" height="16" rx="1" fill="url(#sword-hilt)" stroke="#5a4010" strokeWidth="0.5" />
        <circle cx="32" cy="58" r="3" fill="url(#sword-hilt)" stroke="#5a4010" strokeWidth="0.5" />
      </svg>
    ),
    'bow': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <linearGradient id="bow-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b6f3f" />
            <stop offset="100%" stopColor="#5a4020" />
          </linearGradient>
        </defs>
        <path d="M 14 10 Q 54 32 14 54" fill="none" stroke="url(#bow-grad)" strokeWidth="4" strokeLinecap="round" />
        <line x1="14" y1="10" x2="14" y2="54" stroke="#d0d0d0" strokeWidth="1.5" />
        <line x1="14" y1="32" x2="48" y2="32" stroke="#c0c0c0" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    ),
    'staff': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <linearGradient id="staff-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6a4a2a" />
            <stop offset="100%" stopColor="#3a2a1a" />
          </linearGradient>
          <radialGradient id="orb-grad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#8fc8ff" />
            <stop offset="60%" stopColor="#3c6ec8" />
            <stop offset="100%" stopColor="#1a3a7a" />
          </radialGradient>
        </defs>
        <rect x="30" y="20" width="4" height="40" rx="1" fill="url(#staff-grad)" />
        <circle cx="32" cy="16" r="10" fill="url(#orb-grad)" opacity="0.9" />
        <circle cx="29" cy="13" r="3" fill="#c0e0ff" opacity="0.6" />
      </svg>
    ),
    'chain': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <linearGradient id="chain-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a0a0a0" />
            <stop offset="100%" stopColor="#505050" />
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="20" rx="8" ry="5" fill="none" stroke="url(#chain-grad)" strokeWidth="3" />
        <ellipse cx="32" cy="32" rx="8" ry="5" fill="none" stroke="url(#chain-grad)" strokeWidth="3" transform="rotate(45 32 32)" />
        <ellipse cx="44" cy="44" rx="8" ry="5" fill="none" stroke="url(#chain-grad)" strokeWidth="3" />
        <path d="M 44 44 L 56 56" stroke="#8a3a3a" strokeWidth="3" strokeLinecap="round" />
        <path d="M 52 52 L 58 58 L 54 60 L 50 56 Z" fill="#9b3c3c" />
      </svg>
    ),
    'potion_health': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <radialGradient id="hp-potion" cx="0.4" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="60%" stopColor="#e02020" />
            <stop offset="100%" stopColor="#8a1010" />
          </radialGradient>
        </defs>
        <rect x="27" y="6" width="10" height="8" rx="1" fill="#8a7a5a" />
        <path d="M 22 14 Q 22 12 24 12 L 40 12 Q 42 12 42 14 L 42 20 Q 48 24 48 36 Q 48 54 32 54 Q 16 54 16 36 Q 16 24 22 20 Z" fill="url(#hp-potion)" stroke="#5a1010" strokeWidth="1" />
        <ellipse cx="26" cy="28" rx="4" ry="6" fill="#ffaaaa" opacity="0.4" />
      </svg>
    ),
    'potion_stamina': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <radialGradient id="st-potion" cx="0.4" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#6bff6b" />
            <stop offset="60%" stopColor="#20e020" />
            <stop offset="100%" stopColor="#108a10" />
          </radialGradient>
        </defs>
        <rect x="27" y="6" width="10" height="8" rx="1" fill="#8a7a5a" />
        <path d="M 22 14 Q 22 12 24 12 L 40 12 Q 42 12 42 14 L 42 20 Q 48 24 48 36 Q 48 54 32 54 Q 16 54 16 36 Q 16 24 22 20 Z" fill="url(#st-potion)" stroke="#105a10" strokeWidth="1" />
        <ellipse cx="26" cy="28" rx="4" ry="6" fill="#aaffaa" opacity="0.4" />
      </svg>
    ),
    'potion_revival': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <radialGradient id="rv-potion" cx="0.4" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#ffd966" />
            <stop offset="60%" stopColor="#e0a020" />
            <stop offset="100%" stopColor="#8a6010" />
          </radialGradient>
        </defs>
        <rect x="27" y="6" width="10" height="8" rx="1" fill="#8a7a5a" />
        <path d="M 22 14 Q 22 12 24 12 L 40 12 Q 42 12 42 14 L 42 20 Q 48 24 48 36 Q 48 54 32 54 Q 16 54 16 36 Q 16 24 22 20 Z" fill="url(#rv-potion)" stroke="#5a4010" strokeWidth="1" />
        <ellipse cx="26" cy="28" rx="4" ry="6" fill="#fff0aa" opacity="0.4" />
        <path d="M 32 40 L 32 50 M 27 45 L 37 45" stroke="#5a4010" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'dungeon_field': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <rect x="8" y="8" width="48" height="48" rx="4" fill="#3a5a2a" stroke="#2a4a1a" strokeWidth="2" />
        <path d="M 12 48 Q 20 36 28 42 Q 36 34 44 40 Q 50 36 52 48" fill="#5a8a3a" />
        <circle cx="20" cy="24" r="4" fill="#7fbf3f" />
        <circle cx="40" cy="28" r="3" fill="#6faf3f" />
      </svg>
    ),
    'dungeon_forest': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <rect x="8" y="8" width="48" height="48" rx="4" fill="#1f3a10" stroke="#0f2a00" strokeWidth="2" />
        <polygon points="20,48 24,28 28,48" fill="#2f5a1f" />
        <polygon points="32,48 38,22 44,48" fill="#3f6a2f" />
        <polygon points="44,48 48,32 52,48" fill="#2f5a1f" />
      </svg>
    ),
    'dungeon_cave': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <rect x="8" y="8" width="48" height="48" rx="4" fill="#3a2a1a" stroke="#2a1a0a" strokeWidth="2" />
        <path d="M 12 56 L 12 28 Q 20 20 32 24 Q 44 20 52 28 L 52 56 Z" fill="#4a3a2a" />
        <circle cx="24" cy="40" r="3" fill="#5a4a3a" />
        <circle cx="40" cy="36" r="2" fill="#5a4a3a" />
      </svg>
    ),
    'dungeon_ruins': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <rect x="8" y="8" width="48" height="48" rx="4" fill="#4a3a5a" stroke="#3a2a4a" strokeWidth="2" />
        <rect x="16" y="24" width="8" height="28" fill="#5a4a6a" />
        <rect x="28" y="16" width="8" height="36" fill="#6a5a7a" />
        <rect x="40" y="28" width="8" height="24" fill="#5a4a6a" />
        <rect x="16" y="20" width="32" height="4" fill="#7a6a8a" />
      </svg>
    ),
    'dungeon_volcano': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <rect x="8" y="8" width="48" height="48" rx="4" fill="#5a1a0a" stroke="#3a0a00" strokeWidth="2" />
        <path d="M 14 52 L 24 28 L 32 36 L 40 24 L 50 52 Z" fill="#7a2a1a" />
        <path d="M 28 28 Q 32 20 36 28" fill="#df3f1f" />
        <circle cx="20" cy="44" r="2" fill="#df5f2f" />
        <circle cx="44" cy="42" r="2" fill="#df5f2f" />
      </svg>
    ),
    'dungeon_abyss': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <rect x="8" y="8" width="48" height="48" rx="4" fill="#0a0020" stroke="#000010" strokeWidth="2" />
        <circle cx="32" cy="32" r="16" fill="#1a0a2a" />
        <circle cx="32" cy="32" r="10" fill="#2a0a3a" />
        <circle cx="32" cy="32" r="5" fill="#5a0a8a" opacity="0.7" />
        <circle cx="28" cy="28" r="2" fill="#8a3aba" opacity="0.5" />
      </svg>
    ),
    // ===== NEW DUNGEON ICONS =====
    'dungeon_grove': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <radialGradient id="grove-bg" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0%" stopColor="#4a7c3a" />
            <stop offset="100%" stopColor="#1f3a10" />
          </radialGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="5" fill="url(#grove-bg)" stroke="#2a4a1a" strokeWidth="2" />
        <polygon points="18,50 22,30 26,50" fill="#3f7a2f" />
        <polygon points="30,50 34,22 38,50" fill="#4f8a3f" />
        <polygon points="42,50 46,32 50,50" fill="#3f7a2f" />
        <ellipse cx="22" cy="52" rx="4" ry="3" fill="#6fcf5f" opacity="0.9" />
        <circle cx="22" cy="51" r="1" fill="#1a3a0a" />
        <circle cx="30" cy="16" r="2" fill="#bfef8f" opacity="0.6" />
      </svg>
    ),
    'dungeon_necropolis': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <radialGradient id="necro-bg" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0%" stopColor="#3a1a4a" />
            <stop offset="100%" stopColor="#0a0018" />
          </radialGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="5" fill="url(#necro-bg)" stroke="#2a0a3a" strokeWidth="2" />
        <rect x="18" y="24" width="28" height="24" rx="2" fill="#4a3a5a" stroke="#2a1a3a" strokeWidth="1.5" />
        <path d="M18 24 Q32 12 46 24" fill="#5a4a6a" stroke="#2a1a3a" strokeWidth="1.5" />
        <rect x="24" y="30" width="6" height="6" rx="1" fill="#0a0018" />
        <rect x="34" y="30" width="6" height="6" rx="1" fill="#0a0018" />
        <circle cx="27" cy="33" r="1.6" fill="#8f2fbf" />
        <circle cx="37" cy="33" r="1.6" fill="#8f2fbf" />
        <rect x="29" y="40" width="6" height="8" fill="#1a0a2a" />
      </svg>
    ),
    'dungeon_jungle': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <radialGradient id="jungle-bg" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0%" stopColor="#2d8a1a" />
            <stop offset="100%" stopColor="#0f3a08" />
          </radialGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="5" fill="url(#jungle-bg)" stroke="#1a5a10" strokeWidth="2" />
        <path d="M14 52 Q20 30 28 40 Q34 24 42 38 Q48 28 52 52 Z" fill="#1f6a10" opacity="0.9" />
        <rect x="26" y="18" width="12" height="24" rx="2" fill="#8a7a5a" stroke="#5a4a2a" strokeWidth="1.5" />
        <circle cx="32" cy="24" r="3" fill="#c8a040" />
        <circle cx="32" cy="32" r="3" fill="#3f8a3f" />
        <path d="M28 38 L36 38" stroke="#5a4a2a" strokeWidth="1.5" />
        <path d="M46 20 L52 14" stroke="#4faf3f" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    'dungeon_fleet': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <linearGradient id="fleet-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a6a9a" />
            <stop offset="100%" stopColor="#052040" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="5" fill="url(#fleet-bg)" stroke="#0a3a6a" strokeWidth="2" />
        <path d="M10 44 Q18 40 26 44 Q34 48 42 44 Q50 40 56 44" fill="none" stroke="#4a9adf" strokeWidth="2" opacity="0.7" />
        <path d="M22 46 L20 30 L42 30 L44 46 Z" fill="#6a4a2a" stroke="#3a2a1a" strokeWidth="1.5" />
        <rect x="30" y="14" width="3" height="16" fill="#4a3a2a" />
        <path d="M33 16 L44 22 L33 26 Z" fill="#c8c0b0" stroke="#8a8070" strokeWidth="1" />
        <circle cx="26" cy="36" r="1.5" fill="#df5f3f" />
        <circle cx="38" cy="36" r="1.5" fill="#df5f3f" />
      </svg>
    ),
    'dungeon_sky': (
      <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
        <defs>
          <radialGradient id="sky-bg" cx="0.5" cy="0.4" r="0.8">
            <stop offset="0%" stopColor="#6a5abf" />
            <stop offset="100%" stopColor="#100520" />
          </radialGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="5" fill="url(#sky-bg)" stroke="#2a1a5a" strokeWidth="2" />
        <ellipse cx="20" cy="22" rx="8" ry="4" fill="#8a9acf" opacity="0.35" />
        <ellipse cx="44" cy="18" rx="9" ry="4" fill="#8a9acf" opacity="0.25" />
        <rect x="18" y="34" width="28" height="18" rx="2" fill="#c8c0d8" stroke="#8a80a0" strokeWidth="1.5" />
        <polygon points="18,34 32,22 46,34" fill="#bfb8d0" stroke="#8a80a0" strokeWidth="1.5" />
        <rect x="24" y="40" width="6" height="12" fill="#3a2a5a" />
        <rect x="34" y="40" width="6" height="12" fill="#3a2a5a" />
        <circle cx="32" cy="30" r="2.5" fill="#ffe080" />
      </svg>
    ),
  };

  return <>{icons[name] || <div style={{ width: size, height: size, background: '#333', borderRadius: 4 }} />}</>;
}

export function SkillIcon({ name, size = 48, className = '' }: { name: string; size?: number; className?: string }) {
  const skillIcons: Record<string, React.ReactNode> = {
    'skill_warrior_slash': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <defs>
          <linearGradient id="wsl-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd966" />
            <stop offset="100%" stopColor="#c89b3c" />
          </linearGradient>
        </defs>
        <path d="M 8 40 L 40 8 M 12 36 L 36 12" stroke="url(#wsl-grad)" strokeWidth="4" strokeLinecap="round" />
        <path d="M 6 42 L 10 38 M 38 10 L 42 6" stroke="#c89b3c" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    'skill_warrior_charge': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 6 24 L 38 24 M 30 16 L 40 24 L 30 32" fill="none" stroke="#df8f3f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="24" r="4" fill="#c89b3c" />
      </svg>
    ),
    'skill_warrior_ironhide': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 24 6 L 40 12 L 40 26 Q 40 38 24 44 Q 8 38 8 26 L 8 12 Z" fill="none" stroke="#8a8a9a" strokeWidth="3" />
        <path d="M 24 6 L 40 12 L 40 26 Q 40 38 24 44 Q 8 38 8 26 L 8 12 Z" fill="#8a8a9a" opacity="0.2" />
        <text x="24" y="30" textAnchor="middle" fontSize="14" fill="#b0b0c0" fontWeight="bold">+</text>
      </svg>
    ),
    'skill_warrior_secondwind': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <defs>
          <radialGradient id="sw-grad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#6bff6b" />
            <stop offset="100%" stopColor="#20a020" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="16" fill="url(#sw-grad)" opacity="0.3" />
        <path d="M 24 14 A 10 10 0 1 1 14 24" fill="none" stroke="#40bf40" strokeWidth="3" strokeLinecap="round" />
        <path d="M 20 18 L 24 14 L 28 18" fill="none" stroke="#40bf40" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    'skill_warrior_earthwrath': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 24 8 L 28 20 L 40 20 L 30 28 L 34 40 L 24 32 L 14 40 L 18 28 L 8 20 L 20 20 Z" fill="#8a6a3a" stroke="#5a4a2a" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="4" fill="#dfaf3f" />
      </svg>
    ),
    'skill_archer_shot': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 8 24 Q 24 8 40 24 Q 24 40 8 24" fill="none" stroke="#3c9b6e" strokeWidth="3" />
        <line x1="8" y1="24" x2="40" y2="24" stroke="#d0d0d0" strokeWidth="1.5" />
        <polygon points="32,20 40,24 32,28" fill="#3c9b6e" />
      </svg>
    ),
    'skill_archer_rain': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <line x1="10" y1="8" x2="6" y2="20" stroke="#6fbf9f" strokeWidth="2" />
        <line x1="20" y1="6" x2="16" y2="18" stroke="#6fbf9f" strokeWidth="2" />
        <line x1="30" y1="8" x2="26" y2="20" stroke="#6fbf9f" strokeWidth="2" />
        <line x1="40" y1="6" x2="36" y2="18" stroke="#6fbf9f" strokeWidth="2" />
        <path d="M 8 28 L 16 40 L 24 28 L 32 40 L 40 28" fill="none" stroke="#3c9b6e" strokeWidth="2" />
      </svg>
    ),
    'skill_archer_hawkeye': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <circle cx="24" cy="24" r="16" fill="none" stroke="#3c9b6e" strokeWidth="2" />
        <circle cx="24" cy="24" r="8" fill="none" stroke="#3c9b6e" strokeWidth="2" />
        <circle cx="24" cy="24" r="2" fill="#3c9b6e" />
        <line x1="24" y1="4" x2="24" y2="12" stroke="#3c9b6e" strokeWidth="2" />
        <line x1="24" y1="36" x2="24" y2="44" stroke="#3c9b6e" strokeWidth="2" />
        <line x1="4" y1="24" x2="12" y2="24" stroke="#3c9b6e" strokeWidth="2" />
        <line x1="36" y1="24" x2="44" y2="24" stroke="#3c9b6e" strokeWidth="2" />
      </svg>
    ),
    'skill_archer_swift': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 6 24 L 30 24 M 22 16 L 32 24 L 22 32" fill="none" stroke="#6fbf9f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 12 14 Q 8 24 12 34" fill="none" stroke="#6fbf9f" strokeWidth="2" opacity="0.5" />
        <path d="M 18 12 Q 14 24 18 36" fill="none" stroke="#6fbf9f" strokeWidth="2" opacity="0.3" />
      </svg>
    ),
    'skill_archer_storm': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 24 6 L 14 26 L 22 26 L 18 42 L 34 20 L 26 20 L 30 6 Z" fill="#3c9b6e" stroke="#2a7a5a" strokeWidth="1.5" />
      </svg>
    ),
    'skill_mage_bolt': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 26 4 L 14 26 L 22 26 L 18 44 L 34 20 L 26 20 L 30 4 Z" fill="#5fa0ff" stroke="#3c6ec8" strokeWidth="1.5" />
      </svg>
    ),
    'skill_mage_nova': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <circle cx="24" cy="24" r="6" fill="#8fc8ff" opacity="0.6" />
        <circle cx="24" cy="24" r="12" fill="none" stroke="#5fa0ff" strokeWidth="2" />
        <circle cx="24" cy="24" r="18" fill="none" stroke="#3c6ec8" strokeWidth="2" opacity="0.5" />
        <line x1="24" y1="2" x2="24" y2="10" stroke="#8fc8ff" strokeWidth="2" />
        <line x1="24" y1="38" x2="24" y2="46" stroke="#8fc8ff" strokeWidth="2" />
        <line x1="2" y1="24" x2="10" y2="24" stroke="#8fc8ff" strokeWidth="2" />
        <line x1="38" y1="24" x2="46" y2="24" stroke="#8fc8ff" strokeWidth="2" />
      </svg>
    ),
    'skill_mage_barrier': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <circle cx="24" cy="24" r="16" fill="none" stroke="#5fa0ff" strokeWidth="2" opacity="0.6" />
        <circle cx="24" cy="24" r="12" fill="none" stroke="#8fc8ff" strokeWidth="2" opacity="0.4" />
        <circle cx="24" cy="24" r="8" fill="#3c6ec8" opacity="0.2" />
        <circle cx="24" cy="24" r="3" fill="#5fa0ff" />
      </svg>
    ),
    'skill_mage_manaflow': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 24 8 Q 14 20 24 32 Q 34 20 24 8" fill="#3c6ec8" opacity="0.3" />
        <path d="M 24 14 Q 18 22 24 30" fill="none" stroke="#8fc8ff" strokeWidth="2" />
        <path d="M 24 14 Q 30 22 24 30" fill="none" stroke="#5fa0ff" strokeWidth="2" />
        <circle cx="24" cy="24" r="3" fill="#8fc8ff" />
      </svg>
    ),
    'skill_mage_apex': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <circle cx="24" cy="24" r="18" fill="none" stroke="#3c6ec8" strokeWidth="1" opacity="0.3" />
        <path d="M 24 6 L 28 20 L 42 20 L 30 28 L 34 42 L 24 34 L 14 42 L 18 28 L 6 20 L 20 20 Z" fill="#5fa0ff" stroke="#3c6ec8" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="4" fill="#fff" opacity="0.5" />
      </svg>
    ),
    'skill_assassin_chain': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="14" cy="14" rx="6" ry="4" fill="none" stroke="#9b3c3c" strokeWidth="2.5" />
        <ellipse cx="24" cy="24" rx="6" ry="4" fill="none" stroke="#9b3c3c" strokeWidth="2.5" transform="rotate(45 24 24)" />
        <ellipse cx="34" cy="34" rx="6" ry="4" fill="none" stroke="#9b3c3c" strokeWidth="2.5" />
        <path d="M 34 34 L 44 44" stroke="#7a2a2a" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    'skill_assassin_shadowstep': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <circle cx="14" cy="24" r="8" fill="#9b3c3c" opacity="0.4" />
        <circle cx="34" cy="24" r="8" fill="#9b3c3c" opacity="0.2" />
        <path d="M 14 24 L 34 24" stroke="#9b3c3c" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M 28 18 L 36 24 L 28 30" fill="none" stroke="#9b3c3c" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'skill_assassin_poison': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 24 8 Q 16 24 24 40 Q 32 24 24 8" fill="#5a8a2a" opacity="0.4" />
        <circle cx="20" cy="20" r="3" fill="#7abf3f" opacity="0.6" />
        <circle cx="28" cy="28" r="2" fill="#7abf3f" opacity="0.5" />
        <circle cx="24" cy="24" r="4" fill="#5a8a2a" opacity="0.3" />
      </svg>
    ),
    'skill_assassin_lifesteal': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 24 8 Q 14 24 24 40 Q 34 24 24 8" fill="#bf3f3f" opacity="0.3" />
        <path d="M 24 14 L 24 34 M 18 24 L 30 24" stroke="#df5f5f" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="24" r="3" fill="#df3f3f" />
      </svg>
    ),
    'skill_assassin_deathmark': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <circle cx="24" cy="24" r="16" fill="none" stroke="#9b3c3c" strokeWidth="2" opacity="0.4" />
        <path d="M 24 12 L 24 36 M 12 24 L 36 24" stroke="#9b3c3c" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="24" r="4" fill="#9b3c3c" />
        <circle cx="24" cy="24" r="8" fill="none" stroke="#9b3c3c" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
    'enemy_slime': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="32" rx="16" ry="10" fill="#5fbf3f" />
        <ellipse cx="24" cy="28" rx="14" ry="8" fill="#7fdf5f" />
        <circle cx="20" cy="26" r="2" fill="#2a5a1a" />
        <circle cx="28" cy="26" r="2" fill="#2a5a1a" />
      </svg>
    ),
    'enemy_goblin': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="28" rx="12" ry="14" fill="#8b6f3f" />
        <polygon points="14,18 10,10 18,16" fill="#8b6f3f" />
        <polygon points="34,18 38,10 30,16" fill="#8b6f3f" />
        <circle cx="20" cy="24" r="2.5" fill="#df3f3f" />
        <circle cx="28" cy="24" r="2.5" fill="#df3f3f" />
        <path d="M 18 32 L 22 34 L 26 32 L 30 34" stroke="#5a4020" strokeWidth="1.5" fill="none" />
      </svg>
    ),
    'enemy_wolf': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="30" rx="14" ry="10" fill="#6a6a6a" />
        <polygon points="14,22 10,14 18,18" fill="#6a6a6a" />
        <polygon points="34,22 38,14 30,18" fill="#6a6a6a" />
        <circle cx="20" cy="26" r="2" fill="#dfdf3f" />
        <circle cx="28" cy="26" r="2" fill="#dfdf3f" />
        <path d="M 18 34 L 24 38 L 30 34" stroke="#3a3a3a" strokeWidth="1.5" fill="none" />
      </svg>
    ),
    'enemy_spider': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="28" rx="10" ry="8" fill="#3a2a1a" />
        <line x1="14" y1="24" x2="4" y2="18" stroke="#3a2a1a" strokeWidth="2" />
        <line x1="14" y1="32" x2="4" y2="38" stroke="#3a2a1a" strokeWidth="2" />
        <line x1="34" y1="24" x2="44" y2="18" stroke="#3a2a1a" strokeWidth="2" />
        <line x1="34" y1="32" x2="44" y2="38" stroke="#3a2a1a" strokeWidth="2" />
        <circle cx="20" cy="26" r="2" fill="#bf3f3f" />
        <circle cx="28" cy="26" r="2" fill="#bf3f3f" />
      </svg>
    ),
    'enemy_bat': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="24" rx="8" ry="6" fill="#4a2a4a" />
        <path d="M 16 22 L 6 14 L 12 24 L 6 34 L 16 26" fill="#4a2a4a" />
        <path d="M 32 22 L 42 14 L 36 24 L 42 34 L 32 26" fill="#4a2a4a" />
        <circle cx="21" cy="22" r="1.5" fill="#df3f3f" />
        <circle cx="27" cy="22" r="1.5" fill="#df3f3f" />
      </svg>
    ),
    'enemy_troll': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="28" rx="14" ry="16" fill="#5a7a4a" />
        <circle cx="20" cy="24" r="3" fill="#3a5a2a" />
        <circle cx="28" cy="24" r="3" fill="#3a5a2a" />
        <path d="M 18 32 L 20 34 L 24 33 L 28 34 L 30 32" stroke="#3a5a2a" strokeWidth="2" fill="none" />
        <rect x="16" y="36" width="4" height="6" fill="#5a7a4a" />
        <rect x="28" y="36" width="4" height="6" fill="#5a7a4a" />
      </svg>
    ),
    'enemy_skeleton': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="20" rx="8" ry="7" fill="#c0c0a0" />
        <circle cx="21" cy="20" r="2" fill="#1a1a1a" />
        <circle cx="27" cy="20" r="2" fill="#1a1a1a" />
        <rect x="20" y="26" width="8" height="16" fill="#c0c0a0" />
        <line x1="20" y1="30" x2="28" y2="30" stroke="#8a8a70" strokeWidth="1" />
        <line x1="20" y1="34" x2="28" y2="34" stroke="#8a8a70" strokeWidth="1" />
      </svg>
    ),
    'enemy_golem': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <rect x="12" y="12" width="24" height="28" rx="2" fill="#8a7a6a" />
        <rect x="16" y="16" width="6" height="6" fill="#6a5a4a" />
        <rect x="26" y="16" width="6" height="6" fill="#6a5a4a" />
        <rect x="18" y="26" width="12" height="4" fill="#6a5a4a" />
        <rect x="14" y="36" width="8" height="8" fill="#8a7a6a" />
        <rect x="26" y="36" width="8" height="8" fill="#8a7a6a" />
      </svg>
    ),
    'enemy_wraith': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <path d="M 24 8 Q 10 20 12 36 L 16 32 L 20 38 L 24 32 L 28 38 L 32 32 L 36 36 Q 38 20 24 8" fill="#6a4a8a" opacity="0.7" />
        <circle cx="20" cy="22" r="2" fill="#dfdfdf" />
        <circle cx="28" cy="22" r="2" fill="#dfdfdf" />
      </svg>
    ),
    'enemy_imp': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="28" rx="12" ry="12" fill="#bf3f3f" />
        <polygon points="14,18 8,10 16,16" fill="#bf3f3f" />
        <polygon points="34,18 40,10 32,16" fill="#bf3f3f" />
        <circle cx="20" cy="24" r="2" fill="#dfdf3f" />
        <circle cx="28" cy="24" r="2" fill="#dfdf3f" />
        <path d="M 18 32 L 20 30 L 22 32 L 24 30 L 26 32 L 28 30 L 30 32" stroke="#8a1a1a" strokeWidth="1.5" fill="none" />
      </svg>
    ),
    'enemy_salamander': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="28" rx="14" ry="8" fill="#df5f2f" />
        <path d="M 10 28 Q 4 24 8 20" fill="none" stroke="#df5f2f" strokeWidth="3" />
        <circle cx="20" cy="26" r="2" fill="#dfdf3f" />
        <circle cx="28" cy="26" r="2" fill="#dfdf3f" />
        <path d="M 14 32 L 18 34 L 22 32 L 26 34 L 30 32 L 34 34" fill="none" stroke="#bf3f1f" strokeWidth="1.5" />
      </svg>
    ),
    'enemy_demon': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="28" rx="14" ry="14" fill="#8a1a1a" />
        <polygon points="12,16 6,8 16,14" fill="#8a1a1a" />
        <polygon points="36,16 42,8 32,14" fill="#8a1a1a" />
        <circle cx="19" cy="24" r="3" fill="#df3f3f" />
        <circle cx="29" cy="24" r="3" fill="#df3f3f" />
        <path d="M 18 34 L 22 36 L 26 34 L 30 36" stroke="#5a0a0a" strokeWidth="2" fill="none" />
      </svg>
    ),
    'boss_field': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="32" rx="20" ry="12" fill="#3faf2f" />
        <ellipse cx="24" cy="28" rx="18" ry="10" fill="#5fcf3f" />
        <circle cx="18" cy="24" r="3" fill="#1a3a0a" />
        <circle cx="30" cy="24" r="3" fill="#1a3a0a" />
        <path d="M 16 34 L 20 36 L 24 34 L 28 36 L 32 34" stroke="#1a3a0a" strokeWidth="2" fill="none" />
        <circle cx="24" cy="24" r="20" fill="none" stroke="#3faf2f" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
    'boss_forest': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="28" rx="16" ry="18" fill="#1f7f1f" />
        <polygon points="10,18 4,6 14,14" fill="#1f7f1f" />
        <polygon points="38,18 44,6 34,14" fill="#1f7f1f" />
        <circle cx="19" cy="24" r="3" fill="#dfdf3f" />
        <circle cx="29" cy="24" r="3" fill="#dfdf3f" />
        <path d="M 16 34 L 20 36 L 24 34 L 28 36 L 32 34" stroke="#0a5a0a" strokeWidth="2" fill="none" />
      </svg>
    ),
    'boss_cave': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <rect x="10" y="10" width="28" height="32" rx="3" fill="#7a5a3a" />
        <rect x="14" y="14" width="8" height="8" fill="#5a3a1a" />
        <rect x="26" y="14" width="8" height="8" fill="#5a3a1a" />
        <rect x="16" y="26" width="16" height="4" fill="#5a3a1a" />
        <rect x="12" y="38" width="8" height="6" fill="#7a5a3a" />
        <rect x="28" y="38" width="8" height="6" fill="#7a5a3a" />
        <circle cx="24" cy="24" r="20" fill="none" stroke="#7a5a3a" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
    'boss_ruins': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <rect x="10" y="10" width="28" height="32" rx="2" fill="#7a5a8a" />
        <polygon points="10,10 24,2 38,10" fill="#6a4a7a" />
        <circle cx="18" cy="20" r="3" fill="#3fafdf" />
        <circle cx="30" cy="20" r="3" fill="#3fafdf" />
        <rect x="16" y="28" width="16" height="4" fill="#5a3a6a" />
        <rect x="12" y="38" width="8" height="6" fill="#7a5a8a" />
        <rect x="28" y="38" width="8" height="6" fill="#7a5a8a" />
      </svg>
    ),
    'boss_volcano': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="30" rx="18" ry="16" fill="#df3f1f" />
        <path d="M 18 14 Q 24 4 30 14" fill="#df5f2f" />
        <circle cx="24" cy="14" r="4" fill="#dfaf2f" />
        <circle cx="19" cy="26" r="3" fill="#dfdf3f" />
        <circle cx="29" cy="26" r="3" fill="#dfdf3f" />
        <path d="M 16 36 L 20 38 L 24 36 L 28 38 L 32 36" stroke="#8a1a0a" strokeWidth="2" fill="none" />
      </svg>
    ),
    'boss_abyss': (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className}>
        <ellipse cx="24" cy="28" rx="18" ry="18" fill="#5a0a8a" />
        <polygon points="8,16 2,4 12,12" fill="#5a0a8a" />
        <polygon points="40,16 46,4 36,12" fill="#5a0a8a" />
        <circle cx="18" cy="24" r="4" fill="#8a3aba" />
        <circle cx="30" cy="24" r="4" fill="#8a3aba" />
        <circle cx="18" cy="24" r="2" fill="#df3fdf" />
        <circle cx="30" cy="24" r="2" fill="#df3fdf" />
        <path d="M 16 36 L 20 38 L 24 36 L 28 38 L 32 36" stroke="#3a0a5a" strokeWidth="2" fill="none" />
        <circle cx="24" cy="24" r="22" fill="none" stroke="#5a0a8a" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
  };

  return <>{skillIcons[name] || <div style={{ width: size, height: size, background: '#333', borderRadius: 4 }} />}</>;
}

