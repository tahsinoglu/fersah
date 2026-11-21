import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { select } from 'd3-selection';
import 'd3-transition';
import { easeCubicInOut } from 'd3-ease';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { fitTransform, pickDirectional, type Insets } from './camera';
import { depthOf, type Atlas, type Box, type MapGroup, type MapUnit, type Pt, type Selection } from './types';
import './map.css';

export interface MapViewHandle {
  /** Geçerli seviyeyi yeniden çerçevele */
  recenter: () => Promise<void>;
  /** Kamerayı bir birime kaydır (oyunda doğru yeri göstermek için) */
  flyToUnit: (id: string, fill?: number, extraBottom?: number) => Promise<void>;
  /** Doğru cevap: vurgu renginde kısa nabız */
  pulse: (id: string) => void;
  /** Yanlış cevap: mercan renginde kısa yanıp sönme */
  flash: (id: string) => void;
}

/** Haritaya iliştirilen işaret (✓, ✗ ya da tıklanan nokta) */
export interface MapMark {
  id: string;
  kind: 'ok' | 'bad' | 'pin';
  at: Pt; // boylam, enlem
}

export interface MapLine {
  from: Pt;
  to: Pt;
}

export interface MapViewProps {
  atlas: Atlas;
  selection: Selection;
  insets: Insets;
  onSelect?: (sel: Selection) => void;
  onUp?: () => void;
  /** 'explore': seviyeli gezinme; 'pick': oyun, kapsamdaki birimlere dokunulur */
  interaction?: 'explore' | 'pick';
  /** pick modunda dokunulabilen birimler */
  pickable?: ReadonlySet<string>;
  /** pick modunda dokunma: birim (yoksa null) ve dokunulan nokta [boylam, enlem] */
  onPick?: (unitId: string | null, lonlat: Pt | null) => void;
  /** Birim → boya sınıfı (p-ok, p-target, p-m3 …) */
  paint?: Record<string, string>;
  /** Grup → boya sınıfı (öğrenme haritasında üst seviye) */
  groupPaint?: Record<string, string>;
  /** Parlayan çerçeve seçim yerine bu birimde */
  highlight?: string | null;
  marks?: MapMark[];
  line?: MapLine | null;
  /** Etiketler (oyun sırasında kapatılır) */
  labels?: boolean;
  reducedMotion?: boolean;
  ariaLabel: string;
  className?: string;
}

/** Kamera geçiş süresi (ms) */
const FLY_MS = 720;
const LONG_PRESS_MS = 350;
const MOVE_CANCEL_PX = 8;
const HIT_RADIUS_PX = 22;
const SMALL_PX = 18;
/** Perde için haritadan çok büyük dikdörtgen */
const VEIL_RECT = 'M-100000,-100000H100000V100000H-100000Z';

type Target = { kind: 'group'; group: MapGroup } | { kind: 'unit'; unit: MapUnit };
const keyOf = (t: Target) => (t.kind === 'group' ? `g:${t.group.id}` : `u:${t.unit.id}`);

function frameFor(atlas: Atlas, sel: Selection): { box: Box; fill: number } {
  if (sel.unitId) {
    const u = atlas.unitById.get(sel.unitId);
    if (u) return { box: u.frame, fill: 0.62 };
  }
  if (sel.groupId) {
    const g = atlas.groupById.get(sel.groupId);
    if (g) return { box: g.frame, fill: 0.9 };
  }
  return { box: atlas.frame, fill: 0.94 };
}

/** Bir birime dokunulunca hangi hedefin seçileceği (seviyeye göre). */
function resolveTarget(atlas: Atlas, sel: Selection, unit: MapUnit, pickable?: ReadonlySet<string>): Target | null {
  if (pickable) return pickable.has(unit.id) ? { kind: 'unit', unit } : null;
  const group = atlas.groupById.get(unit.groupId);
  if (!group) return null;
  const depth = depthOf(sel);
  if (depth === 0) return group.selectable ? { kind: 'group', group } : null;
  if (unit.groupId !== sel.groupId) return group.selectable ? { kind: 'group', group } : null;
  if (!unit.selectable) return null;
  return { kind: 'unit', unit };
}

