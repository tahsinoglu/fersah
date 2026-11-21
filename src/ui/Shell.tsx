import type { ReactNode } from 'react';
import { useMedia } from '../lib/viewport';
import { Segmented, TabBar, type Section } from './SectionSwitch';
import { ThemeMenu } from './ThemeMenu';
import { FersahLogo, FersahMark } from './Logo';
import { VersionBadge } from './VersionBadge';

/** Harita dışı sayfalar için ortak iskelet: başlık, tema, sekmeler */
export function Shell({ section, title, children }: { section: Section; title: string; children: ReactNode }) {
  const desktop = useMedia('(min-width: 768px)');
  return (
    <div className="app-bg fixed inset-0 flex flex-col text-[var(--ink)]">
      <header className="flex shrink-0 items-center gap-3 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        {desktop ? (
          <>
            <FersahLogo size={24} />
            <Segmented current={section} />
          </>
        ) : (
          <FersahMark size={34} />
        )}
        <h1 className={`min-w-0 flex-1 truncate text-[26px] font-semibold ${desktop ? 'sr-only' : ''}`}>{title}</h1>
        {desktop && <div className="flex-1" />}
        <ThemeMenu />
      </header>
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <div className="mx-auto flex max-w-[640px] flex-col gap-5">
          {children}
          <VersionBadge />
        </div>
      </main>
      {!desktop && <TabBar current={section} />}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{children}</h2>;
}
