import { Hono } from 'hono';
import type { Env } from '../types';
import { hashPassword, signJwt, verifyJwt } from '../middleware/auth';

const admin = new Hono<{ Bindings: Env; Variables: { isAdmin: boolean } }>();

// 简单的管理员验证中间件
const adminAuthRequired = () => {
  return async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: '未授权访问' }, 401);
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = await verifyJwt(token, c.env.JWT_SECRET);
      if (payload.role !== 'admin') {
        return c.json({ success: false, error: '权限不足' }, 403);
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

  const token = await signJwt(
    { role: 'admin', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 24 * 3600 },
    c.env.JWT_SECRET
  );

  return c.json({
    success: true,
    data: { token }
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

export default admin;
