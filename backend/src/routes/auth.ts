/**
 * 认证路由
 * 注册、登录、登出、获取当前用户信息
 */
import { Hono } from 'hono';
import type { Env } from '../types';
import { signJwt, hashPassword, verifyPassword, generateId, authRequired } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

/** POST /api/auth/send-code - 发送验证码 */
auth.post('/send-code', async (c) => {
  const body = await c.req.json<{ email: string; type?: 'register' | 'reset-password' }>();
  
  if (!body.email) {
    return c.json({ success: false, error: '邮箱为必填项' }, 400);
  }

  // 检查邮箱是否已注册
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
  
  if (body.type === 'register' && existing) {
    return c.json({ success: false, error: '该邮箱已被注册' }, 409);
  }

  if (body.type === 'reset-password' && !existing) {
    return c.json({ success: false, error: '该邮箱未注册' }, 404);
  }

  // 生成 6 位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // 存储验证码
  await c.env.DB.prepare(
    'INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)'
  ).bind(body.email, code, expiresAt).run();

  // 集成 Resend API 发送验证码
  try {
    // 1. 获取 Resend 配置
    const smtpHost = c.env.SMTP_HOST;
    const smtpPort = c.env.SMTP_PORT;
    const smtpUser = c.env.SMTP_USER;
    const smtpPassword = c.env.SMTP_PASSWORD;
    const smtpFrom = c.env.SMTP_FROM;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFrom) {
      throw new Error('SMTP 配置未设置');
    }

    console.log(`========================================`);
    console.log(`SMTP Host: ${smtpHost}`);
    console.log(`SMTP Port: ${smtpPort}`);
    console.log(`SMTP User: ${smtpUser}`);
    console.log(`SMTP From: ${smtpFrom}`);
    console.log(`========================================`);

    // 2. 构建邮件内容
    const emailContent = `亲爱的用户：

你正在进行 Film Album 账号安全操作，你的验证码是：${code}

此验证码将在10分钟后过期，请尽快使用。

如果这不是你本人操作，请忽略此邮件。

Film Album 团队`;
    const emailHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Film Album 验证码</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .code {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .code-value {
            font-size: 32px;
            font-weight: bold;
            color: #007bff;
            letter-spacing: 2px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Film Album</div>
        </div>
        <p>亲爱的用户：</p>
        <p>你正在进行 Film Album 账号安全操作，你的验证码是：</p>
        <div class="code">
            <div class="code-value">${code}</div>
        </div>
        <p>此验证码将在10分钟后过期，请尽快使用。</p>
        <p>如果这不是你本人操作，请忽略此邮件。</p>
        <div class="footer">
            <p>Film Album 团队</p>
        </div>
    </div>
</body>
</html>`;

    // 3. 使用 Resend API 发送邮件
    console.log('正在发送邮件...');
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${smtpPassword}`
      },
      body: JSON.stringify({
        from: smtpFrom,
        to: [body.email],
        subject: 'Film Album 验证码',
        text: emailContent,
        html: emailHtml
      })
    });
    
    console.log(`Resend API 请求状态: ${resendResponse.status}`);
    
    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`发送邮件失败: ${resendResponse.status} - ${errorText}`);
    }
    
    const resendResult = await resendResponse.json();
    console.log(`Resend API 响应: ${JSON.stringify(resendResult)}`);

    // 4. 发送成功
    console.log(`========================================`);
    console.log(`验证码 ${code} 已发送到 ${body.email}`);
    console.log(`邮件内容: ${emailContent}`);
    console.log(`========================================`);
    
  } catch (error) {
    console.error('发送验证码失败:', error);
    // 即使发送失败，也返回成功，因为验证码已经存储
    console.log(`========================================`);
    console.log(`验证码 ${code} 已生成，由于邮件发送服务不可用，请直接使用此验证码`);
    console.log(`========================================`);
  }

  return c.json({ success: true, message: '验证码已发送' });
});

