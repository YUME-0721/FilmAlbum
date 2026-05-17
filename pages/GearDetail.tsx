import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGearById, type Gear } from '../src/api/gear.ts';
import { useAuth } from '../src/context/AuthContext.tsx';
import { useTranslation } from '../src/hooks/useTranslation';
import { ArrowLeft, Edit3, Star, Disc, Camera, Heart, User, Check, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface GearDetailData extends Gear {
  author?: {
    id: string;
    nickname: string;
    avatarUrl: string;
  };
}

export default function GearDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [gear, setGear] = useState<GearDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchGearDetail = async () => {
      setIsLoading(true);
      try {
        const res = await getGearById(id);
        if (res.success && res.data) {
          setGear(res.data);
        } else {
          setError(res.error || '获取设备详情失败');
        }
      } catch (err) {
        console.error('Error fetching gear details:', err);
        setError('网络错误，请稍后再试');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGearDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-on-surface-variant animate-pulse">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !gear) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface-container max-w-md w-full p-8 text-center border border-outline-variant/30">
          <h2 className="text-xl font-headline font-bold text-error mb-4">出错啦</h2>
          <p className="text-sm text-on-surface-variant mb-6">{error || '设备不存在'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="w-full bg-primary text-on-primary py-3 text-sm font-bold uppercase tracking-widest hover:bg-primary-dim transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === gear.author?.id;

  // 根据状态展示标签
  const getStatusLabel = (status: 'used' | 'using' | 'wanted') => {
    switch (status) {
      case 'using': return '正在使用';
      case 'used': return '曾经拥有';
      case 'wanted': return '愿望清单';
      default: return '';
    }
  };

  // 根据状态显示背景光晕颜色
  const getStatusGradient = (status: 'used' | 'using' | 'wanted') => {
    switch (status) {
      case 'using': return 'from-primary/20 via-primary/5 to-transparent';
      case 'used': return 'from-amber-500/10 via-amber-500/2 to-transparent';
      case 'wanted': return 'from-rose-500/15 via-rose-500/2 to-transparent';
      default: return 'from-primary/10 via-transparent to-transparent';
    }
  };

  // 分隔并展示详细介绍段落
  const reviewParagraphs = gear.review 
    ? gear.review.split('\n').filter(p => p.trim())
    : ['暂无设备介绍。'];

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-on-surface flex flex-col selection:bg-primary/30 relative overflow-hidden pb-16">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 w-full z-40 bg-gradient-to-b from-black/80 to-transparent px-4 py-4 md:px-8 flex items-center justify-between backdrop-blur-[2px]">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/60 hover:bg-surface-container text-on-surface hover:text-primary transition-all border border-outline-variant/10"
        >
          <ArrowLeft size={20} />
        </button>
        
        {gear.author && (
          <div 
            onClick={() => navigate(`/space/${gear.author?.id}`)}
            className="flex items-center gap-2 cursor-pointer py-1 px-3 rounded-full bg-surface-container/40 hover:bg-surface-container/80 transition-colors border border-outline-variant/10 text-xs text-on-surface-variant hover:text-on-surface"
          >
            {gear.author.avatarUrl ? (
              <img src={gear.author.avatarUrl} alt={gear.author.nickname} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
                <User size={10} />
              </div>
            )}
            <span>{gear.author.nickname} 的设备</span>
          </div>
        )}

        {isOwner ? (
          <button 
            onClick={() => navigate(`/space?tab=gear`)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-on-primary transition-all border border-primary/20"
          >
            <Edit3 size={18} />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* 主体布局 - 响应式双栏/单栏 */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pt-16 md:pt-20 flex flex-col md:flex-row gap-8 md:gap-16 items-stretch">
        
        {/* 左侧/上半部分：设备巨幅精美展示 */}
        <div className="flex-1 flex flex-col items-center justify-center relative py-4 md:py-8">
          {/* Ambient blurred glow background */}
          <div className={`absolute w-[80%] h-[80%] max-w-[450px] max-h-[450px] rounded-full bg-radial-gradient ${getStatusGradient(gear.status)} blur-[80px] -z-10 pointer-events-none opacity-80`} />
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full flex items-center justify-center relative"
          >
            {gear.imageUrl ? (
              <img 
                src={gear.imageUrl} 
                alt={gear.cameraModel}
                className="max-h-[30vh] md:max-h-[45vh] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] filter hover:brightness-105 transition-all duration-500"
              />
            ) : (
              <div className="w-64 h-64 md:w-80 md:h-80 bg-surface-container-low/30 border border-outline-variant/20 rounded-2xl flex flex-col items-center justify-center text-on-surface-variant/40 shadow-2xl">
                <Camera size={64} className="stroke-[1] mb-4 text-primary/40 animate-pulse" />
                <span className="text-xs uppercase tracking-widest">No Image Available</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* 右侧/下半部分：设备极其精致的图文介绍 */}
        <div className="flex-1 flex flex-col justify-start py-2 md:py-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 max-w-xl"
          >
            {/* 顶层小标状态组 */}
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-sm tracking-widest uppercase flex items-center gap-1 ${
                gear.status === 'using' 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : gear.status === 'used'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
              }`}>
                <span className={`w-1 h-1 rounded-full ${
                  gear.status === 'using' ? 'bg-primary animate-pulse' : gear.status === 'used' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
                {getStatusLabel(gear.status)}
              </span>

              {gear.lensType === 'fixed' ? (
                <span className="px-2.5 py-0.5 bg-surface-container/60 border border-outline-variant/20 text-[10px] font-bold rounded-sm tracking-widest text-on-surface-variant">
                  固定镜头
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-surface-container/60 border border-outline-variant/20 text-[10px] font-bold rounded-sm tracking-widest text-on-surface-variant">
                  可换镜头
                </span>
              )}

              {gear.mount && (
                <span className="px-2.5 py-0.5 bg-surface-container/60 border border-outline-variant/20 text-[10px] font-bold rounded-sm tracking-widest text-on-surface-variant flex items-center gap-1">
                  <Layers size={10} />
                  {gear.mount} 卡口
                </span>
              )}
            </div>

            {/* 设备主标题 */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-on-surface leading-tight">
                {gear.cameraModel}
              </h1>
              {gear.lensModel && (
                <p className="text-sm md:text-base font-medium text-on-surface-variant tracking-wider flex items-center gap-2">
                  <span className="text-primary/70">搭配</span>
                  {gear.lensModel}
                </p>
              )}
            </div>

            {/* 分割线 */}
            <div className="h-[1px] w-full bg-outline-variant/25" />

            {/* 核心指标参数卡片 */}
            <div className="grid grid-cols-3 gap-4 py-1">
              <div className="bg-surface-container-low/20 border border-outline-variant/10 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">常用画幅</span>
                <span className="text-base font-bold text-primary mt-1 flex items-center gap-1">
                  <Disc size={14} className="stroke-[2.5]" />
                  {gear.formats && gear.formats.length > 0 ? gear.formats.join(' / ') : '135'}
                </span>
              </div>
              <div className="bg-surface-container-low/20 border border-outline-variant/10 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">已拍快门</span>
                <div className="flex flex-col mt-0.5">
                  <span className="text-base font-bold text-on-surface flex items-baseline gap-0.5">
                    {gear.autoShotCount ?? 0} <span className="text-[10px] font-normal text-on-surface-variant">张 (自动)</span>
                  </span>
                  {gear.shotCount > 0 && (
                    <span className="text-[9px] text-on-surface-variant/60 font-medium tracking-wider mt-0.5 whitespace-nowrap">
                      手动设定: {gear.shotCount}张
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-surface-container-low/20 border border-outline-variant/10 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">主观评分</span>
                <div className="flex items-center gap-0.5 text-amber-500 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      size={12} 
                      className={i < Math.round(gear.rating || 0) ? 'fill-current stroke-[0.5]' : 'stroke-current fill-none'} 
                    />
                  ))}
                  <span className="text-xs font-bold ml-1 text-on-surface-variant">{gear.rating || 0}</span>
                </div>
              </div>
            </div>

            {/* 详细编辑点评/介绍 block */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-label uppercase tracking-widest text-primary font-bold">设备点评与历史介绍</h3>
              <div className="space-y-5 text-sm md:text-base text-on-surface-variant leading-relaxed font-sans font-normal text-justify">
                {reviewParagraphs.map((para, index) => (
                  <p key={index} className="first-letter:text-xl first-letter:font-bold first-letter:text-primary transition-all duration-300">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* 设备外部链接或附加信息 */}
            {gear.externalUrl && (
              <div className="pt-6">
                <a 
                  href={gear.externalUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:text-primary-dim transition-colors group border-b border-primary/20 pb-1"
                >
                  查看更多相关评测资料
                  <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                </a>
              </div>
            )}
          </motion.div>
        </div>

      </main>
    </div>
  );
}
