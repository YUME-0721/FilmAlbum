/**
 * 胶卷路由
 * 胶卷 CRUD、帧管理、筛选
 */
import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired, authOptional, generateId, requireLevel } from '../middleware/auth';
import { getUploadStrategy } from '../utils/upload-helper';

const rolls = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

/** 安全解析 JSON */
function safeParseJSON(str: any, fallback: any = []) {
  if (!str) return fallback;
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('JSON parse error:', e, 'Content:', str);
    return fallback;
  }
}

/** GET /api/rolls - 获取胶卷列表（支持筛选） */
rolls.get('/', authOptional(), async (c) => {
  const userId = c.req.query('userId');
  const year = c.req.query('year');
  const filmType = c.req.query('filmType');
  const tag = c.req.query('tag');
  const page = parseInt(c.req.query('page') ?? '1');
  const pageSize = parseInt(c.req.query('pageSize') ?? '12');
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (userId) {
    whereClause += ' AND r.user_id = ?';
    params.push(userId);
  }

  if (year) {
    whereClause += " AND strftime('%Y', r.shot_date) = ?";
    params.push(year);
  }

  if (filmType) {
    whereClause += ' AND r.film_type = ?';
    params.push(filmType);
  }

  if (tag) {
    whereClause += ' AND (r.tags LIKE ? OR r.title LIKE ?)';
    params.push(`%${tag}%`, `%${tag}%`);
  }

  const totalQuery = `SELECT COUNT(*) as count FROM rolls r ${whereClause}`;
  const total = await c.env.DB.prepare(totalQuery).bind(...params).first<{ count: number }>();

  const query = `
    SELECT r.*, u.nickname as author_name, u.avatar_url as author_avatar,
           (SELECT COUNT(*) FROM frames WHERE roll_id = r.id) as frame_count,
           (SELECT json_group_array(json_object(
             'id', id, 'imageUrl', image_url, 'previewUrl', preview_url, 'frameNumber', frame_number,
             'aperture', aperture, 'shutterSpeed', shutter_speed, 'iso', iso,
             'exposureCompensation', exposure_compensation,
             'description', description, 'sortOrder', sort_order, 'tags', tags,
             'shotDate', shot_date, 'location', location, 'camera', camera, 'lens', lens,
             'fileSize', file_size, 'fileFormat', file_format
           )) FROM (SELECT * FROM frames WHERE roll_id = r.id ORDER BY sort_order)) as frames_data
    FROM rolls r
    JOIN users u ON r.user_id = u.id
    ${whereClause}
    ORDER BY r.sort_order ASC, r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const result = await c.env.DB.prepare(query).bind(...params, pageSize, offset).all();

  const data = result.results?.map((row: Record<string, unknown>) => {
    let frames = [];
    try {
      if (row.frames_data) {
        frames = JSON.parse(row.frames_data as string).map((frame: any) => ({
          ...frame,
          tags: frame.tags ? JSON.parse(frame.tags) : []
        }));
      }
    } catch (e) {}
    
    return {
      id: row.id,
      title: row.title,
      filmStock: row.film_stock,
      camera: row.camera,
      lens: row.lens,
      location: row.location,
      shotDate: row.shot_date,
      endDate: row.end_date,
      format: row.format,
      status: row.status,
      tags: JSON.parse((row.tags as string) || '[]'),
      frameCount: row.frame_count,
      sortOrder: row.sort_order,
      frames: frames,
      author: {
        id: row.user_id,
        nickname: row.author_name,
        avatarUrl: row.author_avatar
      },
      createdAt: row.created_at
    };
  }) ?? [];

  return c.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total: total?.count ?? 0,
      totalPages: Math.ceil((total?.count ?? 0) / pageSize)
    }
  });
});

/** GET /api/rolls/:id - 获取胶卷详情（含所有帧） */
rolls.get('/:id', authOptional(), async (c) => {
  const rollId = c.req.param('id');
  const currentUserId = c.get('userId');

  const roll = await c.env.DB.prepare(
    `SELECT r.*, u.nickname as author_name, u.avatar_url as author_avatar
     FROM rolls r JOIN users u ON r.user_id = u.id
     WHERE r.id = ?`
  ).bind(rollId).first<Record<string, unknown>>();

  if (!roll) {
    return c.json({ success: false, error: '胶卷不存在' }, 404);
  }

  const frames = await c.env.DB.prepare(
    'SELECT * FROM frames WHERE roll_id = ? ORDER BY sort_order'
  ).bind(rollId).all();

  return c.json({
    success: true,
    data: {
      id: roll.id,
      title: roll.title,
      filmStock: roll.film_stock,
      camera: roll.camera,
      lens: roll.lens,
      location: roll.location,
      shotDate: roll.shot_date,
      endDate: roll.end_date,
      format: roll.format,
      filmType: roll.film_type,
      status: roll.status,
      tags: safeParseJSON(roll.tags),
      sortOrder: roll.sort_order,
      author: {
        id: roll.user_id,
        nickname: roll.author_name,
        avatarUrl: roll.author_avatar
      },
      frames: frames.results?.map((f: Record<string, unknown>) => ({
        id: f.id,
        imageUrl: f.image_url,
        previewUrl: f.preview_url,
        frameNumber: f.frame_number,
        aperture: f.aperture,
        shutterSpeed: f.shutter_speed,
        iso: f.iso,
        exposureCompensation: f.exposure_compensation,
        description: f.description,
        sortOrder: f.sort_order,
        shotDate: f.shot_date,
        location: f.location,
        camera: f.camera,
        lens: f.lens,
        fileSize: f.file_size,
        fileFormat: f.file_format,
        tags: safeParseJSON(f.tags)
      })) ?? [],
      isOwner: String(currentUserId) === String(roll.user_id),
      createdAt: roll.created_at
    }
  });
});

/** GET /api/rolls/:id/contact-sheet - 生成 SVG 格式联系单（索引图），供移动端下载分享 */
rolls.get('/:id/contact-sheet', authOptional(), async (c) => {
  const rollId = c.req.param('id');

  const roll = await c.env.DB.prepare(
    `SELECT r.*, u.nickname as author_name FROM rolls r JOIN users u ON r.user_id = u.id WHERE r.id = ?`
  ).bind(rollId).first<Record<string, unknown>>();

  if (!roll) {
    return c.json({ success: false, error: '胶卷不存在' }, 404);
  }

  const framesResult = await c.env.DB.prepare(
    'SELECT * FROM frames WHERE roll_id = ? ORDER BY sort_order'
  ).bind(rollId).all<Record<string, unknown>>();

  const frames = framesResult.results ?? [];

  // NOTE: 以下 SVG 结构完全对应网页端 Canvas 联系单的布局：头部信息 + 胶片条（含齿孔）+ 每格图片 + 帧号
  const formatName = String(roll.format || '135');

  // 画幅宽高比映射（与网页端保持一致）
  const formatRatioMap: Record<string, number> = {
    '半格': 2 / 3,
    '35mm': 3 / 2,
    '135': 3 / 2,
    'xpan': 65 / 24,
    '620': 3 / 2,
    '630': 3 / 2,
    '645': 4 / 3,
    '6x6': 1,
    '6x7': 7 / 6,
    '6x9': 3 / 2
  };

  // 每行列数映射（与网页端 desktopCols 对应）
  const defaultColsMap: Record<string, number> = {
    '半格': 12, '135': 6, '35mm': 6, 'xpan': 1,
    '620': 1, '630': 1, '645': 4, '6x6': 3, '6x7': 3, '6x9': 2
  };

  const aspectRatio = formatRatioMap[formatName] ?? 1.5;
  const cols = defaultColsMap[formatName] ?? 6;

  // 画布宽度固定为 1800，与网页端 3600 等比缩放 0.5
  const canvasWidth = 1800;
  const edgeMargin = 50;
  const usableWidth = canvasWidth - edgeMargin * 2;
  const gap = 20;
  const rows = Math.ceil(frames.length / cols);

  const itemWidth = (usableWidth - gap * (cols - 1)) / cols;
  const photoW = itemWidth - 8;
  const photoH = photoW / aspectRatio;

  // 135 格式专有参数：胶片条高度 = 照片高度 + 顶部/底部黑边
  const is135 = ['135', '35mm', '半格', 'xpan'].includes(formatName);
  let rowHeight: number;
  let borderTop = 14;
  let borderBottom = 14;
  if (is135) {
    const P_mm = photoH / 24;
    rowHeight = Math.round(P_mm * 35);
    borderTop = Math.round(P_mm * 5.5);
    borderBottom = rowHeight - borderTop - photoH;
  } else {
    rowHeight = photoH + borderTop + borderBottom;
  }

  const headerHeight = 180;
  const rowGap = 40;
  const canvasHeight = headerHeight + edgeMargin + rowHeight * rows + rowGap * (rows - 1) + edgeMargin;

  const filmStock = String(roll.film_stock || '').toUpperCase() || (is135 ? 'KODAK 135' : 'KODAK 120');

  let svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`);
  svgParts.push(`<rect width="${canvasWidth}" height="${canvasHeight}" fill="#ffffff"/>`);

  // 头部背景
  svgParts.push(`<rect x="0" y="0" width="${canvasWidth}" height="${headerHeight}" fill="#0a0a0a"/>`);

  // 品牌文字
  svgParts.push(`<text x="${edgeMargin}" y="${headerHeight / 2 - 18}" fill="#ffffff" font-family="Inter,-apple-system,sans-serif" font-size="46" font-weight="bold" dominant-baseline="middle">FilmAlbum</text>`);
  svgParts.push(`<text x="${edgeMargin}" y="${headerHeight / 2 + 28}" fill="#c5a86a" font-family="Inter,-apple-system,sans-serif" font-size="18" font-weight="bold" dominant-baseline="middle">CONTACT SHEET</text>`);

  // 右侧影集详情
  const rollTitle = String(roll.title || 'UNTITLED').toUpperCase();
  const archiveText = `FORMAT: ${formatName.toUpperCase()}  •  STOCK: ${filmStock}  •  CAMERA: ${String(roll.camera || 'N/A').toUpperCase()}`;
  let displayDate = String(roll.shot_date || 'N/A');
  const endDate = String(roll.end_date || '');
  if (endDate && endDate !== String(roll.shot_date)) displayDate = `${displayDate} ~ ${endDate}`;
  const dateText = `DATE: ${displayDate}  •  TOTAL FRAMES: ${frames.length}`;

  svgParts.push(`<text x="${canvasWidth - edgeMargin}" y="${headerHeight / 2 - 22}" fill="#ffffff" font-family="Inter,-apple-system,sans-serif" font-size="44" font-weight="bold" text-anchor="end" dominant-baseline="middle">${rollTitle}</text>`);
  svgParts.push(`<text x="${canvasWidth - edgeMargin}" y="${headerHeight / 2 + 12}" fill="#8e8e93" font-family="Inter,-apple-system,sans-serif" font-size="13" text-anchor="end" dominant-baseline="middle">${archiveText}</text>`);
  svgParts.push(`<text x="${canvasWidth - edgeMargin}" y="${headerHeight / 2 + 38}" fill="#8e8e93" font-family="Inter,-apple-system,sans-serif" font-size="13" text-anchor="end" dominant-baseline="middle">${dateText}</text>`);

  // 绘制每一行
  for (let r = 0; r < rows; r++) {
    const rowY = headerHeight + edgeMargin + r * (rowHeight + rowGap);

    if (is135) {
      // 135 格式：黑色胶片条背景
      svgParts.push(`<rect x="${edgeMargin}" y="${rowY}" width="${usableWidth}" height="${rowHeight}" fill="#0b0b0b"/>`);

      // 齿孔（顶部 + 底部）
      const sprocketH = Math.round((photoH / 24) * 2.4);
      const sprocketW = Math.round((photoH / 24) * 2.8);
      const sprocketPitch = (photoH / 24) * 4.75;
      const sprocketTopY = rowY + Math.round((photoH / 24) * 2.0);
      const sprocketBottomY = rowY + rowHeight - Math.round((photoH / 24) * 2.0) - sprocketH;
      const sprocketCount = Math.floor(usableWidth / sprocketPitch);
      for (let s = 0; s < sprocketCount; s++) {
        const sx = edgeMargin + s * sprocketPitch + (sprocketPitch - sprocketW) / 2;
        const r2 = Math.round((photoH / 24) * 0.5);
        svgParts.push(`<rect x="${sx.toFixed(1)}" y="${sprocketTopY}" width="${sprocketW}" height="${sprocketH}" rx="${r2}" fill="#ffffff"/>`);
        svgParts.push(`<rect x="${sx.toFixed(1)}" y="${sprocketBottomY}" width="${sprocketW}" height="${sprocketH}" rx="${r2}" fill="#ffffff"/>`);
      }
    }

    for (let col = 0; col < cols; col++) {
      const index = r * cols + col;
      if (index >= frames.length) break;

      const frame = frames[index] as Record<string, unknown>;
      const centerX = edgeMargin + col * (itemWidth + gap) + itemWidth / 2;
      const photoX = centerX - photoW / 2;
      const photoY = rowY + borderTop;
      const imgUrl = String(frame.preview_url || frame.image_url || '');

      if (!is135) {
        // 中画幅：黑色单格背景
        svgParts.push(`<rect x="${photoX - 8}" y="${rowY}" width="${itemWidth}" height="${rowHeight}" fill="#0b0b0b"/>`);
      }

      if (imgUrl) {
        // NOTE: SVG <image> 标签引用外部图片 URL，文件尺寸极小，移动端查看时需网络加载图片
        svgParts.push(`<image href="${imgUrl}" x="${photoX.toFixed(1)}" y="${photoY.toFixed(1)}" width="${photoW.toFixed(1)}" height="${photoH.toFixed(1)}" preserveAspectRatio="xMidYMid slice"/>`);
      } else {
        // 无图片时显示占位
        svgParts.push(`<rect x="${photoX.toFixed(1)}" y="${photoY.toFixed(1)}" width="${photoW.toFixed(1)}" height="${photoH.toFixed(1)}" fill="#222222"/>`);
        svgParts.push(`<text x="${centerX.toFixed(1)}" y="${(photoY + photoH / 2).toFixed(1)}" fill="#ffffff" font-size="10" text-anchor="middle" dominant-baseline="middle">NO IMAGE</text>`);
      }

      // 胶卷型号文字（顶部）
      const filmFontSize = Math.max(7, Math.round((photoH / 24) * 1.1));
      svgParts.push(`<text x="${centerX.toFixed(1)}" y="${(rowY + 9).toFixed(1)}" fill="#c5a86a" font-family="Inter,sans-serif" font-size="${filmFontSize}" text-anchor="middle" dominant-baseline="middle">${filmStock}</text>`);

      // 帧号（底部）
      const frameNumFontSize = Math.max(7, Math.round((photoH / 24) * 1.4));
      const frameNumStr = `▶ ${String(index + 1).padStart(2, '0')}`;
      svgParts.push(`<text x="${centerX.toFixed(1)}" y="${(rowY + rowHeight - 5).toFixed(1)}" fill="#c5a86a" font-family="Inter,sans-serif" font-size="${frameNumFontSize}" font-weight="bold" text-anchor="middle" dominant-baseline="auto">${frameNumStr}</text>`);
    }
  }

  svgParts.push('</svg>');
  const svgContent = svgParts.join('\n');

  return new Response(svgContent, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(String(roll.title || 'contact-sheet'))}_ContactSheet.svg"`,
      'Access-Control-Allow-Origin': '*',
    }
  });
});

