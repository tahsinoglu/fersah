import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHANGELOG } from './changelog';

describe('sürüm notları', () => {
  it('en üstteki sürüm package.json sürümüyle aynı', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(CHANGELOG[0].version).toBe(pkg.version);
  });
});
