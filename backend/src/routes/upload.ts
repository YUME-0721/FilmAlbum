import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired } from '../middleware/auth';
import { uploadToImgBed, uploadToWebDAV, getUploadStrategy, UploadType, cleanUrl } from '../utils/upload-helper';

const upload = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

/**
 * POST /api/upload - 上传图片到图床
 * 支持分类型策略控制
 */
upload.post('/', authRequired(), async (c) => {
  const formData = await c.req.formData();
  const file: any = formData.get('file');
  const previewFile: any = formData.get('previewFile');
  const generatePreview = formData.get('generatePreview') === 'true';

  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: '未选择文件' }, 400);
  }

  try {
    const rollId = c.req.query('rollId');
    const typeQuery = c.req.query('type');
    const userId = c.get('userId');
    
    // 1. 判定策略类型
    let strategyType: UploadType = 'avatar';
    if (typeQuery === 'filmStock') strategyType = 'film_stock';
    else if (typeQuery === 'gear') strategyType = 'gear';
    else if (typeQuery === 'preview') strategyType = 'preview';
    else if (typeQuery === 'post') strategyType = 'post';
    else if (typeQuery === 'frame' || rollId) strategyType = 'roll';

    // 2. 上传主图
    const strategy = await getUploadStrategy(c, { type: strategyType, userId, rollId });
    const isWebdav = strategy.storageType === 'webdav';

    let uploadUrl;
    if (isWebdav) {
      uploadUrl = await uploadToWebDAV(c, { file, type: strategyType, userId, rollId });
    } else {
      uploadUrl = await uploadToImgBed(c, { file, type: strategyType, userId, rollId });
    }

    // 3. 处理预览图（仅针对影集）
    let previewUrl = null;
    if (strategyType === 'roll') {
      if (previewFile && typeof previewFile !== 'string') {
        // 前端提供预览图
        previewUrl = isWebdav 
          ? await uploadToWebDAV(c, { file: previewFile, type: 'preview', userId, rollId })
          : await uploadToImgBed(c, { file: previewFile, type: 'preview', userId, rollId });
      } else if (generatePreview) {
        // 后端压缩原图作为预览
        previewUrl = isWebdav
          ? await uploadToWebDAV(c, { file, type: 'preview', userId, rollId })
          : await uploadToImgBed(c, { file, type: 'preview', userId, rollId });
      }
    }

    return c.json({
      success: true,
      data: {
        url: uploadUrl,
        previewUrl: previewUrl,
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message || '上传失败' }, 500);
  }
});

/**
 * GET /api/upload/strategy - 获取上传策略信息
 */
