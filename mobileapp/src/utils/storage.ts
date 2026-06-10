import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const saveSecurely = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

export const getSecurely = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

export const deleteSecurely = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};
