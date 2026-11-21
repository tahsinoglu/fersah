import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { t } from '../i18n';
import type { AtlasId } from '../data/atlases';
import { MODES, type ModeId } from '../quiz-engine/types';
import { IconClose } from './icons';
import { ModeIcon } from './ModeIcon';

/** Kapsam seçildikten sonra oyun modunu seçtiren alt sayfa / pencere */
export function ModeSheet({ atlasId, scopeSlug, scopeLabel, onClose }: { atlasId: AtlasId; scopeSlug: string; scopeLabel: string; onClose: () => void }) {
  const navigate = useNavigate();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const go = (m: ModeId) => navigate(`/oyun/${atlasId}/${m}/${scopeSlug}`);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby="mode-title">
      <button type="button" aria-label={t.panel.close} className="sheet-scrim absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="glass-strong sheet-up relative w-full max-w-[520px] rounded-t-[24px] p-4 md:rounded-[24px]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{scopeLabel}</p>
            <h2 id="mode-title" className="text-[22px] font-extrabold leading-tight">{t.game.choose}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t.panel.close} className="pressable grid h-11 w-11 place-items-center rounded-xl text-[var(--ink-3)]">
            <IconClose size={20} />
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {MODES.map((m, i) => (
            <li key={m}>
              <button
                ref={i === 0 ? first : undefined}
                type="button"
                data-mode={m}
                onClick={() => go(m)}
                className="pressable flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-[var(--hairline)] px-3 text-left hover:bg-[var(--accent-tint)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent)]">
                  <ModeIcon mode={m} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-extrabold">{t.modes[m].name}</span>
                  <span className="block text-[14px] font-medium text-[var(--ink-2)]">{t.modes[m].desc}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
