import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { CompanionPairingPayload, Track, Playlist } from '../types';

const TOKEN_KEY = 'purrsonica_auth_token';
const DEVICE_ID_KEY = 'purrsonica_device_id';
const DEVICE_NAME_KEY = 'purrsonica_device_name';
const SERVER_CONFIG_KEY = 'purrsonica_server_config';

export interface StoredServerConfig {
  serverName: string;
  localIps: string[];
  port: number;
  fingerprint: string;
  allowOutsideLan?: boolean;
}

// Fallback in-memory storage for web/testing
const memoryStorage = new Map<string, string>();

async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      memoryStorage.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.warn(`[Storage] SecureStore write failed for ${key}, falling back to memory:`, err);
    memoryStorage.set(key, value);
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return memoryStorage.get(key) || null;
    }
    const val = await SecureStore.getItemAsync(key);
    return val !== null ? val : (memoryStorage.get(key) || null);
  } catch (err) {
    console.warn(`[Storage] SecureStore read failed for ${key}, falling back to memory:`, err);
    return memoryStorage.get(key) || null;
  }
}

async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      memoryStorage.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    memoryStorage.delete(key);
  }
}

// Device UUID Management
export async function getOrCreateDeviceId(): Promise<string> {
  let id = await getSecureItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'mobile_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    await setSecureItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function getDeviceName(): Promise<string> {
  const custom = await getSecureItem(DEVICE_NAME_KEY);
  if (custom) return custom;

  if (Platform.OS === 'android') {
    const c = Platform.constants as any;
    const rawBrand = (c?.Brand || c?.Manufacturer || '').trim();
    const model = (c?.Model || 'Android Phone').trim();
    const brand = rawBrand ? rawBrand.charAt(0).toUpperCase() + rawBrand.slice(1) : '';
    if (brand && !model.toLowerCase().startsWith(brand.toLowerCase())) {
      return `${brand} ${model}`;
    }
    return model;
  } else if (Platform.OS === 'ios') {
    return 'iPhone Companion';
  }
  return 'Mobile Companion';
}

export async function setDeviceName(name: string): Promise<void> {
  await setSecureItem(DEVICE_NAME_KEY, name);
}

// Auth Token Management
export async function saveAuthToken(token: string): Promise<void> {
  await setSecureItem(TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return await getSecureItem(TOKEN_KEY);
}

export async function clearAuthToken(): Promise<void> {
  await deleteSecureItem(TOKEN_KEY);
}

// Server Config Management (IPs, Port, Fingerprint)
export async function saveServerConfig(config: StoredServerConfig): Promise<void> {
  await setSecureItem(SERVER_CONFIG_KEY, JSON.stringify(config));
}

export async function getServerConfig(): Promise<StoredServerConfig | null> {
  const json = await getSecureItem(SERVER_CONFIG_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json) as StoredServerConfig;
  } catch {
    return null;
  }
}

export async function clearServerConfig(): Promise<void> {
  await deleteSecureItem(SERVER_CONFIG_KEY);
}

// Clear all paired session data
export async function wipePairingSession(): Promise<void> {
  await clearAuthToken();
  await clearServerConfig();
}
