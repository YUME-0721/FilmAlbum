import { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, UserMinus, Search, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { get, post as apiPost, del } from '../src/api/client';
import { useAuth } from '../src/context/AuthContext';

interface FollowUser {
  id: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  isFollowing?: boolean;
}

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  userName: string;
}

export default function FollowListModal({ isOpen, onClose, userId, type, userName }: FollowListModalProps) {
  const navigate = useNavigate();
  const { user: currentUser, isLoggedIn } = useAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchUsers = useCallback(async (pageNum: number, isNewSearch = false) => {
    setIsLoading(true);
    try {
      const res = await get<FollowUser[]>(`/users/${userId}/${type}?page=${pageNum}&pageSize=20`);
      
      if (res.success && res.data) {
        const newUsers = res.data;
        const totalPages = res.pagination?.totalPages || 1;
        
        if (isNewSearch || pageNum === 1) {
          setUsers(newUsers);
        } else {
          setUsers(prev => [...prev, ...newUsers]);
        }
        setHasMore(pageNum < totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch follow list:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchUsers(1, true);
    }
  }, [isOpen, fetchUsers]);

  const handleUserClick = (targetId: string) => {
    onClose();
    navigate(`/profile/${targetId}`);
  };

  const filteredUsers = users.filter(u => 
    u.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.includes(searchQuery)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      {/* Modal Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-surface-container-low border border-outline-variant/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-[600px] max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4 bg-surface-container-low/80 backdrop-blur-xl sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold tracking-widest uppercase font-headline">
              {type === 'followers' ? '粉丝列表' : '关注列表'}
            </h2>
            <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold mt-0.5">
              {userName} 的{type === 'followers' ? '粉丝' : '关注'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-bright transition-all text-on-surface-variant hover:text-on-surface"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-outline-variant/5">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/30 group-focus-within:text-primary transition-colors" size={14} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户昵称或ID..."
              className="w-full bg-surface-container border border-outline-variant/10 rounded-xl pl-9 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-primary/40 transition-all font-medium"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          {isLoading && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-20">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-[10px] uppercase tracking-widest font-bold">同步数据中...</span>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-1">
              {filteredUsers.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleUserClick(item.id)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-highest/50 cursor-pointer transition-all group border border-transparent hover:border-outline-variant/10"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container shrink-0 border border-outline-variant/10 shadow-inner">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={item.nickname} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">
                        <User size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors truncate">{item.nickname}</h4>
                    <p className="text-[10px] text-on-surface-variant/50 font-medium truncate uppercase tracking-tighter">ID: {item.id}</p>
                    {item.bio && (
                      <p className="text-xs text-on-surface-variant/70 truncate mt-0.5 font-label">{item.bio}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {hasMore && !isLoading && (
                <button 
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchUsers(nextPage);
                  }}
                  className="w-full py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40 hover:text-primary transition-colors"
                >
                  加载更多
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-20 py-20">
              <User size={48} />
              <p className="text-[10px] uppercase tracking-widest font-bold">没有找到匹配的用户</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
