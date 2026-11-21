import { readFileSync } from 'node:fs';
const topo = JSON.parse(readFileSync('public/geo/dunya.topo.json','utf8'));
const { atlasFromTopology } = await import('../../src/data/atlases.ts');
console.time('build'); const a = atlasFromTopology('cihan', topo); console.timeEnd('build');
console.log(a.units.length, a.groups.map(g=>g.name+':'+g.units.length).join(' '));
