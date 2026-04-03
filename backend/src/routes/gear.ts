/**
 * 设备管理路由
 * 设备 CRUD、图片上传、状态管理
 */
import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired, generateId } from '../middleware/auth';

const gear = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

/**
 * 上传图片到图床
 * @param file 文件
 * @param imgBedUrl 图床 URL
 * @param imgBedToken 图床 Token
 * @param folderPath 上传目录
 * @param isPreview 是否为预览图
 */
async function uploadToImgBed(
  file: File,
  imgBedUrl: string,
  imgBedToken: string,
  folderPath: string,
  isPreview: boolean
) {
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);

  // 构建查询参数
  const urlParams = new URLSearchParams({
    uploadChannel: 'huggingface',
    uploadNameType: 'index',
    serverCompress: 'true',
    serverWebp: 'true',
    uploadFolder: isPreview ? `${folderPath}preview/` : folderPath
  });

  const targetUrl = `${imgBedUrl}/upload?${urlParams.toString()}`;

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

  // 图床响应格式: [{ "src": "/file/abc123_image.jpg" }]
  const result = await response.json() as Array<{ src: string }>;

  if (!result?.[0]?.src) {
    throw new Error('图床返回数据格式异常');
  }

  // 拼接完整 URL
  return `${imgBedUrl}${result[0].src}`;
}

