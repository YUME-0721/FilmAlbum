/**
 * 胶卷浏览器页面
 * 模拟观片台效果，展示整卷底片
 * 支持帧预览、管理、排序及跳转至单张查看
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoll, addFrames, deleteFrame, deleteFrames, deleteRoll, updateRoll, reorderFrames, type RollDetail, type FrameItem } from '../src/api/rolls.ts';
import { uploadImage } from '../src/api/upload.ts';
import { getFilmStocks, type FilmStock } from '../src/api/film-stocks.ts';
import { getGear, type Gear } from '../src/api/gear.ts';
import { useUpload } from '../src/context/UploadContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../src/hooks/useTranslation';
import FilmStockManager from '../components/FilmStockManager';
import RollForm from '../components/RollForm';
import { useSettings } from '../src/context/SettingsContext';
import { 
  ArrowLeft, ImagePlus, Pencil, Download, Trash2, Camera, Calendar, 
  MapPin, ArrowUp, ArrowDown, CloudUpload, Info, CheckCircle2, Circle, X, ArrowUpDown, Check
} from 'lucide-react';

const FALLBACK_FRAMES: FrameItem[] = [];
const FALLBACK_ROLL: RollDetail = {
  id: 'roll-001',
  title: 'Loading...',
  filmStock: '',
  location: '',
  camera: '',
  lens: '',
  shotDate: '',
  endDate: '',
  format: '135',
  filmType: 'COLOR_NEGATIVE',
  tags: [],
  frames: [],
  status: 'COMPLETED',
  author: { id: '', nickname: '', avatarUrl: '' },
  isOwner: true,
  createdAt: '',
  sortOrder: 0
};

export default function FilmRoll() {
  const { t } = useTranslation();
  const { rollFormats } = useSettings();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [roll, setRoll] = useState<RollDetail>(FALLBACK_ROLL);
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { sessions, startUpload } = useUpload();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [filmStocks, setFilmStocks] = useState<FilmStock[]>([]);
  const [isLoadingFilmStocks, setIsLoadingFilmStocks] = useState(false);
  const [filmStockSearch, setFilmStockSearch] = useState('');
  const [gearList, setGearList] = useState<Gear[]>([]);
  const [isLoadingGear, setIsLoadingGear] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLargeScreen, setIsLargeScreen] = useState(false);

  // 监听大屏模式 (桌面端)
  useEffect(() => {
    const checkScreen = () => setIsLargeScreen(window.innerWidth >= 1024);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // 提取当前胶卷子规格对应的桌面端排版列数
  const getColsForFormat = () => {
    const formatName = roll.format;
    // 1. 尝试从管理员系统设置中匹配最新的 frameCols 配置
    const currentFormatDef = rollFormats?.find(f => f.frames.includes(formatName));
    if (currentFormatDef?.frameCols && currentFormatDef.frameCols[formatName] !== undefined) {
      return currentFormatDef.frameCols[formatName];
    }
    
    // 2. 健壮性默认 Fallback 映射：
    // 半格一行12张，135/35mm一行6张，xpan/620/630一行1张，645一行4张，6x6/6x7一行3张，6x9一行2张
    const defaultColsMap: Record<string, number> = {
      '半格': 12,
      '135': 6,
      '35mm': 6,
      'xpan': 1,
      '620': 1,
      '630': 1,
      '645': 4,
      '6x6': 3,
      '6x7': 3,
      '6x9': 2
    };
    
    return defaultColsMap[formatName] || 4; // 缺省使用默认的 4 张排版
  };

  const desktopCols = getColsForFormat();

  const formatName = roll.format;
  const baseFormatDef = rollFormats?.find(f => f.frames.includes(formatName));
  const baseFormat = baseFormatDef ? baseFormatDef.format : '135';
  const is135 = baseFormat === '135';
  const filmStockText = (roll.filmStock || (is135 ? 'KODAK 135' : 'KODAK 120')).toUpperCase();

  const formatRatioMap: Record<string, number> = {
    '半格': 2 / 3,
    '35mm': 3 / 2,
    '135': 3 / 2,
    'xpan': 65 / 24,
    '620': 3 / 2,
    '630': 3 / 2,
    '645': 4 / 3,
    '6x6': 1,
    '6x7': 7 / 6,
    '6x9': 3 / 2
  };
  const aspectRatio = formatRatioMap[formatName] || 3 / 2;

  const [isGeneratingIndex, setIsGeneratingIndex] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);

  const preloadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });
  };

  const generateContactSheet = async () => {
    if (frames.length === 0) return;
    setIsGeneratingIndex(true);
    setIndexProgress(5);

    try {
      const loadedImages: HTMLImageElement[] = [];
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const url = frame.previewUrl || frame.imageUrl;
        try {
          const img = await preloadImage(url);
          loadedImages.push(img);
        } catch (err) {
          console.error(`Failed to load image at index ${i}:`, err);
          loadedImages.push(null as any);
        }
        const progress = Math.round(5 + (i / frames.length) * 55);
        setIndexProgress(progress);
      }

      setIndexProgress(65);
      
      const formatName = roll.format;
      const baseFormatDef = rollFormats?.find(f => f.frames.includes(formatName));
      const baseFormat = baseFormatDef ? baseFormatDef.format : '135';
      const is135 = baseFormat === '135';

      const formatRatioMap: Record<string, number> = {
        '半格': 2 / 3,
        '35mm': 3 / 2,
        '135': 3 / 2,
        'xpan': 65 / 24,
        '620': 3 / 2,
        '630': 3 / 2,
        '645': 4 / 3,
        '6x6': 1,
        '6x7': 7 / 6,
        '6x9': 3 / 2
      };
      const aspectRatio = formatRatioMap[formatName] || 3 / 2;

      const canvasWidth = 3600;
      const edgeMargin = 100;
      const usableWidth = canvasWidth - edgeMargin * 2;
      const cols = desktopCols || 6;
      const rows = Math.ceil(frames.length / cols);
      const gap = 40;

      const itemWidth = (usableWidth - gap * (cols - 1)) / cols;

      let rowHeight = 0;
      let P_mm = 1;
      let sprocketW = 0, sprocketH = 0, pitch = 0;
      let borderLeft = 0, borderTop = 0, borderBottom = 0;
      let photoW = 0, photoH = 0;

      if (is135) {
        photoW = itemWidth - 16;
        photoH = photoW / aspectRatio;
        P_mm = photoH / 24;
        rowHeight = Math.round(P_mm * 35);
        sprocketW = Math.round(P_mm * 2.8);
        sprocketH = Math.round(P_mm * 2.4);
        pitch = P_mm * 4.75;
      } else {
        borderLeft = 16;
        borderTop = 28;
        borderBottom = 28;
        photoW = itemWidth - borderLeft * 2;
        photoH = photoW / aspectRatio;
        rowHeight = photoH + borderTop + borderBottom;
      }

      const headerHeight = 360;
      const rowGap = 80;
      const canvasHeight = headerHeight + edgeMargin + rowHeight * rows + rowGap * (rows - 1) + edgeMargin;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');

      setIndexProgress(75);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 页头背景
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvasWidth, headerHeight);

      // 绘制自适应放大的光圈艺术 Logo
      const logoX = edgeMargin + 90;
      const logoY = headerHeight / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let r_logo = 40; r_logo <= 110; r_logo += 15) {
        ctx.beginPath();
        ctx.arc(logoX, logoY, r_logo, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = '#c5a86a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(logoX, logoY, 75, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const x1 = logoX + Math.cos(angle) * 40;
        const y1 = logoY + Math.sin(angle) * 40;
        const x2 = logoX + Math.cos(angle + 0.5) * 75;
        const y2 = logoY + Math.sin(angle + 0.5) * 75;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 左侧品牌信息 (NOTE: 为适配 3600px 的超大画幅，将品牌字号从 72px 调大至 92px，副标题调大至 36px，并在视觉上微调垂直分布间距，呈现稳重大气的联系单页头)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 92px "Inter", -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('FilmAlbum', edgeMargin + 210, logoY - 35);

      ctx.fillStyle = '#c5a86a';
      ctx.font = 'bold 36px "Inter", -apple-system, sans-serif';
      ctx.fillText('CONTACT SHEET', edgeMargin + 210, logoY + 55);

      // 右侧影集详情 (NOTE: 将相册标题字号从 56px 放大至 88px，拍摄细节/日期字号从 28px 放大至 42px。高像素下能够提供完美的极简排版美学与阅读舒适度)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 88px "Inter", -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText((roll.title || 'UNTITLED').toUpperCase(), canvasWidth - edgeMargin, logoY - 45);

      ctx.fillStyle = '#8e8e93';
      ctx.font = '500 42px "Inter", -apple-system, sans-serif';
      const archiveText = `FORMAT: ${roll.format.toUpperCase()}   •   STOCK: ${(roll.filmStock || 'GENERIC').toUpperCase()}   •   CAMERA: ${(roll.camera || 'N/A').toUpperCase()}`;
      ctx.fillText(archiveText, canvasWidth - edgeMargin, logoY + 25);

      ctx.font = '500 42px "Inter", -apple-system, sans-serif';
      // 智能处理双日期显示：shotDate ~ endDate
      let displayDate = roll.shotDate || 'N/A';
      if (roll.endDate && roll.endDate !== roll.shotDate) {
        displayDate = `${roll.shotDate} ~ ${roll.endDate}`;
      }
      const dateText = `DATE: ${displayDate}   •   TOTAL FRAMES: ${frames.length}`;
      ctx.fillText(dateText, canvasWidth - edgeMargin, logoY + 80);

      setIndexProgress(85);

      const filmStockText = (roll.filmStock || (is135 ? 'KODAK 135' : 'KODAK 120')).toUpperCase();

      for (let r = 0; r < rows; r++) {
        const rowY = headerHeight + edgeMargin + r * (rowHeight + rowGap);

        if (is135) {
          ctx.fillStyle = '#0b0b0b';
          ctx.fillRect(edgeMargin, rowY, usableWidth, rowHeight);

          ctx.strokeStyle = 'rgba(197, 168, 106, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(edgeMargin, rowY + P_mm * 1.5);
          ctx.lineTo(edgeMargin + usableWidth, rowY + P_mm * 1.5);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(edgeMargin, rowY + rowHeight - P_mm * 1.5);
          ctx.lineTo(edgeMargin + usableWidth, rowY + rowHeight - P_mm * 1.5);
          ctx.stroke();

          const sprocketTopY = rowY + P_mm * 2.0;
          const sprocketBottomY = rowY + rowHeight - P_mm * 2.0 - sprocketH;
          
          ctx.fillStyle = '#ffffff';
          const totalSprockets = Math.floor(usableWidth / pitch);

          for (let s = 0; s < totalSprockets; s++) {
            const sprocketX = edgeMargin + s * pitch + (pitch - sprocketW) / 2;
            drawRoundedRect(ctx, sprocketX, sprocketTopY, sprocketW, sprocketH, P_mm * 0.5);
            drawRoundedRect(ctx, sprocketX, sprocketBottomY, sprocketW, sprocketH, P_mm * 0.5);
          }

          for (let c = 0; c < cols; c++) {
            const index = r * cols + c;
            if (index >= frames.length) break;

            const centerX = edgeMargin + c * (itemWidth + gap) + itemWidth / 2;
            const photoX = centerX - photoW / 2;
            const photoY = rowY + P_mm * 5.5;

            const img = loadedImages[index];
            if (img) {
              ctx.drawImage(img, photoX, photoY, photoW, photoH);
            } else {
              ctx.fillStyle = '#222222';
              ctx.fillRect(photoX, photoY, photoW, photoH);
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 14px "Inter", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('NO IMAGE', centerX, photoY + photoH / 2);
            }

            ctx.fillStyle = '#c5a86a';
            ctx.font = `bold ${Math.round(P_mm * 1.4)}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            // NOTE: 将帧号文字移到底部黑边区域 (33.0 ~ 35.0 P_mm)，避免与底部齿孔重合
            ctx.textBaseline = 'bottom';
            const frameNumStr = `▶ ${String(index + 1).padStart(2, '0')}`;
            ctx.fillText(frameNumStr, centerX, rowY + rowHeight - P_mm * 0.4);

            // NOTE: 将胶卷型号文字移到顶部黑边区域 (0 ~ 2.0 P_mm)，避免与顶部齿孔重合
            ctx.font = `500 ${Math.round(P_mm * 1.1)}px "Inter", sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(filmStockText, centerX, rowY + P_mm * 0.4);
          }
        } else {
          for (let c = 0; c < cols; c++) {
            const index = r * cols + c;
            if (index >= frames.length) break;

            const gridX = edgeMargin + c * (itemWidth + gap);
            const centerX = gridX + itemWidth / 2;

            ctx.fillStyle = '#0b0b0b';
            ctx.fillRect(gridX, rowY, itemWidth, rowHeight);

            const photoX = gridX + borderLeft;
            const photoY = rowY + borderTop;
            const img = loadedImages[index];

            if (img) {
              const imgRatio = img.naturalWidth / img.naturalHeight;
              let targetW = photoW;
              let targetH = photoH;
              let drawX = photoX;
              let drawY = photoY;

              if (imgRatio > aspectRatio) {
                targetH = photoW / imgRatio;
                drawY = photoY + (photoH - targetH) / 2;
              } else {
                targetW = photoH * imgRatio;
                drawX = photoX + (photoW - targetW) / 2;
              }

              ctx.drawImage(img, drawX, drawY, targetW, targetH);
            } else {
              ctx.fillStyle = '#222222';
              ctx.fillRect(photoX, photoY, photoW, photoH);
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 14px "Inter", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('NO IMAGE', centerX, photoY + photoH / 2);
            }

            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.font = '500 12px "Inter", -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(filmStockText, centerX, rowY + borderTop / 2);

            ctx.fillStyle = '#c5a86a';
            ctx.font = 'bold 13px "Inter", sans-serif';
            ctx.textAlign = 'center';
            const frameNumStr = `▶ ${String(index + 1).padStart(2, '0')}`;
            ctx.fillText(frameNumStr, centerX, rowY + rowHeight - borderBottom / 2);
          }
        }
      }

      setIndexProgress(95);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${roll.title}_ContactSheet.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          setIndexProgress(100);
          setTimeout(() => setIsGeneratingIndex(false), 800);
        }
      }, 'image/jpeg', 0.93);

    } catch (error) {
      console.error('Failed to generate contact sheet:', error);
      alert('生成索引图失败，请稍后重试');
      setIsGeneratingIndex(false);
    }
  };

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 加载胶卷数据
  useEffect(() => {
    const fetchRoll = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await getRoll(id);
        if (response.success && response.data) {
          setRoll(response.data);
          setFrames(response.data.frames || []);
          setEditForm({
            title: response.data.title || '',
            filmStock: response.data.filmStock || '',
            location: response.data.location || '',
            camera: response.data.camera || '',
            lens: response.data.lens || '',
            shotDate: response.data.shotDate || '',
            endDate: response.data.endDate || '',
            filmType: response.data.filmType || '',
            format: response.data.format || '',
            tags: response.data.tags || [],
            status: response.data.status || 'COMPLETED'
          });
        }
      } catch (error) {
        console.error('加载胶卷失败:', error);
        showToast('加载胶卷失败', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoll();
  }, [id]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    try {
      await startUpload(id, roll.title, files, frames.length, (newFrame) => {
        setFrames(prev => [...prev, newFrame].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      });
    } catch (error) {
      console.error('Upload error:', error);
      showToast('部分图片上传失败', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFrame = async (frameId: string) => {
    if (!id) return;
    setConfirmDialog({
      message: '确定要删除这张照片吗？',
      onConfirm: async () => {
        try {
          await deleteFrame(id, frameId);
          setFrames(prev => prev.filter(f => f.id !== frameId));
          showToast('照片已删除');
        } catch (error) {
          showToast('删除照片失败', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleBatchDelete = async () => {
    if (!id || selectedFrameIds.length === 0) return;
    setConfirmDialog({
      message: `确定要删除选中的 ${selectedFrameIds.length} 张照片吗？`,
      onConfirm: async () => {
        try {
          await deleteFrames(id, selectedFrameIds);
          setFrames(prev => prev.filter(f => !selectedFrameIds.includes(f.id)));
          setSelectedFrameIds([]);
          setIsSelectionMode(false);
          showToast('照片已批量删除');
        } catch (error) {
          showToast('批量删除失败', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const toggleSelection = (frameId: string) => {
    setSelectedFrameIds(prev => 
      prev.includes(frameId) 
        ? prev.filter(i => i !== frameId) 
        : [...prev, frameId]
    );
  };

  // 加载型号和设备数据
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingFilmStocks(true);
      setIsLoadingGear(true);
      try {
        const [stocksRes, gearRes] = await Promise.all([getFilmStocks(), getGear()]);
        setFilmStocks(stocksRes.data || []);
        setGearList(gearRes.data || []);
      } catch (err) {
        console.error('加载选项数据失败:', err);
      } finally {
        setIsLoadingFilmStocks(false);
        setIsLoadingGear(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);
    try {
      const response = await updateRoll(id, editForm);
      if (response.success) {
        setRoll({ ...roll, ...editForm });
        showToast('更新成功');
        setShowEditModal(false);
      }
    } catch (error) {
      showToast('更新失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoll = async () => {
    if (!id) return;
    setConfirmDialog({
      message: t('common.confirm_delete'),
      onConfirm: async () => {
        try {
          await deleteRoll(id);
          navigate('/space');
        } catch (error) {
          showToast('删除胶卷失败', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleReorderFrames = async (newOrder: FrameItem[]) => {
    if (!id) return;
    try {
      await reorderFrames(id, newOrder.map(f => f.id));
      setFrames(newOrder);
      showToast('顺序已更新');
    } catch (error) {
      showToast('更新顺序失败', 'error');
    }
  };

  const handleMoveFrame = async (index: number, direction: 'up' | 'down') => {
    const newFrames = [...frames];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= frames.length) return;
    
    // 乐观更新：先改变本地状态，实现即时反馈
    [newFrames[index], newFrames[target]] = [newFrames[target], newFrames[index]];
    setFrames(newFrames);
    
    // 然后再进行后端同步
    try {
      await reorderFrames(id!, newFrames.map(f => f.id));
    } catch (error) {
      // 失败则回滚（可选，但通常为了用户体验不做生硬回滚，或者提示重试）
      console.error('排序同步失败:', error);
      showToast('顺序保存失败', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-surface pb-20">
      {/* 顶部操作栏 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const targetPath = roll.isOwner ? `/space#roll-${roll.id}` : `/space/${roll.author.id}#roll-${roll.id}`;
                navigate(targetPath);
              }} 
              className="p-2 hover:bg-surface-variant rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-on-surface">{roll.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-on-surface-variant">
                {roll.shotDate && <div className="flex items-center gap-1"><Calendar size={14} />{roll.shotDate}</div>}
                {roll.location && <div className="flex items-center gap-1"><MapPin size={14} />{roll.location}</div>}
                <div className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded capitalize">{roll.format} {roll.filmStock}</div>
                {roll.status === 'SHOOTING' && (
                  <div className="px-2 py-0.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-bold rounded animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    拍摄中
                  </div>
                )}
                {roll.status === 'DEVELOPING' && (
                  <div className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                    冲洗中
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isSelectionMode ? (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={!!sessions[id!] && !sessions[id!].isCompleted} 
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                >
                  <ImagePlus size={20} />
                  <span>
                    {sessions[id!] && !sessions[id!].isCompleted 
                      ? `${sessions[id!].current}/${sessions[id!].total}` 
                      : t('common.upload')}
                  </span>
                </button>
                <button onClick={generateContactSheet} className="p-2.5 hover:bg-surface-variant rounded-xl transition-colors border border-outline-variant/30" title="Export Roll">
                  <Download size={20} />
                </button>
                <button onClick={() => setShowEditModal(true)} className="p-2.5 hover:bg-surface-variant rounded-xl transition-colors border border-outline-variant/30">
                  <Pencil size={20} />
                </button>
                <button 
                  onClick={() => setIsSortMode(true)} 
                  className={`p-2.5 rounded-xl transition-colors border ${isSortMode ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-surface-variant border-outline-variant/30'}`}
                  title="Sort Mode"
                >
                  <ArrowUpDown size={20} />
                </button>
                <button onClick={() => setIsSelectionMode(true)} className="p-2.5 hover:bg-error/10 text-error rounded-xl transition-colors border border-error/20">
                  <Trash2 size={20} />
                </button>
              </>
            ) : (
              /* Selection Mode UI - Improved */
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-lg md:static md:w-auto md:translate-x-0 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-2 md:gap-3 bg-black/80 md:bg-surface-variant/50 backdrop-blur-xl p-2 md:p-1.5 rounded-3xl md:rounded-2xl border border-white/10 shadow-2xl">
                  <div className="hidden sm:flex px-4 py-2 bg-white/5 rounded-xl flex-col justify-center">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold leading-none mb-1">Status</span>
                    <span className="text-xs font-bold text-white whitespace-nowrap">
                      {selectedFrameIds.length === 0 ? '未选择' : `已选 ${selectedFrameIds.length} 张`}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-between md:justify-end gap-2">
                    <button 
                      onClick={handleBatchDelete} 
                      disabled={selectedFrameIds.length === 0}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-error text-on-error rounded-2xl md:rounded-xl font-bold hover:bg-error/90 transition-all disabled:opacity-30 whitespace-nowrap text-xs md:text-sm shadow-lg shadow-error/20"
                    >
                      <Trash2 size={16} className="shrink-0" />
                      <span>删除选中</span>
                    </button>
                    
                    <button 
                      onClick={handleDeleteRoll} 
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-white/10 text-white rounded-2xl md:rounded-xl font-bold hover:bg-white/20 transition-all whitespace-nowrap text-xs md:text-sm border border-white/5"
                    >
                      <X size={16} className="shrink-0" />
                      <span>删除整卷</span>
                    </button>

                    <button 
                      onClick={() => { setIsSelectionMode(false); setSelectedFrameIds([]); }} 
                      className="w-12 h-12 md:w-auto md:h-auto md:px-4 md:py-2 flex items-center justify-center bg-surface-variant/50 text-white rounded-2xl md:rounded-xl hover:bg-surface-variant transition-colors"
                      title="取消选择"
                    >
                      <span className="hidden md:inline font-bold text-sm">取消</span>
                      <X size={20} className="md:hidden" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sort Mode UI - Improved */}
            {isSortMode && !isSelectionMode && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-sm md:static md:w-auto md:translate-x-0 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between gap-3 bg-black/80 md:bg-primary/10 backdrop-blur-xl p-2 md:p-1.5 rounded-3xl md:rounded-2xl border border-primary/20 shadow-2xl">
                  <div className="flex items-center gap-2 px-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-bold text-primary whitespace-nowrap">排序模式</span>
                  </div>
                  <button 
                    onClick={() => setIsSortMode(false)} 
                    className="flex items-center gap-2 px-6 py-3 md:px-4 md:py-2 bg-primary text-on-primary rounded-2xl md:rounded-xl font-bold hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                  >
                    <Check size={18} />
                    <span>完成排序</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 照片网格 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
        
        {frames.length === 0 ? (
          <div 
            className="text-center py-32 bg-surface-container/30 border-2 border-dashed border-outline-variant/20 rounded-3xl cursor-pointer hover:bg-surface-container/50 transition-all group"
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload size={64} className="mx-auto mb-6 opacity-20 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500 text-primary" />
            <p className="text-xl font-bold text-on-surface">{t('profile.roll.noPhoto')}</p>
            <p className="text-sm text-on-surface-variant mt-2">{t('profile.roll.noPhotoDesc')}</p>
          </div>
        ) : (
          <div 
            className={`grid gap-6 ${isLargeScreen ? '' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}
            style={isLargeScreen ? { gridTemplateColumns: `repeat(${desktopCols}, minmax(0, 1fr))` } : undefined}
          >
            <AnimatePresence mode="popLayout">
              {frames.map((frame, index) => {
                const frameNum = frame.frameNumber && frame.frameNumber !== '00' && frame.frameNumber !== '0' 
                  ? frame.frameNumber 
                  : (index + 1).toString().padStart(2, '0');

                return (
                  <motion.div
                    key={frame.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      layout: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    className={`group relative w-full h-auto bg-[#0b0b0b] rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-500 flex flex-col ${
                      is135 ? 'p-0.5 pb-1.5' : 'p-1.5 pb-2.5'
                    } ${isSelectionMode && selectedFrameIds.includes(frame.id) ? 'ring-4 ring-primary ring-inset' : ''} ${isSortMode ? 'ring-2 ring-primary/30' : ''}`}
                    onClick={() => {
                      if (isSelectionMode) toggleSelection(frame.id);
                      else if (isSortMode) return;
                      else navigate(`/frame/${frame.id}`);
                    }}
                  >
                    {is135 ? (
                      /* 135 底片模式：顶部与底部独立且对称的圆角齿孔带 (在照片外部) */
                      <>
                        <div className="w-full h-8 select-none relative bg-[#0b0b0b] shrink-0 pointer-events-none">
                          {/* NOTE: 齿孔向下偏移，使用标准 bottom-1 并辅以 style，为顶部留出空间 */}
                          <div className="absolute inset-x-0 bottom-1 flex justify-between px-2" style={{ bottom: '4px' }}>
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="w-[8%] h-3 bg-white/95 rounded-[1.5px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]" />
                            ))}
                          </div>
                          {/* NOTE: 顶部文字采用 flex 容器水平居中，并通过 CSS scale 绕过浏览器最小字号 (12px) 限制，确保在任何端均完美渲染在顶部黑边上 */}
                          <div className="absolute top-[3px] left-0 right-0 flex justify-center pointer-events-none">
                            <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#c5a86a]/40 inline-block origin-center scale-75">
                              {filmStockText}
                            </span>
                          </div>
                        </div>

                        {/* 照片居中展示：由照片的 aspectRatio 决定高度，无拉伸裁剪，100%完整展示 */}
                        <div className="w-full overflow-hidden bg-zinc-950 relative shrink-0" style={{ aspectRatio }}>
                          <img
                            src={frame.previewUrl || frame.imageUrl}
                            alt={frame.frameNumber}
                            className={`w-full h-full object-contain transition-transform duration-700 ${isSelectionMode ? '' : 'group-hover:scale-105'}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="w-full h-9 select-none relative bg-[#0b0b0b] shrink-0 pointer-events-none">
                          {/* NOTE: 齿孔向上偏移，使用标准 top-1 并辅以 style，为底部留出空间 */}
                          <div className="absolute inset-x-0 top-1 flex justify-between px-2" style={{ top: '4px' }}>
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="w-[8%] h-3 bg-white/95 rounded-[1.5px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]" />
                            ))}
                          </div>
                          {/* NOTE: 底部文字通过 CSS scale 绕过浏览器最小字号限制，完美居中印刻在底部黑边上 */}
                          <div className="absolute bottom-[4px] left-0 right-0 flex justify-center pointer-events-none">
                            <span className="text-xs font-mono font-bold tracking-wider text-[#c5a86a] inline-block origin-center scale-75">
                              ▶ {frameNum}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* 120 底片模式：黑卡纸边框 (在照片外部) */
                      <>
                        <div className="w-full h-7 flex items-center justify-center select-none bg-[#0b0b0b] shrink-0 pointer-events-none">
                          <span className="text-[9px] font-mono font-bold tracking-[0.25em] text-white/35 uppercase">
                            {filmStockText}
                          </span>
                        </div>

                        {/* 照片由自适应 aspectRatio 撑开，无拉伸裁剪 */}
                        <div className="w-full overflow-hidden bg-zinc-950 relative shrink-0" style={{ aspectRatio }}>
                          <img
                            src={frame.previewUrl || frame.imageUrl}
                            alt={frame.frameNumber}
                            className={`w-full h-full object-contain transition-transform duration-700 ${isSelectionMode ? '' : 'group-hover:scale-105'}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="w-full h-8 flex items-center justify-center select-none bg-[#0b0b0b] shrink-0 pointer-events-none">
                          <span className="text-[10px] font-mono font-bold tracking-widest text-[#c5a86a] uppercase">
                            ▶ {frameNum}
                          </span>
                        </div>
                      </>
                    )}

                    {/* 选择模式指示器 */}
                    {isSelectionMode && (
                      <div className="absolute top-3 right-3 z-10">
                        {selectedFrameIds.includes(frame.id) ? (
                          <CheckCircle2 className="text-primary bg-white rounded-full shadow-lg" size={24} />
                        ) : (
                          <Circle className="text-white/50 bg-black/30 rounded-full" size={24} />
                        )}
                      </div>
                    )}

                    {/* 操作浮层：仅在排序模式下显示 */}
                    {isSortMode && (
                      <div className="absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center gap-4 opacity-100 z-10">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveFrame(index, 'up'); }} 
                          disabled={index === 0} 
                          className="p-3 bg-white/20 hover:bg-white/40 rounded-xl text-white disabled:opacity-20 transition-all hover:scale-110 active:scale-90"
                        >
                          <ArrowUp size={24} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveFrame(index, 'down'); }} 
                          disabled={index === frames.length - 1} 
                          className="p-3 bg-white/20 hover:bg-white/40 rounded-xl text-white disabled:opacity-20 transition-all hover:scale-110 active:scale-90"
                        >
                          <ArrowDown size={24} />
                        </button>
                      </div>
                    )}


                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-surface w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
               <RollForm 
                isEditing={true}
                editingRoll={roll}
                onSubmit={handleUpdateRoll}
                onCancel={() => setShowEditModal(false)}
                filmStocks={filmStocks}
                isLoadingFilmStocks={isLoadingFilmStocks}
                isSubmitting={isSubmitting}
                tagInput={tagInput}
                setTagInput={setTagInput}
                rollForm={editForm}
                setRollForm={setEditForm}
                filmStockSearch={filmStockSearch}
                setFilmStockSearch={setFilmStockSearch}
                gearList={gearList}
                isLoadingGear={isLoadingGear}
               />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 确认对话框 */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative bg-surface p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
              <h3 className="text-xl font-bold text-on-surface mb-2">{confirmDialog.message}</h3>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setConfirmDialog(null)} 
                  className="flex-1 px-6 py-3 rounded-2xl bg-surface-variant/50 text-on-surface-variant hover:bg-surface-variant hover:scale-[1.02] active:scale-[0.98] transition-all font-bold"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={confirmDialog.onConfirm} 
                  className="flex-1 px-6 py-3 bg-error text-on-error rounded-2xl font-bold hover:bg-error/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-error/20"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[120] flex items-center gap-3 ${toast.type === 'success' ? 'bg-primary text-on-primary' : 'bg-error text-on-error'}`}>
             <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 索引图生成进度提示 */}
      <AnimatePresence>
        {isGeneratingIndex && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md"
          >
            <div className="w-80 space-y-5 p-8 rounded-3xl bg-surface-container/60 border border-white/10 backdrop-blur-2xl shadow-2xl">
              <div className="flex justify-between items-center text-white text-sm font-bold uppercase tracking-widest">
                <span>正在生成底片索引图...</span>
                <span className="font-mono text-primary text-base">{indexProgress}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${indexProgress}%` }}
                  className="h-full bg-primary"
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                />
              </div>
              <p className="text-white/40 text-[10px] text-center leading-relaxed">
                正在加载底片图像并进行国标比例渲染，高分辨率大图正在导出，请耐心等候...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}