import { Hono } from 'hono';
import type { Env } from '../types';
import { hashPassword, signJwt, verifyJwt, getJwtSecret } from '../middleware/auth';

const admin = new Hono<{ Bindings: Env; Variables: { isAdmin: boolean } }>();

/** 管理员 JWT Payload */
interface AdminPayload {
  role: string;
  iat: number;
  exp: number;
}

// 简单的管理员验证中间件
const adminAuthRequired = () => {
  return async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: '未授权访问' }, 401);
    }

    const token = authHeader.split(' ')[1];
    try {
      const secret = await getJwtSecret(c.env);
      // 1. 验证签名并解析 payload
      const payload = await verifyJwt(token, secret) as (AdminPayload & { role: string }) | null;
      
      if (!payload || payload.role !== 'admin') {
        return c.json({ success: false, error: '权限不足或令牌无效' }, 403);
      }
      
      c.set('isAdmin', true);
      await next();
    } catch (e) {
      return c.json({ success: false, error: '无效或过期的令牌' }, 401);
    }
  };
};

/** POST /api/admin/login - 管理员登录 */
admin.post('/login', async (c) => {
  const body = await c.req.json<{ password: string }>();

  if (!body.password) {
    return c.json({ success: false, error: '需要密码' }, 400);
  }

  if (body.password !== c.env.ADMIN_PASSWORD) {
    return c.json({ success: false, error: '密码错误' }, 401);
  }

  // NOTE: 管理员 Token 必须使用独立的 role 字段标识身份，与普通用户 Token 区分。
  // 此处原先硬编码拼接 Base64 在一些 Edge 环境（如 Cloudflare Workers）下，由于
  // 字符串处理多字节导致二进制签名比对失败，引发后续所有管理员 GET 请求 403 权限不足。
  // 现统一改用底层的标准 signJwt 进行安全且环境兼容的 JWT 生成。
  const secret = await getJwtSecret(c.env);
  const payload = { 
    sub: 'admin',
    email: 'admin@films.com',
    role: 'admin', 
    iat: Math.floor(Date.now() / 1000), 
    exp: Math.floor(Date.now() / 1000) + 24 * 3600 
  };
  const adminToken = await signJwt(payload as any, secret);

  return c.json({
    success: true,
    data: { token: adminToken }
  });
});

/** GET /api/admin/stats - 获取统计数据 */
admin.get('/stats', adminAuthRequired(), async (c) => {
  const usersCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  const rollsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM rolls').first<{ count: number }>();
  
  return c.json({
    success: true,
    data: {
      users: usersCount?.count || 0,
      rolls: rollsCount?.count || 0
    }
  });
});

/** GET /api/admin/settings - 获取所有系统设置 */
admin.get('/settings', adminAuthRequired(), async (c) => {
  const settings = await c.env.DB.prepare('SELECT key, value FROM system_settings').all<{ key: string; value: string }>();
  
  const settingsMap = settings.results.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  // 确保有默认值
  if (!settingsMap['open_registration']) settingsMap['open_registration'] = 'true';
  if (!settingsMap['default_language']) settingsMap['default_language'] = 'zh-CN';
  if (!settingsMap['lv2_roll_limit']) settingsMap['lv2_roll_limit'] = '10';
  if (!settingsMap['img_bed_path']) settingsMap['img_bed_path'] = '/FilmAlbum/';
  if (!settingsMap['img_bed_channel']) settingsMap['img_bed_channel'] = 'huggingface';
  if (!settingsMap['img_bed_name_type']) settingsMap['img_bed_name_type'] = 'index';
  if (!settingsMap['api_base_url']) settingsMap['api_base_url'] = '';
  if (!settingsMap['user_levels']) settingsMap['user_levels'] = '[{"value":"lv1","label":"LV1","description":"只读权限","roll_limit":0,"gear_limit":0,"can_post":false,"can_comment":false},{"value":"lv2","label":"LV2","description":"标准权限","roll_limit":10,"gear_limit":5,"can_post":true,"can_comment":true},{"value":"lv3","label":"LV3","description":"无限制","roll_limit":999,"gear_limit":999,"can_post":true,"can_comment":true}]';
  if (!settingsMap['roll_formats']) settingsMap['roll_formats'] = '[{"format":"135","label":"35mm (135)","frames":["半格","35mm","xpan"]},{"format":"120","label":"中画幅 (120)","frames":["620","630","645","6x6","6x7","6x9"]}]';
  if (!settingsMap['film_types']) settingsMap['film_types'] = '["彩色负片","黑白负片","彩色反转片","黑白反转片"]';

  return c.json({
    success: true,
    data: settingsMap
  });
});