upload.get('/strategy', authRequired(), async (c) => {
  try {
    const typeQuery = c.req.query('type');
    const rollId = c.req.query('rollId');
    const userId = c.get('userId');
    
    let strategyType: UploadType = 'avatar';
    if (typeQuery === 'filmStock') strategyType = 'film_stock';
    else if (typeQuery === 'gear') strategyType = 'gear';
    else if (typeQuery === 'post') strategyType = 'post';
    else if (typeQuery === 'roll' || typeQuery === 'frame' || rollId) strategyType = 'roll';

    const strategy = await getUploadStrategy(c, { type: strategyType, userId, rollId });
    return c.json({ success: true, data: strategy });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/upload/hf/init - HuggingFace 直传初始化
 */
upload.post('/hf/init', authRequired(), async (c) => {
  try {
    const body = await c.req.json();
    const typeQuery = c.req.query('type');
    const rollId = c.req.query('rollId');
    const userId = c.get('userId');
    
    let strategyType: UploadType = 'avatar';
    if (typeQuery === 'filmStock') strategyType = 'film_stock';
    else if (typeQuery === 'gear') strategyType = 'gear';
    else if (typeQuery === 'post') strategyType = 'post';
    else if (typeQuery === 'frame' || rollId) strategyType = 'roll';

    const strategy = await getUploadStrategy(c, { type: strategyType, userId, rollId });
    const targetUrl = `${strategy.imgBedUrl.replace(/\/$/, '')}/upload/huggingface/getUploadUrl`;
    
    body.channelName = strategy.channel;
    body.uploadNameType = strategy.globalNameType;
    // 去掉前后斜杠，HuggingFace 接口通常不接受带斜杠的 folder
    body.uploadFolder = strategy.finalPath.replace(/^\/+|\/+$/g, '');

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${strategy.imgBedToken}`, 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const resData = await response.json() as any;
    if (!response.ok || resData.success === false) {
      return c.json({ 
        success: false, 
        error: resData.message || resData.error || '图床初始化接口返回失败' 
      }, (response.status === 200 ? 400 : response.status) as any);
    }
    return c.json({ success: true, data: resData });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/upload/hf/commit - HuggingFace 直传提交
 */
upload.post('/hf/commit', authRequired(), async (c) => {
  try {
    const body = await c.req.json();
    const typeQuery = c.req.query('type');
    const rollId = c.req.query('rollId');
    const userId = c.get('userId');
    
    let strategyType: UploadType = 'avatar';
    if (typeQuery === 'filmStock') strategyType = 'film_stock';
    else if (typeQuery === 'gear') strategyType = 'gear';
    else if (typeQuery === 'post') strategyType = 'post';
    else if (typeQuery === 'frame' || rollId) strategyType = 'roll';

    const strategy = await getUploadStrategy(c, { type: strategyType, userId, rollId });
    const targetUrl = `${strategy.imgBedUrl.replace(/\/$/, '')}/upload/huggingface/commitUpload`;
    
    body.channelName = strategy.channel;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${strategy.imgBedToken}`, 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const resData = await response.json() as any;
    if (!response.ok || resData.success === false) {
      return c.json({ 
        success: false, 
        error: resData.message || resData.error || '图床提交接口返回失败' 
      }, (response.status === 200 ? 400 : response.status) as any);
    }

    if (resData.success && resData.src) {
        resData.src = `${strategy.imgBedUrl.replace(/\/$/, '')}${resData.src}`;
    }
    return c.json({ success: true, data: resData });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/upload/chunk/init - 分片上传初始化
 */
upload.post('/chunk/init', authRequired(), async (c) => {
  try {
    const body = await c.req.json();
    const typeQuery = c.req.query('type');
    const rollId = c.req.query('rollId');
    const userId = c.get('userId');
    
    let strategyType: UploadType = 'avatar';
    if (typeQuery === 'filmStock') strategyType = 'film_stock';
    else if (typeQuery === 'gear') strategyType = 'gear';
    else if (typeQuery === 'post') strategyType = 'post';
    else if (typeQuery === 'frame' || rollId) strategyType = 'roll';

    const strategy = await getUploadStrategy(c, { type: strategyType, userId, rollId });
    
    const urlParams = new URLSearchParams({
      initChunked: 'true',
      uploadChannel: strategy.channel,
      serverCompress: strategy.compress,
      uploadNameType: strategy.globalNameType,
      uploadFolder: strategy.finalPath
    });
    const targetUrl = `${strategy.imgBedUrl.replace(/\/$/, '')}/upload?${urlParams.toString()}`;
    
    const formData = new FormData();
    formData.append('originalFileName', body.originalFileName);
    formData.append('originalFileType', body.originalFileType);
    formData.append('totalChunks', body.totalChunks.toString());

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${strategy.imgBedToken}` },
      body: formData
    });

    if (!response.ok) throw new Error(await response.text());
    const resData = await response.json();
    return c.json({ success: true, data: resData });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/upload/chunk/upload - 逐块上传
 */
upload.post('/chunk/upload', authRequired(), async (c) => {
  try {
    const formData = await c.req.formData();
    const typeQuery = c.req.query('type');
    const rollId = c.req.query('rollId');
    const userId = c.get('userId');
    
    let strategyType: UploadType = 'avatar';
    if (typeQuery === 'filmStock') strategyType = 'film_stock';
    else if (typeQuery === 'gear') strategyType = 'gear';
    else if (typeQuery === 'post') strategyType = 'post';
    else if (typeQuery === 'frame' || rollId) strategyType = 'roll';

    const strategy = await getUploadStrategy(c, { type: strategyType, userId, rollId });
    
    const urlParams = new URLSearchParams({
      chunked: 'true',
      uploadChannel: strategy.channel,
      serverCompress: strategy.compress,
      uploadNameType: strategy.globalNameType,
      uploadFolder: strategy.finalPath
    });
    const targetUrl = `${strategy.imgBedUrl.replace(/\/$/, '')}/upload?${urlParams.toString()}`;
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${strategy.imgBedToken}` },
      body: formData
    });

    if (!response.ok) throw new Error(await response.text());
    const resData = await response.json();
    return c.json({ success: true, data: resData });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/upload/chunk/merge - 分片上传合并
 */
upload.post('/chunk/merge', authRequired(), async (c) => {
  try {
    const body = await c.req.json();
    const typeQuery = c.req.query('type');
    const rollId = c.req.query('rollId');
    const userId = c.get('userId');
    
    let strategyType: UploadType = 'avatar';
    if (typeQuery === 'filmStock') strategyType = 'film_stock';
    else if (typeQuery === 'gear') strategyType = 'gear';
    else if (typeQuery === 'post') strategyType = 'post';
    else if (typeQuery === 'frame' || rollId) strategyType = 'roll';

    const strategy = await getUploadStrategy(c, { type: strategyType, userId, rollId });
    
    const urlParams = new URLSearchParams({
      chunked: 'true',
      merge: 'true',
      uploadChannel: strategy.channel,
      serverCompress: strategy.compress,
      uploadNameType: strategy.globalNameType,
      uploadFolder: strategy.finalPath
    });
    const targetUrl = `${strategy.imgBedUrl.replace(/\/$/, '')}/upload?${urlParams.toString()}`;
    
    const formData = new FormData();
    formData.append('uploadId', body.uploadId);
    formData.append('totalChunks', body.totalChunks.toString());
    formData.append('originalFileName', body.originalFileName);
    formData.append('originalFileType', body.originalFileType);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${strategy.imgBedToken}` },
      body: formData
    });

    if (!response.ok) throw new Error(await response.text());
    const result = await response.json() as any;
    if (Array.isArray(result) && result[0]?.src) {
        return c.json({ success: true, data: { url: `${strategy.imgBedUrl.replace(/\/$/, '')}${result[0].src}` } });
    }
    throw new Error('图床合并返回数据格式异常');
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/upload - 从图床删除图片
 * Body: { path: "/file/abc123_image.jpg" }
 */
upload.delete('/', authRequired(), async (c) => {
  const body = await c.req.json<{ path: string }>();

  if (!body.path) {
    return c.json({ success: false, error: '未指定文件路径' }, 400);
  }

  // NOTE: 优先从 system_settings 数据库读取图床配置
  const delSettings = await c.env.DB.prepare(
    "SELECT key, value FROM system_settings WHERE key IN ('storage_type', 'img_bed_url', 'img_bed_token', 'webdav_url', 'webdav_username', 'webdav_password')"
  ).all<{ key: string; value: string }>();
  const delMap = delSettings.results.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);
  
  const storageType = delMap['storage_type'] || 'img_bed';

  try {
    if (storageType === 'webdav') {
      const webdavUsername = delMap['webdav_username'] || '';
      const webdavPassword = delMap['webdav_password'] || '';
      const webdavUrl      = delMap['webdav_url']       || '';
      
      // NOTE: 如果是代理 URL，将其还原为真实的 WebDAV 物理地址进行删除
      let targetPath = body.path;
      if (body.path.includes('/api/upload/webdav/')) {
        const parts = body.path.split('/api/upload/webdav/');
        const relativePath = parts[parts.length - 1];
        targetPath = cleanUrl(`${webdavUrl}/${relativePath}`);
      }

      const response = await fetch(targetPath, {
        method: 'DELETE',
        headers: { 'Authorization': `Basic ${btoa(webdavUsername + ':' + webdavPassword)}` }
      });
      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        return c.json({ success: false, error: `WebDAV删除失败: ${errorText}` }, 502);
      }
      return c.json({ success: true });
    } else {
      const imgBedUrl   = delMap['img_bed_url']   || c.env.IMG_BED_URL;
      const imgBedToken = delMap['img_bed_token'] || c.env.IMG_BED_TOKEN;
      const base = imgBedUrl.replace(/\/$/, '');
     
      // 从路径中提取文件标识（去掉前导 /）
      let filePath = body.path;
      try {
        const urlObj = new URL(body.path);
        filePath = urlObj.pathname;
      } catch (e) {
        // Not a full URL, fallback
      }
      filePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
     
      const response = await fetch(`${base}/api/manage/delete/${filePath}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${imgBedToken}` }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return c.json({ success: false, error: `图床删除失败: ${errorText}` }, 502);
      }

      return c.json({ success: true });
    }
  } catch (error) {
    return c.json({ success: false, error: `删除异常: ${String(error)}` }, 500);
  }
});

/**
 * GET /api/upload/webdav/* - WebDAV 图片代理服务
 * 解决前端直接加载 WebDAV 资源时的 Mixed Content (HTTP/HTTPS)、跨域和鉴权问题
 */
upload.get('/webdav/*', async (c) => {
  const filePath = c.req.param('*');
  if (!filePath) {
    return c.text('文件路径不能为空', 400);
  }

  // 1. 从数据库读取 WebDAV 配置
  const settings = await c.env.DB.prepare(
    "SELECT key, value FROM system_settings WHERE key IN ('webdav_url', 'webdav_username', 'webdav_password')"
  ).all<{ key: string; value: string }>();
  const config = settings.results.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);

  const webdavUrl      = config['webdav_url']       || '';
  const webdavUsername = config['webdav_username']  || '';
  const webdavPassword = config['webdav_password']  || '';

  if (!webdavUrl || !webdavUsername || !webdavPassword) {
    return c.text('WebDAV 配置不完整，无法代理访问', 400);
  }

  // 2. 拼接真实的 WebDAV 请求地址
  const targetUrl = cleanUrl(`${webdavUrl}/${filePath}`);

  // 3. 处理可能包含非 ASCII 字符的 Basic Auth
  const encodeBase64 = (str: string) => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      return btoa(str);
    }
  };

  try {
    // 4. 请求真实的 WebDAV 服务器获取图片数据，手动处理重定向以防 Authorization 鉴权头泄露导致第三方存储报 400 错误
    let response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodeBase64(webdavUsername + ':' + webdavPassword)}`
      },
      redirect: 'manual'
    });

    // 如果是重定向（Alist 挂载云盘时，获取文件会 302 重定向到真实的第三方云盘直链）
    if ([301, 302, 307, 308].includes(response.status)) {
      let redirectUrl = response.headers.get('Location');
      if (redirectUrl) {
        // 如果是相对路径，解析为绝对路径
        if (redirectUrl.startsWith('/')) {
          const baseOrigin = new URL(webdavUrl).origin;
          redirectUrl = `${baseOrigin}${redirectUrl}`;
        }
        // 重新发起请求，不带 Authorization 鉴权头部，防止目标云盘报 400 Bad Request
        response = await fetch(redirectUrl, {
          method: 'GET'
        });
      }
    }

    if (!response.ok) {
      return c.text(`无法从 WebDAV 获取文件: ${response.statusText}`, response.status as any);
    }

    // 5. 组装响应流返回给前端
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = response.headers.get('Content-Length');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // 缓存 1 年，因为文件名是带时间戳的唯一文件名
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    // 直接流式返回数据
    return new Response(response.body, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('WebDAV Proxy Error:', error);
    return c.text(`WebDAV 代理异常: ${error.message || String(error)}`, 500);
  }
});

export default upload;
