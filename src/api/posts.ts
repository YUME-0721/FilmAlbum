/**
 * 帖子相关 API
 */
import { get, post, put, del } from './client.ts';

export interface PostAuthor {
  id: string;
  nickname: string;
  avatarUrl: string;
}

export interface PostListItem {
  id: string;
  title: string;
  content: string;
  filmType: string;
  camera: string;
  lens: string;
  tags: string[];
  author: PostAuthor;
  likesCount: number;
  commentsCount: number;
  coverImage: string;
  images: Array<{ url: string; previewUrl?: string }>;
  visibility: 'public' | 'feed_only' | 'private';
  createdAt: string;
}

export interface PostDetail {
  id: string;
  title: string;
  content: string;
  filmType: string;
  camera: string;
  lens: string;
  tags: string[];
  author: PostAuthor & { bio: string };
  images: Array<{ id: string; imageUrl: string; previewUrl?: string; sortOrder: number }>;
  likesCount: number;
  commentsCount: number;
  likedBy: PostAuthor[];
  isLiked: boolean;
  isFollowing: boolean;
  isOwner: boolean;
  visibility: 'public' | 'feed_only' | 'private';
  createdAt: string;
}

export interface CommentItem {
  id: string;
  content: string;
  user: { id: string; nickname: string; avatarUrl: string };
  parentId?: string;
  replyToUser?: { id: string; nickname: string } | null;
  createdAt: string;
}

/** 获取帖子列表 */
export function getPosts(page = 1, pageSize = 12, type?: 'recommend' | 'feed', userId?: string) {
  const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
  if (type) {
    params.type = type;
  }
  if (userId) {
    params.userId = userId;
  }
  return get<PostListItem[]>('/posts', params);
}

/** 获取帖子详情 */
export function getPost(id: string) {
  return get<PostDetail>(`/posts/${id}`);
}

/** 创建帖子 */
export function createPost(data: {
  title: string;
  content?: string;
  filmType?: string;
  camera?: string;
  lens?: string;
  tags?: string[];
  visibility?: 'public' | 'feed_only' | 'private';
  images?: Array<{ url: string; previewUrl?: string }>;
}) {
  return post<{ id: string }>('/posts', data);
}

/** 更新帖子 */
export function updatePost(id: string, data: {
  title: string;
  content?: string;
  filmType?: string;
  camera?: string;
  lens?: string;
  tags?: string[];
  visibility?: 'public' | 'feed_only' | 'private';
  images?: Array<{ url: string; previewUrl?: string }>;
}) {
  return put<{ id: string }>(`/posts/${id}`, data);
}

/** 删除帖子 */
export function deletePost(id: string) {
  return del(`/posts/${id}`);
}

/** 点赞 */
export function likePost(id: string) {
  return post<{ likesCount: number }>(`/posts/${id}/like`);
}

/** 取消点赞 */
export function unlikePost(id: string) {
  return del<{ likesCount: number }>(`/posts/${id}/like`);
}

/** 获取评论 */
export function getComments(postId: string, page = 1) {
  return get<CommentItem[]>(`/posts/${postId}/comments`, { page: String(page) });
}

/** 发表评论 */
export function createComment(postId: string, content: string, parentId?: string, replyToUserId?: string | number) {
  return post<CommentItem>(`/posts/${postId}/comments`, { content, parentId, replyToUserId });
}