/** PUT /api/admin/settings - 更新系统设置 */
admin.put('/settings', adminAuthRequired(), async (c) => {
  const body = await c.req.json<{ key: string; value: string }>();

  if (!body.key || body.value === undefined) {
    return c.json({ success: false, error: '缺少参数' }, 400);
  }

  await c.env.DB.prepare(
    'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP'
  ).bind(body.key, String(body.value), String(body.value)).run();

  return c.json({ success: true, message: '设置已更新' });
});

/** GET /api/admin/users - 获取用户列表 */
admin.get('/users', adminAuthRequired(), async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  
  const usersResult = await c.env.DB.prepare(
    'SELECT u.id, u.email, u.nickname, u.level, u.created_at, (SELECT COUNT(*) FROM rolls WHERE user_id = u.id) as roll_count FROM users u ORDER BY u.id DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const mappedUsers = usersResult.results?.map((user: any) => ({
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    level: user.level,
    rollCount: user.roll_count,
    createdAt: user.created_at
  })) || [];

  return c.json({
    success: true,
    data: {
      users: mappedUsers,
      total: total?.count || 0,
      page,
      limit
    }
  });
});

/** PUT /api/admin/users/:id/level - 修改用户等级 */
admin.put('/users/:id/level', adminAuthRequired(), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ level: string }>();

  // 从设置中获取有效等级
  const levelsSetting = await c.env.DB.prepare("SELECT value FROM system_settings WHERE key = 'user_levels'").first<{ value: string }>();
  const validLevels = levelsSetting ? JSON.parse(levelsSetting.value).map((l: any) => l.value) : ['lv1', 'lv2', 'lv3'];

  if (!validLevels.includes(body.level)) {
    return c.json({ success: false, error: '无效的用户等级' }, 400);
  }

  await c.env.DB.prepare('UPDATE users SET level = ? WHERE id = ?').bind(body.level, id).run();

  return c.json({ success: true, message: '用户等级已更新' });
});

/** PUT /api/admin/users/:id/password - 超级管理员修改指定用户的密码 */
admin.put('/users/:id/password', adminAuthRequired(), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ password?: string }>();

  if (!body.password || body.password.trim().length < 6) {
    return c.json({ success: false, error: '新密码不能为空且长度至少为 6 位' }, 400);
  }

  // 检查目标用户是否存在
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }

  // 哈希加密密码
  const passwordHash = await hashPassword(body.password);
  
  // 更新密码哈希
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, id).run();

  return c.json({ success: true, message: '用户密码更新成功' });
});

/** POST /api/admin/users - 手动创建用户 */
admin.post('/users', adminAuthRequired(), async (c) => {
  const body = await c.req.json<{ email: string; password: string; nickname: string; level: string }>();

  if (!body.email || !body.password || !body.nickname) {
    return c.json({ success: false, error: '邮箱、密码和昵称是必填项' }, 400);
  }

  // 从设置中获取有效等级
  const levelsSetting = await c.env.DB.prepare("SELECT value FROM system_settings WHERE key = 'user_levels'").first<{ value: string }>();
  const validLevels = levelsSetting ? JSON.parse(levelsSetting.value).map((l: any) => l.value) : ['lv1', 'lv2', 'lv3'];
  const level = validLevels.includes(body.level) ? body.level : (validLevels[0] || 'lv1');

  // 检查邮箱是否存在
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
  if (existing) {
    return c.json({ success: false, error: '该邮箱已被注册' }, 409);
  }

  const passwordHash = await hashPassword(body.password);

  await c.env.DB.prepare(
    'INSERT INTO users (email, password_hash, nickname, level) VALUES (?, ?, ?, ?)'
  ).bind(body.email, passwordHash, body.nickname, level).run();

  return c.json({ success: true, message: '用户创建成功' });
});

/**
 * PUT /api/admin/settings/batch - 批量更新系统设置
 * 用于一次性保存多个配置项（图床/SMTP 等）
 */
