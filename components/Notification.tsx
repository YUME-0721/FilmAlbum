/**
 * 通用通知组件
 * 用于显示成功、错误、警告等通知
 */
import { useState, useEffect } from 'react';

interface NotificationProps {
  message: string | React.ReactNode;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  show: boolean;
}

export default function Notification({ 
  message, 
  type = 'info', 
  duration = 2000, 
  onClose,
  show 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          onClose();
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  };

  return (
    <div className="fixed top-16 right-4 z-50">
      <div className={`${getBackgroundColor()} border rounded-md px-6 py-4 flex items-center gap-3 max-w-md w-full shadow-lg`}>
        <span className="material-symbols-outlined">{getIcon()}</span>
        <span className="text-sm font-body">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            if (onClose) {
              onClose();
            }
          }}
          className="ml-auto text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
}
