/**
 * 用户资料组件
 * 可复用的用户空间组件，通过用户id路由访问
 * 根据登录用户与目标用户的关系显示不同的界面
 */
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { getRolls, type RollListItem } from '../src/api/rolls';
import { getFilmStocks, type FilmStock } from '../src/api/film-stocks.ts';
import { createGear, getGear, updateGear, deleteGear, type Gear } from '../src/api/gear.ts';
import { get, post as apiPost, put, del } from '../src/api/client.ts';
import { getPosts, type PostListItem } from '../src/api/posts.ts';
import FilmStockManager from './FilmStockManager';
import GearForm from './GearForm';
import RollForm from './RollForm';
import ProfileEditForm from './ProfileEditForm';
import FeedCard from './FeedCard';
import CreatePostModal from './CreatePostModal';
import { commonBrands, brandMap, getBrandDisplayName, filterFilmStocks } from '../src/constants/brands';
import { 
  User, UserX, UserPlus, UserMinus, Pencil, Library, History, Camera, 
  Search, Calendar, Filter, FolderPlus, ChevronRight, PlusCircle, 
  ChevronDown, Maximize, Circle, Timer, Star, MessageSquare, Trash2 
} from 'lucide-react';

/** 用户资料类型 */
export interface UserProfileData {
  id: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  isFollowing: boolean;
  isOwner: boolean;
}

/** 格式化数字 */
function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

interface UserProfileProps {
  userId?: string;
}

