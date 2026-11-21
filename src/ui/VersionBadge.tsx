import { useState } from 'react';
import { CHANGELOG } from '../data/changelog';
import { IconClose } from './icons';

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

/** Sayfa altında sürüm numarası; dokununca yenilikler açılır */
export function VersionBadge() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto block rounded-full px-3 py-1.5 text-[12.5px] font-medium tabular-nums text-[var(--ink-3)] hover:bg-[var(--accent-tint)]"
        aria-label={`Fersah sürüm ${APP_VERSION}, yenilikleri gör`}
      >
        fersah · sürüm {APP_VERSION}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby="yenilikler">
          <button type="button" aria-label="Kapat" className="sheet-scrim absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="glass-strong sheet-up relative max-h-[80vh] w-full max-w-[520px] overflow-y-auto rounded-t-[24px] p-5 md:rounded-[24px]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
            <div className="mb-3 flex items-center gap-3">
              <h2 id="yenilikler" className="flex-1 text-[22px] font-semibold">Yenilikler</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="pressable grid h-11 w-11 place-items-center rounded-xl text-[var(--ink-3)]">
                <IconClose size={20} />
              </button>
            </div>
            {CHANGELOG.map((r) => (
              <section key={r.version} className="mb-4">
                <h3 className="text-[16px] font-semibold tabular-nums">
                  Sürüm {r.version} <span className="text-[13px] font-medium text-[var(--ink-3)]">· {r.date}</span>
                </h3>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] text-[var(--ink-2)]">
                  {r.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
