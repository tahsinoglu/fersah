// Depolama: üretimde Vercel Blob (etag ile koşullu yazma), yerelde ve testlerde bellek/dosya.
import { del, list, put } from '@vercel/blob';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface Doc<T> {
  data: T;
  etag: string | null;
}

/** Koşullu yazma tutmadı (başkası araya girdi) ya da oluşturulacak dosya zaten var */
export class ConflictError extends Error {}

export interface Storage {
  read<T>(path: string): Promise<Doc<T> | null>;
  /** ifMatch: yalnızca dosya hâlâ bu sürümdeyse yaz. create: yalnızca dosya yoksa yaz. */
  write<T>(path: string, data: T, opts?: { ifMatch?: string | null; create?: boolean }): Promise<void>;
  remove(path: string): Promise<void>;
  /** Bir önekteki mantıksal dosyalar (her birinin en yeni sürümü) */
  listJSON<T>(prefix: string): Promise<{ path: string; data: T }[]>;
}

/**
 * Vercel Blob üzerinde sürümlü depolama.
 *
 * Blob aynı adın üzerine yazılınca CDN birkaç saniye (ölçümde 5 sn'den uzun) eski içeriği döndürebiliyor.
 * Bu yüzden mantıksal her dosya bir klasördür ve her yazış yeni, değişmez bir sürüm dosyası açar:
 *   oyuncu/ahmet.json/0001763762000000-k3x9.json
 * Okuma, listeden en yeni sürümü seçip onun (hiç önbelleğe girmemiş) adresini getirir; eski sürümler silinir.
 * create/ifMatch denetimleri listeye dayanır (atomik değil; tek yazarlı kayıtlar için yeterli).
 */
export class BlobStorage implements Storage {
  private async versions(path: string) {
    const out: { pathname: string; url: string }[] = [];
    let cursor: string | undefined;
    do {
      // Önek "/" olmadan: eski sürümsüz dosya (path'in kendisi) da gelir ve en eski sayılır
      const r = await list({ prefix: path, cursor, limit: 1000 });
      out.push(...r.blobs.filter((b) => b.pathname === path || b.pathname.startsWith(`${path}/`)).map((b) => ({ pathname: b.pathname, url: b.url })));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return out.sort((a, b) => (a.pathname < b.pathname ? -1 : 1));
  }

  private async fetchJSON<T>(url: string): Promise<T | null> {
    const r = await fetch(url, { cache: 'no-store' });
    return r.ok ? ((await r.json()) as T) : null;
  }

  async read<T>(path: string): Promise<Doc<T> | null> {
    const v = await this.versions(path);
    const last = v[v.length - 1];
    if (!last) return null;
    const data = await this.fetchJSON<T>(last.url);
    return data === null ? null : { data, etag: last.pathname };
  }

  async write<T>(path: string, data: T, opts: { ifMatch?: string | null; create?: boolean } = {}): Promise<void> {
    if (opts.create || opts.ifMatch) {
      const v = await this.versions(path);
      if (opts.create && v.length) throw new ConflictError('exists');
      if (opts.ifMatch && v[v.length - 1]?.pathname !== opts.ifMatch) throw new ConflictError('precondition');
    }
    const name = `${path}/${String(Date.now()).padStart(16, '0')}-${Math.random().toString(36).slice(2, 8)}.json`;
    await put(name, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000, // değişmez dosya
    });
    // Eski sürümleri temizle (en iyi çaba)
    try {
      const old = (await this.versions(path)).filter((b) => b.pathname < name);
      if (old.length) await del(old.map((b) => b.url));
    } catch {
      /* sonraki yazışta yeniden denenir */
    }
  }

  async remove(path: string): Promise<void> {
    const v = await this.versions(path);
    if (v.length) await del(v.map((b) => b.url));
  }

  async listJSON<T>(prefix: string): Promise<{ path: string; data: T }[]> {
    const latest = new Map<string, { pathname: string; url: string }>();
    let cursor: string | undefined;
    let n = 0;
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      for (const b of r.blobs) {
        const i = b.pathname.lastIndexOf('/');
        // Önekin hemen altındaki dosya eski sürümsüz kayıttır; daha derindeki bir sürüm dosyasıdır
        const logical = i < prefix.length ? b.pathname : b.pathname.slice(0, i);
        const cur = latest.get(logical);
        if (!cur || cur.pathname < b.pathname) latest.set(logical, { pathname: b.pathname, url: b.url });
      }
      n += r.blobs.length;
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor && n < 40000);
    const items = [...latest.entries()];
    const out: { path: string; data: T }[] = [];
    for (let i = 0; i < items.length; i += 24) {
      const chunk = await Promise.all(
        items.slice(i, i + 24).map(async ([path, b]): Promise<{ path: string; data: T } | null> => {
          try {
            const data = await this.fetchJSON<T>(b.url);
            return data === null ? null : { path, data: data as T };
          } catch {
            return null;
          }
        }),
      );
      out.push(...chunk.filter((x): x is { path: string; data: T } => !!x));
    }
    return out;
  }
}

/** Testler ve yerel geliştirme için: bellekte (isteğe bağlı olarak bir klasöre yazar) */
export class LocalStorage implements Storage {
  private docs = new Map<string, { text: string; etag: string }>();
  private n = 0;
  constructor(private dir?: string) {}

  private file(path: string) {
    return this.dir ? join(this.dir, path) : null;
  }

  private readSync(path: string) {
    let d = this.docs.get(path);
    const f = this.file(path);
    if (!d && f && existsSync(f)) {
      d = { text: readFileSync(f, 'utf8'), etag: `f${++this.n}` };
      this.docs.set(path, d);
    }
    return d ?? null;
  }

  async read<T>(path: string): Promise<Doc<T> | null> {
    const d = this.readSync(path);
    return d ? { data: JSON.parse(d.text) as T, etag: d.etag } : null;
  }

  async write<T>(path: string, data: T, opts: { ifMatch?: string | null; create?: boolean } = {}): Promise<void> {
    // Denetim ve yazma arasında bekleme yok: koşullu yazma atomik
    const cur = this.readSync(path);
    if (opts.create && cur) throw new ConflictError('exists');
    if (opts.ifMatch && cur?.etag !== opts.ifMatch) throw new ConflictError('precondition');
    const text = JSON.stringify(data);
    this.docs.set(path, { text, etag: `e${++this.n}` });
    const f = this.file(path);
    if (f) {
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, text);
    }
  }

  async remove(path: string): Promise<void> {
    this.docs.delete(path);
    const f = this.file(path);
    if (f && existsSync(f)) rmSync(f);
  }

  async listJSON<T>(prefix: string): Promise<{ path: string; data: T }[]> {
    const paths = new Set([...this.docs.keys()].filter((k) => k.startsWith(prefix)));
    const dir = this.dir ? join(this.dir, prefix) : null;
    if (dir && existsSync(dir)) for (const f of readdirSync(dir)) paths.add(prefix + f);
    const out: { path: string; data: T }[] = [];
    for (const p of [...paths].sort()) {
      const d = this.readSync(p);
      if (d) out.push({ path: p, data: JSON.parse(d.text) as T });
    }
    return out;
  }
}
