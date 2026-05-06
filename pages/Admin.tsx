/**
 * 超级管理员后台页面
 * 独立全屏布局，不使用主导航栏
 * 含独立的语言切换和明暗主题切换
 */
import { useState, useEffect } from 'react';
import { useSettings } from '../src/context/SettingsContext';
import { useTranslation } from '../src/hooks/useTranslation';
import { get, post, put } from '../src/api/client';
import {
  ShieldAlert, Users, Film, RefreshCw, Plus,
  Sun, Moon, Languages, LogOut, Settings2
} from 'lucide-react';

/** 管理员后台专属语言文本 */
const i18n = {
  'zh-CN': {
    title: '超级管理员',
    dashboard: '控制台',
    totalUsers: '总用户数',
    totalRolls: '总影集数',
    systemSettings: '系统设置',
    openRegistration: '开放注册',
    openRegistrationDesc: '允许新用户公开注册账号',
    defaultLanguage: '默认语言',
    lv2RollLimit: 'LV2 影集上限',
    lv2RollLimitDesc: 'LV2 用户最多可创建的影集数量',
    createUser: '创建用户',
    email: '邮箱',
    password: '密码',
    nickname: '昵称',
    level: '等级',
    create: '创建',
    creating: '创建中...',
    createSuccess: '创建成功',
    userManagement: '用户管理',
    id: 'ID',
    user: '用户',
    joined: '注册时间',
    logout: '退出登录',
    loginTitle: '管理员登录',
    adminPassword: '管理员密码',
    login: '登录',
    loginError: '密码错误或登录异常',
    on: '开启',
    off: '关闭',
    refresh: '刷新',
    updateFailed: '更新失败，请重试',
    lv1Desc: '只读权限',
    lv2Desc: '标准权限',
    lv3Desc: '无限制',
  },
  'en-US': {
    title: 'Super Admin',
    dashboard: 'Dashboard',
    totalUsers: 'Total Users',
    totalRolls: 'Total Rolls',
    systemSettings: 'System Settings',
    openRegistration: 'Open Registration',
    openRegistrationDesc: 'Allow new users to register publicly',
    defaultLanguage: 'Default Language',
    lv2RollLimit: 'LV2 Roll Limit',
    lv2RollLimitDesc: 'Max rolls an LV2 user can create',
    createUser: 'Create User',
    email: 'Email',
    password: 'Password',
    nickname: 'Nickname',
    level: 'Level',
    create: 'Create',
    creating: 'Creating...',
    createSuccess: 'Created successfully',
    userManagement: 'User Management',
    id: 'ID',
    user: 'User',
    joined: 'Joined',
    logout: 'Logout',
    loginTitle: 'Admin Login',
    adminPassword: 'Admin Password',
    login: 'Login',
    loginError: 'Wrong password or login error',
    on: 'On',
    off: 'Off',
    refresh: 'Refresh',
    updateFailed: 'Update failed, please try again',
    lv1Desc: 'Read-only',
    lv2Desc: 'Standard',
    lv3Desc: 'Unlimited',
  }
};

