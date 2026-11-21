import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import type { AtlasId } from '../data/atlases';
import type { Atlas, MapUnit, Selection } from '../map-engine/types';
import { IconClose, IconPlay } from './icons';

/** Mobil alt sayfanın kapalıyken görünen yüksekliği (px). Kamera hesabı da bunu kullanır. */
export const SHEET_PEEK = 200;
export const SIDE_PANEL_W = 380;

function formatPop(n: number): string {
  if (!n || n < 0) return '';
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: n >= 1e7 ? 0 : 1 })} milyon`;
  if (n >= 1e3) return `${Math.round(n / 1e3).toLocaleString('tr-TR')} bin`;
  return n.toLocaleString('tr-TR');
}

interface Content {
  eyebrow: string;
  title: string;
  sub: string;
  note?: string;
  playLabel: string;
  playable: boolean;
  children: MapUnit[];
  childLabel?: string;
}

function contentOf(id: AtlasId, atlas: Atlas, sel: Selection): Content | null {
  const g = sel.groupId ? atlas.groupById.get(sel.groupId) : undefined;
  if (!g) return null;
  const u = sel.unitId ? atlas.unitById.get(sel.unitId) : undefined;
  const mem = id === 'memleket';
  if (!u) {
    const kids = g.units.filter((x) => x.selectable && (mem || x.extra.ulke));
    return {
      eyebrow: t.search.kind[`group_${id}`],
      title: mem ? `${g.name} ${t.panel.regionWord}` : g.name,
      sub: mem ? t.panel.ilCount(kids.length) : t.panel.countryCount(kids.length),
      playLabel: t.panel[`play_group_${id}`],
      playable: g.selectable && kids.length > 0 && g.id !== 'antarktika',
      children: [...kids].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
      childLabel: mem ? 'İller' : 'Ülkeler',
    };
  }
  const isCountry = mem || !!u.extra.ulke;
  return {
    eyebrow: `${t.search.kind[`unit_${id}`]} · ${g.name}`,
    title: u.name,
    sub: mem ? t.panel.plaka(String(u.extra.plaka)) : isCountry ? t.panel.population(formatPop(Number(u.extra.nufus))) : t.panel.territory,
    note: !mem && isCountry ? t.panel.populationNote : undefined,
    playLabel: t.panel[`play_unit_${id}`],
    playable: isCountry,
    children: [],
  };
}

function MasteryRing({ value }: { value: number }) {
  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[52px] w-[52px] shrink-0 place-items-center" aria-label={`${t.panel.mastery} %${value}`} role="img">
      <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--hairline)" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--accent-glow)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} />
      </svg>
      <span className="absolute text-[12px] font-extrabold text-[var(--ink-2)]">%{value}</span>
    </div>
  );
}

function Body({ c, onClose, onPick, peek }: { c: Content; onClose: () => void; onPick: (u: MapUnit) => void; peek?: boolean }) {
  return (
    <>
      <div className={peek ? 'flex flex-col' : ''} style={peek ? { minHeight: SHEET_PEEK - 28 } : undefined}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{c.eyebrow}</p>
            <h2 className="mt-0.5 truncate text-[26px] font-extrabold leading-tight tracking-tight">{c.title}</h2>
            <p className="mt-0.5 truncate text-[15px] font-semibold text-[var(--ink-2)]">{c.sub}</p>
            {c.note && <p className="truncate text-[12px] font-medium text-[var(--ink-3)]">{c.note}</p>}
          </div>
          <MasteryRing value={0} />
          <button
            type="button"
            onClick={onClose}
            aria-label={t.panel.close}
            className="pressable -mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--ink-3)] hover:bg-[var(--accent-tint)]"
          >
            <IconClose size={20} />
          </button>
        </div>
        <div className={peek ? 'mt-auto pt-3' : 'mt-4'}>
          <button
            type="button"
            disabled
            aria-describedby="play-note"
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-[16px] font-extrabold text-[var(--on-accent)] opacity-55"
          >
            <IconPlay size={18} />
            {c.playLabel}
          </button>
          <p id="play-note" className="mt-1.5 text-center text-[12.5px] font-medium text-[var(--ink-3)]">
            {c.playable ? t.panel.comingSoon : t.panel.notPlayable}
          </p>
        </div>
      </div>
      {c.children.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{c.childLabel}</h3>
          <ul className="flex flex-wrap gap-2">
            {c.children.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onPick(u)}
                  className="pressable h-11 rounded-xl border border-[var(--hairline)] px-3.5 text-[15px] font-semibold text-[var(--ink-2)] hover:bg-[var(--accent-tint)]"
                >
                  {u.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

interface PanelProps {
  atlasId: AtlasId;
  atlas: Atlas;
  selection: Selection;
  onClose: () => void;
  onGo: (s: Selection) => void;
}

/** Son geçerli içeriği tut ki kapanırken boş kalmasın */
function useStickyContent(atlasId: AtlasId, atlas: Atlas, selection: Selection) {
  const c = contentOf(atlasId, atlas, selection);
  const last = useRef<Content | null>(c);
  if (c) last.current = c;
  return { open: !!c, content: last.current };
}

export function SidePanel({ atlasId, atlas, selection, onClose, onGo }: PanelProps) {
  const { open, content } = useStickyContent(atlasId, atlas, selection);
  return (
    <aside
      aria-label={content?.title}
      aria-hidden={!open}
      inert={!open}
      className="glass-strong absolute bottom-4 right-4 top-20 z-20 flex flex-col overflow-hidden rounded-[18px] transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(.2,.8,.2,1)]"
      style={{ width: SIDE_PANEL_W, transform: open ? 'none' : `translateX(${SIDE_PANEL_W + 32}px)`, opacity: open ? 1 : 0 }}
    >
      <div className="no-scrollbar flex-1 overflow-y-auto p-5">
        {content && <Body c={content} onClose={onClose} onPick={(u) => onGo({ groupId: u.groupId, unitId: u.id })} />}
      </div>
    </aside>
  );
}

/** Mobil: alttan yukarı çekilen sayfa. Aşağı çekip bırakınca bir üst seviyeye çıkar. */
export function BottomSheet({ atlasId, atlas, selection, onClose, onGo, bottom }: PanelProps & { bottom: number }) {
  const { open, content } = useStickyContent(atlasId, atlas, selection);
  const [expanded, setExpanded] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; t: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fullH = Math.min(560, Math.round(window.innerHeight * 0.66));
  const collapsedY = fullH - SHEET_PEEK;

  useEffect(() => {
    setExpanded(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selection.groupId, selection.unitId]);

  const baseY = !open ? fullH + bottom + 24 : expanded ? 0 : collapsedY;
  const y = drag !== null ? Math.max(-12, baseY + drag) : baseY;

  const onDown = (e: React.PointerEvent) => {
    if (expanded && scrollRef.current && scrollRef.current.scrollTop > 0 && !(e.target as HTMLElement).closest('[data-handle]')) return;
    start.current = { y: e.clientY, t: performance.now() };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    if (drag === null && Math.abs(dy) < 6) return;
    if (drag === null) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag(dy);
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (drag === null || !s) return;
    const v = drag / Math.max(1, performance.now() - s.t); // px/ms
    const finalY = baseY + drag;
    setDrag(null);
    if (!expanded && (drag > 70 || v > 0.6)) onClose();
    else if (finalY < collapsedY / 2 || v < -0.5) setExpanded(true);
    else setExpanded(false);
    e.preventDefault();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 overflow-hidden" style={{ bottom }}>
    <section
      aria-label={content?.title}
      aria-hidden={!open}
      inert={!open}
      className="glass-strong pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col rounded-t-[22px]"
      style={{
        height: fullH,
        transform: `translateY(${y}px)`,
        transition: drag !== null ? 'none' : 'transform 380ms cubic-bezier(.2,.8,.2,1)',
        touchAction: 'none',
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <button
        type="button"
        data-handle
        aria-label={expanded ? 'Daralt' : 'Genişlet'}
        aria-expanded={expanded}
        onClick={() => setExpanded((x) => !x)}
        className="mx-auto flex h-7 w-24 shrink-0 items-center justify-center"
      >
        <span className="h-1.5 w-10 rounded-full bg-[var(--ink-3)] opacity-40" />
      </button>
      <div ref={scrollRef} className={`no-scrollbar flex-1 px-5 pb-5 ${expanded ? 'overflow-y-auto' : 'overflow-hidden'}`} style={{ touchAction: expanded ? 'pan-y' : 'none' }}>
        {content && <Body c={content} peek onClose={onClose} onPick={(u) => onGo({ groupId: u.groupId, unitId: u.id })} />}
      </div>
    </section>
    </div>
  );
}
