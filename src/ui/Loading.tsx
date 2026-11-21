import { t } from '../i18n';
import { FersahMark } from './Logo';

/** Açılış / bekleme ekranı (Kimlik Rehberi 03): işaret, üç renkli nokta, "Tefekkür ediliyor…" */
export function Loading({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${overlay ? 'absolute inset-0 z-30' : 'h-full'} flex flex-col items-center justify-center gap-5 text-[var(--ink-3)]`}
    >
      <FersahMark size={64} />
      <div className="flex gap-1.5" aria-hidden="true">
        <span className="thinking-dot h-2 w-2 rounded-full bg-[#3C78C8]" />
        <span className="thinking-dot h-2 w-2 rounded-full bg-[#F2B33D]" />
        <span className="thinking-dot h-2 w-2 rounded-full bg-[#34A169]" />
      </div>
      <p className="text-[15px] font-medium">{t.app.loading}</p>
    </div>
  );
}
