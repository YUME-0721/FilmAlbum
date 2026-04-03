/**
 * 通用通知组件
 * 用于显示成功、错误、警告等通知
 */
import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

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

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
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
        {renderIcon()}
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
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
