import { Hono } from 'hono';
import type { Env } from '../types';

const system = new Hono<{ Bindings: Env }>();

/** GET /api/system/settings - 获取公开的全局系统设置 */
system.get('/settings', async (c) => {
  try {
    const settings = await c.env.DB.prepare(
      "SELECT key, value FROM system_settings WHERE key IN ('open_registration', 'default_language', 'lv2_roll_limit')"
    ).all<{ key: string; value: string }>();

    const settingsMap = settings.results.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return c.json({
      success: true,
      data: {
        openRegistration: settingsMap['open_registration'] !== 'false',
        defaultLanguage: settingsMap['default_language'] || 'zh-CN',
        lv2RollLimit: parseInt(settingsMap['lv2_roll_limit'] || '10', 10),
      }
    });
  } catch (error) {
    console.error('获取系统设置失败:', error);
    // 返回安全默认值
    return c.json({
      success: true,
      data: {
        openRegistration: true,
        defaultLanguage: 'zh-CN',
        lv2RollLimit: 10,
      }
    });
  }
});

export default system;
