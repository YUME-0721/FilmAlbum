import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired } from '../middleware/auth';
import { uploadToImgBed, getUploadStrategy, UploadType } from '../utils/upload-helper';

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
    else if (typeQuery === 'post' || typeQuery === 'frame') strategyType = 'post';
    else if (rollId) strategyType = 'roll';

    // 2. 上传主图
    const uploadUrl = await uploadToImgBed(c, {
      file,
      type: strategyType,
      userId,
      rollId
    });

    // 3. 处理预览图（仅针对影集）
    let previewUrl = null;
    if (strategyType === 'roll') {
      if (previewFile && typeof previewFile !== 'string') {
        // 前端提供预览图
        previewUrl = await uploadToImgBed(c, {
          file: previewFile,
          type: 'preview',
          userId,
          rollId
        });
      } else if (generatePreview) {
        // 后端压缩原图作为预览
        previewUrl = await uploadToImgBed(c, {
          file,
          type: 'preview',
          userId,
          rollId
        });
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
    else if (typeQuery === 'post' || typeQuery === 'frame') strategyType = 'post';
    else if (rollId) strategyType = 'roll';

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
    else if (typeQuery === 'post' || typeQuery === 'frame') strategyType = 'post';
    else if (rollId) strategyType = 'roll';

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
    else if (typeQuery === 'post' || typeQuery === 'frame') strategyType = 'post';
    else if (rollId) strategyType = 'roll';

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
    else if (typeQuery === 'post' || typeQuery === 'frame') strategyType = 'post';
    else if (rollId) strategyType = 'roll';

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
    else if (typeQuery === 'post' || typeQuery === 'frame') strategyType = 'post';
    else if (rollId) strategyType = 'roll';

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
    else if (typeQuery === 'post' || typeQuery === 'frame') strategyType = 'post';
    else if (rollId) strategyType = 'roll';

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

  // NOTE: 优先从 system_settings 数据库读取图床配置，env 变量作为兜底
  const delSettings = await c.env.DB.prepare(
    "SELECT key, value FROM system_settings WHERE key IN ('img_bed_url','img_bed_token')"
  ).all<{ key: string; value: string }>();
  const delMap = delSettings.results.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);
  const imgBedUrl   = delMap['img_bed_url']   || c.env.IMG_BED_URL;
  const imgBedToken = delMap['img_bed_token'] || c.env.IMG_BED_TOKEN;
  const base = imgBedUrl.replace(/\/$/, '');
 
  // 从路径中提取文件标识（去掉前导 /）
  const filePath = body.path.startsWith('/') ? body.path.slice(1) : body.path;
 
  try {
    const response = await fetch(`${base}/api/manage/delete/${filePath}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${imgBedToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ success: false, error: `图床删除失败: ${errorText}` }, 502);
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: `删除异常: ${String(error)}` }, 500);
  }
});

export default upload;
