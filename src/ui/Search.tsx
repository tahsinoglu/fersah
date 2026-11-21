import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import { fold } from '../lib/slug';
import { ATLAS_IDS, loadAtlas, type AtlasId } from '../data/atlases';
import type { Atlas, Selection } from '../map-engine/types';
import { IconClose, IconSearch } from './icons';

interface Item {
  key: string;
  atlasId: AtlasId;
  name: string;
  sub: string;
  folded: string;
  sel: Selection;
  rank: number;
}

function itemsOf(id: AtlasId, a: Atlas): Item[] {
  const kindG = t.search.kind[`group_${id}`];
  const kindU = t.search.kind[`unit_${id}`];
  const groups = a.groups
    .filter((g) => g.units.length)
    .map((g) => ({ key: `${id}:g:${g.id}`, atlasId: id, name: g.name, sub: kindG, folded: fold(g.name), sel: { groupId: g.id }, rank: 0 }));
  const units = a.units
    .filter((u) => u.selectable)
    .map((u) => ({
      key: `${id}:u:${u.id}`, atlasId: id, name: u.name,
      sub: `${kindU} · ${a.groupById.get(u.groupId)?.name ?? ''}`,
      folded: fold(u.name), sel: { groupId: u.groupId, unitId: u.id }, rank: 1,
    }));
  return [...groups, ...units];
}

export function Search({ current, onPick }: { current: AtlasId; onPick: (atlasId: AtlasId, sel: Selection) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open || all.length) return;
    Promise.all(ATLAS_IDS.map((id) => loadAtlas(id).then((a) => itemsOf(id, a)))).then((lists) => setAll(lists.flat()));
  }, [open, all.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const results = useMemo(() => {
    const f = fold(q.trim());
    if (!f) return [];
    return all
      .map((it) => {
        const i = it.folded.indexOf(f);
        if (i < 0) return null;
        const wordStart = i === 0 || it.folded[i - 1] === ' ';
        const score = (i === 0 ? 0 : wordStart ? 1 : 3) + it.rank * 0.5 + (it.atlasId === current ? 0 : 0.8) + it.folded.length / 100;
        return { it, score };
      })
      .filter((x): x is { it: Item; score: number } => !!x)
      .sort((a, b) => a.score - b.score)
      .slice(0, 7)
      .map((x) => x.it);
  }, [q, all, current]);

  useEffect(() => setActive(0), [q]);

  const pick = (it: Item) => {
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
    onPick(it.atlasId, it.sel);
  };

  const showList = open && q.trim().length > 0;

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <div className="glass flex h-12 items-center gap-2 rounded-2xl pl-3.5 pr-1.5">
        <IconSearch size={20} className="shrink-0 text-[var(--ink-3)]" />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="go"
          autoComplete="off"
          spellCheck={false}
          value={q}
          placeholder={t.search.placeholder}
          aria-label={t.search.placeholder}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-medium text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter' && results[active]) {
              e.preventDefault();
              pick(results[active]);
            } else if (e.key === 'Escape') {
              e.stopPropagation();
              setQ('');
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
        />
        {q && (
          <button
            type="button"
            className="pressable grid h-9 w-9 place-items-center rounded-xl text-[var(--ink-3)]"
            aria-label={t.search.clear}
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
          >
            <IconClose size={18} />
          </button>
        )}
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="glass-strong absolute left-0 right-0 top-14 z-50 overflow-hidden rounded-2xl p-1.5">
          {results.length === 0 && <li className="px-3 py-3 text-[15px] text-[var(--ink-3)]">{all.length ? t.search.noResult : t.app.loading}</li>}
          {results.map((it, i) => (
            <li
              key={it.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 ${
                i === active ? 'bg-[var(--accent-tint)]' : ''
              }`}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(it)}
            >
              <span className="truncate text-[16px] font-semibold">{it.name}</span>
              <span className="shrink-0 text-[13px] font-medium text-[var(--ink-3)]">{it.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
