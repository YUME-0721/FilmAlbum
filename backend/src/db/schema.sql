-- FilmAlbum 数据库初始化
-- 适用于 Cloudflare D1 (SQLite)

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 关注关系
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 胶卷卷
CREATE TABLE IF NOT EXISTS rolls (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  film_stock TEXT DEFAULT '',
  camera TEXT DEFAULT '',
  lens TEXT DEFAULT '',
  location TEXT DEFAULT '',
  shot_date TEXT,
  end_date TEXT,
  format TEXT DEFAULT '135',
  film_type TEXT DEFAULT 'COLOR_NEGATIVE', -- COLOR_NEGATIVE, BW_NEGATIVE, COLOR_POSITIVE, BW_POSITIVE
  status TEXT DEFAULT 'DRAFT',
  tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 胶卷帧（单张底片）
CREATE TABLE IF NOT EXISTS frames (
  id TEXT PRIMARY KEY,
  roll_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  preview_url TEXT DEFAULT NULL,
  frame_number TEXT DEFAULT '',
  aperture TEXT DEFAULT '',
  shutter_speed TEXT DEFAULT '',
  iso TEXT DEFAULT '',
  description TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  file_format TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  shot_date TEXT,
  location TEXT DEFAULT '',
  camera TEXT DEFAULT '',
  lens TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (roll_id) REFERENCES rolls(id) ON DELETE CASCADE
);

-- 帖子（精选发布）
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  film_type TEXT DEFAULT '',
  camera TEXT DEFAULT '',
  lens TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 帖子图片
CREATE TABLE IF NOT EXISTS post_images (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  preview_url TEXT DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- 点赞
CREATE TABLE IF NOT EXISTS likes (
  user_id INTEGER NOT NULL,
  post_id TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- 评论
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  parent_id TEXT, -- 父评论 ID
  reply_to_user_id INTEGER, -- 被回复用户 ID
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 设备
CREATE TABLE IF NOT EXISTS gear (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  camera_model TEXT NOT NULL,
  lens_model TEXT NOT NULL,
  lens_type TEXT NOT NULL, -- interchangeable, fixed
  status TEXT NOT NULL, -- used, using, wanted
  image_url TEXT DEFAULT '',
  formats TEXT DEFAULT '[]', -- JSON array of formats (e.g., ["135", "120"])
  shot_count INTEGER DEFAULT 0,
  shot_counts_json TEXT DEFAULT '{}', -- 不同胶卷规格的拍摄张数
  mount TEXT DEFAULT '',
  external_url TEXT DEFAULT '', -- 设备详情外部链接
  review TEXT DEFAULT '', -- max 30 characters
  rating REAL DEFAULT 0, -- 0-5
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 胶卷型号
CREATE TABLE IF NOT EXISTS film_stocks (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  iso INTEGER NOT NULL,
  format TEXT NOT NULL, -- 135, 120, 4x5, etc.
  film_type TEXT NOT NULL, -- COLOR_NEGATIVE, BW_NEGATIVE, COLOR_POSITIVE, BW_POSITIVE
  process TEXT NOT NULL, -- C-41, E-6, D-76, etc.
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(brand, model, iso) -- 确保品牌、型号和感光度的组合唯一
);

-- 私信消息表
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0, -- 0 for false, 1 for true
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 通知表 (点赞、评论、系统通知)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  receiver_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'LIKE', 'COMMENT', 'SYSTEM'
  post_id TEXT, -- 关联帖子
  comment_id TEXT, -- 关联评论
  content TEXT, -- 消息内容预览或消息文本
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 邮箱验证码表
CREATE TABLE IF NOT EXISTS email_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_rolls_user_id ON rolls(user_id);
CREATE INDEX IF NOT EXISTS idx_rolls_status ON rolls(status);
CREATE INDEX IF NOT EXISTS idx_frames_roll_id ON frames(roll_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_gear_user_id ON gear(user_id);
CREATE INDEX IF NOT EXISTS idx_film_stocks_brand ON film_stocks(brand);
CREATE INDEX IF NOT EXISTS idx_film_stocks_iso ON film_stocks(iso);
CREATE INDEX IF NOT EXISTS idx_film_stocks_format ON film_stocks(format);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
