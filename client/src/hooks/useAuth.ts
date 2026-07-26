import { useState, useCallback } from 'react';
import { ApiService } from '../services/apiService.js';
import { STORAGE_KEY_TOKEN } from '../config/constants.js';

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY_TOKEN));

  const login = useCallback(async (password: string) => {
    const data = await ApiService.login(password);
    localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
    setToken(data.token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    setToken(null);
  }, []);

  return {
    token,
    isAuthenticated: Boolean(token),
    login,
    logout
  };
}
