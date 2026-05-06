/**
 * 帖子路由
 * 帖子 CRUD、点赞、评论
 */
import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired, authOptional, generateId, requireLevel } from '../middleware/auth';

const posts = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

/** GET /api/posts - 获取帖子列表（瀑布流分页） */
posts.get('/', authOptional(), async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const pageSize = parseInt(c.req.query('pageSize') ?? '12');
  const type = c.req.query('type') ?? 'recommend';
  const queryUserId = c.req.query('userId');
  const offset = (page - 1) * pageSize;

  const currentUserId = c.get('userId');

  let whereClause = '';
  const queryParams: any[] = [];

  if (queryUserId) {
    whereClause = 'WHERE p.user_id = ?';
    queryParams.push(queryUserId);
  } else if (type === 'feed') {
    if (!currentUserId) {
      return c.json({ success: false, error: '未登录' }, 401);
    }
    whereClause = 'WHERE p.user_id = ? OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)';
    queryParams.push(currentUserId, currentUserId);
  }

  const countQuery = `SELECT COUNT(*) as count FROM posts p ${whereClause}`;
  const total = await c.env.DB.prepare(countQuery).bind(...queryParams).first<{ count: number }>();

  queryParams.push(pageSize, offset);

  const result = await c.env.DB.prepare(
    `SELECT p.id, p.user_id, p.title, p.content, p.film_type, p.camera, p.lens, p.tags, p.created_at,
            u.nickname as author_name, u.avatar_url as author_avatar,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
            (SELECT COALESCE(preview_url, image_url) FROM post_images WHERE post_id = p.id ORDER BY sort_order LIMIT 1) as cover_image,
            (SELECT json_group_array(json_object('url', image_url, 'previewUrl', preview_url)) FROM (SELECT image_url, preview_url FROM post_images WHERE post_id = p.id ORDER BY sort_order)) as images_json
     FROM posts p
     JOIN users u ON p.user_id = u.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...queryParams).all();

  const data = result.results?.map((row: Record<string, unknown>) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    filmType: row.film_type,
    camera: row.camera,
    lens: row.lens,
    tags: JSON.parse((row.tags as string) || '[]'),
    author: {
      id: String(row.user_id).padStart(4, '0'),
      nickname: row.author_name,
      avatarUrl: row.author_avatar
    },
    likesCount: row.likes_count,
    commentsCount: row.comments_count,
    coverImage: row.cover_image,
    images: JSON.parse((row.images_json as string) || '[]'),
    createdAt: row.created_at
  })) ?? [];

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

/** GET /api/posts/:id - 获取帖子详情 */
posts.get('/:id', authOptional(), async (c) => {
  const postId = c.req.param('id');
  const currentUserId = c.get('userId');

  const post = await c.env.DB.prepare(
    `SELECT p.*, u.nickname as author_name, u.avatar_url as author_avatar, u.bio as author_bio,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`
  ).bind(postId).first<Record<string, unknown>>();

  if (!post) {
    return c.json({ success: false, error: '帖子不存在' }, 404);
  }

  // 获取帖子图片
  const images = await c.env.DB.prepare(
    'SELECT id, image_url, preview_url, sort_order FROM post_images WHERE post_id = ? ORDER BY sort_order'
  ).bind(postId).all();

  // 检查当前用户是否已点赞
  let isLiked = false;
  if (currentUserId) {
    const like = await c.env.DB.prepare(
      'SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?'
    ).bind(currentUserId, postId).first();
    isLiked = !!like;
  }

  // 检查当前用户是否已关注作者
  let isFollowing = false;
  if (currentUserId && post.user_id) {
    const follow = await c.env.DB.prepare(
      'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
    ).bind(currentUserId, post.user_id).first();
    isFollowing = !!follow;
  }

  return c.json({
    success: true,
    data: {
      id: post.id,
      title: post.title,
      content: post.content,
      filmType: post.film_type,
      camera: post.camera,
      lens: post.lens,
      tags: JSON.parse((post.tags as string) || '[]'),
      author: {
        id: post.user_id,
        nickname: post.author_name,
        avatarUrl: post.author_avatar,
        bio: post.author_bio
      },
      images: images.results?.map((img: Record<string, unknown>) => ({
        id: img.id,
        imageUrl: img.image_url,
        previewUrl: img.preview_url,
        sortOrder: img.sort_order
      })) ?? [],
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      isLiked,
      isFollowing,
      isOwner: String(currentUserId) === String(post.user_id),
      createdAt: post.created_at
    }
  });
});

/** POST /api/posts - 创建帖子 */
posts.post('/', authRequired(), requireLevel('lv2'), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    title: string;
    content?: string;
    filmType?: string;
    camera?: string;
    lens?: string;
    tags?: string[];
    images?: Array<{ url: string; previewUrl?: string }>;
  }>();

  if (!body.title) {
    return c.json({ success: false, error: '标题为必填项' }, 400);
  }

  const postId = generateId();

  await c.env.DB.prepare(
    `INSERT INTO posts (id, user_id, title, content, film_type, camera, lens, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    postId, userId, body.title,
    body.content ?? '', body.filmType ?? '',
    body.camera ?? '', body.lens ?? '',
    JSON.stringify(body.tags ?? [])
  ).run();

  // 插入帖子图片
  if (body.images && body.images.length > 0) {
    const statements = body.images.map((img, idx) =>
      c.env.DB.prepare(
        'INSERT INTO post_images (id, post_id, image_url, preview_url, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).bind(generateId(), postId, img.url, img.previewUrl ?? null, idx)
    );
    await c.env.DB.batch(statements);
  }

  return c.json({ success: true, data: { id: postId } }, 201);
});

/** PUT /api/posts/:id - 更新帖子信息 */
posts.put('/:id', authRequired(), requireLevel('lv2'), async (c) => {
  const postId = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json<{
    title: string;
    content?: string;
    filmType?: string;
    camera?: string;
    lens?: string;
    tags?: string[];
    images?: Array<{ url: string; previewUrl?: string }>;
  }>();

  if (!body.title) {
    return c.json({ success: false, error: '标题为必填项' }, 400);
  }

  // 1. 鉴权
  const post = await c.env.DB.prepare('SELECT user_id FROM posts WHERE id = ?').bind(postId).first<{ user_id: number }>();
  if (!post) {
    return c.json({ success: false, error: '帖子不存在' }, 404);
  }
  if (String(post.user_id) !== String(userId)) {
    return c.json({ success: false, error: '无权修改他人的帖子' }, 403);
  }

  // 2. 更新文本和参数
  await c.env.DB.prepare(
    `UPDATE posts SET title = ?, content = ?, film_type = ?, camera = ?, lens = ?, tags = ?
     WHERE id = ?`
  ).bind(
    body.title,
    body.content ?? '', body.filmType ?? '',
    body.camera ?? '', body.lens ?? '',
    JSON.stringify(body.tags ?? []),
    postId
  ).run();

  // 3. 全局替换图片 (简单安全的模式：先删后插)
  if (body.images !== undefined) {
    await c.env.DB.prepare('DELETE FROM post_images WHERE post_id = ?').bind(postId).run();
    if (body.images.length > 0) {
      const statements = body.images.map((img, idx) =>
        c.env.DB.prepare(
          'INSERT INTO post_images (id, post_id, image_url, preview_url, sort_order) VALUES (?, ?, ?, ?, ?)'
        ).bind(generateId(), postId, img.url, img.previewUrl ?? null, idx)
      );
      await c.env.DB.batch(statements);
    }
  }

  return c.json({ success: true });
});

/** DELETE /api/posts/:id - 删除帖子 */
posts.delete('/:id', authRequired(), requireLevel('lv2'), async (c) => {
  const postId = c.req.param('id');
  const userId = c.get('userId');

  const post = await c.env.DB.prepare('SELECT user_id FROM posts WHERE id = ?').bind(postId).first<{ user_id: number }>();
  if (!post) {
    return c.json({ success: false, error: '帖子不存在' }, 404);
  }
  if (String(post.user_id) !== String(userId)) {
    return c.json({ success: false, error: '无权删除他人的帖子' }, 403);
  }

  // 级联删除会自动清理 post_images, likes, comments
  await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();

  return c.json({ success: true });
});

/** POST /api/posts/:id/like - 点赞/取消点赞 */
posts.post('/:id/like', authRequired(), requireLevel('lv2'), async (c) => {
  const postId = c.req.param('id');
  const userId = c.get('userId');

  // 确认帖子存在
  const post = await c.env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(postId).first();
  if (!post) {
    return c.json({ success: false, error: '帖子不存在' }, 404);
  }

  try {
    await c.env.DB.prepare(
      'INSERT INTO likes (user_id, post_id) VALUES (?, ?)'
    ).bind(userId, postId).run();

    // 通知作者
    const postAuthor = await c.env.DB.prepare('SELECT user_id FROM posts WHERE id = ?').bind(postId).first<{ user_id: number }>();
    if (postAuthor && String(postAuthor.user_id) !== String(userId)) {
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, receiver_id, sender_id, type, post_id) VALUES (?, ?, ?, ?, ?)'
      ).bind(generateId(), postAuthor.user_id, userId, 'LIKE', postId).run();
    }
  } catch {
    // 已经点过赞
  }

  const count = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM likes WHERE post_id = ?'
  ).bind(postId).first<{ count: number }>();

  return c.json({ success: true, data: { likesCount: count?.count ?? 0 } });
});

