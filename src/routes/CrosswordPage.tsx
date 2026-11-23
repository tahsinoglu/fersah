import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { ATLAS_IDS, loadAtlas, type AtlasId } from '../data/atlases';
import type { Atlas } from '../map-engine/types';
import { cellsOf, generateCrossword, type Crossword, type PlacedWord } from '../quiz-engine/crossword';
import { crosswordClues } from '../game/crosswordClues';
import { recordAnswer, recordRound } from '../progress/store';
import { onRoundFinished } from '../account/hooks';
import { useSafeArea } from '../lib/viewport';
import { GameHud } from '../ui/game';
import { Loading } from '../ui/Loading';
import { t } from '../i18n';

const K = (r: number, c: number) => `${r},${c}`;
const wordKey = (w: PlacedWord) => `${w.num}${w.dir}`;
const KEYS = ['ERTYUIOPĞÜ', 'ASDFGHJKLŞİ', 'ZCVBNMÖÇ'];
const WORD_POINTS = 100;
const REVEAL_COST = 25;

export function CrosswordPage() {
  const { atlas: id } = useParams();
  const atlasId = id as AtlasId;
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  useEffect(() => {
    if (ATLAS_IDS.includes(atlasId)) loadAtlas(atlasId).then(setAtlas).catch(() => {});
  }, [atlasId]);
  if (!ATLAS_IDS.includes(atlasId)) return <Navigate to="/oyna" replace />;
  return (
    <div data-atlas={atlasId} className="app-bg fixed inset-0 overflow-hidden text-[var(--ink)]">
      {atlas ? <Board key={atlasId} atlasId={atlasId} atlas={atlas} /> : <Loading />}
    </div>
  );
}

