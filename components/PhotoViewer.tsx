/**
 * 照片查看器组件 (独立模块)
 * 支持带边框预览、元数据编辑、大图下载等功能
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Download, Share2, X, Info, ChevronLeft, ChevronRight,
  Camera, Calendar, MapPin, Eye, Check, ZoomIn, ZoomOut, RotateCw, RefreshCw
} from 'lucide-react';
import { useTranslation } from '../src/hooks/useTranslation';
import { updateFrame, type RollDetail, type FrameItem } from '../src/api/rolls.ts';
import { getFilmStocks, type FilmStock } from '../src/api/film-stocks.ts';
import { commonBrands } from '../src/constants/brands';

/** 格式化曝光补偿数值 */
export function formatExposureCompensation(val: string | undefined | null): string {
  if (val === undefined || val === null || val.trim() === '') return '';
  const clean = val.trim();
  if (clean === '0' || clean === '0.0') return '0';
  // 若无前导正负号且为正数，则添加前缀 "+"
  if (!clean.startsWith('+') && !clean.startsWith('-')) {
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 0) {
      return `+${clean}`;
    }
  }
  return clean;
}

/** 获取拼接后的曝光参数字符串 (光圈、快门、ISO、曝光补偿) */
export function getExposureString(f: any): string {
  const parts = [f.aperture, f.shutterSpeed, f.iso ? `ISO ${f.iso}` : ''];
  if (f.exposureCompensation && f.exposureCompensation !== '0' && f.exposureCompensation !== '0.0') {
    const comp = formatExposureCompensation(f.exposureCompensation);
    if (comp) {
      parts.push(`EV ${comp}`);
    }
  }
  return parts.filter(Boolean).join('  ');
}

interface PhotoViewerProps {
  roll: RollDetail;
  frames: FrameItem[];
  initialIndex: number;
  onClose: () => void;
  onFrameChange?: (index: number) => void;
  onUpdateFrames?: (newFrames: FrameItem[]) => void;
}

