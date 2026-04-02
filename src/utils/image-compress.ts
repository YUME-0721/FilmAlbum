/**
 * 图片压缩和格式转换工具
 * 使用 Canvas API 将图片压缩并转换为 WebP 格式
 */

export interface CompressOptions {
  maxWidth?: number;      // 最大宽度
  maxHeight?: number;     // 最大高度
  quality?: number;       // WebP 质量 (0-1)
  targetSize?: number;    // 目标文件大小 (bytes)
}

/**
 * 将图片压缩并转换为 WebP 格式
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的 WebP Blob
 */
export async function compressToWebP(
  file: File,
  options: CompressOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    targetSize
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 计算缩放后的尺寸
      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      
      if (ratio < 1) {
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // 创建 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为 WebP
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP 转换失败'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}

/**
 * 将 Blob 转换为 File
 * @param blob Blob 对象
 * @param filename 文件名
 * @returns File 对象
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/**
 * 获取图片尺寸信息
 * @param file 图片文件
 * @returns 图片尺寸
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}

/**
 * 智能压缩图片
 * 根据原图大小自动调整压缩参数
 * @param file 原始图片文件
 * @returns 压缩后的文件
 */
export async function smartCompress(file: File): Promise<File> {
  // 如果文件小于 500KB，不压缩
  if (file.size < 500 * 1024) {
    return file;
  }

  // 根据文件大小调整压缩参数
  let maxWidth = 1200;
  let quality = 0.8;

  if (file.size > 10 * 1024 * 1024) {
    // 大于 10MB
    maxWidth = 800;
    quality = 0.6;
  } else if (file.size > 5 * 1024 * 1024) {
    // 大于 5MB
    maxWidth = 1000;
    quality = 0.7;
  }

  try {
    const compressedBlob = await compressToWebP(file, {
      maxWidth,
      quality,
      maxHeight: maxWidth
    });

    // 生成压缩后的文件名
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const compressedFile = blobToFile(compressedBlob, `${originalName}_preview.webp`);

    console.log(`[图片压缩] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024).toFixed(2)}KB`);

    return compressedFile;
  } catch (error) {
    console.error('图片压缩失败:', error);
    // 压缩失败返回原文件
    return file;
  }
}
