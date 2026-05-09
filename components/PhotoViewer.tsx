/**
 * 照片查看器组件 (独立模块)
 * 支持带边框预览、元数据编辑、大图下载等功能
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Download, Share2, X, Info, ChevronLeft, ChevronRight,
  Camera, Calendar, MapPin
} from 'lucide-react';
import { useTranslation } from '../src/hooks/useTranslation';
import { updateFrame, type RollDetail, type FrameItem } from '../src/api/rolls.ts';
import { getFilmStocks, type FilmStock } from '../src/api/film-stocks.ts';
import { commonBrands } from '../src/constants/brands';

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
  const [showSidebar, setShowSidebar] = useState(true);
  const [borderType, setBorderType] = useState('none'); // none, white, black
  const [isExportWithBorder, setIsExportWithBorder] = useState(false);
  const [borderOptions, setBorderOptions] = useState({
    showFilmStock: true,
    showCamera: true,
    showLens: true,
    showDate: true,
    showExposure: true
  });
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > window.innerHeight);
  const [filmStockData, setFilmStockData] = useState<FilmStock | null>(null);
  const [editingField, setEditingField] = useState<{frameId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

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
  }, [currentFrame, onFrameChange]);

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

  const handleDownloadCurrentFrame = async () => {
    const frame = frames[currentFrame];
    if (!frame || !roll) return;

    try {
      if (!isExportWithBorder || borderType === 'none') {
        const response = await fetch(frame.imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${roll.title}_${frame.frameNumber}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      }

      showToast('正在生成图片...', 'success');

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = frame.imageUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const isVertical = img.height > img.width;
      const baseSize = isVertical ? img.height : img.width;
      const padding = baseSize * 0.05;
      const bottomArea = baseSize * 0.12;
      
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + bottomArea;

      ctx.fillStyle = borderType === 'white' ? '#ffffff' : '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding);

      const textColor = borderType === 'white' ? '#1a1a1a' : '#ffffff';
      ctx.fillStyle = textColor;
      
      const fontSizeLarge = Math.round(baseSize * 0.022);
      const fontSizeSmall = Math.round(baseSize * 0.016);
      
      if (borderOptions.showFilmStock) {
        const brand = filmStockData?.brand || roll.filmStock.split(' ')[0];
        const model = filmStockData?.model || roll.filmStock.split(' ').slice(1).join(' ');
        const logoUrl = filmStockData?.brandLogo || (() => {
          const brandName = roll.filmStock.split(' ')[0];
          return commonBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase())?.logoUrl;
        })();

        let textX = padding;
        if (logoUrl) {
          try {
            const logo = new Image();
            logo.crossOrigin = 'anonymous';
            logo.src = logoUrl;
            await new Promise((res) => {
              logo.onload = res;
              logo.onerror = res;
            });
            const logoSize = fontSizeLarge * 2.2;
            ctx.drawImage(logo, padding, canvas.height - bottomArea + (bottomArea - logoSize) / 2, logoSize, logoSize);
            textX += logoSize + padding * 0.3;
          } catch (e) {}
        }
        ctx.font = `bold ${fontSizeLarge}px sans-serif`;
        ctx.fillText(brand, textX, canvas.height - bottomArea + bottomArea * 0.45);
        ctx.fillText(model, textX, canvas.height - bottomArea + bottomArea * 0.75);
      }

      ctx.textAlign = 'right';
      let currentY = canvas.height - bottomArea + bottomArea * 0.4;
      
      if (borderOptions.showCamera && (frame.camera || roll.camera)) {
        ctx.font = `${fontSizeSmall}px sans-serif`;
        ctx.fillText(frame.camera || roll.camera, canvas.width - padding, currentY);
        currentY += fontSizeSmall * 1.3;
      }
      if (borderOptions.showLens && (frame.lens || roll.lens)) {
        ctx.font = `${fontSizeSmall}px sans-serif`;
        ctx.fillText(frame.lens || roll.lens, canvas.width - padding, currentY);
        currentY += fontSizeSmall * 1.3;
      }
      if (borderOptions.showDate && (frame.shotDate || roll.shotDate)) {
        ctx.font = `${fontSizeSmall}px sans-serif`;
        ctx.fillText(frame.shotDate || roll.shotDate, canvas.width - padding, currentY);
        currentY += fontSizeSmall * 1.3;
      }
      if (borderOptions.showExposure && (frame.aperture || frame.shutterSpeed || frame.iso)) {
        const expStr = [frame.aperture, frame.shutterSpeed, frame.iso ? `ISO ${frame.iso}` : ''].filter(Boolean).join(' ');
        ctx.font = `${fontSizeSmall}px sans-serif`;
        ctx.fillText(expStr, canvas.width - padding, currentY);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${roll.title}_${frame.frameNumber}_bordered.jpg`;
      link.click();
      showToast('图片下载成功');
    } catch (error) {
      console.error('Download failed:', error);
      showToast('图片处理失败', 'error');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden transition-colors duration-500 ${
      borderType === 'black' ? 'bg-white/95' : 'bg-black/90'
    } backdrop-blur-2xl`}>
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
      <div className="absolute inset-0 flex items-center justify-center p-4" onClick={onClose}>
        <button
          onClick={(e) => { e.stopPropagation(); goToFrame(currentFrame > 0 ? currentFrame - 1 : frames.length - 1); }}
          className={`absolute left-8 top-1/2 -translate-y-1/2 p-2 z-10 transition-colors ${
            borderType === 'black' ? 'text-black/30 hover:text-black' : 'text-white/30 hover:text-white'
          }`}
        >
          <ChevronLeft size={48} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); goToFrame(currentFrame < frames.length - 1 ? currentFrame + 1 : 0); }}
          className={`absolute top-1/2 -translate-y-1/2 p-2 z-10 transition-colors ${
            showSidebar && isDesktop ? 'right-[336px]' : 'right-8'
          } ${borderType === 'black' ? 'text-black/30 hover:text-black' : 'text-white/30 hover:text-white'}`}
        >
          <ChevronRight size={48} />
        </button>

        {/* 图片显示区 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 0 }}
          animate={{ opacity: 1, scale: 1, x: showSidebar && isDesktop ? -116 : 0 }}
          transition={{ duration: 0.2 }}
          className="relative max-w-[70vw] max-h-[80vh] flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
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
                <div className={`w-full transition-all duration-300 ${borderType === 'none' ? '' : borderType === 'white' ? 'bg-white p-8' : 'bg-black p-8'}`}>
                  <div className="flex justify-center">
                    <img
                      src={frames[currentFrame].imageUrl}
                      alt={frames[currentFrame].frameNumber}
                      className={`object-contain shadow-2xl ${borderType === 'none' ? 'max-w-full max-h-[80vh]' : 'max-w-[90%] max-h-[70vh]'}`}
                    />
                  </div>
                  {/* 边框信息层 */}
                  {borderType !== 'none' && (
                    <div className={`mt-6 flex justify-between items-center ${borderType === 'white' ? 'text-gray-800' : 'text-white'}`}>
                      {borderOptions.showFilmStock && (
                        <div className="flex items-center gap-4">
                           {(() => {
                              const logo = filmStockData?.brandLogo || (() => {
                                const brandName = roll.filmStock.split(' ')[0];
                                return commonBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase())?.logoUrl;
                              })();
                              return logo ? <img src={logo} className="w-10 h-10 object-contain" /> : <div className="w-10 h-10 bg-yellow-500 flex items-center justify-center font-bold text-black">{roll.filmStock.charAt(0)}</div>;
                           })()}
                           <div>
                             <h5 className="font-bold text-lg leading-tight">{filmStockData?.brand || roll.filmStock.split(' ')[0]}</h5>
                             <h6 className="font-medium text-sm opacity-80">{filmStockData?.model || roll.filmStock.split(' ').slice(1).join(' ')}</h6>
                           </div>
                        </div>
                      )}
                      <div className="text-right space-y-0.5">
                        {borderOptions.showCamera && (frames[currentFrame].camera || roll.camera) && <p className="text-sm font-medium">{frames[currentFrame].camera || roll.camera}</p>}
                        {borderOptions.showLens && (frames[currentFrame].lens || roll.lens) && <p className="text-sm opacity-80">{frames[currentFrame].lens || roll.lens}</p>}
                        {borderOptions.showDate && (frames[currentFrame].shotDate || roll.shotDate) && <p className="text-xs opacity-60">{frames[currentFrame].shotDate || roll.shotDate}</p>}
                        {borderOptions.showExposure && (
                          <p className="text-xs opacity-60 font-mono">
                            {[frames[currentFrame].aperture, frames[currentFrame].shutterSpeed, frames[currentFrame].iso ? `ISO ${frames[currentFrame].iso}` : ''].filter(Boolean).join('  ')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 张数指示 */}
        <div className={`absolute bottom-4 left-4 text-sm z-10 transition-colors ${
          borderType === 'black' ? 'text-black/60 font-bold' : 'text-white/80'
        }`}>
          {currentFrame + 1} / {frames.length}
        </div>
      </div>

      {/* 侧边栏 */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            className="absolute right-0 top-0 bottom-0 w-[320px] bg-surface-container-lowest/80 backdrop-blur-3xl border-l border-white/5 flex flex-col z-20 shadow-2xl overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 侧边栏头部 */}
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center sticky top-0 bg-transparent backdrop-blur-xl z-10">
              <h3 className="text-xl font-bold text-on-surface">{t('roll.info')}</h3>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-on-surface-variant" onClick={handleDownloadCurrentFrame} title={t('common.download')}>
                  <Download size={20} />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-on-surface-variant" onClick={() => setShowSidebar(false)}>
                  <X size={20} />
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
                            <h5 className="text-[#f4f4f5] font-lingxun text-[28px] leading-[1.1] tracking-wide lining-nums">{filmStockData?.brand || roll.filmStock.split(' ')[0]}</h5>
                            <h6 className="text-[#f4f4f5] font-lingxun text-[28px] leading-[1.1] tracking-wide lining-nums mt-1">{filmStockData?.model || roll.filmStock.split(' ').slice(1).join(' ')}</h6>
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
                       {['aperture', 'shutterSpeed', 'iso'].map(field => (
                          <div key={field} className="flex justify-between items-center px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group rounded-xl">
                             <span className="text-xs text-white/40">{t(`roll.${field}`)}</span>
                             {editingField?.field === field ? (
                                <input
                                   autoFocus
                                   className="bg-primary/20 text-white text-xs text-right px-2 py-1 rounded border border-primary/50 outline-none w-24"
                                   value={editValue}
                                   onChange={e => setEditValue(e.target.value)}
                                   onBlur={() => handleUpdateFrameData(frames[currentFrame].id, field, editValue)}
                                   onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                                />
                             ) : (
                                <span 
                                   className="text-xs text-white/80 cursor-pointer group-hover:text-primary transition-colors"
                                   onClick={() => { setEditingField({ frameId: frames[currentFrame].id, field }); setEditValue((frames[currentFrame] as any)[field] || ''); }}
                                >
                                   {(frames[currentFrame] as any)[field] || t('roll.noData')}
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
                       <button 
                          onClick={handleDownloadCurrentFrame}
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
