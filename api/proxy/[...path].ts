const VLR_API_BASE = 'https://vlrggapi.vercel.app';
const PROXY_PREFIX = '/api/proxy';

type VercelReq = { method?: string; url?: string; query: Record<string, string | string[] | undefined> };
type VercelRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: object) => void; send: (body: string) => void };
};

/** Get subpath from request URL (e.g. /api/proxy/v2/events -> v2/events). Works regardless of how Vercel passes catch-all. */
function getSubPathFromUrl(req: VercelReq): string {
  const rawUrl = req.url ?? '';
  const pathname = rawUrl.split('?')[0] ?? '';
  if (pathname.startsWith(PROXY_PREFIX)) {
    const sub = pathname.slice(PROXY_PREFIX.length).replace(/^\/+/, '');
    if (sub) return sub;
  }
  const path = req.query.path;
  const segments = Array.isArray(path) ? path : path ? [path] : [];
  return segments.join('/');
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const subPath = getSubPathFromUrl(req);
  if (!subPath) {
    return res.status(400).json({ error: 'Missing path' });
  }

  const rawUrl = req.url ?? '';
  const queryStart = rawUrl.indexOf('?');
  const queryString = queryStart >= 0 ? rawUrl.slice(queryStart + 1) : '';
  const targetUrl = `${VLR_API_BASE}/${subPath}${queryString ? `?${queryString}` : ''}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: { Accept: 'application/json' },
    });
    const data = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(upstream.status).send(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Failed to fetch from API' });
  }
}
