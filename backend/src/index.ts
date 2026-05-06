/**
 * FilmAlbum 后端入口
 * Cloudflare Workers + Hono 框架
 * 注册所有路由、中间件和 CORS 配置
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import postsRoutes from './routes/posts';
import rollsRoutes from './routes/rolls';
import uploadRoutes from './routes/upload';
import filmStocksRoutes from './routes/film-stocks';
import gearRoutes from './routes/gear';
import messagesRoutes from './routes/messages';
import notificationsRoutes from './routes/notifications';
import searchRoutes from './routes/search';
import systemRoutes from './routes/system';
import adminRoutes from './routes/admin';

const app = new Hono<{ Bindings: Env }>({ strict: false });

// CORS 配置：开发环境允许本地前端访问
app.use('*', cors({
  origin: (origin) => {
    // 允许本地开发和生产域名
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    // 生产环境逻辑：允许本地、Cloudflare Pages 预览域名
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.pages.dev')) {
      return origin || '';
    }
    
    // NOTE: 如果你有特定的自定义前端域名，可以将其添加到环境变量或此处
    // 为了极致的灵活性，这里也可以改为直接返回 origin (风险自担)
    return origin; 
  },
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// 注册路由
app.route('/api/auth', authRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/posts', postsRoutes);
app.route('/api/rolls', rollsRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/film-stocks', filmStocksRoutes);
app.route('/api/gear', gearRoutes);
app.route('/api/messages', messagesRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/system', systemRoutes);
app.route('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.notFound((c) => {
  return c.json({ success: false, error: '接口不存在' }, 404);
});

// 全局错误处理
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  console.error('Stack:', err.stack);
  return c.json({ success: false, error: '服务器内部错误', message: err.message }, 500);
});

export default app;
