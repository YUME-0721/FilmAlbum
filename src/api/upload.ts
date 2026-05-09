/**
 * 图片上传 API
 */
import { uploadFile, get, post, put, del } from './client.ts';

export interface UploadResult {
  url: string;
  previewUrl: string | null;
  path?: string;
}

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function computeFileSample(file: File): Promise<string> {
  const slice = file.slice(0, 512);
  const buffer = await slice.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
  const { smartCompress } = await import('../utils/image-compress.ts');

  // 获取上传策略 (使用简单缓存避免重复请求)
  const qType = type === 'filmStock' ? 'filmStock' : (rollId ? 'roll' : '');
  const cacheKey = `strategy_${qType}_${rollId || 'default'}`;
  let strategy;
  
  const cached = (window as any)[cacheKey];
  if (cached && Date.now() - cached.time < 300000) { // 5分钟缓存
    strategy = cached.data;
  } else {
    const strategyRes = await get<any>(`/upload/strategy?type=${qType}${rollId ? `&rollId=${rollId}` : ''}`);
    if (!strategyRes.success) throw new Error('获取上传策略失败');
    strategy = strategyRes.data;
    (window as any)[cacheKey] = { data: strategy, time: Date.now() };
  }

  // 预处理主图和预览图
  let mainFile = file;
  let compressedPreview: File | null = null;

  if (type === 'filmStock') {
    // 胶卷型号照片：直接上传原图
  } else if (rollId) {
    // 相册照片：直接上传原图，大文件会走对应的图床策略
    mainFile = file;
    if (generatePreview && !previewFile) {
      compressedPreview = await smartCompress(file);
    } else if (previewFile) {
      compressedPreview = previewFile;
    }
  } else {
    mainFile = await smartCompress(file);
  }

  // 判断是否为大文件
  const sizeMB = mainFile.size / (1024 * 1024);
  let mainUrl = '';

  if (sizeMB >= 10 && strategy.channel === 'huggingface') {
    // HF 大文件直传 (建议 > 20MB, 这里阈值设为10MB保守起见)
    const initParams = new URLSearchParams();
    if (qType) initParams.append('type', qType);
    if (rollId) initParams.append('rollId', rollId);
    
    const initRes = await post<any>(`/upload/hf/init?${initParams.toString()}`, {
      fileName: mainFile.name,
      fileType: mainFile.type,
      fileSize: mainFile.size,
      sha256: await computeSha256(mainFile),
      fileSample: await computeFileSample(mainFile)
    });

    if (!initRes.success || !initRes.data) {
      throw new Error(initRes.error || 'HF初始化失败');
    }
    const hfData = initRes.data;
    
    if (!hfData.alreadyExists) {
      if (hfData.uploadAction?.header?.chunk_size) {
        // HF 分片上传
        const chunkSize = Number(hfData.uploadAction.header.chunk_size);
        const parts = [];
        let partNumber = 1;
        for (let start = 0; start < mainFile.size; start += chunkSize) {
          const chunk = mainFile.slice(start, start + chunkSize);
          const chunkKey = String(partNumber).padStart(5, '0');
          const uploadUrl = hfData.uploadAction.header[chunkKey];
          
          const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: chunk });
          if (!uploadRes.ok) throw new Error(`HF分片 ${partNumber} 上传失败`);
          
          parts.push({ partNumber, etag: uploadRes.headers.get('ETag') || '' });
          partNumber++;
        }
        
        // HF 合并
        const mergeRes = await fetch(hfData.uploadAction.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.git-lfs+json' },
          body: JSON.stringify({ oid: hfData.oid, parts })
        });
        if (!mergeRes.ok) throw new Error('HF分片合并失败');
      } else {
        // HF 单文件直传
        const putRes = await fetch(hfData.uploadAction.href, {
          method: 'PUT',
          headers: hfData.uploadAction.header,
          body: mainFile
        });
        if (!putRes.ok) throw new Error('HF直传失败');
      }
    }

    // HF 提交
    const commitParams = new URLSearchParams();
    if (qType) commitParams.append('type', qType);
    if (rollId) commitParams.append('rollId', rollId);
    
    const commitRes = await post<any>(`/upload/hf/commit?${commitParams.toString()}`, {
      fullId: hfData.fullId,
      filePath: hfData.filePath,
      sha256: hfData.sha256 || hfData.oid,
      fileSize: hfData.fileSize || mainFile.size,
      fileName: mainFile.name,
      fileType: mainFile.type
    });

    if (!commitRes.success || !commitRes.data?.src) throw new Error('HF提交失败');
    mainUrl = commitRes.data.src;
  } 
  else if (sizeMB >= 8 && ['telegram', 'cfr2', 's3', 'discord'].includes(strategy.channel)) {
    // 通用分块上传 (Telegram/R2/S3/Discord)
    const chunkSize = 8 * 1024 * 1024; // 8MB
    const totalChunks = Math.ceil(mainFile.size / chunkSize);
    
    // Chunk 初始化
    const chunkInitParams = new URLSearchParams();
    if (qType) chunkInitParams.append('type', qType);
    if (rollId) chunkInitParams.append('rollId', rollId);
    
    const initRes = await post<any>(`/upload/chunk/init?${chunkInitParams.toString()}`, {
      originalFileName: mainFile.name,
      originalFileType: mainFile.type,
      totalChunks
    });
    
    if (!initRes.success || !initRes.data?.uploadId) throw new Error('分块初始化失败');
    const uploadId = initRes.data.uploadId;

    // 逐块上传
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const chunk = mainFile.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize);
      const chunkFormData = new FormData();
      chunkFormData.append('file', chunk);
      chunkFormData.append('uploadId', uploadId);
      chunkFormData.append('chunkIndex', chunkIndex.toString());
      chunkFormData.append('totalChunks', totalChunks.toString());
      chunkFormData.append('originalFileName', mainFile.name);
      chunkFormData.append('originalFileType', mainFile.type);

      const params = new URLSearchParams();
      if (qType) params.append('type', qType);
      if (rollId) params.append('rollId', rollId);
      
      const uploadRes = await uploadFile<any>(`/upload/chunk/upload?${params.toString()}`, chunkFormData);
      if (!uploadRes.success) throw new Error(`分块 ${chunkIndex} 上传失败`);
    }

    // 合并
    const mergeParams = new URLSearchParams();
    if (qType) mergeParams.append('type', qType);
    if (rollId) mergeParams.append('rollId', rollId);
    
    const mergeRes = await post<any>(`/upload/chunk/merge?${mergeParams.toString()}`, {
      uploadId,
      totalChunks,
      originalFileName: mainFile.name,
      originalFileType: mainFile.type
    });
    
    if (!mergeRes.success || !mergeRes.data?.url) throw new Error('分块合并失败');
    mainUrl = mergeRes.data.url;
  } 
  else {
    // 普通上传
    const formData = new FormData();
    formData.append('file', mainFile);
    formData.append('generatePreview', 'false'); // 我们自己单独传预览图
    
    const params = new URLSearchParams();
    if (rollId) params.append('rollId', rollId);
    if (type) params.append('type', type);
    
    const result = await uploadFile<any>(`/upload?${params.toString()}`, formData);
    if (!result.success || !result.data?.url) throw new Error('普通上传失败');
    mainUrl = result.data.url;
  }

  // 单独上传预览图（如果需要）
  let previewUrl = null;
  if (compressedPreview) {
    const previewFormData = new FormData();
    previewFormData.append('file', compressedPreview);
    previewFormData.append('generatePreview', 'false');
    
    const pParams = new URLSearchParams();
    if (rollId) pParams.append('rollId', rollId);
    pParams.append('type', 'preview'); // 单独指定为预览类型，后端策略不会走主图的channel
    
    // 如果后端的 preview 策略是独立的，我们需要它上传成功并返回 url
    const pResult = await uploadFile<any>(`/upload?${pParams.toString()}`, previewFormData);
    if (pResult.success && pResult.data?.url) {
      previewUrl = pResult.data.url;
    }
  }

  return {
    url: mainUrl,
    previewUrl: previewUrl,
    path: mainUrl // 可以根据需要修改
  };
}

/** 从图床删除图片 */
export function deleteImage(path: string) {
  return del('/upload', { path });
}
