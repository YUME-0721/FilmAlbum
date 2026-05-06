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
          className="fixed inset-0 z-[100] bg-surface-container-low/95 backdrop-blur-2xl flex flex-col"
        >
          {/* Top Bar */}
          <div className="w-full h-20 border-b border-outline-variant/10 flex items-center px-8 md:px-12 gap-6 bg-surface-container-low/50 sticky top-0 z-10">
            <Search className="text-primary" size={24} strokeWidth={2.5} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="flex-1 bg-transparent border-none text-2xl font-headline font-bold text-on-surface placeholder:text-on-surface-variant/20 outline-none"
            />
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-bright transition-all text-on-surface-variant group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto mt-4 px-8 md:px-12 pb-20 scrollbar-hide">
            <div className="max-w-6xl mx-auto w-full py-10">
              {!query.trim() ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-20">
                  <Hash size={80} />
                  <p className="text-xl font-headline font-bold tracking-[0.2em] uppercase">{t('search.center')}</p>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-[0.4em]">{t('search.loading')}</p>
                </div>
              ) : results && (results.users.length > 0 || results.posts.length > 0) ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                  {/* Users Section */}
                  <div className="lg:col-span-4 space-y-8">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <User size={18} />
                      <h3 className="text-xs font-bold uppercase tracking-[0.3em]">{t('search.photographers')} ({results.users.length})</h3>
                    </div>
                    {results.users.length > 0 ? (
                      <div className="space-y-4">
                        {results.users.map((user) => (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => handleUserClick(user.id)}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container/30 border border-outline-variant/5 hover:border-primary/30 hover:bg-surface-container transition-all cursor-pointer group"
                          >
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-variant border border-outline-variant/20">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.nickname} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                                  <User size={24} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors truncate">{user.nickname}</h4>
                              <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest mt-1 font-bold">UID: {user.id}</p>
                              {user.bio && (
                                <p className="text-xs text-on-surface-variant/60 truncate mt-1 line-clamp-1 italic">"{user.bio}"</p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-on-surface-variant/30 font-bold uppercase tracking-widest italic">{t('search.noUser')}</p>
                    )}
                  </div>

                  {/* Posts Section */}
                  <div className="lg:col-span-8 space-y-8">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <ImageIcon size={18} />
                      <h3 className="text-xs font-bold uppercase tracking-[0.3em]">{t('search.records')} ({results.posts.length})</h3>
                    </div>
                    {results.posts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {results.posts.map((post) => (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => handlePostClick(post.id)}
                            className="group rounded-3xl overflow-hidden bg-surface-container/20 border border-outline-variant/5 hover:border-primary/20 transition-all cursor-pointer flex flex-col"
                          >
                            <div className="aspect-[16/10] overflow-hidden bg-black relative">
                              {post.coverImage ? (
                                <img src={post.coverImage} alt={post.title} className="w-full h-full object-contain grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/10">
                                  <ImageIcon size={48} />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="p-6 space-y-4">
                              <h4 className="text-lg font-headline font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{post.title}</h4>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full overflow-hidden bg-surface-variant border border-white/10">
                                    <img src={post.author.avatarUrl || '/default-avatar.png'} alt={post.author.nickname} className="w-full h-full object-cover" />
                                  </div>
                                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{post.author.nickname}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-on-surface-variant/40">
                                  <Calendar size={10} />
                                  <span className="text-[10px] uppercase font-label">{new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2">
                                {post.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 bg-surface-container text-on-surface-variant/60 rounded-full border border-outline-variant/10">#{tag}</span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-on-surface-variant/30 font-bold uppercase tracking-widest italic">{t('search.noPost')}</p>
                    )}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
