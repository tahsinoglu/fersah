// Depolama: üretimde Vercel Blob (etag ile koşullu yazma), yerelde ve testlerde bellek/dosya.
import { del, get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
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
}
