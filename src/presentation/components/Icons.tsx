/**
 * Icons.tsx
 * ---------
 * Bộ icon SVG nội bộ (không phụ thuộc thư viện) — nhẹ, offline.
 */

import React from 'react';

const base = (path: React.ReactNode, viewBox = '0 0 24 24', className?: string) => (
  <svg viewBox={viewBox} width="18" height="18" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    {path}
  </svg>
);

export const IconSelect = () => base(<><path d="M12 4v16M4 12h16" /></>);
export const IconPan = () => base(<><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>);
export const IconRect = () => base(<><rect x="3" y="5" width="18" height="14" rx="2" /></>);
export const IconCircle = () => base(<><circle cx="12" cy="12" r="8" /></>);
export const IconEllipse = () => base(<><ellipse cx="12" cy="12" rx="9" ry="6" /></>);
export const IconLine = () => base(<><path d="M4 20L20 4" /></>);
export const IconPath = () => base(<><path d="M5 20c0-8 14-8 14-16" /></>);
export const IconPolygon = () => base(<><polygon points="12 3 21 17 3 17" /></>);
export const IconText = () => base(<><path d="M5 6V4h14v2M12 4v16M9 20h6" /></>);
export const IconUndo = () => base(<><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>);
export const IconRedo = () => base(<><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>);
export const IconZoomIn = () => base(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" /></>);
export const IconZoomOut = () => base(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8 11h6" /></>);
export const IconFit = () => base(<><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></>);
export const IconLayers = () => base(<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>);
export const IconInspector = () => base(<><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="1" fill="currentColor" /><circle cx="14" cy="12" r="1" fill="currentColor" /><circle cx="6" cy="18" r="1" fill="currentColor" /></>);
export const IconPrompt = () => base(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>);
export const IconGenerate = () => base(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="3" /></>);
export const IconPlus = () => base(<><path d="M12 5v14M5 12h14" /></>);
export const IconTrash = () => base(<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>);
export const IconDuplicate = () => base(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></>);
export const IconEye = () => base(<><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></>);
export const IconEyeOff = () => base(<><path d="M17.9 17.9A10.8 10.8 0 0 1 12 19c-7 0-11-7-11-7a20 20 0 0 1 5.1-5.9M9.9 4.2A10 10 0 0 1 12 5c7 0 11 7 11 7a20 20 0 0 1-3.4 4.4M1 1l22 22" /></>);
export const IconLock = () => base(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>);
export const IconLockOff = () => base(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7c0-1.6.9-3 2.3-3.6M16 7v4" /></>);
export const IconArrowUp = () => base(<><path d="M12 19V5M5 12l7-7 7 7" /></>);
export const IconArrowDown = () => base(<><path d="M12 5v14M5 12l7 7 7-7" /></>);
export const IconDownload = () => base(<><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 21h16" /></>);
export const IconUpload = () => base(<><path d="M12 21V9M7 14l5-5 5 5" /><path d="M4 3h16" /></>);
export const IconSettings = () => base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" /></>);
export const IconSun = () => base(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const IconMoon = () => base(<><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></>);
export const IconClose = () => base(<><path d="M18 6L6 18M6 6l12 12" /></>);
export const IconMenu = () => base(<><path d="M3 6h18M3 12h18M3 18h18" /></>);
export const IconSpark = () => base(<><path d="M12 3l1.9 5.7L20 10l-6.1 1.3L12 17l-1.9-5.7L4 10l6.1-1.3L12 3z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" /></>);
export const IconCopy = () => base(<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>);
export const IconRefresh = (p: { className?: string }) => base(<><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></>, '0 0 24 24', p.className);
