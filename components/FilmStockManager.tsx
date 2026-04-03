import React, { useState, useRef } from 'react';
import type { FilmStock } from '../src/api/film-stocks';
import { createFilmStock, updateFilmStock, deleteFilmStock } from '../src/api/film-stocks';
import { commonBrands, brandMap, getBrandDisplayName, filterFilmStocks } from '../src/constants/brands';
import { X, Plus, Film, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FilmStockManagerProps {
  filmStocks: FilmStock[];
  onClose: () => void;
  onUpdate?: () => void;
  filmStockSearch: string;
  setFilmStockSearch: React.Dispatch<React.SetStateAction<string>>;
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
}

export default function FilmStockManager({
  filmStocks,
  onClose,
  onUpdate,
  filmStockSearch,
  setFilmStockSearch,
  addFilmStockForm,
  setAddFilmStockForm
}: FilmStockManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editFilmStock, setEditFilmStock] = useState<FilmStock | null>(null);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandInputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleEditFilmStock = (stock: FilmStock) => {
    setEditFilmStock(stock);
    setAddFilmStockForm({
      brand: stock.brand,
      model: stock.model,
      iso: stock.iso,
      format: stock.format,
      filmType: stock.filmType,
      process: stock.process
    });
    setShowAddModal(true);
  };

  const handleDeleteFilmStock = async (id: string) => {
    if (window.confirm('确定要删除这个胶卷型号吗？')) {
      try {
        const result = await deleteFilmStock(id);
        if (result.success) {
          // 调用onUpdate函数通知父组件更新数据
          if (onUpdate) {
            onUpdate();
          }
          onClose();
          showToast('胶卷型号删除成功');
        } else {
          showToast('删除失败：' + (result.error || '未知错误'), 'error');
        }
      } catch (error: any) {
        console.error('删除胶卷型号失败:', error);
        showToast('删除失败：' + (error.message || '网络错误'), 'error');
      }
    }
  };

  const handleAddFilmStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!addFilmStockForm.brand.trim()) {
      showToast('请填写品牌', 'error');
      return;
    }
    if (!addFilmStockForm.model.trim()) {
      showToast('请填写型号', 'error');
      return;
    }
    if (!addFilmStockForm.iso || addFilmStockForm.iso <= 0) {
      showToast('请填写有效的感光度', 'error');
      return;
    }
    if (!addFilmStockForm.format) {
      showToast('请选择胶卷规格', 'error');
      return;
    }
    if (!addFilmStockForm.filmType) {
      showToast('请选择底片类型', 'error');
      return;
    }
    if (!addFilmStockForm.process.trim()) {
      showToast('请填写冲洗工艺', 'error');
      return;
    }
    
    try {
      if (editFilmStock) {
        // 编辑胶卷型号
        const result = await updateFilmStock(editFilmStock.id, addFilmStockForm);
        if (result.success && result.data) {
          setAddFilmStockForm({
              brand: '',
              model: '',
              iso: 0,
              format: '135',
              filmType: 'COLOR_NEGATIVE',
              process: 'C-41'
            });
          setEditFilmStock(null);
          setShowAddModal(false);
          // 调用onUpdate函数通知父组件更新数据
          if (onUpdate) {
            onUpdate();
          }
          onClose();
          showToast('胶卷型号更新成功');
        } else {
          showToast('更新失败：' + (result.error || '未知错误'), 'error');
        }
      } else {
          // 添加胶卷型号
          const result = await createFilmStock(addFilmStockForm);
          if (result.success && result.data) {
            setAddFilmStockForm({
                brand: '',
                model: '',
                iso: 0,
                format: '135',
                filmType: 'COLOR_NEGATIVE',
                process: 'C-41'
              });
            setShowAddModal(false);
            // 调用onUpdate函数通知父组件更新数据
            if (onUpdate) {
              onUpdate();
            }
            onClose();
            showToast('胶卷型号添加成功');
          } else {
            // 如果是 409 冲突，API 逻辑会抛出异常或返回 success: false
            showToast('添加失败：' + (result.error || '该胶卷型号可能已存在'), 'error');
          }
        }
    } catch (err: any) {
      console.error('Failed to add or update film stock:', err);
      showToast(err.message || '操作失败', 'error');
    }
  };

  // 由于我们没有show属性，我们假设组件总是显示

  return (
    <>
      {/* 胶卷型号管理模态框 */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <div className="bg-surface-container rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-surface-container border-b border-outline-variant/30 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-headline font-bold text-on-surface">管理胶卷型号</h2>
            <button 
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-label text-on-surface-variant uppercase tracking-widest">所有胶卷型号</h3>
              <button 
                onClick={() => {
                  setEditFilmStock(null);
                  setAddFilmStockForm({
                    brand: '',
                    model: '',
                    iso: 0,
                    format: '135',
                    filmType: 'COLOR_NEGATIVE',
                    process: 'C-41'
                  });
                  setShowAddModal(true);
                }}
                className="bg-primary text-on-primary px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-primary-dim transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                添加型号
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-outline-variant/30">
                    <th className="text-left py-3 px-4 text-xs font-label text-on-surface-variant uppercase tracking-widest">品牌</th>
                    <th className="text-left py-3 px-4 text-xs font-label text-on-surface-variant uppercase tracking-widest">型号</th>
                    <th className="text-left py-3 px-4 text-xs font-label text-on-surface-variant uppercase tracking-widest">感光度</th>
                    <th className="text-left py-3 px-4 text-xs font-label text-on-surface-variant uppercase tracking-widest">胶卷规格</th>
                    <th className="text-left py-3 px-4 text-xs font-label text-on-surface-variant uppercase tracking-widest">类型</th>
                    <th className="text-left py-3 px-4 text-xs font-label text-on-surface-variant uppercase tracking-widest">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filmStocks.map(stock => (
                    <tr key={stock.id} className="border-b border-outline-variant/10 hover:bg-surface-variant/50 transition-colors">
                      <td className="py-3 px-4 text-sm text-on-surface">{getBrandDisplayName(stock.brand)}</td>
                      <td className="py-3 px-4 text-sm text-on-surface">{stock.model}</td>
                      <td className="py-3 px-4 text-sm text-on-surface">{stock.iso}</td>
                      <td className="py-3 px-4 text-sm text-on-surface">{stock.format}</td>
                      <td className="py-3 px-4 text-sm text-on-surface">
                        {stock.filmType === 'COLOR_NEGATIVE' ? '彩色负片' : stock.filmType === 'BW_NEGATIVE' ? '黑白负片' : stock.filmType === 'COLOR_POSITIVE' ? '彩色正片' : stock.filmType === 'BW_POSITIVE' ? '黑白正片' : stock.filmType}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              handleEditFilmStock(stock);
                            }}
                            className="px-3 py-1 text-xs font-bold text-primary hover:bg-primary/10 transition-colors rounded"
                          >
                            编辑
                          </button>
                          <button 
                            onClick={() => handleDeleteFilmStock(stock.id)}
                            className="px-3 py-1 text-xs font-bold text-error hover:bg-error/10 transition-colors rounded"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filmStocks.length === 0 && (
              <div className="py-12 text-center text-on-surface-variant">
                <Film size={48} className="mb-4 opacity-30 mx-auto" />
                <p className="text-sm">暂无胶卷型号，点击上方按钮添加</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 添加/编辑胶卷型号模态框 */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div 
            className="bg-surface-container max-w-lg w-full p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-headline font-bold mb-8 text-on-surface tracking-tight">{editFilmStock ? '编辑胶卷型号' : '添加胶卷型号'}</h2>
            
            <form onSubmit={handleAddFilmStock} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="add-brand" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">品牌</label>
                  <div className="relative">
                    <input
                      ref={brandInputRef}
                      id="add-brand"
                      type="text"
                      placeholder="输入品牌名称..."
                      required
                      value={addFilmStockForm.brand}
                      onChange={(e) => {
                        setAddFilmStockForm({
                          ...addFilmStockForm,
                          brand: e.target.value
                        });
                        setBrandSearch(e.target.value);
                      }}
                      onFocus={() => setShowBrandDropdown(true)}
                      onBlur={(e) => {
                        // 检查点击的目标是否在下拉框内
                        setTimeout(() => {
                          const activeElement = document.activeElement;
                          const dropdownElement = dropdownRef.current;
                          if (dropdownElement && !dropdownElement.contains(activeElement)) {
                            setShowBrandDropdown(false);
                          }
                        }, 150);
                      }}
                      className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                    />
                    {showBrandDropdown && (
                      <div 
                        ref={dropdownRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-surface-container-low border border-outline-variant/30 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()} // 防止点击下拉框时触发input的blur
                      >
                        {(() => {
                          // 从commonBrands和filmStocks中获取所有品牌
                          const searchTerm = brandSearch.toLowerCase().trim();
                          
                          // 获取commonBrands中的品牌
                          const commonBrandNames = commonBrands.map(b => b.name);
                          
                          // 获取filmStocks中的品牌
                          const filmStockBrands = filmStocks.map(stock => stock.brand);
                          
                          // 合并所有品牌并去重
                          const allBrands = Array.from(new Set([...commonBrandNames, ...filmStockBrands]));
                          
                          // 过滤品牌（支持中英文搜索）
                          const filteredBrands = allBrands.filter(brand => {
                            if (!searchTerm) return true;
                            // 匹配英文品牌名
                            if (brand.toLowerCase().includes(searchTerm)) return true;
                            // 匹配中文品牌名
                            const commonBrand = commonBrands.find(b => b.name === brand);
                            if (commonBrand && commonBrand.displayName.toLowerCase().includes(searchTerm)) return true;
                            return false;
                          });
                          
                          // 排序：优先显示commonBrands中的品牌
                          const sortedBrands = filteredBrands.sort((a, b) => {
                            const aIndex = commonBrands.findIndex(cb => cb.name === a);
                            const bIndex = commonBrands.findIndex(cb => cb.name === b);
                            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                            if (aIndex !== -1) return -1;
                            if (bIndex !== -1) return 1;
                            return a.localeCompare(b);
                          });
                          
                          // 限制显示数量为3个
                          const displayBrands = sortedBrands.slice(0, 3);
                          const remainingCount = sortedBrands.length - 3;
                          
                          if (displayBrands.length === 0) {
                            return (
                              <div className="px-4 py-2 text-sm text-on-surface-variant italic">
                                未找到匹配的品牌
                              </div>
                            );
                          }
                          
                          return (
                            <>
                              {displayBrands.map(brand => {
                                const commonBrand = commonBrands.find(b => b.name === brand);
                                return (
                                  <div
                                    key={brand}
                                    className="px-4 py-2 text-sm text-on-surface hover:bg-surface-variant cursor-pointer flex items-center gap-2"
                                    onClick={() => {
                                      setAddFilmStockForm({
                                        ...addFilmStockForm,
                                        brand: brand
                                      });
                                      setBrandSearch('');
                                      setShowBrandDropdown(false);
                                    }}
                                  >
                                    {commonBrand && (
                                      <img 
                                        src={commonBrand.logoUrl} 
                                        alt={commonBrand.displayName}
                                        className="w-5 h-5 object-contain rounded"
                                      />
                                    )}
                                    <span>{commonBrand ? `${commonBrand.displayName} (${brand})` : brand}</span>
                                  </div>
                                );
                              })}
                              {remainingCount > 0 && (
                                <div className="px-4 py-2 text-sm text-on-surface-variant italic border-t border-outline-variant/20">
                                  还有 {remainingCount} 个品牌...
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="add-model" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">型号</label>
                  <div className="relative">
                    <input 
                      id="add-model"
                      type="text" 
                      placeholder="输入型号..."
                      required
                      value={addFilmStockForm.model}
                      onChange={e => {
                        setAddFilmStockForm({...addFilmStockForm, model: e.target.value});
                        setModelSearch(e.target.value);
                      }}
                      onFocus={() => setModelSearch(' ')}
                      onBlur={() => {
                        setTimeout(() => setModelSearch(''), 200);
                      }}
                      className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                    />
                    {modelSearch !== '' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-low border border-outline-variant/30 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                        {(() => {
                          // 过滤型号，优先显示与当前品牌匹配的型号
                          let filteredModels = filmStocks
                            .filter(stock => {
                              const matchesBrand = !addFilmStockForm.brand || stock.brand === addFilmStockForm.brand;
                              const matchesSearch = stock.model.toLowerCase().includes(modelSearch.toLowerCase().trim());
                              return matchesBrand && matchesSearch;
                            })
                            .map(stock => stock.model)
                            .filter((value, index, self) => self.indexOf(value) === index) // 去重
                            .sort();
                          
                          // 如果没有与当前品牌匹配的型号，显示所有匹配搜索词的型号
                          if (filteredModels.length === 0 && addFilmStockForm.brand) {
                            filteredModels = filmStocks
                              .filter(stock => stock.model.toLowerCase().includes(modelSearch.toLowerCase().trim()))
                              .map(stock => stock.model)
                              .filter((value, index, self) => self.indexOf(value) === index)
                              .sort();
                          }
                          
                          // 限制显示数量
                          const displayModels = filteredModels.slice(0, 5);
                          const remainingCount = filteredModels.length - 5;
                          
                          return (
                            <>
                              {displayModels.map(model => (
                                <div
                                  key={model}
                                  className="px-4 py-2 text-sm text-on-surface hover:bg-surface-variant cursor-pointer"
                                  onClick={() => {
                                    setAddFilmStockForm({...addFilmStockForm, model: model});
                                    setModelSearch('');
                                  }}
                                >
                                  {model}
                                </div>
                              ))}
                              {remainingCount > 0 && (
                                <div className="px-4 py-2 text-sm text-on-surface-variant italic">
                                  还有 {remainingCount} 个型号...
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="add-iso" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">感光度 (ISO)</label>
                  <input 
                    id="add-iso"
                    type="number" 
                    required
                    min="1" 
                    placeholder="请输入感光度"
                    value={addFilmStockForm.iso || ''}
                    onChange={e => setAddFilmStockForm({...addFilmStockForm, iso: parseInt(e.target.value) || 0})}
                    className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="add-format" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">胶卷规格</label>
                  <select 
                    id="add-format"
                    required
                    value={addFilmStockForm.format}
                    onChange={e => setAddFilmStockForm({...addFilmStockForm, format: e.target.value})}
                    className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                  >
                    <option value="135">全画幅（135）</option>
                    <option value="120">中画幅（120）</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="add-film-type" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">底片类型</label>
                  <select 
                    id="add-film-type"
                    required
                    value={addFilmStockForm.filmType}
                    onChange={e => setAddFilmStockForm({...addFilmStockForm, filmType: e.target.value})}
                    className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                  >
                    <option value="COLOR_NEGATIVE">彩色负片</option>
                    <option value="BW_NEGATIVE">黑白负片</option>
                    <option value="COLOR_POSITIVE">彩色正片 (反转片)</option>
                    <option value="BW_POSITIVE">黑白正片 (反转片)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="add-process" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">冲洗工艺</label>
                  <select 
                    id="add-process"
                    required
                    value={addFilmStockForm.process}
                    onChange={e => setAddFilmStockForm({...addFilmStockForm, process: e.target.value})}
                    className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors"
                  >
                    <option value="C-41">C-41</option>
                    <option value="D-76 (负片)">D-76 (负片)</option>
                    <option value="D-67 (反转)">D-67 (反转)</option>
                    <option value="E-6">E-6</option>
                    <option value="ECN-2">ECN-2</option>
                  </select>
                </div>
              </div>
              {/* 品牌LOGO会自动填充，不需要手动上传 */}

              <div className="pt-4 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="bg-primary text-on-primary px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-primary-dim transition-colors flex items-center gap-2"
                >
                  {editFilmStock ? '更新型号' : '添加型号'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 rounded shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'error' ? 'bg-error/90 text-on-error' : 'bg-surface-container-highest/90 text-on-surface border border-outline-variant/30'
        }`}>
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <div className="text-sm font-label whitespace-pre-wrap">{toast.message}</div>
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
