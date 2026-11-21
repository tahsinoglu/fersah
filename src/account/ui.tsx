import { useEffect, useId, useRef, useState } from 'react';
import { ApiError, continueAsGuest, deleteAccount, login, logout, useAccount } from './account';
import { FersahLogo } from '../ui/Logo';

// ---------- Giriş penceresi ----------

/** Girişte kullanıcı adı sorulur. Ad boşsa yeni hesap açılır, alınmışsa şifreyle girilir. */
export function LoginDialog({ onClose, closable = true }: { onClose?: () => void; closable?: boolean }) {
  const [ad, setAd] = useState('');
  const [pin, setPin] = useState('');
  const [confirmNew, setConfirmNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nameId = useId();
  const pinId = useId();
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);

  const submit = async (yeniOnay = false) => {
    setError('');
    if (ad.trim().length < 3) return setError('Kullanıcı adı en az 3 harf olmalı.');
    if (!/^\d{4}$/.test(pin)) return setError('Şifre 4 haneli bir sayı olmalı.');
    setBusy(true);
    try {
      const r = await login(ad, pin, yeniOnay);
      if (r === 'yeni') setConfirmNew(true);
      else onClose?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Bir sorun oluştu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby="giris-baslik">
      <div className="sheet-scrim absolute inset-0 bg-black/35" aria-hidden="true" />
      <form
        className="glass-strong sheet-up relative w-full max-w-[440px] rounded-t-[24px] p-5 md:rounded-[24px]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        onSubmit={(e) => {
          e.preventDefault();
          void submit(confirmNew);
        }}
      >
        <FersahLogo size={26} ground="var(--surface)" />
        <h2 id="giris-baslik" className="mt-4 text-[24px] font-semibold leading-tight">
          {confirmNew ? `“${ad.trim()}” adı boşta` : 'Hoş geldin, seyyah!'}
        </h2>
        <p className="mt-1 text-[15px] text-[var(--ink-2)]">
          {confirmNew
            ? 'Bu adla yeni bir hesap açılsın mı? Başka bir cihazdan girerken aynı adı ve şifreyi kullanacaksın.'
            : 'Bir kullanıcı adı seç; puanların saklansın, sıralamada adını gör. Aynı adla başka cihazdan girince puanların seninle gelir.'}
        </p>
        {!confirmNew && (
          <div className="mt-4 flex flex-col gap-3">
            <label htmlFor={nameId} className="text-[14px] font-semibold text-[var(--ink-2)]">
              Kullanıcı adı
              <input
                ref={first}
                id={nameId}
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                autoComplete="username"
                maxLength={20}
                placeholder="ör. tahsinoglu"
                className="mt-1 block h-12 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-[17px] font-medium text-[var(--ink)]"
              />
            </label>
            <label htmlFor={pinId} className="text-[14px] font-semibold text-[var(--ink-2)]">
              4 haneli şifre
              <input
                id={pinId}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="current-password"
                type="password"
                placeholder="••••"
                className="mt-1 block h-12 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-[20px] tracking-[0.4em] text-[var(--ink)]"
              />
              <span className="mt-1 block text-[12.5px] font-medium text-[var(--ink-3)]">Adını başkası kullanamasın diye. Unutma; başka cihazda da sorulur.</span>
            </label>
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-[color-mix(in_srgb,var(--wrong)_12%,transparent)] px-3 py-2 text-[14px] font-semibold text-[var(--ink)]" role="alert">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button type="submit" disabled={busy} className="pressable h-[52px] rounded-2xl bg-[var(--accent)] text-[17px] font-bold text-[var(--on-accent)] disabled:opacity-60">
            {busy ? 'Tefekkür ediliyor…' : confirmNew ? 'Evet, bu adla başla' : 'Devam'}
          </button>
          {confirmNew ? (
            <button type="button" onClick={() => setConfirmNew(false)} className="h-12 rounded-2xl text-[16px] font-semibold text-[var(--ink-2)]">
              Başka bir ad seç
            </button>
          ) : (
            closable && (
              <button
                type="button"
                onClick={() => {
                  continueAsGuest();
                  onClose?.();
                }}
                className="h-12 rounded-2xl text-[16px] font-semibold text-[var(--ink-2)]"
              >
                Şimdilik misafir olarak oyna
              </button>
            )
          )}
        </div>
        <p className="mt-2 text-center text-[12px] text-[var(--ink-3)]">
          Yalnızca kullanıcı adın, şifrenin geri çözülemez özeti ve puanların saklanır. Gerçek adın, e-postan ya da konumun istenmez.
        </p>
      </form>
    </div>
  );
}

/** Uygulama açılışında bir kez: hesap yoksa ve misafir seçilmediyse giriş penceresi */
export function LoginGate() {
  const { hesap, misafir } = useAccount();
  const [open, setOpen] = useState(!hesap && !misafir);
  if (!open || hesap) return null;
  return <LoginDialog onClose={() => setOpen(false)} />;
}

// ---------- Pano (sıralama ve anlık sayı) ----------

export interface Row {
  sira: number;
  ad: string;
  slug: string;
  puan: number;
  unvan: string;
}
interface Ranking {
  ust: Row[];
  ben?: Row;
}
export interface BoardView {
  aktif: number;
  gunluk: { memleket: Ranking; cihan: Ranking };
  haftalik: Ranking;
  tum: Ranking;
}

const slugOf = (name: string) =>
  name
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function usePano(refreshMs = 60_000): BoardView | null {
  const { hesap } = useAccount();
  const [view, setView] = useState<BoardView | null>(null);
  const me = hesap ? slugOf(hesap.ad) : '';
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/fersah?op=pano${me ? `&ben=${encodeURIComponent(me)}` : ''}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => alive && v && setView(v as BoardView))
        .catch(() => {});
    load();
    const id = window.setInterval(load, refreshMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [me, refreshMs, hesap?.toplam]);
  return view;
}

