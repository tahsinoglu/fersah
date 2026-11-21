import { useNavigate } from 'react-router';
import { t } from '../i18n';
import { IconChart, IconGlobe, IconHome, IconPlay } from './icons';

export type Section = 'memleket' | 'cihan' | 'oyna' | 'istatistik';

const ITEMS: { id: Section; label: string; Icon: typeof IconHome; atlas?: string }[] = [
  { id: 'memleket', label: t.nav.memleket, Icon: IconHome, atlas: 'memleket' },
  { id: 'cihan', label: t.nav.cihan, Icon: IconGlobe, atlas: 'cihan' },
  { id: 'oyna', label: t.nav.oyna, Icon: IconPlay },
  { id: 'istatistik', label: t.nav.istatistik, Icon: IconChart },
];

/** Mobilde alt sekme çubuğu: ana düğmeler başparmağın ulaştığı yerde */
export function TabBar({ current }: { current: Section }) {
  const navigate = useNavigate();
  return (
    <nav aria-label={t.nav.sections} className="glass-strong pointer-events-auto rounded-t-[22px] border-b-0 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-stretch px-2">
        {ITEMS.map(({ id, label, Icon, atlas }) => {
          const on = id === current;
          return (
            <button
              key={id}
              type="button"
              aria-current={on ? 'page' : undefined}
              data-atlas={atlas}
              data-tab={id}
              onClick={() => !on && navigate(`/${id}`)}
              className={`pressable flex flex-1 flex-col items-center justify-center gap-0.5 text-[12px] font-bold tracking-wide ${
                on ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'
              }`}
            >
              <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 ${on ? 'bg-[var(--accent-tint)]' : ''}`}>
                <Icon size={22} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Masaüstünde üstte bölüm geçişi */
export function Segmented({ current }: { current: Section }) {
  const navigate = useNavigate();
  return (
    <nav aria-label={t.nav.sections} className="glass flex h-12 shrink-0 items-center gap-1 rounded-2xl p-1">
      {ITEMS.map(({ id, label, Icon, atlas }) => {
        const on = id === current;
        return (
          <button
            key={id}
            type="button"
            aria-current={on ? 'page' : undefined}
            data-atlas={atlas}
            data-tab={id}
            onClick={() => !on && navigate(`/${id}`)}
            className={`pressable flex h-10 items-center gap-2 rounded-xl px-3.5 text-[15px] font-bold ${
              on ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm' : 'text-[var(--ink-2)] hover:bg-[var(--accent-tint)]'
            }`}
          >
            <Icon size={19} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
