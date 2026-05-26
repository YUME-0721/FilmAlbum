/**
 * 登录/注册页面
 * 支持邮箱密码登录和注册，登录成功后跳转首页
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.tsx';
import Notification from '../components/Notification.tsx';
import { sendCode } from '../src/api/auth.ts';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
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
        {/* 右上角进入系统管理后台按钮 */}
        <div className="absolute right-0 top-0 group">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="p-2.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container active:scale-95 transition-all duration-300 flex items-center justify-center relative z-10"
            aria-label={t('settings.goToAdmin') || '进入系统管理后台'}
          >
            <ShieldAlert size={20} className="transition-transform group-hover:rotate-[15deg] group-hover:scale-110 duration-300" />
          </button>
          
          {/* 精美的 Tooltip 悬浮框 */}
          <div className="absolute right-0 top-12 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 origin-top-right whitespace-nowrap bg-surface-container-high text-on-surface text-xs py-2 px-3.5 rounded-xl border border-outline-variant/15 shadow-xl flex items-center gap-2 z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-medium tracking-wide">{t('settings.goToAdmin') || '进入系统管理后台'}</span>
          </div>
        </div>

        {/* Logo 区域 */}
        <div className="text-center mb-12">
          <Link to="/" className="text-4xl font-bold text-primary tracking-tight font-headline italic">
            Film Album
          </Link>
          <p className="text-on-surface-variant mt-3 text-sm font-body">
            {isRegister ? t('login.createAccount') : t('login.welcome')}
          </p>
        </div>

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
