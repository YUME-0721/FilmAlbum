/**
 * 全局认证上下文
 * 管理登录状态、用户信息、自动恢复会话
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister, type AuthUser } from '../api/auth.ts';

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 认证上下文提供者
 * 应用启动时自动尝试恢复 JWT Cookie 中的会话
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** 恢复会话 */
  const refreshUser = useCallback(async () => {
    try {
      const result = await getCurrentUser();
      if (result.success && result.data) {
        setUser(result.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  // 应用启动时尝试恢复会话
  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    if (result.success && result.data) {
      setUser(result.data);
    } else {
      throw new Error(result.error || '登录失败');
    }
  }, []);

  const register = useCallback(async (email: string, password: string, nickname: string, code: string) => {
    const result = await apiRegister(email, password, nickname, code);
    if (!result.success) {
      throw new Error(result.error || '注册失败');
    }
    // 注册成功后不在此处设置用户，要求用户手动登录
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      isLoading,
      login,
      register,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 认证 Hook
 * 在组件中消费认证上下文
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}
