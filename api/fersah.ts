// Vercel işlevi: /api/fersah?op=giris|ilerleme|tur|pano|sil
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from '../server/handler.js';
import { BlobStorage } from '../server/storage.js';

const storage = new BlobStorage();

type Req = IncomingMessage & { query?: Record<string, string | string[]>; body?: unknown };

export default async function fersah(req: Req, res: ServerResponse) {
  const secret = process.env.FERSAH_SECRET;
  const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    if (!headers['cache-control']) res.setHeader('cache-control', 'no-store');
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    res.end(JSON.stringify(body));
  };
  if (!secret || !process.env.BLOB_READ_WRITE_TOKEN) return send(503, { error: 'Sunucu yapılandırması eksik.' });
  const q = Object.fromEntries(Object.entries(req.query ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  let body: Record<string, unknown> = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch {
      return send(400, { error: 'Geçersiz istek.' });
    }
  } else if (req.body && typeof req.body === 'object') body = req.body as Record<string, unknown>;
  try {
    const r = await handle(String(q.op ?? ''), req.method ?? 'GET', body, q, { storage, secret });
    send(r.status, r.body, r.headers);
  } catch (e) {
    console.error('fersah api hatası', e);
    send(500, { error: 'Sunucuda bir sorun oluştu.' });
  }
}
