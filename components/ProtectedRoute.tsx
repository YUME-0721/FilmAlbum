/**
 * 受保护路由组件
 * 未登录用户访问受保护页面时自动重定向到登录页
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.tsx';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  // 等待认证状态加载完成
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-on-surface-variant font-label text-sm tracking-widest uppercase animate-pulse">
          加载中...
        </div>
      </div>
    );
  }

  // 未登录用户重定向到登录页，并保存当前路径用于登录后跳转
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 已登录用户正常访问
  return <>{children}</>;
}
