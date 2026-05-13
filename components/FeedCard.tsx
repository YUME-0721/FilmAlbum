import React, { useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { deletePost, type PostListItem } from '../src/api/posts';
import { User, Pencil, Trash2, Heart, MessageSquare, Share2, MoreHorizontal, Edit2, Lock, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../src/hooks/useTranslation';

/** 相对时间格式化 */
function formatRelativeTime(dateString: string, language: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  const isEn = language === 'en-US';
  
  if (diffSecs < 60) return isEn ? 'Just now' : '刚刚';
  if (diffMins < 60) return isEn ? `${diffMins}m ago` : `${diffMins}分钟前`;
  if (diffHours < 24) return isEn ? `${diffHours}h ago` : `${diffHours}小时前`;
  if (diffDays < 7) return isEn ? `${diffDays}d ago` : `${diffDays}天前`;
  return date.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' });
}

interface FeedCardProps {
  post: PostListItem;
  onClick: () => void;
  onEdit?: (post: PostListItem) => void;
  onDelete?: (id: string) => void;
}

export default function FeedCard({ post, onClick, onEdit, onDelete }: FeedCardProps) {
  const { t, language } = useTranslation();
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = post.images?.length ? post.images : (post.coverImage ? [{ url: post.coverImage, previewUrl: post.coverImage }] : []);
  const hasMultiple = imgs.length > 1;
  const { user } = useAuth();
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // 阈值设置为 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // 向左划，下一张
        setImgIdx(prev => (prev === imgs.length - 1 ? 0 : prev + 1));
      } else {
        // 向右划，上一张
        setImgIdx(prev => (prev === 0 ? imgs.length - 1 : prev - 1));
      }
    }
    setTouchStart(null);
  };
  // NOTE: 两端的 id 都经过 padStart(4,'0') 处理，直接字符串比较
  const isOwner = !!(user && post.author && user.id === post.author.id);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('common.confirm'))) {
      try {
        const res = await deletePost(post.id);
        if (res.success && onDelete) {
          onDelete(post.id);
        } else {
          alert('删除失败');
        }
      } catch (err) {
        alert('网络错误');
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(post);
    }
  };

  return (
    <article className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all duration-300 relative group shadow-2xl shadow-black/50">
      {/* 顶部：作者信息 */}
      <div className="flex items-center gap-4 px-6 pt-6 pb-4">
        <div
          className="w-11 h-11 rounded-full bg-surface-variant flex-shrink-0 overflow-hidden border border-white/10 cursor-pointer shadow-lg"
          onClick={onClick}
        >
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={22} className="text-[#999]" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#f0f0f0] font-bold text-sm tracking-wide leading-tight">{post.author.nickname}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[#777] text-[11px] font-medium">{formatRelativeTime(post.createdAt, language)}</p>
            {post.visibility === 'private' && (
              <span className="flex items-center text-[#555]" title={t('post.visibilityPrivate')}>
                <Lock size={12} />
              </span>
            )}
            {post.visibility === 'feed_only' && (
              <span className="flex items-center text-[#555]" title={t('post.visibilityFeedOnly')}>
                <EyeOff size={12} />
              </span>
            )}
          </div>
        </div>
        
        {/* 操作按钮 (Owner Only) */}
        {isOwner && (
          <div className="opacity-40 group-hover:opacity-100 transition-opacity flex items-center gap-2">
            <button 
              onClick={handleEdit}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#999] hover:text-white transition-colors"
              title="编辑帖子"
            >
              <Pencil size={16} />
            </button>
            <button 
              onClick={handleDelete}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-[#999] hover:text-red-400 transition-colors"
              title="删除帖子"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 标签 */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-6 pb-3">
          {post.tags.map((tag: string) => (
            <span key={tag} className="text-primary text-[11px] font-bold tracking-wider bg-primary/5 px-2 py-0.5 rounded-sm">#{tag}</span>
          ))}
        </div>
      )}

      {/* 标题 + 内容 */}
      <div className="px-6 pb-4 cursor-pointer" onClick={onClick}>
        {post.title && (
          <h3 className="font-bold text-[#f0f0f0] text-lg leading-snug mb-2 tracking-tight">{post.title}</h3>
        )}
        {post.content && (
          <p className="text-[#999] text-sm leading-relaxed line-clamp-3 font-body">{post.content}</p>
        )}
        {/* 设备信息 */}
        {(post.filmType || post.camera || post.lens) && (
          <div className="flex flex-wrap gap-3 mt-2">
            {post.filmType && (
              <span className="text-[10px] uppercase tracking-widest text-[#666]">
                <span className="text-primary/70 mr-1">{t('roll.film')}</span>{post.filmType}
              </span>
            )}
            {post.camera && (
              <span className="text-[10px] uppercase tracking-widest text-[#666]">
                <span className="text-primary/70 mr-1">{t('roll.camera')}</span>{post.camera}
              </span>
            )}
            {post.lens && (
              <span className="text-[10px] uppercase tracking-widest text-[#666]">
                <span className="text-primary/70 mr-1">{t('roll.lens')}</span>{post.lens}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 图片区域 */}
      {imgs.length > 0 && (
        <div className="px-6 pb-4">
          {imgs.length === 1 ? (
            <div className="rounded-xl overflow-hidden cursor-pointer bg-black/20" onClick={onClick}>
              <img
                src={imgs[0].previewUrl || imgs[0].url}
                alt={post.title}
                className="w-full h-auto block hover:scale-[1.02] transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            /* 多图：轮播样式 */
            <div className="relative group/carousel overflow-hidden rounded-lg">
              <div 
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${imgIdx * 100}%)` }}
                onClick={onClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {imgs.map((img: { url: string; previewUrl?: string }, i: number) => (
                  <div key={i} className="flex-shrink-0 w-full flex items-center justify-center bg-black/20 select-none">
                    <img
                      src={img.previewUrl || img.url}
                      alt=""
                      className="w-full h-[380px] md:h-[520px] object-contain cursor-pointer hover:scale-[1.01] transition-transform duration-700 pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>

              {/* Navigation buttons - Hidden on mobile as we now have touch swipe */}
              <button 
                onClick={(e) => { e.stopPropagation(); setImgIdx(prev => (prev === 0 ? imgs.length - 1 : prev - 1)); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white hidden md:flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setImgIdx(prev => (prev === imgs.length - 1 ? 0 : prev + 1)); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white hidden md:flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
              >
                <ChevronRight size={20} />
              </button>

              {/* Dots / Indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {imgs.map((_: any, i: number) => (
                  <div 
                    key={i}
                    className={`h-1 rounded-full transition-all ${i === imgIdx ? 'w-4 bg-white' : 'w-1 bg-white/40'}`}
                  />
                ))}
              </div>

              {/* Counter */}
              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-mono">
                {imgIdx + 1}/{imgs.length}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-6 text-[#777]">
          <button className="flex items-center gap-2 hover:text-primary transition-colors group">
            <Heart size={20} className="group-active:scale-125 transition-transform" />
            <span className="text-xs font-bold">{post.likesCount > 0 ? post.likesCount : t('profile.likes')}</span>
          </button>
          <button className="flex items-center gap-2 hover:text-primary transition-colors group" onClick={onClick}>
            <MessageSquare size={20} className="group-active:scale-125 transition-transform" />
            <span className="text-xs font-bold">{post.commentsCount > 0 ? post.commentsCount : t('profile.tabs.post')}</span>
          </button>
        </div>
        <button className="flex items-center gap-2 text-[#555] hover:text-[#999] transition-colors text-xs font-bold uppercase tracking-widest">
          <Share2 size={18} />
          {t('common.share')}
        </button>
      </div>
    </article>
  );
}
