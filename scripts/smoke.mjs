// Derleme sonunda: FERSAH_SMOKE=1 ise sunucu duman testini paketleyip çalıştırır (yalnızca önizleme derlemesi için).
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
if (process.env.FERSAH_SMOKE === '1') {
  mkdirSync('node_modules/.cache', { recursive: true });
  const out = 'node_modules/.cache/fersah-smoke.mjs';
  try {
    execFileSync('npx', ['esbuild', 'server/smoke.ts', '--bundle', '--platform=node', '--format=esm', '--packages=external', `--outfile=${out}`], { stdio: 'inherit' });
    execFileSync('node', [out], { stdio: 'inherit' });
  } catch (e) {
    console.log('[duman] çalıştırılamadı', String(e).slice(0, 300));
  }
}
