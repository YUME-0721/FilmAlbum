import React, { useState } from 'react';
import type { Gear } from '../src/api/gear';
import { X, Loader2, CheckCircle2, ImagePlus, Star } from 'lucide-react';
import { useTranslation } from '../src/hooks/useTranslation';

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
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!gearForm.cameraModel.trim()) {
      newErrors.cameraModel = t('common.error');
    }
    
    if (gearForm.lensModels.length === 0) {
      newErrors.lensModels = t('gear.form.lensRequired');
    }
    
    if (!gearForm.lensType) {
      newErrors.lensType = t('gear.form.lensTypeRequired');
    }
    
    if (!gearForm.status) {
      newErrors.status = t('gear.form.statusRequired');
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
          <X size={20} />
        </button>
        <h2 className="text-xl font-headline font-bold mb-6 text-on-surface tracking-tight">
          {isEditing ? t('gear.edit') : t('gear.add')}
        </h2>
        
        {/* 提交状态提示 */}
        {submitStatus !== 'idle' && (
          <div className="mb-4 p-3 bg-surface-container-high rounded-sm border border-outline-variant/30">
            {submitStatus === 'uploading' && (
              <div className="flex items-center gap-2 text-on-surface">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm">{isEditing ? t('common.loading') : t('common.loading')}</span>
              </div>
            )}
            {submitStatus === 'success' && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 size={16} />
                <span className="text-sm">{isEditing ? t('common.success') : t('common.success')}</span>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 设备照片和基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 设备图片上传 */}
            <div className="space-y-2">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">{t('gear.form.image')}</label>
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
                    <ImagePlus size={48} className="mb-2" />
                    <p className="text-xs">{t('common.upload')}</p>
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
                <label htmlFor="gear-lens-type" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">{t('gear.form.lensType')} *</label>
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
                  <option value="interchangeable">{t('gear.form.lensTypeInterchangeable')}</option>
                  <option value="fixed">{t('gear.form.lensTypeFixed')}</option>
                </select>
                {errors.lensType && (
                  <p className="text-xs text-error">{errors.lensType}</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="gear-status" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">{t('gear.form.status')} *</label>
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
                  <option value="using">{t('gear.status.using')}</option>
                  <option value="used">{t('gear.status.used')}</option>
                  <option value="wanted">{t('gear.status.wanted')}</option>
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
              <label htmlFor="gear-camera-model" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">{t('gear.form.camera')} *</label>
              <input 
                id="gear-camera-model"
                type="text" 
                required
                placeholder={t('gear.form.cameraPlaceholder')}
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
                {t('gear.form.lens')} * {gearForm.lensType === 'interchangeable' && <span className="text-on-surface-variant/50 normal-case">{t('gear.form.enterToAdd')}</span>}
              </label>
              <div className="space-y-2">
                <input 
                  id="gear-lens-model"
                  type="text" 
                  required={gearForm.lensModels.length === 0}
                  placeholder={t('gear.form.lensPlaceholder')}
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
                          <X size={14} />
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
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">{t('roll.form.format')}</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '半格', label: t('gear.form.formats.half') },
                  { value: '135', label: t('gear.form.formats.full') },
                  { value: '645', label: t('gear.form.formats.m645') },
                  { value: '6x6', label: t('gear.form.formats.m66') },
                  { value: '6x7', label: t('gear.form.formats.m67') },
                  { value: '6x9', label: t('gear.form.formats.m69') },
                ].map(format => (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => {
                      setGearForm({
                        ...gearForm,
                        formats: gearForm.formats.includes(format.value)
                          ? gearForm.formats.filter(f => f !== format.value)
                          : [...gearForm.formats, format.value]
                      });
                    }}
                    className={`px-2 py-1 text-xs font-label uppercase tracking-wider rounded-sm transition-colors ${
                      gearForm.formats.includes(format.value)
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">{t('gear.count')}</label>
              {gearForm.formats.map(format => (
                <div key={format} className="flex items-center gap-2">
                  <span className="text-sm text-on-surface-variant min-w-[40px]">{format}:</span>
                  <input 
                    type="number" 
                    min="0"
                    placeholder={t('gear.form.shotCountPlaceholder')}
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
                <p className="text-xs text-on-surface-variant/50">{t('gear.form.selectFormatFirst')}</p>
              )}
            </div>
          </div>

          {/* 评分和外部详情链接 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">{t('gear.form.rating')}</label>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setGearForm({...gearForm, rating: i + 1})}
                    className="text-2xl transition-colors"
                  >
                    <Star 
                      size={24} 
                      className={i < gearForm.rating ? 'text-warning fill-warning' : 'text-on-surface-variant/30 hover:text-warning hover:fill-warning'} 
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="gear-external-url" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">URL</label>
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
            <label htmlFor="gear-review" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">{t('gear.form.review')}</label>
            <input 
              id="gear-review"
              type="text" 
              maxLength={30}
              placeholder={t('gear.form.reviewPlaceholder')}
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
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary text-on-primary px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-primary-dim transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  {t('common.loading')}
                </>
              ) : (
                isEditing ? t('common.update') : t('common.add')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
