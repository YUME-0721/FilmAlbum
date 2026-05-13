/**
 * 帖子详情页
 * 从后端 API 获取帖子数据，支持点赞和评论
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.tsx';
import { getPost, likePost, unlikePost, getComments, createComment, type PostDetail, type CommentItem } from '../src/api/posts.ts';
import { post as apiPost, del } from '../src/api/client.ts';
import { ArrowLeft, User, Heart, MessageSquare, Share2, X, Lock, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

/** 回退 MOCK 数据 */
const FALLBACK_POST: PostDetail = {
  id: 'mock-1',
  title: '夜色东京 · 2024',
  filmType: 'Cinestill 800T',
  camera: 'Leica M6',
  lens: 'Summicron 35mm f/2',
  content: '在雨后的新宿街头漫步，霓虹灯的倒影在水洼中闪烁。Cinestill 800T 独特的红色光晕给这座赛博朋克城市增添了一层迷幻的色彩。',
  tags: ['东京', '街头', '夜景', 'Cinestill800T'],
  author: {
    id: '',
    nickname: '陈墨言',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCu6aX_5pIi-kbLay3_qC3ahFfQazfczfPnBiXKGyEa1Zdee12Sb-SeikeW6tVX6knReDcJT6QY_tQDWZ6Rx628agWvsLlEZA9gWg68TmZCsAzdFfMZ1L-g3djuJyZp0yNXec4qGPfZLYzZ8EMglVFOMFIoGjdoHk4X6VdpeJoNCCNitro7aZEEuk1aN9qysMyKMX2e5oO3ha2reOv6P3KQO81eQUbYPXYbrcjwAjqtLUXNImzqWFgEWB4KkHjOeqtRoXhc_qGBAHYv',
    bio: ''
  },
  images: [
    { id: '1', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCwt7mg2GUd2T8Heu_e0WDLsGU9vuWUugHOah2k3jtVRpIVKIld_ViCW95v56-38MELSzUUyQP_9UCmA9rkVEHmz-afONtZHnwCE4guyEG87kPKa51VphaLvTT380plwctDeo2AtpXTU8cOWcFaA_5EaHBCqn9T8nXXrAbX1gEdeai6GLml0bxd67hU3oP1xwIs1JE6SwxbVtv68jhnHywEXd3Pcr7oduT39yfIy5QzO-GnXPqNhxkfJrDwjpPtdaaLbxss_1umia7', sortOrder: 0 },
    { id: '2', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlNC91Bmvf09OZHB4BvWeDT266cvGh2qA7pDwilXCq1u2AsZhO2pOvFuOjQUSCijN9bEoJlhXCUyO5aw_-9HjzoPhdwvkUnik27rEZtxMSAThj3pvtUK601z7LOCJVO2zCYDBsDVCSHVot1pQx2DMUWQ7aS7WJbzGyREX4VDIF2_okGmVDi0Sk54OnpwaGestARH7vEGw40D8a7U648TL-GErTuCo_YR7iQuJuhIEcgLoDEietHvscwtGpgFghNgKWmenLxIFjmVwF', sortOrder: 1 },
    { id: '3', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVsu2wejG0gTS0oRjWI9DPcHGEwIxQ-ncZvrJKDIhvxFvlIZ0_QlqpTbONtwS5-tFiGKCnbxkMWQhnFX1UEsE9d_jV6h9rsxaX-sXB35Sw0iRLKUkRsYCcl9uNWWSByQkk9nJEHYekLtS5w6qwlO5yZ_1YNX1RIZJR7JH6wU6akDUFrP8-EvN8QTMdJfTH8zjw7xOw3x5ooL0q6c9JCdv1qQUipR94-wz1aPeBXIY8DXwnQgdgGrxbp7AnMHoP--I-WLbcx_n1N5t9', sortOrder: 2 }
  ],
  likesCount: 1200,
  commentsCount: 42,
  likedBy: [],
  isLiked: false,
  isFollowing: false,
  isOwner: false,
  createdAt: '',
  visibility: 'public'
};

/** 计算相对时间 */
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '刚刚';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function Post() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    try {
      const result = await getPost(id);
      if (result.success && result.data) {
        setPost(result.data);
        setIsLiked(result.data.isLiked);
        setIsFollowing(result.data.isFollowing);
        setLikesCount(result.data.likesCount);
      } else {
        setPost(FALLBACK_POST);
        setLikesCount(FALLBACK_POST.likesCount);
      }
    } catch {
      setPost(FALLBACK_POST);
      setLikesCount(FALLBACK_POST.likesCount);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    try {
      const result = await getComments(id);
      if (result.success && result.data) {
        setComments(result.data);
      }
    } catch {
      // 评论加载失败静默处理
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  const handleLike = async () => {
    if (!isLoggedIn || !id) return;
    try {
      if (isLiked) {
        const result = await unlikePost(id);
        setIsLiked(false);
        if (result.data) setLikesCount(result.data.likesCount);
        fetchPost();
      } else {
        const result = await likePost(id);
        setIsLiked(true);
        if (result.data) setLikesCount(result.data.likesCount);
        fetchPost();
      }
    } catch {
      // 静默处理点赞错误
    }
  };

  const handleFollow = async () => {
    if (!isLoggedIn || !post?.author.id) return;
    try {
      if (isFollowing) {
        await del(`/users/${post.author.id}/follow`);
        setIsFollowing(false);
      } else {
        await apiPost(`/users/${post.author.id}/follow`);
        setIsFollowing(true);
      }
    } catch {
      // 操作失败静默处理
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !id) return;
    try {
      const result = await createComment(
        id, 
        commentText.trim(), 
        replyTo?.parentId || replyTo?.id, // 如果回复的是回复，则共用同一个 parentId，否则当前评论就是 parent
        replyTo?.user.id
      );
      if (result.success && result.data) {
        setComments(prev => [...prev, result.data!]);
        setCommentText('');
        setReplyTo(null);
      }
    } catch {
      // 评论失败静默处理
    }
  };

  const handleReply = (comment: CommentItem) => {
    setReplyTo(comment);
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (isLoading) {
    return (
      <main className="max-w-5xl mx-auto pt-8 pb-24 px-8 min-h-screen flex items-center justify-center">
        <div className="text-on-surface-variant font-label text-sm tracking-widest uppercase animate-pulse">加载中...</div>
      </main>
    );
  }

  if (!post) return null;

  return (
    <main className="max-w-5xl mx-auto pt-8 pb-24 px-8 min-h-screen relative">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-on-surface-variant hover:text-primary transition-colors mb-6 md:mb-0 md:absolute md:-left-20 lg:-left-28 md:top-10 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-label tracking-widest uppercase hidden md:inline">返回</span>
      </button>

      <article className="bg-surface-container-low border border-outline-variant/15 p-8 md:p-12">
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant border border-outline-variant/30 cursor-pointer flex items-center justify-center" onClick={() => post.author.id && navigate(`/space/${post.author.id}`)}>
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt={post.author.nickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={24} className="text-on-surface-variant" />
              )}
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg text-on-surface cursor-pointer hover:text-primary transition-colors" onClick={() => post.author.id && navigate(`/space/${post.author.id}`)}>{post.author.nickname}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-label text-xs text-on-surface-variant">{formatRelativeTime(post.createdAt)}发布</p>
                {post.visibility === 'private' && (
                  <span className="flex items-center gap-1 text-on-surface-variant text-[10px]" title="私密动态">
                    <Lock size={10} />
                    <span>私密</span>
                  </span>
                )}
                {post.visibility === 'feed_only' && (
                  <span className="flex items-center gap-1 text-on-surface-variant text-[10px]" title="仅动态">
                    <EyeOff size={10} />
                    <span>仅动态</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {!post.isOwner && (
            <button 
              onClick={handleFollow}
              className={`${isFollowing ? 'bg-surface-variant text-on-surface' : 'bg-primary text-on-primary hover:bg-primary-dim'} px-6 py-2 text-xs font-bold transition-colors uppercase tracking-widest self-start md:self-auto rounded-sm`}
            >
              {isFollowing ? '已关注' : '关注'}
            </button>
          )}
        </header>

        {/* Content */}
        <div className="space-y-6 mb-12">
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-on-surface">{post.title}</h1>
          <p className="font-body text-on-surface-variant leading-relaxed text-lg">
            {post.content}
          </p>
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-surface-variant text-on-surface-variant text-xs font-label rounded-sm">#{tag}</span>
            ))}
          </div>
        </div>

        {/* Images Carousel */}
        <div className="mb-12 relative group/carousel">
          <div className="relative aspect-[4/3] md:aspect-[16/9] bg-surface-container-lowest overflow-hidden border border-outline-variant/10">
            {post.images.map((img, idx) => (
              <div 
                key={img.id || idx}
                className={`absolute inset-0 transition-all duration-500 ease-in-out flex items-center justify-center p-4 md:p-8 ${
                  idx === currentImgIndex ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-full z-0'
                }`}
                style={{
                  transform: idx === currentImgIndex ? 'translateX(0)' : (idx < currentImgIndex ? 'translateX(-100%)' : 'translateX(100%)')
                }}
              >
                <img 
                  src={img.imageUrl} 
                  alt={`Post image ${idx + 1}`} 
                  className="w-full h-full object-contain select-none" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            ))}

            {/* Navigation Buttons */}
            {post.images.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentImgIndex(prev => (prev === 0 ? post.images.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100 z-20"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={() => setCurrentImgIndex(prev => (prev === post.images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100 z-20"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Index Indicator */}
            <div className="absolute bottom-6 right-8 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white tracking-widest z-20">
              {currentImgIndex + 1} / {post.images.length}
            </div>
          </div>

          {/* Thumbnails / Indicators */}
          {post.images.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {post.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImgIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentImgIndex ? 'bg-primary w-4' : 'bg-outline-variant/40 hover:bg-outline-variant'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Metadata & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-t border-outline-variant/15 pt-8">
          <div className="grid grid-cols-2 md:flex gap-6 md:gap-12 text-sm font-label uppercase tracking-widest text-on-surface-variant">
            <div>
              <span className="block text-[10px] text-primary/60 mb-1">胶片</span>
              <span className="text-on-surface">{post.filmType}</span>
            </div>
            <div>
              <span className="block text-[10px] text-primary/60 mb-1">相机</span>
              <span className="text-on-surface">{post.camera}</span>
            </div>
            <div>
              <span className="block text-[10px] text-primary/60 mb-1">镜头</span>
              <span className="text-on-surface">{post.lens}</span>
            </div>
          </div>

          <div className="flex gap-6">
            <button onClick={handleLike} className={`flex items-center gap-2 transition-colors group ${isLiked ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
              <Heart size={20} className={`group-hover:scale-110 transition-transform ${isLiked ? 'fill-current text-primary' : ''}`} />
              <span className="font-label text-sm">{likesCount}</span>
            </button>
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group">
              <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-label text-sm">{comments.length || post.commentsCount}</span>
            </button>
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group">
              <Share2 size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* 点赞用户列表 */}
        {post.likedBy && post.likedBy.length > 0 && (
          <div className="flex items-center gap-4 py-4 mt-8 px-6 bg-surface-container-low rounded-xl border border-outline-variant/5">
            <div className="flex -space-x-3 overflow-hidden">
              {post.likedBy.slice(0, 5).map((u, i) => (
                <div 
                  key={u.id} 
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-surface-container-low overflow-hidden bg-surface-variant cursor-pointer"
                  style={{ zIndex: 10 - i }}
                  onClick={() => navigate(`/space/${u.id}`)}
                >
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.nickname} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-[10px] font-bold">
                      {u.nickname[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-on-surface-variant font-body">
              <span className="font-bold text-on-surface cursor-pointer hover:text-primary" onClick={() => navigate(`/space/${post.likedBy[0].id}`)}>
                {post.likedBy[0].nickname}
              </span>
              {post.likedBy.length > 1 && (
                <>
                  <span className="mx-1">以及其他</span>
                  <span className="font-bold text-on-surface">
                    {post.likedBy.length - 1} 位用户
                  </span>
                </>
              )}
              <span className="ml-1">点赞了此帖</span>
            </div>
          </div>
        )}
      </article>

      {/* Comments Section */}
      <section className="mt-12">
        <h3 className="font-headline text-xl font-bold mb-6">评论 ({comments.length || post.commentsCount})</h3>
        
        {isLoggedIn && (
          <div className="flex gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-surface-variant flex-shrink-0 flex items-center justify-center">
              <User size={20} className="text-on-surface-variant" />
            </div>
            <div className="flex-grow">
              {replyTo && (
                <div className="flex items-center justify-between bg-surface-variant/30 px-4 py-2 mb-2 rounded-sm border-l-2 border-primary">
                  <span className="text-xs text-on-surface-variant">
                    正在回复 <span className="font-bold text-on-surface">@{replyTo.user.nickname}</span>
                  </span>
                  <button onClick={() => setReplyTo(null)} className="text-on-surface-variant hover:text-error transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )}
              <textarea 
                ref={textareaRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={replyTo ? `回复 @${replyTo.user.nickname}...` : "添加评论..."} 
                className="w-full bg-surface-container-low border border-outline-variant/30 p-4 text-sm font-body focus:border-primary focus:ring-0 outline-none transition-colors resize-none h-24"
              ></textarea>
              <div className="flex justify-end mt-2">
                <button 
                  onClick={handleComment}
                  disabled={!commentText.trim()}
                  className="bg-surface-variant text-on-surface px-6 py-2 text-xs font-bold hover:bg-surface-bright transition-colors uppercase tracking-widest disabled:opacity-50"
                >
                  发布
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex-shrink-0 flex items-center justify-center overflow-hidden">
                {comment.user.avatarUrl ? (
                  <img src={comment.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="text-on-surface-variant" />
                )}
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-on-surface">{comment.user.nickname}</span>
                  <span className="text-[10px] text-on-surface-variant">{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-on-surface-variant font-body mb-2">
                  {comment.replyToUser && (
                    <span className="text-primary/80 mr-1.5 font-bold">@{comment.replyToUser.nickname}</span>
                  )}
                  {comment.content}
                </p>
                <button 
                  onClick={() => handleReply(comment)}
                  className="text-[10px] font-bold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest"
                >
                  回复
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
