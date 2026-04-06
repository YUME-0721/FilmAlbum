/**
 * 消息中心页面
 * 包含联系人列表与聊天窗口
 * 采用双栏布局，适配移动端（单栏）
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { 
  getConversations, 
  getChatHistory, 
  sendMessage, 
  markAsRead, 
  type ChatMessage, 
  type Conversation 
} from '../src/api/messages';
import { 
  getNotifications, 
  getNotificationCounts, 
  markNotificationRead, 
  readAllNotifications, 
  type NotificationItem, 
  type NotificationCounts 
} from '../src/api/notifications';
import { get } from '../src/api/client';
import { UserProfileData } from '../components/UserProfile';
import { Lock, MessageCircle, User, Inbox, ArrowLeft, MoreVertical, Smile, Send, Mail, Heart, Bell, MessageSquare, Settings, Reply } from 'lucide-react';
import { useTranslation } from '../src/hooks/useTranslation';

// 格式化时间
function formatTime(dateString: string, locale: string = 'zh-CN') {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function Messages() {
  const { t, language } = useTranslation();
  const { userId: urlUserId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isLoggedIn } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(urlUserId || null);
  const [activeUser, setActiveUser] = useState<UserProfileData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'messages' | 'replies' | 'likes' | 'system'>('messages');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState<NotificationCounts & { messages: number }>({
    LIKE: 0,
    COMMENT: 0,
    SYSTEM: 0,
    messages: 0
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<number | null>(null);

  // 获取会话列表
  const fetchConversations = async () => {
    const res = await getConversations();
    if (res.success && res.data) {
      setConversations(res.data);
      
      // 更新私信未读总数
      const totalUnread = res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setCounts(prev => ({ ...prev, messages: totalUnread }));

      // 如果 URL 中有 userId，但会话列表中没有，可能需要额外获取该用户信息显示在右侧
      if (activeUserId && !res.data.find(c => c.counterpart.id === activeUserId)) {
        fetchCounterpartInfo(activeUserId);
      }
    }
  };

  // 获取通知列表
  const fetchNotifications = async (type?: string) => {
    const res = await getNotifications(type);
    if (res.success && res.data) {
      setNotifications(res.data);
    }
  };

  // 获取各种未读计数
  const fetchCounts = async () => {
    const res = await getNotificationCounts();
    if (res.success && res.data) {
      setCounts(prev => ({ ...prev, ...res.data }));
    }
  };

  // 获取对方信息（用于新开会话）
  const fetchCounterpartInfo = async (id: string) => {
    try {
      const res = await get<UserProfileData>(`/users/${id}`);
      if (res.success && res.data) {
        setActiveUser(res.data);
      }
    } catch (err) {
      console.error('Fetch counterpart info failed:', err);
    }
  };

  // 获取聊天详情
  const fetchChatHistory = async (id: string, silent = false) => {
    const res = await getChatHistory(id);
    if (res.success && res.data) {
      // 只有在消息数量变化或有未读时才更新，避免闪烁
      if (res.data.length !== messages.length || res.data.some((m, i) => m.id !== messages[i]?.id)) {
        setMessages(res.data);
      }
      
      // 标记为已读
      await markAsRead(id);
    }
  };

  // 发送消息
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeUserId || !inputText.trim() || isSending) return;

    setIsSending(true);
    const text = inputText;
    setInputText(''); // 立即清空输入框
    
    const res = await sendMessage(activeUserId, text);
    if (res.success && res.data) {
      setMessages(prev => [...prev, res.data!]);
      // 刷新会话列表以更新最后一条消息
      fetchConversations();
    } else {
      setInputText(text); // 失败则还原
    }
    setIsSending(false);
  };

  // 监听 URL 变化同步 activeUserId
  useEffect(() => {
    if (urlUserId) {
      setActiveUserId(urlUserId);
    } else {
      setActiveUserId(null);
    }
  }, [urlUserId]);

  // 定时轮询
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const initialFetch = async () => {
      await Promise.all([fetchConversations(), fetchCounts()]);
      setIsLoading(false);
    };
    initialFetch();
    
    pollingRef.current = window.setInterval(() => {
      fetchConversations();
      fetchCounts();
      if (activeCategory === 'messages' && activeUserId) {
        fetchChatHistory(activeUserId, true);
      } else if (activeCategory !== 'messages') {
        const typeMap = { replies: 'COMMENT', likes: 'LIKE', system: 'SYSTEM' };
        fetchNotifications(typeMap[activeCategory as keyof typeof typeMap]);
      }
    }, 4000); // 4秒轮询一次

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isLoggedIn, activeUserId, activeCategory, messages.length]); // 依赖项包含 messages.length 以便在不同会话切换时正确处理

  // 当 activeUserId 变化时，重新加载聊天历史和对方资料
  useEffect(() => {
    if (activeUserId && activeCategory === 'messages') {
      fetchChatHistory(activeUserId);
      const conv = conversations.find(c => c.counterpart.id === activeUserId);
      if (conv) {
        setActiveUser({
          id: conv.counterpart.id,
          nickname: conv.counterpart.nickname,
          avatarUrl: conv.counterpart.avatarUrl,
          bio: '', followersCount: 0, followingCount: 0, likesCount: 0, isFollowing: false, isOwner: false
        });
      } else {
        fetchCounterpartInfo(activeUserId);
      }
    } else if (activeCategory !== 'messages') {
      const typeMap = { replies: 'COMMENT', likes: 'LIKE', system: 'SYSTEM' };
      fetchNotifications(typeMap[activeCategory as keyof typeof typeMap]);
    } else {
      setMessages([]);
      setActiveUser(null);
    }
  }, [activeUserId, activeCategory]);

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isLoggedIn) {
     return (
      <main className="max-w-7xl mx-auto px-8 pt-24 pb-24 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Lock size={64} className="text-on-surface-variant/20 italic" />
        <div className="text-on-surface-variant font-label text-sm tracking-widest uppercase">{t('messages.loginRequired')}</div>
        <button 
          onClick={() => navigate('/login')}
          className="bg-primary text-on-primary px-8 py-2 text-xs font-bold hover:bg-primary-dim transition-colors uppercase tracking-widest"
        >
          {t('login.login')}
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 h-[calc(100vh-64px)] flex gap-4 overflow-hidden">
      {/* 左侧大类导航 - 匹配截图样式 */}
      <div className="w-20 md:w-64 bg-surface-container-low border border-outline-variant/10 rounded-2xl flex flex-col py-8 shadow-sm">
        <div className="px-6 mb-10 hidden md:flex items-center gap-2">
          <MessageCircle className="text-primary" size={24} />
          <h1 className="text-lg font-bold tracking-tight">{t('messages.title')}</h1>
        </div>

        <nav className="flex-1 space-y-2 px-3">
          {[
            { id: 'messages', label: t('messages.sidebar.messages'), icon: MessageSquare, count: counts.messages },
            { id: 'replies', label: t('messages.sidebar.replies'), icon: Reply, count: counts.COMMENT },
            { id: 'likes', label: t('messages.sidebar.likes'), icon: Heart, count: counts.LIKE },
            { id: 'system', label: t('messages.sidebar.system'), icon: Bell, count: counts.SYSTEM },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveCategory(item.id as any);
                if (item.id !== 'messages') navigate('/messages');
              }}
              className={`w-full flex flex-col md:flex-row items-center gap-3 px-4 py-4 rounded-xl transition-all group relative ${
                activeCategory === item.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <item.icon size={22} className={activeCategory === item.id ? 'fill-primary/10' : ''} />
              <span className="text-xs md:text-sm font-bold truncate hidden md:inline">{item.label}</span>
              {item.count > 0 && (
                <span className="absolute top-2 right-2 md:static md:ml-auto min-w-[18px] h-[18px] bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {item.count > 99 ? '99+' : item.count}
                </span>
              )}
              {activeCategory === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full hidden md:block" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-3 pt-6 border-t border-outline-variant/5 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant/60 hover:bg-surface-container-high rounded-xl transition-all">
            <Settings size={20} />
            <span className="text-xs font-bold hidden md:inline">{t('messages.sidebar.settings')}</span>
          </button>
        </div>
      </div>

      {/* 列表区 */}
      <div className={`flex-col bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm flex ${
        activeCategory === 'messages' 
          ? 'w-full md:w-80 lg:w-96' 
          : 'flex-1'
      } ${(activeUserId || activeCategory !== 'messages') && 'hidden md:flex'}`}>
        <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center">
          <h2 className="font-bold text-on-surface">
            {activeCategory === 'messages' ? t('messages.list.recent') : 
             activeCategory === 'replies' ? t('messages.list.allReplies') : 
             activeCategory === 'likes' ? t('messages.list.receivedLikes') : t('messages.list.systemTitle')}
          </h2>
          {activeCategory !== 'messages' && notifications.length > 0 && (
            <button 
              onClick={() => readAllNotifications({ replies: 'COMMENT', likes: 'LIKE', system: 'SYSTEM' }[activeCategory] as string).then(fetchCounts)}
              className="text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
            >
              {t('messages.list.markAllRead')}
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeCategory === 'messages' ? (
            conversations.length > 0 ? (
              <div className="divide-y divide-outline-variant/5">
                {conversations.map((conv) => (
                  <button
                    key={conv.counterpart.id}
                    onClick={() => navigate(`/messages/${conv.counterpart.id}`)}
                    className={`w-full p-4 flex gap-4 hover:bg-surface-container-high transition-all text-left group relative ${activeUserId === conv.counterpart.id ? 'bg-surface-container-high' : ''}`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-outline-variant/20 group-hover:border-primary transition-colors shadow-sm">
                        {conv.counterpart.avatarUrl ? (
                          <img src={conv.counterpart.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40 bg-surface-container-low">
                            <User size={24} />
                          </div>
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-surface-container-low shadow-sm">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className="font-bold text-sm text-on-surface truncate pr-2">{conv.counterpart.nickname}</h3>
                        <span className="text-[10px] text-on-surface-variant/60 font-label">{formatTime(conv.createdAt, language)}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant truncate opacity-60">
                        {conv.content}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 h-64 text-center opacity-30 select-none">
                <Inbox size={48} className="mb-2" />
                <p className="text-xs font-label uppercase tracking-widest">{t('messages.list.emptyConv')}</p>
              </div>
            )
          ) : (
            notifications.length > 0 ? (
              <div className="divide-y divide-outline-variant/5 grid grid-cols-1 lg:grid-cols-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) markNotificationRead(notif.id).then(fetchCounts);
                      if (notif.post) navigate(`/post/${notif.post.id}`);
                    }}
                    className={`w-full p-6 flex gap-4 hover:bg-surface-container-high transition-all text-left cursor-pointer group relative ${!notif.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <div className="shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-outline-variant/10 shadow-md">
                        {notif.sender.avatarUrl ? (
                          <img src={notif.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40 bg-surface-container-low">
                            <User size={20} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm font-bold text-on-surface truncate">{notif.sender.nickname}</span>
                        <span className="text-xs text-on-surface-variant/40 font-label">{formatTime(notif.createdAt, language)}</span>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                        {notif.type === 'LIKE' ? t('messages.notif.liked') : 
                         notif.type === 'COMMENT' ? `${t('messages.notif.replied')}${notif.content}` : notif.content}
                      </p>
                      {notif.post && (
                        <div className="bg-white/50 border border-outline-variant/10 rounded-xl p-3 text-xs text-on-surface-variant/60 truncate italic shadow-sm hover:border-primary/20 transition-colors">
                          {t('messages.notif.post')}{notif.post.title}
                        </div>
                      )}
                    </div>
                    {!notif.isRead && (
                       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center p-12 h-64 text-center opacity-30 select-none">
                <Bell size={48} className="mb-2" />
                <p className="text-xs font-label uppercase tracking-widest">{t('messages.list.emptyNotif')}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* 右侧主视口 (仅在私信模式下显示聊天或详情引导) */}
      {activeCategory === 'messages' && (
        <div className={`flex-1 bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm flex flex-col relative ${!activeUserId && 'hidden md:flex'}`}>
          {activeUserId ? (
          <>
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/messages')}
                  className="md:hidden w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-highest border border-outline-variant/20 hover:border-primary transition-colors cursor-pointer" onClick={() => navigate(`/space/${activeUserId}`)}>
                  {activeUser?.avatarUrl ? (
                    <img src={activeUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                      <User size={20} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h2 
                    className="font-bold text-on-surface hover:text-primary transition-colors cursor-pointer" 
                    onClick={() => navigate(`/space/${activeUserId}`)}
                  >
                    {activeUser?.nickname || t('messages.chat.loading')}
                  </h2>
                  <span className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest opacity-60">ID: {activeUserId}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar"
            >
              <div className="flex-1" />
              {messages.length > 0 ? (
                messages.map((msg, idx) => {
                  const isMine = msg.senderId === currentUser?.id;
                  const showTime = idx === 0 || new Date(msg.createdAt).getTime() - new Date(messages[idx-1].createdAt).getTime() > 300000;
                  
                  return (
                    <div key={msg.id} className="flex flex-col">
                      {showTime && (
                        <div className="text-center mb-4">
                          <span className="text-[10px] font-label text-on-surface-variant/40 uppercase tracking-widest bg-surface-container-highest px-3 py-1 rounded-full">{formatTime(msg.createdAt, language)}</span>
                        </div>
                      )}
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2 group`}>
                        {!isMine && (
                           <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-highest border border-outline-variant/10 self-start mt-1 shrink-0">
                            {activeUser?.avatarUrl ? (
                              <img src={activeUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                                <User size={16} />
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine 
                            ? 'bg-primary text-on-primary rounded-br-none shadow-lg shadow-primary/10' 
                            : 'bg-surface-container-high text-on-surface rounded-bl-none border border-outline-variant/10'
                        }`}>
                          {msg.content}
                        </div>
                        {isMine && (
                          <span className={`text-[10px] font-label transition-opacity ${msg.isRead ? 'text-primary' : 'text-on-surface-variant/30'}`}>
                            {msg.isRead ? t('messages.chat.read') : t('messages.chat.unread')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                    <p className="text-xs font-label uppercase tracking-widest italic">{t('messages.chat.empty')}</p>
                 </div>
              )}
            </div>

            {/* Input */}
            <form 
              onSubmit={handleSend}
              className="p-4 md:p-6 bg-surface-container-low border-t border-outline-variant/10 flex gap-4 items-end"
            >
              <div className="flex-1 relative group">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t('messages.chat.placeholder')}
                  className="w-full bg-surface-container-high/50 border border-outline-variant/20 rounded-2xl px-5 py-3 pr-12 text-sm text-on-surface focus:border-primary/50 focus:bg-surface-container-high transition-all outline-none resize-none min-h-[48px] max-h-32 custom-scrollbar"
                  rows={1}
                />
                <div className="absolute right-3 bottom-1.5 flex items-center">
                  <button type="button" className="w-8 h-8 flex items-center justify-center text-on-surface-variant/40 hover:text-primary transition-colors">
                    <Smile size={20} />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center hover:bg-primary-dim transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-30 disabled:grayscale active:scale-95 shrink-0"
              >
                <Send size={20} className="translate-x-0.5" />
              </button>
            </form>
          </>
        ) : activeCategory === 'messages' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none bg-surface-container-low/30 backdrop-blur-sm">
             <div className="w-32 h-32 mb-8 relative">
                <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
                <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center border border-outline-variant/10 text-primary/40 shadow-xl">
                  <Mail size={48} className="italic" />
                </div>
             </div>
             <h2 className="text-xl font-headline font-bold text-on-surface mb-2 tracking-wide">{t('messages.chat.welcome')}</h2>
             <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed font-label opacity-60">
               {t('messages.chat.welcomeDesc')}
             </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none opacity-40">
             <div className="w-24 h-24 mb-6 border-2 border-dashed border-outline-variant/30 rounded-full flex items-center justify-center">
                <Bell size={32} />
             </div>
             <h3 className="font-bold text-on-surface mb-1">{t('messages.chat.pending')}</h3>
             <p className="text-xs text-on-surface-variant font-label">{t('messages.chat.pendingDesc')}</p>
          </div>
          )}
        </div>
      )}
    </main>
  );
}
