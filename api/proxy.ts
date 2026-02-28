const VLR_API_BASE = 'https://vlrggapi.vercel.app';

type VercelReq = { method?: string; url?: string; query: Record<string, string | string[] | undefined> };
type VercelRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: object) => void; send: (body: string) => void };
};

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pathParam = req.query.path;
  const subPath = typeof pathParam === 'string' ? pathParam : Array.isArray(pathParam) ? pathParam.join('/') : '';
  if (!subPath) {
    return res.status(400).json({ error: 'Missing path query parameter' });
  }

  const rawUrl = req.url ?? '';
  const queryStart = rawUrl.indexOf('?');
  const queryString = queryStart >= 0 ? rawUrl.slice(queryStart + 1) : '';
  const params = new URLSearchParams(queryString);
  params.delete('path');
  const restQuery = params.toString();
  const targetUrl = `${VLR_API_BASE}/${subPath}${restQuery ? `?${restQuery}` : ''}`;

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