admin.put('/settings/batch', adminAuthRequired(), async (c) => {
  const body = await c.req.json<Record<string, string>>();

  if (!body || typeof body !== 'object') {
    return c.json({ success: false, error: '请求体格式错误' }, 400);
  }

  const entries = Object.entries(body);
  if (entries.length === 0) {
    return c.json({ success: false, error: '没有需要更新的配置' }, 400);
  }

  // NOTE: D1 暂不支持 batch 事务，逐条 upsert
  for (const [key, value] of entries) {
    await c.env.DB.prepare(
      'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP'
    ).bind(key, String(value), String(value)).run();
  }

  return c.json({ success: true, message: `已更新 ${entries.length} 项配置` });
});

/**
 * POST /api/admin/test-email - 发送测试邮件
 * 用于在保存 SMTP 配置后验证是否生效
 */
admin.post('/test-email', adminAuthRequired(), async (c) => {
  const body = await c.req.json<{ to: string }>();
  if (!body.to) return c.json({ success: false, error: '请提供收件人邮箱' }, 400);

  // 从数据库读取 SMTP 配置
  const settings = await c.env.DB.prepare(
    "SELECT key, value FROM system_settings WHERE key IN ('smtp_password', 'smtp_from')"
  ).all<{ key: string; value: string }>();

  const map = settings.results.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);

  const apiKey = map['smtp_password'] || c.env.SMTP_PASSWORD;
  const from   = map['smtp_from']    || c.env.SMTP_FROM;

  if (!apiKey || !from) {
    return c.json({ success: false, error: 'SMTP/Resend 配置不完整，请先保存配置' }, 400);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [body.to],
        subject: 'Film Album — 测试邮件',
        html: '<p>这是一封来自 Film Album 管理后台的测试邮件，说明邮件服务配置正常。</p>'
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return c.json({ success: false, error: `Resend 返回错误: ${err}` }, 502);
    }

    return c.json({ success: true, message: '测试邮件已发送' });
  } catch (err) {
    return c.json({ success: false, error: `发送失败: ${String(err)}` }, 500);
  }
});

/**
 * GET /api/admin/film-stocks - 管理员获取胶卷型号列表（支持筛选）
 */
admin.get('/film-stocks', adminAuthRequired(), async (c) => {
  const search   = c.req.query('search')   || '';
  const format   = c.req.query('format')   || '';
  const filmType = c.req.query('filmType') || '';

  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (search) {
    where += ' AND (brand LIKE ? OR brand_zh LIKE ? OR model LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (format) {
    where += ' AND format = ?';
    params.push(format);
  }
  if (filmType) {
    where += ' AND film_type = ?';
    params.push(filmType);
  }

  const result = await c.env.DB.prepare(
    `SELECT * FROM film_stocks ${where} ORDER BY brand, model, iso`
  ).bind(...params).all();

  const data = result.results?.map((row: any) => ({
    id:        row.id,
    brand:     row.brand,
    brandZh:   row.brand_zh,
    model:     row.model,
    iso:       row.iso,
    format:    row.format,
    filmType:  row.film_type,
    process:   row.process,
    brandLogo: row.brand_logo,
    createdAt: row.created_at,
  })) ?? [];

  return c.json({ success: true, data });
});

/**
 * POST /api/admin/film-stocks - 管理员新建胶卷型号
 */
