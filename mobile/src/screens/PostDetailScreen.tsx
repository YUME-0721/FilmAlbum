import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { PostItem } from './ExploreScreen';
import {
  ArrowLeft, Heart, MessageSquare, Send, Calendar,
  Camera, Eye, EyeOff, Film, Tag
} from 'lucide-react-native';

interface PostDetailScreenProps {
  post: PostItem;
  onBack: () => void;
}

interface CommentItem {
  id: string;
  content: string;
  user: {
    id: string;
    nickname: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export const PostDetailScreen: React.FC<PostDetailScreenProps> = ({ post, onBack }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [detail, setDetail] = useState<any>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  const textColor = isDark ? '#e7e5e5' : '#1a1a1a';
  const subTextColor = isDark ? '#767575' : '#9a9a9a';
  const cardBg = isDark ? '#191a1a' : '#ffffff';
  const inputBg = isDark ? '#131313' : '#f0f0f0';
  const borderColor = isDark ? 'rgba(72,72,72,0.4)' : 'rgba(224,224,224,0.6)';
  const bgColor = isDark ? '#0e0e0e' : '#f5f5f5';

  // NOTE: 获取帖子详细数据与评论列表
  const fetchDetailAndComments = async () => {
    setLoading(true);
    try {
      const [detailRes, commentsRes] = await Promise.all([
        client.get(`/api/posts/${post.id}`),
        client.get(`/api/posts/${post.id}/comments`)
      ]);
      
      if (detailRes.data && detailRes.data.success) {
        setDetail(detailRes.data.data);
        setIsLiked(detailRes.data.data.isLiked || false);
        setLikesCount(detailRes.data.data.likesCount);
      }
      if (commentsRes.data && commentsRes.data.success) {
        setComments(commentsRes.data.data);
      }
    } catch (err: any) {
      console.log('API Error, using fallback mock post details:', err.message);
      // 降级离线沙盒 mock 评论
      setDetail({
        ...post,
        isLiked: false,
        likesCount: post.likesCount,
        exposure: { aperture: 'f/1.4', shutterSpeed: '1/125s', iso: '400', exposureCompensation: '+0.3' }
      });
      setComments([
        {
          id: 'comment-mock-001',
          content: '这色调太毒了！胶片味拉满，蓝橙反差做得极其到位，赞！',
          user: { id: 'user-mock-201', nickname: '银盐胶片控', avatarUrl: '' },
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'comment-mock-002',
          content: '请教下冲洗是用什么工艺？或者是送去哪家药水冲洗的？',
          user: { id: 'user-mock-202', nickname: '暗房新手小白', avatarUrl: '' },
          createdAt: new Date(Date.now() - 7200000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailAndComments();
  }, [post.id]);

  // NOTE: 处理帖子点赞 / 取消点赞与服务器联调
  const handleLike = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount(prev => nextLiked ? prev + 1 : prev - 1);
    
    try {
      if (nextLiked) {
        await client.post(`/api/posts/${post.id}/like`);
      } else {
        await client.delete(`/api/posts/${post.id}/like`);
      }
    } catch (err: any) {
      console.log('Like failed locally, mock only:', err.message);
    }
  };

  // NOTE: 发表新评论
  const handlePostComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;

    setSubmittingComment(true);
    try {
      const response = await client.post(`/api/posts/${post.id}/comments`, {
        content: trimmed
      });
      if (response.data && response.data.success && response.data.data) {
        setComments(prev => [...prev, response.data.data]);
        setNewComment('');
        Alert.alert('✅ 评论发表成功');
      }
    } catch (err: any) {
      console.log('Post comment failed, entering mock sandbox comment:', err.message);
      // 离线沙盒兜底添加
      const fallbackComment: CommentItem = {
        id: `comment-mock-${Date.now()}`,
        content: trimmed,
        user: { id: 'user-mock-self', nickname: '您 (沙盒测试)' },
        createdAt: new Date().toISOString()
      };
      setComments(prev => [...prev, fallbackComment]);
      setNewComment('');
      Alert.alert('暗房离线沙盒', '评论发表成功（本地离线沙盒模式）');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#ffba20" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: bgColor }}
    >
      {/* 头部顶栏 */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={onBack}
          style={{ padding: 10, backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor }}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '800', color: textColor, flex: 1 }} numberOfLines={1}>
          {post.title}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* 多图滑动画廊展示 */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: '100%', height: 350 }}>
          {post.images && post.images.length > 0 ? (
            post.images.map((img, idx) => (
              <Image
                key={idx}
                source={{ uri: img.url }}
                style={{ width: 400, height: 350, objectFit: 'cover' }}
              />
            ))
          ) : (
            <Image
              source={{ uri: post.coverImage }}
              style={{ width: 400, height: 350, objectFit: 'cover' }}
            />
          )}
        </ScrollView>

        <View style={{ padding: 16 }}>
          {/* 作者卡片与点赞交互 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {post.author.avatarUrl ? (
                <Image source={{ uri: post.author.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor }} />
              ) : (
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffba20', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#563b00', fontSize: 13, fontWeight: '800' }}>{post.author.nickname[0].toUpperCase()}</Text>
                </View>
              )}
              <View>
                <Text style={{ color: textColor, fontWeight: '800', fontSize: 14 }}>{post.author.nickname}</Text>
                <Text style={{ color: subTextColor, fontSize: 10 }}>摄影爱好者 · 胶片旅人</Text>
              </View>
            </View>

            {/* 高端心形点赞按钮 */}
            <TouchableOpacity
              onPress={handleLike}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
                backgroundColor: isLiked ? 'rgba(255,82,82,0.1)' : cardBg,
                borderWidth: 1, borderColor: isLiked ? '#ff5252' : borderColor
              }}
            >
              <Heart size={16} color={isLiked ? '#ff5252' : subTextColor} fill={isLiked ? '#ff5252' : 'transparent'} />
              <Text style={{ color: isLiked ? '#ff5252' : subTextColor, fontWeight: '800', fontSize: 12 }}>
                {likesCount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 帖子标题与段落内容 */}
          <Text style={{ fontSize: 20, fontWeight: '900', color: textColor, marginBottom: 10 }}>
            {post.title}
          </Text>
          <Text style={{ fontSize: 14, color: textColor, lineHeight: 22, marginBottom: 20, fontFamily: 'sans-serif' }}>
            {post.content || '这位摄影师很随性，没有留下文字描述~'}
          </Text>

          {/* 自定义摄影标签集 */}
          {post.tags && post.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
              {post.tags.map((tag, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: isDark ? '#141414' : '#eaeaea', borderRadius: 8 }}>
                  <Tag size={10} color={subTextColor} />
                  <Text style={{ fontSize: 11, color: subTextColor, fontWeight: '700' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 曝光与硬件参数看板 (Premium Grid) */}
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor, marginBottom: 32 }}>
            <Text style={{ color: textColor, fontWeight: '800', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
              📷 曝光参数及拍摄设备 / EXIF
            </Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <ExifBadge label="相机 / Camera" val={post.camera || 'N/A'} isDark={isDark} />
              <ExifBadge label="镜头 / Lens" val={post.lens || 'N/A'} isDark={isDark} />
              <ExifBadge label="光圈 / Aperture" val={detail?.exposure?.aperture || 'f/2.8'} isDark={isDark} />
              <ExifBadge label="快门 / Shutter" val={detail?.exposure?.shutterSpeed || '1/125s'} isDark={isDark} />
              <ExifBadge label="感光度 / ISO" val={detail?.exposure?.iso || '400'} isDark={isDark} />
              <ExifBadge label="曝光补偿 / EV" val={detail?.exposure?.exposureCompensation || '0.0'} isDark={isDark} />
            </View>
          </View>

          {/* 评论展示区域 */}
          <Text style={{ fontSize: 16, fontWeight: '800', color: textColor, marginBottom: 16 }}>
            💬 读者评论 ({comments.length})
          </Text>

          {comments.length === 0 ? (
            <Text style={{ color: subTextColor, fontSize: 12, textAlign: 'center', marginVertical: 16 }}>
              沙发还空着，说点什么给摄影师鼓励吧~
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {comments.map((comment) => (
                <View key={comment.id} style={{ backgroundColor: cardBg, borderRadius: 16, padding: 12, borderWidth: 1, borderColor }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: textColor }}>{comment.user.nickname}</Text>
                    <Text style={{ fontSize: 9, color: subTextColor }}>{new Date(comment.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: textColor, lineHeight: 18 }}>{comment.content}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 底端输入条 */}
      <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: borderColor, backgroundColor: cardBg, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder="给这幅底片捎句评语吧..."
          placeholderTextColor={subTextColor}
          style={{
            flex: 1, backgroundColor: inputBg, borderRadius: 12,
            paddingHorizontal: 12, paddingVertical: 8, color: textColor, fontSize: 13,
            borderWidth: 1, borderColor
          }}
        />
        <TouchableOpacity
          onPress={handlePostComment}
          disabled={submittingComment || !newComment.trim()}
          style={{
            padding: 10, borderRadius: 12, backgroundColor: newComment.trim() ? '#ffba20' : inputBg,
            justifyContent: 'center', alignItems: 'center'
          }}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color="#563b00" />
          ) : (
            <Send size={16} color={newComment.trim() ? '#563b00' : subTextColor} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// 辅助子组件：EXIF指标卡片
const ExifBadge: React.FC<{ label: string; val: string; isDark: boolean }> = ({ label, val, isDark }) => (
  <View style={{
    width: '48%', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10,
    backgroundColor: isDark ? '#141414' : '#f0f0f0',
  }}>
    <Text style={{ fontSize: 9, color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 2 }}>{label}</Text>
    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#e7e5e5' : '#1a1a1a' }} numberOfLines={1}>{val}</Text>
  </View>
);
