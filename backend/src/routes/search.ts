import { Hono } from 'hono';
import type { Env } from '../types';

const search = new Hono<{ Bindings: Env }>();

/** GET /api/search - 全局搜索 (用户 & 帖子) */
search.get('/', async (c) => {
  return await handleSearch(c);
});

search.get('', async (c) => {
  return await handleSearch(c);
});

async function handleSearch(c: any) {
  const q = c.req.query('q');
  if (!q || q.trim().length === 0) {
    return c.json({ 
      success: true, 
      data: { users: [], posts: [] } 
    });
  }

  const keyword = `%${q.trim()}%`;
  
  // 1. 搜索用户 (根据昵称)
  const users = await c.env.DB.prepare(
    'SELECT id, nickname, avatar_url, bio FROM users WHERE nickname LIKE ? LIMIT 10'
  ).bind(keyword).all();

  // 2. 搜索帖子 (根据标题、内容、标签)
  const posts = await c.env.DB.prepare(
    `SELECT p.id, p.title, p.content, p.tags, p.created_at,
            u.nickname as author_name, u.avatar_url as author_avatar,
            (SELECT COALESCE(preview_url, image_url) FROM post_images WHERE post_id = p.id ORDER BY sort_order LIMIT 1) as cover_image
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.title LIKE ? OR p.content LIKE ? OR p.tags LIKE ?
     ORDER BY p.created_at DESC
     LIMIT 20`
  ).bind(keyword, keyword, keyword).all();

  return c.json({
    success: true,
    data: {
      users: users.results?.map((u: any) => ({
        id: u.id.toString().padStart(4, '0'),
        nickname: u.nickname,
        avatarUrl: u.avatar_url,
        bio: u.bio
      })) ?? [],
      posts: posts.results?.map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        tags: JSON.parse(p.tags || '[]'),
        author: {
          nickname: p.author_name,
          avatarUrl: p.author_avatar
        },
        coverImage: p.cover_image,
        createdAt: p.created_at
      })) ?? []
    }
  });
}

export default search;