function Board({ atlasId, atlas }: { atlasId: AtlasId; atlas: Atlas }) {
  const navigate = useNavigate();
  const safe = useSafeArea();
  const [round, setRound] = useState(0);
  const cw: Crossword = useMemo(() => {
    const seed = `${Date.now()}:${round}`;
    return generateCrossword(crosswordClues(atlasId, atlas, seed), { seed, target: 10, maxSize: 11 });
  }, [atlasId, atlas, round]);

  const [entries, setEntries] = useState<Map<string, string>>(new Map());
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [reveals, setReveals] = useState<Record<string, number>>({});
  const [wrong, setWrong] = useState<string | null>(null);
  const [active, setActive] = useState<{ r: number; c: number; dir: PlacedWord['dir'] }>(() => ({ r: 0, c: 0, dir: 'yatay' }));
  const [done, setDone] = useState(false);
  const start = useRef(Date.now());
  const finishMs = useRef(0);

  // Yeni bulmaca: durumu sıfırla, ilk kelimeye git
  useEffect(() => {
    setEntries(new Map());
    setSolved(new Set());
    setLocked(new Set());
    setReveals({});
    setDone(false);
    start.current = Date.now();
    const w = cw.words[0];
    if (w) setActive({ r: w.row, c: w.col, dir: w.dir });
  }, [cw]);

  const wordAt = useCallback(
    (r: number, c: number, dir: PlacedWord['dir']) => cw.words.find((w) => w.dir === dir && cellsOf(w).some(([a, b]) => a === r && b === c)),
    [cw],
  );
  const current = wordAt(active.r, active.c, active.dir) ?? wordAt(active.r, active.c, active.dir === 'yatay' ? 'dikey' : 'yatay');
  const currentCells = useMemo(() => new Set(current ? cellsOf(current).map(([r, c]) => K(r, c)) : []), [current]);

  const scoreOf = (s: Set<string>, rv: Record<string, number>) =>
    cw.words.filter((w) => s.has(wordKey(w))).reduce((sum, w) => sum + Math.max(0, WORD_POINTS - REVEAL_COST * (rv[wordKey(w)] ?? 0)), 0);
  const score = scoreOf(solved, reveals);

  /** Dolu ve doğru kelimeleri çözülmüş say; yanlış dolanı kısa süre işaretle */
  const evaluate = (ent: Map<string, string>, rv: Record<string, number>, focus?: PlacedWord) => {
    const next = new Set(solved);
    const lock = new Set(locked);
    for (const w of cw.words) {
      if (next.has(wordKey(w))) continue;
      const cells = cellsOf(w);
      const typed = cells.map(([r, c]) => ent.get(K(r, c)) ?? '').join('');
      if (typed.length !== w.letters.length) continue;
      if (typed === w.letters) {
        next.add(wordKey(w));
        cells.forEach(([r, c]) => lock.add(K(r, c)));
        recordAnswer(atlasId, w.about ?? '', !(rv[wordKey(w)] ?? 0));
      } else if (focus && wordKey(focus) === wordKey(w)) {
        setWrong(wordKey(w));
        window.setTimeout(() => setWrong(null), 700);
        try {
          navigator.vibrate?.(30);
        } catch {
          /* yok */
        }
      }
    }
    if (next.size !== solved.size) {
      try {
        navigator.vibrate?.(12);
      } catch {
        /* yok */
      }
      setSolved(next);
      setLocked(lock);
      if (next.size === cw.words.length) finish(next, rv);
      else if (focus && next.has(wordKey(focus))) {
        // Sıradaki çözülmemiş kelimeye geç
        const i = cw.words.findIndex((w) => wordKey(w) === wordKey(focus));
        const nw = [...cw.words.slice(i + 1), ...cw.words.slice(0, i)].find((w) => !next.has(wordKey(w)));
        if (nw) goWord(nw, ent);
      }
    }
  };

  const finish = (s: Set<string>, rv: Record<string, number>) => {
    finishMs.current = Date.now() - start.current;
    setDone(true);
    const clean = cw.words.filter((w) => !(rv[wordKey(w)] ?? 0)).length;
    const rec = { at: Date.now(), atlas: atlasId, scope: 'tum', mode: 'bulmaca', total: cw.words.length, correct: clean, score: scoreOf(s, rv), ms: finishMs.current };
    recordRound(rec);
    onRoundFinished(rec);
  };

  const goWord = (w: PlacedWord, ent = entries) => {
    const cells = cellsOf(w);
    const empty = cells.find(([r, c]) => !ent.get(K(r, c))) ?? cells[0];
    setActive({ r: empty[0], c: empty[1], dir: w.dir });
  };

  const typeLetter = (ch: string) => {
    if (done || !current) return;
    const k = K(active.r, active.c);
    if (locked.has(k)) return advance();
    const ent = new Map(entries);
    ent.set(k, ch);
    setEntries(ent);
    advance(ent);
    evaluate(ent, reveals, current);
  };

  /** Kelimede sonraki boş/kilitsiz hücreye geç */
  const advance = (ent = entries) => {
    if (!current) return;
    const cells = cellsOf(current);
    const i = cells.findIndex(([r, c]) => r === active.r && c === active.c);
    const after = cells.slice(i + 1).find(([r, c]) => !locked.has(K(r, c)) && !ent.get(K(r, c))) ?? cells.slice(i + 1).find(([r, c]) => !locked.has(K(r, c)));
    if (after) setActive({ r: after[0], c: after[1], dir: current.dir });
  };

  const backspace = () => {
    if (done || !current) return;
    const k = K(active.r, active.c);
    const ent = new Map(entries);
    if (ent.get(k) && !locked.has(k)) {
      ent.delete(k);
      setEntries(ent);
      return;
    }
    const cells = cellsOf(current);
    const i = cells.findIndex(([r, c]) => r === active.r && c === active.c);
    const prev = cells.slice(0, i).reverse().find(([r, c]) => !locked.has(K(r, c)));
    if (prev) {
      ent.delete(K(prev[0], prev[1]));
      setEntries(ent);
      setActive({ r: prev[0], c: prev[1], dir: current.dir });
    }
  };

  const reveal = () => {
    if (done || !current) return;
    const k = K(active.r, active.c);
    if (locked.has(k)) return advance();
    const ent = new Map(entries);
    ent.set(k, cw.cells.get(k)!);
    const rv = { ...reveals };
    for (const dir of ['yatay', 'dikey'] as const) {
      const w = wordAt(active.r, active.c, dir);
      if (w && !solved.has(wordKey(w))) rv[wordKey(w)] = (rv[wordKey(w)] ?? 0) + 1;
    }
    setReveals(rv);
    setLocked(new Set(locked).add(k));
    setEntries(ent);
    advance(ent);
    evaluate(ent, rv, current);
  };

  const tapCell = (r: number, c: number) => {
    if (r === active.r && c === active.c) {
      const other = active.dir === 'yatay' ? 'dikey' : 'yatay';
      if (wordAt(r, c, other)) setActive({ r, c, dir: other });
      return;
    }
    const dir = wordAt(r, c, active.dir) ? active.dir : active.dir === 'yatay' ? 'dikey' : 'yatay';
    setActive({ r, c, dir });
  };

  const stepWord = (d: 1 | -1) => {
    if (!current) return;
    const i = cw.words.findIndex((w) => wordKey(w) === wordKey(current));
    const n = cw.words.length;
    for (let j = 1; j <= n; j++) {
      const w = cw.words[(i + d * j + n * 2) % n];
      if (!solved.has(wordKey(w)) || j === n) return goWord(w);
    }
  };

  // Fiziksel klavye
  const handlers = useRef({ typeLetter, backspace, stepWord });
  handlers.current = { typeLetter, backspace, stepWord };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') return handlers.current.backspace();
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        return handlers.current.stepWord(e.shiftKey ? -1 : 1);
      }
      if (e.key === 'Escape') return navigate('/oyna');
      if (e.key.length === 1) {
        const u = e.key === 'i' ? 'İ' : e.key === 'ı' ? 'I' : e.key.toLocaleUpperCase('tr');
        if (/^[A-ZÇĞİÖŞÜ]$/.test(u)) handlers.current.typeLetter(u);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // Hücre boyutu: ekran genişliğine sığsın
  const [vw, setVw] = useState(() => Math.min(window.innerWidth, 560));
  useEffect(() => {
    const on = () => setVw(Math.min(window.innerWidth, 560));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const cell = Math.max(24, Math.min(40, Math.floor((vw - 24) / cw.cols)));

  const title = atlasId === 'memleket' ? 'Çengel Bulmaca · Memleket' : 'Çengel Bulmaca · Cihan';

  if (done) {
    const sec = Math.round(finishMs.current / 1000);
    const clean = cw.words.filter((w) => !(reveals[wordKey(w)] ?? 0)).length;
    return (
      <div className="mx-auto flex h-full max-w-[460px] flex-col justify-center gap-4 px-4" style={{ paddingTop: safe.top }}>
        <div className="glass-strong rounded-[22px] p-6 text-center">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{title}</p>
          <p className="mt-1 font-display text-[26px] font-semibold">Bulmacayı çözdün!</p>
          <p className="mt-3 font-display text-[44px] font-bold leading-none text-[var(--accent)] tabular-nums">{score.toLocaleString('tr-TR')}</p>
          <p className="text-[14px] font-semibold text-[var(--ink-2)]">puan</p>
          <p className="mt-4 text-[15px] font-semibold text-[var(--ink-2)]">
            {clean}/{cw.words.length} kelime yardımsız · {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
          </p>
        </div>
        <button type="button" onClick={() => setRound((n) => n + 1)} className="pressable h-[54px] rounded-2xl bg-[var(--accent)] text-[17px] font-extrabold text-[var(--on-accent)]">
          Yeni bulmaca
        </button>
        <button type="button" onClick={() => navigate('/oyna')} className="glass pressable h-[54px] rounded-2xl text-[17px] font-bold">
          Oyna'ya dön
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-[560px] flex-col px-3" style={{ paddingTop: safe.top + 10, paddingBottom: safe.bottom + 8 }}>
      <GameHud onExit={() => navigate('/oyna')} progress={`${solved.size}/${cw.words.length}`} score={score} />
      <h1 className="sr-only">{title}</h1>

      {/* Izgara */}
      <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        <div
          role="grid"
          aria-label={title}
          className="relative grid select-none"
          style={{ gridTemplateColumns: `repeat(${cw.cols}, ${cell}px)`, gridTemplateRows: `repeat(${cw.rows}, ${cell}px)` }}
        >
          {Array.from({ length: cw.rows * cw.cols }, (_, i) => {
            const r = Math.floor(i / cw.cols);
            const c = i % cw.cols;
            const k = K(r, c);
            if (!cw.cells.has(k)) return <div key={k} aria-hidden="true" />;
            const num = cw.words.find((w) => w.row === r && w.col === c)?.num;
            const isActive = r === active.r && c === active.c;
            const inWord = currentCells.has(k);
            const isLocked = locked.has(k);
            const isWrong = wrong && current && wrong === wordKey(current) && inWord;
            const bg = isWrong ? 'bg-[#fbe0dd]' : isActive ? 'bg-[var(--gold)]' : inWord ? 'bg-[var(--accent-tint)]' : 'bg-white';
            return (
              <button
                key={k}
                type="button"
                role="gridcell"
                onClick={() => tapCell(r, c)}
                aria-label={`${num ? `${num}. ` : ''}${entries.get(k) ?? 'boş'}`}
                className={`relative -mb-px -mr-px border border-[#9aa6b6] ${bg} transition-colors`}
                style={{ width: cell + 1, height: cell + 1 }}
              >
                {num && <span className="absolute left-[2px] top-[1px] text-[9px] font-bold leading-none text-[var(--ink-2)]">{num}</span>}
                <span className={`font-display font-semibold leading-none ${isLocked ? 'text-[var(--correct)]' : 'text-[var(--ink)]'}`} style={{ fontSize: cell * 0.52 }}>
                  {entries.get(k) ?? ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* İpucu */}
      {current && (
        <div className="glass-strong flex items-center gap-2 rounded-2xl px-2 py-2" aria-live="polite">
          <button type="button" aria-label="Önceki kelime" onClick={() => stepWord(-1)} className="pressable grid h-11 w-9 shrink-0 place-items-center rounded-xl text-[20px] text-[var(--ink-2)]">
            ‹
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {current.image && <img src={`${import.meta.env.BASE_URL}${current.image}`} alt="Bayrak" className="h-10 shrink-0 rounded-[5px] border border-[var(--hairline)]" />}
            <p className="min-w-0 text-[15px] font-semibold leading-snug">
              <span className="mr-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] text-[var(--accent)]">
                {current.num} {current.dir === 'yatay' ? 'Soldan sağa' : 'Yukarıdan aşağı'} · {current.letters.length} harf
              </span>
              <span className="block">{current.clue}</span>
            </p>
          </div>
          <button type="button" aria-label="Sonraki kelime" onClick={() => stepWord(1)} className="pressable grid h-11 w-9 shrink-0 place-items-center rounded-xl text-[20px] text-[var(--ink-2)]">
            ›
          </button>
        </div>
      )}

      {/* Türkçe klavye */}
      <div className="mt-2 flex flex-col gap-1.5" aria-label="Klavye">
        {KEYS.map((row, ri) => (
          <div key={row} className="flex justify-center gap-1">
            {ri === 2 && (
              <button type="button" onClick={reveal} className="pressable h-12 flex-[1.6] rounded-lg bg-[var(--gold)] px-1 text-[12px] font-extrabold text-[#142033]">
                Harf aç
              </button>
            )}
            {[...row].map((ch) => (
              <button key={ch} type="button" onClick={() => typeLetter(ch)} className="pressable h-12 min-w-0 flex-1 rounded-lg bg-white text-[17px] font-bold shadow-sm">
                {ch}
              </button>
            ))}
            {ri === 2 && (
              <button type="button" aria-label="Sil" onClick={backspace} className="pressable h-12 flex-[1.6] rounded-lg bg-white text-[18px] font-bold shadow-sm">
                ⌫
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="sr-only">{t.game.points(score)}</p>
    </div>
  );
}
