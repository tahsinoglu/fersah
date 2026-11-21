import { useSyncExternalStore } from 'react';
import { adoptProgress, getProgress, masteryPercent, streaks, type RoundRecord } from '../progress/store';
import { dailyKey } from '../quiz-engine/daily';
import { subscribeRounds } from './hooks';
import { celebrate } from './celebrate';

/** Hesap: kullanıcı adı + 4 haneli şifre. Puanlar ve ilerleme sunucuda (Vercel Blob) saklanır. */
export interface Account {
  ad: string;
  token: string;
  toplam: number;
  turlar: number;
  unvan: string;
}

interface State {
  hesap: Account | null;
  /** Giriş penceresi bir kez kapatıldı ("misafir olarak devam") */
  misafir: boolean;
  /** Gönderilemeyen turlar (çevrimdışıyken) */
  bekleyen: PendingRound[];
}

interface PendingRound {
  tur: Pick<RoundRecord, 'atlas' | 'mode' | 'total' | 'correct' | 'score' | 'ms'>;
  gunluk?: { key: string; score: number };
}

const KEY = 'mc-hesap-v1';
const listeners = new Set<() => void>();

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as State | null;
    if (s && typeof s === 'object') return { hesap: s.hesap ?? null, misafir: !!s.misafir, bekleyen: s.bekleyen ?? [] };
  } catch {
    /* yok say */
  }
  return { hesap: null, misafir: false, bekleyen: [] };
}

let state: State = typeof window === 'undefined' ? { hesap: null, misafir: false, bekleyen: [] } : load();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* gizli sekme */
  }
  listeners.forEach((l) => l());
}

export const getAccount = () => state;

