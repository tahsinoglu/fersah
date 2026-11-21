import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router';
import { loadAtlas, type AtlasId } from '../data/atlases';
import { MapView, type MapViewHandle } from '../map-engine/MapView';
import type { Atlas, MapGroup } from '../map-engine/types';
import { createRng, shuffle } from '../quiz-engine/random';
import { useSafeArea } from '../lib/viewport';
import { Loading } from '../ui/Loading';
import { IconBack, IconSpeaker } from '../ui/icons';
import { EXPLORE } from './data';
import { KIDS_ICONS } from './icons';
import { Puzzle } from './Puzzle';
import { canSpeak, speak, stopSpeaking } from './speech';
import { addStar, ENCOURAGE, pick, PRAISE, useStars } from './store';
import './kids.css';

/** Çocuk Köşesi çerçevesi: her zaman kendi aydınlık, renkli görünümünde */
export function KidsLayout() {
  useEffect(() => () => stopSpeaking(), []);
  return (
    <div className="kids fixed inset-0 overflow-hidden">
      <Outlet />
    </div>
  );
}

function useAtlas(id: AtlasId | undefined) {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  useEffect(() => {
    if (id === 'memleket' || id === 'cihan') loadAtlas(id).then(setAtlas);
  }, [id]);
  return atlas;
}

