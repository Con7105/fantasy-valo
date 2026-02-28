const STORAGE_KEY = 'apiBaseURL';
/** Same-origin proxy avoids CORS; use this by default when in the browser. */
const DEFAULT_BASE = '/api/proxy';
const DEAD_URL = 'https://vlrgg.cyclic.app/api';
const DIRECT_VLR = 'https://vlrggapi.vercel.app';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_BASE;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored == null || stored === '' || stored === DEAD_URL) return DEFAULT_BASE;
  if (stored === DIRECT_VLR || stored === DIRECT_VLR + '/') return DEFAULT_BASE;
  return stored;
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, url);
}

/** When using the same-origin proxy (/api/proxy), we pass the path as a query param so Vercel deploys a single serverless function. */
const PROXY_BASE = '/api/proxy';

export function apiUrl(path: string, searchParams?: Record<string, string>): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  const params = new URLSearchParams(searchParams ?? {});
  if (base === PROXY_BASE) {
    params.set('path', p);
    return `${base}?${params.toString()}`;
  }
  const pathPart = `${base}/${p}`;
  if (params.toString()) return `${pathPart}?${params.toString()}`;
  return pathPart;
}
