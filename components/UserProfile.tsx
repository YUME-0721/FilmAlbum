/**
 * 用户资料组件
 * 可复用的用户空间组件，通过用户id路由访问
 * 根据登录用户与目标用户的关系显示不同的界面
 */
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { getRolls, reorderRolls, type RollListItem } from '../src/api/rolls';
import { getFilmStocks, type FilmStock } from '../src/api/film-stocks.ts';
import { useTranslation } from '../src/hooks/useTranslation';
import { useSettings } from '../src/context/SettingsContext';
import { createGear, getGear, updateGear, deleteGear, type Gear } from '../src/api/gear.ts';
import { get, post as apiPost, put, del } from '../src/api/client.ts';
import { getPosts, type PostListItem } from '../src/api/posts.ts';
import FilmStockManager from './FilmStockManager';
import GearForm from './GearForm';
import RollForm from './RollForm';
import ProfileEditForm from './ProfileEditForm';
import FeedCard from './FeedCard';
import CreatePostModal from './CreatePostModal';
import FollowListModal from './FollowListModal';
import { motion, AnimatePresence } from 'motion/react';
import { commonBrands, brandMap, getBrandDisplayName, filterFilmStocks } from '../src/constants/brands';
import { 
  User, UserX, UserPlus, UserMinus, Pencil, Library, History, Camera, 
  Search, Calendar, Filter, FolderPlus, ChevronRight, PlusCircle, 
  ChevronDown, Maximize, Circle, Timer, Star, MessageSquare, Trash2,
  ArrowUp, ArrowDown
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
  const { t } = useTranslation();
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isLoggedIn, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { lv2RollLimit, filmTypes, rollFormats } = useSettings();

  const [activeTab, setActiveTab] = useState('album');
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [rolls, setRolls] = useState<RollListItem[]>([]);
  // NOTE: allRolls 保存未筛选的全量相册，将年份加层与筛选结果解耦
  const [allRolls, setAllRolls] = useState<RollListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [filmFilter, setFilmFilter] = useState('');

  // NOTE: 从全量相册中动态提取年份，避免写死固定选项
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    allRolls.forEach(roll => {
      if (roll.shotDate) {
        const year = roll.shotDate.slice(0, 4);
        if (year && /^\d{4}$/.test(year)) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a)); // 降序排列
  }, [allRolls]);

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
    format: rollFormats?.[0]?.format || '135', 
    filmType: filmTypes?.[0] || 'COLOR_NEGATIVE',
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
    format: rollFormats?.[0]?.format || '135',
    filmType: filmTypes?.[0] || 'COLOR_NEGATIVE',
    process: 'C-41'
  });
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  
  // 关注/粉丝列表相关
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };
  
  /** 处理编辑资料提交 */
  const handleEditProfileSubmit = (updatedProfile: any) => {
    setProfile(updatedProfile);
    setShowEditProfileModal(false);
    showToast(t('profile.editSuccess'));
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
    // 如果认证还在加载，先不处理，等待认证完成
    if (authLoading) return;

    if (!targetUserId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await get<UserProfileData>(`/users/${targetUserId}`);
      if (result.success && result.data) {
        setProfile(result.data);
        // 如果不是本人，且当前在相册页，则自动切换到动态页
        if (!result.data.isOwner && activeTab === 'album') {
          setActiveTab('post');
        }
      }
    } catch (err) {
      console.error('Fetch profile failed:', err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, activeTab, authLoading]);

  // 处理锚点跳转
  React.useEffect(() => {
    if (!isLoading && !authLoading && location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        // 给一点延迟确保渲染完成
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, authLoading, location.hash]);

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
        showToast(t('profile.gear.createSuccess'));
      } else {
        showToast(res.error || t('common.error'), 'error');
      }
    } catch (err) {
      console.error('Failed to create gear:', err);
      showToast(err instanceof Error ? err.message : t('common.error'), 'error');
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
        showToast(t('profile.gear.updateSuccess'));
      } else {
        showToast(res.error || t('common.error'), 'error');
      }
    } catch (err) {
      console.error('Failed to update gear:', err);
      showToast(err instanceof Error ? err.message : t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 处理删除设备 */
  const handleDeleteGear = async (gearId: string) => {
    showConfirm(t('profile.gear.deleteConfirm'), async () => {
      try {
        const res = await deleteGear(gearId);
        if (res.success) {
          await fetchGear();
          showToast(t('profile.gear.deleteSuccess'));
        } else {
          showToast(t('common.error'), 'error');
        }
      } catch (err) {
        console.error('Failed to delete gear:', err);
        showToast(t('common.error'), 'error');
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
        // NOTE: 只有在无筛选条件时才更新全量数据，保证年份下拉型始终显示所有年份
        if (!yearFilter && !filmFilter && !searchQuery) {
          setAllRolls(result.data);
        }
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
    if (activeTab === 'post') {
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
          format: rollFormats?.[0]?.format || '135', 
          filmType: filmTypes?.[0] || 'COLOR_NEGATIVE',
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

  /** 处理相册排序移动 */
  const handleMoveRoll = async (index: number, direction: 'up' | 'down') => {
    const newRolls = [...rolls];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= rolls.length) return;
    
    // 乐观更新
    [newRolls[index], newRolls[target]] = [newRolls[target], newRolls[index]];
    setRolls(newRolls);
    
    try {
      await reorderRolls(newRolls.map(r => r.id));
    } catch (error) {
      console.error('Failed to reorder rolls:', error);
      showToast('排序更新失败', 'error');
    }
  };

  if (isLoading || authLoading) {
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
                {t('profile.editProfile')}
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
                  {profile?.isFollowing ? t('profile.followed') : t('profile.follow')}
                </button>
                <button 
                  onClick={() => navigate(`/messages/${targetUserId}`)}
                  className="bg-surface-container-highest text-on-surface px-8 py-2 text-xs font-bold hover:bg-surface-bright transition-colors border border-outline-variant/20 uppercase tracking-widest flex items-center gap-2"
                >
                  <MessageSquare size={14} />
                  {t('profile.sendMessage')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex md:flex-col justify-center gap-12 md:gap-8 md:pl-12 md:border-l border-outline-variant/20 font-label">
          <div className="flex md:flex-row gap-12 items-center">
            <div 
              className="flex flex-col md:items-start items-center gap-1 cursor-pointer hover:bg-surface-container-highest/20 p-2 -m-2 rounded-xl transition-all active:scale-95 group"
              onClick={() => {
                setFollowModalType('followers');
                setShowFollowModal(true);
              }}
            >
              <span className="text-2xl font-headline font-bold text-on-surface group-hover:text-primary transition-colors">{formatCount(profile?.followersCount ?? 0)}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium group-hover:text-on-surface transition-colors">{t('profile.followers')}</span>
            </div>
            <div 
              className="flex flex-col md:items-start items-center gap-1 cursor-pointer hover:bg-surface-container-highest/20 p-2 -m-2 rounded-xl transition-all active:scale-95 group"
              onClick={() => {
                setFollowModalType('following');
                setShowFollowModal(true);
              }}
            >
              <span className="text-2xl font-headline font-bold text-on-surface group-hover:text-primary transition-colors">{formatCount(profile?.followingCount ?? 0)}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium group-hover:text-on-surface transition-colors">{t('profile.following')}</span>
            </div>
            <div className="flex flex-col md:items-start items-center gap-1">
              <span className="text-2xl font-headline font-bold text-on-surface">{formatCount(profile?.likesCount ?? 0)}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">{t('profile.likes')}</span>
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
              <span>{t('profile.tabs.album')}</span>
              {activeTab === 'album' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in slide-in-from-left-2 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" />}
            </button>
          )}
          <button 
            onClick={() => setActiveTab('post')}
            className={`pb-4 text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-2 transition-all relative ${activeTab === 'post' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <History size={18} />
            <span>{t('profile.tabs.post')}</span>
            {activeTab === 'post' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in slide-in-from-left-2 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" />}
          </button>
          {/* 只对自己显示设备标签 */}
          {profile?.isOwner && (
            <button 
              onClick={() => setActiveTab('gear')}
              className={`pb-4 text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-2 transition-all relative ${activeTab === 'gear' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <Camera size={18} />
              <span>{t('profile.tabs.gear')}</span>
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
                  aria-label={t('roll.year')}
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-label font-bold focus:ring-0 cursor-pointer pr-8 uppercase tracking-[0.1em] text-on-surface-variant outline-none"
                >
                  <option value="">{t('roll.year')}: {t('common.all')}</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 border border-outline-variant/10 rounded-sm hover:border-outline-variant/30 transition-colors">
                <Filter size={14} className="text-on-surface-variant/40" />
                <select 
                  aria-label={t('roll.type')}
                  value={filmFilter}
                  onChange={(e) => setFilmFilter(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-label font-bold focus:ring-0 cursor-pointer pr-8 uppercase tracking-[0.1em] text-on-surface-variant outline-none"
                >
                  <option value="">{t('roll.type')}: {t('common.all')}</option>
                  {filmTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {currentUser?.level !== 'lv1' && (
            <button 
              onClick={() => {
                if (currentUser?.level === 'lv2' && allRolls.length >= lv2RollLimit) {
                  alert(t('profile.roll.limitReached', { limit: lv2RollLimit }) || `LV2 limit reached: ${lv2RollLimit} rolls`);
                  return;
                }
                setShowCreateModal(true);
              }}
              className="bg-primary text-on-primary px-6 py-2.5 text-xs font-bold hover:bg-primary-dim transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-[0.2em] rounded-sm active:scale-95"
            >
              <FolderPlus size={16} />
              {t('roll.new')}
            </button>
          )}
        </div>
      )}

      {/* List View of Film Rolls (Film Strips) */}
      {activeTab === 'album' && (
        rolls.length > 0 ? (
          <div className="space-y-16">
            <AnimatePresence mode="popLayout">
              {rolls.map((roll, index) => (
                <motion.div 
                  key={roll.id} 
                  id={`roll-${roll.id}`} 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.3 }
                  }}
                  className="group"
                >
                  {/* Roll Header: Responsive layout */}
                  <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-4 px-2 gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 
                        className="text-xl md:text-2xl font-headline font-bold text-on-surface cursor-pointer hover:text-primary transition-colors leading-tight"
                        onClick={() => navigate(`/roll/${roll.id}`)}
                      >
                        <span className="text-primary/40 mr-2 font-mono text-lg md:text-xl">
                          卷号#{String((roll.sortOrder ?? 0) + 1).padStart(3, '0')}
                        </span>
                        {roll.title}
                      </h2>
                      <span className="px-2 py-0.5 bg-secondary-container text-secondary text-[10px] font-label rounded-sm tracking-widest whitespace-nowrap">{roll.filmStock}</span>
                        {profile?.isOwner && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditRoll(roll)}
                              className="p-1 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-highest rounded"
                              title={t('roll.edit')}
                            >
                              <Pencil size={14} />
                            </button>
                            <div className="flex items-center bg-surface-container-highest/50 rounded p-0.5 ml-1">
                              <button
                                onClick={() => handleMoveRoll(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-on-surface-variant hover:text-primary disabled:opacity-20 transition-all hover:scale-110 active:scale-95"
                                title="上移"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                onClick={() => handleMoveRoll(index, 'down')}
                                disabled={index === rolls.length - 1}
                                className="p-1 text-on-surface-variant hover:text-primary disabled:opacity-20 transition-all hover:scale-110 active:scale-95"
                                title="下移"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </div>
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
                              {t('profile.roll.viewFrames', { count: roll.frames.length })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-xs font-label">{t('profile.roll.noPhoto')}</div>
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
                            title={t('profile.roll.viewFull')}
                          >
                            <ChevronRight size={24} className="text-on-surface-variant group-hover/more:text-primary transition-colors" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center text-on-surface-variant text-sm font-label cursor-pointer hover:text-primary transition-colors"
                             onClick={() => navigate(`/roll/${roll.id}`)}>
                          {t('profile.roll.noPhotoDesc')}
                        </div>
                      )}
                    </div>
  
                    <div className="absolute bottom-2 left-0 w-full h-3 perforation-pattern opacity-10"></div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div 
            className={`flex flex-col items-center justify-center py-32 text-on-surface-variant bg-surface-container-lowest border border-outline-variant/10 border-dashed rounded-sm transition-all duration-300 ${profile?.isOwner ? 'cursor-pointer hover:bg-surface-container-low hover:border-primary/30 group/empty' : ''}`}
            onClick={() => {
              if (!profile?.isOwner) return;
              if (currentUser?.level === 'lv1') {
                showToast('您的等级(LV1)暂无权限创建影集，请联系管理员升级', 'error');
                return;
              }
              if (currentUser?.level === 'lv2' && allRolls.length >= lv2RollLimit) {
                alert(t('profile.roll.limitReached', { limit: lv2RollLimit }));
                return;
              }
              setShowCreateModal(true);
            }}
          >
            <Library size={64} className="mb-6 opacity-30 mx-auto group-hover/empty:text-primary group-hover/empty:opacity-100 transition-all duration-500" />
            <p className="font-headline font-bold text-xl mb-2 text-on-surface group-hover/empty:text-primary transition-colors">{t('roll.empty')}</p>
            {profile?.isOwner ? (
                <>
                  <p className="font-body text-sm mb-8 opacity-70 group-hover/empty:opacity-100 transition-opacity">{t('profile.roll.noPhotoDesc')}</p>

                {currentUser?.level !== 'lv1' && (
                  <button 
                    onClick={() => {
                      if (currentUser?.level === 'lv2' && allRolls.length >= lv2RollLimit) {
                        alert(t('profile.roll.limitReached', { limit: lv2RollLimit }) || `LV2 limit reached: ${lv2RollLimit} rolls`);
                        return;
                      }
                      setShowCreateModal(true);
                    }}
                    className="bg-primary text-on-primary px-8 py-3 text-sm font-bold hover:bg-primary-dim transition-colors flex items-center gap-2 uppercase tracking-widest"
                  >
                    <PlusCircle size={16} />
                    {t('profile.tabs.album')} #1
                  </button>
                )}
              </>
            ) : (
              <p className="font-body text-sm opacity-70">{t('profile.gear.emptyDescOther')}</p>
            )}
          </div>
        )
      )}

      {/* Activity Tab */}
      {activeTab === 'post' && (
        <section className="max-w-[1200px] mx-auto space-y-6 pt-4">
          {isLoadingPosts && postsPage === 1 ? (
            <div className="flex justify-center py-20 animate-pulse">
              <span className="text-on-surface-variant font-label text-sm tracking-widest uppercase">{t('profile.gear.loading')}</span>
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
                    {t('common.exploreMore')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
              <History size={48} className="mb-4 opacity-30" />
              <p className="font-body text-sm">{t('post.empty')}</p>
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
                  aria-label={t('roll.type')}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'used' | 'using' | 'wanted')}
                  className="bg-transparent border-none text-[10px] font-label font-bold focus:ring-0 cursor-pointer pr-8 uppercase tracking-[0.1em] text-on-surface-variant outline-none"
                >
                  <option value="all">{t('gear.status.all')}</option>
                  <option value="using">{t('gear.status.using')}</option>
                  <option value="used">{t('gear.status.used')}</option>
                  <option value="wanted">{t('gear.status.wanted')}</option>
                </select>
              </div>
            </div>
            
            {profile?.isOwner && currentUser?.level !== 'lv1' && (
              <button 
                onClick={() => setShowAddGearModal(true)}
                className="bg-primary text-on-primary px-6 py-2.5 text-xs font-bold hover:bg-primary-dim transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-[0.2em] rounded-sm active:scale-95"
              >
                <PlusCircle size={16} />
                {t('gear.add')}
              </button>
            )}
          </div>

          {/* 设备列表 */}
          {isLoadingGear ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-on-surface-variant font-label text-sm tracking-widest uppercase animate-pulse">{t('profile.gear.loading')}</div>
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
                        {item.status === 'using' ? t('gear.status.main') : item.status === 'used' ? t('gear.status.used') : t('gear.status.wanted')}
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
                          {item.formats.map((f: string) => f === '半格' ? t('gear.form.formats.half') : f).join(', ')}
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
                          {item.shotCount} {t('gear.count')}
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
                          {t('common.edit')}
                        </button>
                        <button 
                          onClick={() => handleDeleteGear(item.id)}
                          className="flex-1 bg-white/5 hover:bg-red-500/20 border border-white/5 hover:border-red-500/30 text-white/80 hover:text-red-400 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Trash2 size={14} />
                          {t('common.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant bg-surface-container-lowest border border-outline-variant/10 border-dashed">
              <Camera size={64} className="mb-6 opacity-30 mx-auto" />
              <p className="font-headline font-bold text-xl mb-2 text-on-surface">{t('profile.gear.empty')}</p>
              {profile?.isOwner ? (
                <>
                  <p className="font-body text-sm mb-8 opacity-70">{t('profile.gear.emptyDescOwner')}</p>
                  <button 
                    onClick={() => setShowAddGearModal(true)}
                    className="bg-primary text-on-primary px-8 py-3 text-sm font-bold hover:bg-primary-dim transition-colors flex items-center gap-2 uppercase tracking-widest"
                  >
                    <PlusCircle size={16} />
                    {t('profile.gear.add')}
                  </button>
                </>
              ) : (
                <p className="font-body text-sm opacity-70">{t('profile.gear.emptyDescOther')}</p>
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
          filmStockSearch={filmStockSearch}
          setFilmStockSearch={setFilmStockSearch}
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
          filmStockSearch={filmStockSearch}
          setFilmStockSearch={setFilmStockSearch}
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

      {/* 关注/粉丝列表弹窗 */}
      <AnimatePresence>
        {showFollowModal && profile && (
          <FollowListModal
            isOpen={showFollowModal}
            onClose={() => setShowFollowModal(false)}
            userId={profile.id}
            userName={profile.nickname}
            type={followModalType}
          />
        )}
      </AnimatePresence>

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