// Küçük Seyyah sesli okuma: önceden kaydedilmiş çocuk sesi paketi (public/ses), Web Audio ile çalınır.
// Pakette olmayan bir cümle olursa tarayıcının konuşma özelliğine düşer.
import SES from './ses.json';

const MAP = SES as Record<string, string>;
const BASE = `${import.meta.env.BASE_URL}ses/`;

let ctx: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;
let token = 0;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  // iOS: ses bağlamı ilk dokunuşta açılır
  const unlock = () => {
    void ctx?.resume();
    if (ctx?.state === 'running') ['pointerdown', 'touchend', 'keydown'].forEach((e) => document.removeEventListener(e, unlock, true));
  };
  ['pointerdown', 'touchend', 'keydown'].forEach((e) => document.addEventListener(e, unlock, true));
  return ctx;
}

/** Ses paketini ilk dokunuşta hazırla (Küçük Seyyah açılınca çağrılır) */
export function primeSpeech(): void {
  if (typeof window !== 'undefined') audio();
}

function load(text: string): Promise<AudioBuffer | null> {
  const file = MAP[text];
  const c = audio();
  if (!file || !c) return Promise.resolve(null);
  let p = buffers.get(file);
  if (!p) {
    p = fetch(BASE + file)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => new Promise<AudioBuffer>((res, rej) => c.decodeAudioData(b, res, rej)))
      .catch(() => {
        buffers.delete(file);
        return null;
      });
    buffers.set(file, p);
  }
  return p;
}

/** Sonra okunacak cümleleri önceden indir */
export function preloadSpeech(texts: string[]): void {
  for (const t of texts) void load(t);
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && (!!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) || 'speechSynthesis' in window);
}

/** Kullanıcı sayfaya henüz dokunmadıysa otomatik okuma yapılmaz (tarayıcılar engelliyor) */
function activated(): boolean {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : true;
}

function synth(text: string) {
  if (!('speechSynthesis' in window)) return;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR';
    u.rate = 0.9;
    u.pitch = 1.3;
    const voice = s.getVoices().find((v) => v.lang.toLowerCase().startsWith('tr'));
    if (voice) u.voice = voice;
    s.speak(u);
  } catch {
    /* ses yok: sorun değil */
  }
}

/** Bir ya da birkaç cümleyi art arda okur (ör. ["Harika!", "Bu Ege."]) */
export function speak(parts: string | string[]): void {
  if (typeof window === 'undefined' || !activated()) return;
  const list = (Array.isArray(parts) ? parts : [parts]).filter(Boolean);
  stopSpeaking();
  const my = ++token;
  const c = audio();
  if (!c || list.some((t) => !MAP[t])) {
    synth(list.join(' '));
    return;
  }
  void c.resume().catch(() => {});
  const bufs = list.map(load);
  void (async () => {
    for (let i = 0; i < bufs.length; i++) {
      const b = await bufs[i];
      if (my !== token) return;
      if (!b) {
        synth(list.slice(i).join(' '));
        return;
      }
      await new Promise<void>((done) => {
        const src = c.createBufferSource();
        src.buffer = b;
        src.connect(c.destination);
        src.onended = () => done();
        current = src;
        src.start();
      });
      if (my !== token) return;
    }
    current = null;
  })();
}

export function stopSpeaking(): void {
  token++;
  try {
    current?.stop();
  } catch {
    /* zaten durmuş */
  }
  current = null;
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    /* yok say */
  }
}
