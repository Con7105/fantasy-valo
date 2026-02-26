const STORAGE_KEY = 'apiBaseURL';
const DEFAULT_BASE = 'https://vlrggapi.vercel.app';
const DEAD_URL = 'https://vlrgg.cyclic.app/api';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_BASE;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored || stored === DEAD_URL) return DEFAULT_BASE;
  return stored;
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, url);
}

export function apiUrl(path: string, searchParams?: Record<string, string>): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  const url = `${base}/${p}`;
  if (!searchParams || Object.keys(searchParams).length === 0) return url;
  const params = new URLSearchParams(searchParams);
  return `${url}?${params.toString()}`;
}