/** DELETE /api/posts/:id/like - 取消点赞 */
posts.delete('/:id/like', authRequired(), async (c) => {
  const postId = c.req.param('id');
  const userId = c.get('userId');

  await c.env.DB.prepare(
    'DELETE FROM likes WHERE user_id = ? AND post_id = ?'
  ).bind(userId, postId).run();

  const count = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM likes WHERE post_id = ?'
  ).bind(postId).first<{ count: number }>();

  return c.json({ success: true, data: { likesCount: count?.count ?? 0 } });
});

/** GET /api/posts/:id/comments - 获取评论列表 */
posts.get('/:id/comments', async (c) => {
  const postId = c.req.param('id');
  const page = parseInt(c.req.query('page') ?? '1');
  const pageSize = parseInt(c.req.query('pageSize') ?? '20');
  const offset = (page - 1) * pageSize;

  const total = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM comments WHERE post_id = ?'
  ).bind(postId).first<{ count: number }>();

  const result = await c.env.DB.prepare(
    `SELECT c.id, c.content, c.created_at, c.parent_id, c.reply_to_user_id,
            u.id as user_id, u.nickname, u.avatar_url,
            ru.nickname as reply_to_nickname
     FROM comments c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN users ru ON c.reply_to_user_id = ru.id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC
     LIMIT ? OFFSET ?`
  ).bind(postId, pageSize, offset).all();

  return c.json({
    success: true,
    data: result.results?.map((row: Record<string, any>) => ({
      id: row.id,
      content: row.content,
      user: {
        id: row.user_id,
        nickname: row.nickname,
        avatarUrl: row.avatar_url
      },
      parentId: row.parent_id,
      replyToUser: row.reply_to_user_id ? {
        id: row.reply_to_user_id,
        nickname: row.reply_to_nickname
      } : null,
      createdAt: row.created_at
    })) ?? [],
    pagination: {
      page,
      pageSize,
      total: total?.count ?? 0,
      totalPages: Math.ceil((total?.count ?? 0) / pageSize)
    }
  });
});

