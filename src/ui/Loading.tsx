import { t } from '../i18n';

export function Loading({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${overlay ? 'absolute inset-0 z-30' : 'h-full'} flex flex-col items-center justify-center gap-4 text-[var(--ink-2)]`}
    >
      <div className="flex gap-2" aria-hidden="true">
        <span className="thinking-dot h-2.5 w-2.5 rounded-full bg-[var(--accent-glow)]" />
        <span className="thinking-dot h-2.5 w-2.5 rounded-full bg-[var(--accent-glow)]" />
        <span className="thinking-dot h-2.5 w-2.5 rounded-full bg-[var(--accent-glow)]" />
      </div>
      <p className="text-[17px] font-semibold tracking-wide">{t.app.loading}</p>
    </div>
  );
}