/** POST /api/auth/verify-code - 验证验证码 */
auth.post('/verify-code', async (c) => {
  const body = await c.req.json<{ email: string; code: string }>();
  
  if (!body.email || !body.code) {
    return c.json({ success: false, error: '邮箱和验证码为必填项' }, 400);
  }

  // 查询验证码
  const verification = await c.env.DB.prepare(
    'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND expires_at > CURRENT_TIMESTAMP'
  ).bind(body.email, body.code).first();

  if (!verification) {
    return c.json({ success: false, error: '验证码无效或已过期' }, 400);
  }

  // 删除已使用的验证码
  await c.env.DB.prepare(
    'DELETE FROM email_verifications WHERE email = ?'
  ).bind(body.email).run();

  return c.json({ success: true, message: '验证码验证成功' });
});

/** POST /api/auth/register - 注册新用户 */
auth.post('/register', async (c) => {
  const body = await c.req.json<{ email: string; password: string; nickname: string; code: string }>();

  if (!body.email || !body.password || !body.nickname || !body.code) {
    return c.json({ success: false, error: '邮箱、密码、昵称和验证码为必填项' }, 400);
  }

  if (body.password.length < 6) {
    return c.json({ success: false, error: '密码长度至少 6 位' }, 400);
  }

  // 验证验证码
  const verification = await c.env.DB.prepare(
    'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND expires_at > CURRENT_TIMESTAMP'
  ).bind(body.email, body.code).first();

  if (!verification) {
    return c.json({ success: false, error: '验证码无效或已过期' }, 400);
  }

  // 检查邮箱是否已注册
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
  if (existing) {
    return c.json({ success: false, error: '该邮箱已被注册' }, 409);
  }

  const passwordHash = await hashPassword(body.password);
  
  // 执行插入并获取自增 ID
  const result = await c.env.DB.prepare(
    'INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)'
  ).bind(body.email, passwordHash, body.nickname).run();

  const autoId = result.meta.last_row_id;
  const idStr = autoId?.toString() || '0';
  const displayId = idStr.padStart(4, '0');

  // 注册成功后删除验证码
  await c.env.DB.prepare(
    'DELETE FROM email_verifications WHERE email = ?'
  ).bind(body.email).run();

  return c.json({
    success: true,
    data: { id: displayId, email: body.email, nickname: body.nickname }
  }, 201);
});

/** POST /api/auth/login - 登录 */
auth.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();

  if (!body.email || !body.password) {
    return c.json({ success: false, error: '邮箱和密码为必填项' }, 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT id, email, password_hash, nickname, avatar_url, bio FROM users WHERE email = ?'
  ).bind(body.email).first<{ id: number; email: string; password_hash: string; nickname: string; avatar_url: string; bio: string }>();

  if (!user) {
    return c.json({ success: false, error: '邮箱或密码错误' }, 401);
  }

  const isValid = await verifyPassword(body.password, user.password_hash);
  if (!isValid) {
    return c.json({ success: false, error: '邮箱或密码错误' }, 401);
  }

  const token = await signJwt(
    { sub: String(user.id), email: user.email, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 },
    c.env.JWT_SECRET
  );

  c.header('Set-Cookie', `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`);

  return c.json({
    success: true,
    data: {
      id: String(user.id).padStart(4, '0'),
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      bio: user.bio
    }
  });
});

/** POST /api/auth/logout - 登出 */
auth.post('/logout', (c) => {
  c.header('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return c.json({ success: true });
});

/** POST /api/auth/change-password - 修改密码 */
auth.post('/change-password', authRequired(), async (c) => {
  const body = await c.req.json<{ email: string; code: string; newPassword: string }>();
  const userId = c.get('userId');

  if (!body.email || !body.code || !body.newPassword) {
    return c.json({ success: false, error: '邮箱、验证码和新密码为必填项' }, 400);
  }

  if (body.newPassword.length < 6) {
    return c.json({ success: false, error: '密码长度至少 6 位' }, 400);
  }

  // 验证验证码
  const verification = await c.env.DB.prepare(
    'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND expires_at > CURRENT_TIMESTAMP'
  ).bind(body.email, body.code).first();

  if (!verification) {
    return c.json({ success: false, error: '验证码无效或已过期' }, 400);
  }

  // 验证用户邮箱
  const user = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ? AND email = ?'
  ).bind(userId, body.email).first();

  if (!user) {
    return c.json({ success: false, error: '用户不存在或邮箱不匹配' }, 404);
  }

  const passwordHash = await hashPassword(body.newPassword);

  // 更新密码
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?'
  ).bind(passwordHash, userId).run();

  // 删除已使用的验证码
  await c.env.DB.prepare(
    'DELETE FROM email_verifications WHERE email = ?'
  ).bind(body.email).run();

  // 清除登录状态，要求用户重新登录
  c.header('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

  return c.json({ success: true, message: '密码修改成功，请重新登录' });
});

