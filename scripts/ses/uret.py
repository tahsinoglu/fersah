"""Küçük Seyyah ses paketi üretici (geliştirici aracı; uygulamaya dahil değildir).

1) Piper "fahrettin" Türkçe sesi (CC0, sherpa-onnx) ile cümle okunur.
2) WORLD vokoderiyle çocuk sesine dönüştürülür: perde (F0) yükseltilir,
   ses yolu tınısı (spektral zarf) kısaltılmış bir çocuk ses yoluna göre ölçeklenir.
3) public/ses/<özet>.mp3 olarak kaydedilir, src/kids/ses.json haritası yazılır.

Kullanım: python3 -I scripts/ses/uret.py <model_klasörü> <cümleler.json> <proje_kökü>
"""
import hashlib, json, os, subprocess, sys, tempfile
import numpy as np, pyworld as pw, soundfile as sf, sherpa_onnx

model_dir, phrases_file, root = sys.argv[1:4]
name = [f for f in os.listdir(model_dir) if f.endswith('.onnx')][0]
cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=os.path.join(model_dir, name), tokens=os.path.join(model_dir, 'tokens.txt'),
            data_dir=os.path.join(model_dir, 'espeak-ng-data'), noise_scale=0.6, noise_scale_w=0.7, length_scale=1.12),
        num_threads=4),
)
tts = sherpa_onnx.OfflineTts(cfg)

F0_TARGET = float(os.environ.get('F0', '265'))   # çocuk konuşma perdesi (Hz)
WARP = float(os.environ.get('WARP', '1.22'))      # ses yolu kısalığı (formant çarpanı)

def childify(x, fs):
    x = x.astype(np.float64)
    f0, t = pw.harvest(x, fs, f0_floor=60, f0_ceil=400, frame_period=5)
    sp = pw.cheaptrick(x, f0, t, fs)
    ap = pw.d4c(x, f0, t, fs)
    voiced = f0[f0 > 0]
    ratio = F0_TARGET / np.median(voiced) if len(voiced) else 2.0
    # Tonlamayı biraz canlandır: ortalamadan sapmayı %25 büyüt
    logf = np.log(np.where(f0 > 0, f0, 1))
    mean = np.mean(logf[f0 > 0]) if len(voiced) else 0
    f0n = np.where(f0 > 0, np.exp(mean + (logf - mean) * 1.25) * ratio, 0)
    # Spektral zarfı frekans ekseninde genişlet (formantlar yukarı)
    n = sp.shape[1]
    src = np.arange(n) / WARP
    sp2 = np.array([np.interp(src, np.arange(n), row) for row in sp])
    ap2 = np.array([np.interp(src, np.arange(n), row) for row in ap])
    y = pw.synthesize(f0n, sp2, ap2, fs, 5)
    # Biraz daha hızlı ve canlı
    return y / (np.max(np.abs(y)) + 1e-9) * 0.89

out_dir = os.path.join(root, 'public', 'ses')
os.makedirs(out_dir, exist_ok=True)
phrases = json.load(open(phrases_file, encoding='utf-8'))
manifest = {}
for text in phrases:
    key = hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]
    target = os.path.join(out_dir, f'{key}.mp3')
    manifest[text] = f'{key}.mp3'
    if os.path.exists(target) and not os.environ.get('YENIDEN'):
        continue
    audio = tts.generate(text, sid=0, speed=1.0)
    if len(audio.samples) == 0:
        sys.exit(f'boş ses: {text}')
    x = np.array(audio.samples, dtype=np.float32)
    y = childify(x, audio.sample_rate)
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        sf.write(tmp.name, y, audio.sample_rate)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name,
                        '-af', 'highpass=f=90,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.08',
                        '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', target], check=True)
    print('ok', key, text)
json.dump(manifest, open(os.path.join(root, 'src', 'kids', 'ses.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
print(len(manifest), 'cümle')
