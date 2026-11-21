import { useSyncExternalStore } from 'react';
import { masteryOf, review, type Card } from './leitner';

/** Tüm ilerleme yalnızca bu cihazda (localStorage) tutulur. */
export interface RoundRecord {
  at: number;
  atlas: string;
  scope: string; // 'tum' ya da grup kimliği
  mode: string;
  total: number;
  correct: number;
  score: number;
  ms: number;
}

export interface DailyRecord {
  key: string;
  tiles: string[];
  score: number;
  ms: number;
  at: number;
}

export interface Progress {
  v: 1;
  cards: Record<string, Card>; // "memleket:34"
  rounds: RoundRecord[];
  best: Record<string, number>; // "memleket:tum:hepsi" → ms
  daily: Record<string, DailyRecord>; // "memleket:2026-11-21"
  days: string[]; // oynanan yerel günler (seri için)
}

const KEY = 'mc-progress-v1';
const empty = (): Progress => ({ v: 1, cards: {}, rounds: [], best: {}, daily: {}, days: [] });

let state: Progress = load();
const listeners = new Set<() => void>();

function load(): Progress {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (p && p.v === 1) return { ...empty(), ...p };
    }
  } catch {
    /* bozuk veri ya da erişim yok: sıfırdan başla */
  }
  return empty();
}

function commit(next: Progress) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* gizli sekme vb.: bellekte kalır */
  }
  listeners.forEach((l) => l());
}

export const getProgress = () => state;

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export const cardKey = (atlas: string, id: string) => `${atlas}:${id}`;

export function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function recordAnswer(atlas: string, id: string, correct: boolean) {
  const k = cardKey(atlas, id);
  commit({ ...state, cards: { ...state.cards, [k]: review(state.cards[k], correct) } });
}

export function recordRound(r: RoundRecord) {
  const day = localDay(new Date(r.at));
  const bestKey = `${r.atlas}:${r.scope}:${r.mode}`;
  const best = { ...state.best };
  if (r.mode === 'hepsi' && r.total > 0 && (!best[bestKey] || r.ms < best[bestKey])) best[bestKey] = r.ms;
  commit({
    ...state,
    rounds: [...state.rounds, r].slice(-500),
    best,
    days: state.days.includes(day) ? state.days : [...state.days, day].sort(),
  });
}

export function recordDaily(atlas: string, rec: DailyRecord) {
  commit({ ...state, daily: { ...state.daily, [`${atlas}:${rec.key}`]: rec } });
}

export function resetProgress() {
  commit(empty());
}

/** Kapsamdaki ustalık yüzdesi (0-100) */
export function masteryPercent(p: Progress, atlas: string, ids: string[]): number {
  if (!ids.length) return 0;
  const sum = ids.reduce((s, id) => s + masteryOf(p.cards[cardKey(atlas, id)]), 0);
  return Math.round((sum / ids.length) * 100);
}

/** Bugün ya da dün biten ardışık gün serisi ve en uzun seri */
export function streaks(days: string[], today = localDay()): { current: number; longest: number } {
  const set = new Set(days);
  const prev = (d: string) => {
    const [y, m, dd] = d.split('-').map(Number);
    return localDay(new Date(y, m - 1, dd - 1));
  };
  let start = set.has(today) ? today : prev(today);
  let current = 0;
  while (set.has(start)) {
    current++;
    start = prev(start);
  }
  let longest = 0;
  for (const d of days) {
    if (set.has(prev(d))) continue;
    let n = 0;
    let x = d;
    while (set.has(x)) {
      n++;
      const [y, m, dd] = x.split('-').map(Number);
      x = localDay(new Date(y, m - 1, dd + 1));
    }
    longest = Math.max(longest, n);
  }
  return { current, longest };
}
