import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, ApiError } from './api';
import { getToken, setToken, removeToken, setFarmId } from './storage';
import type { AuthUser, FarmInfo, UserFarm } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  farm: FarmInfo | null;
  farms: UserFarm[];
  permissions: string[];
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { farmName: string; fullName: string; email: string; username: string; password: string; phone?: string; farmType?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchFarm: (farmId: string) => Promise<void>;
  can: (permission?: string) => boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [farm, setFarm] = useState<FarmInfo | null>(null);
  const [farms, setFarms] = useState<UserFarm[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await authApi.me();
      setUser(data.user);
      setFarm(data.farm);
      setFarms(data.farms);
      setPermissions(data.permissions);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await removeToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (identifier: string, password: string) => {
    const data = await authApi.login(identifier, password);
    await setToken(data.token);
    if (data.farmId) await setFarmId(data.farmId);
    await refresh();
  };

  const register = async (regData: { farmName: string; fullName: string; email: string; username: string; password: string; phone?: string; farmType?: string }) => {
    const data = await authApi.register(regData);
    await setToken(data.token);
    if (data.farmId) await setFarmId(data.farmId);
    await refresh();
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
    setFarm(null);
    setFarms([]);
    setPermissions([]);
  };

  const switchFarm = async (farmId: string) => {
    const data = await authApi.switchFarm(farmId);
    await setToken(data.token);
    await setFarmId(farmId);
    await refresh();
  };

  const can = (permission?: string): boolean => {
    if (!user) return false;
    const role = user.role;
    if (role === 'SUPER_ADMIN') return true;
    if (!permission) return true;
    if (permission === '__super_admin__') return role === 'SUPER_ADMIN';
    if (permission === '__owner__') return ['SUPER_ADMIN', 'OWNER'].includes(role);
    if (permission === '__owner_admin__') return ['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role);
    if (['OWNER', 'ADMIN'].includes(role)) return true;
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, farm, farms, permissions, loading, login, register, logout, switchFarm, can, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
