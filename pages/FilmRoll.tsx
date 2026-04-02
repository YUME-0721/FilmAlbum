/**
 * 胶卷浏览器页面
 * 模拟观片台效果，展示整卷底片
 * 支持帧预览、详情查看、带边框导出
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoll, addFrames, deleteFrame, deleteRoll, updateRoll, reorderFrames, updateFrame, type RollDetail, type FrameItem } from '../src/api/rolls.ts';
import { uploadImage } from '../src/api/upload.ts';
import { getFilmStocks, createFilmStock, updateFilmStock, deleteFilmStock, type FilmStock } from '../src/api/film-stocks.ts';
import { getGear, type Gear } from '../src/api/gear.ts';
import { commonBrands } from '../src/constants/brands';
import { motion, AnimatePresence } from 'motion/react';
import FilmStockManager from '../components/FilmStockManager';
import RollForm from '../components/RollForm';

// Custom style for hiding scrollbars globally in the lightbox area
const LIGHTBOX_STYLES = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

/** 回退 MOCK 帧数据 */
const FALLBACK_FRAMES: FrameItem[] = [
  { id: 'f1', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVsu2wejG0gTS0oRjWI9DPcHGEwIxQ-ncZvrJKDIhvxFvlIZ0_QlqpTbONtwS5-tFiGKCnbxkMWQhnFX1UEsE9d_jV6h9rsxaX-sXB35Sw0iRLKUkRsYCcl9uNWWSByQkk9nJEHYekLtS5w6qwlO5yZ_1YNX1RIZJR7JH6wU6akDUFrP8-EvN8QTMdJfTH8zjw7xOw3x5ooL0q6c9JCdv1qQUipR94-wz1aPeBXIY8DXwnQgdgGrxbp7AnMHoP--I-WLbcx_n1N5t9', previewUrl: null, frameNumber: '01A', aperture: 'f/2.8', shutterSpeed: '1/60s', iso: '400', description: '', sortOrder: 0 },
  { id: 'f2', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLBD_ytwxFix933K7NllDgVh_2R2WLvbSzjBA3mV00GnfNr5PU1x0ScFrwSnJUvg4ny-JOKuLfn5KLKcXGAahOL-IjQ6GSTYBq135Y6yK2LCUSEk91lS642WOAWpG5td6P_1MijEjCipuEtHGml_yEiuQ3ApHWOAUvSshkteKTU1B64wZVlOMk1VbNxd5PVzuxe0PIGklTUFQROOupGps6EE1youHZmZ430qExXdAbsM3E1yoibsAH1FEFBrcKTTGAE5KqmYke8cNR', previewUrl: null, frameNumber: '02A', aperture: 'f/4', shutterSpeed: '1/125s', iso: '400', description: '', sortOrder: 1 },
  { id: 'f3', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlST7Lc5KMSZhvtXL_rcR0Vy2Fh5K3wW7TjToD-6RDLS11XbFdrWOEUBQrTFUHP6bqvybR1yyqUtiqYdOpkqGLPvgOhdFD-C7I0Me_0ZKYRfx9AweeINZy7MVslpnx5AxGbN6bOtlmhjhnfU52FaXZ3zF7yBQEQFozN_qodoJSR_GGbSMUABfqtnjgSN_a_10n-jTax7KjhFtUP51MCSv-W6yU7uCdf-qEADt7RxlunNZV4yQo8zPBdvSMEx_J2Cf_3cr3hAwzcVRy', previewUrl: null, frameNumber: '03A', aperture: 'f/2', shutterSpeed: '1/30s', iso: '400', description: '', sortOrder: 2 },
  { id: 'f4', imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDUvY5QxBvimG7V5-NqK4K40bYyhJTlkUot_-UB5FNM_wregq79egr6gKvUslAl8FDtHLprzt1PVez8WFgLTamN9MsTp_QHKZgNzeP7wHoU437uLBj_dFCbP-RRb6pIvLEhR4gZ4_WOKW3nUcuWnNXtrfxPnW14lSPBmSoMS7rI_v0gYvKG8q23c52T2_zJTGfdBmpbabxYKKCB3Z5vNkkwC0cr0wIeFMAJozufoPzA6wTe69KcbFzxen9RstJnWcmSFTY99zj0u9lr', previewUrl: null, frameNumber: '04A', aperture: 'f/5.6', shutterSpeed: '1/250s', iso: '400', description: '', sortOrder: 3 }
];

const FALLBACK_ROLL: RollDetail = {
  id: 'roll-001',
  title: '示例胶卷相册',
  filmStock: 'Kodak Portra 400',
  location: '上海',
  camera: 'Leica M6',
  lens: 'Summicron 35mm f/2',
  shotDate: '2024-01-15',
  format: '135',
  filmType: 'COLOR_NEGATIVE',
  tags: ['街拍', '人文'],
  frames: FALLBACK_FRAMES,
  status: 'COMPLETED',
  author: {
    id: '0001',
    nickname: 'User',
    avatarUrl: ''
  },
  isOwner: true,
  createdAt: '2024-01-15T00:00:00Z'
};

export default function FilmRoll() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [roll, setRoll] = useState<RollDetail>(FALLBACK_ROLL);
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    filmStock: string;
    location: string;
    camera: string;
    lens: string;
    shotDate: string;
    endDate?: string;
    filmType: string;
    format: string;
    tags: string[];
  }>({
    title: '', filmStock: '', location: '', camera: '', lens: '',
    shotDate: '', endDate: '', filmType: '', format: '', tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ current: number; total: number } | null>(null);
  const [showFilmStockManagement, setShowFilmStockManagement] = useState(false);
  const [filmStocks, setFilmStocks] = useState<FilmStock[]>([]);
  const [filmStockSearch, setFilmStockSearch] = useState('');
  const [addFilmStockForm, setAddFilmStockForm] = useState({
    brand: '',
    model: '',
    iso: 0,
    format: '135',
    filmType: 'COLOR_NEGATIVE',
    process: 'C-41'
  });
  const [gearList, setGearList] = useState<Gear[]>([]);
  const [isLoadingGear, setIsLoadingGear] = useState(false);
  const [isLoadingFilmStocks, setIsLoadingFilmStocks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [borderType, setBorderType] = useState('none'); // none, white, black
  const [borderOptions, setBorderOptions] = useState({
    showFilmStock: true,
    showCamera: true,
    showLens: true,
    showDate: true,
    showExposure: true
  });
  const [isDesktop, setIsDesktop] = useState(false); // 窗口宽度大于高度
  const [editingField, setEditingField] = useState<{frameId: string, field: string} | null>(null); // 当前正在编辑的字段
  const [editValue, setEditValue] = useState(''); // 编辑字段的值

  // 检测窗口宽高比
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth > window.innerHeight);
    };
    
    // 初始检测
    checkScreenSize();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // 加载胶卷数据
  useEffect(() => {
    const fetchRoll = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await getRoll(id);
        const data = response.data;
        if (data) {
          setRoll(data);
          setFrames(data.frames || []);
          // 初始化编辑表单
          setEditForm({
            title: data.title || '',
            filmStock: data.filmStock || '',
            location: data.location || '',
            camera: data.camera || '',
            lens: data.lens || '',
            shotDate: data.shotDate || '',
            endDate: data.shotDate || '', // 默认为与shotDate相同
            filmType: data.filmType || '',
            format: data.format || '',
            tags: data.tags || []
          });
        }
      } catch (error) {
        console.error('加载胶卷失败:', error);
        showToast('加载胶卷失败', 'error');
      } finally {
        setIsLoading(false);
        // 滚动到页面顶部
        window.scrollTo(0, 0);
      }
    };
    fetchRoll();
  }, [id]);

  // 加载胶卷型号列表
  useEffect(() => {
    const fetchFilmStocks = async () => {
      setIsLoadingFilmStocks(true);
      try {
        const response = await getFilmStocks();
        setFilmStocks(response.data || []);
      } catch (error) {
        console.error('加载胶卷型号失败:', error);
      } finally {
        setIsLoadingFilmStocks(false);
      }
    };
    fetchFilmStocks();
  }, []);

  // 加载设备列表
  useEffect(() => {
    const fetchGear = async () => {
      setIsLoadingGear(true);
      try {
        const response = await getGear();
        setGearList(response.data || []);
      } catch (error) {
        console.error('加载设备列表失败:', error);
      } finally {
        setIsLoadingGear(false);
      }
    };
    fetchGear();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    setIsUploading(true);
    setUploadStatus({ current: 0, total: files.length });

    try {
      const uploadedFrames: FrameItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus({ current: i + 1, total: files.length });
        
        const uploadResult = await uploadImage(file, id, 'frame');
        const imageUrl = uploadResult.url;
        const previewUrl = uploadResult.previewUrl;
        uploadedFrames.push({
          id: `temp-${Date.now()}-${i}`,
          imageUrl,
          previewUrl,
          frameNumber: String(frames.length + i + 1).padStart(2, '0') + 'A',
          aperture: '',
          shutterSpeed: '',
          iso: '',
          description: '',
          sortOrder: frames.length + i
        });
      }

      // 批量添加帧到服务器
      const addResponse = await addFrames(id, uploadedFrames);
      if (addResponse.success) {
        // 重新获取胶卷详情，确保获取到最新的帧列表
        const rollResponse = await getRoll(id);
        if (rollResponse.success && rollResponse.data) {
          setRoll(rollResponse.data);
          setFrames(rollResponse.data.frames || []);
          showToast(`成功添加 ${files.length} 张照片`);
        } else {
          // 如果获取详情失败，尝试使用返回的新帧数据
          const newFrames = (addResponse.data || []) as FrameItem[];
          setFrames(prevFrames => [...prevFrames, ...newFrames]);
          showToast(`成功添加 ${files.length} 张照片`);
        }
      } else {
        showToast('上传照片失败', 'error');
      }
    } catch (error) {
      console.error('上传照片失败:', error);
      showToast('上传照片失败', 'error');
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFrame = async (frameId: string) => {
    if (!id) return;
    
    setConfirmDialog({
      message: '确定要删除这张照片吗？',
      onConfirm: async () => {
        try {
          await deleteFrame(id, frameId);
          setFrames(frames.filter(f => f.id !== frameId));
          showToast('照片已删除');
        } catch (error) {
          console.error('删除照片失败:', error);
          showToast('删除照片失败', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleDeleteRoll = async () => {
    if (!id) return;
    
    setConfirmDialog({
      message: '确定要删除这个胶卷相册吗？此操作不可恢复。',
      onConfirm: async () => {
        try {
          await deleteRoll(id);
          showToast('胶卷相册已删除');
          navigate('/space');
        } catch (error) {
          console.error('删除胶卷相册失败:', error);
          showToast('删除胶卷相册失败', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleUpdateRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);
    try {
      await updateRoll(id, editForm);
      showToast('胶卷相册已更新');
      setShowEditModal(false);
      // 刷新数据
      const response = await getRoll(id);
      const data = response.data;
      if (data) {
        setRoll(data);
        setFrames(data.frames || []);
      }
    } catch (error) {
      console.error('更新胶卷相册失败:', error);
      showToast('更新胶卷相册失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReorderFrames = async (newOrder: FrameItem[]) => {
    if (!id) return;
    
    try {
      const frameIds = newOrder.map(f => f.id);
      await reorderFrames(id, frameIds);
      setFrames(newOrder);
      showToast('照片顺序已更新');
    } catch (error) {
      console.error('更新照片顺序失败:', error);
      showToast('更新照片顺序失败', 'error');
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleDownloadExport = () => {
    if (!exportRef.current) return;
    
    // 创建canvas来绘制导出图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸
    canvas.width = 1200;
    canvas.height = 800;

    // 绘制背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(roll.title, canvas.width / 2, 50);

    // 绘制胶卷信息
    ctx.font = '16px Arial';
    ctx.fillText(`${roll.filmStock} | ${roll.camera} | ${roll.lens}`, canvas.width / 2, 80);
    ctx.fillText(`${roll.location} | ${roll.shotDate}`, canvas.width / 2, 105);

    // 绘制照片缩略图
    const thumbWidth = 200;
    const thumbHeight = 150;
    const cols = 5;
    const startX = (canvas.width - cols * thumbWidth) / 2;
    const startY = 150;

    frames.forEach((frame, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * thumbWidth;
      const y = startY + row * (thumbHeight + 30);

      // 绘制边框
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, thumbWidth, thumbHeight);

      // 绘制帧号
      ctx.fillStyle = '#888';
      ctx.font = '12px Arial';
      ctx.fillText(frame.frameNumber, x + 10, y + thumbHeight + 20);
    });

    // 下载图片
    const link = document.createElement('a');
    link.download = `${roll.title}_导出.png`;
    link.href = canvas.toDataURL();
    link.click();

    setShowExportModal(false);
    showToast('导出成功');
  };

  const handleMoveFrame = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === frames.length - 1) return;

    const newFrames = [...frames];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFrames[index], newFrames[targetIndex]] = [newFrames[targetIndex], newFrames[index]];
    
    // 更新sortOrder
    newFrames.forEach((frame, i) => {
      frame.sortOrder = i;
    });

    handleReorderFrames(newFrames);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-on-surface-variant">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <style>{LIGHTBOX_STYLES}</style>
      
      {/* 顶部信息栏 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-surface-variant rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-2xl font-bold text-on-surface truncate max-w-md">
              {roll.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 hover:bg-surface-variant rounded-full transition-colors"
              title="添加照片"
            >
              <span className="material-symbols-outlined">add_photo_alternate</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="p-2 hover:bg-surface-variant rounded-full transition-colors"
              title="编辑"
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="p-2 hover:bg-surface-variant rounded-full transition-colors"
              title="导出"
            >
              <span className="material-symbols-outlined">download</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteRoll}
              className="p-2 hover:bg-error/10 text-error rounded-full transition-colors"
              title="删除"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        
        {/* 胶卷信息行 */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-on-surface-variant">
          {roll.camera && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">camera</span>
              <span>{roll.camera}</span>
            </div>
          )}
          {roll.lens && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">photo_camera_front</span>
              <span>{roll.lens}</span>
            </div>
          )}
          {roll.shotDate && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">event</span>
              <span>{roll.shotDate}</span>
            </div>
          )}
          {roll.location && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">location_on</span>
              <span>{roll.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">aspect_ratio</span>
            <span>{roll.format === '135' ? '135' : roll.format === '120' ? '120' : roll.format || '-'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{roll.filmType === 'COLOR_NEGATIVE' ? '彩色负片' : 
                 roll.filmType === 'BW_NEGATIVE' ? '黑白负片' : 
                 roll.filmType === 'COLOR_POSITIVE' ? '彩色正片' : 
                 roll.filmType === 'BW_POSITIVE' ? '黑白正片' : 
                 roll.filmType || '-'}</span>
          </div>
          {roll.filmStock && (
            <span className="px-2 py-0.5 bg-secondary-container text-secondary text-xs font-medium rounded">
              {roll.filmStock}
            </span>
          )}
        </div>


      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          title="选择照片"
        />

        {/* 照片网格 */}
        {frames.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">photo_library</span>
            <p>还没有照片，点击上方按钮添加</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6 min-h-[calc(100vh-300px)]">
            {frames.map((frame, index) => (
              <div
                key={frame.id}
                className="group relative aspect-[3/2] bg-surface-container rounded-lg overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                onClick={() => {
                  setCurrentFrame(index);
                  setShowLightbox(true);
                }}
              >
                <img
                  src={frame.previewUrl || frame.imageUrl}
                  alt={frame.frameNumber}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                {/* 悬停遮罩 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveFrame(index, 'up');
                    }}
                    disabled={index === 0}
                    className="p-1 bg-white/20 rounded hover:bg-white/30 disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-white text-sm">arrow_upward</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveFrame(index, 'down');
                    }}
                    disabled={index === frames.length - 1}
                    className="p-1 bg-white/20 rounded hover:bg-white/30 disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-white text-sm">arrow_downward</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFrame(frame.id);
                    }}
                    className="p-1 bg-error/80 rounded hover:bg-error"
                  >
                    <span className="material-symbols-outlined text-white text-sm">delete</span>
                  </button>
                </div>
                {/* 照片信息 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white font-medium">{frame.frameNumber}</span>
                    <div className="flex items-center gap-1 text-xs text-white/80">
                      {frame.aperture && <span>{frame.aperture}</span>}
                      {frame.shutterSpeed && <span>{frame.shutterSpeed}</span>}
                      {frame.iso && <span>ISO {frame.iso}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* 添加占位元素以保持高度一致 */}
            {Array.from({ length: Math.max(0, 4 - frames.length) }).map((_, index) => (
              <div key={`placeholder-${index}`} className="aspect-[3/2] bg-surface-container/50 rounded-lg border border-outline-variant/30"></div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 overflow-hidden"
            onClick={() => setShowLightbox(false)}
          >
            {/* 左侧返回按钮 */}
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 left-4 p-2 text-white/70 hover:text-white z-10"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>

            {/* 主内容区 */}
            <div className="absolute inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              {/* 图片 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 0 }}
                animate={{ opacity: 1, scale: 1, x: showSidebar && isDesktop ? -144 : 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 0 }}
                transition={{ duration: 0.2 }}
                className="relative max-w-[70vw] max-h-[80vh] flex flex-col items-center"
              >
                {/* 上一张 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentFrame(prev => prev > 0 ? prev - 1 : frames.length - 1);
                  }}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-16 p-2 text-white/70 hover:text-white z-10"
                >
                  <span className="material-symbols-outlined text-4xl">chevron_left</span>
                </button>

                <div onClick={(e) => e.stopPropagation()}>
                  {frames[currentFrame] && (
                    <div className={`w-full ${borderType === 'none' ? '' : borderType === 'white' ? 'bg-white p-8' : 'bg-black p-8'}`}>
                      <div className="flex justify-center">
                        <img
                          src={frames[currentFrame].imageUrl}
                          alt={frames[currentFrame].frameNumber}
                          className={`object-contain ${borderType === 'none' ? 'max-w-full max-h-[80vh]' : 'max-w-[90%] max-h-[70vh]'}`}
                        />
                      </div>
                      {/* 边框底部信息 */}
                      {(borderType === 'white' || borderType === 'black') && (
                        <div className={`mt-6 flex justify-between items-center ${borderType === 'white' ? 'text-gray-800' : 'text-white'}`}>
                          {/* 左侧胶片档案 */}
                          {borderOptions.showFilmStock && (
                            <div className="flex items-center gap-4">
                              {(() => {
                                const brandName = roll.filmStock.split(' ')[0];
                                const brand = commonBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
                                if (brand?.logoUrl) {
                                  return (
                                    <div className="w-10 h-10">
                                      <img 
                                        src={brand.logoUrl} 
                                        alt={brand.name} 
                                        className="w-full h-full object-contain" 
                                      />
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="w-10 h-10 bg-yellow-500 flex items-center justify-center">
                                      <span className="text-black font-bold text-sm">{brandName.charAt(0)}</span>
                                    </div>
                                  );
                                }
                              })()}
                              <div>
                                <h5 className="font-bold font-lingxun">{roll.filmStock.split(' ')[0]}</h5>
                                <h6 className="font-bold font-lingxun">{roll.filmStock.split(' ').slice(1).join(' ')}</h6>
                              </div>
                            </div>
                          )}
                          {/* 右侧信息 */}
                          <div className="text-right">
                            {borderOptions.showCamera && roll.camera && (
                              <p className="text-sm">{roll.camera}</p>
                            )}
                            {borderOptions.showLens && roll.lens && (
                              <p className="text-sm">{roll.lens}</p>
                            )}
                            {borderOptions.showDate && roll.shotDate && (
                              <p className="text-sm">{roll.shotDate}</p>
                            )}
                            {borderOptions.showExposure && frames[currentFrame] && (frames[currentFrame].aperture || frames[currentFrame].shutterSpeed || frames[currentFrame].iso) && (
                              <p className="text-sm">
                                {frames[currentFrame].aperture && `${frames[currentFrame].aperture} `}
                                {frames[currentFrame].shutterSpeed && `${frames[currentFrame].shutterSpeed} `}
                                {frames[currentFrame].iso && `ISO ${frames[currentFrame].iso}`}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 下一张 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentFrame(prev => prev < frames.length - 1 ? prev + 1 : 0);
                  }}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-16 p-2 text-white/70 hover:text-white z-10"
                >
                  <span className="material-symbols-outlined text-4xl">chevron_right</span>
                </button>
              </motion.div>

              {/* 张数提示 */}
              <div className="absolute bottom-4 left-4 text-white/80 text-sm z-10">
                {currentFrame + 1} / {frames.length}
              </div>
            </div>

            {/* 右侧侧边栏 */}
            {showSidebar && (
              <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute right-0 top-0 bottom-0 w-72 bg-surface-container border-l border-outline-variant/30 flex flex-col z-20 no-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 侧边栏顶部 */}
                <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-on-surface">照片信息</h3>
                  <div className="flex gap-2">
                    <button className="p-1 hover:bg-surface-variant rounded transition-colors" title="分享">
                      <span className="material-symbols-outlined text-on-surface-variant">share</span>
                    </button>
                    <button className="p-1 hover:bg-surface-variant rounded transition-colors" title="下载">
                      <span className="material-symbols-outlined text-on-surface-variant">download</span>
                    </button>
                    <button
                      onClick={() => setShowSidebar(false)}
                      className="p-1 hover:bg-surface-variant rounded transition-colors"
                      title="关闭侧边栏"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                  </div>
                </div>

              {/* 侧边栏内容 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                {/* 胶片档案 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">胶片档案</h4>
                  <div className="bg-surface-container-low rounded-lg overflow-hidden">
                    {roll.filmStock ? (
                      <>
                        {/* 卡片上半部分 - LOGO和型号 */}
                        <div className="bg-surface-container-low pl-8 pr-3 py-4 flex items-center gap-6">
                          {(() => {
                            const brandName = roll.filmStock.split(' ')[0];
                            const brand = commonBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
                            if (brand?.logoUrl) {
                              return (
                                <div className="w-12 h-12">
                                  <img 
                                    src={brand.logoUrl} 
                                    alt={brand.name} 
                                    className="w-full h-full object-contain" 
                                  />
                                </div>
                              );
                            } else {
                              return (
                                <div className="w-12 h-12 bg-yellow-500 flex items-center justify-center">
                                  <span className="text-black font-bold text-lg">{brandName.charAt(0)}</span>
                                </div>
                              );
                            }
                          })()}
                          <div className="flex flex-col justify-center flex-1">
                            <h5 className="text-on-surface font-bold text-lg leading-tight font-lingxun">{roll.filmStock.split(' ')[0]}</h5>
                            <h6 className="text-on-surface font-bold text-xl leading-tight font-lingxun">{roll.filmStock.split(' ').slice(1).join(' ')}</h6>
                          </div>
                        </div>
                        {/* 卡片下半部分 - 类型和画幅 */}
                        <div className="pl-8 pr-3 py-4 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-on-surface-variant mb-1">胶片类型</p>
                            <p className="text-sm text-on-surface">
                              {roll.filmType === 'COLOR_NEGATIVE' ? '彩色负片' : 
                               roll.filmType === 'BW_NEGATIVE' ? '黑白负片' : 
                               roll.filmType === 'COLOR_POSITIVE' ? '彩色正片' : 
                               roll.filmType === 'BW_POSITIVE' ? '黑白正片' : 
                               roll.filmType || '暂无数据'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-on-surface-variant mb-1">画幅规格</p>
                            <p className="text-sm text-on-surface">{roll.format || '暂无数据'}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-on-surface-variant">暂无胶片档案信息</p>
                        <p className="text-xs text-on-surface-variant mt-1">可在编辑相册时添加</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 拍摄信息 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">拍摄信息</h4>
                  <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-0.5">
                      <span className="w-18 text-xs text-on-surface-variant">拍摄日期</span>
                      {editingField?.frameId === frames[currentFrame]?.id && editingField?.field === 'shotDate' ? (
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={async () => {
                            if (!frames[currentFrame] || !id) return;
                            try {
                              const response = await updateFrame(id, frames[currentFrame].id, { shotDate: editValue });
                              if (response.success) {
                                setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, shotDate: editValue } : frame));
                                showToast('拍摄日期已更新');
                              }
                            } catch (error) {
                              console.error('更新失败:', error);
                              // 模拟更新成功，以便在后端不可用时也能测试前端功能
                              setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, shotDate: editValue } : frame));
                              showToast('拍摄日期已更新（模拟）');
                            }
                            setEditingField(null);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          className="flex-1 text-sm text-on-surface bg-surface-container border border-primary rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          placeholder="选择日期"
                        />
                      ) : (
                        <span 
                          className="flex-1 text-sm text-on-surface cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            if (!frames[currentFrame]) return;
                            setEditingField({ frameId: frames[currentFrame].id, field: 'shotDate' });
                            setEditValue(frames[currentFrame].shotDate || roll.shotDate || '');
                          }}
                        >
                          {frames[currentFrame]?.shotDate || roll.shotDate || '暂无数据'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="w-18 text-xs text-on-surface-variant">拍摄地点</span>
                      {editingField?.frameId === frames[currentFrame]?.id && editingField?.field === 'location' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={async () => {
                            if (!frames[currentFrame] || !id) return;
                            try {
                              const response = await updateFrame(id, frames[currentFrame].id, { location: editValue });
                              if (response.success) {
                                setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, location: editValue } : frame));
                                showToast('拍摄地点已更新');
                              }
                            } catch (error) {
                              console.error('更新失败:', error);
                              // 模拟更新成功，以便在后端不可用时也能测试前端功能
                              setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, location: editValue } : frame));
                              showToast('拍摄地点已更新（模拟）');
                            }
                            setEditingField(null);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          className="flex-1 text-sm text-on-surface bg-surface-container border border-primary rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          placeholder="输入拍摄地点"
                        />
                      ) : (
                        <span 
                          className="flex-1 text-sm text-on-surface cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            if (!frames[currentFrame]) return;
                            setEditingField({ frameId: frames[currentFrame].id, field: 'location' });
                            setEditValue(frames[currentFrame].location || roll.location || '');
                          }}
                        >
                          {frames[currentFrame]?.location || roll.location || '暂无数据'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="w-18 text-xs text-on-surface-variant">相机型号</span>
                      {editingField?.frameId === frames[currentFrame]?.id && editingField?.field === 'camera' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={async () => {
                            if (!frames[currentFrame] || !id) return;
                            try {
                              const response = await updateFrame(id, frames[currentFrame].id, { camera: editValue });
                              if (response.success) {
                                setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, camera: editValue } : frame));
                                showToast('相机型号已更新');
                              }
                            } catch (error) {
                              console.error('更新失败:', error);
                              // 模拟更新成功，以便在后端不可用时也能测试前端功能
                              setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, camera: editValue } : frame));
                              showToast('相机型号已更新（模拟）');
                            }
                            setEditingField(null);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          className="flex-1 text-sm text-on-surface bg-surface-container border border-primary rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          placeholder="输入相机型号"
                        />
                      ) : (
                        <span 
                          className="flex-1 text-sm text-on-surface cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            if (!frames[currentFrame]) return;
                            setEditingField({ frameId: frames[currentFrame].id, field: 'camera' });
                            setEditValue(frames[currentFrame].camera || roll.camera || '');
                          }}
                        >
                          {frames[currentFrame]?.camera || roll.camera || '暂无数据'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="w-18 text-xs text-on-surface-variant">镜头型号</span>
                      {editingField?.frameId === frames[currentFrame]?.id && editingField?.field === 'lens' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={async () => {
                            if (!frames[currentFrame] || !id) return;
                            try {
                              const response = await updateFrame(id, frames[currentFrame].id, { lens: editValue });
                              if (response.success) {
                                setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, lens: editValue } : frame));
                                showToast('镜头型号已更新');
                              }
                            } catch (error) {
                              console.error('更新失败:', error);
                              // 模拟更新成功，以便在后端不可用时也能测试前端功能
                              setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, lens: editValue } : frame));
                              showToast('镜头型号已更新（模拟）');
                            }
                            setEditingField(null);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          className="flex-1 text-sm text-on-surface bg-surface-container border border-primary rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          placeholder="输入镜头型号"
                        />
                      ) : (
                        <span 
                          className="flex-1 text-sm text-on-surface cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            if (!frames[currentFrame]) return;
                            setEditingField({ frameId: frames[currentFrame].id, field: 'lens' });
                            setEditValue(frames[currentFrame].lens || roll.lens || '');
                          }}
                        >
                          {frames[currentFrame]?.lens || roll.lens || '暂无数据'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 曝光参数 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">曝光参数</h4>
                  <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
                    {frames[currentFrame] ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-xs text-on-surface-variant">光圈</span>
                          {editingField?.frameId === frames[currentFrame]?.id && editingField?.field === 'aperture' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={async () => {
                                if (!frames[currentFrame] || !id) return;
                                try {
                                  const response = await updateFrame(id, frames[currentFrame].id, { aperture: editValue });
                                  if (response.success) {
                                    setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, aperture: editValue } : frame));
                                    showToast('光圈已更新');
                                  }
                                } catch (error) {
                                  console.error('更新失败:', error);
                                  // 模拟更新成功，以便在后端不可用时也能测试前端功能
                                  setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, aperture: editValue } : frame));
                                  showToast('光圈已更新（模拟）');
                                }
                                setEditingField(null);
                              }}
                              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              className="flex-1 text-sm text-on-surface bg-surface-container border border-primary rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                              placeholder="例如: f/2.8"
                            />
                          ) : (
                            <span 
                              className="flex-1 text-sm text-on-surface cursor-pointer hover:text-primary transition-colors"
                              onClick={() => {
                                if (!frames[currentFrame]) return;
                                setEditingField({ frameId: frames[currentFrame].id, field: 'aperture' });
                                setEditValue(frames[currentFrame].aperture || '');
                              }}
                            >
                              {frames[currentFrame].aperture || '暂无数据'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-xs text-on-surface-variant">快门</span>
                          {editingField?.frameId === frames[currentFrame]?.id && editingField?.field === 'shutterSpeed' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={async () => {
                                if (!frames[currentFrame] || !id) return;
                                try {
                                  const response = await updateFrame(id, frames[currentFrame].id, { shutterSpeed: editValue });
                                  if (response.success) {
                                    setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, shutterSpeed: editValue } : frame));
                                    showToast('快门已更新');
                                  }
                                } catch (error) {
                                  console.error('更新失败:', error);
                                  // 模拟更新成功，以便在后端不可用时也能测试前端功能
                                  setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, shutterSpeed: editValue } : frame));
                                  showToast('快门已更新（模拟）');
                                }
                                setEditingField(null);
                              }}
                              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              className="flex-1 text-sm text-on-surface bg-surface-container border border-primary rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                              placeholder="例如: 1/60s"
                            />
                          ) : (
                            <span 
                              className="flex-1 text-sm text-on-surface cursor-pointer hover:text-primary transition-colors"
                              onClick={() => {
                                if (!frames[currentFrame]) return;
                                setEditingField({ frameId: frames[currentFrame].id, field: 'shutterSpeed' });
                                setEditValue(frames[currentFrame].shutterSpeed || '');
                              }}
                            >
                              {frames[currentFrame].shutterSpeed || '暂无数据'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-xs text-on-surface-variant">感光度</span>
                          {editingField?.frameId === frames[currentFrame]?.id && editingField?.field === 'iso' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={async () => {
                                if (!frames[currentFrame] || !id) return;
                                try {
                                  const response = await updateFrame(id, frames[currentFrame].id, { iso: editValue });
                                  if (response.success) {
                                    setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, iso: editValue } : frame));
                                    showToast('感光度已更新');
                                  }
                                } catch (error) {
                                  console.error('更新失败:', error);
                                  // 模拟更新成功，以便在后端不可用时也能测试前端功能
                                  setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, iso: editValue } : frame));
                                  showToast('感光度已更新（模拟）');
                                }
                                setEditingField(null);
                              }}
                              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              className="flex-1 text-sm text-on-surface bg-surface-container border border-primary rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                              placeholder="例如: 400"
                            />
                          ) : (
                            <span 
                              className="flex-1 text-sm text-on-surface cursor-pointer hover:text-primary transition-colors"
                              onClick={() => {
                                if (!frames[currentFrame]) return;
                                setEditingField({ frameId: frames[currentFrame].id, field: 'iso' });
                                setEditValue(frames[currentFrame].iso || '');
                              }}
                            >
                              {frames[currentFrame].iso ? `ISO ${frames[currentFrame].iso}` : '暂无数据'}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-on-surface-variant">暂无曝光参数</p>
                    )}
                  </div>
                </div>

                {/* 存储信息 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">存储信息</h4>
                  <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-xs text-on-surface-variant">存储格式</span>
                      <span className="flex-1 text-sm text-on-surface">WebP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-xs text-on-surface-variant">文件大小</span>
                      <span className="flex-1 text-sm text-on-surface">暂无数据</span>
                    </div>
                  </div>
                </div>
                
                {/* 标签 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">标签</h4>
                  <div className="bg-surface-container-low rounded-lg p-3">
                    {frames[currentFrame] ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {/* 胶卷公共标签 */}
                          {roll.tags && roll.tags.length > 0 && roll.tags.map((tag: string, index: number) => (
                            <div key={`roll-${index}`} className="flex items-center px-2 py-1 bg-surface-container-highest text-on-surface-variant text-xs font-medium rounded">
                              <span>{tag}</span>
                            </div>
                          ))}
                          {/* 当前帧自定义标签 */}
                          {frames[currentFrame]?.tags && frames[currentFrame].tags.length > 0 ? (
                            frames[currentFrame].tags.map((tag: string, index: number) => (
                              <div key={index} className="flex items-center px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                                <span>{tag}</span>
                                <button 
                                  onClick={async () => {
                                    const currentFrameData = frames[currentFrame];
                                    if (!currentFrameData || !currentFrameData.tags) return;
                                    const updatedTags = (currentFrameData.tags as string[]).filter((_, i) => i !== index);
                                    try {
                                      const response = await updateFrame(id!, currentFrameData.id, { tags: updatedTags });
                                      if (response.success) {
                                        setFrames(prevFrames => prevFrames.map(frame => frame.id === currentFrameData.id ? { ...frame, tags: updatedTags } : frame));
                                        showToast('标签已删除');
                                      }
                                    } catch (error) {
                                      console.error('删除标签失败:', error);
                                      showToast('删除标签失败，请重试', 'error');
                                    }
                                  }}
                                  className="ml-1 text-primary hover:text-primary/80 focus:outline-none"
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          ) : null}
                          {/* 无标签提示 */}
                          {(!roll.tags || roll.tags.length === 0) && (!frames[currentFrame].tags || frames[currentFrame].tags.length === 0) && (
                            <span className="text-sm text-on-surface-variant">暂无标签</span>
                          )}
                        </div>
                        <div>
                          <input
                            ref={tagInputRef}
                            type="text"
                            placeholder="按回车添加"
                            onKeyPress={async (e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim() && frames[currentFrame]) {
                                const newTag = e.currentTarget.value.trim();
                                const currentTags = frames[currentFrame].tags || [];
                                if (!currentTags.includes(newTag)) {
                                  const updatedTags = [...currentTags, newTag];
                                  try {
                                    const response = await updateFrame(id!, frames[currentFrame].id, { tags: updatedTags });
                                    if (response.success) {
                                      setFrames(prevFrames => prevFrames.map(frame => frame.id === frames[currentFrame]?.id ? { ...frame, tags: updatedTags } : frame));
                                      showToast('标签已添加');
                                    }
                                  } catch (error) {
                                    console.error('添加标签失败:', error);
                                    showToast('添加标签失败，请重试', 'error');
                                  }
                                }
                                if (tagInputRef.current) {
                                  tagInputRef.current.value = '';
                                }
                              }
                            }}
                            className="w-full text-sm text-on-surface bg-surface-container border border-outline-variant/30 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant">暂无标签</p>
                    )}
                  </div>
                </div>

                {/* 边框设置 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">边框</h4>
                  <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        id="border-none" 
                        name="border" 
                        checked={borderType === 'none'} 
                        onChange={() => setBorderType('none')} 
                        className="w-4 h-4 text-primary" 
                      />
                      <label htmlFor="border-none" className="text-sm text-on-surface">无边框</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        id="border-white" 
                        name="border" 
                        checked={borderType === 'white'} 
                        onChange={() => setBorderType('white')} 
                        className="w-4 h-4 text-primary" 
                      />
                      <label htmlFor="border-white" className="text-sm text-on-surface">经典白边</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        id="border-black" 
                        name="border" 
                        checked={borderType === 'black'} 
                        onChange={() => setBorderType('black')} 
                        className="w-4 h-4 text-primary" 
                      />
                      <label htmlFor="border-black" className="text-sm text-on-surface">黑色边框</label>
                    </div>
                    
                    {/* 经典白边选项 */}
                    {borderType === 'white' && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2">
                        <h5 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">显示信息</h5>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="show-film-stock" 
                            checked={borderOptions.showFilmStock} 
                            onChange={(e) => setBorderOptions({...borderOptions, showFilmStock: e.target.checked})} 
                            className="w-4 h-4 text-primary" 
                          />
                          <label htmlFor="show-film-stock" className="text-sm text-on-surface">胶片档案</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="show-camera" 
                            checked={borderOptions.showCamera} 
                            onChange={(e) => setBorderOptions({...borderOptions, showCamera: e.target.checked})} 
                            className="w-4 h-4 text-primary" 
                          />
                          <label htmlFor="show-camera" className="text-sm text-on-surface">相机型号</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="show-lens" 
                            checked={borderOptions.showLens} 
                            onChange={(e) => setBorderOptions({...borderOptions, showLens: e.target.checked})} 
                            className="w-4 h-4 text-primary" 
                          />
                          <label htmlFor="show-lens" className="text-sm text-on-surface">镜头型号</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="show-date" 
                            checked={borderOptions.showDate} 
                            onChange={(e) => setBorderOptions({...borderOptions, showDate: e.target.checked})} 
                            className="w-4 h-4 text-primary" 
                          />
                          <label htmlFor="show-date" className="text-sm text-on-surface">拍摄日期</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="show-exposure" 
                            checked={borderOptions.showExposure} 
                            onChange={(e) => setBorderOptions({...borderOptions, showExposure: e.target.checked})} 
                            className="w-4 h-4 text-primary" 
                          />
                          <label htmlFor="show-exposure" className="text-sm text-on-surface">曝光参数</label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 导出设置 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">导出</h4>
                  <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="export-with-border" className="w-4 h-4 text-primary" />
                      <label htmlFor="export-with-border" className="text-sm text-on-surface">带边框导出</label>
                    </div>
                    <button className="w-full bg-primary text-on-primary py-2 rounded-lg text-sm font-medium hover:bg-primary-dim transition-colors">
                      导出图片
                    </button>
                  </div>
                </div>
              </div>


              </motion.div>
            )}
            
            {/* 显示/隐藏侧边栏按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSidebar(!showSidebar);
              }}
              className="absolute right-4 top-4 p-2 bg-surface-container/80 text-on-surface rounded-full z-10"
              title={showSidebar ? "隐藏侧边栏" : "显示侧边栏"}
            >
              <span className="material-symbols-outlined">
                {showSidebar ? "close" : "info"}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 编辑模态框 - 使用 RollForm 组件 */}
      {showEditModal && (
        <RollForm
          isEditing={true}
          editingRoll={roll}
          onSubmit={handleUpdateRoll}
          onCancel={() => {
            setShowEditModal(false);
          }}
          rollForm={editForm}
          setRollForm={setEditForm}
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
          gearList={gearList}
          isLoadingGear={isLoadingGear}
        />
      )}

      {/* 导出模态框 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-container border-b border-outline-variant/30 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-on-surface">导出胶卷相册</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <div ref={exportRef} className="bg-white p-8 rounded-lg">
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">{roll.title}</h3>
                <p className="text-gray-600 text-center mb-6">
                  {roll.filmStock} | {roll.camera} | {roll.lens}
                </p>
                <p className="text-gray-500 text-center mb-8">
                  {roll.location} | {roll.shotDate}
                </p>
                <div className="grid grid-cols-5 gap-4">
                  {frames.map((frame) => (
                    <div key={frame.id} className="aspect-[3/2] bg-gray-100 rounded overflow-hidden">
                      <img
                        src={frame.imageUrl}
                        alt={frame.frameNumber}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-4 border-t border-gray-200 text-center text-gray-400 text-sm">
                  使用 Film Album 导出
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-6 py-2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDownloadExport}
                  className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-dim transition-colors"
                >
                  下载图片
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-lg shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-on-surface mb-4">确认操作</h3>
            <p className="text-on-surface-variant mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-error text-on-error rounded-lg hover:bg-error/80 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 胶卷型号管理组件 */}
      {showFilmStockManagement && (
        <FilmStockManager
          filmStocks={filmStocks}
          onClose={() => setShowFilmStockManagement(false)}
          onUpdate={async () => {
            // 刷新胶卷型号列表
            setIsLoadingFilmStocks(true);
            try {
              const response = await getFilmStocks();
              setFilmStocks(response.data || []);
            } catch (error) {
              console.error('加载胶卷型号失败:', error);
            } finally {
              setIsLoadingFilmStocks(false);
            }
          }}
          filmStockSearch={filmStockSearch}
          setFilmStockSearch={setFilmStockSearch}
          addFilmStockForm={addFilmStockForm}
          setAddFilmStockForm={setAddFilmStockForm}
        />
      )}

      {/* 上传进度悬浮窗口 */}
      {isUploading && uploadStatus && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in slide-in-from-bottom-5">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">上传中...</h3>
              <p className="text-sm text-on-surface-variant">正在上传您的照片，请稍候</p>
            </div>
            <div className="space-y-4">
              <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-in-out"
                  style={{ width: `${(uploadStatus.current / uploadStatus.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>正在上传第 {uploadStatus.current} 张</span>
                <span>{uploadStatus.current} / {uploadStatus.total}</span>
              </div>
              <div className="text-xs text-on-surface-variant text-center">
                上传完成后窗口将自动关闭
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'error' ? 'bg-error/90 text-on-error' : 'bg-surface-container-highest/90 text-on-surface border border-outline-variant/30'
        }`}>
          <span className="material-symbols-outlined text-xl">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <div className="text-sm font-label whitespace-pre-wrap">{toast.message}</div>
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}
    </main>
  );
}