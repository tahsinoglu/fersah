import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { FersahLogo, FersahMark } from '../ui/Logo';
import { t } from '../i18n';
import { ATLAS_IDS, loadAtlas, type AtlasId } from '../data/atlases';
import { MapView, type MapViewHandle } from '../map-engine/MapView';
import type { Atlas, Selection } from '../map-engine/types';
import type { Insets } from '../map-engine/camera';
import { parsePath, pathFor } from '../lib/routes';
import { useMapNav } from '../lib/useMapNav';
import { prefersReducedMotion } from '../lib/theme';
import { useMedia, useSafeArea } from '../lib/viewport';
import { Breadcrumb } from '../ui/Breadcrumb';
import { BottomSheet, SHEET_PEEK, SIDE_PANEL_W, SidePanel } from '../ui/InfoPanel';
import { Loading } from '../ui/Loading';
import { Search } from '../ui/Search';
import { Segmented, TabBar } from '../ui/SectionSwitch';
import { ThemeMenu } from '../ui/ThemeMenu';
import { IconLayers, IconPlay, IconTarget } from '../ui/icons';
import { ModeSheet } from '../ui/ModeSheet';
import { masteryOf } from '../progress/leitner';
import { cardKey, useProgress } from '../progress/store';
import { isQuizzable } from '../game/content';

const TAB_H = 64;
const FLOAT_ROW = 60;
const TOP_BAR = 68;

export function AtlasPage() {
  const params = useParams();
  const atlasId = params.atlas as AtlasId;
  if (!ATLAS_IDS.includes(atlasId)) return <Navigate to="/memleket" replace />;
  return <AtlasLoader key={atlasId} atlasId={atlasId} />;
}

function AtlasLoader({ atlasId }: { atlasId: AtlasId }) {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(false);
    loadAtlas(atlasId)
      .then((a) => alive && setAtlas(a))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [atlasId, attempt]);

  return (
    <div data-atlas={atlasId} className="app-bg fixed inset-0 overflow-hidden text-[var(--ink)]">
      {atlas ? (
        <AtlasScreen atlasId={atlasId} atlas={atlas} />
      ) : error ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-[17px] font-semibold text-[var(--ink-2)]">{t.app.loadError}</p>
          <button type="button" className="pressable h-12 rounded-2xl bg-[var(--accent)] px-6 font-bold text-[var(--on-accent)]" onClick={() => setAttempt((n) => n + 1)}>
            {t.app.retry}
          </button>
        </div>
      ) : (
        <Loading />
      )}
    </div>
  );
}