/** GET /api/rolls/frame/:frameId - 通过帧 ID 获取底片及所属胶卷完整信息 */
rolls.get('/frame/:frameId', authOptional(), async (c) => {
  const frameId = c.req.param('frameId');
  const currentUserId = c.get('userId');

  const frameRecord = await c.env.DB.prepare(
    'SELECT roll_id FROM frames WHERE id = ?'
  ).bind(frameId).first<{ roll_id: string }>();

  if (!frameRecord) {
    return c.json({ success: false, error: '底片不存在' }, 404);
  }

  const rollId = frameRecord.roll_id;

  const roll = await c.env.DB.prepare(
    `SELECT r.*, u.nickname as author_name, u.avatar_url as author_avatar
     FROM rolls r JOIN users u ON r.user_id = u.id
     WHERE r.id = ?`
  ).bind(rollId).first<Record<string, unknown>>();

  if (!roll) {
    return c.json({ success: false, error: '胶卷不存在' }, 404);
  }

  const frames = await c.env.DB.prepare(
    'SELECT * FROM frames WHERE roll_id = ? ORDER BY sort_order'
  ).bind(rollId).all();

  return c.json({
    success: true,
    data: {
      id: roll.id,
      title: roll.title,
      filmStock: roll.film_stock,
      camera: roll.camera,
      lens: roll.lens,
      location: roll.location,
      shotDate: roll.shot_date,
      endDate: roll.end_date,
      format: roll.format,
      filmType: roll.film_type,
      status: roll.status,
      tags: safeParseJSON(roll.tags),
      author: {
        id: roll.user_id,
        nickname: roll.author_name,
        avatarUrl: roll.author_avatar
      },
      frames: frames.results?.map((f: Record<string, unknown>) => ({
        id: f.id,
        imageUrl: f.image_url,
        previewUrl: f.preview_url,
        frameNumber: f.frame_number,
        aperture: f.aperture,
        shutterSpeed: f.shutter_speed,
        iso: f.iso,
        exposureCompensation: f.exposure_compensation,
        description: f.description,
        sortOrder: f.sort_order,
        shotDate: f.shot_date,
        location: f.location,
        camera: f.camera,
        lens: f.lens,
        fileSize: f.file_size,
        fileFormat: f.file_format,
        tags: safeParseJSON(f.tags)
      })) ?? [],
      isOwner: String(currentUserId) === String(roll.user_id),
      createdAt: roll.created_at
    }
  });
});


