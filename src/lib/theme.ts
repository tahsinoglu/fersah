import { useEffect, useSyncExternalStore } from 'react';

export type ThemePref = 'light' | 'dark' | 'auto';
const KEY = 'mc-theme';
const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    /* gizli sekme */
  }
  return 'auto';
}

let current: ThemePref = typeof window === 'undefined' ? 'auto' : read();

export function setTheme(pref: ThemePref) {
  current = pref;
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* yok say */
  }
  apply();
  listeners.forEach((l) => l());
}

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function resolvedTheme(): 'light' | 'dark' {
  return current === 'auto' ? (media().matches ? 'dark' : 'light') : current;
}

export function apply() {
  const r = resolvedTheme();
  document.documentElement.dataset.theme = r;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', r === 'dark' ? '#0f1724' : '#f7f7f5');
}

export function useTheme(): [ThemePref, (p: ThemePref) => void] {
  const pref = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
  useEffect(() => {
    const m = media();
    const on = () => current === 'auto' && apply();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return [pref, setTheme];
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
