/**
 * 图片上传路由
 * 代理上传至自建图床 (CloudFlare ImgBed)
 * 图床地址: https://img.072199.xyz
 */
import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired } from '../middleware/auth';

const upload = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

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

/**
 * POST /api/upload - 上传图片到图床
 * 前端通过 multipart/form-data 上传文件，后端代理转发至图床
 * 返回完整的图片 URL
 */
upload.post('/', authRequired(), async (c) => {
  const formData = await c.req.formData();
  const file: any = formData.get('file');
  const previewFile: any = formData.get('previewFile');
  const generatePreview = formData.get('generatePreview') === 'true';

  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: '未选择文件' }, 400);
  }

  // 校验文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ success: false, error: '不支持的文件格式，仅支持 JPG/PNG/WebP/GIF/AVIF' }, 400);
  }

  // 校验文件大小（20MB 上限）
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ success: false, error: '文件大小超过 20MB 限制' }, 400);
  }

  const imgBedUrl = c.env.IMG_BED_URL;
  const imgBedToken = c.env.IMG_BED_TOKEN;

  try {
    const rollId = c.req.query('rollId');
    const type = c.req.query('type');
    const userId = c.get('userId');
    const displayUserId = userId?.toString().padStart(4, '0') || '0000';
    
    // 确定是否为头像上传（没有rollId且不是胶卷型号照片）
    const isAvatarUpload = !rollId && type !== 'filmStock';
    
    // 根据类型决定上传路径
    // type=filmStock: 胶卷型号照片 -> /FilmAlbum/Films/
    // 有rollId: 胶卷底片照片 -> /FilmAlbum/{userId}/{rollId}/
    // 无rollId且不是胶卷型号照片: 头像 -> /FilmAlbum/{userId}/
    const folderPath = type === 'filmStock' 
      ? `/FilmAlbum/Films/`
      : rollId 
        ? `/FilmAlbum/${displayUserId}/${rollId}/`
        : `/FilmAlbum/${displayUserId}/`;

    // 上传图片：头像使用压缩模式，其他使用原图模式
    const uploadUrl = await uploadToImgBed(file, imgBedUrl, imgBedToken, folderPath, false);

    // 处理预览图
    let previewUrl = null;
    if (type !== 'filmStock' && !isAvatarUpload) {
      if (previewFile && typeof previewFile !== 'string') {
        // 前端已提供压缩后的预览图，直接上传到预览目录
        previewUrl = await uploadToImgBed(previewFile, imgBedUrl, imgBedToken, folderPath, true);
      } else if (generatePreview) {
        // 后端生成预览图（使用原图压缩）
        previewUrl = await uploadToImgBed(file, imgBedUrl, imgBedToken, folderPath, true);
      }
    }

    return c.json({
      success: true,
      data: {
        url: uploadUrl,
        previewUrl: previewUrl,
        path: uploadUrl.replace(imgBedUrl, '')
      }
    });
  } catch (error) {
    return c.json({ success: false, error: `上传异常: ${String(error)}` }, 500);
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

  const imgBedUrl = c.env.IMG_BED_URL;
  const imgBedToken = c.env.IMG_BED_TOKEN;

  // 从路径中提取文件标识（去掉前导 /）
  const filePath = body.path.startsWith('/') ? body.path.slice(1) : body.path;

  try {
    const response = await fetch(`${imgBedUrl}/api/manage/delete/${filePath}`, {
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