/** POST /api/posts/:id/comments - 发表评论 */
posts.post('/:id/comments', authRequired(), requireLevel('lv2'), async (c) => {
  const postId = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json<{ content: string; parentId?: string; replyToUserId?: string | number }>();

  if (!body.content?.trim()) {
    return c.json({ success: false, error: '评论内容不能为空' }, 400);
  }

  // 确认帖子存在
  const post = await c.env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(postId).first();
  if (!post) {
    return c.json({ success: false, error: '帖子不存在' }, 404);
  }

  const commentId = generateId();
  await c.env.DB.prepare(
    'INSERT INTO comments (id, post_id, user_id, content, parent_id, reply_to_user_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    commentId, 
    postId, 
    userId, 
    body.content.trim(), 
    body.parentId ?? null, 
    body.replyToUserId ?? null
  ).run();

  // 通知流程
  const postAuthor = await c.env.DB.prepare('SELECT user_id FROM posts WHERE id = ?').bind(postId).first<{ user_id: number }>();
  
  // 场景 1: 直接评论帖子 -> 通知帖子作者
  if (postAuthor && String(postAuthor.user_id) !== String(userId) && !body.replyToUserId) {
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, receiver_id, sender_id, type, post_id, comment_id, content) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(generateId(), postAuthor.user_id, userId, 'COMMENT', postId, commentId, body.content.trim()).run();
  }
  
  // 场景 2: 回复某人 -> 通知该被回复的人
  if (body.replyToUserId && String(body.replyToUserId) !== String(userId)) {
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, receiver_id, sender_id, type, post_id, comment_id, content) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(generateId(), body.replyToUserId, userId, 'COMMENT', postId, commentId, body.content.trim()).run();
  }

  // 返回新评论（含用户信息）
  const user = await c.env.DB.prepare(
    'SELECT nickname, avatar_url FROM users WHERE id = ?'
  ).bind(userId).first<{ nickname: string; avatar_url: string }>();

  let replyToUser = null;
  if (body.replyToUserId) {
    const replyTo = await c.env.DB.prepare(
      'SELECT nickname FROM users WHERE id = ?'
    ).bind(body.replyToUserId).first<{ nickname: string }>();
    if (replyTo) {
      replyToUser = {
        id: String(body.replyToUserId),
        nickname: replyTo.nickname
      };
    }
  }

  return c.json({
    success: true,
    data: {
      id: commentId,
      content: body.content.trim(),
      user: {
        id: userId,
        nickname: user?.nickname ?? '',
        avatarUrl: user?.avatar_url ?? ''
      },
      parentId: body.parentId ?? null,
      replyToUser,
      createdAt: new Date().toISOString()
    }
  }, 201);
});

export default posts;
