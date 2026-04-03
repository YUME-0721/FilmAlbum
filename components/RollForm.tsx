import React, { useState, useEffect } from 'react';
import { filterFilmStocks } from '../src/constants/brands';
import { X, Tag } from 'lucide-react';

interface RollFormProps {
  isEditing: boolean;
  editingRoll: any;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  filmStocks: any[];
  isLoadingFilmStocks: boolean;
  showFilmStockManagement: boolean;
  setShowFilmStockManagement: (value: boolean) => void;
  isSubmitting: boolean;
  tagInput: string;
  setTagInput: (value: string) => void;
  rollForm: {
    title: string;
    filmStock: string;
    location: string;
    camera: string;
    lens: string;
    shotDate: string;
    endDate?: string;
    format: string;
    filmType: string;
    tags: string[];
  };
  setRollForm: React.Dispatch<React.SetStateAction<{
    title: string;
    filmStock: string;
    location: string;
    camera: string;
    lens: string;
    shotDate: string;
    endDate?: string;
    format: string;
    filmType: string;
    tags: string[];
  }>>;
  filmStockSearch: string;
  setFilmStockSearch: (value: string) => void;
  addFilmStockForm: {
    brand: string;
    model: string;
    iso: number;
    format: string;
    filmType: string;
    process: string;
  };
  setAddFilmStockForm: React.Dispatch<React.SetStateAction<{
    brand: string;
    model: string;
    iso: number;
    format: string;
    filmType: string;
    process: string;
  }>>;
  gearList: any[];
  isLoadingGear: boolean;
}

