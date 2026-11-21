import { zoomIdentity, type ZoomTransform } from 'd3-zoom';
import type { Box, Pt } from './types';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Kutuyu, kenar boşlukları düşülmüş görünür alana ortalayan dönüşüm. */
export function fitTransform(box: Box, width: number, height: number, inset: Insets, fill = 0.88): ZoomTransform {
  const [[x0, y0], [x1, y1]] = box;
  const aw = Math.max(40, width - inset.left - inset.right);
  const ah = Math.max(40, height - inset.top - inset.bottom);
  const bw = Math.max(1e-6, x1 - x0);
  const bh = Math.max(1e-6, y1 - y0);
  const k = Math.min(aw / bw, ah / bh) * fill;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const tx = inset.left + aw / 2 - k * cx;
  const ty = inset.top + ah / 2 - k * cy;
  return zoomIdentity.translate(tx, ty).scale(k);
}

/** Yön tuşuyla en uygun komşuyu seç: yön içinde, açısı ve uzaklığı küçük olan. */
export function pickDirectional<T>(
  from: Pt,
  items: { item: T; p: Pt }[],
  dir: 'left' | 'right' | 'up' | 'down',
): T | undefined {
  const v: Pt = dir === 'left' ? [-1, 0] : dir === 'right' ? [1, 0] : dir === 'up' ? [0, -1] : [0, 1];
  let best: T | undefined;
  let bestScore = Infinity;
  for (const { item, p } of items) {
    const dx = p[0] - from[0];
    const dy = p[1] - from[1];
    const along = dx * v[0] + dy * v[1];
    if (along <= 1e-6) continue;
    const across = Math.abs(dx * v[1] - dy * v[0]);
    const score = along + across * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}
