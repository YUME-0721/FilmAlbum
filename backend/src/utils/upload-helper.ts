import type { Env } from '../types';

export type UploadType = 'avatar' | 'roll' | 'preview' | 'gear' | 'film_stock' | 'post';

interface UploadOptions {
  file: File;
  type: UploadType;
  userId?: string;
  rollId?: string;
  isPreview?: boolean;
}

/**
 * 提取图床策略配置逻辑
 */
export async function getUploadStrategy(c: any, options: Omit<UploadOptions, 'file'>) {
  const { type, userId, rollId, isPreview = false } = options;
  const env = c.env as Env;
  const db = env.DB;

  const strategyKeys = [
    'storage_type', 'img_bed_url', 'img_bed_token', 'img_bed_path', 'img_bed_channel', 'img_bed_name_type',
    'webdav_url', 'webdav_username', 'webdav_password', 'webdav_path',
    `${type}_path`, `${type}_compress`, `${type}_channel`
  ];
  
  const settings = await db.prepare(
    `SELECT key, value FROM system_settings WHERE key IN (${strategyKeys.map(() => '?').join(',')})`
  ).bind(...strategyKeys).all<{ key: string; value: string }>();
  
  const config = settings.results.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);

  const storageType    = config['storage_type']     || 'img_bed';

  const webdavUrl      = config['webdav_url']       || '';
  const webdavUsername = config['webdav_username']  || '';
  const webdavPassword = config['webdav_password']  || '';
  const webdavPath     = config['webdav_path']      || '/FilmAlbum/';

  const imgBedUrl      = config['img_bed_url']      || env.IMG_BED_URL;
  const imgBedToken    = config['img_bed_token']    || env.IMG_BED_TOKEN;
  
  const globalPath     = storageType === 'webdav' ? webdavPath : (config['img_bed_path'] || '/FilmAlbum/');
  const globalChannel  = config['img_bed_channel']  || 'telegram';
  const globalNameType = config['img_bed_name_type'] || 'index';

  if (storageType === 'img_bed' && (!imgBedUrl || !imgBedToken)) {
    throw new Error('图床配置不完整，请联系管理员');
  }
  if (storageType === 'webdav' && (!webdavUrl || !webdavUsername || !webdavPassword)) {
    throw new Error('WebDAV配置不完整，请联系管理员');
  }

  const specificPath     = config[`${type}_path`];
  const specificCompress = config[`${type}_compress`];
  const specificChannel  = config[`${type}_channel`];

  const channel  = specificChannel || globalChannel;
  const compress = specificCompress !== undefined ? specificCompress : 'true';

  let pathTemplate = specificPath || '';
  if (!pathTemplate) {
    if (type === 'film_stock') pathTemplate = 'Films/';
    else if (type === 'post') pathTemplate = '{userId}/Posts/';
    else if (rollId) {
      // 影集相关的图片统一存放在 photos 目录下
      if (type === 'preview') {
        pathTemplate = '{userId}/photos/{rollId}/preview/';
      } else {
        pathTemplate = '{userId}/photos/{rollId}/';
      }
    }
    else pathTemplate = '{userId}/';
  }

  const displayUserId = userId?.toString().padStart(4, '0') || '0000';
  let finalPath = pathTemplate
    .replace('{userId}', displayUserId)
    .replace('{rollId}', rollId || 'default');

  const basePath = globalPath.endsWith('/') ? globalPath : `${globalPath}/`;
  finalPath = `${basePath}${finalPath}`;
  if (!finalPath.endsWith('/')) finalPath += '/';

  return {
    storageType,
    imgBedUrl,
    imgBedToken,
    webdavUrl,
    webdavUsername,
    webdavPassword,
    channel,
    compress,
    globalNameType,
    finalPath
  };
}

/**
 * 统一图床上传助手
 * 根据策略管理配置，自动决定路径、渠道和压缩逻辑
 */
export async function uploadToImgBed(c: any, options: UploadOptions) {
  const { file, type, userId, rollId, isPreview = false } = options;
  const { imgBedUrl, imgBedToken, channel, compress, globalNameType, finalPath } = await getUploadStrategy(c, { type, userId, rollId, isPreview });

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

export const cleanUrl = (url: string) => {
  const p = url.split('://');
  return p.length === 2 ? `${p[0]}://${p[1].replace(/\/+/g, '/')}` : url.replace(/\/+/g, '/');
};

async function ensureWebdavDir(baseUrl: string, path: string, headers: any) {
  const parts = path.split('/').filter(p => p);
  let currentPath = '';
  for (const part of parts) {
    currentPath += `/${part}`;
    // 使用 MKCOL 创建目录，忽略可能因目录已存在导致的错误
    const target = cleanUrl(`${baseUrl}/${currentPath}/`);
    await fetch(target, { method: 'MKCOL', headers });
  }
}

export async function uploadToWebDAV(c: any, options: UploadOptions) {
  const { file, type, userId, rollId, isPreview = false } = options;
  const { webdavUrl, webdavUsername, webdavPassword, finalPath } = await getUploadStrategy(c, { type, userId, rollId, isPreview });

  const ext = file.name ? file.name.split('.').pop() : 'jpg';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}_${randomStr}.${ext}`;

  const targetUrl = cleanUrl(`${webdavUrl}/${finalPath}/${fileName}`);

  // NOTE: 使用 ArrayBuffer 并显式指定 Content-Length，防止某些 WebDAV 服务器（如 Cloudflare Imaged）
  // 无法处理 Transfer-Encoding: chunked 导致返回 502 错误。
  const buffer = await file.arrayBuffer();
  
  // 处理可能包含非 ASCII 字符的 Basic Auth
  const encodeBase64 = (str: string) => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      return btoa(str);
    }
  };

  const headers: any = {
    'Authorization': `Basic ${encodeBase64(webdavUsername + ':' + webdavPassword)}`,
    'Content-Type': file.type || 'application/octet-stream',
    'Content-Length': buffer.byteLength.toString()
  };

  let response = await fetch(targetUrl, {
    method: 'PUT',
    headers,
    body: buffer
  });

  if (response.status === 409) {
    // 409 Conflict 通常意味着父目录不存在，尝试递归创建目录后重试
    await ensureWebdavDir(webdavUrl, finalPath, { 'Authorization': headers['Authorization'] });
    response = await fetch(targetUrl, {
      method: 'PUT',
      headers,
      body: buffer
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WebDAV上传失败 (${response.status}): ${errorText}`);
  }

  // 返回完整的 WebDAV 代理服务 URL，解决跨域、鉴权和 Mixed Content 问题
  const origin = new URL(c.req.url).origin;
  const proxyUrl = cleanUrl(`${origin}/api/upload/webdav/${finalPath}/${fileName}`);
  return proxyUrl;
}
