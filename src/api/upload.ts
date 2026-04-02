/**
 * 图片上传 API
 */
import { uploadFile, del } from './client.ts';

export interface UploadResult {
  url: string;
  previewUrl: string | null;
  path: string;
}

/** 上传图片到图床
 * @param file 文件
 * @param rollId 胶卷ID（可选）
 * @param type 上传类型：'filmStock'表示胶卷型号照片，其他表示胶卷底片照片
 * @param generatePreview 是否生成预览图（默认 true）
 * @param previewFile 前端压缩后的预览图文件（可选）
 */
export async function uploadImage(
  file: File,
  rollId?: string,
  type?: 'filmStock' | 'frame',
  generatePreview: boolean = true,
  previewFile?: File
): Promise<UploadResult> {
  const formData = new FormData();
  
  // 导入图片压缩工具
  const { smartCompress } = await import('../utils/image-compress.ts');
  
  // 根据上传类型处理文件
  if (type === 'filmStock') {
    // 胶卷型号照片：直接上传原图
    formData.append('file', file);
  } else if (rollId) {
    // 相册照片：上传原图，生成 webp 预览图
    formData.append('file', file);
    
    // 生成预览图
    if (generatePreview && !previewFile) {
      const compressedPreview = await smartCompress(file);
      formData.append('previewFile', compressedPreview);
    } else if (previewFile) {
      formData.append('previewFile', previewFile);
    }
  } else {
    // 头像：上传压缩后的 webp 格式
    const compressedFile = await smartCompress(file);
    formData.append('file', compressedFile);
  }
  
  formData.append('generatePreview', generatePreview.toString());
  
  const params = new URLSearchParams();
  if (rollId) params.append('rollId', rollId);
  if (type) params.append('type', type);
  const endpoint = params.toString() ? `/upload?${params.toString()}` : '/upload';
  const result = await uploadFile<UploadResult>(endpoint, formData);
  if (!result.data) throw new Error('上传失败');
  return result.data;
}

/** 从图床删除图片 */
export function deleteImage(path: string) {
  return del('/upload', { path });
}