function targetSelection(t: Target): Selection {
  return t.kind === 'group' ? { groupId: t.group.id } : { groupId: t.unit.groupId, unitId: t.unit.id };
}

interface LabelSpec {
  key: string;
  text: string;
  p: Pt;
  w: number;
  h: number;
  kind: 'group' | 'unit';
  always: boolean;
  selected: boolean;
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    atlas, selection, insets, onSelect, onUp, labels = true, reducedMotion = false, ariaLabel, className,
    interaction = 'explore', pickable, onPick, paint, groupPaint, highlight, marks, line,
  },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const labelRef = useRef<SVGGElement>(null);
  const hitRef = useRef<SVGGElement>(null);
  const hoverRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const fxOkRef = useRef<SVGPathElement>(null);
  const fxBadRef = useRef<SVGPathElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const tRef = useRef<ZoomTransform>(zoomIdentity);
  const levelKRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const firstFrameRef = useRef(true);
  const hotRef = useRef<{ key: string; target: Target; source: 'mouse' | 'touch' | 'key' } | null>(null);
  const visibleLabelsRef = useRef(new Set<string>());
  const flyingRef = useRef(false);

  // Güncel değerleri olay işleyicilerinde kullanmak için
  const live = useRef({ atlas, selection, onSelect, onUp, reducedMotion, interaction, pickable, onPick });
  live.current = { atlas, selection, onSelect, onUp, reducedMotion, interaction, pickable, onPick };

  const depth = depthOf(selection);
  const focusGroup = selection.groupId ? atlas.groupById.get(selection.groupId) : undefined;
  const selUnit = selection.unitId ? atlas.unitById.get(selection.unitId) : undefined;

  // ---------- Etiketler ----------
  const labelSpecs = useMemo<LabelSpec[]>(() => {
    if (!labels) return [];
    const box = (b: Box) => ({ w: b[1][0] - b[0][0], h: b[1][1] - b[0][1] });
    if (depth === 0) {
      return atlas.groups
        .filter((g) => g.units.length > 0 && g.id !== 'antarktika')
        .map((g) => ({ key: `g:${g.id}`, text: g.name, p: g.label, ...box(g.frame), kind: 'group' as const, always: true, selected: false }));
    }
    const area = (u: MapUnit) => (u.bbox[1][0] - u.bbox[0][0]) * (u.bbox[1][1] - u.bbox[0][1]);
    const units = (focusGroup?.units.filter((u) => u.selectable) ?? []).sort(
      (a, b) => Number(b.id === selection.unitId) - Number(a.id === selection.unitId) || area(b) - area(a),
    );
    return units.map((u) => ({
      key: `u:${u.id}`, text: u.name, p: u.label, ...box(u.bbox), kind: 'unit' as const,
      always: u.id === selection.unitId, selected: u.id === selection.unitId,
    }));
  }, [atlas, depth, focusGroup, labels, selection.unitId]);

  // Küçük hedefler için büyütülmüş görünmez dokunma alanları
  const hitSpecs = useMemo(
    () =>
      atlas.units
        .filter((u) => u.selectable)
        .map((u) => ({ u, size: Math.max(u.bbox[1][0] - u.bbox[0][0], u.bbox[1][1] - u.bbox[0][1]) }))
        .filter((x) => x.size < 40),
    [atlas],
  );

  const layoutHits = useCallback((t: ZoomTransform) => {
    const hg = hitRef.current;
    if (!hg) return;
    for (const c of Array.from(hg.children) as SVGCircleElement[]) {
      const small = Number(c.dataset.size) * t.k < SMALL_PX;
      c.setAttribute('r', small ? (HIT_RADIUS_PX / t.k).toFixed(3) : '0');
    }
  }, []);

  const layout = useCallback((t: ZoomTransform) => {
    const lg = labelRef.current;
    const levelK = levelKRef.current;
    const vis = visibleLabelsRef.current;
    vis.clear();
    if (lg) {
      const scale = Math.min(1.3, Math.max(0.9, Math.pow(t.k / levelK, 0.22)));
      const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
      for (const el of Array.from(lg.children) as SVGTextElement[]) {
        const px = Number(el.dataset.px);
        const py = Number(el.dataset.py);
        const base = el.dataset.kind === 'group' ? 16 : 13.5;
        const fs = base * scale;
        const sw = Number(el.dataset.w) * t.k;
        const sh = Number(el.dataset.h) * t.k;
        const chars = Number(el.dataset.len);
        const tw = chars * fs * 0.56;
        const sx = t.x + t.k * px;
        const sy = t.y + t.k * py;
        let fits = el.dataset.always === '1' || (tw <= sw * 1.05 && fs * 1.1 <= sh);
        // Çakışma: öncelik sırasına göre (DOM sırası) yerleşen etiketlerle üst üste binen gizlenir
        const r = { x0: sx - tw / 2 - 3, x1: sx + tw / 2 + 3, y0: sy - fs * 0.62, y1: sy + fs * 0.62 };
        if (fits && placed.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0)) fits = false;
        if (fits) placed.push(r);
        el.setAttribute('x', sx.toFixed(1));
        el.setAttribute('y', sy.toFixed(1));
        el.style.fontSize = `${fs.toFixed(1)}px`;
        el.classList.toggle('lbl-hidden', !fits);
        if (fits) vis.add(el.dataset.key!);
      }
    }
    const mg = markRef.current;
    if (mg) {
      for (const el of Array.from(mg.children) as HTMLElement[]) {
        const x = t.x + t.k * Number(el.dataset.px);
        const y = t.y + t.k * Number(el.dataset.py);
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      }
    }
    positionTip(t);
  }, []);

  // ---------- Vurgu (üstüne gelme / basılı tutma / klavye) ----------
  const positionTip = (t: ZoomTransform = tRef.current) => {
    const tip = tipRef.current;
    const hot = hotRef.current;
    if (!tip) return;
    if (!hot || live.current.interaction === 'pick' || (visibleLabelsRef.current.has(hot.key) && hot.source === 'mouse')) {
      tip.classList.remove('tip-on');
      return;
    }
    const p = hot.target.kind === 'group' ? hot.target.group.label : hot.target.unit.label;
    tip.textContent = hot.target.kind === 'group' ? hot.target.group.name : hot.target.unit.name;
    tip.style.transform = `translate(${(t.x + t.k * p[0]).toFixed(1)}px, ${(t.y + t.k * p[1]).toFixed(1)}px) translate(-50%, -150%)`;
    tip.classList.add('tip-on');
  };

  const setHot = useCallback((target: Target | null, source: 'mouse' | 'touch' | 'key' = 'mouse') => {
    const world = worldRef.current;
    const prev = hotRef.current;
    const key = target ? keyOf(target) : null;
    if (prev && prev.key === key) {
      prev.source = source;
      positionTip();
      return;
    }
    if (world && prev) world.querySelectorAll('.hot').forEach((el) => el.classList.remove('hot'));
    hotRef.current = target ? { key: key!, target, source } : null;
    const hover = hoverRef.current;
    if (world && target) {
      const sel = target.kind === 'group' ? `[data-g="${target.group.id}"]` : `path[data-u="${target.unit.id}"]`;
      world.querySelector(sel)?.classList.add('hot');
      if (hover) {
        hover.setAttribute('d', target.kind === 'group' ? target.group.outline : target.unit.d);
        hover.classList.add('on');
      }
      if (source === 'key' && liveRef.current && live.current.interaction !== 'pick') {
        liveRef.current.textContent = target.kind === 'group' ? target.group.name : target.unit.name;
      }
    } else if (hover) {
      hover.classList.remove('on');
    }
    svgRef.current?.classList.toggle('has-hot', !!target);
    positionTip();
  }, []);

  // ---------- Zoom kurulumu ----------
  useEffect(() => {
    const svg = svgRef.current!;
    const z = d3zoom<SVGSVGElement, unknown>()
      .clickDistance(MOVE_CANCEL_PX)
      .tapDistance(MOVE_CANCEL_PX)
      .on('start', () => {
        svg.classList.add('moving');
      })
      .on('zoom', (e) => {
        const t = e.transform as ZoomTransform;
        tRef.current = t;
        const w = worldRef.current;
        if (w) w.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.k})`;
        // Programlı kamera geçişinde etiketler gizli; yalnızca kullanıcı hareketinde canlı yerleştir
        if (!flyingRef.current) layout(t);
      })
      .on('end', (e) => {
        svg.classList.remove('moving');
        layoutHits(tRef.current);
        const { selection: sel, onUp: up } = live.current;
        // Kullanıcı iki parmakla / tekerlekle belirgin şekilde uzaklaştırdıysa bir üst seviyeye çık
        if (live.current.interaction === 'explore' && up && e.sourceEvent && depthOf(sel) > 0 && tRef.current.k < levelKRef.current * 0.7) up();
      });
    z.filter((ev: Event & { button?: number; ctrlKey?: boolean; type: string }) => (!ev.ctrlKey || ev.type === 'wheel') && !ev.button);
    zoomRef.current = z;
    select(svg).call(z).on('dblclick.zoom', null);
    return () => {
      select(svg).on('.zoom', null);
    };
  }, [layout, layoutHits]);

  // Boyut takibi
  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const w = Math.round(width);
      const h = Math.round(height);
      if (w !== sizeRef.current.w || h !== sizeRef.current.h) {
        sizeRef.current = { w, h };
        setSize({ w, h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Seviye sınırları ve gezinme alanı
  useEffect(() => {
    const z = zoomRef.current;
    if (!z || !size.w) return;
    const root = fitTransform(atlas.frame, size.w, size.h, insets, 0.94);
    z.scaleExtent([root.k * 0.55, root.k * 60]).translateExtent(atlas.extent);
  }, [atlas, size, insets]);

  // ---------- Kamera: seçim değişince yumuşak geçiş ----------
  const flyTo = useCallback(
    (box: Box, fill: number, instant: boolean, setLevel: boolean, ms = FLY_MS, extraBottom = 0): Promise<void> => {
      const svg = svgRef.current;
      const z = zoomRef.current;
      const { w, h } = sizeRef.current;
      if (!svg || !z || !w) return Promise.resolve();
      const ins = insetsRef.current;
      const target = fitTransform(box, w, h, { ...ins, bottom: Math.max(ins.bottom, extraBottom) }, fill);
      if (setLevel) levelKRef.current = target.k;
      const s = select(svg);
      s.interrupt();
      if (instant || live.current.reducedMotion) {
        s.call(z.transform, target);
        layout(target);
        layoutHits(target);
        return Promise.resolve();
      }
      flyingRef.current = true;
      svg.classList.add('flying');
      return new Promise((resolve) => {
        s.transition()
          .duration(ms)
          .ease(easeCubicInOut)
          .call(z.transform, target)
          .on('end interrupt', () => {
            flyingRef.current = false;
            layout(tRef.current);
            layoutHits(tRef.current);
            svg.classList.remove('flying');
            resolve();
          });
      });
    },
    [layout, layoutHits],
  );

  const fly = useCallback(
    (instant: boolean) => {
      const { box, fill } = frameFor(live.current.atlas, live.current.selection);
      return flyTo(box, fill, instant, true);
    },
    [flyTo],
  );

  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  const insetsKey = `${insets.top},${insets.right},${insets.bottom},${insets.left}`;

  useEffect(() => {
    if (!size.w) return;
    const instant = firstFrameRef.current;
    firstFrameRef.current = false;
    fly(instant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.groupId, selection.unitId, atlas, size.w, size.h, insetsKey, fly]);

  // Etiketler değişince yeniden yerleştir
  useLayoutEffect(() => {
    layout(tRef.current);
  }, [labelSpecs, layout]);

  // Seçim değişince vurguyu temizle
  useEffect(() => {
    setHot(null);
  }, [selection.groupId, selection.unitId, setHot]);

  const fx = (el: SVGPathElement | null, id: string) => {
    const u = live.current.atlas.unitById.get(id);
    if (!el || !u) return;
    el.setAttribute('d', u.d);
    el.classList.remove('run');
    void el.getBBox(); // animasyonu yeniden başlat
    el.classList.add('run');
  };

  useImperativeHandle(
    ref,
    () => ({
      recenter: () => fly(false),
      flyToUnit: (id, fill = 0.45, extraBottom = 0) => {
        const u = live.current.atlas.unitById.get(id);
        return u ? flyTo(u.frame, fill, false, false, 600, extraBottom) : Promise.resolve();
      },
      pulse: (id) => fx(fxOkRef.current, id),
      flash: (id) => fx(fxBadRef.current, id),
    }),
    [fly, flyTo],
  );

  // ---------- İşaretçi olayları ----------
  const press = useRef<{ id: number; x: number; y: number; timer: number; long: boolean } | null>(null);
  const suppressClick = useRef(false);

  const targetAt = (e: { target: EventTarget | null; clientX: number; clientY: number }): Target | null => {
    let node = (e.target as Element | null)?.closest?.('[data-u]') as SVGElement | null;
    if (!node) return null;
    if (node.tagName === 'circle') {
      // Üst üste binen dokunma alanlarında parmağa en yakın merkezi seç
      const rect = svgRef.current!.getBoundingClientRect();
      const [px, py] = tRef.current.invert([e.clientX - rect.left, e.clientY - rect.top]);
      let best = Infinity;
      for (const c of Array.from(hitRef.current?.children ?? []) as SVGCircleElement[]) {
        const r = Number(c.getAttribute('r'));
        if (!r) continue;
        const d = Math.hypot(Number(c.getAttribute('cx')) - px, Number(c.getAttribute('cy')) - py);
        if (d <= r && d < best) {
          best = d;
          node = c;
        }
      }
    }
    const unit = live.current.atlas.unitById.get(node.dataset.u!);
    const { atlas: a, selection: sel, interaction: mode, pickable: pk } = live.current;
    return unit ? resolveTarget(a, sel, unit, mode === 'pick' ? (pk ?? new Set()) : undefined) : null;
  };

  /** Ekran noktası → [boylam, enlem] */
  const lonlatAt = (clientX: number, clientY: number): Pt | null => {
    const rect = svgRef.current!.getBoundingClientRect();
    const p = tRef.current.invert([clientX - rect.left, clientY - rect.top]) as Pt;
    return live.current.atlas.invert(p);
  };

  useEffect(() => {
    const svg = svgRef.current!;
    const touches = new Set<number>();

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        if (flyingRef.current || e.buttons) return;
        setHot(targetAt(e), 'mouse');
        return;
      }
      const p = press.current;
      if (p && p.id === e.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_CANCEL_PX) {
        clearTimeout(p.timer);
        if (p.long) setHot(null);
        press.current = null;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      touches.add(e.pointerId);
      if (press.current) {
        clearTimeout(press.current.timer);
        if (press.current.long) setHot(null);
        press.current = null;
      }
      if (touches.size > 1 || live.current.interaction === 'pick') return;
      const target = targetAt(e);
      const id = e.pointerId;
      const timer = window.setTimeout(() => {
        if (press.current?.id !== id) return;
        press.current.long = true;
        setHot(target, 'touch');
      }, LONG_PRESS_MS);
      press.current = { id, x: e.clientX, y: e.clientY, timer, long: false };
    };
    const onUpPtr = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      const p = press.current;
      if (!p || p.id !== e.pointerId) return;
      clearTimeout(p.timer);
      if (p.long) {
        // Basılı tutma bir "önizleme"dir, bırakınca seçmez
        suppressClick.current = true;
        window.setTimeout(() => (suppressClick.current = false), 400);
        window.setTimeout(() => {
          if (hotRef.current?.source === 'touch') setHot(null);
        }, 650);
      }
      press.current = null;
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setHot(null);
    };
    const onClick = (e: MouseEvent) => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      const target = targetAt(e);
      if (live.current.interaction === 'pick') {
        live.current.onPick?.(target?.kind === 'unit' ? target.unit.id : null, lonlatAt(e.clientX, e.clientY));
        return;
      }
      if (!target) return;
      live.current.onSelect?.(targetSelection(target));
    };
    const onContext = (e: Event) => e.preventDefault();

    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointerup', onUpPtr);
    svg.addEventListener('pointercancel', onUpPtr);
    svg.addEventListener('pointerleave', onLeave);
    svg.addEventListener('click', onClick);
    svg.addEventListener('contextmenu', onContext);
    return () => {
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointerup', onUpPtr);
      svg.removeEventListener('pointercancel', onUpPtr);
      svg.removeEventListener('pointerleave', onLeave);
      svg.removeEventListener('click', onClick);
      svg.removeEventListener('contextmenu', onContext);
    };
  }, [setHot]);

  // ---------- Klavye ----------
  const keyTargets = useCallback((): Target[] => {
    const { atlas: a, selection: sel, interaction: mode, pickable: pk } = live.current;
    if (mode === 'pick') return a.units.filter((u) => pk?.has(u.id)).map((unit) => ({ kind: 'unit', unit }));
    const groups = a.groups.filter((g) => g.selectable && g.units.length && g.id !== 'antarktika');
    if (!sel.groupId) return groups.map((group) => ({ kind: 'group', group }));
    const fg = a.groupById.get(sel.groupId);
    const units: Target[] = (fg?.units ?? []).filter((u) => u.selectable).map((unit) => ({ kind: 'unit', unit }));
    return [...units, ...groups.filter((g) => g.id !== sel.groupId).map((group): Target => ({ kind: 'group', group }))];
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dirs: Record<string, 'left' | 'right' | 'up' | 'down'> = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    };
    const ptOf = (t: Target): Pt => (t.kind === 'group' ? t.group.label : t.unit.label);
    if (dirs[e.key]) {
      e.preventDefault();
      const items = keyTargets();
      if (!items.length) return;
      const cur = hotRef.current?.target;
      let next: Target | undefined;
      if (!cur) {
        next = (selUnit && items.find((t) => t.kind === 'unit' && t.unit.id === selUnit.id)) || items[0];
        if (selUnit && next && keyOf(next) === `u:${selUnit.id}`) {
          next = pickDirectional(ptOf(next), items.map((item) => ({ item, p: ptOf(item) })), dirs[e.key]) ?? next;
        }
      } else {
        next = pickDirectional(ptOf(cur), items.map((item) => ({ item, p: ptOf(item) })), dirs[e.key]) ?? cur;
      }
      setHot(next ?? null, 'key');
    } else if (e.key === 'Enter' || e.key === ' ') {
      const cur = hotRef.current?.target;
      if (cur) {
        e.preventDefault();
        if (interaction === 'pick' && cur.kind === 'unit') onPick?.(cur.unit.id, live.current.atlas.invert(cur.unit.label));
        else onSelect?.(targetSelection(cur));
      }
    }
  };

  // ---------- Çizim ----------
  const hlUnit = highlight !== undefined ? (highlight ? atlas.unitById.get(highlight) : undefined) : selUnit;
  const glowD = hlUnit ? hlUnit.d : highlight !== undefined ? '' : focusGroup ? focusGroup.outline : '';
  const glowKey = hlUnit ? `u:${hlUnit.id}` : focusGroup ? `g:${focusGroup.id}` : 'none';
  const lineP = line ? [atlas.project(line.from), atlas.project(line.to)] : null;
  const markSpecs = (marks ?? [])
    .map((m) => ({ m, p: atlas.project(m.at) }))
    .filter((x): x is { m: MapMark; p: Pt } => !!x.p);

  // İşaretler değişince yerleştir
  useLayoutEffect(() => {
    layout(tRef.current);
  }, [marks, layout]);

  return (
    <div ref={wrapRef} className={`map-wrap ${className ?? ''}`}>
      <svg
        ref={svgRef}
        className={`map depth-${depth} mode-${interaction}`}
        width={size.w || undefined}
        height={size.h || undefined}
        role="application"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => hotRef.current?.source === 'key' && setHot(null)}
      >
        <g ref={worldRef} className="world">
          {/* Küçük yerler için dokunma alanları: ülkelerin altında, yalnızca denizde yakalar */}
          <g ref={hitRef} className="hits">
            {hitSpecs.map(({ u, size: s }) => (
              <circle key={u.id} data-u={u.id} data-size={s} cx={u.label[0]} cy={u.label[1]} r={0} />
            ))}
          </g>
          {atlas.groups.map((g) => {
            const state = !focusGroup ? 'idle' : g.id === focusGroup.id ? 'focus' : 'dim';
            return (
              <g
                key={g.id}
                data-g={g.id}
                className={`grp grp-${state}${groupPaint?.[g.id] ? ` ${groupPaint[g.id]}` : ''}`}
                style={{ '--h': g.hue, '--s': `${g.sat}%`, '--oh': g.darkHue } as CSSProperties}
              >
                {g.units.map((u) => (
                  <path
                    key={u.id}
                    data-u={u.id}
                    d={u.d}
                    className={`unit t${u.tone}${u.id === selection.unitId ? ' sel' : ''}${selUnit && u.id !== selUnit.id ? ' sib' : ''}${paint?.[u.id] ? ` ${paint[u.id]}` : ''}`}
                  />
                ))}
              </g>
            );
          })}
          <path className="grp-borders" d={atlas.groupBorders} />
          <path className="coast" d={atlas.outline} />
          <path className={`veil${focusGroup ? ' on' : ''}`} d={VEIL_RECT + (focusGroup ? focusGroup.outline : '')} />
          {glowD && (
            <g key={glowKey} className="glow">
              <path className="glow-wide" d={glowD} />
              <path className="glow-line" d={glowD} />
            </g>
          )}
          <path ref={hoverRef} className="hover-line" />
          <path ref={fxBadRef} className="fx fx-bad" />
          <path ref={fxOkRef} className="fx fx-ok" />
          {lineP?.[0] && lineP[1] && (
            <line className="shot-line" x1={lineP[0][0]} y1={lineP[0][1]} x2={lineP[1][0]} y2={lineP[1][1]} />
          )}
        </g>
        <g ref={labelRef} key={`${depth}:${selection.groupId ?? ''}`} className="labels" aria-hidden="true">
          {labelSpecs.map((l) => (
            <text
              key={l.key}
              data-key={l.key}
              data-px={l.p[0]}
              data-py={l.p[1]}
              data-w={l.w}
              data-h={l.h}
              data-len={l.text.length}
              data-kind={l.kind}
              data-always={l.always ? '1' : '0'}
              className={`lbl lbl-${l.kind}${l.selected ? ' lbl-sel' : ''}`}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {l.text}
            </text>
          ))}
        </g>
      </svg>
      <div ref={markRef} className="map-marks" aria-hidden="true">
        {markSpecs.map(({ m, p }) => (
          <div key={m.id} data-px={p[0]} data-py={p[1]} className={`mark mark-${m.kind}`}>
            {m.kind === 'ok' ? <MarkIcon ok /> : m.kind === 'bad' ? <MarkIcon /> : null}
          </div>
        ))}
      </div>
      <div ref={tipRef} className="map-tip" aria-hidden="true" />
      <div ref={liveRef} className="sr-only" aria-live="polite" />
    </div>
  );
});

/** Doğru/yanlış yalnızca renkle değil, simgeyle de gösterilir */
function MarkIcon({ ok = false }: { ok?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ok ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7 7 17" />}
    </svg>
  );
}
