import { getToken, getFarmId } from './storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

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
};

// ─── Breeding API ────────────────────────────────────────
export const breedingApi = {
  list: () => request<Record<string, unknown>[]>('/breeding'),

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/breeding', { method: 'POST', body: data }),
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

  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/inventory', { method: 'POST', body: data }),
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
 * Returns the UUID string or null if not found.
 */
export async function resolveGoatByTag(tagId: string): Promise<string | null> {
  const trimmed = tagId.trim();
  if (!trimmed) return null;
  const result = await goatsApi.list({ limit: '500' });
  const goats = (result.data || []) as Array<{ id: string; tagId: string }>;
  const match = goats.find(g => g.tagId === trimmed);
  return match?.id ?? null;
}