/** GET /api/gear - 获取用户设备列表 */
gear.get('/', authRequired(), async (c) => {
  const userId = c.get('userId');
  const status = c.req.query('status');

  let query = 'SELECT * FROM gear WHERE user_id = ?';
  const params: (string | number)[] = [userId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();

  const data = result.results?.map((row: Record<string, unknown>) => ({
    id: row.id,
    cameraModel: row.camera_model,
    lensModel: row.lens_model,
    lensType: row.lens_type,
    status: row.status,
    imageUrl: row.image_url,
    formats: JSON.parse((row.formats as string) || '[]'),
    shotCount: row.shot_count,
    shotCounts: JSON.parse((row.shot_counts_json as string) || '{}'),
    mount: row.mount,
    externalUrl: row.external_url,
    review: row.review,
    rating: row.rating,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  })) ?? [];

  return c.json({ success: true, data });
});

/** POST /api/gear - 创建设备 */
gear.post('/', authRequired(), async (c) => {
  const formData = await c.req.formData();
  const file: any = formData.get('file');
  const cameraModel = formData.get('cameraModel') as string;
  const lensModel = formData.get('lensModel') as string;
  const lensType = formData.get('lensType') as string;
  const status = formData.get('status') as string;
  const formats = formData.get('formats') as string;
  const shotCount = parseInt(formData.get('shotCount') as string) || 0;
  const shotCounts = formData.get('shotCounts') as string;
  const mount = formData.get('mount') as string;
  const externalUrl = formData.get('externalUrl') as string;
  const review = formData.get('review') as string;
  const rating = parseFloat(formData.get('rating') as string) || 0;

  // 验证必填字段
  if (!cameraModel || !lensModel || !lensType || !status) {
    return c.json({ success: false, error: '相机型号、镜头型号、镜头类型和状态为必填字段' }, 400);
  }

  // 验证review长度
  if (review && review.length > 30) {
    return c.json({ success: false, error: '评价不能超过30个字符' }, 400);
  }

  // 验证rating范围
  if (rating < 0 || rating > 5) {
    return c.json({ success: false, error: '评分必须在0-5之间' }, 400);
  }

  const userId = c.get('userId');
  const imgBedUrl = c.env.IMG_BED_URL;
  const imgBedToken = c.env.IMG_BED_TOKEN;

  let imageUrl = '';
  if (file && typeof file !== 'string') {
    // 上传图片
    const displayUserId = userId?.toString().padStart(4, '0') || '0000';
    const folderPath = `/FilmAlbum/${displayUserId}/Cameras/`;
    
    try {
      imageUrl = await uploadToImgBed(file, imgBedUrl, imgBedToken, folderPath, false);
    } catch (error) {
      return c.json({ success: false, error: `图片上传失败: ${String(error)}` }, 500);
    }
  }

  const id = generateId();
  await c.env.DB.prepare(
    `INSERT INTO gear (
      id, user_id, camera_model, lens_model, lens_type, status, 
      image_url, formats, shot_count, shot_counts_json, mount, external_url, review, rating, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id, userId, cameraModel, lensModel, lensType, status,
    imageUrl, formats || '[]', shotCount, shotCounts || '{}', mount, externalUrl, review, rating
  ).run();

  return c.json({ success: true, data: { id } }, 201);
});

/** PUT /api/gear/:id - 更新设备 */
gear.put('/:id', authRequired(), async (c) => {
  const id = c.req.param('id');
  const formData = await c.req.formData();
  const file: any = formData.get('file');
  const cameraModel = formData.get('cameraModel') as string;
  const lensModel = formData.get('lensModel') as string;
  const lensType = formData.get('lensType') as string;
  const status = formData.get('status') as string;
  const formats = formData.get('formats') as string;
  const shotCount = parseInt(formData.get('shotCount') as string) || 0;
  const shotCounts = formData.get('shotCounts') as string;
  const mount = formData.get('mount') as string;
  const externalUrl = formData.get('externalUrl') as string;
  const review = formData.get('review') as string;
  const rating = parseFloat(formData.get('rating') as string) || 0;

  // 验证必填字段
  if (!cameraModel || !lensModel || !lensType || !status) {
    return c.json({ success: false, error: '相机型号、镜头型号、镜头类型和状态为必填字段' }, 400);
  }

  // 验证review长度
  if (review && review.length > 30) {
    return c.json({ success: false, error: '评价不能超过30个字符' }, 400);
  }

  // 验证rating范围
  if (rating < 0 || rating > 5) {
    return c.json({ success: false, error: '评分必须在0-5之间' }, 400);
  }

  const userId = c.get('userId');
  const imgBedUrl = c.env.IMG_BED_URL;
  const imgBedToken = c.env.IMG_BED_TOKEN;

  // 检查设备是否存在且属于当前用户
  const existing = await c.env.DB.prepare('SELECT user_id, image_url FROM gear WHERE id = ?').bind(id).first<{ user_id: number; image_url: string }>();
  if (!existing) return c.json({ success: false, error: '设备不存在' }, 404);
  if (String(existing.user_id) !== String(userId)) return c.json({ success: false, error: '无权操作' }, 403);

  let imageUrl = existing.image_url || '';
  if (file && typeof file !== 'string') {
    // 上传新图片
    const displayUserId = userId?.toString().padStart(4, '0') || '0000';
    const folderPath = `/FilmAlbum/${displayUserId}/Cameras/`;
    
    try {
      // 删除旧图片
      if (existing.image_url) {
        try {
          const url = new URL(existing.image_url);
          let path = url.pathname;
          if (path.startsWith('/file/')) {
            path = path.slice(6);
          } else if (path.startsWith('/')) {
            path = path.slice(1);
          }
          
          const deleteUrl = `${imgBedUrl}/api/manage/delete/${path}`;
          const response = await fetch(deleteUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${imgBedToken}`
            }
          });
          
          const result = await response.json() as { success: boolean, error?: string };
          if (!result.success) {
            console.error(`[Gear] Image bed delete failed for path ${path}:`, result.error);
          }
        } catch (e) {
          console.error('[Gear] Failed to sync delete with image bed:', e);
        }
      }
      
      // 上传新图片
      imageUrl = await uploadToImgBed(file, imgBedUrl, imgBedToken, folderPath, false);
    } catch (error) {
      return c.json({ success: false, error: `图片上传失败: ${String(error)}` }, 500);
    }
  }

  await c.env.DB.prepare(
    `UPDATE gear SET 
      camera_model = ?, lens_model = ?, lens_type = ?, status = ?, 
      image_url = ?, formats = ?, shot_count = ?, shot_counts_json = ?, mount = ?, 
      external_url = ?, review = ?, rating = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).bind(
    cameraModel, lensModel, lensType, status,
    imageUrl, formats || '[]', shotCount, shotCounts || '{}', mount,
    externalUrl, review, rating, id, userId
  ).run();

  return c.json({ success: true });
});

/** DELETE /api/gear/:id - 删除设备 */
gear.delete('/:id', authRequired(), async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  // 检查设备是否存在且属于当前用户
  const existing = await c.env.DB.prepare('SELECT user_id, image_url FROM gear WHERE id = ?').bind(id).first<{ user_id: number; image_url: string }>();
  if (!existing) return c.json({ success: false, error: '设备不存在' }, 404);
  if (String(existing.user_id) !== String(userId)) return c.json({ success: false, error: '无权操作' }, 403);

  // 删除图片
  if (existing.image_url) {
    try {
      const url = new URL(existing.image_url);
      let path = url.pathname;
      if (path.startsWith('/file/')) {
        path = path.slice(6);
      } else if (path.startsWith('/')) {
        path = path.slice(1);
      }
      
      const imgBedUrl = c.env.IMG_BED_URL;
      const imgBedToken = c.env.IMG_BED_TOKEN;
      
      if (imgBedUrl && imgBedToken) {
        const deleteUrl = `${imgBedUrl}/api/manage/delete/${path}`;
        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${imgBedToken}`
          }
        });
        
        const result = await response.json() as { success: boolean, error?: string };
        if (!result.success) {
          console.error(`[Gear] Image bed delete failed for path ${path}:`, result.error);
        }
      }
    } catch (e) {
      console.error('[Gear] Failed to sync delete with image bed:', e);
    }
  }

  await c.env.DB.prepare('DELETE FROM gear WHERE id = ? AND user_id = ?').bind(id, userId).run();

  return c.json({ success: true });
});

export default gear;