function Star({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8Z" fill="#ffc83d" stroke="#e8a817" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/** Ana bölümlere dönüş: basit ebeveyn kilidi */
function ParentLock({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const make = () => {
    const a = 3 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    const right = a + b;
    const opts = new Set([right]);
    while (opts.size < 4) opts.add(right + Math.floor(Math.random() * 9) - 4);
    return { a, b, right, opts: shuffle([...opts].filter((x) => x > 0), createRng(Date.now())) };
  };
  const [q, setQ] = useState(make);
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-5" role="dialog" aria-modal="true" aria-labelledby="lock-title">
      <div className="kids-card w-full max-w-[380px] p-6 text-center">
        <p id="lock-title" className="text-[18px] font-bold text-[#5a6473]">Büyükler için</p>
        <p className="mt-2 text-[34px] font-extrabold text-[#1d2433]">
          {q.a} + {q.b} kaç?
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {q.opts.map((n) => (
            <button
              key={n}
              type="button"
              className="kids-btn h-16 text-[26px]"
              onClick={() => {
                if (n === q.right) navigate('/oyna');
                else {
                  setNote('Bu soru büyükler için.');
                  setQ(make());
                }
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-3 min-h-6 text-[15px] font-semibold text-[#8a6d3b]" role="status">{note}</p>
        <button type="button" onClick={onClose} className="mt-2 h-14 w-full rounded-2xl text-[18px] font-bold text-[#5a6473]">
          Vazgeç
        </button>
      </div>
    </div>
  );
}

function KidsHeader({ title, back }: { title: string; back?: string }) {
  const [lock, setLock] = useState(false);
  const stars = useStars();
  const safe = useSafeArea();
  return (
    <header className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: safe.top + 12 }}>
      {back ? (
        <Link to={back} aria-label="Geri" className="kids-icon-btn">
          <IconBack size={28} />
        </Link>
      ) : (
        <button type="button" onClick={() => setLock(true)} className="kids-icon-btn" aria-label="Büyükler: Küçük Seyyah'tan çık">
          <IconBack size={28} />
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-[26px] font-extrabold text-[#1d2433]">{title}</h1>
      <span className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-[18px] font-extrabold text-[#8a5a00]" aria-label={`${stars} yıldız`}>
        <Star /> {stars}
      </span>
      {lock && <ParentLock onClose={() => setLock(false)} />}
    </header>
  );
}

const TILES: { to: string; title: string; color: string; icon: string }[] = [
  { to: 'yapboz/memleket', title: 'Bölgeler yapbozu', color: '#ffd8a8', icon: 'balon' },
  { to: 'yapboz/cihan', title: 'Kıtalar yapbozu', color: '#bfe3ff', icon: 'penguen' },
  { to: 'bul/memleket', title: 'Bölgeyi bul', color: '#c9f0c4', icon: 'cay' },
  { to: 'bul/cihan', title: 'Kıtayı bul', color: '#ffd3e1', icon: 'zurafa' },
  { to: 'kesfet/memleket', title: "Türkiye'yi keşfet", color: '#ffe9a8', icon: 'kayisi' },
  { to: 'kesfet/cihan', title: 'Dünyayı keşfet', color: '#e1d6ff', icon: 'panda' },
];

export function KidsHome() {
  return (
    <div className="flex h-full flex-col">
      <KidsHeader title="Küçük Seyyah" />
      <main className="no-scrollbar flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto grid max-w-[640px] grid-cols-2 gap-4">
          {TILES.map((tile) => {
            const Icon = KIDS_ICONS[tile.icon];
            return (
              <Link key={tile.to} to={tile.to} className="kids-tile" style={{ background: tile.color }}>
                <span className="h-20 w-20">
                  <Icon />
                </span>
                <span className="text-[19px] font-extrabold leading-tight text-[#1d2433]">{tile.title}</span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Celebrate({ text, again, back }: { text: string; again: () => void; back: string }) {
  useEffect(() => speak(text), [text]);
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="kids-card celebrate w-full max-w-[420px] p-8 text-center">
        <div className="flex justify-center gap-2">
          <Star size={44} />
          <Star size={56} />
          <Star size={44} />
        </div>
        <p className="mt-4 text-[30px] font-extrabold leading-tight text-[#1d2433]">{text}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" className="kids-btn h-16 text-[22px]" onClick={again}>
            Bir daha oyna
          </button>
          <Link to={back} className="kids-btn secondary grid h-16 place-items-center text-[20px]">
            Başka oyun seç
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PuzzlePage() {
  const { atlas: id } = useParams();
  const atlas = useAtlas(id as AtlasId);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const title = id === 'cihan' ? 'Kıtalar yapbozu' : 'Bölgeler yapbozu';
  return (
    <div className="flex h-full flex-col">
      <KidsHeader title={title} back="/cocuk" />
      <main className="min-h-0 flex-1 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        {!atlas ? (
          <Loading />
        ) : done ? (
          <Celebrate text="Tebrikler! Hepsini yerleştirdin!" again={() => { setDone(false); setRound((r) => r + 1); }} back="/cocuk" />
        ) : (
          <Puzzle key={round} atlas={atlas} onDone={() => setDone(true)} />
        )}
      </main>
    </div>
  );
}

/** Bölgeyi / kıtayı bul: sesli soru, süre yok, yanlışta teşvik ve ipucu */
export function FindPage() {
  const { atlas: id } = useParams();
  const atlasId = id as AtlasId;
  const atlas = useAtlas(atlasId);
  const safe = useSafeArea();
  const mapRef = useRef<MapViewHandle>(null);
  const [round, setRound] = useState(0);
  const groups = useMemo(
    () => (atlas ? shuffle(atlas.groups.filter((g) => g.units.length && g.id !== 'antarktika'), createRng(Date.now() + round)) : []),
    [atlas, round],
  );
  const [i, setI] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState('');
  const target: MapGroup | undefined = groups[i];
  const word = atlasId === 'cihan' ? 'kıtasını' : 'bölgesini';
  const question = target ? `${target.name} ${word} bul!` : '';

  useEffect(() => {
    if (!target) return;
    setMsg(question);
    setTries(0);
    speak(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id]);

  const pickable = useMemo(() => new Set(groups.map((g) => g.id)), [groups]);
  const groupPaint = useMemo(() => {
    const p: Record<string, string> = {};
    for (const g of found) p[g] = 'k-ok';
    if (flash) p[flash] = 'k-no';
    if (target && tries >= 2) p[target.id] = 'k-hint';
    return p;
  }, [found, flash, target, tries]);

  if (!atlas) return <Loading />;
  if (!target && groups.length && found.length === groups.length) {
    return (
      <div className="flex h-full flex-col">
        <KidsHeader title={atlasId === 'cihan' ? 'Kıtayı bul' : 'Bölgeyi bul'} back="/cocuk" />
        <Celebrate
          text="Harika! Hepsini buldun!"
          again={() => {
            setFound([]);
            setI(0);
            setRound((r) => r + 1);
          }}
          back="/cocuk"
        />
      </div>
    );
  }

  const onPick = (gid: string | null) => {
    if (!target || !gid || found.includes(gid)) return;
    if (gid === target.id) {
      const praise = pick(PRAISE);
      setMsg(`${praise} Bu ${target.name}.`);
      speak(`${praise} Bu ${target.name}.`);
      try {
        navigator.vibrate?.(15);
      } catch {
        /* yok */
      }
      setFound((f) => [...f, gid]);
      if (found.length + 1 === groups.length) addStar();
      window.setTimeout(() => setI((x) => x + 1), 1700);
    } else {
      const g = atlas.groupById.get(gid);
      const t = tries + 1;
      setTries(t);
      const text = `Bu ${g?.name}. ${t >= 2 ? 'Parlayan yere bak!' : pick(ENCOURAGE)}`;
      setMsg(text);
      speak(text);
      setFlash(gid);
      window.setTimeout(() => setFlash(null), 900);
    }
  };

  return (
    <div className="relative h-full">
      <MapView
        ref={mapRef}
        atlas={atlas}
        selection={{}}
        insets={{ top: safe.top + 160, left: 12, right: 12, bottom: safe.bottom + 24 }}
        interaction="pick"
        pickGroups
        pickable={pickable}
        onPick={(gid) => onPick(gid)}
        groupPaint={groupPaint}
        labels={false}
        slow
        ariaLabel={question}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0">
        <div className="pointer-events-auto">
          <KidsHeader title={atlasId === 'cihan' ? 'Kıtayı bul' : 'Bölgeyi bul'} back="/cocuk" />
        </div>
        <div className="pointer-events-auto mx-4 flex items-center gap-3">
          <p className="kids-bubble flex-1" aria-live="polite">
            {msg}
          </p>
          {canSpeak() && (
            <button type="button" className="kids-icon-btn" aria-label="Soruyu sesli oku" onClick={() => speak(question)}>
              <IconSpeaker size={28} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Keşfet: haritada simgelere dokun, kısa bilgiyi dinle */
export function ExplorePage() {
  const { atlas: id } = useParams();
  const atlasId = id as AtlasId;
  const atlas = useAtlas(atlasId);
  const safe = useSafeArea();
  const [open, setOpen] = useState<string | null>(null);
  const items = EXPLORE[atlasId] ?? [];
  const current = items.find((x) => x.icon === open);

  if (!atlas) return <Loading />;

  const overlays = items
    .map((it): { id: string; at: [number, number]; content: ReactNode } | null => {
      const u = atlas.unitById.get(it.unit);
      const at = u ? atlas.invert(u.label) : null;
      if (!at) return null;
      const Icon = KIDS_ICONS[it.icon];
      return {
        id: it.icon,
        at,
        content: (
          <button
            type="button"
            aria-label={it.title}
            className={`kids-pin${open === it.icon ? ' on' : ''}`}
            onClick={() => {
              setOpen(it.icon);
              speak(it.text);
            }}
          >
            <Icon />
          </button>
        ),
      };
    })
    .filter((x): x is { id: string; at: [number, number]; content: ReactNode } => !!x);

  return (
    <div className="relative h-full">
      <MapView
        atlas={atlas}
        selection={{}}
        insets={{ top: safe.top + 90, left: 12, right: 12, bottom: safe.bottom + (current ? 200 : 24) }}
        interaction="pick"
        pickable={new Set()}
        labels={false}
        slow
        overlays={overlays}
        ariaLabel={atlasId === 'cihan' ? 'Dünya haritası' : 'Türkiye haritası'}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0">
        <div className="pointer-events-auto">
          <KidsHeader title={atlasId === 'cihan' ? 'Dünyayı keşfet' : "Türkiye'yi keşfet"} back="/cocuk" />
        </div>
      </div>
      {current && (
        <div className="absolute inset-x-0 bottom-0 px-4" style={{ paddingBottom: safe.bottom + 16 }}>
          <div className="kids-card card-in mx-auto flex max-w-[520px] items-center gap-4 p-4">
            <span className="h-20 w-20 shrink-0">{KIDS_ICONS[current.icon]()}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[22px] font-extrabold text-[#1d2433]">{current.title}</p>
              <p className="text-[18px] font-semibold leading-snug text-[#3b4556]">{current.text}</p>
            </div>
            {canSpeak() && (
              <button type="button" className="kids-icon-btn" aria-label="Sesli oku" onClick={() => speak(current.text)}>
                <IconSpeaker size={28} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
