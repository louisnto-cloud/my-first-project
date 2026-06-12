const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

let token = localStorage.getItem('etop-token') ?? '';

export function setToken(t: string): void {
  token = t;
  if (t) localStorage.setItem('etop-token', t);
  else localStorage.removeItem('etop-token');
}

export function hasToken(): boolean {
  return !!token;
}

export class ApiError extends Error {
  constructor(public status: number, public body: { error?: string }) {
    super(body.error ?? `http_${status}`);
  }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(res.status, json);
  return json;
}

export interface Me {
  id: string;
  name: string;
  role: string;
  orgId: string;
  siteId: string | null;
  locale: string;
}
