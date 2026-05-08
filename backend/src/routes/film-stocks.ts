/**
 * 胶卷型号路由
 * 胶卷型号 CRUD 操作
 */
import { Hono } from 'hono';
import type { Env } from '../types';
import { authRequired, generateId } from '../middleware/auth';

const filmStocks = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>();

/** GET /api/film-stocks - 获取胶卷型号列表（支持筛选） */
filmStocks.get('/', async (c) => {
  const brand = c.req.query('brand');
  const iso = c.req.query('iso');
  const format = c.req.query('format');
  const filmType = c.req.query('filmType');

  let whereClause = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (brand) {
    whereClause += ' AND (brand LIKE ? OR brand_zh LIKE ?)';
    params.push(`%${brand}%`, `%${brand}%`);
  }

  if (iso) {
    whereClause += ' AND iso = ?';
    params.push(iso);
  }

  if (format) {
    whereClause += ' AND format = ?';
    params.push(format);
  }

  if (filmType) {
    whereClause += ' AND film_type = ?';
    params.push(filmType);
  }

  const query = `
    SELECT * FROM film_stocks
    ${whereClause}
    ORDER BY brand, model, iso
  `;

  const result = await c.env.DB.prepare(query).bind(...params).all();

  const data = result.results?.map((row: Record<string, unknown>) => ({
    id: row.id,
    brand: row.brand,
    brandZh: row.brand_zh,
    model: row.model,
    iso: row.iso,
    format: row.format,
    filmType: row.film_type,
    process: row.process,
    brandLogo: row.brand_logo,
    createdAt: row.created_at
  })) ?? [];

  return c.json({
    success: true,
    data
  });
});

/** GET /api/film-stocks/:id - 获取胶卷型号详情 */
filmStocks.get('/:id', async (c) => {
  const id = c.req.param('id');

  const filmStock = await c.env.DB.prepare(
    'SELECT * FROM film_stocks WHERE id = ?'
  ).bind(id).first<Record<string, unknown>>();

  if (!filmStock) {
    return c.json({ success: false, error: '胶卷型号不存在' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: filmStock.id,
      brand: filmStock.brand,
      brandZh: filmStock.brand_zh,
      model: filmStock.model,
      iso: filmStock.iso,
      format: filmStock.format,
      filmType: filmStock.film_type,
      process: filmStock.process,
      brandLogo: filmStock.brand_logo,
      createdAt: filmStock.created_at
    }
  });
});

/** POST /api/film-stocks - 创建胶卷型号 */
filmStocks.post('/', authRequired(), async (c) => {
  const body = await c.req.json<{
    brand: string;
    model: string;
    iso: number;
    format: string;
    filmType: string;
    process: string;
  }>();

  if (!body.brand || !body.model || !body.iso || !body.format || !body.filmType || !body.process) {
    return c.json({ success: false, error: '所有字段为必填项' }, 400);
  }

  // 检查是否已存在相同的胶卷型号
  const existing = await c.env.DB.prepare(
    'SELECT id FROM film_stocks WHERE brand = ? AND model = ? AND iso = ?'
  ).bind(body.brand, body.model, body.iso).first();

  if (existing) {
    return c.json({ success: false, error: '该胶卷型号已存在' }, 409);
  }

  const id = generateId();

  await c.env.DB.prepare(
    `INSERT INTO film_stocks (id, brand, model, iso, format, film_type, process)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.brand, body.model, body.iso, body.format,
    body.filmType, body.process
  ).run();

  return c.json({ 
    success: true, 
    data: { 
      id,
      brand: body.brand,
      model: body.model,
      iso: body.iso,
      format: body.format,
      filmType: body.filmType,
      process: body.process
    } 
  }, 201);
});

/** PUT /api/film-stocks/:id - 更新胶卷型号 */
filmStocks.put('/:id', authRequired(), async (c) => {
  const id = c.req.param('id');

  const filmStock = await c.env.DB.prepare('SELECT id FROM film_stocks WHERE id = ?').bind(id).first();
  if (!filmStock) return c.json({ success: false, error: '胶卷型号不存在' }, 404);

  const body = await c.req.json<{
    brand?: string;
    model?: string;
    iso?: number;
    format?: string;
    filmType?: string;
    process?: string;
  }>();

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  const fieldMap: Record<string, string> = {
    brand: 'brand',
    model: 'model',
    iso: 'iso',
    format: 'format',
    filmType: 'film_type',
    process: 'process'
  };

  for (const [tsKey, dbKey] of Object.entries(fieldMap)) {
    const val = body[tsKey as keyof typeof body];
    if (val !== undefined) {
      updates.push(`${dbKey} = ?`);
      values.push(val as string | number);
    }
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: '没有需要更新的字段' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id!);

  await c.env.DB.prepare(
    `UPDATE film_stocks SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  // 获取更新后的胶卷型号信息
  const updatedFilmStock = await c.env.DB.prepare(
    'SELECT * FROM film_stocks WHERE id = ?'
  ).bind(id).first<Record<string, unknown>>();

  if (!updatedFilmStock) {
    return c.json({ success: false, error: 'Film stock not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: updatedFilmStock.id,
      brand: updatedFilmStock.brand,
      model: updatedFilmStock.model,
      iso: updatedFilmStock.iso,
      format: updatedFilmStock.format,
      filmType: updatedFilmStock.film_type,
      process: updatedFilmStock.process,
      createdAt: updatedFilmStock.created_at
    }
  });
});

/** DELETE /api/film-stocks/:id - 删除胶卷型号 */
filmStocks.delete('/:id', authRequired(), async (c) => {
  const id = c.req.param('id');

  const filmStock = await c.env.DB.prepare('SELECT id FROM film_stocks WHERE id = ?').bind(id).first();
  if (!filmStock) return c.json({ success: false, error: '胶卷型号不存在' }, 404);

  await c.env.DB.prepare('DELETE FROM film_stocks WHERE id = ?').bind(id).run();

  return c.json({ success: true });
});

export default filmStocks;