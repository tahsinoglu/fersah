import { useState } from 'react';
import { t } from '../i18n';
import type { Answer } from '../game/evaluate';
import { formatDuration, type Tile } from '../scoring/score';
import { IconCheck, IconClose } from './icons';

const TILE_CLS: Record<Tile, string> = {
  dogru: 'bg-[var(--correct)]',
  yakin: 'bg-[#e3b54a]',
  yanlis: 'bg-[var(--wrong)]',
};

export function ResultView({
  title, answers, names, score, ms, tiles, share, speedrun, best, onAgain, onBack, backLabel,
}: {
  title: string;
  answers: Answer[];
  names: Record<string, string>;
  score: number;
  ms: number;
  tiles?: Tile[];
  share?: string;
  speedrun?: boolean;
  best?: number;
  onAgain?: () => void;
  onBack: () => void;
  backLabel: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const total = tiles?.length ?? answers.length;
  const correct = tiles ? tiles.filter((x) => x === 'dogru').length : answers.filter((a) => a.correct).length;
  const missed = [...new Set(answers.filter((a) => !a.correct).map((a) => a.target))];
  const isRecord = speedrun && best !== undefined && Math.abs(best - ms) < 1;

  const doShare = async () => {
    if (!share) return;
    try {
      if (navigator.share) {
        await navigator.share({ text: share });
        return;
      }
    } catch {
      /* iptal edildi ya da desteklenmiyor: panoya kopyala */
    }
    try {
      await navigator.clipboard.writeText(share);
      setCopied(t.daily.copied);
    } catch {
      setCopied(t.daily.copyFailed);
    }
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
      <div className="mx-auto flex max-w-[520px] flex-col gap-4">
        <header className="text-center">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{t.game.resultTitle}</p>
          <h1 className="mt-1 text-balance text-[24px] font-extrabold leading-tight">{title}</h1>
        </header>

        <section className="glass-strong rounded-[22px] p-5 text-center">
          <p className="text-[48px] font-extrabold leading-none tabular-nums text-[var(--accent)]">{score.toLocaleString('tr-TR')}</p>
          <p className="mt-1 text-[14px] font-semibold text-[var(--ink-3)]">{t.game.score}</p>
          {tiles && (
            <div className="mt-4 flex justify-center gap-1.5" role="img" aria-label={`${correct}/${total}`}>
              {tiles.map((x, i) => (
                <span key={i} className={`h-6 w-6 rounded-md ${TILE_CLS[x]}`} />
              ))}
            </div>
          )}
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-wide text-[var(--ink-3)]">{t.game.accuracy}</dt>
              <dd className="text-[20px] font-extrabold tabular-nums">%{total ? Math.round((correct / total) * 100) : 0}</dd>
            </div>
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-wide text-[var(--ink-3)]">Doğru</dt>
              <dd className="text-[20px] font-extrabold tabular-nums">{correct}/{total}</dd>
            </div>
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-wide text-[var(--ink-3)]">{t.game.time}</dt>
              <dd className="text-[20px] font-extrabold tabular-nums">{formatDuration(ms)}</dd>
            </div>
          </dl>
          {speedrun && (
            <p className={`mt-4 text-[15px] font-bold ${isRecord ? 'text-[var(--correct)]' : 'text-[var(--ink-2)]'}`}>
              {isRecord ? t.game.newRecord : best !== undefined ? t.game.bestTime(formatDuration(best)) : ''}
            </p>
          )}
        </section>

        {share && (
          <section className="glass rounded-[22px] p-4">
            <pre className="select-text whitespace-pre-wrap break-words font-sans text-[15px] font-semibold leading-relaxed">{share}</pre>
            <button type="button" onClick={doShare} className="pressable mt-3 h-[52px] w-full rounded-2xl bg-[var(--accent)] text-[16px] font-extrabold text-[var(--on-accent)]">
              {t.daily.share}
            </button>
            {copied && <p className="mt-2 text-center text-[13px] font-semibold text-[var(--ink-3)]" role="status">{copied}</p>}
            <p className="mt-2 text-center text-[13px] font-medium text-[var(--ink-3)]">{t.daily.nextIn}</p>
          </section>
        )}

        {answers.length > 0 && (
          <section className="glass rounded-[22px] p-4">
            <h2 className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{missed.length ? t.game.missedList : t.game.allCorrect}</h2>
            <ul className="flex flex-wrap gap-2">
              {(missed.length ? missed : []).map((id) => (
                <li key={id} className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--hairline)] px-3 text-[15px] font-semibold">
                  <IconClose size={16} className="text-[var(--wrong)]" />
                  {names[id]}
                </li>
              ))}
              {!missed.length && (
                <li className="flex items-center gap-1.5 text-[15px] font-semibold text-[var(--correct)]">
                  <IconCheck size={18} /> {correct}/{total}
                </li>
              )}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-2.5">
          {onAgain && (
            <button type="button" onClick={onAgain} className="pressable h-[56px] rounded-2xl bg-[var(--accent)] text-[17px] font-extrabold text-[var(--on-accent)]">
              {t.game.again}
            </button>
          )}
          <button type="button" onClick={onBack} className="glass pressable h-[56px] rounded-2xl text-[17px] font-bold">
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
