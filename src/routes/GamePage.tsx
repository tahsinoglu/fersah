import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { t } from '../i18n';
import { ATLAS_IDS, loadAtlas, type AtlasId } from '../data/atlases';
import { MapView, type MapLine, type MapMark, type MapViewHandle } from '../map-engine/MapView';
import type { Atlas, MapUnit, Selection } from '../map-engine/types';
import type { Insets } from '../map-engine/camera';
import { generateDaily, generateRound } from '../quiz-engine/generate';
import { dailyKey, dailyNumber, dailySeed } from '../quiz-engine/daily';
import { MODES, type ModeId, type Question, type RoundPlan } from '../quiz-engine/types';
import { NEAR_SCALE_KM, shareText, tileOf } from '../scoring/score';
import { weightOf } from '../progress/leitner';
import { cardKey, getProgress, recordAnswer, recordDaily, recordRound, useProgress } from '../progress/store';
import { accusative, capitalsOf, factOf, scopeName, scopeUnits, toItems } from '../game/content';
import { evaluateChoice, evaluateNear, type Answer } from '../game/evaluate';
import { prefersReducedMotion } from '../lib/theme';
import { useSafeArea } from '../lib/viewport';
import { pathFor } from '../lib/routes';
import { Loading } from '../ui/Loading';
import { FeedbackCard, GameHud, OptionGrid, PromptCard, Silhouette, Stopwatch, type OptionState } from '../ui/game';
import { ResultView } from '../ui/ResultView';

type GameMode = ModeId | 'gunluk';
const NONE: ReadonlySet<string> = new Set();
/** Siluet için en küçük şekil boyu (projeksiyon birimi; dünya genişliği 1000) */
const SILHOUETTE_MIN = 3.2;

/** /oyun/:atlas/:mode/:scope ve /gunluk/:atlas */
export function GamePage({ daily = false }: { daily?: boolean }) {
  const { atlas: atlasParam, mode: modeParam, scope: scopeParam } = useParams();
  const atlasId = atlasParam as AtlasId;
  const mode = (daily ? 'gunluk' : modeParam) as GameMode;
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ATLAS_IDS.includes(atlasId)) return;
    loadAtlas(atlasId).then(setAtlas, () => setError(true));
  }, [atlasId]);

  if (!ATLAS_IDS.includes(atlasId) || (!daily && !MODES.includes(mode as ModeId))) return <Navigate to="/oyna" replace />;

  let scope = 'tum';
  if (!daily && scopeParam && scopeParam !== 'tum') {
    const g = atlas?.groups.find((x) => x.slug === scopeParam);
    if (atlas && !g) return <Navigate to={`/oyun/${atlasId}/${mode}/tum`} replace />;
    scope = g?.id ?? scopeParam;
  }

  return (
    <div data-atlas={atlasId} className="app-bg fixed inset-0 overflow-hidden text-[var(--ink)]">
      {atlas ? (
        <Game key={`${atlasId}:${mode}:${scope}`} atlasId={atlasId} atlas={atlas} mode={mode} scope={scope} />
      ) : error ? (
        <p className="grid h-full place-items-center px-8 text-center font-semibold text-[var(--ink-2)]">{t.app.loadError}</p>
      ) : (
        <Loading />
      )}
    </div>
  );
}

type Phase = 'ask' | 'reveal' | 'done';

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* desteklenmiyor */
  }
}

