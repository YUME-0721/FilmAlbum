import React, { useState } from 'react';
import { uploadImage, deleteImage } from '../src/api/upload';
import { put } from '../src/api/client';
import { X, User, Pencil } from 'lucide-react';

interface ProfileEditFormProps {
  profile: {
    id: string;
    nickname: string;
    avatarUrl: string;
    bio: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function ProfileEditForm({ profile, onSubmit, onCancel }: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    nickname: profile.nickname,
    bio: profile.bio
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证昵称：不允许表情等特殊字符
  const validateNickname = (nickname: string): boolean => {
    // 只允许中文、英文、数字、下划线和中文字符
    const regex = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
    return regex.test(nickname);
  };

  // 验证个性签名：最多30字，不允许表情等特殊字符
  const validateBio = (bio: string): boolean => {
    if (bio.length > 30) return false;
    // 只允许中文、英文、数字、标点符号
    const regex = /^[\u4e00-\u9fa5a-zA-Z0-9\s.,!?'"()\-]+$/;
    return regex.test(bio);
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nickname.trim()) {
      newErrors.nickname = '昵称不能为空';
    } else if (!validateNickname(formData.nickname)) {
      newErrors.nickname = '昵称只能包含中文、英文、数字和下划线';
    }

    if (formData.bio && !validateBio(formData.bio)) {
      newErrors.bio = '个性签名最多30字，只能包含中文、英文、数字和标点符号';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      let avatarUrl = profile.avatarUrl;
      
      // 上传头像
      if (avatarFile) {
        // 删除旧头像
        if (profile.avatarUrl) {
          try {
            // 从 URL 中提取路径
            const url = new URL(profile.avatarUrl);
            let path = url.pathname;
            // 处理路径，与设备照片删除逻辑保持一致
            if (path.startsWith('/file/')) {
              path = path.slice(6);
            } else if (path.startsWith('/')) {
              path = path.slice(1);
            }
            await deleteImage(path);
          } catch (error) {
            console.error('删除旧头像失败:', error);
          }
        }
        // 上传新头像
        const uploadResult = await uploadImage(avatarFile);
        avatarUrl = uploadResult.url;
      }
      
      // 构建更新数据
      const updateData: any = {
        nickname: formData.nickname,
        bio: formData.bio,
        avatarUrl
      };
      
      // 调用API更新资料
      const result = await put(`/users/${profile.id}`, updateData);
      
      if (result.success) {
        onSubmit({
          ...profile,
          nickname: formData.nickname,
          bio: formData.bio,
          avatarUrl
        });
      } else {
        setErrors({ submit: result.error || '更新失败' });
      }
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : '网络错误' });
    } finally {
      setIsSubmitting(false);
    }
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
        <h2 className="text-2xl font-headline font-bold mb-8 text-on-surface tracking-tight">编辑资料</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 头像上传 */}
          <div className="flex items-center gap-6">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center">
                {avatarFile ? (
                  <img 
                    src={URL.createObjectURL(avatarFile)} 
                    alt="预览" 
                    className="w-full h-full object-cover"
                  />
                ) : profile.avatarUrl ? (
                  <img 
                    src={profile.avatarUrl} 
                    alt={profile.nickname} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User size={48} className="text-on-surface-variant/30" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-primary text-on-primary p-1 rounded-full w-8 h-8 flex items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <label 
                  htmlFor="avatar-upload"
                  className="cursor-pointer flex items-center justify-center w-full h-full"
                >
                  <Pencil size={14} />
                </label>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-on-surface-variant">点击头像上传新头像</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">支持 JPG、PNG 格式，建议尺寸 200x200</p>
            </div>
          </div>

          {/* 昵称 */}
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">昵称</label>
            <input 
              id="nickname"
              type="text"
              required
              value={formData.nickname}
              onChange={e => setFormData({...formData, nickname: e.target.value})}
              className={`w-full bg-surface-container-low border ${errors.nickname ? 'border-error' : 'border-outline-variant/30'} focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors`}
            />
            {errors.nickname && (
              <p className="text-xs text-error mt-1">{errors.nickname}</p>
            )}
          </div>

          {/* 个性签名 */}
          <div className="space-y-2">
            <label htmlFor="bio" className="text-xs font-label text-on-surface-variant uppercase tracking-widest pl-1">个性签名</label>
            <textarea 
              id="bio"
              rows={3}
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
              maxLength={30}
              className={`w-full bg-surface-container-low border ${errors.bio ? 'border-error' : 'border-outline-variant/30'} focus:border-primary px-4 py-3 text-sm text-on-surface outline-none transition-colors resize-none`}
              placeholder="介绍一下自己吧..."
            />
            <div className="flex justify-between items-center">
              {errors.bio && (
                <p className="text-xs text-error">{errors.bio}</p>
              )}
              <p className="text-xs text-on-surface-variant/60">{formData.bio.length}/30</p>
            </div>
          </div>



          {/* 错误提示 */}
          {errors.submit && (
            <div className="bg-error/10 border border-error/30 p-3 rounded-sm">
              <p className="text-sm text-error">{errors.submit}</p>
            </div>
          )}

          {/* 提交按钮 */}
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
              {isSubmitting ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