/** POST /api/rolls - 创建胶卷 */
rolls.post('/', authRequired(), async (c) => {
  const userId = c.get('userId');

  // 获取用户权限等级
  const user = await c.env.DB.prepare('SELECT level FROM users WHERE id = ?').bind(userId).first<{ level: string }>();
  if (!user) return c.json({ success: false, error: '用户不存在' }, 404);

  if (user.level === 'lv1') {
    return c.json({ success: false, error: '当前等级(lv1)不可创建胶卷，请联系管理员升级' }, 403);
  }

  if (user.level === 'lv2') {
    // 检查已创建数量
    const rollCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM rolls WHERE user_id = ?').bind(userId).first<{ count: number }>();
    const limitSetting = await c.env.DB.prepare("SELECT value FROM system_settings WHERE key = 'lv2_roll_limit'").first<{ value: string }>();
    const limit = parseInt(limitSetting?.value || '10', 10);
    
    if ((rollCount?.count || 0) >= limit) {
      return c.json({ success: false, error: `当前等级(lv2)最多只能创建 ${limit} 个胶卷，请联系管理员升级` }, 403);
    }
  }

  const body = await c.req.json<{
    title?: string;
    filmStock?: string;
    camera?: string;
    lens?: string;
    location?: string;
    shotDate?: string;
    endDate?: string;
    format?: string;
    filmType?: string;
    status?: string;
    tags?: string[];
  }>();

  // 验证日期：结束时间不能早于开始时间
  if (body.shotDate && body.endDate && body.endDate < body.shotDate) {
    return c.json({ success: false, error: '拍摄结束时间不能早于开始时间' }, 400);
  }

  const rollId = generateId();

  // 获取当前用户相册的最大排序号
  const maxOrder = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM rolls WHERE user_id = ?'
  ).bind(userId).first<{ max_order: number }>();
  const nextOrder = (maxOrder?.max_order ?? -1) + 1;

  await c.env.DB.prepare(
    `INSERT INTO rolls (id, user_id, title, film_stock, camera, lens, location, shot_date, end_date, format, film_type, status, tags, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    rollId, userId, body.title ?? '',
    body.filmStock ?? '', body.camera ?? '', body.lens ?? '',
    body.location ?? '', body.shotDate ?? '', body.endDate ?? '',
    body.format ?? '135', body.filmType ?? 'COLOR_NEGATIVE', body.status ?? 'COMPLETED', JSON.stringify(body.tags ?? []),
    nextOrder
  ).run();

  return c.json({ success: true, data: { id: rollId } }, 201);
});

/** 批量更新相册排序 */
rolls.put('/reorder', authRequired(), requireLevel('lv2'), async (c) => {
  const userId = c.get('userId');
  const { rollIds } = await c.req.json<{ rollIds: string[] }>();

  if (!rollIds?.length) return c.json({ success: false, error: '未提供相册 ID 列表' }, 400);

  // 批量更新 sort_order
  const statements = rollIds.map((rollId, index) => {
    return c.env.DB.prepare('UPDATE rolls SET sort_order = ? WHERE id = ? AND user_id = ?')
      .bind(index, rollId, userId);
  });

  try {
    await c.env.DB.batch(statements);
    return c.json({ success: true });
  } catch (err: any) {
    console.error('Roll reorder error:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

/** PUT /api/rolls/:id - 更新胶卷信息 */
rolls.put('/:id', authRequired(), requireLevel('lv2'), async (c) => {
  const rollId = c.req.param('id');
  const userId = c.get('userId');

  const roll = await c.env.DB.prepare('SELECT user_id FROM rolls WHERE id = ?').bind(rollId).first<{ user_id: number }>();
  if (!roll) return c.json({ success: false, error: '胶卷不存在' }, 404);
  if (String(roll.user_id) !== String(userId)) return c.json({ success: false, error: '无权修改他人的胶卷' }, 403);

  const body = await c.req.json<{
    title?: string;
    filmStock?: string;
    camera?: string;
    lens?: string;
    location?: string;
    shotDate?: string;
    endDate?: string;
    format?: string;
    status?: string;
    tags?: string[];
  }>();

  // 验证日期：结束时间不能早于开始时间
  if (body.shotDate && body.endDate && body.endDate < body.shotDate) {
    return c.json({ success: false, error: '拍摄结束时间不能早于开始时间' }, 400);
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  const fieldMap: Record<string, string> = {
    title: 'title', filmStock: 'film_stock', camera: 'camera',
    lens: 'lens', location: 'location', shotDate: 'shot_date', endDate: 'end_date',
    format: 'format', filmType: 'film_type', status: 'status'
  };

  for (const [tsKey, dbKey] of Object.entries(fieldMap)) {
    const val = body[tsKey as keyof typeof body];
    if (val !== undefined) {
      updates.push(`${dbKey} = ?`);
      values.push(val as string);
    }
  }

  if (body.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(body.tags));
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: '没有需要更新的字段' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  values.push(rollId!);

  await c.env.DB.prepare(
    `UPDATE rolls SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  return c.json({ success: true });
});

