import React, { useState } from 'react';
import type { Gear } from '../src/api/gear';

interface GearFormProps {
  isEditing: boolean;
  editingGear: Gear | null;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  gearForm: {
    cameraModel: string;
    lensModels: string[];
    lensType: 'interchangeable' | 'fixed';
    status: 'used' | 'using' | 'wanted';
    formats: string[];
    shotCount: number;
    shotCounts: Record<string, number>;
    mount: string;
    externalUrl: string;
    review: string;
    rating: number;
  };
  setGearForm: React.Dispatch<React.SetStateAction<{
    cameraModel: string;
    lensModels: string[];
    lensType: 'interchangeable' | 'fixed';
    status: 'used' | 'using' | 'wanted';
    formats: string[];
    shotCount: number;
    shotCounts: Record<string, number>;
    mount: string;
    externalUrl: string;
    review: string;
    rating: number;
  }>>;
  gearImage: File | null;
  setGearImage: React.Dispatch<React.SetStateAction<File | null>>;
  currentLensInput: string;
  setCurrentLensInput: React.Dispatch<React.SetStateAction<string>>;
}

export default function GearForm({ 
  isEditing, 
  editingGear, 
  onSubmit, 
  onCancel, 
  gearForm, 
  setGearForm, 
  gearImage, 
  setGearImage, 
  currentLensInput, 
  setCurrentLensInput 
}: GearFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!gearForm.cameraModel.trim()) {
      newErrors.cameraModel = '请输入相机型号';
    }
    
    if (gearForm.lensModels.length === 0) {
      newErrors.lensModels = '请至少添加一个镜头型号';
    }
    
    if (!gearForm.lensType) {
      newErrors.lensType = '请选择镜头类型';
    }
    
    if (!gearForm.status) {
      newErrors.status = '请选择设备状态';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitStatus('uploading');
    
    try {
      await onSubmit(e);
      setSubmitStatus('success');
      // 2秒后关闭成功提示
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 2000);
    } catch (error) {
      setSubmitStatus('idle');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface-container max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-xl font-headline font-bold mb-6 text-on-surface tracking-tight">
          {isEditing ? '编辑拍摄设备' : '添加拍摄设备'}
        </h2>
        
        {/* 提交状态提示 */}
        {submitStatus !== 'idle' && (
          <div className="mb-4 p-3 bg-surface-container-high rounded-sm border border-outline-variant/30">
            {submitStatus === 'uploading' && (
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined animate-spin">sync</span>
                <span className="text-sm">{isEditing ? '更新设备中...' : '上传设备中...'}</span>
              </div>
            )}
            {submitStatus === 'success' && (
              <div className="flex items-center gap-2 text-success">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="text-sm">{isEditing ? '设备更新成功' : '设备添加成功'}</span>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 设备照片和基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 设备图片上传 */}
            <div className="space-y-2">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">设备照片</label>
              <div className="relative aspect-[16/9] bg-surface-container-low border border-dashed border-outline-variant/30 rounded-sm overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                {gearImage ? (
                  <img 
                    src={URL.createObjectURL(gearImage)} 
                    alt="设备预览"
                    className="w-full h-full object-cover"
                  />
                ) : editingGear?.imageUrl ? (
                  <img 
                    src={editingGear.imageUrl} 
                    alt={editingGear.cameraModel}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/30">
                    <span className="material-symbols-outlined text-[24px] mb-1">add_photo_alternate</span>
                    <p className="text-xs">点击上传设备照片</p>
                  </div>
                )}
                <input 
                  id="gear-image-upload"
                  type="file" 
                  accept="image/*"
                  onChange={(e) => e.target.files && e.target.files[0] && setGearImage(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  title="上传设备照片"
                />
              </div>
            </div>

            {/* 镜头类型和设备状态 */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="gear-lens-type" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">镜头类型 *</label>
                <select 
                  id="gear-lens-type"
                  required
                  value={gearForm.lensType}
                  onChange={e => {
                    setGearForm({...gearForm, lensType: e.target.value as 'interchangeable' | 'fixed'});
                    if (errors.lensType) {
                      setErrors({...errors, lensType: ''});
                    }
                  }}
                  className={`w-full bg-surface-container-low border ${errors.lensType ? 'border-error' : 'border-outline-variant/30'} focus:border-primary px-3 py-2 text-sm text-on-surface outline-none transition-colors`}
                >
                  <option value="interchangeable">可更换镜头</option>
                  <option value="fixed">不可更换镜头</option>
                </select>
                {errors.lensType && (
                  <p className="text-xs text-error">{errors.lensType}</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="gear-status" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">设备状态 *</label>
                <select 
                  id="gear-status"
                  required
                  value={gearForm.status}
                  onChange={e => {
                    setGearForm({...gearForm, status: e.target.value as 'used' | 'using' | 'wanted'});
                    if (errors.status) {
                      setErrors({...errors, status: ''});
                    }
                  }}
                  className={`w-full bg-surface-container-low border ${errors.status ? 'border-error' : 'border-outline-variant/30'} focus:border-primary px-3 py-2 text-sm text-on-surface outline-none transition-colors`}
                >
                  <option value="using">正在使用</option>
                  <option value="used">使用过的</option>
                  <option value="wanted">想要的</option>
                </select>
                {errors.status && (
                  <p className="text-xs text-error">{errors.status}</p>
                )}
              </div>
            </div>
          </div>

          {/* 相机型号和镜头型号 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="gear-camera-model" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">相机型号 *</label>
              <input 
                id="gear-camera-model"
                type="text" 
                required
                placeholder="例如：Leica M6"
                value={gearForm.cameraModel}
                onChange={e => {
                  setGearForm({...gearForm, cameraModel: e.target.value});
                  if (errors.cameraModel) {
                    setErrors({...errors, cameraModel: ''});
                  }
                }}
                className={`w-full bg-surface-container-low border ${errors.cameraModel ? 'border-error' : 'border-outline-variant/30'} focus:border-primary px-3 py-2 text-sm text-on-surface outline-none transition-colors`}
              />
              {errors.cameraModel && (
                <p className="text-xs text-error">{errors.cameraModel}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="gear-lens-model" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">
                镜头型号 * {gearForm.lensType === 'interchangeable' && <span className="text-on-surface-variant/50 normal-case">(按回车添加多个)</span>}
              </label>
              <div className="space-y-2">
                <input 
                  id="gear-lens-model"
                  type="text" 
                  required={gearForm.lensModels.length === 0}
                  placeholder="例如：Summicron 35mm f/2"
                  value={currentLensInput}
                  onChange={e => setCurrentLensInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = currentLensInput.trim();
                      if (value) {
                        if (gearForm.lensType === 'fixed') {
                          // 不可更换镜头只能有一个
                          setGearForm({...gearForm, lensModels: [value]});
                        } else {
                          // 可更换镜头可以添加多个
                          if (!gearForm.lensModels.includes(value)) {
                            setGearForm({...gearForm, lensModels: [...gearForm.lensModels, value]});
                          }
                        }
                        setCurrentLensInput('');
                        if (errors.lensModels) {
                          setErrors({...errors, lensModels: ''});
                        }
                      }
                    }
                  }}
                  className={`w-full bg-surface-container-low border ${errors.lensModels ? 'border-error' : 'border-outline-variant/30'} focus:border-primary px-3 py-2 text-sm text-on-surface outline-none transition-colors`}
                />
                {errors.lensModels && (
                  <p className="text-xs text-error">{errors.lensModels}</p>
                )}
                {/* 已添加的镜头列表 */}
                {gearForm.lensModels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {gearForm.lensModels.map((lens, index) => (
                      <div key={index} className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-sm text-xs">
                        <span>{lens}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setGearForm({
                              ...gearForm,
                              lensModels: gearForm.lensModels.filter((_, i) => i !== index)
                            });
                            if (errors.lensModels) {
                              setErrors({...errors, lensModels: ''});
                            }
                          }}
                          className="text-on-surface-variant hover:text-error"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 胶卷规格和拍摄张数 */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">画幅规格</label>
              <div className="flex flex-wrap gap-2">
                {['半格', '135', '645', '6x6', '6x7', '6x9'].map(format => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => {
                      setGearForm({
                        ...gearForm,
                        formats: gearForm.formats.includes(format)
                          ? gearForm.formats.filter(f => f !== format)
                          : [...gearForm.formats, format]
                      });
                    }}
                    className={`px-2 py-1 text-xs font-label uppercase tracking-wider rounded-sm transition-colors ${
                      gearForm.formats.includes(format)
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">拍摄张数（按画幅规格）</label>
              {gearForm.formats.map(format => (
                <div key={format} className="flex items-center gap-2">
                  <span className="text-sm text-on-surface-variant min-w-[40px]">{format}:</span>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="例如：36"
                    value={gearForm.shotCounts?.[format] || ''}
                    onChange={e => {
                      setGearForm({
                        ...gearForm,
                        shotCounts: {
                          ...gearForm.shotCounts,
                          [format]: parseInt(e.target.value) || 0
                        }
                      });
                    }}
                    className="flex-1 bg-surface-container-low border border-outline-variant/30 focus:border-primary px-3 py-2 text-sm text-on-surface outline-none transition-colors"
                  />
                </div>
              ))}
              {gearForm.formats.length === 0 && (
                <p className="text-xs text-on-surface-variant/50">请先选择画幅规格</p>
              )}
            </div>
          </div>

          {/* 评分和外部详情链接 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">评分</label>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setGearForm({...gearForm, rating: i + 1})}
                    className="text-2xl transition-colors"
                  >
                    <span className={`material-symbols-outlined ${
                      i < gearForm.rating ? 'text-warning fill-warning' : 'text-on-surface-variant/30 hover:text-warning hover:fill-warning' 
                    }`}>
                      star
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant/50">点击星星进行评分，共5颗星</p>
            </div>
            <div className="space-y-1">
              <label htmlFor="gear-external-url" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">外部详情链接</label>
              <input 
                id="gear-external-url"
                type="url" 
                placeholder="https://..."
                value={gearForm.externalUrl}
                onChange={e => setGearForm({...gearForm, externalUrl: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-3 py-2 text-sm text-on-surface outline-none transition-colors"
              />
            </div>
          </div>

          {/* 自定义评价 */}
          <div className="space-y-1">
            <label htmlFor="gear-review" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">自定义评价</label>
            <input 
              id="gear-review"
              type="text" 
              maxLength={30}
              placeholder="不超过30个字"
              value={gearForm.review}
              onChange={e => setGearForm({...gearForm, review: e.target.value})}
              className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-3 py-2 text-sm text-on-surface outline-none transition-colors"
            />
            <p className="text-xs text-on-surface-variant/50">{gearForm.review.length}/30</p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              取消
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary text-on-primary px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-primary-dim transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  {isEditing ? '更新中...' : '添加中...'}
                </>
              ) : (
                isEditing ? '更新设备' : '添加设备'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
