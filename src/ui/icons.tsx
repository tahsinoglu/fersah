import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 22, ...p }: P) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p,
});

export const IconSearch = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>);
export const IconClose = (p: P) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconSun = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></svg>);
export const IconMoon = (p: P) => (<svg {...base(p)}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>);
export const IconAuto = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none" /></svg>);
export const IconTarget = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>);
export const IconChevron = (p: P) => (<svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>);
export const IconPlay = (p: P) => (<svg {...base(p)}><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" /></svg>);
export const IconCheck = (p: P) => (<svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
/** Memleket: yurt / ev */
export const IconHome = (p: P) => (<svg {...base(p)}><path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></svg>);
/** Cihan: dünya */
export const IconGlobe = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5S9.4 5.9 12 3.5Z" /></svg>);
export const IconChart = (p: P) => (<svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></svg>);
export const IconLayers = (p: P) => (<svg {...base(p)}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>);
export const IconSparkle = (p: P) => (<svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>);
export const IconSpeaker = (p: P) => (<svg {...base(p)}><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>);
export const IconBack = (p: P) => (<svg {...base(p)}><path d="m15 6-6 6 6 6" /></svg>);
