import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { getRolls, getRoll, type RollListItem, type FrameItem } from '../src/api/rolls';
import { uploadImage } from '../src/api/upload';
import { createPost, updatePost, type PostListItem } from '../src/api/posts';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPost?: PostListItem | null;
}

export default function CreatePostModal({ isOpen, onClose, onSuccess, editPost }: CreatePostModalProps) {
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
        setStep(2); // 编辑模式默认进入第二步文本编辑
        // 提取图片信息
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
        setStep(1); // 新建模式
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
      // Load user rolls once when entering step 1
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
    if (selectedRollId) {
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
  }, [selectedRollId]);

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
      alert('图片上传失败，请重试');
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
      alert('请输入帖子标题');
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
        alert(editPost ? '更新失败' : '发帖失败');
      }
    } catch (err) {
      alert('请求出错，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#333] px-6 py-4 bg-[#1c1c1c]/90 sticky top-0 z-10">
          <h2 className="text-xl font-bold tracking-wide">
            {step === 1 ? (editPost ? '重选照片' : '选择照片') : (editPost ? '编辑帖子信息' : '创建新帖子')}
          </h2>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[#999]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto min-h-[400px]">
          {step === 1 && (
            <div className="p-6 flex flex-col h-full">
              {/* Option A: Upload New */}
              <div className="mb-8">
                <h3 className="text-[#999] mb-4 text-sm font-semibold uppercase tracking-wider">上传新照片</h3>
                <div 
                  className="border-2 border-dashed border-[#444] rounded-xl p-8 flex flex-col items-center justify-center hover:border-primary/50 transition-colors cursor-pointer bg-[#222]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <span className="text-[#999] animate-pulse">正在上传...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-4xl text-[#666] mb-2">cloud_upload</span>
                      <span className="text-[#e7e5e5]">点击上传照片</span>
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

              {/* Option B: Internal Gallery */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#999] text-sm font-semibold uppercase tracking-wider">从相册挑选</h3>
                  {rolls.length > 0 && (
                    <select
                      className="bg-[#222] border border-[#444] rounded-md px-3 py-1 text-sm outline-none focus:border-primary"
                      value={selectedRollId}
                      onChange={(e) => setSelectedRollId(e.target.value)}
                    >
                      {rolls.map((roll) => (
                        <option value={roll.id} key={roll.id}>{roll.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {isLoadingRolls || isLoadingFrames ? (
                  <div className="flex justify-center py-10"><span className="animate-pulse text-[#999]">加载相片...</span></div>
                ) : rolls.length === 0 ? (
                  <div className="text-center py-10 bg-[#222] rounded-xl border border-[#333] text-[#666]">
                    还没有创建过相册，先去建一盒胶卷吧
                  </div>
                ) : rollFrames.length === 0 ? (
                  <div className="text-center py-10 bg-[#222] rounded-xl border border-[#333] text-[#666]">
                    这个相册里还没有照片喔
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {rollFrames.map((frame) => (
                      <div 
                        key={frame.id} 
                        className={`aspect-square bg-[#222] rounded-lg overflow-hidden cursor-pointer hover:border-2 transition-all relative group ${selectedImages.some(img => img.url === frame.imageUrl) ? 'border-2 border-primary' : 'border-2 border-transparent'}`}
                        onClick={() => toggleFrameSelection(frame)}
                      >
                        <img 
                          src={frame.imageUrl} 
                          alt="frame" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {selectedImages.some(img => img.url === frame.imageUrl) && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                          </div>
                        )}
                        {!selectedImages.some(img => img.url === frame.imageUrl) && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white">check_circle</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col md:flex-row h-full">
              {/* Left Side: Preview */}
              <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-[#333] bg-black/20 flex flex-col justify-center">
                <div className="relative w-full rounded-xl overflow-hidden shadow-lg border border-[#333] flex items-center justify-center bg-[#111] max-h-[50vh]">
                  {selectedImages.length > 1 && (
                    <button 
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? selectedImages.length - 1 : prev - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                  )}
                  <img src={selectedImages[currentImageIndex]?.url} alt="preview" className="w-full h-auto object-contain max-h-[50vh]" referrerPolicy="no-referrer" />
                  {selectedImages.length > 1 && (
                    <button 
                      onClick={() => setCurrentImageIndex(prev => prev === selectedImages.length - 1 ? 0 : prev + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  )}
                  {selectedImages.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                      {selectedImages.map((_, idx) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => { setStep(1); setCurrentImageIndex(0); }}
                  className="mt-4 text-[#999] hover:text-white text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  重选图片 / {selectedImages.length} 张已选
                </button>
              </div>

              {/* Right Side: Form */}
              <div className="w-full md:w-1/2 p-6 flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#999] mb-1">标题</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="给作品起个名字（最多15字）"
                    className="w-full bg-[#222] border border-[#444] rounded-lg px-4 py-3 text-[#e7e5e5] placeholder:text-[#666] outline-none focus:border-primary transition-colors text-lg"
                  />
                  <div className="text-right text-xs text-[#666] mt-1">{title.length}/15</div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#999] mb-1">说点什么吧</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="分享一下这张照片背后的故事..."
                    className="w-full bg-[#222] border border-[#444] rounded-lg px-4 py-3 text-[#e7e5e5] placeholder:text-[#666] outline-none focus:border-primary transition-colors resize-none h-28"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#999] mb-1">胶卷型号</label>
                    <input
                      type="text"
                      value={filmType}
                      onChange={(e) => setFilmType(e.target.value)}
                      placeholder="如: CINESTILL 800T"
                      className="w-full bg-[#222] border border-[#444] rounded-md px-3 py-2 text-sm text-[#e7e5e5] placeholder:text-[#666] outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#999] mb-1">相机</label>
                    <input
                      type="text"
                      value={camera}
                      onChange={(e) => setCamera(e.target.value)}
                      placeholder="如: LEICA M6"
                      className="w-full bg-[#222] border border-[#444] rounded-md px-3 py-2 text-sm text-[#e7e5e5] placeholder:text-[#666] outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-[#999] mb-1">镜头型号</label>
                    <input
                      type="text"
                      value={lens}
                      onChange={(e) => setLens(e.target.value)}
                      placeholder="如: SUMMICRON 35MM F/2"
                      className="w-full bg-[#222] border border-[#444] rounded-md px-3 py-2 text-sm text-[#e7e5e5] placeholder:text-[#666] outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#999] mb-1">分类标签 (按回车添加)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span key={tag} className="bg-[#333] text-sm px-2 py-1 rounded flex items-center gap-1 group">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-[#999] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="输入标签按回车..."
                    className="w-full bg-[#222] border border-[#444] rounded-md px-3 py-2 text-sm text-[#e7e5e5] placeholder:text-[#666] outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 1 && selectedImages.length > 0 && (
          <div className="border-t border-[#333] p-4 bg-[#1c1c1c] flex justify-end sticky bottom-0 z-10">
            <button 
              onClick={() => setStep(2)}
              className="px-8 py-2 rounded-md font-medium bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
            >
              下一步 (已选 {selectedImages.length} 张)
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="border-t border-[#333] p-4 bg-[#1c1c1c] flex justify-end gap-3 sticky bottom-0">
            <button 
              onClick={() => setStep(1)}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-md font-medium text-[#999] hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              返回选图
            </button>
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-md font-medium text-[#999] hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button 
              onClick={submitPost}
              disabled={isSubmitting || !title.trim()}
              className="px-8 py-2 rounded-md font-medium bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {isSubmitting ? '保存中...' : (editPost ? '保存更改' : '发布作品')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
