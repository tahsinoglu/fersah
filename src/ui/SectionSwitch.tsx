import { t } from '../i18n';
import type { AtlasId } from '../data/atlases';
import { IconGlobe, IconHome } from './icons';

const ITEMS: { id: AtlasId; label: string; Icon: typeof IconHome }[] = [
  { id: 'memleket', label: t.nav.memleket, Icon: IconHome },
  { id: 'cihan', label: t.nav.cihan, Icon: IconGlobe },
];

/** Mobilde alt sekme çubuğu */
export function TabBar({ current, onChange }: { current: AtlasId; onChange: (id: AtlasId) => void }) {
  return (
    <nav aria-label={t.nav.sections} className="glass-strong pointer-events-auto rounded-t-[22px] border-b-0 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-stretch px-3">
        {ITEMS.map(({ id, label, Icon }) => {
          const on = id === current;
          return (
            <button
              key={id}
              type="button"
              aria-current={on ? 'page' : undefined}
              data-atlas={id}
              onClick={() => onChange(id)}
              className={`pressable flex flex-1 flex-col items-center justify-center gap-0.5 text-[12.5px] font-bold tracking-wide ${
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
export function Segmented({ current, onChange }: { current: AtlasId; onChange: (id: AtlasId) => void }) {
  return (
    <nav aria-label={t.nav.sections} className="glass flex h-12 shrink-0 items-center gap-1 rounded-2xl p-1">
      {ITEMS.map(({ id, label, Icon }) => {
        const on = id === current;
        return (
          <button
            key={id}
            type="button"
            aria-current={on ? 'page' : undefined}
            data-atlas={id}
            onClick={() => onChange(id)}
            className={`pressable flex h-10 items-center gap-2 rounded-xl px-4 text-[15px] font-bold ${
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
