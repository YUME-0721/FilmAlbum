import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { X, CloudUpload, CheckCircle2, ChevronLeft, ChevronRight, ArrowLeft, Camera, Film, Type, Hash, Image as ImageIcon, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../src/context/AuthContext';
import { getRolls, getRoll, type RollListItem, type FrameItem } from '../src/api/rolls';
import { uploadImage } from '../src/api/upload';
import { createPost, updatePost, type PostListItem } from '../src/api/posts';
import { useTranslation } from '../src/hooks/useTranslation';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPost?: PostListItem | null;
}

export default function CreatePostModal({ isOpen, onClose, onSuccess, editPost }: CreatePostModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedImages, setSelectedImages] = useState<Array<{ url: string; previewUrl?: string }>>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Step 1 states
  const [rolls, setRolls] = useState<RollListItem[]>([]);
  const [selectedRollId, setSelectedRollId] = useState<string>('');
  const [rollFrames, setRollFrames] = useState<FrameItem[]>([]);
  const [isLoadingRolls, setIsLoadingRolls] = useState(false);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [filmType, setFilmType] = useState('');
  const [camera, setCamera] = useState('');
  const [lens, setLens] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editPost) {
        setStep(2);
        const initialImages = editPost.images?.length 
          ? editPost.images.map(img => ({ url: img.url, previewUrl: img.previewUrl }))
          : (editPost.coverImage ? [{ url: editPost.coverImage, previewUrl: editPost.coverImage }] : []);
        setSelectedImages(initialImages);
        setTitle(editPost.title || '');
        setContent(editPost.content || '');
        setTags(editPost.tags || []);
        setFilmType(editPost.filmType || '');
        setCamera(editPost.camera || '');
        setLens(editPost.lens || '');
      } else {
        setStep(1);
        setSelectedImages([]);
        setCurrentImageIndex(0);
        setTitle('');
        setContent('');
        setTags([]);
        setTagInput('');
        setFilmType('');
        setCamera('');
        setLens('');
      }
    }
  }, [isOpen, editPost]);

  useEffect(() => {
    if (isOpen && user && step === 1 && rolls.length === 0) {
      setIsLoadingRolls(true);
      getRolls({ userId: user.id })
        .then((res) => {
          if (res.success && res.data) {
            setRolls(res.data);
            if (res.data.length > 0 && !selectedRollId) {
              setSelectedRollId(res.data[0].id);
            }
          }
        })
        .finally(() => setIsLoadingRolls(false));
    }
  }, [isOpen, user, step, rolls.length, selectedRollId]);

  useEffect(() => {
    if (selectedRollId && step === 1) {
      setIsLoadingFrames(true);
      getRoll(selectedRollId)
        .then((res) => {
          if (res.success && res.data) {
            setRollFrames(res.data.frames || []);
          }
        })
        .finally(() => setIsLoadingFrames(false));
    } else {
      setRollFrames([]);
    }
  }, [selectedRollId, step]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadImage(file, undefined, 'frame', true));
      const results = await Promise.all(uploadPromises);
      const newImages = results.map(res => ({ url: res.url, previewUrl: res.previewUrl || res.url }));
      setSelectedImages(prev => [...prev, ...newImages]);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleFrameSelection = (frame: FrameItem) => {
    setSelectedImages(prev => 
      prev.some(img => img.url === frame.imageUrl) 
        ? prev.filter(img => img.url !== frame.imageUrl)
        : [...prev, { url: frame.imageUrl, previewUrl: frame.previewUrl || frame.imageUrl }]
    );
  };

  const handleAddTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const submitPost = async () => {
    if (!title.trim()) {
      alert("请输入标题");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title,
        content,
        tags,
        filmType,
        camera,
        lens,
        images: selectedImages
      };
      
      let res;
      if (editPost) {
        res = await updatePost(editPost.id, payload);
      } else {
        res = await createPost(payload);
      }
      
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        alert(res.error || t('common.error'));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            onClick={onClose} 
          />
        )}
      </AnimatePresence>
      
      {/* Modal Card */}
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-surface-container-low border border-outline-variant/10 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-8 py-5 bg-surface-container-low/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-widest uppercase font-headline">
              {step === 1 ? (editPost ? t('common.edit') : t('common.upload')) : (editPost ? t('roll.edit') : t('post.new'))}
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <span className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-primary' : 'bg-primary/40'}`} />
              <span className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-primary' : 'bg-primary/40'}`} />
              <span className="text-[10px] font-bold text-primary ml-1 uppercase tracking-tighter">Step {step}</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-bright transition-all text-on-surface-variant hover:text-on-surface"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 flex flex-col gap-10"
              >
                {/* Section: Upload */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <CloudUpload size={18} />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em]">{t('common.upload')}</h3>
                  </div>
                  <div 
                    className="group border-2 border-dashed border-outline-variant/20 rounded-2xl p-12 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-sm font-label text-primary animate-pulse">{t('common.loading')}</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                          <Plus className="text-on-surface-variant group-hover:text-primary transition-colors" size={32} />
                        </div>
                        <span className="text-sm font-label text-on-surface-variant group-hover:text-on-surface transition-colors font-medium">Click or drag photos here</span>
                        <p className="text-[10px] text-on-surface-variant/40 mt-2 uppercase tracking-widest">Supports JPG, PNG, WEBP (Max 20MB)</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload} 
                    />
                  </div>
                </div>

                {/* Section: Gallery */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <ImageIcon size={18} />
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em]">{t('profile.tabs.album')}</h3>
                    </div>
                    {rolls.length > 0 && (
                      <div className="relative">
                        <select
                          className="appearance-none bg-surface-container border border-outline-variant/10 rounded-lg pl-10 pr-12 py-2 text-xs font-label font-bold text-on-surface-variant outline-none focus:border-primary/50 transition-all cursor-pointer tracking-widest uppercase hover:bg-surface-bright"
                          value={selectedRollId}
                          onChange={(e) => setSelectedRollId(e.target.value)}
                        >
                          {rolls.map((roll) => (
                            <option value={roll.id} key={roll.id}>{roll.title}</option>
                          ))}
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/60">
                          <Film size={14} />
                        </div>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronDown size={14} className="text-on-surface-variant/40" />
                        </div>
                      </div>
                    )}
                  </div>

                  {isLoadingRolls || isLoadingFrames ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-square bg-surface-container-highest animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : rolls.length === 0 ? (
                    <div className="text-center py-20 bg-surface-container rounded-2xl border border-outline-variant/5 text-on-surface-variant flex flex-col items-center gap-4">
                      <ImageIcon size={48} className="opacity-10" />
                      <p className="text-xs font-label tracking-widest uppercase opacity-40">{t('roll.empty')}</p>
                    </div>
                  ) : rollFrames.length === 0 ? (
                    <div className="text-center py-20 bg-surface-container rounded-2xl border border-outline-variant/5 text-on-surface-variant flex flex-col items-center gap-4">
                      <ImageIcon size={48} className="opacity-10" />
                      <p className="text-xs font-label tracking-widest uppercase opacity-40">{t('roll.empty')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {rollFrames.map((frame) => (
                        <motion.div 
                          key={frame.id} 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleFrameSelection(frame)}
                          className={`aspect-square rounded-xl overflow-hidden cursor-pointer relative group border-4 transition-all duration-300 ${
                            selectedImages.some(img => img.url === frame.imageUrl) 
                              ? 'border-primary ring-4 ring-primary/20 shadow-xl' 
                              : 'border-transparent ring-0'
                          }`}
                        >
                          <img 
                            src={frame.previewUrl || frame.imageUrl} 
                            alt="frame" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                          />
                          <div className={`absolute inset-0 transition-all duration-300 ${
                            selectedImages.some(img => img.url === frame.imageUrl) 
                              ? 'bg-primary/10' 
                              : 'bg-black/0 group-hover:bg-black/20'
                          }`} />
                          
                          {selectedImages.some(img => img.url === frame.imageUrl) && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-6 h-6 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg"
                            >
                              <CheckCircle2 size={16} />
                            </motion.div>
                          )}
                          
                          <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white/70 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            #{frame.frameNumber}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col lg:flex-row h-full"
              >
                {/* Section: Preview (Left) */}
                <div className="w-full lg:w-[450px] shrink-0 p-8 border-b lg:border-b-0 lg:border-r border-outline-variant/10 bg-surface-container-high/30">
                  <div className="sticky top-8">
                    <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/15 flex items-center justify-center bg-black group">
                      <AnimatePresence mode="wait">
                        <motion.img 
                          key={selectedImages[currentImageIndex]?.url}
                          initial={{ opacity: 0, scale: 1.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.5 }}
                          src={selectedImages[currentImageIndex]?.url} 
                          alt="preview" 
                          className="w-full h-full object-contain" 
                          referrerPolicy="no-referrer" 
                        />
                      </AnimatePresence>
                      
                      {selectedImages.length > 1 && (
                        <>
                          <button 
                            onClick={() => setCurrentImageIndex(prev => prev === 0 ? selectedImages.length - 1 : prev - 1)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronLeft size={24} />
                          </button>
                          <button 
                            onClick={() => setCurrentImageIndex(prev => prev === selectedImages.length - 1 ? 0 : prev + 1)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronRight size={24} />
                          </button>
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                            {selectedImages.map((_, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-primary w-6' : 'bg-white/30 hover:bg-white/50'}`} 
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => { setStep(1); setCurrentImageIndex(0); }}
                      className="w-full mt-6 py-3 text-on-surface-variant hover:text-primary text-xs font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-widest bg-surface-container rounded-xl border border-outline-variant/10 hover:border-primary/30"
                    >
                      <ArrowLeft size={16} />
                      {t('common.cancel')} / {selectedImages.length} selected
                    </button>
                  </div>
                </div>

                {/* Section: Form (Right) */}
                <div className="flex-1 p-8 lg:p-12 space-y-10">
                  {/* Title Input */}
                  <div className="space-y-3 group">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Type size={16} />
                      <label className="text-xs font-bold uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">{t('post.title')}</label>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={15}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Untitled Story..."
                        className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl px-6 py-5 text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-primary/50 focus:bg-surface-bright transition-all text-xl font-headline font-bold"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-label text-on-surface-variant/30 font-bold">
                        {title.length} <span className="opacity-40">/ 15</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Input */}
                  <div className="space-y-3 group">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Hash size={16} />
                      <label className="text-xs font-bold uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">{t('post.content')}</label>
                    </div>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t('post.placeholder')}
                      className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl px-6 py-5 text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-primary/50 focus:bg-surface-bright transition-all resize-none h-44 text-sm leading-relaxed"
                    />
                  </div>

                  {/* Metadata Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <Film size={16} />
                        <label className="text-xs font-bold uppercase tracking-[0.2em]">{t('roll.form.stock')}</label>
                      </div>
                      <input
                        type="text"
                        value={filmType}
                        onChange={(e) => setFilmType(e.target.value)}
                        placeholder="如: Kodak Vision3 500T"
                        className="w-full bg-surface-container border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-primary/50 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <Camera size={16} />
                        <label className="text-xs font-bold uppercase tracking-[0.2em]">{t('roll.form.camera')}</label>
                      </div>
                      <input
                        type="text"
                        value={camera}
                        onChange={(e) => setCamera(e.target.value)}
                        placeholder="如: Nikon F3HP"
                        className="w-full bg-surface-container border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-primary/50 transition-all font-medium"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-3">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <ImageIcon size={16} />
                        <label className="text-xs font-bold uppercase tracking-[0.2em]">{t('roll.form.lens')}</label>
                      </div>
                      <input
                        type="text"
                        value={lens}
                        onChange={(e) => setLens(e.target.value)}
                        placeholder="如: 50mm f/1.4 AIS"
                        className="w-full bg-surface-container border border-outline-variant/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-primary/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Tags Input */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">{t('roll.form.tags')}</label>
                    <div className="min-h-[120px] bg-surface-container border border-outline-variant/10 rounded-2xl p-4 flex flex-wrap content-start gap-2 focus-within:border-primary/50 transition-all">
                      {tags.map(tag => (
                        <motion.span 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={tag} 
                          className="bg-primary/10 text-primary border border-primary/20 text-xs font-bold pl-3 pr-2 py-1.5 rounded-full flex items-center gap-2"
                        >
                          #{tag}
                          <button 
                            type="button" 
                            onClick={() => removeTag(tag)} 
                            className="w-4 h-4 rounded-full bg-primary/20 hover:bg-primary hover:text-on-primary flex items-center justify-center transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </motion.span>
                      ))}
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder={tags.length === 0 ? t('roll.form.tagsPlaceholder') : "..."}
                        className="flex-1 bg-transparent border-none py-1 text-sm outline-none px-2 text-on-surface min-w-[150px]"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-outline-variant/10 px-8 py-6 bg-surface-container-low flex items-center justify-between sticky bottom-0 z-20">
          <div className="hidden sm:block">
            {selectedImages.length > 0 && (
              <p className="text-xs font-label text-on-surface-variant/40 tracking-widest uppercase font-bold">
                Selected <span className="text-primary">{selectedImages.length}</span> / 9 
                <span className="ml-2 opacity-50 font-normal italic">Memories being archived</span>
              </p>
            )}
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            {step === 1 ? (
              <>
                <button 
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => setStep(2)}
                  disabled={selectedImages.length === 0}
                  className="flex-1 sm:flex-none px-12 py-3 rounded-full font-bold text-xs uppercase tracking-[0.2em] bg-primary text-on-primary hover:bg-primary-dim transition-all shadow-xl shadow-primary/20 disabled:opacity-30 disabled:grayscale disabled:scale-95"
                >
                  {t('common.confirm')}
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest text-on-surface-variant hover:bg-surface-bright transition-all disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={submitPost}
                  disabled={isSubmitting || !title.trim()}
                  className="flex-1 sm:flex-none px-12 py-3 rounded-full font-bold text-xs uppercase tracking-[0.2em] bg-primary text-on-primary hover:bg-primary-dim transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  {isSubmitting ? t('common.loading') : (editPost ? t('common.update') : t('post.new'))}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
