import { Fragment } from 'react';
import { t } from '../i18n';
import type { Atlas, Selection } from '../map-engine/types';
import { chainOf } from '../lib/routes';
import { IconChevron } from './icons';

export function Breadcrumb({ atlas, selection, onGo }: { atlas: Atlas; selection: Selection; onGo: (s: Selection) => void }) {
  const chain = chainOf(selection);
  const name = (s: Selection) =>
    s.unitId ? atlas.unitById.get(s.unitId)?.name : s.groupId ? atlas.groupById.get(s.groupId)?.name : atlas.rootName;
  return (
    <nav aria-label={t.map.breadcrumb} className="glass min-w-0 max-w-full rounded-2xl">
      <ol className="no-scrollbar flex h-12 items-center overflow-x-auto px-1.5">
        {chain.map((s, i) => {
          const last = i === chain.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && <IconChevron size={16} className="mx-0.5 shrink-0 text-[var(--ink-3)]" />}
              <li className="shrink-0">
                {last ? (
                  <span aria-current="location" className="block px-2.5 text-[15px] font-bold text-[var(--ink)]">
                    {name(s)}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="pressable h-10 rounded-xl px-2.5 text-[15px] font-semibold text-[var(--ink-2)] hover:bg-[var(--accent-tint)]"
                    onClick={() => onGo(s)}
                  >
                    {name(s)}
                  </button>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
