import { describe, expect, it } from 'vitest';
import { fitTransform, pickDirectional } from './camera';

describe('fitTransform', () => {
  it('kutuyu görünür alanın ortasına sığdırır', () => {
    const t = fitTransform([[0, 0], [100, 50]], 400, 400, { top: 0, right: 0, bottom: 200, left: 0 }, 1);
    expect(t.k).toBeCloseTo(4);
    // Merkez (50,25) → görünür alanın merkezi (200,100)
    expect(t.apply([50, 25])).toEqual([200, 100]);
  });
});

describe('pickDirectional', () => {
  const items = [
    { item: 'sag', p: [10, 0] as [number, number] },
    { item: 'sol', p: [-10, 0] as [number, number] },
    { item: 'yukari', p: [0, -10] as [number, number] },
    { item: 'capraz', p: [8, 8] as [number, number] },
  ];
  it('yöne en uygun komşuyu seçer', () => {
    expect(pickDirectional([0, 0], items, 'right')).toBe('sag');
    expect(pickDirectional([0, 0], items, 'left')).toBe('sol');
    expect(pickDirectional([0, 0], items, 'up')).toBe('yukari');
    expect(pickDirectional([0, 0], items, 'down')).toBe('capraz');
  });
  it('o yönde kimse yoksa undefined döner', () => {
    expect(pickDirectional([100, 0], items, 'right')).toBeUndefined();
  });
});
