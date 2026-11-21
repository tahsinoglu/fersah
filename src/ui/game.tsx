import { useEffect, useState, type ReactNode } from 'react';
import { t } from '../i18n';
import type { Fact } from '../game/content';
import { IconCheck, IconClose, IconTarget } from './icons';

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
      <h1 className="line-clamp-2 text-balance text-[24px] font-semibold leading-tight">{title}</h1>
      {sub && <p className="text-[14px] font-semibold text-[var(--ink-2)]">{sub}</p>}
    </div>
  );
}

export type OptionState = 'idle' | 'ok' | 'bad' | 'dim';

/** Dört şık (2×2). Doğru/yanlış renkle ve simgeyle gösterilir. */
export function OptionGrid({
  options, names, states, disabled, onPick, render, labelOf,
}: {
  options: string[];
  names: Record<string, string>;
  states: Record<string, OptionState>;
  disabled: boolean;
  onPick: (id: string) => void;
  /** Ad yerine görsel şık (plaka, bayrak) */
  render?: (id: string) => ReactNode;
  /** Görsel şıkların ekran okuyucu adı */
  labelOf?: (id: string) => string;
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
            <span className="sr-only">{`Şık ${i + 1}: ${labelOf ? labelOf(id) : ''}`}</span>
            {st === 'ok' && <IconCheck size={20} />}
            {st === 'bad' && <IconClose size={20} />}
            {render ? render(id) : <span className="min-w-0 break-words">{names[id]}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Cevaptan sonra açılan kart: sonuç, doğru cevap, bilgi */
export function FeedbackCard({
  ok, near = false, title, lines, fact, capitals, onNext, nextLabel,
}: {
  ok: boolean;
  /** Yakın Atış'ta yakın ama isabet değil: altın renk */
  near?: boolean;
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
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${ok ? 'bg-[var(--correct)] text-white' : near ? 'bg-[var(--gold)] text-[#142033]' : 'bg-[var(--wrong)] text-white'}`}
          aria-hidden="true"
        >
          {ok ? <IconCheck size={22} /> : near ? <IconTarget size={22} /> : <IconClose size={22} />}
        </span>
        <div className="min-w-0">
          <h2 className="text-[19px] font-semibold leading-tight">{title}</h2>
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
          {fact?.kaynak && (
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

/** Türk plakası görünümü: solda mavi TR şeridi, beyaz zemin, siyah kod */
export function PlateBadge({ code, large = false }: { code: string; large?: boolean }) {
  return (
    <span
      className={`inline-flex items-stretch overflow-hidden rounded-[8px] border-2 border-[#142033] bg-white font-display font-semibold text-[#142033] ${large ? 'h-[84px] text-[52px]' : 'h-[46px] text-[26px]'}`}
      aria-label={`Plaka ${code}`}
      role="img"
    >
      <span className={`flex flex-col items-center justify-end bg-[#2C64AE] pb-1 font-sans text-white ${large ? 'w-10 text-[15px]' : 'w-6 text-[10px]'}`} aria-hidden="true">
        TR
      </span>
      <span className={`flex items-center tabular-nums tracking-wider ${large ? 'px-6' : 'px-3'}`} aria-hidden="true">
        {code}
      </span>
    </span>
  );
}

/** Bayrak görseli (flag-icons, MIT) */
export function FlagImage({ iso, large = false }: { iso: string; large?: boolean }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}flags/${iso}.svg`}
      alt="Bayrak"
      draggable={false}
      className={`rounded-[6px] border border-[var(--hairline)] object-cover ${large ? 'aspect-[4/3] w-full max-w-[280px]' : 'aspect-[4/3] h-[44px]'}`}
    />
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
