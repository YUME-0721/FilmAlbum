/**
 * 密码重置页面
 * 支持通过邮箱验证码重置密码
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Notification from '../components/Notification.tsx';
import { sendCode } from '../src/api/auth.ts';
import { post } from '../src/api/client.ts';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../src/hooks/useTranslation';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<React.ReactNode>('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const navigate = useNavigate();

  // 发送验证码
  const handleSendCode = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setShowNotification(true);
      setNotificationMessage(t('login.emailLabel'));
      setNotificationType('error');
      return;
    }

    setIsSendingCode(true);
    try {
      const result = await sendCode(email, 'reset-password');
      if (result.success) {
        setShowNotification(true);
        setNotificationMessage(t('login.sendCodeSuccess'));
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
        if (result.error === '该邮箱未注册') {
          setShowNotification(true);
          setNotificationMessage(
            <div>
              <p>{t('login.emailNotRegistered')}</p>
              <button 
                onClick={() => {
                  setShowNotification(false);
                  navigate('/login', { state: { isRegister: true } });
                }}
                className="mt-2 text-primary hover:underline text-sm"
              >
                {t('login.goToRegister')}
              </button>
            </div>
          );
          setNotificationType('warning');
        } else {
          setShowNotification(true);
          setNotificationMessage(result.error || t('common.error'));
          setNotificationType('error');
        }
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
    setIsSubmitting(true);

    try {
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        setShowNotification(true);
        setNotificationMessage(t('login.emailLabel'));
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

      if (!newPassword || newPassword.length < 6) {
        setShowNotification(true);
        setNotificationMessage(t('login.passwordTooShort'));
        setNotificationType('error');
        setIsSubmitting(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setShowNotification(true);
        setNotificationMessage(t('login.passwordsNotMatch'));
        setNotificationType('error');
        setIsSubmitting(false);
        return;
      }

      const result = await post('/auth/reset-password', {
        email,
        code,
        newPassword
      });
      if (result.success) {
        setShowNotification(true);
        setNotificationMessage(t('login.resetSuccess'));
        setNotificationType('success');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
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
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-8 py-16">
      <div className="w-full max-w-md">
        {/* Logo 区域 */}
        <div className="text-center mb-12">
          <Link to="/" className="text-4xl font-bold text-primary tracking-tight font-headline italic">
            Film Album
          </Link>
          <p className="text-on-surface-variant mt-3 text-sm font-body">
            {t('login.resetPasswordTitle')}
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
              {t('login.emailLabel')}
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
              {t('login.newPasswordLabel')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('login.passwordHint')}
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
              {t('login.confirmNewPasswordLabel')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('login.confirmNewPasswordLabel')}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary py-3 text-sm font-bold hover:bg-primary-dim transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('common.submitting') : t('login.resetPasswordTitle')}
          </button>

          <div className="text-center mt-4">
            <Link to="/login" className="text-sm text-primary hover:underline">
              {t('login.backToLogin')}
            </Link>
          </div>
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
