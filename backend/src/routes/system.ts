import { Hono } from 'hono';
import type { Env } from '../types';

const system = new Hono<{ Bindings: Env }>();

/** GET /api/system/settings - 获取公开的全局系统设置 */
system.get('/settings', async (c) => {
  try {
    const settings = await c.env.DB.prepare(
      "SELECT key, value FROM system_settings WHERE key IN ('open_registration', 'default_language', 'lv2_roll_limit', 'roll_formats', 'film_types')"
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
        rollFormats: settingsMap['roll_formats'] ? JSON.parse(settingsMap['roll_formats']) : [{"format":"135","label":"35mm (135)","frames":["半格","35mm","xpan"],"frameCols":{"半格":12,"35mm":6,"xpan":1}},{"format":"120","label":"中画幅 (120)","frames":["620","630","645","6x6","6x7","6x9"],"frameCols":{"620":1,"630":1,"645":4,"6x6":3,"6x7":3,"6x9":2}}],
        filmTypes: settingsMap['film_types'] ? JSON.parse(settingsMap['film_types']) : ["彩色负片","黑白负片","彩色反转片","黑白反转片"],
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
        rollFormats: [{"format":"135","label":"35mm (135)","frames":["半格","35mm","xpan"],"frameCols":{"半格":12,"35mm":6,"xpan":1}},{"format":"120","label":"中画幅 (120)","frames":["620","630","645","6x6","6x7","6x9"],"frameCols":{"620":1,"630":1,"645":4,"6x6":3,"6x7":3,"6x9":2}}],
        filmTypes: ["彩色负片","黑白负片","彩色反转片","黑白反转片"],
      }
    });
  }
});

export default system;
