import React from 'react';

export const IconPlane = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.5 12 2.5 4.5l3 7.5-3 7.5 19-7.5zm-13.5 0-2.5-3.5 10 3.5-10 3.5 2.5-3.5z" />
  </svg>
);

export const IconChevronDown = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
  </svg>
);

export const IconWallet = ({ className = "w-4 h-4 text-amber-400" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

export const IconUser = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export const IconHome = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="m10.707 2.293-7 7A1 1 0 004.414 10.7l.586-.586V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.886l.586.586a1 1 0 001.414-1.414l-7-7a1 1 0 00-1.414 0z" />
  </svg>
);

export const IconClock = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const IconTrophy = ({ className = "w-4 h-4 text-amber-400" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14v3a7 7 0 01-14 0V3zm0 3H3a2 2 0 000 4h2m14-4h2a2 2 0 010 4h-2m-9 7v4m-3 0h6" />
  </svg>
);

export const IconGift = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V4a2 2 0 112 2h-2zm0 0V4a2 2 0 10-2 2h2zm2 5.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM3 12h18v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7z" />
  </svg>
);

export const IconHeadset = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414" />
  </svg>
);

export const IconVolumeMute = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m17 14 4-4m0 4-4-4" />
  </svg>
);

export const IconVolumeUp = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
  </svg>
);

export const IconFullscreen = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

export const IconExitFullscreen = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v4m0 0H5m4 0L4 3m11 5h4m-4 0V4m0 4l5-5M9 20v-4m0 0H5m4 0l-5 5m11-5l5 5m-5-5v4m0-4h4" />
  </svg>
);

export const IconUsers = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
  </svg>
);

export const IconRocket = ({ className = "w-3 h-3 text-white" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="m13.13 2.19-1.63 1.63c-.39.39-.5 1-.22 1.48.55.93.94 1.95 1.15 3.03l-7.7 7.7a3.02 3.02 0 000 4.24l.71.71c1.17 1.17 3.07 1.17 4.24 0l7.7-7.7c1.08.21 2.1.6 3.03 1.15.48.28 1.09.17 1.48-.22l1.63-1.63a1 1 0 00.12-1.28C21.75 8.1 19.38 4.7 14.41 2.07a1 1 0 00-1.28.12zM5.41 18.59l-.7-.7a1.02 1.02 0 010-1.42l1.41-1.41 2.12 2.12-1.41 1.41c-.39.39-1.03.39-1.42 0z" />
  </svg>
);

export const IconBolt = ({ className = "w-3 h-3 text-white" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
  </svg>
);

export const IconInfo = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
  </svg>
);

export const IconPlay = ({ className = "w-4 h-4 fill-current" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const IconPlus = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

export const IconMinus = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
  </svg>
);

export const IconMenu = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconChevronLeft = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
  </svg>
);

export const IconChevronRight = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
  </svg>
);

export const IconBike = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M5 18a3 3 0 100-6 3 3 0 000 6zm14 0a3 3 0 100-6 3 3 0 000 6zM8.5 15.5l2-5h3l2.2 3.3M12 10.5V8m2.5 0h3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="5" cy="15" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="19" cy="15" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

/** Aviator-style spinning propeller for waiting loader */
export const IconPropeller = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(-28 32 32)" />
    <ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(62 32 32)" />
    <circle cx="32" cy="32" r="5" fill="currentColor" stroke="none" />
    <path d="M48 18c4 2 7 5 8 9" strokeWidth="3" />
    <path d="M52 16c3 1.5 5.5 4 7 7" strokeWidth="2.4" opacity="0.7" />
    <path d="M16 46c-4-2-7-5-8-9" strokeWidth="3" />
    <path d="M12 48c-3-1.5-5.5-4-7-7" strokeWidth="2.4" opacity="0.7" />
  </svg>
);