export default function UserProfile({ userId: propUserId }: UserProfileProps) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isLoggedIn } = useAuth();

  const [activeTab, setActiveTab] = useState('album');
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [rolls, setRolls] = useState<RollListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [filmFilter, setFilmFilter] = useState('');

  // 动态模块相关
  const [userPosts, setUserPosts] = useState<PostListItem[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [editTargetPost, setEditTargetPost] = useState<PostListItem | null>(null);
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);

  // 新建相册模态框及表单状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoll, setEditingRoll] = useState<RollListItem | null>(null);
  const [rollForm, setRollForm] = useState<{ 
    title: string; 
    filmStock: string; 
    location: string; 
    camera: string; 
    lens: string; 
    shotDate: string; 
    endDate?: string; 
    format: string; 
    filmType: string; 
    tags: string[]; 
  }>({ 
    title: '', 
    filmStock: '', 
    location: '', 
    camera: '', 
    lens: '', 
    shotDate: new Date().toISOString().split('T')[0], 
    endDate: new Date().toISOString().split('T')[0], 
    format: '135', 
    filmType: 'COLOR_NEGATIVE',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 胶卷型号相关
  const [filmStocks, setFilmStocks] = useState<FilmStock[]>([]);
  const [isLoadingFilmStocks, setIsLoadingFilmStocks] = useState(false);
  const [filmStockSearch, setFilmStockSearch] = useState('');
  const [showFilmStockManagement, setShowFilmStockManagement] = useState(false);
  
  // 设备相关
  const [gear, setGear] = useState<Gear[]>([]);
  const [isLoadingGear, setIsLoadingGear] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'used' | 'using' | 'wanted'>('all');
  const [showAddGearModal, setShowAddGearModal] = useState(false);
  const [showEditGearModal, setShowEditGearModal] = useState(false);
  const [editingGear, setEditingGear] = useState<Gear | null>(null);
  const [gearForm, setGearForm] = useState({
    cameraModel: '',
    lensModels: [] as string[],
    lensType: 'interchangeable' as 'interchangeable' | 'fixed',
    status: 'using' as 'used' | 'using' | 'wanted',
    formats: [] as string[],
    shotCount: 0,
    shotCounts: {} as Record<string, number>,
    mount: '',
    externalUrl: '',
    review: '',
    rating: 0
  });
  const [currentLensInput, setCurrentLensInput] = useState('');
  const [gearImage, setGearImage] = useState<File | null>(null);
  
  const [addFilmStockForm, setAddFilmStockForm] = useState({
    brand: '',
    model: '',
    iso: 0,
    format: '135',
    filmType: 'COLOR_NEGATIVE',
    process: 'C-41'
  });
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };
  
  /** 处理编辑资料提交 */
  const handleEditProfileSubmit = (updatedProfile: any) => {
    setProfile(updatedProfile);
    setShowEditProfileModal(false);
    showToast('资料更新成功');
  };

  /** 确认对话框 */
  const showConfirm = (message: string, onConfirm: () => void) => {
    if (window.confirm(message)) {
      onConfirm();
    }
  };

  // 确定要查看的用户 ID：路由参数 > props > 当前登录用户
  const targetUserId = paramId || propUserId || currentUser?.id;

  /** 获取用户资料 */
  const fetchProfile = useCallback(async () => {
    if (!targetUserId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const result = await get<UserProfileData>(`/users/${targetUserId}`);
      if (result.success && result.data) {
        setProfile(result.data);
        // 如果不是本人，且当前在相册页，则自动切换到动态页
        if (!result.data.isOwner && activeTab === 'album') {
          setActiveTab('activity');
        }
      }
    } catch (err) {
      console.error('Fetch profile failed:', err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, activeTab]);

  /** 获取胶卷型号列表 */
  const fetchFilmStocks = useCallback(async () => {
    setIsLoadingFilmStocks(true);
    try {
      const result = await getFilmStocks();
      if (result.success && result.data) {
        setFilmStocks(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch film stocks:', err);
    } finally {
      setIsLoadingFilmStocks(false);
    }
  }, []);

  /** 获取设备列表 */
  const fetchGear = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoadingGear(true);
    try {
      // 获取当前状态的设备
      const status = selectedStatus === 'all' ? undefined : selectedStatus as 'used' | 'using' | 'wanted';
      const result = await getGear(status);
      if (result.success && result.data) {
        setGear(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch gear:', err);
    } finally {
      setIsLoadingGear(false);
    }
  }, [isLoggedIn, selectedStatus]);

  /** 处理创建设备 */
  const handleCreateGear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 导入图片压缩工具
      const { smartCompress } = await import('../src/utils/image-compress.ts');
      
      // 压缩设备照片为 webp 格式
      let compressedImage = gearImage;
      if (gearImage) {
        compressedImage = await smartCompress(gearImage);
      }
      
      // 将 lensModels 数组转换为字符串
      const submitData = {
        ...gearForm,
        lensModel: gearForm.lensModels.join(', ')
      };
      const res = await createGear(submitData, compressedImage as File | undefined);
      if (res.success) {
        setShowAddGearModal(false);
        setGearForm({
          cameraModel: '',
          lensModels: [],
          lensType: 'interchangeable',
          status: 'using',
          formats: [],
          shotCount: 0,
          shotCounts: {},
          mount: '',
          externalUrl: '',
          review: '',
          rating: 0
        });
        setCurrentLensInput('');
        setGearImage(null);
        await fetchGear();
        showToast('设备创建成功');
      } else {
        showToast('创建失败，请重试', 'error');
      }
    } catch (err) {
      console.error('Failed to create gear:', err);
      showToast('网络错误', 'error');
    }
  };

  /** 处理更新设备 */
  const handleUpdateGear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gearForm.cameraModel.trim() || isSubmitting || !editingGear) return;
    
    setIsSubmitting(true);
    try {
      // 导入图片压缩工具
      const { smartCompress } = await import('../src/utils/image-compress.ts');
      
      // 压缩设备照片为 webp 格式
      let compressedImage = gearImage;
      if (gearImage) {
        compressedImage = await smartCompress(gearImage);
      }
      
      // 将 lensModels 数组转换为字符串
      const submitData = {
        ...gearForm,
        lensModel: gearForm.lensModels.join(', ')
      };
      const res = await updateGear(editingGear.id, submitData, compressedImage as File | undefined);
      if (res.success) {
        setShowEditGearModal(false);
        setEditingGear(null);
        setGearForm({
          cameraModel: '',
          lensModels: [],
          lensType: 'interchangeable',
          status: 'using',
          formats: [],
          shotCount: 0,
          shotCounts: {},
          mount: '',
          externalUrl: '',
          review: '',
          rating: 0
        });
        setCurrentLensInput('');
        setGearImage(null);
        await fetchGear();
        showToast('设备更新成功');
      } else {
        showToast('更新失败，请重试', 'error');
      }
    } catch (err) {
      console.error('Failed to update gear:', err);
      showToast('网络错误', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 处理删除设备 */
  const handleDeleteGear = async (gearId: string) => {
    showConfirm('确定要删除这个设备吗？', async () => {
      try {
        const res = await deleteGear(gearId);
        if (res.success) {
          await fetchGear();
          showToast('设备删除成功');
        } else {
          showToast('删除失败，请重试', 'error');
        }
      } catch (err) {
        console.error('Failed to delete gear:', err);
        showToast('网络错误', 'error');
      }
    });
  };

  /** 获取胶卷列表 */
  const fetchRolls = useCallback(async () => {
    try {
      const params: Record<string, string | number | undefined> = {};
      if (targetUserId) params.userId = targetUserId;
      if (yearFilter) params.year = yearFilter;
      if (filmFilter) params.filmType = filmFilter;
      if (searchQuery) params.tag = searchQuery;

      const result = await getRolls(params as Record<string, string>);
      if (result.success && result.data) {
        setRolls(result.data);
      } else {
        setRolls([]);
      }
    } catch {
      setRolls([]);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, yearFilter, filmFilter, searchQuery]);

  /** 获取用户动态 */
  const fetchUserPosts = useCallback(async (pageNum: number) => {
    if (!targetUserId) return;
    setIsLoadingPosts(true);
    try {
      const result = await getPosts(pageNum, 12, undefined, targetUserId);
      if (result.success && result.data && result.data.length > 0) {
        if (pageNum === 1) {
          setUserPosts(result.data);
        } else {
          setUserPosts(prev => [...prev, ...result.data!]);
        }
        setHasMorePosts(result.pagination ? pageNum < result.pagination.totalPages : false);
      } else {
        if (pageNum === 1) {
          setUserPosts([]);
          setHasMorePosts(false);
        }
      }
    } catch {
      if (pageNum === 1) setUserPosts([]);
      setHasMorePosts(false);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [targetUserId]);

  const loadMorePosts = () => {
    const nextPage = postsPage + 1;
    setPostsPage(nextPage);
    fetchUserPosts(nextPage);
  };

  const handlePostDeleted = (id: string) => {
    setUserPosts(prev => prev.filter(p => p.id !== id));
  };

  const handlePostEdited = () => {
    // 重新获取第一页的数据更新
    setPostsPage(1);
    fetchUserPosts(1);
  };

  // 初始化数据
  React.useEffect(() => {
    fetchProfile();
    fetchRolls();
    fetchFilmStocks();
    fetchGear();
  }, [fetchProfile, fetchRolls, fetchFilmStocks, fetchGear]);

  // 当切换到动态页时加载动态数据
  React.useEffect(() => {
    if (activeTab === 'activity') {
      setPostsPage(1);
      fetchUserPosts(1);
    }
  }, [activeTab, fetchUserPosts]);

  // 监听路由变化，当从其他页面返回时重新获取相册列表
  React.useEffect(() => {
    // 使用 setInterval 定期检查路由变化，确保相册列表数据保持最新
    const interval = setInterval(() => {
      fetchRolls();
    }, 5000); // 每5秒检查一次

    return () => {
      clearInterval(interval);
    };
  }, [fetchRolls]);

  /** 关注/取消关注 */
  const handleFollow = async () => {
    if (!isLoggedIn || !targetUserId) return;
    try {
      if (profile?.isFollowing) {
        await del(`/users/${targetUserId}/follow`);
        setProfile(prev => prev ? { ...prev, isFollowing: false, followersCount: prev.followersCount - 1 } : null);
      } else {
        await apiPost(`/users/${targetUserId}/follow`);
        setProfile(prev => prev ? { ...prev, isFollowing: true, followersCount: prev.followersCount + 1 } : null);
      }
    } catch {
      // 操作失败静默处理
    }
  };

  /** 处理创建新相册 */
  const handleCreateRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollForm.title.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // 构建请求数据，保持与后端API兼容
      const requestData = {
        ...rollForm,
        shotDate: rollForm.shotDate // 向后兼容，使用开始时间作为主要拍摄日期
      };
      
      const res = await apiPost<{id: string}>('/rolls', requestData);
      if (res.success && res.data?.id) {
        setShowCreateModal(false);
        setRollForm({ 
          title: '', 
          filmStock: '', 
          location: '', 
          camera: '', 
          lens: '', 
          shotDate: new Date().toISOString().split('T')[0], 
          endDate: new Date().toISOString().split('T')[0], 
          format: '135', 
          filmType: 'COLOR_NEGATIVE',
          tags: [] as string[]
        });
        setTagInput('');
        // 创建成功后直接跳转到胶卷详情页，方便立刻上传照片
        navigate(`/roll/${res.data.id}`);
      } else {
        showToast('创建失败，请重试', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('网络错误', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 处理编辑相册 */
  const handleUpdateRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollForm.title.trim() || isSubmitting || !editingRoll) return;
    
    setIsSubmitting(true);
    try {
      // 构建请求数据，保持与后端API兼容
      const requestData = {
        ...rollForm,
        shotDate: rollForm.shotDate // 向后兼容，使用开始时间作为主要拍摄日期
      };
      
      const res = await put<{id: string}>(`/rolls/${editingRoll.id}`, requestData);
      if (res.success) {
        setShowEditModal(false);
        setEditingRoll(null);
        setRollForm({ 
          title: '', 
          filmStock: '', 
          location: '', 
          camera: '', 
          lens: '', 
          shotDate: new Date().toISOString().split('T')[0], 
          endDate: new Date().toISOString().split('T')[0], 
          format: '135', 
          filmType: 'COLOR_NEGATIVE',
          tags: [] as string[]
        });
        setTagInput('');
        // 更新成功后重新获取胶卷列表
        await fetchRolls();
        showToast('相册更新成功');
      } else {
        showToast('更新失败，请重试', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('网络错误', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 打开编辑相册模态框 */
  const handleEditRoll = (roll: RollListItem) => {
    setEditingRoll(roll);
    setRollForm({
      title: roll.title,
      filmStock: roll.filmStock,
      location: roll.location,
      camera: roll.camera,
      lens: roll.lens,
      shotDate: roll.shotDate,
      endDate: roll.shotDate, // 假设endDate与shotDate相同，实际应用中可能需要从API获取
      format: roll.format,
      filmType: roll.filmType,
      tags: roll.tags
    });
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-8 pt-12 pb-24 flex items-center justify-center min-h-[60vh]">
        <div className="text-on-surface-variant font-label text-sm tracking-widest uppercase animate-pulse">加载中...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="max-w-7xl mx-auto px-8 pt-12 pb-24 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <UserX size={64} className="text-on-surface-variant/20" />
        <div className="text-on-surface-variant font-label text-sm tracking-widest uppercase">未找到用户或未登录</div>
        {!currentUser && (
          <a href="/login" className="bg-primary text-on-primary px-8 py-2 text-xs font-bold hover:bg-primary-dim transition-colors uppercase tracking-widest">
            去登录
          </a>
        )}
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-8 pt-12 pb-24">
      {/* Profile Header */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-12 mb-20">
        {/* Left: Avatar */}
        <div className="relative group shrink-0">
          <div className="w-48 h-48 overflow-hidden bg-surface-container-highest flex items-center justify-center">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.nickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={80} className="text-on-surface-variant/30" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 bg-primary text-on-primary px-2 py-0.5 text-[10px] font-label uppercase tracking-widest">
            ARTIST
          </div>
        </div>

        {/* Center-Left: Name & Bio & Buttons */}
        <div className="flex-1 flex flex-col gap-6 text-center md:text-left">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <h1 className="font-headline text-5xl font-bold text-on-surface">{profile?.nickname || '用户'}</h1>
              <span className="text-on-surface-variant font-label text-xs tracking-widest mb-1">ID: {profile?.id}</span>
            </div>
            <p className="font-body text-on-surface-variant max-w-xl leading-relaxed text-sm md:text-base">
              {profile?.bio || '这个人很懒，什么都没写。'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            {profile?.isOwner ? (
              <button 
                className="bg-primary text-on-primary px-8 py-2 text-xs font-bold hover:bg-primary-dim transition-colors flex items-center gap-2 uppercase tracking-widest"
                onClick={() => setShowEditProfileModal(true)}
              >
                <Pencil size={14} />
                编辑资料
              </button>
            ) : (
              <>
                <button
                  className={`px-8 py-2 text-xs font-bold transition-colors flex items-center gap-2 uppercase tracking-widest ${
                    profile?.isFollowing
                      ? 'bg-surface-container-highest text-on-surface border border-outline-variant/20 hover:bg-surface-bright'
                      : 'bg-primary text-on-primary hover:bg-primary-dim'
                  }`}
                >
                  {profile?.isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
                  {profile?.isFollowing ? '已关注' : '关注'}
                </button>
                <button 
                  onClick={() => navigate(`/messages/${targetUserId}`)}
                  className="bg-surface-container-highest text-on-surface px-8 py-2 text-xs font-bold hover:bg-surface-bright transition-colors border border-outline-variant/20 uppercase tracking-widest flex items-center gap-2"
                >
                  <MessageSquare size={14} />
                  发送消息
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex md:flex-col justify-center gap-12 md:gap-8 md:pl-12 md:border-l border-outline-variant/20 font-label">
          <div className="flex md:flex-row gap-12 items-center">
            <div className="flex flex-col md:items-start items-center gap-1">
              <span className="text-2xl font-headline font-bold text-on-surface">{formatCount(profile?.followersCount ?? 0)}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">粉丝数</span>
            </div>
            <div className="flex flex-col md:items-start items-center gap-1">
              <span className="text-2xl font-headline font-bold text-on-surface">{formatCount(profile?.followingCount ?? 0)}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">关注数</span>
            </div>
            <div className="flex flex-col md:items-start items-center gap-1">
              <span className="text-2xl font-headline font-bold text-on-surface">{formatCount(profile?.likesCount ?? 0)}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">获赞数</span>
            </div>
          </div>
        </div>
      </header>

      {/* Functional Tabs */}
      <div className="mb-8 border-b border-outline-variant/15 overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex gap-12 min-w-max px-px">
          {/* 只对自己显示相册标签 */}
          {profile?.isOwner && (
            <button 
              onClick={() => setActiveTab('album')}
              className={`pb-4 text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-2 transition-all relative ${activeTab === 'album' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <Library size={18} />
              <span>相册</span>
              {activeTab === 'album' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in slide-in-from-left-2 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" />}
            </button>
          )}
          <button 
            onClick={() => setActiveTab('activity')}
            className={`pb-4 text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-2 transition-all relative ${activeTab === 'activity' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <History size={18} />
            <span>动态</span>
            {activeTab === 'activity' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in slide-in-from-left-2 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" />}
          </button>
          {/* 只对自己显示设备标签 */}
          {profile?.isOwner && (
            <button 
              onClick={() => setActiveTab('gear')}
              className={`pb-4 text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-2 transition-all relative ${activeTab === 'gear' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <Camera size={18} />
              <span>设备</span>
              {activeTab === 'gear' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in slide-in-from-left-2 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" />}
            </button>
          )}
        </div>
      </div>

      {/* Filters & Actions Row */}
      {activeTab === 'album' && profile?.isOwner && (
        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索标签..." 
                className="bg-surface-container-low border border-outline-variant/10 focus:border-primary/50 focus:bg-surface-container-low/50 text-sm py-2 pl-10 pr-4 w-64 placeholder:text-on-surface-variant/30 transition-all outline-none rounded-sm text-on-surface"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 border border-outline-variant/10 rounded-sm hover:border-outline-variant/30 transition-colors">
                <Calendar size={14} className="text-on-surface-variant/40" />
                <select 
                  aria-label="年份筛选"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-label font-bold focus:ring-0 cursor-pointer pr-8 uppercase tracking-[0.1em] text-on-surface-variant outline-none"
                >
                  <option value="">时间: 全部</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 border border-outline-variant/10 rounded-sm hover:border-outline-variant/30 transition-colors">
                <Filter size={14} className="text-on-surface-variant/40" />
                <select 
                  aria-label="胶片类型筛选"
                  value={filmFilter}
                  onChange={(e) => setFilmFilter(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-label font-bold focus:ring-0 cursor-pointer pr-8 uppercase tracking-[0.1em] text-on-surface-variant outline-none"
                >
                  <option value="">胶片: 全部</option>
                  <option value="COLOR_NEGATIVE">彩色负片</option>
                  <option value="BW_NEGATIVE">黑白负片</option>
                  <option value="COLOR_POSITIVE">彩色正片</option>
                </select>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-on-primary px-6 py-2.5 text-xs font-bold hover:bg-primary-dim transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-[0.2em] rounded-sm active:scale-95"
          >
            <FolderPlus size={16} />
            新建相册
          </button>
        </div>
      )}

      {/* List View of Film Rolls (Film Strips) */}
      {activeTab === 'album' && (
        rolls.length > 0 ? (
          <div className="space-y-16">
            {rolls.map((roll, index) => (
              <div key={roll.id} className="group">
                {/* Roll Header: Responsive layout */}
                <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-4 px-2 gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 
                      className="text-xl md:text-2xl font-headline font-bold text-on-surface cursor-pointer hover:text-primary transition-colors leading-tight"
                      onClick={() => navigate(`/roll/${roll.id}`)}
                    >
                      卷号 #{String(rolls.length - index).padStart(3, '0')}: {roll.title}
                    </h2>
                    <span className="px-2 py-0.5 bg-secondary-container text-secondary text-[10px] font-label rounded-sm tracking-widest whitespace-nowrap">{roll.filmStock}</span>
                      {profile?.isOwner && (
                        <button
                          onClick={() => handleEditRoll(roll)}
                          className="text-on-surface-variant hover:text-primary transition-colors"
                          title="编辑相册"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant font-label text-xs md:text-sm tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
                    <Calendar size={14} />
                    {roll.shotDate} — {roll.location}
                  </div>
                </div>

                <div className="relative overflow-hidden bg-surface-container-lowest p-3 md:p-6 group-hover:bg-surface-container-low transition-colors duration-500 rounded-sm">
                  <div className="absolute top-2 left-0 w-full h-3 perforation-pattern opacity-10"></div>
                  
                  {/* Mobile Layout: Single Cover Photo */}
                  <div className="block md:hidden w-full aspect-[4/3] bg-surface-container overflow-hidden relative cursor-pointer" onClick={() => navigate(`/roll/${roll.id}`)}>
                    {roll.frames && roll.frames.length > 0 ? (
                      <>
                        <img 
                          src={roll.frames[0].previewUrl || roll.frames[0].imageUrl} 
                          alt={roll.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                          <div className="flex items-center gap-2 text-white/90 text-[10px] font-label tracking-widest uppercase">
                            <Library size={14} />
                            查看该卷共 {roll.frames.length} 张底片
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-xs font-label">无照片</div>
                    )}
                  </div>

                  {/* Desktop Layout: Film Strip (Current Style) */}
                  <div className="hidden md:flex gap-4 items-center">
                    {roll.frames && roll.frames.length > 0 ? (
                      <>
                        {roll.frames.slice(0, 4).map((frame) => (
                          <div 
                            key={frame.id} 
                            className="flex-1 aspect-[3/2] bg-surface-container border border-outline-variant/15 relative group/frame cursor-pointer overflow-hidden"
                            onClick={() => navigate(`/roll/${roll.id}`)}
                          >
                            <img 
                              src={frame.previewUrl || frame.imageUrl} 
                              alt={`Frame ${frame.frameNumber}`} 
                              className="w-full h-full object-cover transition-all duration-700 hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 right-2 text-[10px] font-label text-white/50">{frame.frameNumber}</div>
                          </div>
                        ))}
                        {/* 添加占位元素以保持高度一致 */}
                        {Array.from({ length: Math.max(0, 4 - roll.frames.length) }).map((_, index) => (
                          <div 
                            key={`placeholder-${index}`} 
                            className="flex-1 aspect-[3/2] bg-surface-container/50 border border-outline-variant/30"
                          ></div>
                        ))}
                        <div 
                          className="flex-none w-10 flex items-center justify-center cursor-pointer group/more hover:translate-x-0.5 transition-transform"
                          onClick={() => navigate(`/roll/${roll.id}`)}
                          title="查看完整胶卷"
                        >
                          <ChevronRight size={24} className="text-on-surface-variant group-hover/more:text-primary transition-colors" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center text-on-surface-variant text-sm font-label cursor-pointer hover:text-primary transition-colors"
                           onClick={() => navigate(`/roll/${roll.id}`)}>
                        这卷胶卷还没有照片，点击进入上传底片
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-0 w-full h-3 perforation-pattern opacity-10"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant bg-surface-container-lowest border border-outline-variant/10 border-dashed">
            <Library size={64} className="mb-6 opacity-30 mx-auto" />
            <p className="font-headline font-bold text-xl mb-2 text-on-surface">相册空空如也</p>
            {profile?.isOwner ? (
              <>
                <p className="font-body text-sm mb-8 opacity-70">你还没有开启你的第一卷胶卷，立即创建相册并上传底片吧！</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary text-on-primary px-8 py-3 text-sm font-bold hover:bg-primary-dim transition-colors flex items-center gap-2 uppercase tracking-widest"
                >
                  <PlusCircle size={16} />
                  开启第一卷胶卷
                </button>
              </>
            ) : (
              <p className="font-body text-sm opacity-70">该用户还没有发布任何公开的胶卷哦。</p>
            )}
          </div>
        )
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <section className="max-w-[1200px] mx-auto space-y-6 pt-4">
          {isLoadingPosts && postsPage === 1 ? (
            <div className="flex justify-center py-20 animate-pulse">
              <span className="text-on-surface-variant font-label text-sm tracking-widest uppercase">加载中...</span>
            </div>
          ) : userPosts.length > 0 ? (
            <>
              {userPosts.map(post => (
                <FeedCard 
                  key={post.id} 
                  post={post} 
                  onClick={() => navigate(`/post/${post.id}`)} 
                  onDelete={handlePostDeleted}
                  onEdit={(p) => {
                    setEditTargetPost(p);
                    setIsEditPostModalOpen(true);
                  }}
                />
              ))}
              {hasMorePosts && !isLoadingPosts && (
                <div className="mt-16 flex justify-center pb-8">
                  <button 
                    onClick={loadMorePosts}
                    className="flex items-center gap-2 px-8 py-3 border border-outline-variant/20 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all font-label tracking-widest text-sm uppercase"
                  >
                    <ChevronDown size={18} />
                    加载更多
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
              <History size={48} className="mb-4 opacity-30" />
              <p className="font-body text-sm">暂无动态</p>
            </div>
          )}
        </section>
      )}

      {/* Gear Tab - 设备管理 */}
      {activeTab === 'gear' && (
        <div className="space-y-8">
          {/* 设备筛选和添加按钮 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 border border-outline-variant/10 rounded-sm hover:border-outline-variant/30 transition-colors">
                <Filter size={14} className="text-on-surface-variant/40" />
                <select 
                  aria-label="设备状态筛选"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'used' | 'using' | 'wanted')}
                  className="bg-transparent border-none text-[10px] font-label font-bold focus:ring-0 cursor-pointer pr-8 uppercase tracking-[0.1em] text-on-surface-variant outline-none"
                >
                  <option value="all">状态: 全部</option>
                  <option value="using">正在使用</option>
                  <option value="used">使用过的</option>
                  <option value="wanted">想要的</option>
                </select>
              </div>
            </div>
            
            {profile?.isOwner && (
              <button 
                onClick={() => setShowAddGearModal(true)}
                className="bg-primary text-on-primary px-6 py-2.5 text-xs font-bold hover:bg-primary-dim transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-[0.2em] rounded-sm active:scale-95"
              >
                <PlusCircle size={16} />
                添加设备
              </button>
            )}
          </div>

          {/* 设备列表 */}
          {isLoadingGear ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-on-surface-variant font-label text-sm tracking-widest uppercase animate-pulse">加载中...</div>
            </div>
          ) : gear.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gear.map((item) => (
                <article 
                  key={item.id} 
                  className="relative group bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)]"
                >
                  {/* 背景泛光效果 */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />

                  {/* 设备图片与叠加层 */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#1a1a1a]">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.cameraModel}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/10 group-hover:text-white/20 transition-colors">
                        <Camera size={64} strokeWidth={1} />
                      </div>
                    )}
                    
                    {/* 渐变遮罩层，让图片底部过渡到文字背景 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/40 to-transparent pointer-events-none" />
                    
                    {/* 状态徽章 */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full backdrop-blur-md border ${
                        item.status === 'using' ? 'bg-primary/20 text-primary border-primary/30' :
                        item.status === 'used' ? 'bg-white/10 text-white/80 border-white/20' :
                        'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'using' ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(255,165,0,0.8)]' : 'bg-current'}`}></span>
                        {item.status === 'using' ? '现役主摄' : item.status === 'used' ? '曾经拥有' : '愿望清单'}
                      </span>
                    </div>

                    {/* 相机型号贴合在图片底部 */}
                    <div className="absolute bottom-0 left-0 w-full p-5 z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="font-headline text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-md truncate">
                        {item.cameraModel}
                      </h3>
                      {item.lensModel && (
                        <p className="text-white/60 text-sm font-medium mt-1 truncate max-w-full block" title={item.lensModel}>
                          {item.lensModel}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* 设备信息参数区 */}
                  <div className="p-5 relative z-10 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                      {item.formats.length > 0 && (
                        <div className="px-2.5 py-1 rounded bg-white/5 border border-white/5 flex items-center gap-1.5 text-xs font-medium text-white/70">
                          <Maximize size={14} />
                          {item.formats.join(', ')}
                        </div>
                      )}
                      {item.mount && (
                        <div className="px-2.5 py-1 rounded bg-white/5 border border-white/5 flex items-center gap-1.5 text-xs font-medium text-white/70">
                          <Circle size={14} />
                          {item.mount}
                        </div>
                      )}
                      {item.shotCount > 0 && (
                        <div className="px-2.5 py-1 rounded bg-white/5 border border-white/5 flex items-center gap-1.5 text-xs font-medium text-white/70">
                          <Timer size={14} />
                          {item.shotCount} 卷
                        </div>
                      )}
                    </div>
                    
                    {/* 评价与星星并排 */}
                    {(item.review || item.rating > 0) && (
                      <div className="flex items-center justify-between pt-4 border-t border-white/5 min-h-[44px]">
                        <p className="text-sm text-white/50 italic truncate pr-4">
                          {item.review ? `"${item.review}"` : ''}
                        </p>
                        
                        {item.rating > 0 && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={16}
                                className={`${
                                  i < item.rating 
                                    ? 'text-yellow-400 fill-current drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' 
                                    : 'text-white/10'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 操作按钮 (只有Hover时才完整显现，默认半透明) */}
                    {profile?.isOwner && (
                      <div className="flex gap-2 pt-2 transition-opacity duration-300 opacity-30 group-hover:opacity-100">
                        <button 
                          onClick={() => {
                            setEditingGear(item);
                            // 将 lensModel 字符串转换为 lensModels 数组
                            const lensModels = item.lensModel ? item.lensModel.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                            // 使用已有的 shotCounts 或初始化
                            const shotCounts: Record<string, number> = item.shotCounts || {};
                            // 确保所有格式都有值
                            item.formats.forEach((format: string) => {
                              if (shotCounts[format] === undefined) {
                                shotCounts[format] = item.shotCount || 0;
                              }
                            });
                            setGearForm({
                              cameraModel: item.cameraModel,
                              lensModels: lensModels,
                              lensType: item.lensType,
                              status: item.status,
                              formats: item.formats,
                              shotCount: item.shotCount,
                              shotCounts: shotCounts,
                              mount: item.mount,
                              externalUrl: item.externalUrl,
                              review: item.review,
                              rating: item.rating
                            });
                            setCurrentLensInput('');
                            setGearImage(null);
                            setShowEditGearModal(true);
                          }}
                          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white/80 hover:text-white text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Pencil size={14} />
                          编辑
                        </button>
                        <button 
                          onClick={() => handleDeleteGear(item.id)}
                          className="flex-1 bg-white/5 hover:bg-red-500/20 border border-white/5 hover:border-red-500/30 text-white/80 hover:text-red-400 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant bg-surface-container-lowest border border-outline-variant/10 border-dashed">
              <Camera size={64} className="mb-6 opacity-30" />
              <p className="font-headline font-bold text-xl mb-2 text-on-surface">暂无设备</p>
              {profile?.isOwner ? (
                <>
                  <p className="font-body text-sm mb-8 opacity-70">你还没有添加任何拍摄设备，立即添加你的第一台设备吧！</p>
                  <button 
                    onClick={() => setShowAddGearModal(true)}
                    className="bg-primary text-on-primary px-8 py-3 text-sm font-bold hover:bg-primary-dim transition-colors flex items-center gap-2 uppercase tracking-widest"
                  >
                    <PlusCircle size={16} />
                    添加设备
                  </button>
                </>
              ) : (
                <p className="font-body text-sm opacity-70">该用户还没有添加任何设备哦。</p>
              )}
            </div>
          )}

          {/* 添加设备模态框 */}
          {showAddGearModal && profile?.isOwner && (
            <GearForm 
              isEditing={false}
              editingGear={null}
              onSubmit={handleCreateGear}
              onCancel={() => {
                setShowAddGearModal(false);
                setGearForm({
                  cameraModel: '',
                  lensModels: [],
                  lensType: 'interchangeable',
                  status: 'using',
                  formats: [],
                  shotCount: 0,
                  shotCounts: {},
                  mount: '',
                  externalUrl: '',
                  review: '',
                  rating: 0
                });
                setCurrentLensInput('');
                setGearImage(null);
              }}
              gearForm={gearForm}
              setGearForm={setGearForm}
              gearImage={gearImage}
              setGearImage={setGearImage}
              currentLensInput={currentLensInput}
              setCurrentLensInput={setCurrentLensInput}
            />
          )}

          {/* 编辑设备模态框 */}
          {showEditGearModal && editingGear && profile?.isOwner && (
            <GearForm 
              isEditing={true}
              editingGear={editingGear}
              onSubmit={handleUpdateGear}
              onCancel={() => {
                setShowEditGearModal(false);
                setEditingGear(null);
                setGearForm({
                  cameraModel: '',
                  lensModels: [],
                  lensType: 'interchangeable',
                  status: 'using',
                  formats: [],
                  shotCount: 0,
                  shotCounts: {},
                  mount: '',
                  externalUrl: '',
                  review: '',
                  rating: 0
                });
                setCurrentLensInput('');
                setGearImage(null);
              }}
              gearForm={gearForm}
              setGearForm={setGearForm}
              gearImage={gearImage}
              setGearImage={setGearImage}
              currentLensInput={currentLensInput}
              setCurrentLensInput={setCurrentLensInput}
            />
          )}



        </div>
      )}

      {/* 编辑资料模态框 */}
      {showEditProfileModal && profile?.isOwner && (
        <ProfileEditForm
          profile={profile}
          onSubmit={handleEditProfileSubmit}
          onCancel={() => setShowEditProfileModal(false)}
        />
      )}

      {/* 新建相册模态框 */}
      {showCreateModal && profile?.isOwner && (
        <RollForm
          isEditing={false}
          editingRoll={null}
          onSubmit={handleCreateRoll}
          onCancel={() => {
            setShowCreateModal(false);
            setRollForm({ 
              title: '', 
              filmStock: '', 
              location: '', 
              camera: '', 
              lens: '', 
              shotDate: new Date().toISOString().split('T')[0], 
              endDate: new Date().toISOString().split('T')[0], 
              format: '135', 
              filmType: 'COLOR_NEGATIVE',
              tags: [] as string[]
            });
            setTagInput('');
          }}
          rollForm={rollForm}
          setRollForm={setRollForm}
          tagInput={tagInput}
          setTagInput={setTagInput}
          isSubmitting={isSubmitting}
          filmStocks={filmStocks}
          isLoadingFilmStocks={isLoadingFilmStocks}
          showFilmStockManagement={showFilmStockManagement}
          setShowFilmStockManagement={setShowFilmStockManagement}
          filmStockSearch={filmStockSearch}
          setFilmStockSearch={setFilmStockSearch}
          addFilmStockForm={addFilmStockForm}
          setAddFilmStockForm={setAddFilmStockForm}
          gearList={gear}
          isLoadingGear={isLoadingGear}
        />
      )}

      {/* 编辑相册模态框 */}
      {showEditModal && editingRoll && profile?.isOwner && (
        <RollForm
          isEditing={true}
          editingRoll={editingRoll}
          onSubmit={handleUpdateRoll}
          onCancel={() => {
            setShowEditModal(false);
            setEditingRoll(null);
            setRollForm({ 
              title: '', 
              filmStock: '', 
              location: '', 
              camera: '', 
              lens: '', 
              shotDate: new Date().toISOString().split('T')[0], 
              endDate: new Date().toISOString().split('T')[0], 
              format: '135', 
              filmType: 'COLOR_NEGATIVE',
              tags: [] as string[]
            });
            setTagInput('');
          }}
          rollForm={rollForm}
          setRollForm={setRollForm}
          tagInput={tagInput}
          setTagInput={setTagInput}
          isSubmitting={isSubmitting}
          filmStocks={filmStocks}
          isLoadingFilmStocks={isLoadingFilmStocks}
          showFilmStockManagement={showFilmStockManagement}
          setShowFilmStockManagement={setShowFilmStockManagement}
          filmStockSearch={filmStockSearch}
          setFilmStockSearch={setFilmStockSearch}
          addFilmStockForm={addFilmStockForm}
          setAddFilmStockForm={setAddFilmStockForm}
          gearList={gear}
          isLoadingGear={isLoadingGear}
        />
      )}

      {/* 胶卷型号管理模态框 */}
      {showFilmStockManagement && profile?.isOwner && (
        <FilmStockManager
          filmStocks={filmStocks}
          filmStockSearch={filmStockSearch}
          setFilmStockSearch={setFilmStockSearch}
          addFilmStockForm={addFilmStockForm}
          setAddFilmStockForm={setAddFilmStockForm}
          onClose={() => setShowFilmStockManagement(false)}
        />
      )}

      {/* Toast 提示 */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 text-sm font-body ${toast.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {toast.message}
        </div>
      )}

      {/* Edit Post Modal */}
      {isEditPostModalOpen && profile?.isOwner && (
        <CreatePostModal 
          isOpen={isEditPostModalOpen} 
          onClose={() => {
            setIsEditPostModalOpen(false);
            setEditTargetPost(null);
          }}
          onSuccess={handlePostEdited}
          editPost={editTargetPost}
        />
      )}
    </main>
  );
}