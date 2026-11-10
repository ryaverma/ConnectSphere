const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Token storage ────────────────────────────────────────────────────────────

const TOKEN_KEY = 'cs-token';
const REFRESH_KEY = 'cs-refresh';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function getRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}
export function setTokens(token: string, refreshToken?: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch { /* noop */ }
}
export function clearTokens() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); } catch { /* noop */ }
}

// ─── Base fetch wrapper ────────────────────────────────────────────────────────

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth header (for login/register) */
  noAuth?: boolean;
};

async function refreshAccessToken(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setTokens(data.token);
    return data.token;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, noAuth = false } = opts;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (!noAuth) {
    const token = getToken();
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = { method, headers: reqHeaders };
  if (body !== undefined) config.body = JSON.stringify(body);

  let res = await fetch(`${API_BASE}${path}`, config);

  // Auto-refresh on 401
  if (res.status === 401 && !noAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...config, headers: reqHeaders });
    } else {
      clearTokens();
      window.location.href = '/signin';
      throw new ApiError(401, 'Session expired');
    }
  }

  if (!res.ok) {
    let errData: unknown;
    try { errData = await res.json(); } catch { errData = null; }
    const msg = (errData as { error?: string })?.error || res.statusText;
    throw new ApiError(res.status, msg, errData);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Convenience helpers
export const api = {
  get:    <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'GET' }),
  post:   <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  patch:  <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