/** DELETE /api/rolls/:id - 删除胶卷 */
rolls.delete('/:id', authRequired(), requireLevel('lv2'), async (c) => {
  const rollId = c.req.param('id');
  const userId = c.get('userId');

  const roll = await c.env.DB.prepare('SELECT user_id FROM rolls WHERE id = ?').bind(rollId).first<{ user_id: number }>();
  if (!roll) return c.json({ success: false, error: '胶卷不存在' }, 404);
  if (String(roll.user_id) !== String(userId)) return c.json({ success: false, error: '无权删除他人的胶卷' }, 403);

  // 1. 同步删除图床上的整个相册文件夹
  try {
    const strategy = await getUploadStrategy(c, { type: 'roll', userId: String(userId), rollId });
    const imgBedUrl = strategy.imgBedUrl;
    const imgBedToken = strategy.imgBedToken;
    
    // 提取相对路径（去掉前导斜杠）
    let folderPath = strategy.finalPath;
    if (folderPath.startsWith('/')) folderPath = folderPath.slice(1);
    // 去掉结尾斜杠，图床文件夹删除通常不需要结尾斜杠
    if (folderPath.endsWith('/')) folderPath = folderPath.slice(0, -1);

    if (imgBedUrl && imgBedToken) {
      // 按照文档示例：GET /api/manage/delete/{path}?folder=true
      const deleteUrl = `${imgBedUrl.replace(/\/$/, '')}/api/manage/delete/${folderPath}?folder=true`;
      const response = await fetch(deleteUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${imgBedToken}`
        }
      });
      
      const result = await response.json() as { success: boolean, error?: string };
      if (result.success) {
        console.log(`[Rolls] Image bed folder deleted: ${folderPath}`);
      } else {
        console.error(`[Rolls] Image bed folder delete failed for ${folderPath}:`, result.error);
      }
    }
  } catch (e) {
    console.error('[Rolls] Failed to sync delete folder with image bed:', e);
  }

  // 2. 级联删除数据库记录 (rolls 会自动清理 frames 表，如果数据库中设置了 ON DELETE CASCADE)
  // 如果数据库没设级联，可以手动清理一次
  await c.env.DB.prepare('DELETE FROM frames WHERE roll_id = ?').bind(rollId).run();
  await c.env.DB.prepare('DELETE FROM rolls WHERE id = ?').bind(rollId).run();

  // 3. 自动重新排序剩下的胶卷，保持 sort_order 连续递增 (0, 1, 2...) 避免删除产生序号空洞
  try {
    const remainingRolls = await c.env.DB.prepare(
      'SELECT id FROM rolls WHERE user_id = ? ORDER BY sort_order ASC'
    ).bind(userId).all<{ id: string }>();

    if (remainingRolls.results && remainingRolls.results.length > 0) {
      for (let i = 0; i < remainingRolls.results.length; i++) {
        await c.env.DB.prepare(
          'UPDATE rolls SET sort_order = ? WHERE id = ?'
        ).bind(i, remainingRolls.results[i].id).run();
      }
    }
  } catch (err) {
    console.error('[Rolls] Failed to reindex remaining rolls after deletion:', err);
  }

  return c.json({ success: true });
});

/** POST /api/rolls/:id/frames - 添加新底片（不需要上传图片，只添加记录） */
rolls.post('/:id/frames', authRequired(), requireLevel('lv2'), async (c) => {
  const rollId = c.req.param('id');
  const userId = c.get('userId');

  const roll = await c.env.DB.prepare('SELECT user_id FROM rolls WHERE id = ?').bind(rollId).first<{ user_id: number }>();
  if (!roll) return c.json({ success: false, error: '胶卷不存在' }, 404);
  if (String(roll.user_id) !== String(userId)) return c.json({ success: false, error: '无权操作他人的胶卷' }, 403);

  const body = await c.req.json<{
    frames: Array<{
      imageUrl: string;
      previewUrl?: string;
      frameNumber?: string;
      aperture?: string;
      shutterSpeed?: string;
      iso?: string;
      exposureCompensation?: string;
      description?: string;
      fileSize?: number;
      fileFormat?: string;
      sortOrder?: number;
    }>;
  }>();

  if (!body.frames?.length) {
    return c.json({ success: false, error: '未提供帧数据' }, 400);
  }

  // 获取当前最大 sort_order
  const maxOrder = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM frames WHERE roll_id = ?'
  ).bind(rollId).first<{ max_order: number }>();

  let currentOrder = (maxOrder?.max_order ?? -1) + 1;

  const createdFrames = body.frames.map((frame, index) => {
    const id = generateId();
    // 如果前端提供了明确的 sortOrder，则使用它；否则基于当前最大值累加
    const order = frame.sortOrder !== undefined ? frame.sortOrder : currentOrder + index;
    return {
      id,
      rollId,
      imageUrl: frame.imageUrl,
      previewUrl: frame.previewUrl ?? null,
      frameNumber: frame.frameNumber ?? '',
      aperture: frame.aperture ?? '',
      shutterSpeed: frame.shutterSpeed ?? '',
      iso: frame.iso ?? '',
      exposureCompensation: frame.exposureCompensation ?? '0',
      description: frame.description ?? '',
      sortOrder: order,
      fileSize: frame.fileSize ?? 0,
      fileFormat: frame.fileFormat ?? '',
      tags: []
    };
  });

  const statements = createdFrames.map((frame) => {
    return c.env.DB.prepare(
      `INSERT INTO frames (id, roll_id, image_url, preview_url, frame_number, aperture, shutter_speed, iso, exposure_compensation, description, sort_order, file_size, file_format)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      frame.id, frame.rollId, frame.imageUrl,
      frame.previewUrl, frame.frameNumber, frame.aperture,
      frame.shutterSpeed, frame.iso, frame.exposureCompensation,
      frame.description, frame.sortOrder, frame.fileSize, frame.fileFormat
    );
  });

  await c.env.DB.batch(statements);

  return c.json({ success: true, data: createdFrames }, 201);
});

