export const MAX_NEAR = 1000;

/** Yakın Atış puanı: içindeyse 1000, dışındaysa uzaklıkla üstel azalır. ölçek: Türkiye ~150 km, dünya ~1500 km */
export function nearShotScore(km: number, scaleKm: number): number {
  if (km <= 0) return MAX_NEAR;
  return Math.round(MAX_NEAR * Math.exp(-km / scaleKm));
}

export const NEAR_SCALE_KM = { memleket: 150, cihan: 1500 } as const;

/** Bul / Bu Neresi / Siluet: doğruya 100 + hızlı cevaba 50'ye kadar ek puan (10 sn'de sıfırlanır) */
export function answerScore(correct: boolean, ms: number): number {
  if (!correct) return 0;
  return 100 + Math.max(0, Math.round(50 * (1 - ms / 10000)));
}

/** Yakın Atış sonucu "doğru" sayılır mı (öğrenme ve paylaşım kareleri için) */
export const nearIsCorrect = (score: number) => score >= 800;

export type Tile = 'dogru' | 'yakin' | 'yanlis';
export function tileOf(kind: string, correct: boolean, nearScore?: number): Tile {
  if (kind === 'yakin' && nearScore !== undefined) return nearScore >= 800 ? 'dogru' : nearScore >= 400 ? 'yakin' : 'yanlis';
  return correct ? 'dogru' : 'yanlis';
}

const EMOJI: Record<Tile, string> = { dogru: '🟩', yakin: '🟨', yanlis: '🟥' };

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Wordle tarzı paylaşım metni; cevapları ele vermez */
export function shareText(o: { title: string; number: number; tiles: Tile[]; score: number; ms: number }): string {
  const correct = o.tiles.filter((t) => t === 'dogru').length;
  return `${o.title} #${o.number}\n${o.tiles.map((t) => EMOJI[t]).join('')}\n${correct}/${o.tiles.length} · ${o.score} puan · ${formatDuration(o.ms)}`;
}
