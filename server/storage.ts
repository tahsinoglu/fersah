// Depolama: üretimde Vercel Blob (etag ile koşullu yazma), yerelde ve testlerde bellek/dosya.
import { del, get, list, put, BlobPreconditionFailedError } from '@vercel/blob';
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
  /** Bir önekteki dosyalar; içerik CDN önbelleğinden (birkaç saniye eski olabilir) okunur */
  listJSON<T>(prefix: string): Promise<{ path: string; data: T }[]>;
}

export class BlobStorage implements Storage {
  async read<T>(path: string): Promise<Doc<T> | null> {
    const r = await get(path, { access: 'public', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    const text = await new Response(r.stream).text();
    return { data: JSON.parse(text) as T, etag: r.blob.etag };
  }

  async write<T>(path: string, data: T, opts: { ifMatch?: string | null; create?: boolean } = {}): Promise<void> {
    try {
      await put(path, JSON.stringify(data), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: !opts.create,
        cacheControlMaxAge: 60,
        ...(opts.ifMatch ? { ifMatch: opts.ifMatch } : {}),
      });
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError) throw new ConflictError('precondition');
      if (opts.create && /exist/i.test(String((e as Error)?.message))) throw new ConflictError('exists');
      throw e;
    }
  }

  async remove(path: string): Promise<void> {
    await del(path);
  }

  async listJSON<T>(prefix: string): Promise<{ path: string; data: T }[]> {
    const items: { pathname: string; url: string }[] = [];
    let cursor: string | undefined;
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      items.push(...r.blobs.map((b) => ({ pathname: b.pathname, url: b.url })));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor && items.length < 20000);
    const out: { path: string; data: T }[] = [];
    // Herkese açık küçük dosyalar: CDN üzerinden, sınırlı eşzamanlılıkla
    for (let i = 0; i < items.length; i += 24) {
      const chunk = await Promise.all(
        items.slice(i, i + 24).map(async (b) => {
          try {
            const r = await fetch(b.url);
            return r.ok ? { path: b.pathname, data: (await r.json()) as T } : null;
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