/** "Şu an senin gibi 45 seyyah keşifte" */
export function PresenceLine({ view }: { view: BoardView | null }) {
  const { hesap } = useAccount();
  if (!view) return null;
  const n = Math.max(view.aktif, hesap ? 1 : 0);
  if (n === 0) return null;
  return (
    <p className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink-2)]" aria-live="polite">
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="presence-ping absolute inline-flex h-full w-full rounded-full bg-[var(--correct)] opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--correct)]" />
      </span>
      {n === 1 && hesap ? 'Şu an keşifte olan tek seyyah sensin' : `Şu an ${hesap ? 'senin gibi ' : ''}${n.toLocaleString('tr-TR')} seyyah keşifte`}
    </p>
  );
}

type Tab = 'gm' | 'gc' | 'h' | 't';
const TABS: { id: Tab; label: string }[] = [
  { id: 'h', label: 'Bu hafta' },
  { id: 't', label: 'Tüm zamanlar' },
  { id: 'gm', label: 'Bugün · Memleket' },
  { id: 'gc', label: 'Bugün · Cihan' },
];

/** Sıralama: kendi adı ve sırası her zaman görünür */
export function Leaderboard({ view, onLogin }: { view: BoardView | null; onLogin: () => void }) {
  const { hesap } = useAccount();
  const [tab, setTab] = useState<Tab>('h');
  const r: Ranking | undefined = view ? (tab === 'gm' ? view.gunluk.memleket : tab === 'gc' ? view.gunluk.cihan : tab === 'h' ? view.haftalik : view.tum) : undefined;
  const me = hesap ? slugOf(hesap.ad) : '';
  return (
    <section aria-label="Sıralama">
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4" role="tablist">
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`h-10 shrink-0 rounded-xl px-3.5 text-[14px] font-semibold ${tab === x.id ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'glass text-[var(--ink-2)]'}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      {!view ? (
        <p className="glass rounded-2xl p-4 text-[15px] text-[var(--ink-3)]">Sıralama yükleniyor… Çevrimdışıysan bağlantı gelince görünecek.</p>
      ) : !r || r.ust.length === 0 ? (
        <p className="glass rounded-2xl p-4 text-[15px] text-[var(--ink-2)]">
          Henüz kimse yok. {tab === 'gm' || tab === 'gc' ? 'Günün Haritası’nı çözen ilk seyyah sen ol.' : 'İlk turu sen oyna.'}
        </p>
      ) : (
        <ol className="glass divide-y divide-[var(--hairline)] overflow-hidden rounded-2xl">
          {r.ust.map((row) => (
            <RankRow key={row.slug} row={row} me={row.slug === me} />
          ))}
          {r.ben && !r.ust.some((x) => x.slug === me) && (
            <>
              <li className="px-4 py-1 text-center text-[13px] text-[var(--ink-3)]" aria-hidden="true">
                ⋯
              </li>
              <RankRow row={r.ben} me />
            </>
          )}
        </ol>
      )}
      {!hesap && (
        <button type="button" onClick={onLogin} className="pressable mt-3 h-12 w-full rounded-2xl bg-[var(--accent)] text-[16px] font-bold text-[var(--on-accent)]">
          Sıralamada adını görmek için kullanıcı adı seç
        </button>
      )}
    </section>
  );
}

function RankRow({ row, me }: { row: Row; me: boolean }) {
  const medal = row.sira <= 3 ? ['#F2B33D', '#A7B0BC', '#C98B5B'][row.sira - 1] : null;
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${me ? 'bg-[var(--accent-tint)]' : ''}`} aria-current={me ? 'true' : undefined}>
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold tabular-nums"
        style={medal ? { background: medal, color: '#142033' } : { color: 'var(--ink-3)' }}
      >
        {row.sira}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold">
          {row.ad} {me && <span className="ml-1 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--on-accent)]">SEN</span>}
        </span>
        <span className="block text-[12.5px] text-[var(--ink-3)]">{row.unvan}</span>
      </span>
      <span className="text-[16px] font-bold tabular-nums">{row.puan.toLocaleString('tr-TR')}</span>
    </li>
  );
}

