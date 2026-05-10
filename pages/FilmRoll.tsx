/**
 * 胶卷浏览器页面
 * 模拟观片台效果，展示整卷底片
 * 支持帧预览、管理、排序及跳转至单张查看
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoll, addFrames, deleteFrame, deleteRoll, updateRoll, reorderFrames, type RollDetail, type FrameItem } from '../src/api/rolls.ts';
import { uploadImage } from '../src/api/upload.ts';
import { getFilmStocks, type FilmStock } from '../src/api/film-stocks.ts';
import { getGear, type Gear } from '../src/api/gear.ts';
import { useUpload } from '../src/context/UploadContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../src/hooks/useTranslation';
import FilmStockManager from '../components/FilmStockManager';
import RollForm from '../components/RollForm';
import { 
  ArrowLeft, ImagePlus, Pencil, Download, Trash2, Camera, Calendar, 
  MapPin, Maximize, ArrowUp, ArrowDown, CloudUpload, Info
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
  format: '135',
  filmType: 'COLOR_NEGATIVE',
  tags: [],
  frames: [],
  status: 'COMPLETED',
  author: { id: '', nickname: '', avatarUrl: '' },
  isOwner: true,
  createdAt: ''
};

export default function FilmRoll() {
  const { t } = useTranslation();
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            filmType: response.data.filmType || '',
            format: response.data.format || '',
            tags: response.data.tags || []
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
      await startUpload(id, roll.title, files, (newFrame) => {
        setFrames(prev => [...prev, newFrame]);
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

  const handleMoveFrame = (index: number, direction: 'up' | 'down') => {
    const newFrames = [...frames];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= frames.length) return;
    [newFrames[index], newFrames[target]] = [newFrames[target], newFrames[index]];
    handleReorderFrames(newFrames);
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
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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
            <button onClick={() => {/* TODO: Implement roll export */}} className="p-2.5 hover:bg-surface-variant rounded-xl transition-colors border border-outline-variant/30" title="Export Roll">
              <Download size={20} />
            </button>
            <button onClick={() => setShowEditModal(true)} className="p-2.5 hover:bg-surface-variant rounded-xl transition-colors border border-outline-variant/30">
              <Pencil size={20} />
            </button>
            <button onClick={handleDeleteRoll} className="p-2.5 hover:bg-error/10 text-error rounded-xl transition-colors border border-error/20">
              <Trash2 size={20} />
            </button>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {frames.map((frame, index) => (
              <div
                key={frame.id}
                className="group relative aspect-[3/2] bg-surface-container rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500"
                onClick={() => navigate(`/frame/${frame.id}`)}
              >
                <img
                  src={frame.previewUrl || frame.imageUrl}
                  alt={frame.frameNumber}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                
                {/* 操作浮层 */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); handleMoveFrame(index, 'up'); }} disabled={index === 0} className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white disabled:opacity-20"><ArrowUp size={20} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleMoveFrame(index, 'down'); }} disabled={index === frames.length - 1} className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white disabled:opacity-20"><ArrowDown size={20} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteFrame(frame.id); }} className="p-2 bg-error/80 hover:bg-error rounded-lg text-white"><Trash2 size={20} /></button>
                </div>

                {/* 底部信息 */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex justify-between items-center text-white font-medium text-xs">
                    <span>{frame.frameNumber}</span>
                    <div className="flex gap-2 opacity-80">
                      {frame.aperture && <span>{frame.aperture}</span>}
                      {frame.shutterSpeed && <span>{frame.shutterSpeed}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                <button onClick={() => setConfirmDialog(null)} className="flex-1 px-6 py-3 rounded-2xl hover:bg-surface-variant transition-colors font-bold">{t('common.cancel')}</button>
                <button onClick={confirmDialog.onConfirm} className="flex-1 px-6 py-3 bg-error text-on-error rounded-2xl font-bold hover:bg-error/90 transition-colors">{t('common.confirm')}</button>
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
    </main>
  );
}