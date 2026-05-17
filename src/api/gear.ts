/**
 * 设备管理 API
 */
import { get, post, put, del, uploadFile, type ApiResponse } from './client.ts';

export interface Gear {
  id: string;
  cameraModel: string;
  lensModel: string;
  lensType: 'interchangeable' | 'fixed';
  status: 'used' | 'using' | 'wanted';
  imageUrl: string;
  formats: string[];
  shotCount: number;
  shotCounts: Record<string, number>;
  mount: string;
  externalUrl: string;
  review: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建设备
 * @param data 设备数据
 * @param file 设备图片
 */
export async function createGear(data: {
  cameraModel: string;
  lensModel: string;
  lensType: 'interchangeable' | 'fixed';
  status: 'used' | 'using' | 'wanted';
  formats: string[];
  shotCount: number;
  shotCounts: Record<string, number>;
  mount: string;
  externalUrl: string;
  review: string;
  rating: number;
}, file?: File): Promise<ApiResponse<{ id: string }>> {
  const formData = new FormData();
  
  formData.append('cameraModel', data.cameraModel);
  formData.append('lensModel', data.lensModel);
  formData.append('lensType', data.lensType);
  formData.append('status', data.status);
  formData.append('formats', JSON.stringify(data.formats));
  formData.append('shotCount', data.shotCount.toString());
  formData.append('shotCounts', JSON.stringify(data.shotCounts));
  formData.append('mount', data.mount);
  formData.append('externalUrl', data.externalUrl);
  formData.append('review', data.review);
  formData.append('rating', data.rating.toString());
  
  if (file) {
    formData.append('file', file);
  }
  
  return await uploadFile<{ id: string }>('/gear', formData);
}

/** 获取设备列表
 * @param status 设备状态过滤
 * @param userId 用户ID
 */
export async function getGear(status?: 'used' | 'using' | 'wanted', userId?: string): Promise<ApiResponse<Gear[]>> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (userId) params.append('userId', userId);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return await get<Gear[]>(`/gear${queryString}`);
}

/** 更新设备
 * @param id 设备ID
 * @param data 设备数据
 * @param file 设备图片（可选）
 */
export async function updateGear(
  id: string,
  data: {
    cameraModel: string;
    lensModel: string;
    lensType: 'interchangeable' | 'fixed';
    status: 'used' | 'using' | 'wanted';
    formats: string[];
    shotCount: number;
    shotCounts: Record<string, number>;
    mount: string;
    externalUrl: string;
    review: string;
    rating: number;
  },
  file?: File
): Promise<ApiResponse> {
  const formData = new FormData();
  
  formData.append('cameraModel', data.cameraModel);
  formData.append('lensModel', data.lensModel);
  formData.append('lensType', data.lensType);
  formData.append('status', data.status);
  formData.append('formats', JSON.stringify(data.formats));
  formData.append('shotCount', data.shotCount.toString());
  formData.append('shotCounts', JSON.stringify(data.shotCounts));
  formData.append('mount', data.mount);
  formData.append('externalUrl', data.externalUrl);
  formData.append('review', data.review);
  formData.append('rating', data.rating.toString());
  
  if (file) {
    formData.append('file', file);
  }
  
  return await uploadFile(`/gear/${id}`, formData, 'PUT');
}

/** 删除设备
 * @param id 设备ID
 */
export async function deleteGear(id: string): Promise<ApiResponse> {
  return await del(`/gear/${id}`);
}

/** 获取单个设备详情
 * @param id 设备ID
 */
export async function getGearById(id: string): Promise<ApiResponse<Gear & { author?: { id: string; nickname: string; avatarUrl: string } }>> {
  return await get<Gear & { author?: { id: string; nickname: string; avatarUrl: string } }>(`/gear/${id}`);
}
