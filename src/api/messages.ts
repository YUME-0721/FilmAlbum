/**
 * 消息 API
 * 封装与后端消息接口的交互
 */
import { get, post, put, type ApiResponse } from './client';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  counterpart: {
    id: string;
    nickname: string;
    avatarUrl: string;
  };
  unreadCount: number;
}

/** 获取会话列表 */
export async function getConversations() {
  return get<Conversation[]>('/messages');
}

/** 获取聊天历史 */
export async function getChatHistory(userId: string) {
  return get<ChatMessage[]>(`/messages/${userId}`);
}

/** 发送消息 */
export async function sendMessage(userId: string, content: string) {
  return post<ChatMessage>(`/messages/${userId}`, { content });
}

/** 标记消息为已读 */
export async function markAsRead(userId: string) {
  return put<void>(`/messages/${userId}/read`, {});
}
