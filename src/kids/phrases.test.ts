import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { allPhrases } from './phrases';
import ses from './ses.json';

describe('Küçük Seyyah ses paketi', () => {
  it('her cümlenin kaydı var', () => {
    const map = ses as Record<string, string>;
    const missing = allPhrases().filter((p) => !map[p] || !existsSync(`public/ses/${map[p]}`));
    expect(missing).toEqual([]);
  });
});
