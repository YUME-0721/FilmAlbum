/**
 * HTTP API 客户端
 * 封装 fetch 请求，统一处理错误、JSON 解析和 Cookie 携带
 */

// NOTE: 动态获取 API 服务器地址，优先从 localStorage 读取，支持自部署与跨域
export function getApiBaseUrl(): string {
  const customUrl = localStorage.getItem('api_server_url');
  if (customUrl) {
    let trimmed = customUrl.trim().replace(/\/$/, '');
    if (!trimmed.endsWith('/api')) {
      trimmed += '/api';
    }
    return trimmed;
  }

  let defaultUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  defaultUrl = defaultUrl.trim().replace(/\/$/, '');
  if (defaultUrl.startsWith('http') && !defaultUrl.endsWith('/api')) {
    defaultUrl += '/api';
  }
  return defaultUrl;
}

/** API 统一响应类型 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API 自定义错误类，携带 HTTP 状态码
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * 通用请求方法
 * 自动携带 Cookie（HttpOnly JWT）或 Authorization 标头，统一错误处理
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // 确保 API 基准地址不带尾部斜杠，endpoint 带头部斜杠
  const base = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;

  const config: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  // 如果本地存在 auth_token，则携带在 Authorization 头中以支持跨域/移动端自部署
  const token = localStorage.getItem('auth_token');
  if (token) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // FormData 请求不设置 Content-Type（浏览器自动处理 boundary）
  if (options.body instanceof FormData) {
    const headers = { ...options.headers } as Record<string, string>;
    delete headers['Content-Type'];
    config.headers = headers;
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // 401 (未授权/过期) 或 403 (无权限/令牌无效) 时，主动清理本地无效的 adminToken 缓存，实现双重保险
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken');
      }
      throw new ApiError(errorData.error || `请求失败 (${response.status})`, response.status);
    }
    const data = await response.json() as ApiResponse<T>;

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('网络请求异常');
  }
}

/** GET 请求 */
export function get<T>(endpoint: string, params?: Record<string, string>, options?: RequestInit): Promise<ApiResponse<T>> {
  const searchParams = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<T>(`${endpoint}${searchParams}`, { method: 'GET', ...options });
}

/** POST 请求 */
export function post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...options
  });
}

/** PUT 请求 */
export function put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...options
  });
}

/** DELETE 请求 */
export function del<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
    ...options
  });
}

/** 上传文件（使用 FormData） */
export function uploadFile<T>(endpoint: string, formData: FormData, method: string = 'POST'): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: method,
    body: formData,
    headers: {} // 让浏览器自动设置 Content-Type
  });
}
