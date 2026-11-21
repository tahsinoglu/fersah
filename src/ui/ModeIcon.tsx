import type { ModeId } from '../quiz-engine/types';

/** Mod simgeleri (elle çizildi) */
export function ModeIcon({ mode, size = 24 }: { mode: ModeId | 'gunluk'; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (mode) {
    case 'bul':
      return (<svg {...p}><path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>);
    case 'neresi':
      return (<svg {...p}><path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3" /><circle cx="12" cy="17.5" r="0.6" fill="currentColor" /><circle cx="12" cy="12" r="9" /></svg>);
    case 'yakin':
      return (<svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>);
    case 'siluet':
      return (<svg {...p}><path d="M4 9.5 7 5l4 2 3-2.5 5 3-1 4 2 3.5-4 4.5-5-1-3 2-3.5-3.5L5 13Z" fill="currentColor" fillOpacity="0.25" /></svg>);
    case 'hepsi':
      return (<svg {...p}><circle cx="12" cy="13" r="7.5" /><path d="M12 13V9.5M10 2.5h4M18.5 6.5l1.5-1.5" /></svg>);
    default:
      return (<svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="m9 15 2 2 4-4" /></svg>);
  }
}
