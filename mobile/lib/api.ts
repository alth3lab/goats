import { getToken, getFarmId, removeToken } from './storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// ─── Configuration ───────────────────────────────────────
// Change this to your deployed API URL
const API_BASE = 'https://goat.suhail.cc';

// ─── Auth Event Bus (for 401 auto-logout) ────────────────
type AuthListener = () => void;
const authListeners = new Set<AuthListener>();

/** Subscribe to forced-logout events (called when API returns 401). */
export function onAuthExpired(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => { authListeners.delete(listener); };
}

function notifyAuthExpired() {
  authListeners.forEach((fn) => fn());
}

// ─── JWT Helpers ─────────────────────────────────────────
/** Decode the payload of a JWT without verifying signature. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64-url → standard Base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Returns true if the token will expire within `marginSec` seconds. */
function isTokenExpiringSoon(token: string, marginSec = 120): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp - nowSec < marginSec;
}

// ─── HTTP Client ─────────────────────────────────────────
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  /** Skip the 401 auto-logout (used internally by auth endpoints). */
  skipAuthCheck?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, skipAuthCheck } = options;

  const token = await getToken();
  const farmId = await getFarmId();

  // Proactive expiry check — if token expires within 2 minutes, force logout
  if (token && !skipAuthCheck && isTokenExpiringSoon(token)) {
    await removeToken();
    notifyAuthExpired();
    throw new ApiError(401, 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
  }

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

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر الاتصال بالخادم';
    throw new ApiError(0, message);
  }

  // 401 interceptor — auto-logout on expired/invalid token
  if (response.status === 401 && !skipAuthCheck) {
    await removeToken();
    notifyAuthExpired();
    throw new ApiError(401, 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const error = contentType.includes('application/json')
      ? await response.json().catch(() => ({ error: 'خطأ غير معروف' }))
      : { error: await response.text().catch(() => 'خطأ غير معروف') };
    throw new ApiError(response.status, error.error || error.message || 'حدث خطأ');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {} as T;
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

  register: (data: { farmName: string; fullName: string; email: string; username: string; password: string; phone?: string; farmType?: string }) =>
    request<{ token: string; id: string; fullName: string; role: string; tenantId: string; farmId: string; farmName: string }>(
      '/auth/register',
      { method: 'POST', body: data }
    ),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (email: string, token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { email, token, password },
    }),

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
  list: (params?: { status?: string; page?: string; limit?: string; ownerId?: string; search?: string }) =>
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

  updateParentage: (id: string, motherTagId?: string | null, fatherTagId?: string | null) =>
    request<Record<string, unknown>>(`/goats/${id}/parentage`, {
      method: 'PATCH',
      body: {
        motherTagId: motherTagId || null,
        fatherTagId: fatherTagId || null,
      },
    }),

  delete: (id: string) =>
    request<void>(`/goats/${id}`, { method: 'DELETE' }),

  uploadImage: async (id: string, photoUri: string) => {
    // Resize to full image (800px) and thumbnail (150px)
    const [full, thumb] = await Promise.all([
      manipulateAsync(photoUri, [{ resize: { width: 800 } }], { format: SaveFormat.JPEG, compress: 0.8 }),
      manipulateAsync(photoUri, [{ resize: { width: 150 } }], { format: SaveFormat.JPEG, compress: 0.7 }),
    ]);

    // Read as base64
    const [fullB64, thumbB64] = await Promise.all([
      FileSystem.readAsStringAsync(full.uri, { encoding: FileSystem.EncodingType.Base64 }),
      FileSystem.readAsStringAsync(thumb.uri, { encoding: FileSystem.EncodingType.Base64 }),
    ]);

    const image = `data:image/jpeg;base64,${fullB64}`;
    const thumbnail = `data:image/jpeg;base64,${thumbB64}`;

    return request<{ success: boolean; thumbnail: string }>(
      `/goats/${id}/image`,
      { method: 'POST', body: { image, thumbnail } }
    );
  },
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

  recipes: () => request<Record<string, unknown>[]>('/feeds/recipes'),

  createRecipe: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/feeds/recipes', { method: 'POST', body: data }),

  reorder: () => request<Record<string, unknown>[]>('/feeds/reorder'),

  stock: (params?: { page?: string; limit?: string }) =>
    request<Record<string, unknown>[]>('/feeds/stock', { params }),

  addStock: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/feeds/stock', { method: 'POST', body: data }),
};

