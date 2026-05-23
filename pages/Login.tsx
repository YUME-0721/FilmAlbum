/**
 * 登录/注册页面
 * 支持邮箱密码登录和注册，登录成功后跳转首页
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.tsx';
import Notification from '../components/Notification.tsx';
import { sendCode } from '../src/api/auth.ts';
import { Eye, EyeOff, Settings } from 'lucide-react';
import { useTranslation } from '../src/hooks/useTranslation';
import { useSettings } from '../src/context/SettingsContext';

export default function Login() {
  const { t } = useTranslation();
  const { openRegistration } = useSettings();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(location.state?.isRegister || false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const navigate = useNavigate();
  const { login, register, isLoggedIn, isLoading } = useAuth();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [apiServerUrl, setApiServerUrl] = useState(localStorage.getItem('api_server_url') || '');
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  // 测试连接
  const handleTestConnection = async (urlToTest: string) => {
    let targetUrl = urlToTest.trim();
    if (!targetUrl) {
      targetUrl = window.location.origin;
    }

    if (targetUrl && !/^https?:\/\//.test(targetUrl)) {
      setShowNotification(true);
      setNotificationMessage(t('settings.invalidUrl'));
      setNotificationType('error');
      return;
    }

    setIsTestingUrl(true);
    try {
      const cleanUrl = targetUrl.replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/api/health`, { method: 'GET' });
      if (!response.ok) {
        throw new Error('Connection error');
      }
      const data = await response.json();
      if (data && data.status === 'ok') {
        setShowNotification(true);
        setNotificationMessage(t('settings.connectSuccess'));
        setNotificationType('success');
      } else {
        throw new Error('Health check not OK');
      }
    } catch {
      setShowNotification(true);
      setNotificationMessage(t('settings.connectFailed'));
      setNotificationType('error');
    } finally {
      setIsTestingUrl(false);
    }
  };

  // 恢复默认 API 服务器
  const handleResetUrl = () => {
    localStorage.removeItem('api_server_url');
    setApiServerUrl('');
    setShowNotification(true);
    setNotificationMessage(t('common.success'));
    setNotificationType('success');
  };

  // 保存 API 服务器地址
  const handleSaveUrl = () => {
    const trimmed = apiServerUrl.trim();
    if (trimmed && !/^https?:\/\//.test(trimmed)) {
      setShowNotification(true);
      setNotificationMessage(t('settings.invalidUrl'));
      setNotificationType('error');
      return;
    }

    if (trimmed) {
      localStorage.setItem('api_server_url', trimmed);
    } else {
      localStorage.removeItem('api_server_url');
    }
    setShowNotification(true);
    setNotificationMessage(t('common.success'));
    setNotificationType('success');
  };

  // 检查登录状态，已登录则重定向
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      navigate('/space', { replace: true });
    }
  }, [isLoggedIn, isLoading, navigate]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setShowNotification(true);
      setNotificationMessage(t('common.error'));
      setNotificationType('error');
      return;
    }

    if (!password) {
      setShowNotification(true);
      setNotificationMessage(t('login.inputPassword'));
      setNotificationType('error');
      return;
    }

    if (password.length < 6) {
      setShowNotification(true);
      setNotificationMessage(t('login.passwordTooShort'));
      setNotificationType('error');
      return;
    }

    if (password !== confirmPassword) {
      setShowNotification(true);
      setNotificationMessage(t('login.passwordsNotMatch'));
      setNotificationType('error');
      return;
    }

    setIsSendingCode(true);
    try {
      const result = await sendCode(email, 'register');
      if (result.success) {
        setError('');
        setShowNotification(true);
        setNotificationMessage(t('common.success'));
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
        setNotificationMessage(result.error || t('common.error'));
        setNotificationType('error');
      }
    } catch (err: any) {
      setShowNotification(true);
      setNotificationMessage(err.message || t('common.error'));
      setNotificationType('error');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (!nickname.trim()) {
          setShowNotification(true);
          setNotificationMessage(t('common.error'));
          setNotificationType('error');
          setIsSubmitting(false);
          return;
        }
        if (!code) {
          setShowNotification(true);
          setNotificationMessage(t('login.verifyCodeEmpty'));
          setNotificationType('error');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setShowNotification(true);
          setNotificationMessage(t('login.passwordsNotMatch'));
          setNotificationType('error');
          setIsSubmitting(false);
          return;
        }
        await register(email, password, nickname, code);
        // 清除表单字段
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setNickname('');
        setCode('');
        // 切换到登录页
        setIsRegister(false);
        // 设置成功提示
        setShowNotification(true);
        setNotificationMessage(t('common.success'));
        setNotificationType('success');
        setIsSubmitting(false);
        return;
      }
      
      await login(email, password);
      setShowNotification(true);
      setNotificationMessage(t('common.success'));
      setNotificationType('success');
      setTimeout(() => {
        navigate('/space');
      }, 1500);
    } catch (err) {
      setShowNotification(true);
      setNotificationMessage(err instanceof Error ? err.message : t('common.error'));
      setNotificationType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-8 py-16">
      <div className="w-full max-w-md relative">
        {/* 右上角服务器设置齿轮按钮 */}
        <button
          type="button"
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`absolute right-0 top-0 p-2 rounded-full text-on-surface-variant hover:text-primary transition-all duration-300 hover:bg-surface-container ${isConfigOpen ? 'rotate-90 text-primary' : ''}`}
          title={t('settings.title')}
          aria-label={t('settings.title')}
        >
          <Settings size={20} />
        </button>

        {/* Logo 区域 */}
        <div className="text-center mb-12">
          <Link to="/" className="text-4xl font-bold text-primary tracking-tight font-headline italic">
            Film Album
          </Link>
          <p className="text-on-surface-variant mt-3 text-sm font-body">
            {isRegister ? t('login.createAccount') : t('login.welcome')}
          </p>
        </div>

        {/* 动态 API 服务器配置区域 */}
        {isConfigOpen && (
          <div className="mb-8 p-4 bg-surface-container-low border border-outline-variant/30 rounded-lg space-y-4 transition-all duration-300">
            <div>
              <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                {t('settings.apiServerUrl')}
              </label>
              <input
                type="text"
                value={apiServerUrl}
                onChange={(e) => setApiServerUrl(e.target.value)}
                placeholder={t('settings.apiServerUrlPlaceholder')}
                className="w-full bg-surface-container border-b border-outline-variant focus:border-primary text-on-surface py-2 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSaveUrl}
                className="flex-1 bg-primary text-on-primary py-2 font-bold uppercase tracking-wider hover:bg-primary-dim transition-colors"
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection(apiServerUrl)}
                disabled={isTestingUrl}
                className="flex-1 bg-surface-container border border-outline-variant hover:bg-surface-container-high py-2 text-on-surface transition-colors disabled:opacity-50"
              >
                {isTestingUrl ? t('common.loading') : t('settings.testConnection')}
              </button>
              <button
                type="button"
                onClick={handleResetUrl}
                className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 py-2 transition-colors"
              >
                {t('settings.resetDefault')}
              </button>
            </div>
          </div>
        )}

        {/* 登录/注册切换 */}
        {openRegistration ? (
          <div className="flex mb-8 border-b border-outline-variant/15">
            <button
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold tracking-widest uppercase transition-colors ${!isRegister ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {t('login.login')}
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold tracking-widest uppercase transition-colors ${isRegister ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {t('login.register')}
            </button>
          </div>
        ) : (
          <div className="flex mb-8 border-b border-outline-variant/15">
            <div className="flex-1 pb-3 text-center text-sm font-bold tracking-widest uppercase border-b-2 border-primary text-primary">
              {t('login.login')}
            </div>
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
              {t('login.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                minLength={6}
                className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full flex items-center px-4 text-on-surface-variant hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {!isRegister && (
            <div className="text-right mt-2">
              <Link to="/reset-password" className="text-sm text-primary hover:underline">
                {t('login.forgotPassword')}
              </Link>
            </div>
          )}

          {isRegister && (
            <>
              <div>
                <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                  {t('login.confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('login.confirmPassword')}
                    minLength={6}
                    className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full flex items-center px-4 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                  {t('login.nickname')}
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('login.nickname')}
                  className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                  {t('login.verifyCode')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t('login.verifyCode')}
                    className="flex-1 bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSendingCode || countdown > 0}
                    className="bg-surface-container-low border border-outline-variant px-4 py-3 text-sm font-body hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingCode ? t('common.sending') : countdown > 0 ? `${countdown}s` : t('login.sendCode')}
                  </button>
                </div>
              </div>
            </>
          )}



          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary py-3 text-sm font-bold hover:bg-primary-dim transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('login.submitting') : isRegister ? t('login.register') : t('login.login')}
          </button>
        </form>

        {/* 底部装饰 */}
        <div className="mt-12 pt-8 border-t border-outline-variant/10 text-center">
          <p className="text-[10px] font-label text-on-surface-variant uppercase tracking-[0.3em]">
            {t('login.slogan')}
          </p>
        </div>
        
        {/* 通知组件 */}
        <Notification
          message={notificationMessage}
          type={notificationType}
          duration={2000}
          show={showNotification}
          onClose={() => setShowNotification(false)}
        />
      </div>
    </main>
  );
}
