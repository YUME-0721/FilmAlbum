import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { Flame, Compass, Heart, MessageCircle, RefreshCw } from 'lucide-react-native';

export interface PostItem {
  id: string;
  title: string;
  content: string;
  filmType: string;
  camera: string;
  lens: string;
  tags: string[];
  author: {
    id: string;
    nickname: string;
    avatarUrl: string;
  };
  likesCount: number;
  commentsCount: number;
  coverImage?: string;
  images: Array<{ url: string; previewUrl?: string }>;
  createdAt: string;
}

interface ExploreScreenProps {
  onSelectPost: (post: PostItem) => void;
}

type FeedTab = 'recommend' | 'feed';

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ onSelectPost }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [activeTab, setActiveTab] = useState<FeedTab>('recommend');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const textColor = isDark ? '#e7e5e5' : '#1a1a1a';
  const subTextColor = isDark ? '#767575' : '#9a9a9a';
  const cardBg = isDark ? '#191a1a' : '#ffffff';
  const borderColor = isDark ? 'rgba(72,72,72,0.4)' : 'rgba(224,224,224,0.6)';

  // NOTE: 获取线上社区帖子，连不上真实 API 时自动降级为高画质沙盒 Mock 社区数据
  const fetchPosts = async (tab: FeedTab = activeTab, isARefresh = false) => {
    if (!isARefresh) setLoading(true);
    try {
      // 推荐流 (recommend) 和 关注动态流 (feed) 对接后端参数
      const response = await client.get('/api/posts', {
        params: { type: tab, page: 1, pageSize: 20 }
      });
      if (response.data && response.data.success && response.data.data) {
        setPosts(response.data.data);
      } else {
        throw new Error('Fetch posts failed');
      }
    } catch (err: any) {
      console.log('API Error, falling back to mock explore community data:', err.message);
      // 降级本地高画质沙盒 Mock 数据
      const mockPosts: PostItem[] = [
        {
          id: 'post-mock-001',
          title: '银盐落日 · 镰仓海畔的金色余晖',
          content: '手持经典的 Nikon FM2，搭配富士业务卷 Superia 400。在镰仓海边守候了整整一个下午，终于捕捉到了这抹如融化黄金般的银盐落日。底片自带的蓝橙冷暖对比极度迷人。',
          filmType: 'COLOR_NEGATIVE',
          camera: 'Nikon FM2',
          lens: 'Nikkor 50mm f/1.4',
          tags: ['镰仓', '日落', '富士业务400', '海边'],
          author: {
            id: 'user-mock-101',
            nickname: 'Kamakura_Aki',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop'
          },
          likesCount: 142,
          commentsCount: 28,
          coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop',
          images: [{ url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop' }],
          createdAt: '2026-05-24T18:30:00.000Z'
        },
        {
          id: 'post-mock-002',
          title: '66画幅的宁静 · Rolleiflex 黑白光影',
          content: '禄来双反 Rolleiflex 3.5F，使用经典的柯达黑白卷 TRI-X 400。在充满老上海风情的弄堂里静候光影移动，中画幅底片的灰阶过渡之细腻、空间体积感之强，确实是数码难以模拟的艺术。',
          filmType: 'BW_NEGATIVE',
          camera: 'Rolleiflex 3.5F',
          lens: 'Xenar 75mm f/3.5',
          tags: ['上海', '弄堂', '柯达TriX', '禄来双反', '黑白'],
          author: {
            id: 'user-mock-102',
            nickname: '上海底片行者',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop'
          },
          likesCount: 98,
          commentsCount: 15,
          coverImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop',
          images: [{ url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop' }],
          createdAt: '2026-05-23T10:15:00.000Z'
        },
        {
          id: 'post-mock-003',
          title: '街头游侠 · Leica 视角下的雨夜东京',
          content: 'Leica M6 + 柯达金 Kodak Gold 200，推曝一档。雨夜的东京涩谷霓虹闪烁，被水洼反射出的五彩光晕在胶片颗粒的糅合下显现出梦幻的油画质感。街拍的魅力就在于这一刻的不确定性。',
          filmType: 'COLOR_NEGATIVE',
          camera: 'Leica M6',
          lens: 'Summicron 35mm f/2',
          tags: ['东京', '涩谷', '雨夜街拍', '徕卡M6', '柯达金200'],
          author: {
            id: 'user-mock-103',
            nickname: 'Shibuya_Drifter',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop'
          },
          likesCount: 256,
          commentsCount: 42,
          coverImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop',
          images: [{ url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop' }],
          createdAt: '2026-05-22T22:45:00.000Z'
        }
      ];
      setPosts(mockPosts);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts(activeTab);
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts(activeTab, true);
  };

  return (
    <View style={{ flex: 1, paddingTop: 56, paddingHorizontal: 16 }}>
      {/* 顶部发现/关注双流切换 Tab Bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: borderColor, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={() => setActiveTab('recommend')}
          style={{
            flex: 1, paddingVertical: 8, alignItems: 'center',
            borderBottomWidth: activeTab === 'recommend' ? 2 : 0,
            borderBottomColor: '#ffba20', flexDirection: 'row', justifyContent: 'center', gap: 6
          }}
        >
          <Flame size={16} color={activeTab === 'recommend' ? '#ffba20' : subTextColor} />
          <Text style={{ fontWeight: '800', color: activeTab === 'recommend' ? '#ffba20' : subTextColor, fontSize: 14 }}>
            {t('nav.recommend') || '发现推荐'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('feed')}
          style={{
            flex: 1, paddingVertical: 8, alignItems: 'center',
            borderBottomWidth: activeTab === 'feed' ? 2 : 0,
            borderBottomColor: '#ffba20', flexDirection: 'row', justifyContent: 'center', gap: 6
          }}
        >
          <Compass size={16} color={activeTab === 'feed' ? '#ffba20' : subTextColor} />
          <Text style={{ fontWeight: '800', color: activeTab === 'feed' ? '#ffba20' : subTextColor, fontSize: 14 }}>
            {t('nav.feed') || '关注动态'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 动态内容瀑布卡片列表 */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#ffba20" size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffba20" />
          }
          ListEmptyComponent={
            <View style={{ paddingVertical: 32, justifyContent: 'center', alignItems: 'center' }}>
              <Compass size={48} color={subTextColor} />
              <Text style={{ color: textColor, fontWeight: '700', marginTop: 12 }}>暂无社区动态</Text>
              <Text style={{ color: subTextColor, fontSize: 11, marginTop: 4 }}>去关注几位摄影师，或者发布您的首张大作吧！</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelectPost(item)}
              style={{
                backgroundColor: cardBg, borderRadius: 24, overflow: 'hidden',
                borderWidth: 1, borderColor, marginBottom: 16,
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
              }}
            >
              {/* 动态封面大图 */}
              {item.coverImage ? (
                <Image
                  source={{ uri: item.coverImage }}
                  style={{ width: '100%', height: 200, objectFit: 'cover' }}
                />
              ) : (
                <View style={{ width: '100%', height: 120, backgroundColor: isDark ? '#141414' : '#eaeaea', justifyContent: 'center', alignItems: 'center' }}>
                  <Compass size={32} color={subTextColor} />
                </View>
              )}

              {/* 动态卡片下层文本区 */}
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: textColor, marginBottom: 6 }}>
                  {item.title}
                </Text>
                
                {/* 胶片/机身/镜头微观参数标签 */}
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffba20', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>
                  🎞️ {item.filmType === 'BW_NEGATIVE' ? '黑白负片' : '彩色负片'} · 📷 {item.camera} / {item.lens.split(' ')[0]}
                </Text>

                {/* 作者信息与社交反馈操作条 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: isDark ? 'rgba(72,72,72,0.2)' : 'rgba(224,224,224,0.3)', paddingTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {item.author.avatarUrl ? (
                      <Image source={{ uri: item.author.avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor }} />
                    ) : (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#ffba20', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#563b00', fontSize: 10, fontWeight: '800' }}>{item.author.nickname[0].toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textColor }}>
                      {item.author.nickname}
                    </Text>
                  </View>

                  {/* 赞与评点赞计数 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Heart size={13} color={subTextColor} />
                      <Text style={{ fontSize: 11, color: subTextColor, fontWeight: '700' }}>{item.likesCount}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MessageCircle size={13} color={subTextColor} />
                      <Text style={{ fontSize: 11, color: subTextColor, fontWeight: '700' }}>{item.commentsCount}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};