// ─── Breeding API ────────────────────────────────────────
export const breedingApi = {
  list: () => request<Record<string, unknown>[]>('/breeding'),

  get: (id: string) =>
    request<Record<string, unknown>>(`/breeding/${id}`),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/breeding', { method: 'POST', body: data }),

  update: (id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/breeding/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    request<void>(`/breeding/${id}`, { method: 'DELETE' }),

  recordBirths: (id: string, data: { birthDate: string; kids: Array<{ tagId?: string; gender: string; weight?: number; status: string; notes?: string | null }> }) =>
    request<Record<string, unknown>>(`/breeding/${id}/births`, { method: 'POST', body: data }),
};

// ─── Expenses API ────────────────────────────────────────
export const expensesApi = {
  list: (params?: { page?: string; limit?: string; ownerId?: string }) =>
    request<{ data?: Record<string, unknown>[]; total?: number } | Record<string, unknown>[]>('/expenses', { params }),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/expenses', { method: 'POST', body: data }),
};

// ─── Pens API ────────────────────────────────────────────
export const pensApi = {
  list: () => request<Record<string, unknown>[]>('/pens'),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/pens', { method: 'POST', body: data }),
};

// ─── Owners API ──────────────────────────────────────────
export const ownersApi = {
  list: () => request<Record<string, unknown>[]>('/owners'),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/owners', { method: 'POST', body: data }),
};

// ─── Calendar API ────────────────────────────────────────
export const calendarApi = {
  list: (params?: { start?: string; end?: string; eventType?: string }) =>
    request<Record<string, unknown>[]>('/calendar', { params }),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/calendar', { method: 'POST', body: data }),
};

// ─── Inventory API ───────────────────────────────────────
export const inventoryApi = {
  list: (params?: { category?: string; lowStock?: string }) =>
    request<Record<string, unknown>[]>('/inventory', { params }),

  get: (id: string) =>
    request<Record<string, unknown>>(`/inventory/${id}`),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/inventory', { method: 'POST', body: data }),

  update: (id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/inventory/${id}`, { method: 'PUT', body: data }),
};

// ─── Farms API ───────────────────────────────────────────
export const farmsApi = {
  list: () => request<Record<string, unknown>[]>('/farms'),

  get: (id: string) => request<Record<string, unknown>>(`/farms/${id}`),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/farms', { method: 'POST', body: data }),

  update: (id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/farms/${id}`, { method: 'PUT', body: data }),

  switchFarm: (farmId: string) =>
    request<Record<string, unknown>>('/farms/switch', { method: 'POST', body: { farmId } }),
};

// ─── Subscription API ────────────────────────────────────
export const subscriptionApi = {
  get: () => request<Record<string, unknown>>('/settings/subscription'),

  upgrade: (plan: string) =>
    request<Record<string, unknown>>('/settings/subscription', { method: 'POST', body: { plan } }),
};

// ─── Activities API ──────────────────────────────────────
export const activitiesApi = {
  list: (params?: { page?: string; limit?: string }) =>
    request<{ data?: Record<string, unknown>[]; total?: number } | Record<string, unknown>[]>('/activities', { params }),
};

// ─── Settings API ────────────────────────────────────────
export const settingsApi = {
  get: () => request<Record<string, unknown>>('/settings'),

  update: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/settings', { method: 'PUT', body: data }),
};

// ─── Alerts API ──────────────────────────────────────────
export const alertsApi = {
  list: () => request<Record<string, unknown>[]>('/alerts'),
};

// ─── Push API ────────────────────────────────────────────
export const pushApi = {
  registerExpoToken: (token: string) =>
    request<{ success: boolean }>('/push/expo-register', {
      method: 'POST',
      body: { token, platform: Platform.OS },
    }),
};

// ─── AI API ──────────────────────────────────────────────
export const aiApi = {
  chat: async (messages: { role: string; content: string }[]): Promise<string> => {
    const token = await getToken();
    const farmId = await getFarmId();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (farmId) headers['X-Farm-Id'] = farmId;

    const res = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages }),
    });

    if (res.status === 401) {
      await removeToken();
      notifyAuthExpired();
      throw new ApiError(401, 'انتهت صلاحية الجلسة');
    }

    if (!res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const err = await res.json().catch(() => ({ error: 'خطأ' }));
        throw new ApiError(res.status, err.error || 'حدث خطأ');
      }
      throw new ApiError(res.status, 'حدث خطأ في الاتصال');
    }

    return res.text();
  },

  analyzeImage: async (uri: string, type: string = 'breed'): Promise<{ analysis: string }> => {
    const token = await getToken();
    const farmId = await getFarmId();

    const formData = new FormData();
    formData.append('image', {
      uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    formData.append('type', type);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (farmId) headers['X-Farm-Id'] = farmId;

    const res = await fetch(`${API_BASE}/api/ai/analyze-image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'خطأ' }));
      throw new ApiError(res.status, err.error || 'فشل تحليل الصورة');
    }

    return res.json();
  },

  breedingRecommend: (goatId: string) =>
    request<{ recommendations: string }>('/ai/breeding-recommend', {
      method: 'POST',
      body: { goatId },
    }),
};

// ─── Team API ────────────────────────────────────────────
export const teamApi = {
  list: () => request<Record<string, unknown>[]>('/team'),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/team', { method: 'POST', body: data }),

  update: (id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/team/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    request<void>(`/team/${id}`, { method: 'DELETE' }),
};

// ─── Search API ──────────────────────────────────────────
export const searchApi = {
  search: (query: string) =>
    request<Record<string, unknown>[]>('/search', { params: { q: query } }),
};

// ─── Vaccination Protocols API ───────────────────────────
export const protocolsApi = {
  list: () => request<Record<string, unknown>[]>('/health/protocols'),

  getDue: () => request<Record<string, unknown>[]>('/health/due'),
};

// ─── Lookup APIs ─────────────────────────────────────────
export const lookupApi = {
  types: () => request<Record<string, unknown>[]>('/types'),
  breeds: () => request<Record<string, unknown>[]>('/breeds'),
  pens: () => request<Record<string, unknown>[]>('/pens'),
  owners: () => request<Record<string, unknown>[]>('/owners'),
};

// ─── Helpers ─────────────────────────────────────────────
/**
 * Resolve a goat tag ID (e.g. "G-001") to its UUID.
 * Uses server-side search when available, falls back to a small paginated fetch.
 */
export async function resolveGoatByTag(tagId: string): Promise<string | null> {
  const trimmed = tagId.trim();
  if (!trimmed) return null;
  try {
    // Try server-side search first (single network call)
    const result = await goatsApi.list({ search: trimmed, limit: '10' });
    const goats = (result.data || []) as Array<{ id: string; tagId: string }>;
    const exact = goats.find(g => g.tagId === trimmed);
    if (exact) return exact.id;
  } catch {
    // Fallback if search param not supported
  }
  // Fallback: paginated fetch (limit to 200 instead of 500)
  const result = await goatsApi.list({ limit: '200' });
  const goats = (result.data || []) as Array<{ id: string; tagId: string }>;
  const match = goats.find(g => g.tagId === trimmed);
  return match?.id ?? null;
}