// ---------- Hesabım ----------

export function AccountCard({ onLogin }: { onLogin: () => void }) {
  const { hesap } = useAccount();
  const [del, setDel] = useState(false);
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  if (!hesap) {
    return (
      <div className="glass flex items-center gap-3 rounded-2xl p-4">
        <p className="flex-1 text-[15px] text-[var(--ink-2)]">Misafir olarak oynuyorsun. Puanların yalnızca bu cihazda.</p>
        <button type="button" onClick={onLogin} className="pressable h-11 shrink-0 rounded-xl bg-[var(--accent)] px-4 text-[15px] font-bold text-[var(--on-accent)]">
          Giriş yap
        </button>
      </div>
    );
  }
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[20px] font-semibold">{hesap.ad}</p>
          <p className="text-[14px] text-[var(--ink-2)]">
            {hesap.unvan} · {hesap.toplam.toLocaleString('tr-TR')} puan · {hesap.turlar} tur
          </p>
        </div>
        <button type="button" onClick={logout} className="h-10 rounded-xl px-3 text-[14px] font-semibold text-[var(--ink-2)] underline">
          Çıkış
        </button>
      </div>
      {del ? (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await deleteAccount(pin);
            } catch (err) {
              setMsg(err instanceof ApiError ? err.message : 'Silinemedi.');
            }
          }}
        >
          <label className="text-[14px] font-semibold text-[var(--ink-2)]">
            Hesabın ve sıralamadaki puanların kalıcı olarak silinsin mi? Onay için şifren:
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              type="password"
              className="mt-1 block h-11 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-[18px] tracking-[0.4em]"
            />
          </label>
          {msg && <p className="text-[14px] font-semibold" role="alert">{msg}</p>}
          <div className="flex gap-2">
            <button type="submit" className="pressable h-11 flex-1 rounded-xl bg-[var(--wrong)] font-bold text-white">
              Hesabımı sil
            </button>
            <button type="button" onClick={() => setDel(false)} className="glass h-11 flex-1 rounded-xl font-semibold">
              Vazgeç
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setDel(true)} className="mt-2 text-[13px] font-semibold text-[var(--ink-3)] underline">
          Hesabımı sil (KVKK)
        </button>
      )}
    </div>
  );
}