export default function PhotoViewer({ roll, frames: initialFrames, initialIndex, onClose, onFrameChange, onUpdateFrames }: PhotoViewerProps) {
  const { t } = useTranslation();
  const [frames, setFrames] = useState<FrameItem[]>(initialFrames);
  const [currentFrame, setCurrentFrame] = useState(initialIndex);
  const [slideDirection, setSlideDirection] = useState(0);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > window.innerHeight);
  const [borderType, setBorderType] = useState('none'); // none, white, black
  const [isExportWithBorder, setIsExportWithBorder] = useState(false);
  const [borderOptions, setBorderOptions] = useState({
    showFilmStock: true,
    showCamera: true,
    showLens: true,
    showDate: true,
    showExposure: true
  });
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > window.innerHeight);
  const [filmStockData, setFilmStockData] = useState<FilmStock | null>(null);
  const [editingField, setEditingField] = useState<{frameId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [lastAspectRatio, setLastAspectRatio] = useState<number>(1.5);
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  const [downloadQuality, setDownloadQuality] = useState<'original' | 'preview'>('original');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const borderContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // 自由缩放（放大镜功能）与旋转交互状态
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  // NOTE: 全屏滑动翻页所需的触摸起始点 ref，覆盖图片上下方的空白区域
  const swipeTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  // 监听边框容器宽度，用于动态计算比例
  useEffect(() => {
    if (!borderContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(borderContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // 当当前帧改变时，重置图片加载状态，并预加载相邻图片
  useEffect(() => {
    // 检查当前图片是否已经加载完成（特别是预加载过的情况）
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setIsImageLoading(false);
    } else {
      setIsImageLoading(true);
    }
    
    setIsShowingOriginal(false);

    // 预加载上一张和下一张
    const preloadIndices = [
      currentFrame === 0 ? frames.length - 1 : currentFrame - 1,
      currentFrame === frames.length - 1 ? 0 : currentFrame + 1
    ];

    preloadIndices.forEach(idx => {
      if (frames[idx]) {
        const img = new Image();
        img.src = frames[idx].previewUrl || frames[idx].imageUrl;
      }
    });
  }, [currentFrame, frames]);

  // 同步外部 frames 变化
  useEffect(() => {
    setFrames(initialFrames);
  }, [initialFrames]);

  // 检测窗口大小
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 加载胶卷详情
  useEffect(() => {
    const fetchFilmStockDetail = async () => {
      if (!roll.filmStock) return;
      try {
        const response = await getFilmStocks();
        if (response.success && response.data) {
          const stockName = roll.filmStock;
          let stock = response.data.find(s => s.model === stockName || `${s.brand} ${s.model}` === stockName);
          if (!stock) {
            stock = response.data.find(s => stockName.toLowerCase().includes(s.model.toLowerCase()));
          }
          if (stock) setFilmStockData(stock);
        }
      } catch (error) {
        console.error('加载胶卷详情失败:', error);
      }
    };
    fetchFilmStockDetail();
  }, [roll.filmStock]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const goToFrame = useCallback((targetIndex: number) => {
    setSlideDirection(targetIndex > currentFrame ? 1 : -1);
    setCurrentFrame(targetIndex);
    onFrameChange?.(targetIndex);
    // 切换照片时，重置所有缩放、位移和旋转角度
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [currentFrame, onFrameChange]);

  // 双击图片放大或还原
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // 一键重置图片显示视图
  const handleResetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  // 顺时针旋转 90 度
  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // 计算在 90/270 度旋转下的智能铺满自适应缩放因子
  const getRotationScale = useCallback(() => {
    if (rotation !== 90 && rotation !== 270) return 1;
    if (!imgRef.current) {
      // 兜底降级方案：若 DOM 节点未就绪，使用长宽比倒数进行基本收缩
      return lastAspectRatio > 1 ? 1 / lastAspectRatio : 1;
    }

    const w_orig = imgRef.current.clientWidth || 100;
    const h_orig = imgRef.current.clientHeight || 100;

    // 可用视窗宽高上限（预留安全边隙）
    // 宽屏模式下有展开侧边栏需避开
    const sidebarWidth = (showSidebar && window.innerWidth > window.innerHeight) ? 320 : 0;
    const w_avail = (window.innerWidth - sidebarWidth) * 0.92;
    const h_avail = window.innerHeight * (borderType === 'none' ? 0.85 : 0.72);

    // 旋转后立起来：原本的渲染高变为新宽，原本的渲染宽变为新高
    const w_new = h_orig;
    const h_new = w_orig;

    // 分别计算在宽度、高度两个方向上铺满可视区且不溢出的最大可用缩放倍率
    const scaleW = w_avail / w_new;
    const scaleH = h_avail / h_new;

    // 取其中较小的值，使图片恰好顶满最大的一边且全图完整可见不超出屏幕
    return Math.min(scaleW, scaleH);
  }, [rotation, lastAspectRatio, showSidebar, borderType]);

  // 鼠标拖动与触屏平移（Pan）处理器
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    // 限制拖拽边界，防止图片完全被拖出可视区。
    // 在当前旋转缩放状态下，图片可移动的最大物理溢出偏移范围
    let boundX = 0;
    let boundY = 0;
    if (imgRef.current) {
      const rotScale = getRotationScale();
      const currentScale = scale * rotScale;
      if (scale > 1) {
        boundX = (imgRef.current.clientWidth * currentScale - imgRef.current.clientWidth * rotScale) / 2;
        boundY = (imgRef.current.clientHeight * currentScale - imgRef.current.clientHeight * rotScale) / 2;
      }
    }
    
    setPosition({
      x: boundX > 0 ? Math.max(-boundX, Math.min(boundX, newX)) : 0,
      y: boundY > 0 ? Math.max(-boundY, Math.min(boundY, newY)) : 0
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragStartRef.current.x;
    const newY = touch.clientY - dragStartRef.current.y;

    let boundX = 0;
    let boundY = 0;
    if (imgRef.current) {
      const rotScale = getRotationScale();
      const currentScale = scale * rotScale;
      if (scale > 1) {
        boundX = (imgRef.current.clientWidth * currentScale - imgRef.current.clientWidth * rotScale) / 2;
        boundY = (imgRef.current.clientHeight * currentScale - imgRef.current.clientHeight * rotScale) / 2;
      }
    }

    setPosition({
      x: boundX > 0 ? Math.max(-boundX, Math.min(boundX, newX)) : 0,
      y: boundY > 0 ? Math.max(-boundY, Math.min(boundY, newY)) : 0
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleUpdateFrameData = async (frameId: string, field: string, value: any) => {
    try {
      const response = await updateFrame(roll.id, frameId, { [field]: value });
      if (response.success) {
        const newFrames = frames.map(f => f.id === frameId ? { ...f, [field]: value } : f);
        setFrames(newFrames);
        onUpdateFrames?.(newFrames);
        showToast(t('roll.updateSuccess'));
      }
    } catch (error) {
      console.error('更新失败:', error);
      showToast(t('common.error'), 'error');
    }
    setEditingField(null);
  };

  const handleDownloadCurrentFrame = async (forceQuality?: 'original' | 'preview') => {
    const frame = frames[currentFrame];
    if (!frame || !roll) return;

    const quality = forceQuality || downloadQuality;
    const imageUrl = quality === 'original' ? frame.imageUrl : (frame.previewUrl || frame.imageUrl);
    const isOriginal = quality === 'original' || !frame.previewUrl;

    setIsExporting(true);
    setExportProgress(10);

    try {
      if (!isExportWithBorder || borderType === 'none') {
        setExportProgress(40);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        setExportProgress(80);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${roll.title}_${frame.frameNumber}${isOriginal ? '' : '_preview'}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setExportProgress(100);
        setTimeout(() => setIsExporting(false), 500);
        showToast('图片下载成功');
        return;
      }

      setExportProgress(20);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      setExportProgress(25);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      setExportProgress(40);
      const blobUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.src = blobUrl;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(null);
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Failed to load image into canvas'));
        };
      });

      setExportProgress(50);

      const isVertical = img.height > img.width;
      // 彻底解决比例不一：完全对齐网页 CSS 逻辑，所有边距和尺寸均以图片宽度为基准
      const refWidth = img.width;
      
      const sidePadding = refWidth * 0.056; 
      const topPadding = refWidth * 0.056;
      const infoHeight = refWidth * 0.06; // 信息块内容高度
      const vPadding = refWidth * 0.04; // 上下对等边距以实现垂直居中
      
      const bottomArea = infoHeight + vPadding * 2;
      
      canvas.width = img.width + sidePadding * 2;
      canvas.height = img.height + topPadding + bottomArea;

      setExportProgress(60);

      ctx.fillStyle = borderType === 'white' ? '#ffffff' : '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sidePadding, topPadding);

      const textColor = borderType === 'white' ? '#1a1a1a' : '#ffffff';
      ctx.fillStyle = textColor;
      
      const fontSizeLarge = Math.round(refWidth * 0.030);
      const fontSizeMedium = Math.round(refWidth * 0.024);
      const fontSizeSmall = Math.round(refWidth * 0.018);
      
      // 信息层垂直位置：在底部区域绝对垂直居中
      const infoYCenter = canvas.height - bottomArea / 2;

      // 移除左下角顺序数字

      if (borderOptions.showFilmStock) {
        const brand = filmStockData?.brand || roll.filmStock.split(' ')[0];
        const model = filmStockData?.model || (roll.filmStock.includes(' ') ? roll.filmStock.split(' ').slice(1).join(' ') : roll.filmStock);
        const logoUrl = filmStockData?.brandLogo || (() => {
          const brandName = roll.filmStock.split(' ')[0];
          return commonBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase())?.logoUrl;
        })();

        let textX = sidePadding;
        if (logoUrl) {
          try {
            const logoRes = await fetch(logoUrl);
            if (logoRes.ok) {
              const logoBlob = await logoRes.blob();
              const logoBlobUrl = URL.createObjectURL(logoBlob);
              const logo = new Image();
              logo.src = logoBlobUrl;
              await new Promise((res) => {
                logo.onload = () => {
                  URL.revokeObjectURL(logoBlobUrl);
                  res(null);
                };
                logo.onerror = res;
              });
              const logoSize = Math.round(refWidth * 0.058);
              ctx.drawImage(logo, sidePadding, infoYCenter - logoSize / 2, logoSize, logoSize);
              textX += logoSize + sidePadding * 0.2;
            }
          } catch (e) {
            console.warn('Failed to load logo:', e);
          }
        }
        
        ctx.textAlign = 'left';
        ctx.font = `bold ${fontSizeLarge}px "Libre Caslon Text", serif`;
        ctx.fillText(brand, textX, infoYCenter - fontSizeLarge * 0.1);
        ctx.font = `500 ${fontSizeMedium}px "Libre Caslon Text", serif`;
        ctx.globalAlpha = 0.7;
        ctx.fillText(model, textX, infoYCenter + fontSizeMedium * 1.0);
        ctx.globalAlpha = 1.0;
      }

      ctx.textAlign = 'right';
      const infoFont = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      const camera = borderOptions.showCamera ? (frame.camera || roll.camera) : '';
      const lens = borderOptions.showLens ? (frame.lens || roll.lens) : '';
      const date = borderOptions.showDate ? (frame.shotDate || roll.shotDate) : '';
      const exposure = borderOptions.showExposure ? getExposureString(frame) : '';

      const hasLeft = !!(camera || lens);
      const hasRight = !!(date || exposure);
      
      if (hasLeft || hasRight) {
        ctx.textAlign = 'right';
        const rightMargin = sidePadding;
        let currentX = canvas.width - rightMargin;

        // 计算右列宽度
        ctx.font = `600 ${fontSizeMedium}px ${infoFont}`;
        const dateWidth = date ? ctx.measureText(date).width : 0;
        ctx.font = `400 ${fontSizeSmall}px ${infoFont}`;
        const expWidth = exposure ? ctx.measureText(exposure).width : 0;
        const rightColWidth = Math.max(dateWidth, expWidth);

        // 绘制右列
        if (hasRight) {
          if (date && exposure) {
            ctx.textAlign = 'left';
            ctx.font = `600 ${fontSizeMedium}px ${infoFont}`;
            ctx.globalAlpha = 0.9;
            ctx.fillText(date, canvas.width - rightMargin - rightColWidth, infoYCenter - fontSizeMedium * 0.2);
            ctx.font = `400 ${fontSizeSmall}px ${infoFont}`;
            ctx.globalAlpha = 0.6;
            ctx.fillText(exposure, canvas.width - rightMargin - rightColWidth, infoYCenter + fontSizeMedium * 0.8);
          } else {
            ctx.textAlign = 'right';
            ctx.font = `600 ${fontSizeLarge * 0.8}px ${infoFont}`;
            ctx.globalAlpha = 0.9;
            ctx.fillText(date || exposure, canvas.width - rightMargin, infoYCenter + fontSizeLarge * 0.25);
          }
        }

        // 绘制分隔线
        if (hasLeft && hasRight) {
          const dividerX = canvas.width - rightMargin - rightColWidth - fontSizeMedium * 1.0;
          ctx.globalAlpha = 0.25;
          const dividerWidth = Math.max(2, Math.round(refWidth * 0.0015));
          ctx.fillRect(dividerX, infoYCenter - fontSizeMedium * 0.8, dividerWidth, fontSizeMedium * 1.6);
          currentX = dividerX - fontSizeMedium * 1.0;
        }

        // 绘制左列
        if (hasLeft) {
          ctx.textAlign = 'right';
          if (camera && lens) {
            ctx.font = `600 ${fontSizeMedium}px ${infoFont}`;
            ctx.globalAlpha = 0.9;
            ctx.fillText(camera, currentX, infoYCenter - fontSizeMedium * 0.25);
            ctx.font = `400 ${fontSizeSmall}px ${infoFont}`;
            ctx.globalAlpha = 0.6;
            ctx.fillText(lens, currentX, infoYCenter + fontSizeMedium * 0.9);
          } else {
            ctx.font = `600 ${fontSizeLarge * 0.8}px ${infoFont}`;
            ctx.globalAlpha = 0.9;
            ctx.fillText(camera || lens, currentX, infoYCenter + fontSizeLarge * 0.25);
          }
        }
      }
      ctx.globalAlpha = 1.0;

      setExportProgress(90);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${roll.title}_${frame.frameNumber}_bordered${isOriginal ? '' : '_preview'}.jpg`;
      link.click();
      setExportProgress(100);
      setTimeout(() => setIsExporting(false), 500);
      showToast('图片下载成功');
    } catch (error) {
      console.error('Download failed:', error);
      setIsExporting(false);
      showToast('图片处理失败', 'error');
    }
  };

  // NOTE: 全屏滑动翻页处理器。覆盖整个查看器屏幕（含图片上下方空白），
  // 仅在未放大（scale <= 1）时识别横向滑动翻页，已放大时不拦截，交给内部拖拽 Pan 处理。
  const handleFullscreenTouchStart = (e: React.TouchEvent) => {
    if (scale > 1 || e.touches.length !== 1) return;
    const t = e.touches[0];
    swipeTouchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleFullscreenTouchEnd = (e: React.TouchEvent) => {
    if (scale > 1 || !swipeTouchStartRef.current || e.changedTouches.length !== 1) {
      swipeTouchStartRef.current = null;
      return;
    }
    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeTouchStartRef.current.x;
    const dy = touch.clientY - swipeTouchStartRef.current.y;
    swipeTouchStartRef.current = null;
    // 只有当横向滑动距离 > 50px 且横向位移明显大于纵向时，才识别为翻页手势
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) {
        goToFrame(currentFrame > 0 ? currentFrame - 1 : frames.length - 1);
      } else {
        goToFrame(currentFrame < frames.length - 1 ? currentFrame + 1 : 0);
      }
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-colors duration-500 ${
        borderType === 'black' ? 'bg-white/95' : 'bg-black/90'
      } backdrop-blur-2xl`}
      onTouchStart={handleFullscreenTouchStart}
      onTouchEnd={handleFullscreenTouchEnd}
    >
      {/* 导出进度提示 */}
      <AnimatePresence>
        {isExporting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="w-64 space-y-4">
              <div className="flex justify-between items-center text-white/90 text-sm font-medium">
                <span>{exportProgress < 100 ? '正在导出图片...' : '导出完成'}</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress}%` }}
                  className="h-full bg-primary"
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                />
              </div>
              <p className="text-white/40 text-[11px] text-center">正在处理高分辨率渲染，请稍候</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 顶部返回按钮 */}
      <button
        onClick={onClose}
        className={`absolute top-6 left-6 p-3 rounded-full backdrop-blur-md transition-all z-10 ${
          borderType === 'black' ? 'bg-black/5 text-black/70 hover:bg-black/10 hover:text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <ArrowLeft size={24} />
      </button>

      {/* 主内容区 */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {/* NOTE: 提升 Z-Index 至 z-40 解决在旋转 90/270 度立起图片时，由于 Stacking Context 层叠顺位图片将翻页按钮覆盖遮挡的 Bug。
            同时配合精美的毛玻璃圆形背板（Glassmorphism）和微缩放交互，使得哪怕在纯白/纯黑的极亮/极暗背景相片上，翻页箭头也依然保持无与伦比的高辨识度与极奢手感。 */}
        {/* NOTE: 移动端依靠左右滑动手势翻页（onDragEnd），因此在小屏幕下隐藏翻页按钮（hidden md:flex），避免遮挡图片内容。 */}
        <button
          onClick={(e) => { e.stopPropagation(); goToFrame(currentFrame > 0 ? currentFrame - 1 : frames.length - 1); }}
          className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 hidden md:flex items-center justify-center active:scale-95 transition-all z-40 ${
            borderType === 'black' 
              ? 'text-black/35 hover:text-black/80 hover:scale-110' 
              : 'text-white/40 hover:text-white hover:scale-110'
          }`}
          title={t('common.prev') || '上一张'}
        >
          <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); goToFrame(currentFrame < frames.length - 1 ? currentFrame + 1 : 0); }}
          className={`absolute top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 hidden md:flex items-center justify-center active:scale-95 transition-all z-40 ${
            showSidebar && isDesktop ? 'right-[336px]' : 'right-4 md:right-8'
          } ${
            borderType === 'black' 
              ? 'text-black/35 hover:text-black/80 hover:scale-110' 
              : 'text-white/40 hover:text-white hover:scale-110'
          }`}
          title={t('common.next') || '下一张'}
        >
          <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
        </button>

        {/* 图片显示区 */}
        <motion.div
          layout
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: showSidebar && isDesktop ? -116 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-[92vw] md:max-w-[75vw] max-h-[85vh] flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
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
                drag={scale > 1 ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  const swipeThreshold = 50;
                  if (info.offset.x > swipeThreshold) {
                    goToFrame(currentFrame > 0 ? currentFrame - 1 : frames.length - 1);
                  } else if (info.offset.x < -swipeThreshold) {
                    goToFrame(currentFrame < frames.length - 1 ? currentFrame + 1 : 0);
                  }
                }}
              >
                <motion.div 
                  ref={borderContainerRef}
                  className={`mx-auto w-fit max-w-full ${borderType === 'none' ? '' : borderType === 'white' ? 'bg-white p-[5%] pb-[5%]' : 'bg-black p-[5%] pb-[5%]'} shadow-2xl transition-colors duration-500`}
                >
                  {/* NOTE: 在无边框或非放大状态下，不启用 overflow-hidden。这彻底解决了横版照片在旋转 90/270 度立起来时，顶部与底部被该父容器硬编码截断的 Bug。只有在带边框且处于放大拖动状态时（scale > 1 && borderType !== 'none'），才启用溢出限制，防止图像溢出到卡纸白框之外。 */}
                  <div className={`flex justify-center relative ${(scale > 1 && borderType !== 'none') ? 'overflow-hidden' : ''}`} style={{ minHeight: '200px' }}>
                    {isImageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm z-10">
                        <div className="animate-pulse text-white/20 text-xs font-bold uppercase tracking-widest">Loading...</div>
                      </div>
                    )}
                    <img
                      ref={imgRef}
                      src={isShowingOriginal ? frames[currentFrame].imageUrl : (frames[currentFrame].previewUrl || frames[currentFrame].imageUrl)}
                      alt={frames[currentFrame].frameNumber}
                      fetchPriority="high"
                      referrerPolicy="no-referrer"
                      onLoad={(e) => {
                        setLastAspectRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight);
                        setIsImageLoading(false);
                      }}
                      onError={() => {
                        setIsImageLoading(false);
                      }}
                      onDoubleClick={handleDoubleClick}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{ 
                        aspectRatio: lastAspectRatio,
                        opacity: isImageLoading ? 0 : 1,
                        transition: isDragging 
                          ? 'opacity 0.3s ease-in-out' 
                          : 'opacity 0.3s ease-in-out, transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale * getRotationScale()})`,
                        transformOrigin: 'center center',
                        cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                        touchAction: scale > 1 ? 'none' : 'auto'
                      }}
                      className={`object-contain shadow-2xl select-none ${borderType === 'none' ? 'max-w-full max-h-[85vh]' : 'max-h-[72vh] w-auto'}`}
                    />
                  </div>
                  {/* 边框信息层 */}
                  {borderType !== 'none' && containerWidth > 0 && (
                    <div 
                      className={`mt-[4%] flex justify-between items-center ${borderType === 'white' ? 'text-gray-800' : 'text-white'}`}
                      style={{ 
                        fontSize: `${Math.max(8, containerWidth * 0.024)}px`,
                        gap: `${containerWidth * 0.02}px`
                      }}
                    >
                      {borderOptions.showFilmStock && (
                        <div className="flex items-center" style={{ gap: `${containerWidth * 0.015}px` }}>
                           {(() => {
                              const logo = filmStockData?.brandLogo || (() => {
                                const brandName = roll.filmStock.split(' ')[0];
                                return commonBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase())?.logoUrl;
                              })();
                              const logoSize = containerWidth * 0.055;
                              return logo ? (
                                <img 
                                  src={logo} 
                                  className="object-contain" 
                                  style={{ width: logoSize, height: logoSize }}
                                  referrerPolicy="no-referrer" 
                                />
                              ) : (
                                <div 
                                  className="bg-yellow-500 flex items-center justify-center font-bold text-black rounded-[15%]"
                                  style={{ width: logoSize, height: logoSize, fontSize: `${logoSize * 0.6}px` }}
                                >
                                  {roll.filmStock.charAt(0)}
                                </div>
                              );
                           })()}
                           <div className="flex flex-col justify-center">
                             <h5 
                               className="font-bold font-caslon leading-[1.1]"
                               style={{ fontSize: `${containerWidth * 0.03}px` }}
                             >
                               {filmStockData?.brand || roll.filmStock.split(' ')[0]}
                             </h5>
                             <h6 
                               className="font-medium opacity-80 font-caslon leading-[1.1]"
                               style={{ fontSize: `${containerWidth * 0.022}px` }}
                             >
                               {(() => {
                                 const fullModel = filmStockData?.model || (roll.filmStock.includes(' ') ? roll.filmStock.split(' ').slice(1).join(' ') : roll.filmStock);
                                 const brand = filmStockData?.brand || roll.filmStock.split(' ')[0];
                                 if (fullModel.toLowerCase().startsWith(brand.toLowerCase())) {
                                   return fullModel.slice(brand.length).trim();
                                 }
                                 return fullModel;
                               })()}
                             </h6>
                           </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-end font-inter text-right" style={{ gap: `${containerWidth * 0.018}px` }}>
                        {/* 左列：相机与镜头 */}
                        {(borderOptions.showCamera || borderOptions.showLens) && (
                          <div className="flex flex-col items-end">
                            {borderOptions.showCamera && (frames[currentFrame].camera || roll.camera) && borderOptions.showLens && (frames[currentFrame].lens || roll.lens) ? (
                              <>
                                <span className="font-semibold tracking-tight leading-[1.1]" style={{ fontSize: `${containerWidth * 0.024}px` }}>{frames[currentFrame].camera || roll.camera}</span>
                                <span className="opacity-60 font-medium tracking-tight leading-[1.1]" style={{ fontSize: `${containerWidth * 0.016}px` }}>{frames[currentFrame].lens || roll.lens}</span>
                              </>
                            ) : (
                              <span className="font-semibold tracking-tight leading-none" style={{ fontSize: `${containerWidth * 0.026}px` }}>
                                {(borderOptions.showCamera && (frames[currentFrame].camera || roll.camera)) || (borderOptions.showLens && (frames[currentFrame].lens || roll.lens))}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 分隔线 */}
                        {(borderOptions.showCamera || borderOptions.showLens) && (borderOptions.showDate || borderOptions.showExposure) && (
                          <div 
                            className="bg-current opacity-20" 
                            style={{ height: `${containerWidth * 0.035}px`, width: `${Math.max(1, containerWidth * 0.0015)}px` }} 
                          />
                        )}

                        {/* 右列：日期与曝光 */}
                        {(borderOptions.showDate || borderOptions.showExposure) && (
                          <div className="flex flex-col items-start text-left">
                            {borderOptions.showDate && (frames[currentFrame].shotDate || roll.shotDate) && borderOptions.showExposure && getExposureString(frames[currentFrame]) ? (
                              <>
                                <span className="font-semibold tracking-tight leading-[1.1]" style={{ fontSize: `${containerWidth * 0.024}px` }}>{frames[currentFrame].shotDate || roll.shotDate}</span>
                                <span className="opacity-60 font-medium tracking-tight leading-[1.1]" style={{ fontSize: `${containerWidth * 0.016}px` }}>
                                  {getExposureString(frames[currentFrame])}
                                </span>
                              </>
                            ) : (
                              <span className="font-semibold tracking-tight leading-none" style={{ fontSize: `${containerWidth * 0.026}px` }}>
                                {(borderOptions.showDate && (frames[currentFrame].shotDate || roll.shotDate)) || 
                                 (borderOptions.showExposure && getExposureString(frames[currentFrame]))}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 高颜值悬浮毛玻璃控制条 */}
        {frames[currentFrame] && !isImageLoading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 py-1.5 px-4 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-2xl z-30 select-none transition-all hover:bg-black/70 hover:border-white/20">
            {/* 缩小 */}
            <button
              onClick={() => setScale(prev => Math.max(prev - 0.5, 1))}
              disabled={scale <= 1}
              className={`p-1.5 rounded-full transition-all ${
                scale <= 1 
                  ? 'text-white/20 cursor-not-allowed' 
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95'
              }`}
              title={t('common.zoomOut') || '缩小'}
            >
              <ZoomOut size={15} />
            </button>

            {/* 缩放比例 */}
            <span className="text-[11px] font-bold text-white/75 min-w-[36px] text-center font-mono">
              {Math.round(scale * 100)}%
            </span>

            {/* 放大 */}
            <button
              onClick={() => setScale(prev => Math.min(prev + 0.5, 4))}
              disabled={scale >= 4}
              className={`p-1.5 rounded-full transition-all ${
                scale >= 4 
                  ? 'text-white/20 cursor-not-allowed' 
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95'
              }`}
              title={t('common.zoomIn') || '放大'}
            >
              <ZoomIn size={15} />
            </button>

            {/* 分割线 */}
            <div className="w-[1px] h-3 bg-white/10" />

            {/* 旋转 */}
            <button
              onClick={handleRotate}
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all"
              title={t('common.rotate') || '旋转'}
            >
              <RotateCw size={15} />
            </button>

            {/* 一键复位 */}
            {(scale > 1 || rotation !== 0) && (
              <button
                onClick={handleResetView}
                className="p-1.5 rounded-full text-primary hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all animate-fade-in"
                title={t('common.reset') || '重置'}
              >
                <RefreshCw size={15} />
              </button>
            )}
          </div>
        )}

        {/* 张数指示 */}
        <div className={`absolute bottom-4 left-4 text-sm z-10 transition-colors ${
          borderType === 'black' ? 'text-black/60 font-bold' : 'text-white/80'
        }`}>
          {(currentFrame + 1).toString().padStart(2, '0')} / {frames.length.toString().padStart(2, '0')}
        </div>
      </div>

      {/* 侧边栏 */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            className="absolute right-0 top-0 bottom-0 w-[320px] bg-surface-container-lowest/80 backdrop-blur-3xl border-l border-white/5 flex flex-col z-20 shadow-2xl overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 侧边栏头部 */}
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center sticky top-0 bg-transparent backdrop-blur-xl z-10">
              <h3 className="text-xl font-bold text-on-surface">{t('roll.info')}</h3>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-on-surface-variant" onClick={() => handleDownloadCurrentFrame()} title={t('common.download')}>
                  <Download size={20} />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-on-surface-variant" onClick={() => setShowSidebar(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

              {/* 侧边栏内容 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                {/* 胶片档案 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-on-surface-variant/80 pl-1">{t('roll.archive')}</h4>
                  <div className="bg-[#151515] rounded-xl p-5 shadow-sm">
                    {roll.filmStock ? (
                      <>
                        {/* 卡片上半部分 - LOGO和型号 */}
                         <div className="flex items-center gap-8 mb-5">
                          <div className="shrink-0">
                            {(() => {
                              const logo = filmStockData?.brandLogo || (() => {
                                const brandName = roll.filmStock.split(' ')[0];
                                return commonBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase())?.logoUrl;
                              })();

                              if (logo) {
                                return (
                                  <div className="w-[60px] h-[60px] rounded-[20px] overflow-hidden bg-transparent">
                                    <img 
                                      src={logo} 
                                      alt={roll.filmStock} 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                );
                              } else {
                                const brandName = filmStockData?.brand || roll.filmStock.split(' ')[0];
                                return (
                                  <div className="w-[60px] h-[60px] bg-yellow-500 rounded-[20px] flex items-center justify-center">
                                    <span className="text-black font-slab font-bold text-2xl">{brandName.charAt(0).toUpperCase()}</span>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          <div className="flex flex-col justify-center font-slab text-[#f4f4f5]">
                            {(() => {
                              const brand = filmStockData?.brand || roll.filmStock.split(' ')[0];
                              const fullModel = filmStockData?.model || (roll.filmStock.includes(' ') ? roll.filmStock.split(' ').slice(1).join(' ') : roll.filmStock);
                              let model = fullModel;
                              if (fullModel.toLowerCase().startsWith(brand.toLowerCase())) {
                                model = fullModel.slice(brand.length).trim();
                              }
                              return (
                                <>
                                  <h5 className="text-xl font-medium opacity-95 leading-tight tracking-tight">{brand}</h5>
                                  <h6 className="text-[28px] font-black leading-tight tracking-tight -mt-0.5">{model}</h6>
                                </>
                              );
                            })()}
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
                        <p className="text-[#a1a1aa]/60 text-xs mt-1">{t('roll.placeholders.emptyDesc')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 拍摄信息 */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-1">{t('roll.shotInfo')}</h4>
                  <div className="bg-surface-container/30 border border-white/5 backdrop-blur-md rounded-2xl p-1.5 flex flex-col">
                    {[
                      { field: 'shotDate', label: t('roll.date'), placeholder: roll.shotDate },
                      { field: 'location', label: t('roll.location'), placeholder: roll.location },
                      { field: 'camera', label: t('roll.camera'), placeholder: roll.camera },
                      { field: 'lens', label: t('roll.lens'), placeholder: roll.lens }
                    ].map(item => (
                      <div key={item.field} className="flex justify-between items-center gap-4 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors group">
                        <span className="shrink-0 text-xs font-medium text-on-surface-variant/60">{item.label}</span>
                        {editingField?.field === item.field ? (
                          <input
                            autoFocus
                            type={item.field === 'shotDate' ? 'date' : 'text'}
                            className="bg-primary/20 text-white text-xs text-right px-2 py-1 rounded border border-primary/50 outline-none w-40"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => handleUpdateFrameData(frames[currentFrame].id, item.field, editValue)}
                            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                        ) : (
                          <span 
                            className="text-xs text-white/80 cursor-pointer group-hover:text-primary transition-colors text-right truncate max-w-[180px]"
                            onClick={() => { setEditingField({ frameId: frames[currentFrame].id, field: item.field }); setEditValue((frames[currentFrame] as any)[item.field] || ''); }}
                          >
                            {(frames[currentFrame] as any)[item.field] || item.placeholder || t('roll.noData')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 曝光参数 */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-1">{t('roll.exposure')}</h4>
                  <div className="bg-surface-container/30 border border-white/5 backdrop-blur-md rounded-2xl p-1.5 flex flex-col">
                       {['aperture', 'shutterSpeed', 'iso', 'exposureCompensation'].map(field => (
                          <div key={field} className="flex justify-between items-center px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group rounded-xl">
                             <span className="text-xs text-white/40">{t(`roll.${field}`)}</span>
                             {editingField?.field === field ? (
                                <input
                                   autoFocus
                                   className="bg-primary/20 text-white text-xs text-right px-2 py-1 rounded border border-primary/50 outline-none w-24"
                                   value={editValue}
                                   placeholder={field === 'exposureCompensation' ? t('roll.placeholders.exposureCompensation') : (t(`roll.placeholders.${field}`) || '')}
                                   onChange={e => setEditValue(e.target.value)}
                                   onBlur={() => handleUpdateFrameData(frames[currentFrame].id, field, editValue)}
                                   onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                                />
                             ) : (
                                <span 
                                   className="text-xs text-white/80 cursor-pointer group-hover:text-primary transition-colors"
                                   onClick={() => { setEditingField({ frameId: frames[currentFrame].id, field }); setEditValue((frames[currentFrame] as any)[field] || ''); }}
                                >
                                   {field === 'exposureCompensation' 
                                     ? (formatExposureCompensation((frames[currentFrame] as any)[field]) || '0') 
                                     : ((frames[currentFrame] as any)[field] || t('roll.noData'))}
                                </span>
                             )}
                          </div>
                       ))}
                    </div>
                  </div>

                {/* 存储信息 */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-1">{t('roll.storage')}</h4>
                  <div className="bg-surface-container/30 border border-white/5 backdrop-blur-md rounded-2xl p-1.5 flex flex-col">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors group rounded-xl">
                      <span className="text-xs text-white/40">{t('roll.fileFormat')}</span>
                      <span className="text-xs text-white/80 uppercase">{frames[currentFrame].fileFormat?.split('/')[1] || frames[currentFrame].fileFormat || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 hover:bg-white/5 transition-colors group rounded-xl">
                      <span className="text-xs text-white/40">{t('roll.fileSize')}</span>
                      <span className="text-xs text-white/80">
                        {frames[currentFrame].fileSize 
                          ? (frames[currentFrame].fileSize! / (1024 * 1024)).toFixed(2) + ' MB' 
                          : '-'}
                      </span>
                    </div>
                    {frames[currentFrame].previewUrl && (
                      <div className="mt-2 px-1.5 pb-1.5">
                        <button
                          onClick={() => {
                            if (!isShowingOriginal) {
                              setIsImageLoading(true);
                              setIsShowingOriginal(true);
                            }
                          }}
                          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                            isShowingOriginal 
                              ? 'bg-success/20 text-success cursor-default' 
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {isShowingOriginal ? <Check size={14} /> : <Eye size={14} />}
                          {isShowingOriginal ? t('roll.originalLoaded') : t('roll.viewOriginal')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                  {/* 标签 */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-1">{t('roll.tags')}</h4>
                    <div className="bg-surface-container/30 border border-white/5 backdrop-blur-md rounded-2xl p-4">
                      {frames[currentFrame] ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {(!roll.tags || roll.tags.length === 0) && (!frames[currentFrame].tags || frames[currentFrame].tags.length === 0) && (
                              <span className="text-[11px] text-on-surface-variant/30 italic py-0.5">{t('roll.noTags') || '暂无标签'}</span>
                            )}
                            {/* 胶卷公共标签 */}
                            {roll.tags?.map((tag, index) => (
                              <div key={`roll-${index}`} className="flex items-center px-2 py-0.5 bg-surface-container-highest text-on-surface-variant/80 text-[10px] font-bold tracking-wider rounded">
                                <span>{tag}</span>
                              </div>
                            ))}
                            {/* 帧标签 */}
                            {frames[currentFrame].tags?.map((tag: string, index: number) => (
                              <div key={index} className="flex items-center px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold tracking-wider rounded border border-primary/20">
                                <span>{tag}</span>
                                <button 
                                  onClick={async () => {
                                    const updatedTags = frames[currentFrame].tags!.filter((_, i) => i !== index);
                                    try {
                                      const response = await updateFrame(roll.id, frames[currentFrame].id, { tags: updatedTags });
                                      if (response.success) {
                                        const newFrames = frames.map(f => f.id === frames[currentFrame].id ? { ...f, tags: updatedTags } : f);
                                        setFrames(newFrames);
                                        onUpdateFrames?.(newFrames);
                                        showToast(t('roll.tagDeleted'));
                                      }
                                    } catch (error) {
                                      showToast(t('common.error'), 'error');
                                    }
                                  }}
                                  className="ml-1 text-primary/70 hover:text-primary"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <div>
                            <input
                              ref={tagInputRef}
                              type="text"
                              placeholder={t('roll.enterToAdd')}
                              onKeyPress={async (e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim() && frames[currentFrame]) {
                                  const newTag = e.currentTarget.value.trim();
                                  const currentTags = frames[currentFrame].tags || [];
                                  if (!currentTags.includes(newTag)) {
                                    const updatedTags = [...currentTags, newTag];
                                    try {
                                      const response = await updateFrame(roll.id, frames[currentFrame].id, { tags: updatedTags });
                                      if (response.success) {
                                        const newFrames = frames.map(f => f.id === frames[currentFrame].id ? { ...f, tags: updatedTags } : f);
                                        setFrames(newFrames);
                                        onUpdateFrames?.(newFrames);
                                        showToast(t('roll.tagAdded'));
                                      }
                                    } catch (error) {
                                      console.error('添加标签失败:', error);
                                      showToast(t('common.error'), 'error');
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
                        <p className="text-sm text-on-surface-variant">{t('roll.noTags')}</p>
                      )}
                    </div>
                  </div>

                  {/* 边框设置 */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">{t('roll.frameBorder')}</h5>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                       <div className="flex gap-2">
                          {['none', 'white', 'black'].map(type => (
                             <button 
                                key={type}
                                onClick={() => setBorderType(type)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${borderType === type ? 'bg-primary text-on-primary' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                             >
                                {t(`roll.border${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                             </button>
                          ))}
                       </div>
                       {borderType !== 'none' && (
                          <div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-2 border-t border-white/5">
                             {Object.keys(borderOptions).map(opt => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                                   <input 
                                      type="checkbox" 
                                      className="w-3.5 h-3.5 rounded border-white/20 bg-transparent text-primary focus:ring-0 focus:ring-offset-0"
                                      checked={(borderOptions as any)[opt]}
                                      onChange={e => setBorderOptions({ ...borderOptions, [opt]: e.target.checked })}
                                   />
                                   <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors">
                                      {t(`roll.${opt.replace('show', '').toLowerCase()}`)}
                                   </span>
                                </label>
                             ))}
                          </div>
                       )}
                    </div>
                  </div>

                  {/* 导出设置 */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">{t('roll.output')}</h5>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                             type="checkbox" 
                             className="w-4 h-4 rounded border-white/20 bg-transparent text-primary"
                             checked={isExportWithBorder}
                             onChange={e => setIsExportWithBorder(e.target.checked)}
                          />
                          <span className="text-xs text-white/60">{t('roll.exportWithBorder')}</span>
                       </label>
                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                           {(['original', 'preview'] as const).map(q => (
                              <button 
                                 key={q}
                                 onClick={() => setDownloadQuality(q)}
                                 className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${downloadQuality === q ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
                              >
                                 {t(`roll.download${q.charAt(0).toUpperCase() + q.slice(1)}`)}
                              </button>
                           ))}
                        </div>
                        <button 
                           onClick={() => handleDownloadCurrentFrame()}
                           className="w-full bg-primary text-on-primary py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                           {t('roll.exportImage')}
                        </button>
                     </div>
                  </div>
               </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 侧边栏开关按钮 */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute right-6 top-6 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/70 backdrop-blur-md transition-all z-10"
        >
          <Info size={24} />
        </button>
      )}

      {/* Toast 提示 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 ${
              toast?.type === 'success' ? 'bg-primary text-on-primary' : 'bg-error text-on-error'
            }`}
          >
            <span className="text-sm font-bold">{toast?.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
