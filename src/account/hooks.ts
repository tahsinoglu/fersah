import type { RoundRecord } from '../progress/store';

type Listener = (r: RoundRecord) => void;
const listeners = new Set<Listener>();

/** Bir tur bitince çağrılır (hesap sistemi puanı sunucuya gönderir, tebrik mesajlarını tetikler) */
export function onRoundFinished(r: RoundRecord) {
  listeners.forEach((l) => l(r));
}

export function subscribeRounds(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
