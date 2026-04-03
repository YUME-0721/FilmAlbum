/**
 * HTTP API 客户端
 * 封装 fetch 请求，统一处理错误、JSON 解析和 Cookie 携带
 */

// NOTE: 开发环境使用 Vite 代理，生产环境需配置正确的 API 地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
 * 通用请求方法
 * 自动携带 Cookie（HttpOnly JWT），统一错误处理
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  // FormData 请求不设置 Content-Type（浏览器自动处理 boundary）
  if (options.body instanceof FormData) {
    const headers = { ...options.headers } as Record<string, string>;
    delete headers['Content-Type'];
    config.headers = headers;
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json() as ApiResponse<T>;

    if (!response.ok) {
      throw new Error(data.error || `请求失败 (${response.status})`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('网络请求异常');
  }
}

/** GET 请求 */
export function get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
  const searchParams = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<T>(`${endpoint}${searchParams}`, { method: 'GET' });
}

/** POST 请求 */
export function post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body)
  });
}

/** PUT 请求 */
export function put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

/** DELETE 请求 */
export function del<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined
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
