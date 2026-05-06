import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired } from '../middleware/auth';
import { uploadToImgBed, UploadType } from '../utils/upload-helper';

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
