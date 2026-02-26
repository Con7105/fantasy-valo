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
    throw new APIError(`Server error (HTTP ${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}