/** DELETE /api/rolls/:rollId/frames/:frameId - 删除单张底片 */
rolls.delete('/:rollId/frames/:frameId', authRequired(), requireLevel('lv2'), async (c) => {
  const rollId = c.req.param('rollId');
  const frameId = c.req.param('frameId');
  const userId = c.get('userId');

  const roll = await c.env.DB.prepare('SELECT user_id FROM rolls WHERE id = ?').bind(rollId).first<{ user_id: number }>();
  if (!roll) return c.json({ success: false, error: '胶卷不存在' }, 404);
  if (String(roll.user_id) !== String(userId)) return c.json({ success: false, error: '无权操作他人的胶卷' }, 403);

  // 获取图片 URL 以便从图床同步删除
  const frame = await c.env.DB.prepare('SELECT image_url, preview_url FROM frames WHERE id = ?').bind(frameId).first<{ image_url: string; preview_url: string }>();
  
  // 删除原图
  if (frame?.image_url) {
    try {
      const url = new URL(frame.image_url);
      // 精确提取路径：图床访问 URL 通常带有 /file/ 前缀，但管理 API 的 path 不带
      let path = url.pathname;
      if (path.startsWith('/file/')) {
        path = path.slice(6); // 移除 /file/
      } else if (path.startsWith('/')) {
        path = path.slice(1); // 移除 /
      }
      
      const settings = await c.env.DB.prepare(
        "SELECT key, value FROM system_settings WHERE key IN ('img_bed_url', 'img_bed_token')"
      ).all<{ key: string; value: string }>();
      const config = settings.results.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);
      
      const imgBedUrl = config['img_bed_url'] || c.env.IMG_BED_URL;
      const imgBedToken = config['img_bed_token'] || c.env.IMG_BED_TOKEN;
      
      if (imgBedUrl && imgBedToken) {
        // 根据文档示例：GET /api/manage/delete/{path}
        const deleteUrl = `${imgBedUrl.replace(/\/$/, '')}/api/manage/delete/${path}`;
        const response = await fetch(deleteUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${imgBedToken}`
          }
        });
        
        const result = await response.json() as { success: boolean, error?: string };
        if (!result.success) {
          console.error(`[Rolls] Image bed delete failed for path ${path}:`, result.error);
        } else {
          console.log(`[Rolls] Image bed delete success for path: ${path}`);
        }
      }
    } catch (e) {
      console.error('[Rolls] Failed to sync delete with image bed:', e);
    }
  }
  
  // 删除预览图
  if (frame?.preview_url) {
    try {
      const url = new URL(frame.preview_url);
      let path = url.pathname;
      if (path.startsWith('/file/')) {
        path = path.slice(6);
      } else if (path.startsWith('/')) {
        path = path.slice(1);
      }
      
      const settings = await c.env.DB.prepare(
        "SELECT key, value FROM system_settings WHERE key IN ('img_bed_url', 'img_bed_token')"
      ).all<{ key: string; value: string }>();
      const config = settings.results.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);
      
      const imgBedUrl = config['img_bed_url'] || c.env.IMG_BED_URL;
      const imgBedToken = config['img_bed_token'] || c.env.IMG_BED_TOKEN;
      
      if (imgBedUrl && imgBedToken) {
        const deleteUrl = `${imgBedUrl.replace(/\/$/, '')}/api/manage/delete/${path}`;
        const response = await fetch(deleteUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${imgBedToken}`
          }
        });
        
        const result = await response.json() as { success: boolean, error?: string };
        if (!result.success) {
          console.error(`[Rolls] Preview image bed delete failed for path ${path}:`, result.error);
        } else {
          console.log(`[Rolls] Preview image bed delete success for path: ${path}`);
        }
      }
    } catch (e) {
      console.error('[Rolls] Failed to sync delete preview with image bed:', e);
    }
  }

  await c.env.DB.prepare('DELETE FROM frames WHERE id = ? AND roll_id = ?').bind(frameId, rollId).run();

  return c.json({ success: true });
});

