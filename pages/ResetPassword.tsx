/**
 * 密码重置页面
 * 支持通过邮箱验证码重置密码
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Notification from '../components/Notification.tsx';

export default function ResetPassword() {
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
      setNotificationMessage('请输入有效的邮箱地址');
      setNotificationType('error');
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'reset-password' })
      });
      const result = await response.json();
      if (result.success) {
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
        if (result.error === '该邮箱未注册') {
          setShowNotification(true);
          setNotificationMessage(
            <div>
              <p>该邮箱未注册</p>
              <button 
                onClick={() => {
                  setShowNotification(false);
                  navigate('/login', { state: { isRegister: true } });
                }}
                className="mt-2 text-primary hover:underline text-sm"
              >
                去注册
              </button>
            </div>
          );
          setNotificationType('warning');
        } else {
          setShowNotification(true);
          setNotificationMessage(result.error || '发送验证码失败');
          setNotificationType('error');
        }
      }
    } catch (err) {
      setShowNotification(true);
      setNotificationMessage('发送验证码失败');
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
        setNotificationMessage('请输入有效的邮箱地址');
        setNotificationType('error');
        setIsSubmitting(false);
        return;
      }

      if (!code) {
        setShowNotification(true);
        setNotificationMessage('请输入验证码');
        setNotificationType('error');
        setIsSubmitting(false);
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        setShowNotification(true);
        setNotificationMessage('新密码长度至少 6 位');
        setNotificationType('error');
        setIsSubmitting(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setShowNotification(true);
        setNotificationMessage('两次输入的密码不一致');
        setNotificationType('error');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      });

      const result = await response.json();
      if (result.success) {
        setShowNotification(true);
        setNotificationMessage('密码重置成功，请重新登录');
        setNotificationType('success');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setShowNotification(true);
        setNotificationMessage(result.error || '密码重置失败');
        setNotificationType('error');
      }
    } catch (err) {
      setShowNotification(true);
      setNotificationMessage('网络错误');
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
            重置密码
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
              新密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 6 位密码"
                minLength={6}
                className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full flex items-center px-4 text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
              确认新密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                minLength={6}
                className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full flex items-center px-4 text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
              邮箱验证码
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
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary py-3 text-sm font-bold hover:bg-primary-dim transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '处理中...' : '重置密码'}
          </button>

          <div className="text-center mt-4">
            <Link to="/login" className="text-sm text-primary hover:underline">
              返回登录
            </Link>
          </div>
        </form>

        {/* 底部装饰 */}
        <div className="mt-12 pt-8 border-t border-outline-variant/10 text-center">
          <p className="text-[10px] font-label text-on-surface-variant uppercase tracking-[0.3em]">
            Film Album · 记录不曾褪色的时光
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
