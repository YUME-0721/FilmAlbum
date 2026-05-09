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
import { useTranslation } from '../src/hooks/useTranslation';
import FilmStockManager from '../components/FilmStockManager';
import RollForm from '../components/RollForm';
import { 
  ArrowLeft, ImagePlus, Pencil, Download, Trash2, Camera, Calendar, 
  MapPin, Maximize, Library, ArrowUp, ArrowDown, ChevronLeft, 
  ChevronRight, Share2, X, Info, CloudUpload, AlertCircle, CheckCircle2 
} from 'lucide-react';

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
  const { t, language } = useTranslation();
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
  const [slideDirection, setSlideDirection] = useState(0); // 1 = 下一张（向左），-1 = 上一张（向右）
  const [filmStockData, setFilmStockData] = useState<FilmStock | null>(null);


  /** 切换帧，附带方向感知 */
  const goToFrame = useCallback((targetIndex: number) => {
    setSlideDirection(targetIndex > currentFrame ? 1 : -1);
    setCurrentFrame(targetIndex);
  }, [currentFrame]);

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

          // 加载详细胶卷型号信息
          if (data.filmStock) {
            fetchFilmStockDetail(data.filmStock);
          }
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

  const fetchFilmStockDetail = async (stockName: string) => {
    try {
      const response = await getFilmStocks();
      if (response.success && response.data) {
        // 先尝试通过型号完全匹配
        let stock = response.data.find(s => s.model === stockName || `${s.brand} ${s.model}` === stockName);
        if (!stock) {
          // 模糊匹配
          stock = response.data.find(s => stockName.toLowerCase().includes(s.model.toLowerCase()));
        }
        if (stock) setFilmStockData(stock);
      }
    } catch (error) {
      console.error('加载胶卷详情失败:', error);
    }
  };

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

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus({ current: i + 1, total: files.length });
        
        try {
          const uploadResult = await uploadImage(file, id, 'frame');
          const imageUrl = uploadResult.url;
          const previewUrl = uploadResult.previewUrl;
          
          const newFrame: FrameItem = {
            id: `temp-${Date.now()}-${i}`,
            imageUrl,
            previewUrl,
            frameNumber: String(frames.length + successCount + 1).padStart(2, '0') + 'A',
            aperture: '',
            shutterSpeed: '',
            iso: '',
            description: '',
            sortOrder: frames.length + successCount,
            fileSize: file.size,
            fileFormat: file.type
          };

          // 立即同步到服务器，防止后续失败导致已上传图片丢失
          const addResponse = await addFrames(id, [newFrame]);
          if (addResponse.success) {
            const addedFrame = (addResponse.data?.[0] as FrameItem) || newFrame;
            setFrames(prev => [...prev, addedFrame]);
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`第 ${i + 1} 张图片上传失败:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        // 最终同步一次完整的胶卷信息，确保状态一致
        const rollResponse = await getRoll(id);
        if (rollResponse.success && rollResponse.data) {
          setRoll(rollResponse.data);
          setFrames(rollResponse.data.frames || []);
        }
        showToast(`成功添加 ${successCount} 张照片${failCount > 0 ? `，${failCount} 张失败` : ''}`);
      } else if (failCount > 0) {
        showToast('所有照片上传失败', 'error');
      }
    } catch (error) {
      console.error('上传流程异常:', error);
      showToast(error instanceof Error ? error.message : '上传流程异常', 'error');
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
      message: t('common.confirm_delete'),
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
          <p className="text-on-surface-variant">{t('common.loading')}</p>
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
              <ArrowLeft size={24} />
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
              title={t('common.upload')}
            >
              <ImagePlus size={24} />
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="p-2 hover:bg-surface-variant rounded-full transition-colors"
              title={t('common.edit')}
            >
              <Pencil size={24} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="p-2 hover:bg-surface-variant rounded-full transition-colors"
              title="Export"
            >
              <Download size={24} />
            </button>
            <button
              type="button"
              onClick={handleDeleteRoll}
              className="p-2 hover:bg-error/10 text-error rounded-full transition-colors"
              title={t('common.delete')}
            >
              <Trash2 size={24} />
            </button>
          </div>
        </div>
        
        {/* 胶卷信息行 */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-on-surface-variant">
          {roll.camera && (
            <div className="flex items-center gap-1">
              <Camera size={14} />
              <span>{roll.camera}</span>
            </div>
          )}
          {roll.lens && (
            <div className="flex items-center gap-1">
              <Camera size={14} />
              <span>{roll.lens}</span>
            </div>
          )}
          {roll.shotDate && (
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{roll.shotDate}</span>
            </div>
          )}
          {roll.location && (
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{roll.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Maximize size={14} />
            <span>{roll.format === '135' ? '135' : roll.format === '120' ? '120' : roll.format || '-'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{roll.filmType === 'COLOR_NEGATIVE' ? 'Color Negative' : 
                 roll.filmType === 'BW_NEGATIVE' ? 'B&W Negative' : 
                 roll.filmType === 'COLOR_POSITIVE' ? 'Color Positive' : 
                 roll.filmType === 'BW_POSITIVE' ? 'B&W Positive' : 
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
          <div 
            className="text-center py-24 text-on-surface-variant border-2 border-dashed border-outline-variant/10 rounded-2xl cursor-pointer hover:bg-surface-container-low hover:border-primary/30 transition-all duration-300 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload size={64} className="mb-6 opacity-30 mx-auto group-hover:text-primary group-hover:opacity-100 transition-all duration-500" />
            <p className="font-headline font-bold text-xl mb-2 text-on-surface group-hover:text-primary transition-colors">{t('profile.roll.noPhoto')}</p>
            <p className="font-body text-sm opacity-70 group-hover:opacity-100 transition-opacity">{t('profile.roll.noPhotoDesc')}</p>
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
                    <ArrowUp size={16} className="text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveFrame(index, 'down');
                    }}
                    disabled={index === frames.length - 1}
                    className="p-1 bg-white/20 rounded hover:bg-white/30 disabled:opacity-30"
                  >
                    <ArrowDown size={16} className="text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFrame(frame.id);
                    }}
                    className="p-1 bg-error/80 rounded hover:bg-error"
                  >
                    <Trash2 size={16} className="text-white" />
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
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl overflow-hidden"
            onClick={() => setShowLightbox(false)}
          >
            {/* 左侧返回按钮 */}
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-6 left-6 p-3 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white backdrop-blur-md transition-all z-10"
            >
              <ArrowLeft size={24} />
            </button>

            {/* 主内容区 */}
            <div className="absolute inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              {/* 上一张 - 固定在全屏区域左侧 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToFrame(currentFrame > 0 ? currentFrame - 1 : frames.length - 1);
                }}
                className="absolute left-8 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white z-10"
              >
                <ChevronLeft size={48} />
              </button>

              {/* 下一张 - 固定在全屏区域右侧 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToFrame(currentFrame < frames.length - 1 ? currentFrame + 1 : 0);
                }}
                className={`absolute top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white z-10 ${showSidebar && isDesktop ? 'right-[336px]' : 'right-8'}`}
              >
                <ChevronRight size={48} />
              </button>

              {/* 图片 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 0 }}
                animate={{ opacity: 1, scale: 1, x: showSidebar && isDesktop ? -116 : 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 0 }}
                transition={{ duration: 0.2 }}
                className="relative max-w-[70vw] max-h-[80vh] flex flex-col items-center"
              >
                <div onClick={(e) => e.stopPropagation()} className="relative overflow-hidden">
                  <AnimatePresence mode="popLayout" custom={slideDirection} initial={false}>
                    {frames[currentFrame] && (
                      <motion.div
                        key={currentFrame}
                        custom={slideDirection}
                        variants={{
                          enter: (dir: number) => ({ opacity: 0, x: dir * 60 }),
                          center: { opacity: 1, x: 0 },
                          exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
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
                                    const logo = filmStockData?.brandLogo || (() => {
                                      const brandName = roll.filmStock.split(' ')[0];
                                      return commonBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase())?.logoUrl;
                                    })();

                                    if (logo) {
                                      return (
                                        <div className="w-10 h-10">
                                          <img 
                                            src={logo} 
                                            alt={roll.filmStock} 
                                            className="w-full h-full object-contain" 
                                          />
                                        </div>
                                      );
                                    } else {
                                      const brandName = filmStockData?.brand || roll.filmStock.split(' ')[0];
                                      return (
                                        <div className="w-10 h-10 bg-yellow-500 flex items-center justify-center">
                                          <span className="text-black font-bold text-sm">{brandName.charAt(0).toUpperCase()}</span>
                                        </div>
                                      );
                                    }
                                  })()}
                                  <div>
                                    <h5 className="font-bold font-lingxun">{filmStockData?.brand || roll.filmStock.split(' ')[0]}</h5>
                                    <h6 className="font-bold font-lingxun">{filmStockData?.model || roll.filmStock.split(' ').slice(1).join(' ')}</h6>
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* 张数提示 */}
              <div className="absolute bottom-4 left-4 text-white/80 text-sm z-10">
                {currentFrame + 1} / {frames.length}
              </div>
            </div>

            {/* 右侧侧边栏 */}
            {showSidebar && (
              <motion.div
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute right-0 top-0 bottom-0 w-[320px] bg-surface-container-lowest/80 backdrop-blur-3xl border-l border-white/5 flex flex-col z-20 no-scrollbar shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 侧边栏顶部 */}
                <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-transparent">
                  <h3 className="text-xl font-headline font-bold text-on-surface tracking-wide">{t('roll.info')}</h3>
                  <div className="flex gap-2">
                    <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-on-surface-variant hover:text-on-surface" title="Share">
                      <Share2 size={18} />
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-on-surface-variant hover:text-on-surface" title="Download">
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => setShowSidebar(false)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-on-surface-variant hover:text-on-surface"
                      title={t('common.cancel')}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

              {/* 侧边栏内容 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                {/* 胶片档案 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-on-surface-variant/80 pl-1">{t('roll.archive')}</h4>
                  <div className="bg-[#151515] rounded-xl p-6 shadow-sm">
                    {roll.filmStock ? (
                      <>
                        {/* 卡片上半部分 - LOGO和型号 */}
                         <div className="flex items-center gap-6 mb-8">
                          <div className="shrink-0">
                            {(() => {
                              const logo = filmStockData?.brandLogo || (() => {
                                const brandName = roll.filmStock.split(' ')[0];
                                return commonBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase())?.logoUrl;
                              })();

                              if (logo) {
                                return (
                                  <div className="w-[72px] h-[72px] rounded-[24px] overflow-hidden bg-transparent">
                                    <img 
                                      src={logo} 
                                      alt={roll.filmStock} 
                                      className="w-full h-full object-cover" 
                                    />
                                  </div>
                                );
                              } else {
                                const brandName = filmStockData?.brand || roll.filmStock.split(' ')[0];
                                return (
                                  <div className="w-[72px] h-[72px] bg-yellow-500 rounded-[24px] flex items-center justify-center">
                                    <span className="text-black font-serif font-bold text-3xl">{brandName.charAt(0).toUpperCase()}</span>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          <div className="flex flex-col justify-center">
                            <h5 className="text-[#f4f4f5] font-serif text-[28px] leading-[1.1] tracking-wide lining-nums">{filmStockData?.brand || roll.filmStock.split(' ')[0]}</h5>
                            <h6 className="text-[#f4f4f5] font-serif text-[28px] leading-[1.1] tracking-wide lining-nums mt-1">{filmStockData?.model || roll.filmStock.split(' ').slice(1).join(' ')}</h6>
                          </div>
                        </div>
                        {/* 卡片下半部分 - 类型和画幅 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[#a1a1aa] text-[13px] mb-2">{t('roll.type')}</p>
                            <p className="text-[#f4f4f5] text-base font-medium">
                              {roll.filmType === 'COLOR_NEGATIVE' ? t('roll.filmTypes.colorNegative') : 
                               roll.filmType === 'BW_NEGATIVE' ? t('roll.filmTypes.bwNegative') : 
                               roll.filmType === 'COLOR_POSITIVE' ? t('roll.filmTypes.colorPositive') : 
                               roll.filmType === 'BW_POSITIVE' ? t('roll.filmTypes.bwPositive') : 
                               roll.filmType || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[#a1a1aa] text-[13px] mb-2">{t('roll.form.format')}</p>
                            <p className="text-[#f4f4f5] text-base font-medium">{roll.format || '-'}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-center">
                        <p className="text-[#a1a1aa] text-sm">{t('roll.empty')}</p>
                        <p className="text-[#a1a1aa]/60 text-xs mt-1">Can be added in album settings</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 拍摄信息 */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-1">{t('roll.shotInfo')}</h4>
                  <div className="bg-surface-container/30 border border-white/5 backdrop-blur-md rounded-2xl p-1.5 flex flex-col">
                    <div className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                      <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">{t('roll.date')}</span>
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
                              showToast('更新失败，请重试', 'error');
                            }
                            setEditingField(null);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          className="w-40 text-sm font-medium text-on-surface/90 text-right bg-surface-container border border-primary/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          placeholder={roll.shotDate || "选择日期"}
                        />
                      ) : (
                        <span 
                          className="flex-1 text-sm font-medium text-on-surface/90 text-right cursor-pointer group-hover:text-primary transition-colors"
                          onClick={() => {
                            if (!frames[currentFrame]) return;
                            setEditingField({ frameId: frames[currentFrame].id, field: 'shotDate' });
                            setEditValue(frames[currentFrame].shotDate || '');
                          }}
                        >
                          {frames[currentFrame]?.shotDate || roll.shotDate || '-'}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                      <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">{t('roll.location')}</span>
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
                              showToast('更新失败，请重试', 'error');
                            }
                            setEditingField(null);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          className="w-40 text-sm font-medium text-on-surface/90 text-right bg-surface-container border border-primary/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          placeholder={roll.location || "输入拍摄地点"}
                        />
                      ) : (
                        <span 
                          className="flex-1 text-sm font-medium text-on-surface/90 text-right cursor-pointer group-hover:text-primary transition-colors"
                          onClick={() => {
                            if (!frames[currentFrame]) return;
                            setEditingField({ frameId: frames[currentFrame].id, field: 'location' });
                            setEditValue(frames[currentFrame].location || '');
                          }}
                        >
                          {frames[currentFrame]?.location || roll.location || '-'}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                      <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">{t('roll.camera')}</span>
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
                              showToast('更新失败，请重试', 'error');
                            }
                            setEditingField(null);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          className="w-40 text-sm font-medium text-on-surface/90 text-right bg-surface-container border border-primary/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          placeholder={roll.camera || "输入相机型号"}
                        />
                      ) : (
                        <span 
                          className="flex-1 text-sm font-medium text-on-surface/90 text-right cursor-pointer group-hover:text-primary transition-colors"
                          onClick={() => {
                            if (!frames[currentFrame]) return;
                            setEditingField({ frameId: frames[currentFrame].id, field: 'camera' });
                            setEditValue(frames[currentFrame].camera || '');
                          }}
                        >
                          {frames[currentFrame]?.camera || roll.camera || '-'}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                      <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">{t('roll.lens')}</span>
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
                              showToast('更新失败，请重试', 'error');
                            }
                            setEditingField(null);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          className="w-40 text-sm font-medium text-on-surface/90 text-right bg-surface-container border border-primary/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          placeholder={roll.lens || "输入镜头型号"}
                        />
                      ) : (
                        <span 
                          className="flex-1 text-sm font-medium text-on-surface/90 text-right cursor-pointer group-hover:text-primary transition-colors"
                          onClick={() => {
                            if (!frames[currentFrame]) return;
                            setEditingField({ frameId: frames[currentFrame].id, field: 'lens' });
                            setEditValue(frames[currentFrame].lens || '');
                          }}
                        >
                          {frames[currentFrame]?.lens || roll.lens || '-'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 曝光参数 */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-1">{t('roll.exposure')}</h4>
                  <div className="bg-surface-container/30 border border-white/5 backdrop-blur-md rounded-2xl p-1.5 flex flex-col">
                    {frames[currentFrame] ? (
                      <>
                        <div className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                          <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">{t('roll.aperture')}</span>
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
                                  showToast('更新失败，请重试', 'error');
                                }
                                setEditingField(null);
                              }}
                              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              className="w-40 text-sm font-medium text-on-surface/90 text-right bg-surface-container border border-primary/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                              placeholder="例如: f/2.8"
                            />
                          ) : (
                            <span 
                              className="flex-1 text-sm font-medium text-on-surface/90 text-right cursor-pointer group-hover:text-primary transition-colors"
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
                        <div className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                          <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">{t('roll.shutter')}</span>
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
                                  showToast('更新失败，请重试', 'error');
                                }
                                setEditingField(null);
                              }}
                              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              className="w-40 text-sm font-medium text-on-surface/90 text-right bg-surface-container border border-primary/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                              placeholder="例如: 1/60s"
                            />
                          ) : (
                            <span 
                              className="flex-1 text-sm font-medium text-on-surface/90 text-right cursor-pointer group-hover:text-primary transition-colors"
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
                        <div className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-xl transition-colors group">
                          <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">{t('roll.iso')}</span>
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
                                  showToast('更新失败，请重试', 'error');
                                }
                                setEditingField(null);
                              }}
                              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              className="w-40 text-sm font-medium text-on-surface/90 text-right bg-surface-container border border-primary/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                              placeholder="例如: 400"
                            />
                          ) : (
                            <span 
                              className="flex-1 text-sm font-medium text-on-surface/90 text-right cursor-pointer group-hover:text-primary transition-colors"
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
                      <p className="text-sm text-on-surface-variant">No details</p>
                    )}
                  </div>
                </div>

                {/* 存储信息 */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-1">Storage</h4>
                  <div className="bg-surface-container/30 border border-white/5 backdrop-blur-md rounded-2xl p-1.5 flex flex-col">
                    <div className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                      <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">Format</span>
                      <span className="flex-1 text-sm font-medium text-on-surface/90 text-right">
                        {frames[currentFrame]?.fileFormat 
                          ? frames[currentFrame].fileFormat!.split('/').pop()?.toUpperCase() 
                          : 'WebP'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                      <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">Size</span>
                      <span className="flex-1 text-sm font-medium text-on-surface/90 text-right">
                        {frames[currentFrame]?.fileSize 
                          ? (frames[currentFrame].fileSize! >= 1024 * 1024 
                              ? `${(frames[currentFrame].fileSize! / (1024 * 1024)).toFixed(2)} MB` 
                              : `${(frames[currentFrame].fileSize! / 1024).toFixed(1)} KB`)
                          : '暂无数据'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 标签 */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-1">{t('roll.tags')}</h4>
                  <div className="bg-surface-container/30 border border-white/5 backdrop-blur-md rounded-2xl p-4">
                    {frames[currentFrame] ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {/* 胶卷公共标签 */}
                          {roll.tags && roll.tags.length > 0 && roll.tags.map((tag: string, index: number) => (
                            <div key={`roll-${index}`} className="flex items-center px-2.5 py-1 bg-surface-container-highest text-on-surface-variant/80 text-[10px] font-bold tracking-wider rounded-lg">
                              <span>{tag}</span>
                            </div>
                          ))}
                          {/* 当前帧自定义标签 */}
                          {frames[currentFrame]?.tags && frames[currentFrame].tags.length > 0 ? (
                            frames[currentFrame].tags.map((tag: string, index: number) => (
                              <div key={index} className="flex items-center px-2.5 py-1 bg-primary/20 text-primary text-[10px] font-bold tracking-wider rounded-lg border border-primary/20">
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
                                  className="ml-1.5 text-primary/70 hover:text-primary focus:outline-none"
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          ) : null}
                          {/* 无标签提示 */}
                          {(!roll.tags || roll.tags.length === 0) && (!frames[currentFrame].tags || frames[currentFrame].tags.length === 0) && (
                            <span className="text-xs font-medium text-on-surface-variant/50">No Tags</span>
                          )}
                        </div>
                        <div>
                          <input
                            ref={tagInputRef}
                            type="text"
                            placeholder="Enter to add"
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

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Frame Border</h4>
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
                      <label htmlFor="border-none" className="text-sm text-on-surface">None</label>
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
                      <label htmlFor="border-white" className="text-sm text-on-surface">Classic White</label>
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
                      <label htmlFor="border-black" className="text-sm text-on-surface">Black Border</label>
                    </div>
                    
                    {/* 经典白边选项 */}
                    {borderType === 'white' && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2">
                        <h5 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Display Info</h5>
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

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Output</h4>
                  <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="export-with-border" className="w-4 h-4 text-primary" />
                      <label htmlFor="export-with-border" className="text-sm text-on-surface">Export with border</label>
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
                {showSidebar ? <X size={20} /> : <Info size={20} />}
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
          filmStockSearch={filmStockSearch}
          setFilmStockSearch={setFilmStockSearch}
          gearList={gearList}
          isLoadingGear={isLoadingGear}
        />
      )}

      {/* 导出模态框 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-container border-b border-outline-variant/30 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-on-surface">Export Roll Album</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X size={24} />
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
                  Exported with Film Album
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-6 py-2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDownloadExport}
                  className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-dim transition-colors"
                >
                  {t('common.save')}
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
            <h3 className="text-lg font-bold text-on-surface mb-4">{t('common.confirm')}</h3>
            <p className="text-on-surface-variant mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-error text-on-error rounded-lg hover:bg-error/80 transition-colors"
              >
                {t('common.confirm')}
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

      {isUploading && uploadStatus && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in slide-in-from-bottom-5">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <CloudUpload size={48} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">{t('common.uploading')}</h3>
              <p className="text-sm text-on-surface-variant">{t('common.uploadStatus.desc')}</p>
            </div>
            <div className="space-y-4">
              <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-in-out"
                  style={{ width: `${(uploadStatus.current / uploadStatus.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>{t('common.uploadStatus.uploading', { current: uploadStatus.current })}</span>
                <span>{uploadStatus.current} / {uploadStatus.total}</span>
              </div>
              <div className="text-xs text-on-surface-variant text-center">
                {t('common.uploadStatus.autoClose')}
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
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <div className="text-sm font-label whitespace-pre-wrap">{toast.message}</div>
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}