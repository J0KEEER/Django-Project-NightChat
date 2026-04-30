import { create } from 'zustand';
import apiClient from '../api/client';
import { generateKeyPair } from '../utils/crypto';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  error: null,
  isLoading: false,

  generateKeys: () => {
    const { publicKey, privateKey } = generateKeyPair();
    localStorage.setItem('private_key', privateKey);
    localStorage.setItem('public_key', publicKey);
    return publicKey;
  },

  initialize: async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      set({ isAuthenticated: true });
      await get().fetchUser();
    }
  },

  fetchUser: async () => {
    try {
      const response = await apiClient.get('/api/accounts/user/');
      set({ user: response.data, isAuthenticated: true });
    } catch (err) {
      console.error('Failed to fetch user', err);
      get().logout();
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const publicKey = get().generateKeys();
      const response = await apiClient.post('/api/accounts/register/', {
        email,
        password,
        display_name: displayName,
        public_key: publicKey
      });
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ 
        error: err.response?.data?.detail || 'Registration failed', 
        isLoading: false 
      });
      return false;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/api/accounts/login/', {
        email,
        password
      });
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      await get().fetchUser();
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ 
        error: err.response?.data?.detail || 'Invalid email or password', 
        isLoading: false 
      });
      return false;
    }
  },

  googleLogin: async (credential) => {
    set({ isLoading: true, error: null });
    try {
      let publicKey = localStorage.getItem('public_key');
      if (!publicKey) {
        publicKey = get().generateKeys();
      }

      const response = await apiClient.post('/api/accounts/google/', {
        access_token: credential,
        public_key: publicKey
      });
      
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      set({ 
        isAuthenticated: true, 
        user: response.data.user, 
        isLoading: false 
      });
      return true;
    } catch (err) {
      set({ 
        error: err.response?.data?.detail || 'Google login failed', 
        isLoading: false 
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ isAuthenticated: false, user: null });
  }
}));
