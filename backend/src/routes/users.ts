/**
 * 用户路由
 * 用户资料查看/编辑、关注/取消关注、粉丝列表
 */
import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired, authOptional } from '../middleware/auth';

const users = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

/** GET /api/users/:id - 获取用户资料 */
users.get('/:id', authOptional(), async (c) => {
  const targetId = c.req.param('id');
  const idNum = parseInt(targetId!);
  const currentUserId = c.get('userId');

  const user = await c.env.DB.prepare(
    'SELECT id, email, nickname, avatar_url, bio, created_at FROM users WHERE id = ?'
  ).bind(idNum).first<{ id: number; email: string; nickname: string; avatar_url: string; bio: string; created_at: string }>();

  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }

  const followersCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM follows WHERE following_id = ?'
  ).bind(idNum).first<{ count: number }>();

  const followingCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?'
  ).bind(idNum).first<{ count: number }>();

  const likesCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = ?'
  ).bind(idNum).first<{ count: number }>();

  // 当前用户是否已关注
  let isFollowing = false;
  if (currentUserId) {
    const follow = await c.env.DB.prepare(
      'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
    ).bind(currentUserId, idNum).first();
    isFollowing = !!follow;
  }

  return c.json({
    success: true,
    data: {
      id: user.id.toString().padStart(4, '0'),
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      followersCount: followersCount?.count ?? 0,
      followingCount: followingCount?.count ?? 0,
      likesCount: likesCount?.count ?? 0,
      isFollowing,
      isOwner: currentUserId ? Number(currentUserId) === Number(user.id) : false,
      createdAt: user.created_at
    }
  });
});

/** PUT /api/users/:id - 更新用户资料 */
users.put('/:id', authRequired(), async (c) => {
  const targetId = c.req.param('id');
  const idNum = parseInt(targetId!);
  const currentUserId = c.get('userId');

  if (targetId !== currentUserId?.toString().padStart(4, '0')) {
    return c.json({ success: false, error: '无权修改他人资料' }, 403);
  }

  const body = await c.req.json<{ nickname?: string; bio?: string; avatarUrl?: string }>();
  const updates: string[] = [];
  const values: string[] = [];

  if (body.nickname !== undefined) {
    updates.push('nickname = ?');
    values.push(body.nickname);
  }
  if (body.bio !== undefined) {
    updates.push('bio = ?');
    values.push(body.bio);
  }
  if (body.avatarUrl !== undefined) {
    updates.push('avatar_url = ?');
    values.push(body.avatarUrl);
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: '没有需要更新的字段' }, 400);
  }

  updates.push("updated_at = datetime('now')");

  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values, idNum).run();

  return c.json({ success: true });
});

/** POST /api/users/:id/follow - 关注用户 */
users.post('/:id/follow', authRequired(), async (c) => {
  const targetId = c.req.param('id');
  const currentUserId = c.get('userId');

  if (targetId === currentUserId) {
    return c.json({ success: false, error: '不能关注自己' }, 400);
  }

  // 检查目标用户是否存在
  const targetUser = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(targetId).first();
  if (!targetUser) {
    return c.json({ success: false, error: '用户不存在' }, 404);
  }

  try {
    await c.env.DB.prepare(
      'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)'
    ).bind(currentUserId, targetId).run();
  } catch {
    // 已经关注过，忽略重复插入错误
  }

  return c.json({ success: true });
});

/** DELETE /api/users/:id/follow - 取消关注 */
users.delete('/:id/follow', authRequired(), async (c) => {
  const targetId = c.req.param('id');
  const currentUserId = c.get('userId');

  await c.env.DB.prepare(
    'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
  ).bind(currentUserId, targetId).run();

  return c.json({ success: true });
});

/** GET /api/users/:id/followers - 获取粉丝列表 */
users.get('/:id/followers', async (c) => {
  const targetId = c.req.param('id');
  const page = parseInt(c.req.query('page') ?? '1');
  const pageSize = parseInt(c.req.query('pageSize') ?? '20');
  const offset = (page - 1) * pageSize;

  const total = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM follows WHERE following_id = ?'
  ).bind(Number(targetId)).first<{ count: number }>();

  const followers = await c.env.DB.prepare(
    `SELECT u.id, u.nickname, u.avatar_url, u.bio
     FROM follows f JOIN users u ON f.follower_id = u.id
     WHERE f.following_id = ?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(Number(targetId), pageSize, offset).all();

  return c.json({
    success: true,
    data: followers.results?.map((f: Record<string, any>) => ({
      id: f.id.toString().padStart(4, '0'),
      nickname: f.nickname,
      avatarUrl: f.avatar_url,
      bio: f.bio
    })) ?? [],
    pagination: {
      page,
      pageSize,
      total: total?.count ?? 0,
      totalPages: Math.ceil((total?.count ?? 0) / pageSize)
    }
  });
});

/** GET /api/users/:id/following - 获取关注列表 */
users.get('/:id/following', async (c) => {
  const targetId = c.req.param('id');
  const page = parseInt(c.req.query('page') ?? '1');
  const pageSize = parseInt(c.req.query('pageSize') ?? '20');
  const offset = (page - 1) * pageSize;

  const total = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?'
  ).bind(Number(targetId)).first<{ count: number }>();

  const following = await c.env.DB.prepare(
    `SELECT u.id, u.nickname, u.avatar_url, u.bio
     FROM follows f JOIN users u ON f.following_id = u.id
     WHERE f.follower_id = ?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(Number(targetId), pageSize, offset).all();

  return c.json({
    success: true,
    data: following.results?.map((f: Record<string, any>) => ({
      id: f.id.toString().padStart(4, '0'),
      nickname: f.nickname,
      avatarUrl: f.avatar_url,
      bio: f.bio
    })) ?? [],
    pagination: {
      page,
      pageSize,
      total: total?.count ?? 0,
      totalPages: Math.ceil((total?.count ?? 0) / pageSize)
    }
  });
});

export default users;
