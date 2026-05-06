import { useState, useEffect } from 'react';
import { useSettings } from '../src/context/SettingsContext';
import { useTranslation } from '../src/hooks/useTranslation';
import { get, post, put } from '../src/api/client';
import { ShieldAlert, Users, Film, Check, X, RefreshCw, Plus, UserCircle, Star } from 'lucide-react';

export default function Admin() {
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();
  
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [stats, setStats] = useState({ users: 0, rolls: 0 });
  const [settings, setSystemSettings] = useState({ open_registration: 'true', default_language: 'zh-CN', lv2_roll_limit: '10' });
  
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', nickname: '', level: 'lv1' });
  const [createUserStatus, setCreateUserStatus] = useState({ type: '', message: '' });

  // 验证 Token 或获取数据
  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      const res = await post<{ token: string }>('/admin/login', { password });
      if (res.success && res.data) {
        setToken(res.data.token);
        localStorage.setItem('adminToken', res.data.token);
      } else {
        setLoginError(res.error || '登录失败');
      }
    } catch (err: any) {
      setLoginError(err.message || '登录异常');
    } finally {
      setIsLoading(false);
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
      
      const statsRes = await get<{ users: number; rolls: number }>('/admin/stats', undefined, { headers } as any);
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      
      const settingsRes = await get<Record<string, string>>('/admin/settings', undefined, { headers } as any);
      if (settingsRes.success && settingsRes.data) {
        setSystemSettings(settingsRes.data as any);
      }

      const usersRes = await get<{ users: any[] }>('/admin/users', undefined, { headers } as any);
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data.users);
      }
      
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('403')) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const res = await put('/admin/settings', { key, value }, { headers: { Authorization: `Bearer ${token}` } } as any);
      if (res.success) {
        setSystemSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (error) {
      console.error('更新设置失败', error);
      alert('更新设置失败');
    }
  };

  const handleUpdateUserLevel = async (userId: string, level: string) => {
    try {
      const res = await put(`/admin/users/${userId}/level`, { level }, { headers: { Authorization: `Bearer ${token}` } } as any);
      if (res.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, level } : u));
      }
    } catch (error) {
      console.error('更新用户等级失败', error);
      alert('更新用户等级失败');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserStatus({ type: 'loading', message: t('common.sending') });
    try {
      const res = await post('/admin/users', newUser, { headers: { Authorization: `Bearer ${token}` } } as any);
      if (res.success) {
        setCreateUserStatus({ type: 'success', message: '创建成功' });
        setNewUser({ email: '', password: '', nickname: '', level: 'lv1' });
        fetchDashboardData();
      } else {
        setCreateUserStatus({ type: 'error', message: res.error || '创建失败' });
      }
    } catch (err: any) {
      setCreateUserStatus({ type: 'error', message: err.message || '网络异常' });
    }
  };

  if (!token) {
    return (
      <div className={`min-h-screen pt-24 pb-12 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300 ${isDarkMode ? 'bg-[#121212] text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center text-red-500">
            <ShieldAlert size={48} />
          </div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Super Admin
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className={`py-8 px-4 shadow sm:rounded-lg sm:px-10 border ${isDarkMode ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'}`}>
            <form className="space-y-6" onSubmit={handleLogin}>
              {loginError && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4">
                  <p className="text-sm text-red-700 dark:text-red-400">{loginError}</p>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Admin Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-[#2a2a2a] border-gray-700 text-white focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                    isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  } ${isDarkMode ? 'focus:ring-offset-[#1e1e1e]' : ''}`}
                >
                  {isLoading ? <RefreshCw className="animate-spin h-5 w-5" /> : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-24 pb-12 transition-colors duration-300 ${isDarkMode ? 'bg-[#121212] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="text-blue-500" />
            Dashboard
          </h1>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Users size={32} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <h3 className="text-3xl font-bold">{stats.users}</h3>
              </div>
            </div>
          </div>
          
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <Film size={32} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Rolls</p>
                <h3 className="text-3xl font-bold">{stats.rolls}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：设置和发号 */}
          <div className="space-y-8">
            {/* 全局设置 */}
            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'}`}>
              <h2 className="text-xl font-bold mb-6">System Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Open Registration</h4>
                    <p className="text-sm text-gray-500">Allow users to register</p>
                  </div>
                  <button
                    onClick={() => handleUpdateSetting('open_registration', settings.open_registration === 'true' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.open_registration === 'true' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.open_registration === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Default Language</h4>
                  <select
                    value={settings.default_language}
                    onChange={(e) => handleUpdateSetting('default_language', e.target.value)}
                    className={`block w-full rounded-md border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="zh-CN">简体中文 (zh-CN)</option>
                    <option value="en-US">English (en-US)</option>
                  </select>
                </div>

                <div>
                  <h4 className="font-medium mb-2">LV2 Roll Limit</h4>
                  <p className="text-sm text-gray-500 mb-2">Maximum number of rolls an LV2 user can create</p>
                  <input
                    type="number"
                    value={settings.lv2_roll_limit}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, lv2_roll_limit: e.target.value }))}
                    onBlur={(e) => handleUpdateSetting('lv2_roll_limit', e.target.value)}
                    className={`block w-full rounded-md border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 手动创建用户 */}
            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'}`}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus size={20} /> Create User
              </h2>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                {createUserStatus.message && (
                  <div className={`p-3 rounded-md text-sm ${
                    createUserStatus.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                    createUserStatus.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {createUserStatus.message}
                  </div>
                )}
                
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-[#2a2a2a] border-gray-700' : 'border-gray-300'}`}
                />
                
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-[#2a2a2a] border-gray-700' : 'border-gray-300'}`}
                />
                
                <input
                  type="text"
                  placeholder="Nickname"
                  required
                  value={newUser.nickname}
                  onChange={(e) => setNewUser({...newUser, nickname: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-[#2a2a2a] border-gray-700' : 'border-gray-300'}`}
                />

                <select
                  value={newUser.level}
                  onChange={(e) => setNewUser({...newUser, level: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-[#2a2a2a] border-gray-700' : 'border-gray-300'}`}
                >
                  <option value="lv1">LV1 (Read-only)</option>
                  <option value="lv2">LV2 (Standard)</option>
                  <option value="lv3">LV3 (Unlimited)</option>
                </select>

                <button
                  type="submit"
                  disabled={createUserStatus.type === 'loading'}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Create
                </button>
              </form>
            </div>
          </div>

          {/* 右侧：用户列表 */}
          <div className={`lg:col-span-2 p-6 rounded-xl border ${isDarkMode ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users size={20} /> User Management
              </h2>
              <button onClick={fetchDashboardData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <RefreshCw size={18} />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        #{user.id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium">{user.nickname}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={user.level}
                          onChange={(e) => handleUpdateUserLevel(String(user.id), e.target.value)}
                          className={`text-sm rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${
                            isDarkMode ? 'bg-[#2a2a2a]' : 'bg-white'
                          } ${
                            user.level === 'lv3' ? 'text-purple-500 font-bold' : 
                            user.level === 'lv2' ? 'text-blue-500 font-bold' : 'text-gray-500'
                          }`}
                        >
                          <option value="lv1">LV1</option>
                          <option value="lv2">LV2</option>
                          <option value="lv3">LV3</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
