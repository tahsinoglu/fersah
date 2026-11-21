import { useEffect, useState, useSyncExternalStore } from 'react';
import { FersahMark } from '../ui/Logo';

/** "Tebrikler tahsinoglu!" türünden gaz veren mesajlar */
export interface Celebration {
  kind: 'merhaba' | 'unvan' | 'puan' | 'sira' | 'tur' | 'seri';
  text: string;
  sub?: string;
}

let queue: (Celebration & { id: number })[] = [];
let n = 0;
const listeners = new Set<() => void>();

export function celebrate(c: Celebration) {
  queue = [...queue, { ...c, id: ++n }];
  listeners.forEach((l) => l());
  try {
    if (c.kind !== 'merhaba') navigator.vibrate?.([12, 60, 12]);
  } catch {
    /* yok */
  }
}

function dismiss(id: number) {
  queue = queue.filter((q) => q.id !== id);
  listeners.forEach((l) => l());
}

/** Uygulamanın tepesinde kutlama şeridi (Buğday Altını: rozet, seri, ödül) */
export function CelebrationHost() {
  const items = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => queue,
  );
  const cur = items[0];
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!cur) return;
    setLeaving(false);
    const t1 = window.setTimeout(() => setLeaving(true), 3600);
    const t2 = window.setTimeout(() => dismiss(cur.id), 3900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [cur]);
  if (!cur) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-3" style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }}>
      <button
        type="button"
        onClick={() => dismiss(cur.id)}
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-[460px] items-center gap-3 rounded-2xl border border-[#e8c46f] bg-[#fdf1d2] px-4 py-3 text-left text-[#142033] shadow-sm ${leaving ? 'celebrate-out' : 'celebrate-in'}`}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white">
          {cur.kind === 'merhaba' ? (
            <FersahMark size={30} ground="#FFFFFF" />
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8Z" fill="#F2B33D" stroke="#c98d12" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[17px] font-semibold leading-tight">{cur.text}</span>
          {cur.sub && <span className="block text-[14px] font-medium text-[#3b4452]">{cur.sub}</span>}
        </span>
      </button>
    </div>
  );
}
