// Derleme sonunda: FERSAH_SMOKE=1 ise sunucu duman testini paketleyip çalıştırır (yalnızca önizleme derlemesi için).
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
if (process.env.FERSAH_SMOKE === '1') {
  const out = join(process.env.TMPDIR ?? '/tmp', 'fersah-smoke.mjs');
  execFileSync('npx', ['esbuild', 'server/smoke.ts', '--bundle', '--platform=node', '--format=esm', '--packages=external', `--outfile=${out}`], { stdio: 'inherit' });
  execFileSync('node', [out], { stdio: 'inherit' });
}
