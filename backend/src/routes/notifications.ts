/**
 * 通知路由
 * 获取点赞、评论、系统通知列表，支持计数与已读标记
 */
import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired } from '../middleware/auth';

const notifications = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

/** GET /api/notifications/counts - 获取各分类未读计数 */
notifications.get('/counts', authRequired(), async (c) => {
  const userId = parseInt(c.get('userId') as string);

  const counts = await c.env.DB.prepare(`
    SELECT type, COUNT(*) as count
    FROM notifications
    WHERE receiver_id = ? AND is_read = 0
    GROUP BY type
  `).bind(userId).all();

  const result = {
    LIKE: 0,
    COMMENT: 0,
    SYSTEM: 0
  };

  counts.results?.forEach((r: any) => {
    if (r.type in result) {
      (result as any)[r.type] = r.count;
    }
  });

  return c.json({ success: true, data: result });
});

/** GET /api/notifications - 获取通知列表 */
notifications.get('/', authRequired(), async (c) => {
  const userId = parseInt(c.get('userId') as string);
  const type = c.req.query('type'); // LIKE, COMMENT, SYSTEM
  const page = parseInt(c.req.query('page') ?? '1');
  const pageSize = parseInt(c.req.query('pageSize') ?? '20');
  const offset = (page - 1) * pageSize;

  let query = `
    SELECT n.*, 
           u.nickname as sender_name, u.avatar_url as sender_avatar,
           p.title as post_title
    FROM notifications n
    JOIN users u ON n.sender_id = u.id
    LEFT JOIN posts p ON n.post_id = p.id
    WHERE n.receiver_id = ?
  `;
  const params: any[] = [userId];

  if (type) {
    query += ` AND n.type = ?`;
    params.push(type);
  }

  query += ` ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    success: true,
    data: result.results?.map((n: any) => ({
      id: n.id,
      type: n.type,
      sender: {
        id: n.sender_id.toString().padStart(4, '0'),
        nickname: n.sender_name,
        avatarUrl: n.sender_avatar
      },
      post: n.post_id ? {
        id: n.post_id,
        title: n.post_title
      } : null,
      content: n.content,
      isRead: n.is_read === 1,
      createdAt: n.created_at
    })) ?? []
  });
});

/** PUT /api/notifications/read-all - 一键已读 */
notifications.put('/read-all', authRequired(), async (c) => {
  const userId = parseInt(c.get('userId') as string);
  const type = c.req.query('type');

  let query = `UPDATE notifications SET is_read = 1 WHERE receiver_id = ? AND is_read = 0`;
  const params: any[] = [userId];

  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }

  await c.env.DB.prepare(query).bind(...params).run();

  return c.json({ success: true });
});

/** PUT /api/notifications/:id/read - 标记单条已读 */
notifications.put('/:id/read', authRequired(), async (c) => {
  const userId = parseInt(c.get('userId') as string);
  const id = c.req.param('id');

  await c.env.DB.prepare(`
    UPDATE notifications SET is_read = 1 WHERE id = ? AND receiver_id = ?
  `).bind(id, userId).run();

  return c.json({ success: true });
});

export default notifications;
