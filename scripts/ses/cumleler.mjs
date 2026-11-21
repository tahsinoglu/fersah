// Ses paketi için cümle listesini yazar: node scripts/ses/cumleler.mjs <çıktı.json>
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
const r = await build({ entryPoints: ['src/kids/phrases.ts'], bundle: true, format: 'esm', platform: 'node', write: false, loader: { '.json': 'json' } });
const mod = await import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);
writeFileSync(process.argv[2], JSON.stringify(mod.allPhrases(), null, 1));
console.log(mod.allPhrases().length, 'cümle');
