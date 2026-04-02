/**
 * 全局类型定义
 * 定义 Cloudflare Workers 环境绑定和数据模型接口
 */

import type { D1Database } from '@cloudflare/workers-types';

/** Workers 环境绑定类型 */
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  IMG_BED_URL: string;
  IMG_BED_TOKEN: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_FROM: string;
}

/** 用户模型 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

/** 用户公开资料（不含密码） */
export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  createdAt: string;
}

/** 胶卷卷 */
export interface Roll {
  id: string;
  userId: string;
  title: string;
  filmStock: string;
  camera: string;
  lens: string;
  location: string;
  shotDate: string;
  format: string;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** 胶卷帧 */
export interface Frame {
  id: string;
  rollId: string;
  imageUrl: string;
  frameNumber: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}

/** 帖子 */
export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  filmType: string;
  camera: string;
  lens: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** 帖子图片 */
export interface PostImage {
  id: string;
  postId: string;
  imageUrl: string;
  sortOrder: number;
}

/** 评论 */
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

/** 设备 */
export interface Gear {
  id: string;
  userId: string;
  name: string;
  type: string;
  brand: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

/** JWT Payload */
export interface JwtPayload {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

/** API 统一响应格式 */
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