function AtlasScreen({ atlasId, atlas }: { atlasId: AtlasId; atlas: Atlas }) {
  const params = useParams();
  const navigate = useNavigate();
  const parsed = useMemo(() => parsePath(atlasId, atlas, params.group, params.unit), [atlasId, atlas, params.group, params.unit]);
  const selection = parsed.selection;
  const { go, up } = useMapNav(atlasId, atlas, selection);
  const mapRef = useRef<MapViewHandle>(null);
  const desktop = useMedia('(min-width: 768px)');
  const safe = useSafeArea();
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const [playScope, setPlayScope] = useState<string | null>(null);
  const [learn, setLearn] = useState(() => {
    try {
      return sessionStorage.getItem('mc-learn') === '1';
    } catch {
      return false;
    }
  });
  const toggleLearn = () =>
    setLearn((v) => {
      try {
        sessionStorage.setItem('mc-learn', v ? '0' : '1');
      } catch {
        /* yok say */
      }
      return !v;
    });
  const progress = useProgress();

  // Öğrenme haritası: bilinme düzeyine göre boya. Seviyeli: kökte bölge ortalaması, bölgede iller.
  const { paint, groupPaint } = useMemo(() => {
    if (!learn) return { paint: undefined, groupPaint: undefined };
    const cls = (v: number | null) => (v === null ? 'p-mn' : `p-m${Math.min(4, Math.round(v * 4))}`);
    const unitVal = (id: string) => {
      const c = progress.cards[cardKey(atlasId, id)];
      return c ? masteryOf(c) : null;
    };
    const gp: Record<string, string> = {};
    const up: Record<string, string> = {};
    for (const g of atlas.groups) {
      const vals = g.units.filter((u) => isQuizzable(atlasId, u)).map((u) => unitVal(u.id));
      const seen = vals.filter((v): v is number => v !== null);
      if (g.id === selection.groupId) {
        for (const u of g.units) up[u.id] = isQuizzable(atlasId, u) ? cls(unitVal(u.id)) : 'p-mn';
      } else {
        gp[g.id] = cls(seen.length ? vals.reduce<number>((s, v) => s + (v ?? 0), 0) / vals.length : null);
      }
    }
    return { paint: up, groupPaint: gp };
  }, [learn, progress, atlas, atlasId, selection.groupId]);

  useEffect(() => {
    if (parsed.canonical) navigate(parsed.canonical, { replace: true });
  }, [parsed.canonical, navigate]);

  // Esc: bir üst seviye
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || playScope) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      up();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [up, playScope]);

  const hasPanel = !!selection.groupId;
  const tabH = TAB_H + safe.bottom;

  const insets: Insets = useMemo(() => {
    if (desktop) {
      return { top: 84, left: 24, bottom: 80, right: hasPanel ? SIDE_PANEL_W + 40 : 24 };
    }
    return {
      top: safe.top + TOP_BAR + 4,
      left: 10,
      right: 10,
      bottom: tabH + FLOAT_ROW + (hasPanel ? SHEET_PEEK : 0),
    };
  }, [desktop, hasPanel, safe.top, tabH]);

  const onSearchPick = useCallback(
    (id: AtlasId, sel: Selection) => {
      if (id === atlasId) go(sel);
      else navigate(pathFor(id, null, {}) + '', { state: { pending: sel } });
    },
    [atlasId, go, navigate],
  );

  const floatBottom = desktop ? 16 : tabH + (hasPanel ? SHEET_PEEK : 0) + 8;

  return (
    <>
      <MapView
        ref={mapRef}
        atlas={atlas}
        selection={selection}
        insets={insets}
        onSelect={go}
        onUp={up}
        paint={paint}
        groupPaint={groupPaint}
        reducedMotion={reduced}
        ariaLabel={`${atlas.rootName}. ${t.map.ariaLabel}`}
      />
      <PendingSelection atlasId={atlasId} atlas={atlas} go={go} />

      {/* Üst çubuk */}
      <header
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2 px-3 md:px-4"
        style={{ paddingTop: desktop ? 16 : safe.top + 10 }}
      >
        {desktop ? (
          <div className="pointer-events-auto flex items-center gap-4">
            <Link to="/oyna" aria-label="Fersah ana sayfa" className="pressable glass flex h-12 items-center rounded-2xl px-3">
              <FersahLogo size={22} ground="var(--surface)" />
            </Link>
            <Segmented current={atlasId} />
          </div>
        ) : (
          <Link to="/oyna" aria-label="Fersah ana sayfa" className="glass pressable pointer-events-auto grid h-12 w-12 shrink-0 place-items-center rounded-2xl">
            <FersahMark size={30} ground="var(--surface)" />
          </Link>
        )}
        <div className="pointer-events-auto flex min-w-0 flex-1 md:max-w-[420px]">
          <Search current={atlasId} onPick={onSearchPick} />
        </div>
        <div className="pointer-events-auto md:ml-auto">
          <ThemeMenu />
        </div>
      </header>

      {/* Yüzen alt satır: yol göstergesi + ortala */}
      <div
        className="pointer-events-none absolute left-0 z-10 flex items-end justify-between gap-2 px-3 transition-[bottom] duration-[380ms] ease-[cubic-bezier(.2,.8,.2,1)] md:px-4"
        style={{ bottom: floatBottom, right: desktop && hasPanel ? SIDE_PANEL_W + 32 : 0 }}
      >
        <div className="pointer-events-auto flex min-w-0 items-center gap-2">
          <Breadcrumb atlas={atlas} selection={selection} onGo={go} />
          {!selection.groupId && (
            <button
              type="button"
              onClick={() => setPlayScope('tum')}
              className="pressable flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-[15px] font-extrabold text-[var(--on-accent)] shadow-sm"
            >
              <IconPlay size={16} />
              <span className="truncate">{t.game[`playAll_${atlasId}`]}</span>
            </button>
          )}
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {learn && <LearnLegend />}
          <button
            type="button"
            aria-pressed={learn}
            aria-label={t.game.learningMap}
            title={t.game.learningMap}
            onClick={toggleLearn}
            className={`glass pressable grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${learn ? 'bg-[var(--accent)]! text-[var(--on-accent)]' : 'text-[var(--ink)]'}`}
          >
            <IconLayers />
          </button>
        <button
          type="button"
          aria-label={t.map.recenter}
          title={t.map.recenter}
          onClick={() => mapRef.current?.recenter()}
          className="glass pressable pointer-events-auto grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[var(--ink)]"
        >
          <IconTarget />
        </button>
        </div>
      </div>

      {desktop ? (
        <SidePanel atlasId={atlasId} atlas={atlas} selection={selection} onClose={up} onGo={go} onPlay={setPlayScope} />
      ) : (
        <>
          <BottomSheet atlasId={atlasId} atlas={atlas} selection={selection} onClose={up} onGo={go} onPlay={setPlayScope} bottom={tabH} />
          <div className="absolute inset-x-0 bottom-0 z-30">
            <TabBar current={atlasId} />
          </div>
        </>
      )}
      {playScope && (
        <ModeSheet
          atlasId={atlasId}
          scopeSlug={playScope === 'tum' ? 'tum' : (atlas.groupById.get(playScope)?.slug ?? 'tum')}
          scopeLabel={playScope === 'tum' ? t.game[`scopeAll_${atlasId}`] : (atlas.groupById.get(playScope)?.name ?? '')}
          onClose={() => setPlayScope(null)}
        />
      )}
    </>
  );
}

/** Başka bölümden aramayla gelindiyse hedefe in */
function PendingSelection({ atlasId, atlas, go }: { atlasId: AtlasId; atlas: Atlas; go: (s: Selection) => void }) {
  const done = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const st = location.state as { pending?: Selection } | undefined;
    if (done.current || !st?.pending) return;
    done.current = true;
    const sel = st.pending;
    navigate(`/${atlasId}`, { replace: true, state: { stack: 0 } });
    // Kökte kısa bir an gösterip sonra in
    const id = window.setTimeout(() => go(sel), 350);
    return () => window.clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atlasId, atlas]);
  return null;
}

function LearnLegend() {
  const labels = t.game.learningLegend;
  const cls = ['--m-n', '--m-0', '--m-1', '--m-2', '--m-3', '--m-4'];
  return (
    <div className="glass rounded-2xl px-3 py-2 text-[12px] font-semibold text-[var(--ink-2)]" aria-label={t.game.learningMap}>
      <ul className="flex flex-col gap-1">
        {labels.map((l, i) => (
          <li key={l} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[4px]" style={{ background: `var(${cls[i]})` }} />
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
