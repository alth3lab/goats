import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const FARM_KEY = 'current_farm_id';

// ─── Secure Storage (for token) ──────────────────────────
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── Regular Storage (for preferences) ──────────────────
export async function getFarmId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FARM_KEY);
  } catch {
    return null;
  }
}

export async function setFarmId(farmId: string): Promise<void> {
  await AsyncStorage.setItem(FARM_KEY, farmId);
}

export async function clearAll(): Promise<void> {
  await removeToken();
  await AsyncStorage.clear();
}
