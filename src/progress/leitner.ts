export interface Card {
  box: number; // 1..5
  seen: number;
  correct: number;
  wrong: number;
  last: number; // zaman damgası
}

export const MAX_BOX = 5;

export function review(card: Card | undefined, correct: boolean, now = Date.now()): Card {
  const c = card ?? { box: 1, seen: 0, correct: 0, wrong: 0, last: 0 };
  return {
    box: correct ? Math.min(MAX_BOX, c.seen === 0 ? 2 : c.box + 1) : 1,
    seen: c.seen + 1,
    correct: c.correct + (correct ? 1 : 0),
    wrong: c.wrong + (correct ? 0 : 1),
    last: now,
  };
}

/** Seçilme ağırlığı: az bilinen yerler daha sık gelir */
export function weightOf(card: Card | undefined): number {
  if (!card) return 3;
  return [0, 6, 4, 2, 1, 0.5][card.box] ?? 1;
}

/** 0..1 ustalık: kutu seviyesine göre */
export function masteryOf(card: Card | undefined): number {
  if (!card) return 0;
  return (card.box - 1) / (MAX_BOX - 1);
}
