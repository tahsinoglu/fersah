import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
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
import { IconTarget } from '../ui/icons';

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

  useEffect(() => {
    if (parsed.canonical) navigate(parsed.canonical, { replace: true });
  }, [parsed.canonical, navigate]);

  // Esc: bir üst seviye
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      up();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [up]);

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

  const switchAtlas = useCallback(
    (id: AtlasId) => {
      if (id !== atlasId) navigate(`/${id}`);
    },
    [atlasId, navigate],
  );

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
        reducedMotion={reduced}
        ariaLabel={`${atlas.rootName}. ${t.map.ariaLabel}`}
      />
      <PendingSelection atlasId={atlasId} atlas={atlas} go={go} />

      {/* Üst çubuk */}
      <header
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2 px-3 md:px-4"
        style={{ paddingTop: desktop ? 16 : safe.top + 10 }}
      >
        {desktop && (
          <div className="pointer-events-auto">
            <Segmented current={atlasId} onChange={switchAtlas} />
          </div>
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
            <span className="hidden truncate text-[14px] font-semibold text-[var(--ink-3)] min-[380px]:inline">{t.map[`hintRoot_${atlasId}`]}</span>
          )}
        </div>
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

      {desktop ? (
        <SidePanel atlasId={atlasId} atlas={atlas} selection={selection} onClose={up} onGo={go} />
      ) : (
        <>
          <BottomSheet atlasId={atlasId} atlas={atlas} selection={selection} onClose={up} onGo={go} bottom={tabH} />
          <div className="absolute inset-x-0 bottom-0 z-30">
            <TabBar current={atlasId} onChange={switchAtlas} />
          </div>
        </>
      )}
    </>
  );
}

/** Başka bölümden aramayla gelindiyse hedefe in */
function PendingSelection({ atlasId, atlas, go }: { atlasId: AtlasId; atlas: Atlas; go: (s: Selection) => void }) {
  const done = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    const st = window.history.state?.usr as { pending?: Selection } | undefined;
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
