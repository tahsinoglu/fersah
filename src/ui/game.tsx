import { useEffect, useState, type ReactNode } from 'react';
import { t } from '../i18n';
import type { Fact } from '../game/content';
import type { MapUnit } from '../map-engine/types';
import { IconCheck, IconClose } from './icons';
import { loadDetailedCountries, silhouettePath } from '../game/silhouette';

/** Üst bilgi şeridi: çıkış, ilerleme, puan */
export function GameHud({ onExit, progress, score, extra }: { onExit: () => void; progress: string; score: number; extra?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onExit}
        aria-label={t.game.exit}
        className="glass pressable grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[var(--ink)]"
      >
        <IconClose size={20} />
      </button>
      <div className="glass flex h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl px-4 text-[15px] font-bold tabular-nums">
        <span aria-label="İlerleme">{progress}</span>
        {extra}
        <span aria-label={t.game.score} className="text-[var(--accent)]">
          {t.game.points(score)}
        </span>
      </div>
    </div>
  );
}

/** Soru kartı */
export function PromptCard({ label, title, sub }: { label: string; title: string; sub?: string }) {
  return (
    <div className="glass-strong mt-2 rounded-2xl px-4 py-3 text-center" aria-live="polite">
      <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{label}</p>
      <h1 className="truncate text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
      {sub && <p className="text-[14px] font-semibold text-[var(--ink-2)]">{sub}</p>}
    </div>
  );
}

export type OptionState = 'idle' | 'ok' | 'bad' | 'dim';

/** Dört şık (2×2). Doğru/yanlış renkle ve simgeyle gösterilir. */
export function OptionGrid({
  options, names, states, disabled, onPick,
}: {
  options: string[];
  names: Record<string, string>;
  states: Record<string, OptionState>;
  disabled: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Şıklar">
      {options.map((id, i) => {
        const st = states[id] ?? 'idle';
        const cls =
          st === 'ok'
            ? 'bg-[var(--correct)] text-white border-transparent'
            : st === 'bad'
              ? 'bg-[var(--wrong)] text-white border-transparent'
              : st === 'dim'
                ? 'opacity-50'
                : '';
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            data-option={id}
            onClick={() => onPick(id)}
            className={`glass-strong pressable flex min-h-[60px] items-center justify-center gap-2 rounded-2xl px-3 text-center text-[17px] font-bold leading-tight ${cls}`}
          >
            <span className="sr-only">{`Şık ${i + 1}: `}</span>
            {st === 'ok' && <IconCheck size={20} />}
            {st === 'bad' && <IconClose size={20} />}
            <span className="min-w-0 break-words">{names[id]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Cevaptan sonra açılan kart: sonuç, doğru cevap, bilgi */
export function FeedbackCard({
  ok, title, lines, fact, capitals, onNext, nextLabel,
}: {
  ok: boolean;
  title: string;
  lines: string[];
  fact?: Fact;
  capitals?: string[];
  onNext: () => void;
  nextLabel: string;
}) {
  // Kart açılınca "Devam"a odaklan (klavyeyle hızlı ilerleme)
  const [btn, setBtn] = useState<HTMLButtonElement | null>(null);
  useEffect(() => btn?.focus({ preventScroll: true }), [btn]);
  return (
    <section className="glass-strong card-in rounded-[20px] p-4" aria-live="assertive">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ${ok ? 'bg-[var(--correct)]' : 'bg-[var(--wrong)]'}`}
          aria-hidden="true"
        >
          {ok ? <IconCheck size={22} /> : <IconClose size={22} />}
        </span>
        <div className="min-w-0">
          <h2 className="text-[20px] font-extrabold leading-tight">{title}</h2>
          {lines.map((l) => (
            <p key={l} className="text-[15px] font-semibold text-[var(--ink-2)]">
              {l}
            </p>
          ))}
        </div>
      </div>
      {(fact || capitals?.length) && (
        <div className="mt-3 rounded-2xl bg-[var(--accent-tint)] px-3.5 py-3 text-[15px] leading-snug">
          {capitals && capitals.length > 0 && (
            <p className="font-bold">
              {capitals.length > 1 ? t.game.capitals : t.game.capital}: {capitals.join(', ')}
            </p>
          )}
          {fact && <p className={capitals?.length ? 'mt-1' : ''}>{fact.metin}</p>}
          {fact && (
            <a href={fact.kaynak} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[12.5px] font-semibold text-[var(--ink-3)] underline">
              {t.game.factSource}: Vikipedi
            </a>
          )}
        </div>
      )}
      <button
        ref={setBtn}
        type="button"
        onClick={onNext}
        className="pressable mt-3 h-[54px] w-full rounded-2xl bg-[var(--accent)] text-[17px] font-extrabold text-[var(--on-accent)]"
      >
        {nextLabel}
      </button>
    </section>
  );
}

/** Yalnızca şekil. Cihan'da ayrıntılı şekil yüklenir; yüklenene kadar haritadaki sade şekil gösterilir. */
export function Silhouette({ unit, detailed }: { unit: MapUnit; detailed?: boolean }) {
  const [d, setD] = useState<string | null>(null);
  useEffect(() => {
    setD(null);
    if (!detailed) return;
    let alive = true;
    loadDetailedCountries()
      .then((m) => {
        const f = m.get(unit.id);
        if (alive && f) setD(silhouettePath(f));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [unit.id, detailed]);
  const [[x0, y0], [x1, y1]] = unit.frame;
  const pad = Math.max(x1 - x0, y1 - y0) * 0.08;
  const viewBox = d ? '-6 -6 112 112' : `${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}`;
  return (
    <div className="glass-strong card-in mx-auto grid aspect-square w-full max-w-[300px] place-items-center rounded-[22px] p-5">
      <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label="Siluet">
        <path d={d ?? unit.d} fill="var(--accent-glow)" fillOpacity={0.9} stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/** Hepsini Bitir sayacı */
export function Stopwatch({ start, running }: { start: number; running: boolean }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);
  const s = Math.max(0, Math.floor((now - start) / 1000));
  return <span className="tabular-nums" aria-label={t.game.time}>{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</span>;
}
