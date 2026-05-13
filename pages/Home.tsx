/**
 * 主页 - 支持瀑布流「推荐内容」和社交信息流「动态」两种模式
 * Tab 切换时共享同一份数据，不重复请求
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPosts, type PostListItem } from '../src/api/posts.ts';
import CreatePostModal from '../components/CreatePostModal.tsx';
import { useAuth } from '../src/context/AuthContext.tsx';
import FeedCard from '../components/FeedCard';
import { User, Heart, MessageSquare, ChevronDown, Plus, Lock, EyeOff } from 'lucide-react';
import { useTranslation } from '../src/hooks/useTranslation';

/** 后端无数据时的回退 MOCK 数据 */
const FALLBACK_POSTS: PostListItem[] = [
  {
    id: 'mock-1',
    title: '夜色东京 · 2024',
    filmType: 'ISO 800',
    camera: '', lens: '', content: '', tags: [],
    author: { id: '', nickname: '陈墨言', avatarUrl: '' },
    likesCount: 1200,
    commentsCount: 42,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCwt7mg2GUd2T8Heu_e0WDLsGU9vuWUugHOah2k3jtVRpIVKIld_ViCW95v56-38MELSzUUyQP_9UCmA9rkVEHmz-afONtZHnwCE4guyEG87kPKa51VphaLvTT380plwctDeo2AtpXTU8cOWcFaA_5EaHBCqn9T8nXXrAbX1gEdeai6GLml0bxd67hU3oP1xwIs1JE6SwxbVtv68jhnHywEXd3Pcr7oduT39yfIy5QzO-GnXPqNhxkfJrDwjpPtdaaLbxss_1umia7',
    images: [{ url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCwt7mg2GUd2T8Heu_e0WDLsGU9vuWUugHOah2k3jtVRpIVKIld_ViCW95v56-38MELSzUUyQP_9UCmA9rkVEHmz-afONtZHnwCE4guyEG87kPKa51VphaLvTT380plwctDeo2AtpXTU8cOWcFaA_5EaHBCqn9T8nXXrAbX1gEdeai6GLml0bxd67hU3oP1xwIs1JE6SwxbVtv68jhnHywEXd3Pcr7oduT39yfIy5QzO-GnXPqNhxkfJrDwjpPtdaaLbxss_1umia7' }],
    createdAt: '',
    visibility: 'public'
  },
  {
    id: 'mock-2',
    title: '午后慵懒',
    filmType: 'Portra 400',
    camera: '', lens: '', content: '', tags: [],
    author: { id: '', nickname: 'Lina Wang', avatarUrl: '' },
    likesCount: 856,
    commentsCount: 18,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgGvl9j3WKbySaekhXLRbteD4ruUyMgaVnpfJFkFlH4F97Qn5kXToCTIouyerLaz4ZIHoKZvrlV3uvI2_yS9uxYSDOTMylSiSIrfflJzIQDvF_254PueQJBwFdA_NPlgsE2M9RPN3ytxWxiZayoNfAb2S8-ufSrVuXWyu6-B07DhpFI7mMefbfJKeLqcvszNutZkpZWQHnAH_tN0-FxPprHfBRraA4Dy6ZuFDfWQ4aggjaVw8R8w_b94eA-Ia74KE0_KmJdvnfTWzY',
    images: [{ url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgGvl9j3WKbySaekhXLRbteD4ruUyMgaVnpfJFkFlH4F97Qn5kXToCTIouyerLaz4ZIHoKZvrlV3uvI2_yS9uxYSDOTMylSiSIrfflJzIQDvF_254PueQJBwFdA_NPlgsE2M9RPN3ytxWxiZayoNfAb2S8-ufSrVuXWyu6-B07DhpFI7mMefbfJKeLqcvszNutZkpZWQHnAH_tN0-FxPprHfBRraA4Dy6ZuFDfWQ4aggjaVw8R8w_b94eA-Ia74KE0_KmJdvnfTWzY' }],
    createdAt: '',
    visibility: 'public'
  },
  {
    id: 'mock-3',
    title: '构造之美',
    filmType: 'HP5 Plus',
    camera: '', lens: '', content: '', tags: [],
    author: { id: '', nickname: '建筑观察者', avatarUrl: '' },
    likesCount: 2100,
    commentsCount: 67,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeNpyPWgHp2nwSvQTWtCeaofqg20_O69-I4IEuKOZZGTUANJH6kxko2edXheL1ZxexGlGyJiDRnjCBIzvP62VLXIZMoKeMQoeQqso8yslcc6HO5OzlKOJUYyJcHsqGH6Y7xWifPuTPtR7Je8wTsiZGkyl6aozwybIXjIt95MyI6vWK69-40eEjzutJxermk2OvTjKDILGazSvY7GY0Ct-Jhr_h_9-QjQHL_FyVw9bQ2-rxDLb5aoJg0_Vt2zh3ir_E8gQAqKICTS4f',
    images: [{ url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeNpyPWgHp2nwSvQTWtCeaofqg20_O69-I4IEuKOZZGTUANJH6kxko2edXheL1ZxexGlGyJiDRnjCBIzvP62VLXIZMoKeMQoeQqso8yslcc6HO5OzlKOJUYyJcHsqGH6Y7xWifPuTPtR7Je8wTsiZGkyl6aozwybIXjIt95MyI6vWK69-40eEjzutJxermk2OvTjKDILGazSvY7GY0Ct-Jhr_h_9-QjQHL_FyVw9bQ2-rxDLb5aoJg0_Vt2zh3ir_E8gQAqKICTS4f' }],
    createdAt: '',
    visibility: 'public'
  },
  {
    id: 'mock-4',
    title: '迷雾山脉',
    filmType: '120 Format',
    camera: '', lens: '', content: '', tags: [],
    author: { id: '', nickname: 'Wilderness', avatarUrl: '' },
    likesCount: 543,
    commentsCount: 12,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxCAwTBoitMiPokZGj8seccpob91CePrL-5jF-WEm6EjHh_7bn_oEfqVPlkt78mlonXv7S_HQtg10R9dFRWF6PqsUHY0bjiKA9M0WpDuHP9rb0288UqFDFbiCYoiKAnFrv2C21hiTVrWjbwnXGj1yvn5v23m94PV1bUy6s7xxvsDsyoDW98_lp0NKFs4OF-sSsgjB5uMWKlC-l5f_ooZtuLcueeyVdyNXQVHqXxEFsyDnmsa-68AN-qUnitI6UJrZDBkrtraXthf47',
    images: [{ url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxCAwTBoitMiPokZGj8seccpob91CePrL-5jF-WEm6EjHh_7bn_oEfqVPlkt78mlonXv7S_HQtg10R9dFRWF6PqsUHY0bjiKA9M0WpDuHP9rb0288UqFDFbiCYoiKAnFrv2C21hiTVrWjbwnXGj1yvn5v23m94PV1bUy6s7xxvsDsyoDW98_lp0NKFs4OF-sSsgjB5uMWKlC-l5f_ooZtuLcueeyVdyNXQVHqXxEFsyDnmsa-68AN-qUnitI6UJrZDBkrtraXthf47' }],
    createdAt: '',
    visibility: 'public'
  },
  {
    id: 'mock-5',
    title: '机械的情怀',
    filmType: 'Ektar 100',
    camera: '', lens: '', content: '', tags: [],
    author: { id: '', nickname: 'Leica Collector', avatarUrl: '' },
    likesCount: 991,
    commentsCount: 31,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6rpJJXIekCvjtvv8mQjGUf_RKGaeczFkSNGH0dG8BotDhxCysILvp842-XtOC09XO0azWzmd_m6Cu6Qvu-AG-kbIcxs5O0OvDfsshEAefe739Enh1wHCI9CWwcZ0rRPFuFF25aKfBQxTlrC9wxmHYLiIhoIvUFKUOeODMW-VZv3JQ3pU5H0J9xv0gAo1apaL6lrGg-Umov08Hv0Sj8OVtBP6qzYK-ihQMTyPo4AQPYPKbb8mAmhWlsuVL8O12YFAlZNztxQzljkkx',
    images: [{ url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6rpJJXIekCvjtvv8mQjGUf_RKGaeczFkSNGH0dG8BotDhxCysILvp842-XtOC09XO0azWzmd_m6Cu6Qvu-AG-kbIcxs5O0OvDfsshEAefe739Enh1wHCI9CWwcZ0rRPFuFF25aKfBQxTlrC9wxmHYLiIhoIvUFKUOeODMW-VZv3JQ3pU5H0J9xv0gAo1apaL6lrGg-Umov08Hv0Sj8OVtBP6qzYK-ihQMTyPo4AQPYPKbb8mAmhWlsuVL8O12YFAlZNztxQzljkkx' }],
    createdAt: '',
    visibility: 'public'
  },
  {
    id: 'mock-6',
    title: '海边独白',
    filmType: 'Cinestill 800T',
    camera: '', lens: '', content: '', tags: [],
    author: { id: '', nickname: '张嘉航', avatarUrl: '' },
    likesCount: 1500,
    commentsCount: 55,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCL8JjVUQ4KoGi9REsTpMa-aFv9PXDazctnnxtQCte5-poax_A7HGpYhSYDZak7HXfhG8Z7NOsNVnxTicVKwwY3YRCx-nE3XDnXORh91oRUo9LHyNJNnbrYiNVnpbVVYdCH83ZXuxrL2T92KSJ_dV8_Vu0I2PqrpJSwdiFNzklFc-iDIqLRY0UPdbZBwakECkaCdAMqvD19_sbR55CRvpuO9hxtMambX2HP1obQAM3PP7I3cg81ZzJP7gQO6bV-UQm4tklwb-pbM8ru',
    images: [{ url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCL8JjVUQ4KoGi9REsTpMa-aFv9PXDazctnnxtQCte5-poax_A7HGpYhSYDZak7HXfhG8Z7NOsNVnxTicVKwwY3YRCx-nE3XDnXORh91oRUo9LHyNJNnbrYiNVnpbVVYdCH83ZXuxrL2T92KSJ_dV8_Vu0I2PqrpJSwdiFNzklFc-iDIqLRY0UPdbZBwakECkaCdAMqvD19_sbR55CRvpuO9hxtMambX2HP1obQAM3PP7I3cg81ZzJP7gQO6bV-UQm4tklwb-pbM8ru' }],
    createdAt: '',
    visibility: 'public'
  }
];

/** 格式化数字显示 */
function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

/** 为瀑布流分配随机高度 */
const HEIGHT_POOL = ['400px', '550px', '320px', '480px', '380px', '520px'];

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PostListItem | null>(null);
  // NOTE: 读取 URL ?tab=feed 将导航栏「动态」链接切到关注居流
  const [activeTab, setActiveTab] = useState<'recommend' | 'feed'>(
    () => new URLSearchParams(location.search).get('tab') === 'feed' ? 'feed' : 'recommend'
  );

  const fetchPosts = useCallback(async (pageNum: number, tab: 'recommend' | 'feed') => {
    try {
      const result = await getPosts(pageNum, 12, tab);
      if (result.success && result.data && result.data.length > 0) {
        if (pageNum === 1) {
          setPosts(result.data);
        } else {
          setPosts(prev => [...prev, ...result.data!]);
        }
        setHasMore(result.pagination ? pageNum < result.pagination.totalPages : false);
      } else if (pageNum === 1) {
        // API 返回空数据
        setPosts(tab === 'recommend' ? FALLBACK_POSTS : []);
        setHasMore(false);
      }
    } catch {
      // API 不可用或未登录
      if (pageNum === 1) {
        setPosts(tab === 'recommend' ? FALLBACK_POSTS : []);
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // NOTE: 用 useEffect 监听 URL 参数变化，实现导航栏点击后即时返回切换
  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    const next: 'recommend' | 'feed' = tab === 'feed' ? 'feed' : 'recommend';
    setActiveTab(next);
  }, [location.search]);

  useEffect(() => {
    setPosts([]);
    setIsLoading(true);
    setPage(1);
    fetchPosts(1, activeTab);
  }, [activeTab, fetchPosts]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, activeTab);
  };

  const handleFabClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handlePostCreated = () => {
    setPage(1);
    setIsLoading(true);
    fetchPosts(1, activeTab);
  };

  const handlePostDeleted = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <main className="pt-8 pb-16 px-8 max-w-[1920px] mx-auto">
      {/* Gallery Header */}
      <header className="mb-12">
        <h1 className="font-headline text-4xl md:text-5xl text-on-surface mb-4 leading-tight">
          {activeTab === 'feed' ? (
            <>{t('home.feedTitle')}<span className="text-primary"> {t('home.feedAccent')}</span></>
          ) : (
            <>{t('home.title')}<span className="text-primary">{t('home.titleAccent')}</span></>
          )}
        </h1>
        <p className="text-on-surface-variant text-base">
          {activeTab === 'feed'
            ? t('home.feedSubtitle')
            : t('home.subtitle')
          }
        </p>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="text-on-surface-variant font-label text-sm tracking-widest uppercase animate-pulse">
            {t('common.loading')}
          </div>
        </div>
      )}

      {/* Content Area Based on Active Tab */}
      {!isLoading && (
        activeTab === 'recommend' ? (
          /* Masonry Feed */
          <section className="masonry-grid">
            {posts.map((post, index) => (
              <article 
                key={post.id} 
                className="masonry-item group cursor-pointer"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <div className="overflow-hidden relative border border-outline-variant/15">
                  <img 
                    src={post.coverImage} 
                    alt={post.title}
                    className="w-full object-cover transition-all duration-700 hover:scale-105 block"
                    style={{ minHeight: HEIGHT_POOL[index % HEIGHT_POOL.length] }}
                    referrerPolicy="no-referrer"
                  />
                  
                  <div className="p-5 bg-surface-container-low relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-headline text-xl text-on-surface">{post.title}</h3>
                        {post.visibility === 'private' && <Lock size={14} className="text-on-surface-variant/60" />}
                        {post.visibility === 'feed_only' && <EyeOff size={14} className="text-on-surface-variant/60" />}
                      </div>
                      {post.filmType && (
                        <span className="font-label text-xs text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-sm">
                          {post.filmType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-variant flex items-center justify-center border border-outline-variant/30 overflow-hidden">
                          {post.author.avatarUrl ? (
                            <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User size={14} className="text-on-surface-variant" />
                          )}
                        </div>
                        <span className="text-sm text-on-surface-variant font-body">{post.author.nickname}</span>
                      </div>
                      <div className="flex gap-4 text-on-surface-variant font-label text-xs">
                        <span className="flex items-center gap-1">
                          <Heart size={14} /> {formatCount(post.likesCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} /> {formatCount(post.commentsCount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          /* Social Feed */
          <section className="max-w-2xl mx-auto space-y-10">
            {posts.length > 0 ? posts.map((post) => (
              <FeedCard 
                key={post.id} 
                post={post} 
                onClick={() => navigate(`/post/${post.id}`)} 
                onDelete={handlePostDeleted}
                onEdit={(p) => {
                  setEditTarget(p);
                  setIsCreateModalOpen(true);
                }}
              />
            )) : (
              <div className="text-center py-20 text-on-surface-variant">
                {t('home.emptyFeed')}
              </div>
            )}
          </section>
        )
      )}

      {/* Load More Button */}
      {hasMore && !isLoading && (
        <div className="mt-16 flex justify-center">
          <button 
            onClick={loadMore}
            className="flex items-center gap-2 px-8 py-3 border border-outline-variant/20 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all font-label tracking-widest text-sm uppercase"
          >
            <ChevronDown size={18} />
            {t('home.exploreMore')}
          </button>
        </div>
      )}

      {/* FAB for quick upload */}
      {(!user || user.level !== 'lv1') && (
        <button 
          onClick={handleFabClick}
          className="fixed bottom-8 right-8 bg-primary text-on-primary w-14 h-14 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 z-40 rounded-sm"
        >
          <Plus size={28} className="drop-shadow-md" />
        </button>
      )}

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditTarget(null);
        }} 
        onSuccess={handlePostCreated} 
        editPost={editTarget}
      />
    </main>
  );
}
