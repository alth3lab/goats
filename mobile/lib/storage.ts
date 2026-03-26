import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const FARM_KEY = 'current_farm_id';

function canUseSecureStore(): boolean {
  return (
    typeof SecureStore.getItemAsync === 'function' &&
    typeof SecureStore.setItemAsync === 'function' &&
    typeof SecureStore.deleteItemAsync === 'function'
  );
}

// ─── Secure Storage (for token) ──────────────────────────
export async function getToken(): Promise<string | null> {
  try {
    if (canUseSecureStore()) {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}

export async function setToken(token: string): Promise<void> {
  if (canUseSecureStore()) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return;
    } catch {
      // Fall back to AsyncStorage when SecureStore native module is unavailable.
    }
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  if (canUseSecureStore()) {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Ignore and clear fallback storage below.
    }
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
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