export default function RollForm({
  isEditing,
  editingRoll,
  onSubmit,
  onCancel,
  filmStocks,
  isLoadingFilmStocks,
  showFilmStockManagement,
  setShowFilmStockManagement,
  isSubmitting,
  tagInput,
  setTagInput,
  rollForm,
  setRollForm,
  filmStockSearch,
  setFilmStockSearch,
  addFilmStockForm,
  setAddFilmStockForm,
  gearList,
  isLoadingGear
}: RollFormProps) {
  // 使用rollForm作为formData
  const formData = rollForm;
  const setFormData = setRollForm;
  
  // 搜索状态
  const [cameraSearch, setCameraSearch] = useState('');
  const [lensSearch, setLensSearch] = useState('');
  // 处理标签输入
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim();
      if (!formData.tags.includes(val)) {
        setFormData({ ...formData, tags: [...formData.tags, val] });
      }
      setTagInput('');
    }
  };

  // 移除标签
  const removeTag = (index: number) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container max-w-lg w-full p-8 shadow-2xl relative">
        <button 
          onClick={onCancel}
          className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-headline font-bold mb-8 text-on-surface tracking-tight">
          {isEditing ? '编辑相册详情' : '新建胶卷相册'}
        </h2>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor={isEditing ? "edit-title" : "new-roll-title"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">胶卷集名称 *</label>
            <input 
              id={isEditing ? "edit-title" : "new-roll-title"}
              type="text" 
              autoFocus={!isEditing}
              required
              placeholder="例如：City Solitude / 2024 春节记事"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              onFocus={() => {
                setCameraSearch('');
                setLensSearch('');
              }}
              className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor={isEditing ? "edit-film-stock" : "new-roll-film-stock"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">胶卷型号</label>
                <button 
                  type="button"
                  onClick={() => setShowFilmStockManagement(true)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  管理型号
                </button>
              </div>
              <div className="relative">
                <input
                  id={isEditing ? "edit-film-stock" : "new-roll-film-stock"}
                  type="text"
                  placeholder="示例：Lucky C200"
                  value={formData.filmStock}
                  onChange={e => {
                    setFormData({...formData, filmStock: e.target.value});
                    setFilmStockSearch(e.target.value);
                  }}
                  onFocus={() => {
                    setCameraSearch('');
                    setLensSearch('');
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                />
                {filmStockSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-low border border-outline-variant/30 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    {isLoadingFilmStocks ? (
                      <div className="px-4 py-2 text-sm text-on-surface-variant">加载中...</div>
                    ) : (
                      <>
                        {filterFilmStocks(filmStocks, filmStockSearch)
                            .map(stock => (
                            <div
                              key={stock.id}
                              className="px-4 py-2 text-sm text-on-surface hover:bg-surface-variant cursor-pointer"
                              onClick={() => {
                                setFormData({...formData, filmStock: `${stock.brand} ${stock.model}`});
                                setFilmStockSearch('');
                              }}
                            >
                              {stock.brand} {stock.model}
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor={isEditing ? "edit-location" : "new-roll-location"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">拍摄地点</label>
              <input 
                id={isEditing ? "edit-location" : "new-roll-location"}
                type="text" 
                placeholder="示例：陕西省西安市"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                onFocus={() => {
                  setCameraSearch('');
                  setLensSearch('');
                }}
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor={isEditing ? "edit-camera" : "new-roll-camera"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">相机型号</label>
              <div className="relative">
                <input 
                  id={isEditing ? "edit-camera" : "new-roll-camera"}
                  type="text" 
                  placeholder="示例：Nikon F3"
                  value={formData.camera}
                  onChange={e => {
                    setFormData({...formData, camera: e.target.value});
                    setCameraSearch(e.target.value);
                  }}
                  onFocus={() => {
                    setCameraSearch(' ');
                    setLensSearch('');
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                />
                {cameraSearch !== '' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-low border border-outline-variant/30 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    {isLoadingGear ? (
                      <div className="px-4 py-2 text-sm text-on-surface-variant">加载中...</div>
                    ) : (
                      <>
                        {(() => {
                          let filteredGear = gearList
                            .filter(gear => {
                              // 只显示使用中和使用过的设备，排除想要的设备
                              return (gear.status === 'using' || gear.status === 'used') && 
                                     gear.cameraModel.toLowerCase().includes(cameraSearch.toLowerCase().trim());
                            })
                            .sort((a, b) => {
                              if (a.status === 'using' && b.status !== 'using') return -1;
                              if (a.status !== 'using' && b.status === 'using') return 1;
                              return 0;
                            });
                          
                          const displayGear = filteredGear.slice(0, 3);
                          const remainingCount = filteredGear.length - 3;
                          
                          return (
                            <>
                              {displayGear.map(gear => (
                                <div
                                  key={gear.id}
                                  className="px-4 py-2 text-sm text-on-surface hover:bg-surface-variant cursor-pointer"
                                  onClick={() => {
                                    setFormData({...formData, camera: gear.cameraModel});
                                    setCameraSearch('');
                                  }}
                                >
                                  {gear.cameraModel}
                                  {gear.status === 'using' && (
                                    <span className="ml-2 text-xs text-primary">使用中</span>
                                  )}
                                </div>
                              ))}
                              {remainingCount > 0 && (
                                <div className="px-4 py-2 text-sm text-on-surface-variant italic">
                                  还有 {remainingCount} 个设备...
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor={isEditing ? "edit-lens" : "new-roll-lens"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">镜头型号</label>
              <div className="relative">
                <input 
                  id={isEditing ? "edit-lens" : "new-roll-lens"}
                  type="text" 
                  placeholder="示例：NIKKOR 50mm f1.8D"
                  value={formData.lens}
                  onChange={e => {
                    setFormData({...formData, lens: e.target.value});
                    setLensSearch(e.target.value);
                  }}
                  onFocus={() => {
                    setLensSearch(' ');
                    setCameraSearch('');
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                />
                {lensSearch !== '' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-low border border-outline-variant/30 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    {isLoadingGear ? (
                      <div className="px-4 py-2 text-sm text-on-surface-variant">加载中...</div>
                    ) : (
                      <>
                        {(() => {
                          let filteredGear = gearList
                            .filter(gear => {
                              // 只显示使用中和使用过的设备，排除想要的设备
                              if (gear.status !== 'using' && gear.status !== 'used') {
                                return false;
                              }
                              // 如果选择了相机型号，只显示与该相机型号对应的镜头
                              if (formData.camera && gear.cameraModel !== formData.camera) {
                                return false;
                              }
                              // 过滤镜头型号
                              return gear.lensModel.toLowerCase().includes(lensSearch.toLowerCase().trim());
                            })
                            .sort((a, b) => {
                              if (a.status === 'using' && b.status !== 'using') return -1;
                              if (a.status !== 'using' && b.status === 'using') return 1;
                              return 0;
                            });
                          
                          const displayGear = filteredGear.slice(0, 3);
                          const remainingCount = filteredGear.length - 3;
                          
                          return (
                            <>
                              {displayGear.flatMap(gear => {
                                const lenses = gear.lensModel.split(',').map((lens: string) => lens.trim());
                                return lenses.map((lens: string, index: number) => (
                                  <div
                                    key={`${gear.id}-${index}`}
                                    className="px-4 py-2 text-sm text-on-surface hover:bg-surface-variant cursor-pointer"
                                    onClick={() => {
                                      setFormData({...formData, lens: lens});
                                      setLensSearch('');
                                    }}
                                  >
                                    {lens}
                                    {gear.status === 'using' && index === 0 && (
                                      <span className="ml-2 text-xs text-primary">使用中</span>
                                    )}
                                  </div>
                                ));
                              })}
                              {remainingCount > 0 && (
                                <div className="px-4 py-2 text-sm text-on-surface-variant italic">
                                  还有 {remainingCount} 个设备...
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor={isEditing ? "edit-start-date" : "new-roll-start-date"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">拍摄开始时间</label>
              <input 
                id={isEditing ? "edit-start-date" : "new-roll-start-date"}
                type="date" 
                value={formData.shotDate}
                max={formData.endDate || formData.shotDate}
                onChange={e => {
                  const newShotDate = e.target.value;
                  // 如果新的开始时间晚于结束时间，自动调整结束时间
                  if (formData.endDate && newShotDate > formData.endDate) {
                    setFormData({...formData, shotDate: newShotDate, endDate: newShotDate});
                  } else {
                    setFormData({...formData, shotDate: newShotDate});
                  }
                }}
                onFocus={() => {
                  setCameraSearch('');
                  setLensSearch('');
                }}
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={isEditing ? "edit-end-date" : "new-roll-end-date"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">拍摄结束时间</label>
              <input 
                id={isEditing ? "edit-end-date" : "new-roll-end-date"}
                type="date" 
                value={formData.endDate || formData.shotDate}
                min={formData.shotDate}
                onChange={e => {
                  const newEndDate = e.target.value;
                  // 如果新的结束时间早于开始时间，自动调整为开始时间
                  if (newEndDate < formData.shotDate) {
                    setFormData({...formData, endDate: formData.shotDate});
                  } else {
                    setFormData({...formData, endDate: newEndDate});
                  }
                }}
                onFocus={() => {
                  setCameraSearch('');
                  setLensSearch('');
                }}
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor={isEditing ? "edit-format" : "new-roll-format"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">画幅</label>
              <select 
                id={isEditing ? "edit-format" : "new-roll-format"}
                value={formData.format === '135' ? '135' : formData.format}
                onChange={e => setFormData({...formData, format: e.target.value})}
                onFocus={() => {
                  setCameraSearch('');
                  setLensSearch('');
                }}
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
              >
                <option value="135_half">半格（135）</option>
                <option value="135">35mm（135）</option>
                <option value="645">645（120）</option>
                <option value="120">6x6（120）</option>
                <option value="6x7">6x7（120）</option>
                <option value="6x9">6x9（120）</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor={isEditing ? "edit-film-type" : "new-roll-film-type"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">底片类型</label>
              <select 
                id={isEditing ? "edit-film-type" : "new-roll-film-type"}
                value={formData.filmType}
                onChange={e => setFormData({...formData, filmType: e.target.value})}
                onFocus={() => {
                  setCameraSearch('');
                  setLensSearch('');
                }}
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
              >
                <option value="COLOR_NEGATIVE">彩色负片</option>
                <option value="BW_NEGATIVE">黑白负片</option>
                <option value="COLOR_POSITIVE">彩色正片 (反转片)</option>
                <option value="BW_POSITIVE">黑白正片 (反转片)</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label htmlFor={isEditing ? "edit-tags" : "new-roll-tags"} className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1 flex items-center gap-2">
              <Tag size={14} />
              自定义标签
            </label>
            <div className="space-y-3">
              <input 
                id={isEditing ? "edit-tags" : "new-roll-tags"}
                type="text" 
                placeholder="键入标签后按空格或回车添加..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onFocus={() => {
                  setCameraSearch('');
                  setLensSearch('');
                }}
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/30"
              />
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-sm group/tag transition-all hover:bg-primary/20"
                    >
                      {tag}
                      <button 
                        type="button"
                        onClick={() => removeTag(idx)}
                        className="opacity-40 hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-6 py-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              取消
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary text-on-primary px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-primary-dim transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (isEditing ? '更新中...' : '创建中...') : (isEditing ? '提交更新' : '提交创建')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
