import { getToken, getFarmId } from './storage';

// ─── Configuration ───────────────────────────────────────
// Change this to your deployed API URL
const API_BASE = 'https://goat.suhail.cc';

// ─── HTTP Client ─────────────────────────────────────────
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  const token = await getToken();
  const farmId = await getFarmId();

  let url = `${API_BASE}/api${endpoint}`;

  // Add query params
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) searchParams.append(key, value);
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (farmId) {
    headers['X-Farm-Id'] = farmId;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'خطأ غير معروف' }));
    throw new ApiError(response.status, error.error || error.message || 'حدث خطأ');
  }

  return response.json();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// ─── Auth API ────────────────────────────────────────────
export const authApi = {
  login: (identifier: string, password: string) =>
    request<{ token: string; id: string; fullName: string; role: string; tenantId: string; farmId: string; farmName: string }>(
      '/auth/login',
      { method: 'POST', body: { identifier, password } }
    ),

  me: () =>
    request<{
      user: { id: string; fullName: string; username: string; role: string; tenantId: string; farmId: string };
      farm: { id: string; name: string; nameAr: string; currency: string; farmType: string };
      farms: Array<{ id: string; name: string; nameAr: string; farmType: string; role: string; tenantName: string; tenantId: string }>;
      permissions: string[];
    }>('/auth/me'),

  switchFarm: (farmId: string) =>
    request<{ token: string }>('/farms/switch', { method: 'POST', body: { farmId } }),
};

// ─── Stats API ───────────────────────────────────────────
export const statsApi = {
  get: (year?: number, month?: number) => {
    const params: Record<string, string> = {};
    if (year) params.year = String(year);
    if (month) params.month = String(month);
    return request<Record<string, unknown>>('/stats', { params });
  },
};

// ─── Goats API ───────────────────────────────────────────
export const goatsApi = {
  list: (params?: { status?: string; page?: string; limit?: string; ownerId?: string }) =>
    request<{ data: Record<string, unknown>[]; total: number; page: number; limit: number }>(
      '/goats',
      { params }
    ),

  get: (id: string) =>
    request<Record<string, unknown>>(`/goats/${id}`),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/goats', { method: 'POST', body: data }),

  update: (id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/goats/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    request<void>(`/goats/${id}`, { method: 'DELETE' }),
};

// ─── Health API ──────────────────────────────────────────
export const healthApi = {
  list: (goatId?: string) => {
    const params: Record<string, string> = {};
    if (goatId) params.goatId = goatId;
    return request<Record<string, unknown>[]>('/health', { params });
  },

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/health', { method: 'POST', body: data }),
};

// ─── Sales API ───────────────────────────────────────────
export const salesApi = {
  list: (ownerId?: string) => {
    const params: Record<string, string> = {};
    if (ownerId) params.ownerId = ownerId;
    return request<Record<string, unknown>[]>('/sales', { params });
  },

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/sales', { method: 'POST', body: data }),
};

// ─── Feeds API ───────────────────────────────────────────
export const feedsApi = {
  list: (category?: string) => {
    const params: Record<string, string> = {};
    if (category && category !== 'ALL') params.category = category;
    return request<Record<string, unknown>[]>('/feeds', { params });
  },

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/feeds', { method: 'POST', body: data }),
};

// ─── Alerts API ──────────────────────────────────────────
export const alertsApi = {
  list: () => request<Record<string, unknown>[]>('/alerts'),
};

// ─── Lookup APIs ─────────────────────────────────────────
export const lookupApi = {
  types: () => request<Record<string, unknown>[]>('/types'),
  breeds: () => request<Record<string, unknown>[]>('/breeds'),
  pens: () => request<Record<string, unknown>[]>('/pens'),
  owners: () => request<Record<string, unknown>[]>('/owners'),
};
