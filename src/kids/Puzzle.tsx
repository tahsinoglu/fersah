import { useEffect, useMemo, useRef, useState } from 'react';
import type { Atlas, MapGroup } from '../map-engine/types';
import { shuffle, createRng } from '../quiz-engine/random';
import { speak } from './speech';
import { addStar, pick } from './store';
import { ENCOURAGE, PRAISE, placeIt, thisIs } from './phrases';

type Pt = [number, number];

interface Props {
  atlas: Atlas;
  /** Tamamlanınca */
  onDone: () => void;
}

/** Yapboz: bölgeleri (ya da kıtaları) sürükleyip yerine bırak. Süre ve hata sayacı yok. */
export function Puzzle({ atlas, onDone }: Props) {
  const groups = useMemo(() => atlas.groups.filter((g) => g.units.length && g.id !== 'antarktika'), [atlas]);
  const order = useMemo(() => shuffle(groups, createRng(Date.now())), [groups]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [offset, setOffset] = useState<Pt>([0, 0]);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [sparkle, setSparkle] = useState<{ id: number; at: Pt } | null>(null);
  const [message, setMessage] = useState<string>('Parçayı tut ve haritadaki yerine sürükle.');
  const [misses, setMisses] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const current: MapGroup | undefined = order[placed.length];

  // Tahta: harita kutusu + altında parça tepsisi
  const [[x0, y0], [x1, y1]] = atlas.frame;
  const W = x1 - x0;
  const H = y1 - y0;
  const pad = W * 0.04;
  const trayH = Math.max(H * 0.75, W * 0.45);
  const vb = { x: x0 - pad, y: y0 - pad, w: W + 2 * pad, h: H + 2 * pad + trayH };
  const trayCenter: Pt = [x0 + W / 2, y1 + pad + trayH / 2];
  const snapDist = W * 0.07;

  const centerOf = (g: MapGroup): Pt => [(g.frame[0][0] + g.frame[1][0]) / 2, (g.frame[0][1] + g.frame[1][1]) / 2];

  // Yeni parça tepside belirir
  useEffect(() => {
    if (!current) return;
    const c = centerOf(current);
    setSnapping(false);
    setOffset([trayCenter[0] - c[0], trayCenter[1] - c[1]]);
    setMisses(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    if (current) speak(placeIt(current.name));
  }, [current]);

  const toSvg = (dx: number, dy: number): Pt => {
    const m = svgRef.current?.getScreenCTM();
    return m ? [dx / m.a, dy / m.d] : [dx, dy];
  };

  const onDown = (e: React.PointerEvent) => {
    if (!current || snapping) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset[0], oy: offset[1] };
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const [dx, dy] = toSvg(e.clientX - d.x, e.clientY - d.y);
    let ox = d.ox + dx;
    let oy = d.oy + dy;
    // Mıknatıs: yerine yaklaşınca hafifçe içeri çekilir
    const dist = Math.hypot(ox, oy);
    if (dist < snapDist * 1.6) {
      const pull = 1 - dist / (snapDist * 1.6);
      ox *= 1 - pull * 0.5;
      oy *= 1 - pull * 0.5;
    }
    setOffset([ox, oy]);
  };
  const onUp = () => {
    if (!drag.current || !current) return;
    drag.current = null;
    setDragging(false);
    const dist = Math.hypot(offset[0], offset[1]);
    if (dist < snapDist * 1.4) {
      // Yerine otur
      setSnapping(true);
      setOffset([0, 0]);
      const praise = pick(PRAISE);
      setMessage(`${praise} Bu ${current.name}.`);
      speak([praise, thisIs(current.name)]);
      try {
        navigator.vibrate?.(15);
      } catch {
        /* yok */
      }
      setSparkle({ id: Date.now(), at: current.label });
      const next = [...placed, current.id];
      window.setTimeout(() => {
        setPlaced(next);
        if (next.length === order.length) {
          addStar();
          window.setTimeout(onDone, 900);
        }
      }, 420);
    } else if (dist < W * 0.5) {
      const m = misses + 1;
      setMisses(m);
      const enc = m >= 2 ? 'Parlayan yere bak, ipucu orada!' : pick(ENCOURAGE);
      setMessage(enc);
    }
  };

  const color = (g: MapGroup) => `hsl(${g.hue} 72% 72%)`;

  return (
    <div className="flex h-full flex-col">
      <p className="kids-bubble mx-auto mb-2 max-w-[520px] text-center" aria-live="polite">
        {message}
      </p>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="mx-auto min-h-0 w-full max-w-[720px] flex-1 touch-none select-none"
        role="img"
        aria-label="Yapboz tahtası"
      >
        {/* Tepsi */}
        <rect x={x0} y={y1 + pad * 0.5} width={W} height={trayH} rx={W * 0.03} className="kids-tray" />
        {/* Hedef gölgeleri */}
        {groups.map((g) => (
          <path
            key={g.id}
            d={g.outline}
            className={`kids-ghost${current?.id === g.id && misses >= 2 ? ' hint' : ''}`}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Yerleşmiş parçalar */}
        {groups
          .filter((g) => placed.includes(g.id))
          .map((g) => (
            <path key={g.id} d={g.outline} fill={color(g)} className="kids-piece placed" vectorEffect="non-scaling-stroke" />
          ))}
        {/* Elindeki parça */}
        {current && !placed.includes(current.id) && (
          <g
            className={`kids-piece-wrap${dragging ? ' dragging' : ''}`}
            style={{ transform: `translate(${offset[0]}px, ${offset[1]}px)` }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            role="button"
            aria-label={`${current.name} parçası`}
          >
            {/* Görünmez geniş tutma alanı: ince ya da delikli parçalar da kolayca tutulsun */}
            <rect
              x={current.frame[0][0] - W * 0.02}
              y={current.frame[0][1] - W * 0.02}
              width={current.frame[1][0] - current.frame[0][0] + W * 0.04}
              height={current.frame[1][1] - current.frame[0][1] + W * 0.04}
              fill="transparent"
            />
            <path d={current.outline} fill={color(current)} className="kids-piece active" vectorEffect="non-scaling-stroke" />
          </g>
        )}
        {sparkle && <Sparkle key={sparkle.id} at={sparkle.at} r={W * 0.06} />}
      </svg>
    </div>
  );
}

function Sparkle({ at, r }: { at: Pt; r: number }) {
  return (
    <g className="kids-sparkle" transform={`translate(${at[0]} ${at[1]})`}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1={Math.cos(a) * r * 0.3} y1={Math.sin(a) * r * 0.3} x2={Math.cos(a) * r} y2={Math.sin(a) * r} />;
      })}
      <circle r={r * 0.18} />
    </g>
  );
}