admin.post('/film-stocks', adminAuthRequired(), async (c) => {
  try {
    const body = await c.req.json<{
      brand: string; model: string; iso: number;
      format: string; filmType: string; process: string;
      brandLogo?: string; brandZh?: string;
    }>();

    if (!body.brand || !body.model || !body.iso || !body.format || !body.filmType || !body.process) {
      return c.json({ success: false, error: '所有字段为必填项' }, 400);
    }

    // 防重复
    const existing = await c.env.DB.prepare(
      'SELECT id FROM film_stocks WHERE brand = ? AND model = ? AND iso = ?'
    ).bind(body.brand, body.model, body.iso).first();
    if (existing) return c.json({ success: false, error: '该胶卷型号已存在' }, 409);

    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    await c.env.DB.prepare(
      `INSERT INTO film_stocks (id, brand, brand_zh, model, iso, format, film_type, process, brand_logo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, body.brand, body.brandZh || '', body.model, body.iso, body.format, body.filmType, body.process, body.brandLogo || '').run();

    return c.json({ success: true, data: { id, ...body } }, 201);
  } catch (err: any) {
    console.error('Admin POST film-stock error:', err);
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

/**
 * PUT /api/admin/film-stocks/:id - 管理员更新胶卷型号
 */
admin.put('/film-stocks/:id', adminAuthRequired(), async (c) => {
  try {
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare('SELECT id FROM film_stocks WHERE id = ?').bind(id).first();
    if (!existing) return c.json({ success: false, error: '胶卷型号不存在' }, 404);

    const body = await c.req.json<{
      brand?: string; model?: string; iso?: number;
      format?: string; filmType?: string; process?: string;
      brandLogo?: string; brandZh?: string;
    }>();

    const fieldMap: Record<string, string> = {
      brand: 'brand', brandZh: 'brand_zh', model: 'model', iso: 'iso',
      format: 'format', filmType: 'film_type', process: 'process',
      brandLogo: 'brand_logo',
    };

    const updates: string[] = [];
    const values: (string | number)[] = [];

    for (const [key, col] of Object.entries(fieldMap)) {
      const val = (body as any)[key];
      if (val !== undefined) {
        updates.push(`${col} = ?`);
        values.push(val);
      }
    }

    if (updates.length === 0) return c.json({ success: false, error: '没有需要更新的字段' }, 400);

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE film_stocks SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updated = await c.env.DB.prepare('SELECT * FROM film_stocks WHERE id = ?').bind(id).first<any>();
    return c.json({
      success: true,
      data: {
        id: updated.id, brand: updated.brand, brandZh: updated.brand_zh, model: updated.model,
        iso: updated.iso, format: updated.format,
        filmType: updated.film_type, process: updated.process,
        brandLogo: updated.brand_logo,
      }
    });
  } catch (err: any) {
    console.error('Admin PUT film-stock error:', err);
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

/**
 * DELETE /api/admin/film-stocks/:id - 管理员删除胶卷型号
 */
admin.delete('/film-stocks/:id', adminAuthRequired(), async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM film_stocks WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ success: false, error: '胶卷型号不存在' }, 404);

  await c.env.DB.prepare('DELETE FROM film_stocks WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

/**
 * GET /api/admin/system/backup - 系统备份
 * query: includeContent=true/false
 */
admin.get('/system/backup', adminAuthRequired(), async (c) => {
  const includeContent = c.req.query('includeContent') === 'true';
  
  const CORE_TABLES = ['users', 'system_settings', 'film_stocks'];
  const CONTENT_TABLES = [
    'rolls', 'frames', 'gear', 'posts', 'post_images', 
    'likes', 'comments', 'follows', 'messages', 'notifications'
  ];

  const targetTables = includeContent ? [...CORE_TABLES, ...CONTENT_TABLES] : CORE_TABLES;
  const backupData: Record<string, any[]> = {};

  try {
    for (const table of targetTables) {
      const result = await c.env.DB.prepare(`SELECT * FROM ${table}`).all();
      backupData[table] = result.results || [];
    }

    return c.json({
      success: true,
      data: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        includeContent,
        tables: backupData
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: `备份失败: ${err.message}` }, 500);
  }
});

/**
 * POST /api/admin/system/restore - 系统还原
 */
admin.post('/system/restore', adminAuthRequired(), async (c) => {
  try {
    const body = await c.req.json<{ tables: Record<string, any[]> }>();
    if (!body.tables) return c.json({ success: false, error: '无效的备份文件' }, 400);

    const tablesToRestore = Object.keys(body.tables);
    
    // 开始还原流程
    // 注意：由于 D1 的限制，我们手动处理清理和插入
    for (const table of tablesToRestore) {
      const rows = body.tables[table];
      if (!Array.isArray(rows)) continue;

      // 1. 清理现有数据
      await c.env.DB.prepare(`DELETE FROM ${table}`).run();

      // 2. 批量插入新数据
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        const stmt = c.env.DB.prepare(query);
        
        // 分批处理以避免 D1 限制（每批 100 条）
        const batchSize = 50;
        for (let i = 0; i < rows.length; i += batchSize) {
          const chunk = rows.slice(i, i + batchSize);
          const batchStmts = chunk.map(row => {
            const values = columns.map(col => {
              const val = row[col];
              // 处理 JSON 字符串或对象
              if (typeof val === 'object' && val !== null) return JSON.stringify(val);
              return val;
            });
            return stmt.bind(...values);
          });
          await c.env.DB.batch(batchStmts);
        }
      }
    }

    return c.json({ success: true, message: '系统已成功从备份中恢复' });
  } catch (err: any) {
    console.error('Restore error:', err);
    return c.json({ success: false, error: `还原失败: ${err.message}` }, 500);
  }
});

export default admin;