function Game({ atlasId, atlas, mode, scope }: { atlasId: AtlasId; atlas: Atlas; mode: GameMode; scope: string }) {
  const navigate = useNavigate();
  const safe = useSafeArea();
  const mapRef = useRef<MapViewHandle>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const progress = useProgress();
  const today = useMemo(() => dailyKey(atlasId), [atlasId]);
  const dailyDone = mode === 'gunluk' ? progress.daily[`${atlasId}:${today}`] : undefined;

  const units = useMemo(() => {
    const all = scopeUnits(atlasId, atlas, scope);
    if (mode !== 'siluet' || atlasId !== 'cihan') return all;
    // Çok küçük ülkelerin silueti tanınamaz (Andorra, Malta, ada devletleri…): siluet havuzundan çıkar
    return all.filter((u) => Math.max(u.frame[1][0] - u.frame[0][0], u.frame[1][1] - u.frame[0][1]) >= SILHOUETTE_MIN);
  }, [atlasId, atlas, scope, mode]);
  const pickable = useMemo(() => new Set(units.map((u) => u.id)), [units]);
  const names = useMemo(() => Object.fromEntries(atlas.units.map((u) => [u.id, u.name])), [atlas]);
  const allIds = useMemo(() => new Set(atlas.units.map((u) => u.id)), [atlas]);

  const [round, setRound] = useState(0);
  const plan: RoundPlan = useMemo(() => {
    const items = toItems(units);
    const neighbors = (id: string) => atlas.unitById.get(id)?.neighbors ?? [];
    if (mode === 'gunluk') return generateDaily(items, dailySeed(atlasId, today), neighbors);
    const cards = getProgress().cards;
    return generateRound({
      pool: items, mode, seed: `${Date.now()}:${round}`, neighbors,
      weight: (id) => weightOf(cards[cardKey(atlasId, id)]),
    });
  }, [atlas, atlasId, mode, round, today, units]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(dailyDone ? 'done' : 'ask');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [paint, setPaint] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<MapMark[]>([]);
  const [line, setLine] = useState<MapLine | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [optStates, setOptStates] = useState<Record<string, OptionState>>({});
  const [misses, setMisses] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const startRef = useRef(performance.now());
  const qStartRef = useRef(performance.now());
  const busy = useRef(false);

  const q: Question | undefined = plan.questions[index];
  const target = q ? atlas.unitById.get(q.target) : undefined;
  const total = plan.questions.length;
  const score = answers.reduce((s, a) => s + a.score, 0);
  const isSpeedrun = mode === 'hepsi';

  const selection: Selection = scope === 'tum' ? {} : { groupId: scope };
  const optionsVisible = q && (q.kind === 'neresi' || q.kind === 'siluet') && phase !== 'done';
  const insets: Insets = {
    top: safe.top + 150,
    left: 10,
    right: 10,
    bottom: safe.bottom + (optionsVisible ? 170 : 24),
  };

  // Yeni soru: tahtayı temizle, "Bu Neresi?" için hedefi göster
  useEffect(() => {
    if (!q || phase !== 'ask') return;
    qStartRef.current = performance.now();
    busy.current = false;
    setOptStates({});
    setMarks([]);
    setLine(null);
    setMisses(0);
    setPaint((p) => (isSpeedrun ? Object.fromEntries(Object.entries(p).filter(([, v]) => v === 'p-done' || v === 'p-missed')) : {}));
    if (q.kind === 'neresi') {
      setPaint({ [q.target]: 'p-target' });
      setHighlight(q.target);
      // Dünya ölçeğinde küçük ülkeler görünmeyebilir: hedefe yaklaş
      if (atlasId === 'cihan') void mapRef.current?.flyToUnit(q.target, 0.3);
    } else {
      setHighlight(null);
      void mapRef.current?.recenter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase === 'ask', plan]);

  const finish = useCallback(
    (all: Answer[]) => {
      setPhase('done');
      const ms = performance.now() - startRef.current;
      const correct = all.filter((a) => a.correct).length;
      recordRound({ at: Date.now(), atlas: atlasId, scope, mode, total: all.length, correct, score: all.reduce((s, a) => s + a.score, 0), ms });
      if (mode === 'gunluk') {
        recordDaily(atlasId, {
          key: today,
          tiles: all.map((a) => tileOf(a.kind, a.correct, a.kind === 'yakin' ? a.score : undefined)),
          score: all.reduce((s, a) => s + a.score, 0),
          ms,
          at: Date.now(),
        });
      }
    },
    [atlasId, mode, scope, today],
  );

  const advance = useCallback(
    (all: Answer[]) => {
      if (index + 1 >= total) finish(all);
      else {
        setIndex((i) => i + 1);
        setPhase('ask');
      }
    },
    [finish, index, total],
  );

  const commit = (a: Answer) => {
    const all = [...answers, a];
    setAnswers(all);
    recordAnswer(atlasId, a.target, a.correct);
    return all;
  };

  /** Doğru cevap: nabız + kısa titreşim + otomatik geçiş */
  const celebrate = (id: string, all: Answer[], points: number) => {
    mapRef.current?.pulse(id);
    vibrate(10);
    setPaint((p) => ({ ...p, [id]: isSpeedrun ? 'p-done' : 'p-ok' }));
    const u = atlas.unitById.get(id);
    if (u && !isSpeedrun) setMarks([{ id: 'ok', kind: 'ok', at: atlas.invert(u.label) ?? [0, 0] }]);
    setToast(`${t.game.correct} +${points}`);
    window.setTimeout(() => setToast(null), 900);
    window.setTimeout(() => advance(all), isSpeedrun ? 250 : reduced ? 400 : 750);
  };

  /** Yanlış ya da Yakın Atış: doğru yere kısa kayış ve bilgi kartı */
  const reveal = async (all: Answer[]) => {
    setAnswers(all);
    setPaint((p) => ({ ...p, [q!.target]: 'p-reveal' }));
    setHighlight(q!.target);
    setPhase('reveal');
    // Bilgi kartı ekranın alt kısmını kaplar: hedefi kartın üstünde kalan alana sığdır
    const cardH = Math.min(window.innerHeight * 0.55, 420);
    await mapRef.current?.flyToUnit(q!.target, atlasId === 'cihan' ? 0.35 : 0.5, safe.bottom + cardH);
  };

  const onNext = async () => {
    if (phase !== 'reveal') return;
    setMarks([]);
    setLine(null);
    if (index + 1 >= total) {
      finish(answers);
      return;
    }
    await mapRef.current?.recenter();
    advance(answers);
  };

  const onPick = (unitId: string | null, lonlat: [number, number] | null) => {
    if (!q || !target || phase !== 'ask' || busy.current) return;
    const ms = performance.now() - qStartRef.current;
    if (q.kind === 'yakin') {
      busy.current = true;
      const a = evaluateNear(q.target, target.feature, lonlat, ms, NEAR_SCALE_KM[atlasId]);
      const all = commit(a);
      if (lonlat) {
        setMarks([{ id: 'pin', kind: 'pin', at: lonlat }]);
        const center = atlas.invert(target.label);
        if (center && a.km) setLine({ from: lonlat, to: center });
      }
      if (a.km === 0) mapRef.current?.pulse(q.target);
      void reveal(all);
      return;
    }
    if (q.kind !== 'bul' || !unitId) return;
    if (unitId === q.target) {
      busy.current = true;
      const a = evaluateChoice('bul', q.target, unitId, ms);
      celebrate(unitId, commit(a), a.score);
      return;
    }
    // Yanlış
    mapRef.current?.flash(unitId);
    vibrate(30);
    if (isSpeedrun) {
      const m = misses + 1;
      setMisses(m);
      if (m >= 3) {
        busy.current = true;
        const all = commit(evaluateChoice('bul', q.target, unitId, ms));
        setPaint((p) => ({ ...p, [q.target]: 'p-missed' }));
        mapRef.current?.pulse(q.target);
        window.setTimeout(() => advance(all), 1100);
      }
      return;
    }
    busy.current = true;
    const u = atlas.unitById.get(unitId);
    if (u) setMarks([{ id: 'bad', kind: 'bad', at: atlas.invert(u.label) ?? [0, 0] }]);
    const all = commit(evaluateChoice('bul', q.target, unitId, ms));
    window.setTimeout(() => void reveal(all), reduced ? 100 : 520);
  };

  const onOption = (id: string) => {
    if (!q || phase !== 'ask' || busy.current) return;
    busy.current = true;
    const a = evaluateChoice(q.kind, q.target, id, performance.now() - qStartRef.current);
    const states: Record<string, OptionState> = {};
    for (const o of q.options ?? []) states[o] = o === q.target ? 'ok' : o === id ? 'bad' : 'dim';
    setOptStates(states);
    const all = commit(a);
    if (a.correct) {
      if (q.kind === 'siluet') setHighlight(q.target);
      celebrate(q.target, all, a.score);
    } else {
      vibrate(30);
      window.setTimeout(() => void reveal(all), reduced ? 100 : 450);
    }
  };

  const exitTo = mode === 'gunluk' ? '/oyna' : pathFor(atlasId, atlas, selection);
  const exit = () => navigate(exitTo);

  // Esc: oyundan çık
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && navigate(exitTo);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitTo, navigate]);

  if (units.length === 0) {
    return <p className="grid h-full place-items-center px-8 text-center font-semibold text-[var(--ink-2)]">{t.game.emptyScope}</p>;
  }

  if (phase === 'done') {
    const rec = mode === 'gunluk' ? progress.daily[`${atlasId}:${today}`] : undefined;
    const ms = rec?.ms ?? performance.now() - startRef.current;
    const share =
      mode === 'gunluk' && rec
        ? shareText({ title: t.daily[`title_${atlasId}`], number: dailyNumber(today), tiles: rec.tiles as never, score: rec.score, ms: rec.ms })
        : undefined;
    const bestKey = `${atlasId}:${scope}:${mode}`;
    return (
      <ResultView
        title={mode === 'gunluk' ? t.daily[`title_${atlasId}`] : `${t.modes[mode].name} · ${scopeName(atlasId, atlas, scope)}`}
        answers={answers}
        names={names}
        score={rec?.score ?? score}
        ms={ms}
        tiles={rec?.tiles as never}
        share={share}
        speedrun={isSpeedrun}
        best={isSpeedrun ? progress.best[bestKey] : undefined}
        onAgain={
          mode === 'gunluk'
            ? undefined
            : () => {
                setAnswers([]);
                setIndex(0);
                setPaint({});
                setRound((r) => r + 1);
                startRef.current = performance.now();
                setPhase('ask');
              }
        }
        onBack={exit}
        backLabel={mode === 'gunluk' ? t.hub.title : t.game.backToMap}
      />
    );
  }

  const last = answers[answers.length - 1];
  const fact = target ? factOf(atlasId, target.id) : undefined;
  const caps = atlasId === 'cihan' && target ? capitalsOf(target.id) : undefined;

  let promptLabel = '';
  let promptTitle = '';
  let promptSub: string | undefined;
  if (q && target) {
    if (q.kind === 'bul') {
      promptLabel = t.game.findPrompt;
      promptTitle = target.name;
      promptSub = isSpeedrun ? (misses ? t.game.misses(misses) : t.game.remaining(total - index)) : undefined;
    } else if (q.kind === 'neresi') {
      promptLabel = scopeName(atlasId, atlas, scope);
      promptTitle = t.game.whereisPrompt;
    } else if (q.kind === 'yakin') {
      promptLabel = t.game.nearPrompt;
      promptTitle = `${accusative(target.name)} bul`;
    } else {
      promptLabel = scopeName(atlasId, atlas, scope);
      promptTitle = t.game.silhouettePrompt;
    }
  }

  let fbTitle = '';
  const fbLines: string[] = [];
  if (phase === 'reveal' && last && target) {
    if (last.kind === 'yakin') {
      fbTitle = last.km === 0 ? t.game.inside : last.km !== undefined ? t.game.distance(last.km) : t.game.wrong;
      fbLines.push(`${target.name} · ${t.game.points(last.score)}`);
    } else {
      fbTitle = t.game.wrong;
      fbLines.push(t.game.answerWas(target.name));
      if (last.picked) fbLines.push(t.game.yourPick(names[last.picked] ?? ''));
    }
  }

  return (
    <>
      <div className={q?.kind === 'siluet' && phase === 'ask' ? 'invisible' : ''}>
        <MapView
          ref={mapRef}
          atlas={atlas}
          selection={selection}
          insets={insets}
          interaction="pick"
          pickable={q?.kind === 'bul' ? pickable : q?.kind === 'yakin' ? allIds : NONE}
          onPick={onPick}
          labels={false}
          paint={paint}
          highlight={highlight}
          marks={marks}
          line={line}
          reducedMotion={reduced}
          ariaLabel={`${atlas.rootName}. ${promptTitle}`}
        />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3" style={{ paddingTop: safe.top + 10 }}>
        <div className="pointer-events-auto mx-auto max-w-[560px]">
          <GameHud
            onExit={exit}
            progress={isSpeedrun ? `${answers.filter((a) => a.correct).length}/${total}` : t.game.question(Math.min(index + 1, total), total)}
            score={score}
            extra={isSpeedrun ? <Stopwatch start={startRef.current} running /> : undefined}
          />
          {q && <PromptCard label={promptLabel} title={promptTitle} sub={promptSub} />}
        </div>
      </header>

      {q?.kind === 'siluet' && phase === 'ask' && target && (
        <div className="absolute inset-x-0 z-10 grid place-items-center px-6" style={{ top: safe.top + 170, bottom: safe.bottom + 190 }}>
          <Silhouette unit={target as MapUnit} detailed={atlasId === 'cihan'} />
        </div>
      )}

      {toast && (
        <div className="toast-in pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 rounded-full bg-[var(--correct)] px-5 py-2.5 text-[16px] font-extrabold text-white shadow-lg" style={{ top: safe.top + 160 }} role="status">
          {toast}
        </div>
      )}

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3" style={{ paddingBottom: safe.bottom + 12 }}>
        <div className="pointer-events-auto mx-auto max-w-[560px]">
          {phase === 'reveal' && last ? (
            <FeedbackCard
              ok={last.correct}
              title={fbTitle}
              lines={fbLines}
              fact={fact}
              capitals={caps}
              onNext={onNext}
              nextLabel={index + 1 >= total ? t.game.finish : t.game.next}
            />
          ) : optionsVisible && q?.options ? (
            <OptionGrid options={q.options} names={names} states={optStates} disabled={phase !== 'ask'} onPick={onOption} />
          ) : null}
        </div>
      </footer>
    </>
  );
}