/** PUT /api/rolls/:id/frames/reorder - 重新排序底片 */
rolls.put('/:id/frames/reorder', authRequired(), async (c) => {
  const rollId = c.req.param('id');
  const userId = c.get('userId');
  const { frameIds } = await c.req.json<{ frameIds: string[] }>();

  if (!frameIds?.length) return c.json({ success: false, error: '未提供底片序列' }, 400);

  // 1. 权限校验
  const roll = await c.env.DB.prepare('SELECT user_id FROM rolls WHERE id = ?').bind(rollId).first<{ user_id: number }>();
  if (!roll) return c.json({ success: false, error: '相册不存在' }, 404);
  if (String(roll.user_id) !== String(userId)) return c.json({ success: false, error: '无权操作' }, 403);

  // 2. 批量更新 sort_order 和 frame_number
  const statements = frameIds.map((frameId, index) => {
    // 生成新的编号：01A, 02A, 03A...
    const newFrameNumber = String(index + 1).padStart(2, '0') + 'A';
    return c.env.DB.prepare('UPDATE frames SET sort_order = ?, frame_number = ? WHERE id = ? AND roll_id = ?')
      .bind(index, newFrameNumber, frameId, rollId);
  });

  try {
    await c.env.DB.batch(statements);
    return c.json({ success: true });
  } catch (err: any) {
    console.error('Reorder error:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

/** POST /api/rolls/:id/frames/batch-delete - 批量删除底片 */
rolls.post('/:id/frames/batch-delete', authRequired(), requireLevel('lv2'), async (c) => {
  const rollId = c.req.param('id');
  const userId = c.get('userId');
  const { frameIds } = await c.req.json<{ frameIds: string[] }>();

  if (!frameIds?.length) return c.json({ success: false, error: '未提供底片ID' }, 400);

  // 1. 权限校验
  const roll = await c.env.DB.prepare('SELECT user_id FROM rolls WHERE id = ?').bind(rollId).first<{ user_id: number }>();
  if (!roll) return c.json({ success: false, error: '相册不存在' }, 404);
  if (String(roll.user_id) !== String(userId)) return c.json({ success: false, error: '无权操作' }, 403);

  // 2. 获取图片信息以同步删除图床
  const placeholders = frameIds.map(() => '?').join(',');
  const frames = await c.env.DB.prepare(
    `SELECT image_url, preview_url FROM frames WHERE roll_id = ? AND id IN (${placeholders})`
  ).bind(rollId, ...frameIds).all<{ image_url: string; preview_url: string }>();

  const settings = await c.env.DB.prepare(
    "SELECT key, value FROM system_settings WHERE key IN ('img_bed_url', 'img_bed_token')"
  ).all<{ key: string; value: string }>();
  const config = settings.results.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);
  
  const imgBedUrl = config['img_bed_url'] || c.env.IMG_BED_URL;
  const imgBedToken = config['img_bed_token'] || c.env.IMG_BED_TOKEN;

  if (imgBedUrl && imgBedToken) {
    for (const frame of frames.results || []) {
      const urlsToDelete = [frame.image_url, frame.preview_url].filter(Boolean);
      for (const imageUrl of urlsToDelete) {
        try {
          const url = new URL(imageUrl);
          let path = url.pathname;
          if (path.startsWith('/file/')) path = path.slice(6);
          else if (path.startsWith('/')) path = path.slice(1);
          
          const deleteUrl = `${imgBedUrl.replace(/\/$/, '')}/api/manage/delete/${path}`;
          await fetch(deleteUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${imgBedToken}` }
          });
        } catch (e) {
          console.error('[Rolls] Batch delete sync failed:', e);
        }
      }
    }
  }

  // 3. 批量删除数据库记录
  await c.env.DB.prepare(`DELETE FROM frames WHERE roll_id = ? AND id IN (${placeholders})`)
    .bind(rollId, ...frameIds)
    .run();

  return c.json({ success: true });
});

/** PUT /api/rolls/:rollId/frames/:frameId - 更新单张底片信息 */
rolls.put('/:rollId/frames/:frameId', authRequired(), requireLevel('lv2'), async (c) => {
  const rollId = c.req.param('rollId');
  const frameId = c.req.param('frameId');
  const userId = c.get('userId');

  // 1. 权限校验
  const roll = await c.env.DB.prepare('SELECT user_id FROM rolls WHERE id = ?').bind(rollId).first<{ user_id: number }>();
  if (!roll) return c.json({ success: false, error: '胶卷不存在' }, 404);
  if (String(roll.user_id) !== String(userId)) return c.json({ success: false, error: '无权操作他人的胶卷' }, 403);

  // 2. 检查帧是否存在
  const frame = await c.env.DB.prepare('SELECT id FROM frames WHERE id = ? AND roll_id = ?').bind(frameId, rollId).first();
  if (!frame) return c.json({ success: false, error: '帧不存在' }, 404);

  // 3. 处理更新数据
  const body = await c.req.json<{
    aperture?: string;
    shutterSpeed?: string;
    iso?: string;
    exposureCompensation?: string;
    shotDate?: string;
    location?: string;
    camera?: string;
    lens?: string;
    description?: string;
    tags?: string[] | string;
  }>();

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  const fieldMap: Record<string, string> = {
    aperture: 'aperture',
    shutterSpeed: 'shutter_speed',
    iso: 'iso',
    exposureCompensation: 'exposure_compensation',
    shotDate: 'shot_date',
    location: 'location',
    camera: 'camera',
    lens: 'lens',
    description: 'description'
  };

  for (const [tsKey, dbKey] of Object.entries(fieldMap)) {
    const val = body[tsKey as keyof typeof body];
    if (val !== undefined) {
      updates.push(`${dbKey} = ?`);
      values.push(val as string);
    }
  }

  if (body.tags !== undefined) {
    updates.push('tags = ?');
    let parsedTags = body.tags;
    if (typeof parsedTags === 'string') {
      try {
        parsedTags = JSON.parse(parsedTags);
      } catch (e) {
        parsedTags = [];
      }
    }
    values.push(JSON.stringify(parsedTags || []));
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: '没有需要更新的字段' }, 400);
  }

  values.push(frameId!);
  values.push(rollId!);

  await c.env.DB.prepare(
    `UPDATE frames SET ${updates.join(', ')} WHERE id = ? AND roll_id = ?`
  ).bind(...values).run();

  return c.json({ success: true });
});


export default rolls;
