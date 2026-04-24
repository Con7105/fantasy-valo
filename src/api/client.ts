import { apiUrl } from './config';

export class APIError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = apiUrl(path, params);
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const vercel = res.headers.get('x-vercel-error');
    const msg =
      res.status === 402 && vercel === 'DEPLOYMENT_DISABLED'
        ? 'VLR API upstream is disabled (HTTP 402). The app proxy must use a working host (default is Render); redeploy or set VLR_API_BASE.'
        : res.status === 503
          ? 'VLR API is temporarily unavailable (HTTP 503). The app will use cached data if available; otherwise try again later.'
        : `Server error (HTTP ${res.status})`;
    throw new APIError(msg, res.status);
  }
  return res.json() as Promise<T>;
}
