/**
 * 胶卷相关 API
 */
import { get, post, put, del, type ApiResponse } from './client.ts';

export interface RollAuthor {
  id: string;
  nickname: string;
  avatarUrl: string;
}

export interface RollListItem {
  id: string;
  title: string;
  filmStock: string;
  camera: string;
  lens: string;
  location: string;
  shotDate: string;
  format: string;
  filmType: string;
  status: string;
  tags: string[];
  frameCount: number;
  frames?: FrameItem[];
  author: RollAuthor;
  createdAt: string;
}

export interface FrameItem {
  id: string;
  imageUrl: string;
  previewUrl: string | null;
  frameNumber: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  description: string;
  sortOrder: number;
  shotDate?: string;
  location?: string;
  camera?: string;
  lens?: string;
  tags?: string[];
}

export interface RollDetail {
  id: string;
  title: string;
  filmStock: string;
  camera: string;
  lens: string;
  location: string;
  shotDate: string;
  format: string;
  filmType: string;
  status: string;
  tags: string[];
  author: RollAuthor;
  frames: FrameItem[];
  isOwner: boolean;
  createdAt: string;
}

/** 获取胶卷列表 */
export function getRolls(params?: {
  userId?: string;
  year?: string;
  filmType?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}) {
  const queryParams: Record<string, string> = {};
  if (params?.userId) queryParams.userId = params.userId;
  if (params?.year) queryParams.year = params.year;
  if (params?.filmType) queryParams.filmType = params.filmType;
  if (params?.tag) queryParams.tag = params.tag;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
  return get<RollListItem[]>('/rolls', queryParams);
}

/** 获取胶卷详情 */
export function getRoll(id: string) {
  return get<RollDetail>(`/rolls/${id}`);
}

/** 创建胶卷 */
export function createRoll(data: {
  title: string;
  filmStock?: string;
  camera?: string;
  lens?: string;
  location?: string;
  shotDate?: string;
  format?: string;
  filmType?: string;
  tags?: string[];
}) {
  return post<{ id: string }>('/rolls', data);
}

/** 更新胶卷 */
export function updateRoll(id: string, data: Record<string, unknown>) {
  return put(`/rolls/${id}`, data);
}

/** 删除胶卷 */
export function deleteRoll(id: string) {
  return del(`/rolls/${id}`);
}

/** 添加帧到胶卷 */
export function addFrames(rollId: string, frames: Array<{
  imageUrl: string;
  frameNumber?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  description?: string;
}>): Promise<ApiResponse<FrameItem[]>> {
  return post<FrameItem[]>(`/rolls/${rollId}/frames`, { frames });
}

/** 删除帧 */
export function deleteFrame(rollId: string, frameId: string) {
  return del(`/rolls/${rollId}/frames/${frameId}`);
}
/** 重新排序底片 */
export function reorderFrames(rollId: string, frameIds: string[]) {
  return put(`/rolls/${rollId}/frames/reorder`, { frameIds });
}

/** 更新帧信息 */
export function updateFrame(rollId: string, frameId: string, data: Record<string, unknown>) {
  return put(`/rolls/${rollId}/frames/${frameId}`, data);
}
