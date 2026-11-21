/** Günün anahtarı (YYYY-MM-DD). Memleket'te Türkiye saati, Cihan'da UTC. */
export function dailyKey(atlas: 'memleket' | 'cihan', now: Date = new Date()): string {
  const tz = atlas === 'memleket' ? 'Europe/Istanbul' : 'UTC';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const EPOCH = Date.UTC(2026, 0, 1);

/** Paylaşımda görünen gün numarası (#1 = 1 Ocak 2026) */
export function dailyNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1;
}

export const dailySeed = (atlas: string, key: string) => `gunluk:${atlas}:${key}`;
