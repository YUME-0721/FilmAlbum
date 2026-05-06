import type { Env } from '../types';

export type UploadType = 'avatar' | 'roll' | 'preview' | 'gear' | 'film_stock';

interface UploadOptions {
  file: File;
  type: UploadType;
  userId?: string;
  rollId?: string;
  isPreview?: boolean;
}

/**
 * 统一图床上传助手
 * 根据策略管理配置，自动决定路径、渠道和压缩逻辑
 */
export async function uploadToImgBed(c: any, options: UploadOptions) {
  const { file, type, userId, rollId, isPreview = false } = options;
  const env = c.env as Env;
  const db = env.DB;

  // 1. 获取所有相关的配置项
  const strategyKeys = [
    'img_bed_url', 'img_bed_token', 'img_bed_path', 'img_bed_channel', 'img_bed_name_type',
    `${type}_path`, `${type}_compress`, `${type}_channel`
  ];
  
  const settings = await db.prepare(
    `SELECT key, value FROM system_settings WHERE key IN (${strategyKeys.map(() => '?').join(',')})`
  ).bind(...strategyKeys).all<{ key: string; value: string }>();
  
  const config = settings.results.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);

  const imgBedUrl      = config['img_bed_url']      || env.IMG_BED_URL;
  const imgBedToken    = config['img_bed_token']    || env.IMG_BED_TOKEN;
  const globalPath     = config['img_bed_path']     || '/FilmAlbum/';
  const globalChannel  = config['img_bed_channel']  || 'huggingface';
  const globalNameType = config['img_bed_name_type'] || 'index';

  if (!imgBedUrl || !imgBedToken) {
    throw new Error('图床配置不完整，请联系管理员');
  }

  // 2. 确定具体策略
  const specificPath     = config[`${type}_path`];
  const specificCompress = config[`${type}_compress`]; // "true" or "false"
  const specificChannel  = config[`${type}_channel`];

  const channel  = specificChannel || globalChannel;
  const compress = specificCompress !== undefined ? specificCompress : 'true'; // 默认开启压缩

  // 3. 处理路径模板
  let pathTemplate = specificPath || '';
  if (!pathTemplate) {
    // 降级逻辑（兼容旧版默认行为）
    if (type === 'film_stock') pathTemplate = 'Films/';
    else if (rollId) pathTemplate = '{userId}/{rollId}/';
    else pathTemplate = '{userId}/';
  }

  const displayUserId = userId?.toString().padStart(4, '0') || '0000';
  let finalPath = pathTemplate
    .replace('{userId}', displayUserId)
    .replace('{rollId}', rollId || 'default');

  // 确保 basePath 前缀
  const basePath = globalPath.endsWith('/') ? globalPath : `${globalPath}/`;
  finalPath = `${basePath}${finalPath}`;
  if (!finalPath.endsWith('/')) finalPath += '/';

  // 4. 执行上传
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);

  const urlParams = new URLSearchParams({
    uploadChannel: channel,
    uploadNameType: globalNameType,
    serverCompress: compress,
    serverWebp: 'true',
    uploadFolder: finalPath
  });

  const base = imgBedUrl.replace(/\/$/, '');
  const targetUrl = `${base}/upload?${urlParams.toString()}`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${imgBedToken}`
    },
    body: uploadFormData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`图床上传失败: ${errorText}`);
  }

  const result = await response.json() as Array<{ src: string }>;
  if (!result?.[0]?.src) {
    throw new Error('图床返回数据格式异常');
  }

  return `${base}${result[0].src}`;
}
