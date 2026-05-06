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

  // NOTE: 管理员 Token 使用独立的 role 字段标识身份，与普通用户 Token 区分
  const secret = await getJwtSecret(c.env);
  const payload = { role: 'admin', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 24 * 3600 };
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const body64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${body64}`));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const adminToken = `${header}.${body64}.${sigStr}`;

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
  
  const users = await c.env.DB.prepare(
    'SELECT id, email, nickname, level, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  return c.json({
    success: true,
    data: {
      users: users.results,
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

  if (!['lv1', 'lv2', 'lv3'].includes(body.level)) {
    return c.json({ success: false, error: '无效的用户等级' }, 400);
  }

  await c.env.DB.prepare('UPDATE users SET level = ? WHERE id = ?').bind(body.level, id).run();

  return c.json({ success: true, message: '用户等级已更新' });
});

/** POST /api/admin/users - 手动创建用户 */
admin.post('/users', adminAuthRequired(), async (c) => {
  const body = await c.req.json<{ email: string; password: string; nickname: string; level: string }>();

  if (!body.email || !body.password || !body.nickname) {
    return c.json({ success: false, error: '邮箱、密码和昵称是必填项' }, 400);
  }

  const level = ['lv1', 'lv2', 'lv3'].includes(body.level) ? body.level : 'lv1';

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

export default admin;
