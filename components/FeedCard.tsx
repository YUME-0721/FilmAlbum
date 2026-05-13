import React, { useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { deletePost, type PostListItem } from '../src/api/posts';
import { User, Pencil, Trash2, Heart, MessageSquare, Share2, Lock, EyeOff } from 'lucide-react';
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
    <article className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden hover:border-white/15 transition-colors relative group">
      {/* 顶部：作者信息 */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div
          className="w-10 h-10 rounded-full bg-surface-variant flex-shrink-0 overflow-hidden border border-white/10 cursor-pointer"
          onClick={onClick}
        >
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={20} className="text-[#999]" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#e7e5e5] font-semibold text-sm leading-tight">{post.author.nickname}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[#666] text-xs">{formatRelativeTime(post.createdAt, language)}</p>
            {post.visibility === 'private' && (
              <span className="flex items-center text-[#666]" title={t('post.visibilityPrivate')}>
                <Lock size={12} />
              </span>
            )}
            {post.visibility === 'feed_only' && (
              <span className="flex items-center text-[#666]" title={t('post.visibilityFeed')}>
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
        <div className="flex flex-wrap gap-1.5 px-5 pb-2">
          {post.tags.map((tag: string) => (
            <span key={tag} className="text-primary text-xs font-medium">#{tag}</span>
          ))}
        </div>
      )}

      {/* 标题 + 内容 */}
      <div className="px-5 pb-3 cursor-pointer" onClick={onClick}>
        {post.title && (
          <h3 className="font-bold text-[#e7e5e5] text-base leading-snug mb-1">{post.title}</h3>
        )}
        {post.content && (
          <p className="text-[#aaa] text-sm leading-relaxed line-clamp-3">{post.content}</p>
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
        <div className="px-5 pb-3">
          {imgs.length === 1 ? (
            <div className="rounded-lg overflow-hidden cursor-pointer" onClick={onClick}>
              <img
                src={imgs[0].previewUrl || imgs[0].url}
                alt={post.title}
                className="w-full max-h-[420px] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            /* 多图：横向滚动 + 左右导航 */
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide cursor-pointer" onClick={onClick}>
                {imgs.map((img: { url: string; previewUrl?: string }, i: number) => (
                  <img
                    key={i}
                    src={img.previewUrl || img.url}
                    alt=""
                    className={`flex-shrink-0 h-52 rounded-lg object-cover transition-opacity ${i === imgIdx ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                    style={{ width: imgs.length === 2 ? 'calc(50% - 4px)' : imgs.length >= 3 ? '200px' : 'auto' }}
                    referrerPolicy="no-referrer"
                    onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                  />
                ))}
              </div>
              {hasMultiple && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {imgs.map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/30'}`} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-white/6">
        <div className="flex items-center gap-5 text-[#666] text-sm">
          <button className="flex items-center gap-1.5 hover:text-[#aaa] transition-colors">
            <Heart size={18} />
            <span className="text-xs">{post.likesCount > 0 ? post.likesCount : t('profile.likes')}</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#aaa] transition-colors" onClick={onClick}>
            <MessageSquare size={18} />
            <span className="text-xs">{post.commentsCount > 0 ? post.commentsCount : t('profile.tabs.post')}</span>
          </button>
        </div>
        <button className="flex items-center gap-1 text-[#555] hover:text-[#aaa] transition-colors text-xs">
          <Share2 size={16} />
          Share
        </button>
      </div>
    </article>
  );
}
