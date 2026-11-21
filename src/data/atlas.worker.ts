/// <reference lib="webworker" />
// Harita verisini (TopoJSON → SVG yolları, sınırlar, komşuluklar) ana iş parçacığının dışında hazırlar.
import type { Topology } from 'topojson-specification';
import { atlasFromTopology, type AtlasId } from './atlases';

self.onmessage = async (e: MessageEvent<{ id: AtlasId; url: string }>) => {
  try {
    const r = await fetch(e.data.url);
    if (!r.ok) throw new Error(String(r.status));
    const topo = (await r.json()) as Topology;
    const { project: _p, invert: _i, ...atlas } = atlasFromTopology(e.data.id, topo);
    void _p;
    void _i;
    (self as unknown as Worker).postMessage({ ok: true, atlas });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: String(err) });
  }
};
