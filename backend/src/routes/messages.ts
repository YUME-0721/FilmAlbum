/**
 * 消息路由
 * 实现私信列表、聊天详情、发送消息、已读标记
 */
import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const messages = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

/** GET /api/messages - 获取会话列表 */
messages.get('/', authRequired(), async (c) => {
  const currentUserId = parseInt(c.get('userId') as string);

  // 获取会话列表：每个联系人的最后一条消息
  // 注意：SQLite 中获取每个分组的最大值对应的整行数据，通常使用子查询
  const latestMessages = await c.env.DB.prepare(`
    SELECT m.*, 
           u.nickname as counterpart_nickname, 
           u.avatar_url as counterpart_avatar_url,
           u.id as counterpart_id
    FROM messages m
    JOIN users u ON (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) = u.id
    WHERE m.id IN (
      SELECT id FROM (
        SELECT id, 
               CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as contact_id,
               ROW_NUMBER() OVER (
                 PARTITION BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END 
                 ORDER BY created_at DESC, id DESC
               ) as rn
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
      ) WHERE rn = 1
    )
    ORDER BY m.created_at DESC
  `).bind(currentUserId, currentUserId, currentUserId, currentUserId, currentUserId).all();

  // 获取未读消息计数
  const unreadCounts = await c.env.DB.prepare(`
    SELECT sender_id, COUNT(*) as count
    FROM messages
    WHERE receiver_id = ? AND is_read = 0
    GROUP BY sender_id
  `).bind(currentUserId).all();

  const countMap = new Map();
  unreadCounts.results?.forEach((r: any) => {
    countMap.set(r.sender_id, r.count);
  });

  return c.json({
    success: true,
    data: latestMessages.results?.map((m: any) => ({
      id: m.id,
      content: m.content,
      createdAt: m.created_at,
      isRead: m.is_read === 1,
      counterpart: {
        id: m.counterpart_id.toString().padStart(4, '0'),
        nickname: m.counterpart_nickname,
        avatarUrl: m.counterpart_avatar_url
      },
      unreadCount: countMap.get(m.counterpart_id) || 0
    })) ?? []
  });
});

/** GET /api/messages/:userId - 获取与特定用户的聊天详情 */
messages.get('/:userId', authRequired(), async (c) => {
  const currentUserId = parseInt(c.get('userId') as string);
  const counterpartId = parseInt(c.req.param('userId') ?? '0');

  const history = await c.env.DB.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?)
       OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `).bind(currentUserId, counterpartId, counterpartId, currentUserId).all();

  return c.json({
    success: true,
    data: history.results?.map((m: any) => ({
      id: m.id,
      senderId: m.sender_id.toString().padStart(4, '0'),
      receiverId: m.receiver_id.toString().padStart(4, '0'),
      content: m.content,
      isRead: m.is_read === 1,
      createdAt: m.created_at
    })) ?? []
  });
});

/** POST /api/messages/:userId - 发送消息 */
messages.post('/:userId', authRequired(), async (c) => {
  const currentUserId = parseInt(c.get('userId') as string);
  const counterpartId = parseInt(c.req.param('userId') ?? '0');
  const body = await c.req.json<{ content: string }>();

  if (!body.content || body.content.trim() === '') {
    return c.json({ success: false, error: '内容不能为空' }, 400);
  }

  const messageId = uuidv4();
  await c.env.DB.prepare(`
    INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
    VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  `).bind(messageId, currentUserId, counterpartId, body.content).run();

  return c.json({
    success: true,
    data: {
      id: messageId,
      senderId: currentUserId.toString().padStart(4, '0'),
      receiverId: counterpartId.toString().padStart(4, '0'),
      content: body.content,
      isRead: false,
      createdAt: new Date().toISOString()
    }
  });
});

/** PUT /api/messages/:userId/read - 标记为已读 */
messages.put('/:userId/read', authRequired(), async (c) => {
  const currentUserId = parseInt(c.get('userId') as string);
  const counterpartId = parseInt(c.req.param('userId') ?? '0');

  await c.env.DB.prepare(`
    UPDATE messages
    SET is_read = 1
    WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
  `).bind(counterpartId, currentUserId).run();

  return c.json({ success: true });
});

export default messages;
