import { useEffect, useState, useSyncExternalStore } from 'react';

export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
  );
}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** iPhone çentik ve ana ekran çubuğu boşlukları (env(safe-area-inset-*)) */
export function useSafeArea(): SafeArea {
  const [s, setS] = useState<SafeArea>({ top: 0, right: 0, bottom: 0, left: 0 });
  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
    const read = () => {
      const cs = getComputedStyle(probe);
      setS({
        top: parseFloat(cs.paddingTop) || 0,
        right: parseFloat(cs.paddingRight) || 0,
        bottom: parseFloat(cs.paddingBottom) || 0,
        left: parseFloat(cs.paddingLeft) || 0,
      });
    };
    read();
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('resize', read);
      probe.remove();
    };
  }, []);
  return s;
}
