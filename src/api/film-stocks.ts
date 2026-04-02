/**
 * 胶卷型号相关 API 调用
 */
import { get, post, put, del, type ApiResponse } from './client';

export interface FilmStock {
  id: string;
  brand: string;
  model: string;
  iso: number;
  format: string;
  filmType: string;
  process: string;
  createdAt?: string;
}

export interface FilmStockFilters {
  brand?: string;
  iso?: string;
  format?: string;
  filmType?: string;
}

/**
 * 获取胶卷型号列表
 * @param filters 筛选条件
 */
export async function getFilmStocks(filters?: FilmStockFilters) {
  return get<FilmStock[]>('/film-stocks', filters as Record<string, string>);
}

/**
 * 获取胶卷型号详情
 * @param id 胶卷型号ID
 */
export async function getFilmStockById(id: string) {
  return get<FilmStock>(`/film-stocks/${id}`);
}

/**
 * 创建胶卷型号
 * @param filmStock 胶卷型号数据
 */
export async function createFilmStock(filmStock: Omit<FilmStock, 'id' | 'createdAt'>) {
  return post<FilmStock>('/film-stocks', filmStock);
}

/**
 * 更新胶卷型号
 * @param id 胶卷型号ID
 * @param filmStock 胶卷型号数据
 */
export async function updateFilmStock(id: string, filmStock: Partial<Omit<FilmStock, 'id' | 'createdAt'>>) {
  return put<FilmStock>(`/film-stocks/${id}`, filmStock);
}

/**
 * 删除胶卷型号
 * @param id 胶卷型号ID
 */
export async function deleteFilmStock(id: string) {
  return del<FilmStock>(`/film-stocks/${id}`);
}
