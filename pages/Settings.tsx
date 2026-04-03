/**
 * 设置页面
 * 包含界面设置和账号设置
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.tsx';
import { useSettings } from '../src/context/SettingsContext.tsx';
import Notification from '../components/Notification.tsx';
import { sendCode } from '../src/api/auth.ts';
import { post } from '../src/api/client.ts';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('interface');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { themeMode, language, setThemeMode, setLanguage, isDarkMode } = useSettings();

  // 发送验证码
  const handleSendCode = async () => {
    if (!user?.email) {
      setShowNotification(true);
      setNotificationMessage('用户信息获取失败');
      setNotificationType('error');
      return;
    }

    setIsSendingCode(true);
    try {
      const result = await sendCode(user.email);
      if (result.success) {
        setError('');
        setShowNotification(true);
        setNotificationMessage('验证码发送成功');
        setNotificationType('success');
        // 开始倒计时
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setShowNotification(true);
        setNotificationMessage(result.error || '发送验证码失败');
        setNotificationType('error');
      }
    } catch (err: any) {
      setShowNotification(true);
      setNotificationMessage(err.message || '发送验证码失败');
      setNotificationType('error');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user?.email) {
      setShowNotification(true);
      setNotificationMessage('用户信息获取失败');
      setNotificationType('error');
      return;
    }
    if (!code) {
      setShowNotification(true);
      setNotificationMessage('请输入验证码');
      setNotificationType('error');
      return;
    }
    if (!newPassword) {
      setShowNotification(true);
      setNotificationMessage('请输入新密码');
      setNotificationType('error');
      return;
    }
    if (newPassword.length < 6) {
      setShowNotification(true);
      setNotificationMessage('密码长度至少 6 位');
      setNotificationType('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setShowNotification(true);
      setNotificationMessage('两次输入的密码不一致');
      setNotificationType('error');
      return;
    }

    try {
      const result = await post('/auth/change-password', {
        email: user.email,
        code,
        newPassword
      });
      if (result.success) {
        setShowNotification(true);
        setNotificationMessage('密码修改成功，请重新登录');
        setNotificationType('success');
        // 清除表单
        setCode('');
        setNewPassword('');
        setConfirmPassword('');
        // 清除前端登录状态
        await logout();
        // 跳转到登录页面
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setShowNotification(true);
        setNotificationMessage(result.error || '密码修改失败');
        setNotificationType('error');
      }
    } catch (err: any) {
      setShowNotification(true);
      setNotificationMessage(err.message || '密码修改失败');
      setNotificationType('error');
    }
  };

  // 退出登录
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // 注销账号
  const handleDeleteAccount = async () => {
    if (window.confirm('确定要注销账号吗？此操作不可恢复。')) {
      try {
        const result = await post('/auth/delete-account');
        if (result.success) {
          setShowNotification(true);
          setNotificationMessage('账号注销成功');
          setNotificationType('success');
          await logout();
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          setShowNotification(true);
          setNotificationMessage(result.error || '账号注销失败');
          setNotificationType('error');
        }
      } catch (err: any) {
        setShowNotification(true);
        setNotificationMessage(err.message || '账号注销失败');
        setNotificationType('error');
      }
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">设置</h1>

        {/* 标签切换 */}
        <div className="flex mb-8 border-b border-outline-variant/15">
          <button
            onClick={() => setActiveTab('interface')}
            className={`flex-1 pb-3 text-sm font-bold tracking-widest uppercase transition-colors ${activeTab === 'interface' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            界面设置
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 pb-3 text-sm font-bold tracking-widest uppercase transition-colors ${activeTab === 'account' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            账号设置
          </button>
        </div>



        {/* 界面设置 */}
        {activeTab === 'interface' && (
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                界面语言
              </label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'zh-CN' | 'en-US')}
                className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body outline-none transition-colors"
                aria-label="界面语言"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                主题模式
              </label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setThemeMode('light')}
                  className={`flex-1 py-3 text-sm font-body transition-colors ${
                    themeMode === 'light' 
                      ? 'bg-surface-container-low border border-primary' 
                      : 'bg-surface-container-low border border-outline-variant hover:bg-surface-container'
                  }`}
                >
                  浅色
                </button>
                <button 
                  onClick={() => setThemeMode('dark')}
                  className={`flex-1 py-3 text-sm font-body transition-colors ${
                    themeMode === 'dark' 
                      ? 'bg-surface-container-low border border-primary' 
                      : 'bg-surface-container-low border border-outline-variant hover:bg-surface-container'
                  }`}
                >
                  深色
                </button>
                <button 
                  onClick={() => setThemeMode('system')}
                  className={`flex-1 py-3 text-sm font-body transition-colors ${
                    themeMode === 'system' 
                      ? 'bg-surface-container-low border border-primary' 
                      : 'bg-surface-container-low border border-outline-variant hover:bg-surface-container'
                  }`}
                >
                  跟随系统
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 账号设置 */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            {/* 修改密码 */}
            <div>
              <h2 className="text-lg font-semibold mb-4">修改密码</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                    新密码
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位密码"
                    minLength={6}
                    className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                    确认密码
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    minLength={6}
                    className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                    验证码
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="输入验证码"
                      className="flex-1 bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode || countdown > 0}
                      className="bg-surface-container-low border border-outline-variant px-4 py-3 text-sm font-body hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '发送验证码'}
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-primary text-on-primary py-3 text-sm font-bold hover:bg-primary-dim transition-colors uppercase tracking-widest"
                >
                  修改密码
                </button>
              </form>
            </div>
            
            {/* 退出登录 */}
            <div>
              <button
                onClick={handleLogout}
                className="w-full bg-surface-container-low border border-outline-variant py-3 text-sm font-body hover:bg-surface-container transition-colors"
              >
                退出登录
              </button>
            </div>
            
            {/* 注销账号 */}
            <div>
              <button
                onClick={handleDeleteAccount}
                className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-3 text-sm font-body hover:bg-red-500/20 transition-colors"
              >
                注销账号
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 通知组件 */}
      <Notification
        message={notificationMessage}
        type={notificationType}
        duration={3000}
        show={showNotification}
        onClose={() => setShowNotification(false)}
      />
    </main>
  );
}
