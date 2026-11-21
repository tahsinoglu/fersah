import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { useTheme, type ThemePref } from '../lib/theme';
import { IconAuto, IconCheck, IconMoon, IconSun } from './icons';

const OPTIONS: { v: ThemePref; label: string; Icon: typeof IconSun }[] = [
  { v: 'light', label: t.theme.light, Icon: IconSun },
  { v: 'dark', label: t.theme.dark, Icon: IconMoon },
  { v: 'auto', label: t.theme.auto, Icon: IconAuto },
];

export function ThemeMenu() {
  const [pref, setPref] = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const Current = OPTIONS.find((o) => o.v === pref)!.Icon;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false));
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="glass pressable grid h-12 w-12 place-items-center rounded-2xl text-[var(--ink)]"
        aria-label={`${t.theme.label}: ${OPTIONS.find((o) => o.v === pref)!.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Current />
      </button>
      {open && (
        <div role="menu" className="glass-strong absolute right-0 top-14 z-50 w-44 rounded-2xl p-1.5">
          {OPTIONS.map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              role="menuitemradio"
              aria-checked={pref === v}
              className={`pressable flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold ${
                pref === v ? 'bg-[var(--accent-tint)] text-[var(--ink)]' : 'text-[var(--ink-2)]'
              }`}
              onClick={() => {
                setPref(v);
                setOpen(false);
              }}
            >
              <Icon size={20} />
              <span className="flex-1">{label}</span>
              {pref === v && <IconCheck size={18} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
