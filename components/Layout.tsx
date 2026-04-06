/**
 * 全局布局组件
 * 顶部导航栏 + 主内容区域 + 底部 Footer
 * 使用 AuthContext 管理真实登录状态
 */
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.tsx';
import { Search, Mail, User, Settings as SettingsIcon } from 'lucide-react';
import SearchOverlay from './SearchOverlay';
import { useState } from 'react';
import { useTranslation } from '../src/hooks/useTranslation';

export default function Layout() {
  const { t } = useTranslation();
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isFeed = new URLSearchParams(location.search).get('tab') === 'feed';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-surface-container-low fixed top-0 z-50 w-full border-b border-outline-variant/10">
        <nav className="flex justify-between items-center w-full px-8 py-4 h-16 max-w-[1920px] mx-auto">
          {/* Brand Logo */}
          <Link to="/" className="text-2xl font-bold text-primary tracking-tight font-headline italic">
            Film Album
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-12 font-headline text-on-surface">
            <Link 
              to="/" 
              className={`pb-1 transition-all font-bold ${!isFeed ? 'text-primary border-b-2 border-primary' : 'text-on-surface hover:text-primary'}`}
            >
              {t('nav.recommend')}
            </Link>
            <Link 
              to="/?tab=feed" 
              className={`pb-1 transition-all font-bold ${isFeed ? 'text-primary border-b-2 border-primary' : 'text-on-surface hover:text-primary'}`}
              onClick={(e) => {
                if (!isLoggedIn) {
                  e.preventDefault();
                  navigate('/login');
                }
              }}
            >
              {t('nav.feed')}
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="text-on-surface hover:text-primary transition-colors"
              title={t('nav.search')}
            >
              <Search size={20} strokeWidth={2.5} />
            </button>
            {isLoggedIn && (
              <button 
                onClick={() => navigate('/messages')}
                className="text-on-surface hover:text-primary transition-colors"
                title={t('nav.messages')}
              >
                <Mail size={20} strokeWidth={2.5} />
              </button>
            )}
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/space')}
                  className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30 hover:border-primary transition-colors bg-surface-variant flex items-center justify-center"
                >
                  {user?.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.nickname} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={18} strokeWidth={2.5} className="text-on-surface-variant" />
                  )}
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  title={t('nav.settings')}
                >
                  <SettingsIcon size={20} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/login')}
                className="bg-primary text-on-primary px-5 py-1.5 text-sm font-semibold rounded-sm hover:bg-primary-dim active:scale-95 duration-200 transition-all"
              >
                {t('nav.login')}
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-grow pt-16">
        <Outlet />
      </div>

      {/* Footer */}
      <footer className="bg-surface border-t border-outline-variant/5 w-full py-16 px-8 mt-auto">
        <div className="flex flex-col items-center justify-center max-w-[1920px] mx-auto space-y-4 text-center">
          <div className="text-lg font-bold text-on-surface-variant font-headline tracking-[0.1em]">
            {t('login.slogan')}
          </div>
          <div className="font-label text-[10px] text-on-surface-variant/40 tracking-[0.4em] uppercase">
            @YUME 2026
          </div>
        </div>
      </footer>

      {/* Global Search Overlay */}
      <SearchOverlay 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </div>
  );
}
