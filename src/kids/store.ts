import { useSyncExternalStore } from 'react';

/** Çocuk Köşesi: yalnızca cihazda tutulan yıldız sayısı. Hesap yok, veri toplama yok. */
const KEY = 'mc-kids-v1';
const listeners = new Set<() => void>();
let stars = read();

function read(): number {
  try {
    return Number(JSON.parse(localStorage.getItem(KEY) ?? '{}').stars ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function addStar(n = 1) {
  stars += n;
  try {
    localStorage.setItem(KEY, JSON.stringify({ stars }));
  } catch {
    /* gizli sekme */
  }
  listeners.forEach((l) => l());
}

export function useStars(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => stars,
  );
}

export const PRAISE = ['Harika!', 'Süpersin!', 'Bravo!', 'Aferin sana!', 'Çok güzel!', 'Mükemmel!'];
export const ENCOURAGE = ['Bir daha dene, yapabilirsin!', 'Çok yaklaştın, bir daha dene!', 'Neredeyse oldu!'];
export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
