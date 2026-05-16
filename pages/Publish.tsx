import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, CloudUpload, CheckCircle2, ChevronLeft, ChevronRight, ArrowLeft, Camera, Film, Type, Hash, Image as ImageIcon, Plus, ChevronDown, Send, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../src/context/AuthContext';
import { getRolls, getRoll, type RollListItem, type FrameItem } from '../src/api/rolls';
import { uploadImage } from '../src/api/upload';
import { createPost, updatePost, getPost, type PostListItem } from '../src/api/posts';
import { useTranslation } from '../src/hooks/useTranslation';

export default function Publish() {
  const { id } = useParams(); // For edit mode
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  
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
  const [visibility, setVisibility] = useState<'public' | 'feed_only' | 'private'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(isEdit);

  // Initial redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  // Fetch post data for editing
  useEffect(() => {
    if (isEdit && id) {
      setIsLoadingPost(true);
      getPost(id)
        .then(res => {
          if (res.success && res.data) {
            const post = res.data;
            setStep(2);
            setSelectedImages(post.images.map(img => ({ url: img.imageUrl, previewUrl: img.previewUrl })));
            setTitle(post.title || '');
            setContent(post.content || '');
            setTags(post.tags || []);
            setFilmType(post.filmType || '');
            setCamera(post.camera || '');
            setLens(post.lens || '');
            setVisibility(post.visibility || 'public');
          }
        })
        .finally(() => setIsLoadingPost(false));
    }
  }, [isEdit, id]);

  useEffect(() => {
    if (user && step === 1 && rolls.length === 0) {
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
  }, [user, step, rolls.length, selectedRollId]);

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
      const uploadPromises = Array.from(files).map(file => uploadImage(file, undefined, 'post' as any, true));
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
      alert(t('login.inputPassword'));
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
        visibility,
        images: selectedImages
      };
      
      let res;
      if (isEdit && id) {
        res = await updatePost(id, payload);
      } else {
        res = await createPost(payload);
      }
      
      if (res.success) {
        navigate('/?tab=feed');
      } else {
        alert(res.error || t('common.error'));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      {/* Page Header */}
      <header className="sticky top-0 z-40 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/10 px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-bright transition-all text-on-surface-variant hover:text-on-surface"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl md:text-2xl font-headline font-bold tracking-tight text-on-surface">
            {isEdit ? t('common.edit') : t('post.new')}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10">
            <span className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-primary' : 'bg-primary/20'}`} />
            <span className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-primary' : 'bg-primary/20'}`} />
            <span className="text-[10px] font-bold text-primary ml-1 uppercase tracking-widest">Step {step} / 2</span>
          </div>
          
          {step === 2 && (
            <button 
              onClick={submitPost}
              disabled={isSubmitting || !title.trim()}
              className="bg-primary text-on-primary px-8 py-2 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {isEdit ? t('common.update') : t('post.new')}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 md:p-12 space-y-12"
            >
              {/* Section: Upload */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-on-surface-variant">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <CloudUpload size={18} />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em]">{t('common.upload')}</h3>
                </div>
                
                <div 
                  className="group relative border-2 border-dashed border-outline-variant/20 rounded-3xl p-12 md:p-20 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-500 cursor-pointer overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin shadow-lg" />
                      <span className="text-sm font-label text-primary font-bold animate-pulse tracking-widest uppercase">{t('common.loading')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl border border-outline-variant/10">
                        <Plus className="text-on-surface-variant group-hover:text-primary transition-colors" size={40} />
                      </div>
                      <span className="text-lg font-headline text-on-surface font-bold tracking-tight">{t('roll.form.placeholders.upload')}</span>
                      <p className="text-[11px] text-on-surface-variant/40 mt-3 uppercase tracking-[0.3em] font-medium">{t('roll.form.placeholders.uploadDesc')}</p>
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
              <div className="space-y-8 pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <ImageIcon size={18} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em]">{t('profile.tabs.album')}</h3>
                  </div>
                  
                  {rolls.length > 0 && (
                    <div className="relative group min-w-[280px]">
                      <select
                        className="w-full appearance-none bg-surface-container border border-outline-variant/10 rounded-xl pl-12 pr-12 py-3.5 text-xs font-label font-bold text-on-surface-variant outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all cursor-pointer tracking-widest uppercase hover:bg-surface-bright"
                        value={selectedRollId}
                        onChange={(e) => setSelectedRollId(e.target.value)}
                      >
                        {rolls.map((roll) => (
                          <option value={roll.id} key={roll.id}>{roll.title}</option>
                        ))}
                      </select>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary/60 group-hover:text-primary transition-colors">
                        <Film size={16} />
                      </div>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown size={16} className="text-on-surface-variant/40" />
                      </div>
                    </div>
                  )}
                </div>

                {isLoadingRolls || isLoadingFrames ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="aspect-[4/5] bg-surface-container-highest animate-pulse rounded-2xl" />
                    ))}
                  </div>
                ) : rollFrames.length === 0 ? (
                  <div className="text-center py-32 bg-surface-container/50 rounded-3xl border border-outline-variant/5 text-on-surface-variant flex flex-col items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-surface-variant/20 flex items-center justify-center">
                      <ImageIcon size={40} className="opacity-20" />
                    </div>
                    <p className="text-sm font-label tracking-[0.2em] uppercase opacity-40 font-bold">{t('roll.empty')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {rollFrames.map((frame, idx) => (
                      <motion.div 
                        key={frame.id} 
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleFrameSelection(frame)}
                        className={`aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer relative group transition-all duration-500 ${
                          selectedImages.some(img => img.url === frame.imageUrl) 
                            ? 'ring-4 ring-primary ring-offset-4 ring-offset-surface-container-low shadow-2xl' 
                            : 'ring-0 hover:shadow-xl'
                        }`}
                      >
                        <img 
                          src={frame.previewUrl || frame.imageUrl} 
                          alt="frame" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                        />
                        <div className={`absolute inset-0 transition-all duration-500 ${
                          selectedImages.some(img => img.url === frame.imageUrl) 
                            ? 'bg-primary/20' 
                            : 'bg-black/0 group-hover:bg-black/30'
                        }`} />
                        
                        {selectedImages.some(img => img.url === frame.imageUrl) && (
                          <motion.div 
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="absolute top-3 right-3 w-8 h-8 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg z-10"
                          >
                            <CheckCircle2 size={20} strokeWidth={3} />
                          </motion.div>
                        )}
                        
                        <div className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded uppercase tracking-widest z-10">
                          #{frame.frameNumber && frame.frameNumber !== '00' && frame.frameNumber !== '0' 
                             ? frame.frameNumber.toString().padStart(2, '0') 
                             : (idx + 1).toString().padStart(2, '0')}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Floating Continue Bar */}
              <AnimatePresence>
                {selectedImages.length > 0 && (
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-6"
                  >
                    <div className="bg-surface-container-highest/80 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-4 flex items-center justify-between shadow-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">
                          {selectedImages.length}
                        </div>
                        <span className="text-sm font-bold uppercase tracking-widest text-on-surface">
                          {t('common.selected', { count: selectedImages.length })}
                        </span>
                      </div>
                      <button 
                        onClick={() => setStep(2)}
                        className="bg-primary text-on-primary px-10 py-3 rounded-full font-bold text-sm uppercase tracking-[0.2em] hover:bg-primary-dim transition-all shadow-xl shadow-primary/20"
                      >
                        {t('common.confirm')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]"
            >
              {/* Section: Preview (Left) */}
              <div className="w-full lg:w-[550px] shrink-0 p-6 md:p-12 lg:border-r border-outline-variant/10 bg-surface-container-high/20">
                <div className="sticky top-28 space-y-8">
                  <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/10 flex items-center justify-center bg-black group">
                    <AnimatePresence mode="wait">
                      <motion.img 
                        key={selectedImages[currentImageIndex]?.url}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
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
                          className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft size={28} />
                        </button>
                        <button 
                          onClick={() => setCurrentImageIndex(prev => prev === selectedImages.length - 1 ? 0 : prev + 1)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight size={28} />
                        </button>
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2.5">
                          {selectedImages.map((_, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'bg-primary w-8' : 'bg-white/30 hover:bg-white/50 w-1.5'}`} 
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-6 bg-surface-container rounded-2xl border border-outline-variant/10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ImageIcon size={22} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface uppercase tracking-widest">{t('common.selected', { count: selectedImages.length })}</p>
                        <p className="text-[10px] text-on-surface-variant/40 font-medium uppercase tracking-widest mt-0.5">{t('common.uploadStatus.desc')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setStep(1); setCurrentImageIndex(0); }}
                      className="text-[10px] font-bold text-primary hover:text-primary-dim uppercase tracking-[0.2em] px-4 py-2 bg-primary/5 rounded-full transition-all"
                    >
                      {t('common.edit')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section: Form (Right) */}
              <div className="flex-1 p-6 md:p-12 lg:p-20 space-y-12">
                {/* Title Input */}
                <div className="space-y-4 group">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Type size={18} />
                    </div>
                    <label className="text-xs font-bold uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">{t('post.title')}</label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={30}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('post.placeholder_title')}
                      className="w-full bg-transparent border-b-2 border-outline-variant/20 py-6 text-on-surface placeholder:text-on-surface-variant/20 outline-none focus:border-primary transition-all text-3xl md:text-4xl font-headline font-bold tracking-tight"
                    />
                    <div className="absolute right-0 bottom-6 text-[10px] font-mono text-on-surface-variant/30 font-bold uppercase tracking-widest">
                      {title.length} <span className="opacity-30">/ 30</span>
                    </div>
                  </div>
                </div>

                {/* Content Input */}
                <div className="space-y-4 group">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Hash size={18} />
                    </div>
                    <label className="text-xs font-bold uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">{t('post.content')}</label>
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('post.placeholder')}
                    className="w-full bg-surface-container/30 border border-outline-variant/10 rounded-3xl px-8 py-8 text-on-surface placeholder:text-on-surface-variant/20 outline-none focus:border-primary/50 focus:bg-surface-bright/50 transition-all resize-none h-60 text-base md:text-lg leading-relaxed font-body"
                  />
                </div>

                {/* Metadata Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <Film size={18} />
                      <label className="text-xs font-bold uppercase tracking-[0.2em]">{t('roll.form.stock')}</label>
                    </div>
                    <input
                      type="text"
                      value={filmType}
                      onChange={(e) => setFilmType(e.target.value)}
                      placeholder={t('roll.form.placeholders.stock')}
                      className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl px-6 py-4 text-sm text-on-surface placeholder:text-on-surface-variant/20 outline-none focus:border-primary/50 transition-all font-bold tracking-wide"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <Camera size={18} />
                      <label className="text-xs font-bold uppercase tracking-[0.2em]">{t('roll.form.camera')}</label>
                    </div>
                    <input
                      type="text"
                      value={camera}
                      onChange={(e) => setCamera(e.target.value)}
                      placeholder={t('roll.form.placeholders.camera')}
                      className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl px-6 py-4 text-sm text-on-surface placeholder:text-on-surface-variant/20 outline-none focus:border-primary/50 transition-all font-bold tracking-wide"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-4">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <ImageIcon size={18} />
                      <label className="text-xs font-bold uppercase tracking-[0.2em]">{t('roll.form.lens')}</label>
                    </div>
                    <input
                      type="text"
                      value={lens}
                      onChange={(e) => setLens(e.target.value)}
                      placeholder={t('roll.form.placeholders.lens')}
                      className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl px-6 py-4 text-sm text-on-surface placeholder:text-on-surface-variant/20 outline-none focus:border-primary/50 transition-all font-bold tracking-wide"
                    />
                  </div>
                </div>

                {/* Visibility Selection */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <Library size={18} />
                    <label className="text-xs font-bold uppercase tracking-[0.2em]">{t('post.visibility')}</label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {(['public', 'feed_only', 'private'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVisibility(v)}
                        className={`flex flex-col gap-3 p-6 rounded-3xl border-2 transition-all text-left group relative overflow-hidden ${
                          visibility === v 
                            ? 'bg-primary/5 border-primary shadow-2xl shadow-primary/10' 
                            : 'bg-surface-container border-transparent hover:border-primary/20'
                        }`}
                      >
                        {visibility === v && (
                          <div className="absolute top-0 right-0 p-2 text-primary">
                            <CheckCircle2 size={20} />
                          </div>
                        )}
                        <span className={`text-xs font-bold uppercase tracking-[0.2em] ${visibility === v ? 'text-primary' : 'text-on-surface'}`}>
                          {t(`post.visibility${v.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}`)}
                        </span>
                        <p className={`text-[11px] leading-relaxed transition-colors ${visibility === v ? 'text-primary/70' : 'text-on-surface-variant/40'}`}>
                          {t(`post.visibility${v.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}Desc`)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags Input */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <Hash size={18} />
                    <label className="text-xs font-bold uppercase tracking-[0.2em]">{t('roll.form.tags')}</label>
                  </div>
                  <div className="min-h-[140px] bg-surface-container/30 border-2 border-outline-variant/10 rounded-3xl p-6 flex flex-wrap content-start gap-3 focus-within:border-primary/40 focus-within:bg-surface-bright/30 transition-all duration-300">
                    {tags.map(tag => (
                      <motion.span 
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={tag} 
                        className="bg-primary text-on-primary text-xs font-bold pl-4 pr-3 py-2 rounded-full flex items-center gap-3 shadow-lg shadow-primary/10"
                      >
                        #{tag}
                        <button 
                          type="button" 
                          onClick={() => removeTag(tag)} 
                          className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </motion.span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder={tags.length === 0 ? t('roll.form.tagsPlaceholder') : "..."}
                      className="flex-1 bg-transparent border-none py-2 text-base outline-none px-3 text-on-surface min-w-[200px] placeholder:text-on-surface-variant/20"
                    />
                  </div>
                </div>
                
                <div className="pt-10">
                  <button 
                    onClick={submitPost}
                    disabled={isSubmitting || !title.trim()}
                    className="w-full bg-primary text-on-primary py-6 rounded-sm font-bold text-lg uppercase tracking-[0.4em] hover:bg-primary-dim transition-all shadow-2xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-4 active:scale-[0.98] duration-300"
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={24} />
                    )}
                    {isEdit ? t('common.update') : t('post.new')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Scroll to top spacer */}
      <div className="h-20" />
    </div>
  );
}
