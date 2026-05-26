import axios from 'axios';
import { MMKV } from '../utils/safe-storage';

const storage = new MMKV();
const TOKEN_KEY = 'user-auth-token';
const API_URL_KEY = 'api-server-url';

// NOTE: 默认 API 基础地址设置为 Android 模拟器专用的宿主机回环通道 http://10.0.2.2:8787，支持用户在设置中自定义服务器
export const getBaseUrl = (): string => {
  return storage.getString(API_URL_KEY) || 'http://10.0.2.2:8787';
};

const client = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// NOTE: 在请求拦截器中自动为每一个出站 API 请求载入存放在 MMKV 中的授权 Token
client.interceptors.request.use(
  (config) => {
    // 动态获取最新的服务器基准地址，确保用户修改配置后即时生效
    config.baseURL = getBaseUrl();

    // NOTE: 智能环境兼容：如果检测到当前生产环境网关重写了前缀，自动将出站 /api/xxx 剥离为 /xxx
    const noPrefix = storage.getBoolean('api-no-prefix') || false;
    if (noPrefix && config.url && config.url.startsWith('/api')) {
      config.url = config.url.replace(/^\/api/, '');
    }

    const token = storage.getString(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// NOTE: 在响应拦截器中拦截 401 鉴权失效错误，自动清除本地 Token 并触发重定向至登录页
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      storage.delete(TOKEN_KEY);
      // 可在此处发送事件以重置登录状态或跳转至登录页
    }
    return Promise.reject(error);
  }
);

export default client;
