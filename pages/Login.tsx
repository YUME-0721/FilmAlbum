/**
 * 登录/注册页面
 * 支持邮箱密码登录和注册，登录成功后跳转首页
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.tsx';
import Notification from '../components/Notification.tsx';

export default function Login() {
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
      setNotificationMessage('请输入有效的邮箱地址');
      setNotificationType('error');
      return;
    }

    if (!password) {
      setShowNotification(true);
      setNotificationMessage('请输入密码');
      setNotificationType('error');
      return;
    }

    if (password.length < 6) {
      setShowNotification(true);
      setNotificationMessage('密码长度至少 6 位');
      setNotificationType('error');
      return;
    }

    if (password !== confirmPassword) {
      setShowNotification(true);
      setNotificationMessage('两次输入的密码不一致');
      setNotificationType('error');
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'register' })
      });
      const result = await response.json();
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
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (!nickname.trim()) {
          setShowNotification(true);
          setNotificationMessage('请输入昵称');
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
        if (password !== confirmPassword) {
          setShowNotification(true);
          setNotificationMessage('两次输入的密码不一致');
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
        setNotificationMessage('注册成功，请重新登录');
        setNotificationType('success');
        setIsSubmitting(false);
        return;
      }
      
      await login(email, password);
      setShowNotification(true);
      setNotificationMessage('登录成功');
      setNotificationType('success');
      setTimeout(() => {
        navigate('/space');
      }, 1500);
    } catch (err) {
      setShowNotification(true);
      setNotificationMessage(err instanceof Error ? err.message : '操作失败');
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
            {isRegister ? '创建账号，开始记录你的胶片故事' : '欢迎回来，继续你的胶片旅程'}
          </p>
        </div>

        {/* 登录/注册切换 */}
        <div className="flex mb-8 border-b border-outline-variant/15">
          <button
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 pb-3 text-sm font-bold tracking-widest uppercase transition-colors ${!isRegister ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            登录
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 pb-3 text-sm font-bold tracking-widest uppercase transition-colors ${isRegister ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            注册
          </button>
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
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {!isRegister && (
            <div className="text-right mt-2">
              <Link to="/reset-password" className="text-sm text-primary hover:underline">
                忘记密码？
              </Link>
            </div>
          )}

          {isRegister && (
            <>
              <div>
                <label className="block text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
                  确认密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
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
                  昵称
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="你的显示名称"
                  className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary text-on-surface py-3 px-0 text-sm font-body placeholder:text-outline outline-none transition-colors"
                  required
                />
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
            </>
          )}



          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary py-3 text-sm font-bold hover:bg-primary-dim transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '处理中...' : isRegister ? '创建账号' : '登录'}
          </button>
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