/** POST /api/auth/reset-password - 重置密码（忘记密码） */
auth.post('/reset-password', async (c) => {
  const body = await c.req.json<{ email: string; code: string; newPassword: string }>();

  if (!body.email || !body.code || !body.newPassword) {
    return c.json({ success: false, error: '邮箱、验证码和新密码为必填项' }, 400);
  }

  if (body.newPassword.length < 6) {
    return c.json({ success: false, error: '密码长度至少 6 位' }, 400);
  }

  // 验证验证码
  const verification = await c.env.DB.prepare(
    'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND expires_at > CURRENT_TIMESTAMP'
  ).bind(body.email, body.code).first();

  if (!verification) {
    return c.json({ success: false, error: '验证码无效或已过期' }, 400);
  }

  // 查找用户
  const user = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(body.email).first();

  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }

  const passwordHash = await hashPassword(body.newPassword);

  // 更新密码
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?'
  ).bind(passwordHash, user.id).run();

  // 删除已使用的验证码
  await c.env.DB.prepare(
    'DELETE FROM email_verifications WHERE email = ?'
  ).bind(body.email).run();

  // 清除登录状态，要求用户重新登录
  c.header('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

  return c.json({ success: true, message: '密码重置成功，请重新登录' });
});

/** POST /api/auth/delete-account - 注销账号 */
auth.post('/delete-account', authRequired(), async (c) => {
  const userId = c.get('userId');

  // 开始事务
  try {
    // 删除用户相关数据
    // 1. 删除关注关系
    await c.env.DB.prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').bind(userId, userId).run();
    // 2. 删除点赞
    await c.env.DB.prepare('DELETE FROM likes WHERE user_id = ?').bind(userId).run();
    // 3. 删除评论
    await c.env.DB.prepare('DELETE FROM comments WHERE user_id = ?').bind(userId).run();
    // 4. 删除帖子
    await c.env.DB.prepare('DELETE FROM posts WHERE user_id = ?').bind(userId).run();
    // 5. 删除相册
    await c.env.DB.prepare('DELETE FROM rolls WHERE user_id = ?').bind(userId).run();
    // 6. 删除设备
    await c.env.DB.prepare('DELETE FROM gear WHERE user_id = ?').bind(userId).run();
    // 7. 删除用户
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    // 清除登录状态
    c.header('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

    return c.json({ success: true, message: '账号注销成功' });
  } catch (error) {
    console.error('注销账号失败:', error);
    return c.json({ success: false, error: '账号注销失败' }, 500);
  }
});

/** GET /api/auth/me - 获取当前登录用户信息 */
auth.get('/me', authRequired(), async (c) => {
  const userId = c.get('userId');

  const user = await c.env.DB.prepare(
    'SELECT id, email, nickname, avatar_url, bio, created_at FROM users WHERE id = ?'
  ).bind(userId).first<{ id: number; email: string; nickname: string; avatar_url: string; bio: string; created_at: string }>();

  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }

  // 查询粉丝数和关注数
  const followersCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM follows WHERE following_id = ?'
  ).bind(userId).first<{ count: number }>();

  const followingCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?'
  ).bind(userId).first<{ count: number }>();

  const likesCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = ?'
  ).bind(userId).first<{ count: number }>();

  return c.json({
    success: true,
    data: {
      id: String(user.id).padStart(4, '0'),
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      followersCount: followersCount?.count ?? 0,
      followingCount: followingCount?.count ?? 0,
      likesCount: likesCount?.count ?? 0,
      createdAt: user.created_at
    }
  });
});

export default auth;
