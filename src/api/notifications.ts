/**
 * 通知相关 API
 */
import { get, put } from './client.ts';

export interface NotificationItem {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'SYSTEM';
  sender: {
    id: string;
    nickname: string;
    avatarUrl: string;
  };
  post?: {
    id: string;
    title: string;
  } | null;
  content?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationCounts {
  LIKE: number;
  COMMENT: number;
  SYSTEM: number;
}

/** 获取通知未读数 */
export function getNotificationCounts() {
  return get<NotificationCounts>('/notifications/counts');
}

/** 获取通知列表 */
export function getNotifications(type?: string, page = 1, pageSize = 20) {
  const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
  if (type) params.type = type;
  return get<NotificationItem[]>('/notifications', params);
}

/** 标记为已读 */
export function markNotificationRead(id: string) {
  return put(`/notifications/${id}/read`, {});
}

/** 一键已读 */
export function readAllNotifications(type?: string) {
  const url = type ? `/notifications/read-all?type=${type}` : '/notifications/read-all';
  return put(url, {});
}
