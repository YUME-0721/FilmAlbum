/**
 * 认证相关 API
 */
import { post, get } from './client.ts';

/** 登录/注册返回的用户数据 */
export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  level: string;
  followersCount?: number;
  followingCount?: number;
  likesCount?: number;
  token?: string;
}

/** 注册 */
export function register(email: string, password: string, nickname: string, code: string) {
  return post<AuthUser>('/auth/register', { email, password, nickname, code });
}

/** 登录 */
export function login(email: string, password: string) {
  return post<AuthUser>('/auth/login', { email, password });
}

/** 登出 */
export function logout() {
  return post('/auth/logout');
}

/** 获取当前用户信息 */
export function getCurrentUser() {
  return get<AuthUser>('/auth/me');
}

/** 发送验证码 */
export function sendCode(email: string, type: 'register' | 'reset-password' = 'register') {
  return post('/auth/send-code', { email, type });
}
