import { create } from 'zustand';
import { MMKV } from '../utils/safe-storage';
import client from '../api/client';

const storage = new MMKV();
const TOKEN_KEY = 'user-auth-token';
const USER_KEY = 'user-profile-info';

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  avatarUrl?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  likesCount?: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  initialize: () => void;
}

// NOTE: 使用 Zustand 创建极简且高性能的全局登录态 Store，配合 MMKV 实现毫秒级本地读取与状态防丢失
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setToken: (token) => {
    if (token) {
      storage.set(TOKEN_KEY, token);
    } else {
      storage.delete(TOKEN_KEY);
    }
    set({ token, isAuthenticated: !!token });
  },

  setUser: (user) => {
    if (user) {
      storage.set(USER_KEY, JSON.stringify(user));
    } else {
      storage.delete(USER_KEY);
    }
    set({ user });
  },

  logout: () => {
    storage.delete(TOKEN_KEY);
    storage.delete(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  initialize: () => {
    try {
      const token = storage.getString(TOKEN_KEY) || null;
      const userStr = storage.getString(USER_KEY);
      const user = userStr ? JSON.parse(userStr) as User : null;
      
      set({ 
        token, 
        user, 
        isAuthenticated: !!token, 
        isLoading: false 
      });
    } catch (e) {
      set({ isLoading: false });
    }
  }
}));
