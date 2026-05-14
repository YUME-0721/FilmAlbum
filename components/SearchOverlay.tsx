import { useState, useEffect, useRef } from 'react';
import { Search, X, User, MessageCircle, Heart, Calendar, Hash, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { get } from '../src/api/client';
import { useTranslation } from '../src/hooks/useTranslation';

interface SearchResult {
  users: Array<{
    id: string;
    nickname: string;
    avatarUrl: string;
    bio: string;
  }>;
  posts: Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
    author: {
      nickname: string;
      avatarUrl: string;
    };
    coverImage: string;
    createdAt: string;
  }>;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await get<SearchResult>('/search', { q: query.trim() });
        if (res.success && res.data) {
          setResults(res.data);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleUserClick = (userId: string) => {
    onClose();
    navigate(`/space/${userId}`);
  };

  const handlePostClick = (postId: string) => {
    onClose();
    navigate(`/post/${postId}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-3xl flex flex-col items-center justify-start"
        >
          {/* Main Container for Desktop / Fullscreen for Mobile */}
          <div className="w-full h-full max-w-7xl flex flex-col">
            {/* Top Bar - Command Palette Style */}
            <div className="w-full h-16 md:h-24 flex items-center px-6 md:px-12 gap-4 md:gap-8 sticky top-0 z-10">
              <div className="flex-1 flex items-center gap-4 bg-surface-container-low/40 border border-outline-variant/10 rounded-2xl md:rounded-3xl px-4 md:px-8 py-2 md:py-4 focus-within:border-primary/40 focus-within:bg-surface-container-low/60 transition-all group shadow-2xl">
                <Search className="text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="flex-1 bg-transparent border-none text-lg md:text-3xl font-headline font-bold text-on-surface placeholder:text-on-surface-variant/10 outline-none"
                />
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface-container rounded-lg border border-outline-variant/5">
                  <span className="text-[10px] font-bold text-on-surface-variant/40 tracking-widest">ESC</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-red-500/10 hover:text-red-400 transition-all text-on-surface-variant group shrink-0"
              >
                <X size={28} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-24 scrollbar-hide">
              <div className="max-w-6xl mx-auto w-full pt-4 md:pt-10">
                {!query.trim() ? (
                  <div className="flex flex-col items-center justify-center py-24 md:py-40 gap-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                      <Hash size={80} className="relative text-primary/20" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg md:text-xl font-headline font-bold tracking-[0.2em] uppercase text-on-surface/40">{t('search.center')}</p>
                      <p className="text-[10px] md:text-xs text-on-surface-variant/20 uppercase tracking-[0.4em] font-bold">输入关键词开始探索您的胶片记忆</p>
                    </div>
                    
                    {/* Quick Suggestions */}
                    <div className="flex flex-wrap justify-center gap-3 max-w-lg">
                      {['Kodak', 'Portra', 'Fuji', 'Leica', '120mm'].map(tag => (
                        <button 
                          key={tag}
                          onClick={() => setQuery(tag)}
                          className="px-4 py-2 bg-surface-container-low/40 border border-outline-variant/5 rounded-full text-[10px] font-bold text-on-surface-variant/40 hover:text-primary hover:border-primary/20 transition-all uppercase tracking-widest"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="flex flex-col items-center justify-center py-32 md:py-40 gap-6">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
                    </div>
                    <p className="text-[10px] font-bold font-label text-on-surface-variant/40 uppercase tracking-[0.4em] animate-pulse">{t('search.loading')}</p>
                  </div>
                ) : results && (results.users.length > 0 || results.posts.length > 0) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-20">
                    {/* Users Section */}
                    <div className="lg:col-span-4 space-y-8">
                      <div className="flex items-center justify-between border-b border-outline-variant/5 pb-4">
                        <div className="flex items-center gap-3 text-on-surface-variant">
                          <User size={16} />
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">{t('search.photographers')}</h3>
                        </div>
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{results.users.length}</span>
                      </div>
                      
                      <div className="space-y-3">
                        {results.users.map((user, idx) => (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => handleUserClick(user.id)}
                            className="flex items-center gap-4 p-3 rounded-2xl bg-surface-container-low/20 border border-outline-variant/5 hover:border-primary/20 hover:bg-surface-container-low transition-all cursor-pointer group"
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant border border-outline-variant/10 group-hover:border-primary/30 transition-colors">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.nickname} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20"><User size={20} /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors truncate">{user.nickname}</h4>
                              <p className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest mt-0.5">UID: {user.id}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Posts Section */}
                    <div className="lg:col-span-8 space-y-8">
                      <div className="flex items-center justify-between border-b border-outline-variant/5 pb-4">
                        <div className="flex items-center gap-3 text-on-surface-variant">
                          <ImageIcon size={16} />
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">{t('search.records')}</h3>
                        </div>
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{results.posts.length}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {results.posts.map((post, idx) => (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => handlePostClick(post.id)}
                            className="group rounded-[2rem] overflow-hidden bg-surface-container-low/20 border border-outline-variant/5 hover:border-primary/20 transition-all cursor-pointer flex flex-col"
                          >
                            <div className="aspect-[4/3] overflow-hidden bg-black relative">
                              {post.coverImage ? (
                                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/10"><ImageIcon size={40} /></div>
                              )}
                              <div className="absolute top-4 left-4 flex gap-1">
                                {post.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-2 py-1 bg-black/40 backdrop-blur-md text-[8px] font-bold text-white/80 rounded-lg border border-white/5 uppercase tracking-widest">#{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div className="p-5 flex flex-col gap-3">
                              <h4 className="text-base font-headline font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{post.title}</h4>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full overflow-hidden border border-outline-variant/10">
                                    <img src={post.author.avatarUrl || '/default-avatar.png'} alt={post.author.nickname} className="w-full h-full object-cover" />
                                  </div>
                                  <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{post.author.nickname}</span>
                                </div>
                                <span className="text-[9px] text-on-surface-variant/30 font-label">{new Date(post.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : results && results.users.length === 0 && results.posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-20">
                    <X size={80} />
                    <p className="text-xl font-headline font-bold tracking-[0.2em] uppercase">{t('search.noResult')}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