export default function Admin() {
  // NOTE: Admin 页面有独立的 theme 和 language 状态，
  // 与全局 SettingsContext 保持同步但可独立切换
  const { isDarkMode, setThemeMode, themeMode, language, setLanguage } = useSettings();
  const { t } = useTranslation();

  // 当前后台界面的语言，优先跟随全局语言
  const [adminLang, setAdminLang] = useState<'zh-CN' | 'en-US'>(
    (language as 'zh-CN' | 'en-US') || 'zh-CN'
  );
  const at = (key: keyof typeof i18n['zh-CN']) => i18n[adminLang][key];

  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [stats, setStats] = useState({ users: 0, rolls: 0 });
  const [settings, setSystemSettings] = useState({
    open_registration: 'true',
    default_language: 'zh-CN',
    lv2_roll_limit: '10'
  });
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', nickname: '', level: 'lv1' });
  const [createStatus, setCreateStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  // 同步管理后台语言到全局 language 变动
  useEffect(() => {
    setAdminLang((language as 'zh-CN' | 'en-US') || 'zh-CN');
  }, [language]);

  const toggleLanguage = () => {
    const next = adminLang === 'zh-CN' ? 'en-US' : 'zh-CN';
    setAdminLang(next);
    setLanguage(next); // 同步到全局
  };

  const toggleTheme = () => {
    setThemeMode(isDarkMode ? 'light' : 'dark');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await post<{ token: string }>('/admin/login', { password });
      if (res.success && res.data) {
        setToken(res.data.token);
        localStorage.setItem('adminToken', res.data.token);
      } else {
        setLoginError(res.error || at('loginError'));
      }
    } catch (err: any) {
      setLoginError(err.message || at('loginError'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('adminToken');
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, settingsRes, usersRes] = await Promise.all([
        get<{ users: number; rolls: number }>('/admin/stats', undefined, { headers }),
        get<Record<string, string>>('/admin/settings', undefined, { headers }),
        get<{ users: any[] }>('/admin/users', undefined, { headers }),
      ]);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (settingsRes.success && settingsRes.data) setSystemSettings(settingsRes.data as any);
      if (usersRes.success && usersRes.data) setUsers(usersRes.data.users);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('403')) handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const res = await put('/admin/settings', { key, value }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setSystemSettings(prev => ({ ...prev, [key]: value }));
      } else {
        alert(at('updateFailed'));
      }
    } catch {
      alert(at('updateFailed'));
    }
  };

  const handleUpdateUserLevel = async (userId: string, level: string) => {
    try {
      const res = await put(`/admin/users/${userId}/level`, { level }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, level } : u));
      }
    } catch {
      alert(at('updateFailed'));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateStatus({ type: 'loading', message: at('creating') });
    try {
      const res = await post('/admin/users', newUser, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setCreateStatus({ type: 'success', message: at('createSuccess') });
        setNewUser({ email: '', password: '', nickname: '', level: 'lv1' });
        fetchDashboardData();
      } else {
        setCreateStatus({ type: 'error', message: res.error || 'Error' });
      }
    } catch (err: any) {
      setCreateStatus({ type: 'error', message: err.message || 'Error' });
    }
  };

  // ── 颜色常量 ────────────────────────────────────────────
  const bg = isDarkMode ? 'bg-[#0d0d0d]' : 'bg-gray-50';
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const cardBg = isDarkMode ? 'bg-[#1a1a1a] border-white/8' : 'bg-white border-gray-200';
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    isDarkMode ? 'bg-[#242424] border-white/10 text-white placeholder:text-white/30' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
  }`;
  const mutedText = isDarkMode ? 'text-white/40' : 'text-gray-400';
  const dividerCls = isDarkMode ? 'divide-white/8' : 'divide-gray-100';

  // ── 顶部导航栏 ───────────────────────────────────────────
  const Topbar = () => (
    <header className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 border-b backdrop-blur-md ${
      isDarkMode ? 'bg-[#0d0d0d]/90 border-white/8' : 'bg-white/90 border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        <ShieldAlert size={20} className="text-blue-500" />
        <span className="font-bold tracking-wider text-sm uppercase">{at('title')}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* 语言切换 */}
        <button
          onClick={toggleLanguage}
          title={adminLang === 'zh-CN' ? 'Switch to English' : '切换到中文'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${
            isDarkMode
              ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
        >
          <Languages size={14} />
          {adminLang === 'zh-CN' ? 'EN' : '中'}
        </button>

        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? (adminLang === 'zh-CN' ? '切换至亮色模式' : 'Switch to Light') : (adminLang === 'zh-CN' ? '切换至暗色模式' : 'Switch to Dark')}
          className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
            isDarkMode
              ? 'border-white/10 bg-white/5 hover:bg-white/10 text-amber-400'
              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-blue-600'
          }`}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* 退出登录（仅登录后显示） */}
        {token && (
          <button
            onClick={handleLogout}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 active:scale-95 ${
              isDarkMode
                ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400'
                : 'border-red-200 bg-red-50 hover:bg-red-100 text-red-600'
            }`}
          >
            <LogOut size={14} />
            {at('logout')}
          </button>
        )}
      </div>
    </header>
  );

  // ── 登录页 ────────────────────────────────────────────────
  if (!token) {
    return (
      <div className={`min-h-screen ${bg} ${text} transition-colors duration-300`}>
        <Topbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50'
              }`}>
                <ShieldAlert size={32} className="text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold">{at('loginTitle')}</h1>
              <p className={`text-sm mt-1 ${mutedText}`}>Film Album · Admin Portal</p>
            </div>

            <div className={`rounded-2xl border p-6 ${cardBg}`}>
              {loginError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {loginError}
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-widest mb-1.5 ${mutedText}`}>
                    {at('adminPassword')}
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? <RefreshCw size={16} className="animate-spin" /> : null}
                  {isLoggingIn ? '...' : at('login')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 主控制台 ──────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-300`}>
      <Topbar />

      <main className="pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* 页面标题 */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 size={22} className="text-blue-500" />
              {at('dashboard')}
            </h1>
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all hover:scale-105 active:scale-95 ${
                isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-100'
              }`}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              {at('refresh')}
            </button>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className={`flex items-center gap-4 p-5 rounded-2xl border ${cardBg}`}>
              <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                <Users size={24} className="text-blue-500" />
              </div>
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${mutedText}`}>{at('totalUsers')}</p>
                <p className="text-3xl font-bold mt-0.5">{stats.users}</p>
              </div>
            </div>
            <div className={`flex items-center gap-4 p-5 rounded-2xl border ${cardBg}`}>
              <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                <Film size={24} className="text-emerald-500" />
              </div>
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${mutedText}`}>{at('totalRolls')}</p>
                <p className="text-3xl font-bold mt-0.5">{stats.rolls}</p>
              </div>
            </div>
          </div>

          {/* 内容区：左右布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── 左侧 ── */}
            <div className="space-y-6">

              {/* 系统设置 */}
              <div className={`rounded-2xl border ${cardBg}`}>
                <div className="px-5 py-4 border-b border-inherit">
                  <h2 className="font-bold text-sm uppercase tracking-widest">{at('systemSettings')}</h2>
                </div>
                <div className="p-5 space-y-5">

                  {/* 开放注册 */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{at('openRegistration')}</p>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>{at('openRegistrationDesc')}</p>
                    </div>
                    <button
                      onClick={() => handleUpdateSetting('open_registration', settings.open_registration === 'true' ? 'false' : 'true')}
                      className={`relative flex-shrink-0 inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        settings.open_registration === 'true' ? 'bg-blue-500' : isDarkMode ? 'bg-white/15' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                        settings.open_registration === 'true' ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* 默认语言 */}
                  <div>
                    <p className="font-medium text-sm mb-1.5">{at('defaultLanguage')}</p>
                    <select
                      value={settings.default_language}
                      onChange={(e) => handleUpdateSetting('default_language', e.target.value)}
                      className={inputCls}
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>

                  {/* LV2 影集上限 */}
                  <div>
                    <p className="font-medium text-sm mb-0.5">{at('lv2RollLimit')}</p>
                    <p className={`text-xs mb-1.5 ${mutedText}`}>{at('lv2RollLimitDesc')}</p>
                    <input
                      type="number"
                      min={1}
                      value={settings.lv2_roll_limit}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, lv2_roll_limit: e.target.value }))}
                      onBlur={(e) => handleUpdateSetting('lv2_roll_limit', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* 创建用户 */}
              <div className={`rounded-2xl border ${cardBg}`}>
                <div className="px-5 py-4 border-b border-inherit">
                  <h2 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <Plus size={16} />
                    {at('createUser')}
                  </h2>
                </div>
                <div className="p-5">
                  {createStatus.message && (
                    <div className={`mb-4 px-3 py-2.5 rounded-lg text-xs ${
                      createStatus.type === 'error'
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                        : createStatus.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                      {createStatus.message}
                    </div>
                  )}
                  <form onSubmit={handleCreateUser} className="space-y-3">
                    <input
                      type="email" required placeholder={at('email')}
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className={inputCls}
                    />
                    <input
                      type="password" required placeholder={at('password')}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className={inputCls}
                    />
                    <input
                      type="text" required placeholder={at('nickname')}
                      value={newUser.nickname}
                      onChange={(e) => setNewUser({ ...newUser, nickname: e.target.value })}
                      className={inputCls}
                    />
                    <select
                      value={newUser.level}
                      onChange={(e) => setNewUser({ ...newUser, level: e.target.value })}
                      className={inputCls}
                    >
                      <option value="lv1">LV1 — {at('lv1Desc')}</option>
                      <option value="lv2">LV2 — {at('lv2Desc')}</option>
                      <option value="lv3">LV3 — {at('lv3Desc')}</option>
                    </select>
                    <button
                      type="submit"
                      disabled={createStatus.type === 'loading'}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60"
                    >
                      {createStatus.type === 'loading' ? at('creating') : at('create')}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* ── 右侧：用户列表 ── */}
            <div className={`lg:col-span-2 rounded-2xl border ${cardBg}`}>
              <div className="px-5 py-4 border-b border-inherit flex items-center justify-between">
                <h2 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} />
                  {at('userManagement')}
                </h2>
                <span className={`text-xs ${mutedText}`}>{users.length} {at('totalUsers').toLowerCase()}</span>
              </div>
              <div className="overflow-x-auto">
                <table className={`min-w-full divide-y ${dividerCls}`}>
                  <thead>
                    <tr>
                      {[at('id'), at('user'), at('level'), at('joined')].map(h => (
                        <th key={h} className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedText}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${dividerCls}`}>
                    {users.map((user) => (
                      <tr key={user.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/3' : 'hover:bg-gray-50'}`}>
                        <td className={`px-5 py-3.5 text-xs font-mono ${mutedText}`}>#{String(user.id).padStart(4, '0')}</td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium">{user.nickname}</p>
                          <p className={`text-xs ${mutedText}`}>{user.email}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <select
                            value={user.level}
                            onChange={(e) => handleUpdateUserLevel(String(user.id), e.target.value)}
                            className={`text-xs font-bold rounded-md px-2 py-1 border outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                              isDarkMode ? 'bg-[#242424] border-white/10' : 'bg-white border-gray-200'
                            } ${
                              user.level === 'lv3' ? 'text-purple-500' :
                              user.level === 'lv2' ? 'text-blue-500' : mutedText
                            }`}
                          >
                            <option value="lv1">LV1</option>
                            <option value="lv2">LV2</option>
                            <option value="lv3">LV3</option>
                          </select>
                        </td>
                        <td className={`px-5 py-3.5 text-xs ${mutedText}`}>
                          {new Date(user.created_at).toLocaleDateString(adminLang === 'zh-CN' ? 'zh-CN' : 'en-US')}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className={`px-5 py-10 text-center text-sm ${mutedText}`}>
                          {isLoading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : '—'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
