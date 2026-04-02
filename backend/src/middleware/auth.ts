/**
 * JWT 认证中间件
 * 验证请求中的 JWT 令牌，将用户信息注入上下文
 */
import { Context, Next } from 'hono';
import type { Env, JwtPayload } from '../types';

/** 用于 HMAC-SHA256 签名的密钥缓存 */
let cachedKey: CryptoKey | null = null;

/**
 * 获取或创建 HMAC 签名密钥
 * 使用 Web Crypto API 兼容 Cloudflare Workers 运行时
 */
async function getSigningKey(secret: string): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const encoder = new TextEncoder();
  cachedKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return cachedKey;
}

/** Base64URL 编码 */
function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Base64URL 解码 */
function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad) str += '='.repeat(4 - pad);
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 签发 JWT 令牌
 * @param payload - JWT 负载数据
 * @param secret - 签名密钥
 * @returns 签名后的 JWT 字符串
 */
export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const key = await getSigningKey(secret);
  const encoder = new TextEncoder();

  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${header}.${body}`;

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * 验证并解析 JWT 令牌
 * @returns 解析后的 payload，验证失败返回 null
 */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const key = await getSigningKey(secret);
    const encoder = new TextEncoder();
    const signingInput = `${parts[0]}.${parts[1]}`;

    const signatureBytes = base64UrlDecode(parts[2]);
    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(signingInput));
    if (!isValid) return null;

    const payload: JwtPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));

    // 检查令牌是否过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * 认证中间件 - 必须登录
 * 从 Cookie 或 Authorization header 中提取 JWT 并验证
 */
export function authRequired() {
  return async (c: Context<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>, next: Next) => {
    const token = extractToken(c);
    if (!token) {
      return c.json({ success: false, error: '未登录，请先登录' }, 401);
    }

    const payload = await verifyJwt(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ success: false, error: '登录已过期，请重新登录' }, 401);
    }

    c.set('userId', payload.sub);
    c.set('userEmail', payload.email);
    await next();
  };
}

/**
 * 认证中间件 - 可选登录
 * 如果携带有效 JWT 则注入用户信息，否则继续处理
 */
export function authOptional() {
  return async (c: Context<{ Bindings: Env; Variables: { userId: string; userEmail: string } }>, next: Next) => {
    const token = extractToken(c);
    if (token) {
      const payload = await verifyJwt(token, c.env.JWT_SECRET);
      if (payload) {
        c.set('userId', payload.sub);
        c.set('userEmail', payload.email);
      }
    }
    await next();
  };
}

/** 从请求中提取 JWT 令牌 */
function extractToken(c: Context): string | null {
  // 优先从 Cookie 提取
  const cookieHeader = c.req.header('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/token=([^;]+)/);
    if (match) return match[1];
  }

  // 其次从 Authorization header 提取
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * 生成唯一 ID
 * 使用 crypto.randomUUID() 兼容 Workers 运行时
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 密码哈希
 * 使用 PBKDF2 算法，适合 Workers 环境（无法使用 bcrypt）
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const computedHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computedHex === hashHex;
}
