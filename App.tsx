/**
 * 应用根组件
 * 配置路由和认证上下文
 */
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './src/context/AuthContext.tsx';
import { SettingsProvider } from './src/context/SettingsContext.tsx';
import Layout from './components/Layout.tsx';
import Home from './pages/Home.tsx';
import Profile from './pages/Profile.tsx';
import FilmRoll from './pages/FilmRoll.tsx';
import FrameView from './pages/FrameView.tsx';
import Post from './pages/Post.tsx';
import Login from './pages/Login.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import Settings from './pages/Settings.tsx';
import Messages from './pages/Messages.tsx';
import Admin from './pages/Admin.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* 主页公开访问 */}
            <Route index element={<Home />} />
            
            {/* 受保护页面 - 需要登录 */}
            <Route path="space" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="space/:id" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="roll/:id" element={
              <ProtectedRoute>
                <FilmRoll />
              </ProtectedRoute>
            } />
            <Route path="frame/:frameId" element={
              <ProtectedRoute>
                <FrameView />
              </ProtectedRoute>
            } />
            <Route path="post/:id" element={
              <ProtectedRoute>
                <Post />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="messages" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            <Route path="messages/:userId" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            
            {/* 登录页公开访问 */}
            <Route path="login" element={<Login />} />
            <Route path="reset-password" element={<ResetPassword />} />
          </Route>

          {/* 超级管理员后台 — 独立布局，无主导航栏 */}
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </AuthProvider>
    </SettingsProvider>
  );
}