export function useAccount(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

// ---------- Sunucu ----------

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function api<T>(op: string, body?: unknown, query = ''): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(`/api/fersah?op=${op}${query}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
    const data = (await r.json().catch(() => ({}))) as T & { error?: string };
    if (!r.ok) throw new ApiError(data.error ?? 'Sunucuya ulaşılamadı.', r.status);
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.', 0);
  } finally {
    clearTimeout(timer);
  }
}

interface LoginResponse {
  durum: 'yeni' | 'olusturuldu' | 'girildi';
  token?: string;
  profil?: { ad: string; toplam: number; turlar: number; unvan: string; ilerleme: unknown };
}

/** Giriş. Ad boştaysa { durum: 'yeni' } döner; kullanıcı onaylarsa yeniOnay ile tekrar çağrılır. */
export async function login(ad: string, pin: string, yeniOnay = false): Promise<'yeni' | 'olusturuldu' | 'girildi'> {
  const r = await api<LoginResponse>('giris', { ad, pin, yeniOnay });
  if (r.durum === 'yeni' || !r.token || !r.profil) return 'yeni';
  if (r.profil.ilerleme) adoptProgress(r.profil.ilerleme);
  set({ hesap: { ad: r.profil.ad, token: r.token, toplam: r.profil.toplam, turlar: r.profil.turlar, unvan: r.profil.unvan }, misafir: false });
  void syncProgress(true);
  void flushPending();
  if (r.durum === 'girildi') celebrate({ kind: 'merhaba', text: `Tekrar hoş geldin, ${r.profil.ad}!`, sub: `${r.profil.unvan} · ${r.profil.toplam.toLocaleString('tr-TR')} puan` });
  else celebrate({ kind: 'merhaba', text: `Aramıza hoş geldin, ${r.profil.ad}!`, sub: 'İlk keşfin seni bekliyor.' });
  return r.durum;
}

export function logout() {
  set({ hesap: null, misafir: true });
}

export function continueAsGuest() {
  set({ misafir: true });
}

export async function deleteAccount(pin: string) {
  const h = state.hesap;
  if (!h) return;
  await api('sil', { token: h.token, pin });
  set({ hesap: null, misafir: true });
}

function mastery() {
  const p = getProgress();
  // Ustalık yüzdesi: oynanmış tüm il/ülke kartlarının ortalaması (unvan için)
  const ids = (atlas: string) => Object.keys(p.cards).filter((k) => k.startsWith(`${atlas}:`)).map((k) => k.split(':')[1]);
  const total = { memleket: 81, cihan: 197 };
  const m = (atlas: 'memleket' | 'cihan') => Math.round((masteryPercent(p, atlas, ids(atlas)) * ids(atlas).length) / total[atlas]);
  return { memleket: m('memleket'), cihan: m('cihan') };
}

let lastSync = 0;
/** İlerlemeyi sunucuya yaz: en çok 3 dakikada bir (Blob işlem kotasını korumak için) ya da zorla */
export async function syncProgress(force = false) {
  const h = state.hesap;
  if (!h) return;
  if (!force && Date.now() - lastSync < 3 * 60_000) return;
  lastSync = Date.now();
  try {
    await api('ilerleme', { token: h.token, ilerleme: getProgress(), ustalik: mastery() });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) set({ hesap: null });
  }
}

interface RoundResponse {
  toplam: number;
  turlar: number;
  unvan: string;
  sira: { tum: number | null; haftalik: number | null; gunluk: number | null };
  aktif: number;
}

async function submit(p: PendingRound): Promise<RoundResponse | null> {
  const h = state.hesap;
  if (!h) return null;
  return api<RoundResponse>('tur', { token: h.token, ...p });
}

async function flushPending() {
  const list = [...state.bekleyen];
  if (!list.length || !state.hesap) return;
  set({ bekleyen: [] });
  for (const p of list) {
    try {
      await submit(p);
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) set({ bekleyen: [...state.bekleyen, p] });
    }
  }
}

const MILESTONES = [500, 1000, 2500, 5000, 10_000, 25_000, 50_000, 100_000, 250_000];

/** Tur bitince: sunucuya gönder, gerekiyorsa kutla */
async function onRound(r: RoundRecord) {
  const h = state.hesap;
  const rate = r.total ? r.correct / r.total : 0;
  if (!h) {
    if (rate >= 0.9 && r.total >= 5) celebrate({ kind: 'tur', text: `Muhteşem tur! ${r.correct}/${r.total}`, sub: 'Puanını kaydetmek ve sıralamaya girmek için bir kullanıcı adı seç.' });
    return;
  }
  const daily = r.mode === 'gunluk' ? { key: dailyKey(r.atlas as 'memleket' | 'cihan'), score: r.score } : undefined;
  const payload: PendingRound = { tur: { atlas: r.atlas, mode: r.mode, total: r.total, correct: r.correct, score: r.score, ms: r.ms }, gunluk: daily };
  let res: RoundResponse | null = null;
  try {
    res = await submit(payload);
  } catch (e) {
    if (e instanceof ApiError && e.status === 0) set({ bekleyen: [...state.bekleyen, payload] });
    if (e instanceof ApiError && e.status === 401) set({ hesap: null });
  }
  const before = h.toplam;
  const after = res?.toplam ?? before + r.score;
  const unvan = res?.unvan ?? h.unvan;
  set({ hesap: { ...h, toplam: after, turlar: res?.turlar ?? h.turlar + 1, unvan } });

  // Kutlamalar: en önemlisi gösterilir
  const crossed = MILESTONES.filter((m) => before < m && after >= m).pop();
  const { current } = streaks(getProgress().days);
  if (unvan !== h.unvan) celebrate({ kind: 'unvan', text: `Tebrikler ${h.ad}!`, sub: `Yeni unvanın: ${unvan}` });
  else if (crossed) celebrate({ kind: 'puan', text: `Tebrikler ${h.ad}!`, sub: `${crossed.toLocaleString('tr-TR')} puana ulaştın.` });
  else if (daily && res?.sira.gunluk && res.sira.gunluk <= 3) celebrate({ kind: 'sira', text: `Bravo ${h.ad}!`, sub: `Bugünün sıralamasında ${res.sira.gunluk}. sıradasın.` });
  else if (rate >= 0.9 && r.total >= 5) celebrate({ kind: 'tur', text: `Muhteşem tur, ${h.ad}!`, sub: `${r.correct}/${r.total} doğru.` });
  else if ([3, 7, 14, 30, 100].includes(current) && !sessionStorage.getItem(`seri-${current}`)) {
    try {
      sessionStorage.setItem(`seri-${current}`, '1');
    } catch {
      /* yok */
    }
    celebrate({ kind: 'seri', text: `${current} gündür keşiftesin, ${h.ad}!`, sub: 'Serini bozma.' });
  }
  void syncProgress();
}

// ---------- Başlatma ----------

let started = false;
export function startAccount() {
  if (started || typeof window === 'undefined') return;
  started = true;
  subscribeRounds((r) => void onRound(r));
  window.addEventListener('online', () => void flushPending());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void syncProgress();
  });
  void flushPending();
}
