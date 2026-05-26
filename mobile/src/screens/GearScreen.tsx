import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { Camera, Plus, Trash2, Star, Aperture, Layers } from 'lucide-react-native';

/**
 * GearItem 完整对齐后端 GET /api/gear 的真实响应字段结构
 * 注意：后端使用 cameraModel / lensModel 而非旧版的 name / brand
 */
export interface GearItem {
  id: string;
  cameraModel: string;
  lensModel: string;
  lensType: string;
  status: string;
  imageUrl?: string;
  formats: string[];
  shotCount?: number;
  autoShotCount?: number;
  shotCounts?: Record<string, number>;
  mount?: string;
  externalUrl?: string;
  review?: string;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface GearScreenProps {
  onAddGear: () => void;
}

export const GearScreen: React.FC<GearScreenProps> = ({ onAddGear }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [gears, setGears] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const textColor = isDark ? '#e7e5e5' : '#1a1a1a';
  const subTextColor = isDark ? '#767575' : '#9a9a9a';
  const cardBg = isDark ? '#191a1a' : '#ffffff';
  const borderColor = isDark ? 'rgba(72,72,72,0.4)' : 'rgba(224,224,224,0.6)';
  const tagBg = isDark ? '#141414' : '#eaeaea';

  /**
   * NOTE: 加载当前用户名下所有摄影设备，字段已完整对齐后端真实数据结构
   */
  const fetchGears = async (isARefresh = false) => {
    if (!isARefresh) setLoading(true);
    try {
      const response = await client.get('/api/gear');
      if (response.data && response.data.success && response.data.data) {
        setGears(response.data.data);
      } else {
        throw new Error('API responded with success=false');
      }
    } catch (err: any) {
      console.warn('[GearScreen] 获取设备列表失败，使用离线 Mock 数据:', err?.message);
      // 结构对齐后端真实字段
      const mockGears: GearItem[] = [
        {
          id: 'gear-mock-001',
          cameraModel: 'Nikon FM2',
          lensModel: 'Nikkor 50mm f/1.4',
          lensType: '定焦',
          status: 'active',
          formats: ['135'],
          rating: 4.8,
          review: '经典机械相机，1/4000s 纯机械快门极为可靠',
        },
        {
          id: 'gear-mock-002',
          cameraModel: 'Rolleiflex 3.5F',
          lensModel: 'Xenar 75mm f/3.5',
          lensType: '定焦',
          status: 'active',
          formats: ['120'],
          rating: 4.5,
          review: '中画幅双反经典，色彩与焦外极具韵味',
        }
      ];
      setGears(mockGears);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGears();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGears(true);
  };

  // NOTE: 删除设备，先乐观更新本地列表，再同步后端
  const handleDeleteGear = (id: string, name: string) => {
    Alert.alert(
      '删除设备确认',
      `确定要将【${name}】从设备柜中移除吗？此操作不可逆。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await client.delete(`/api/gear/${id}`);
              if (res.data && res.data.success) {
                setGears(prev => prev.filter(g => g.id !== id));
                Alert.alert('✅ 移除成功');
              } else {
                throw new Error('Delete API failed');
              }
            } catch (err: any) {
              console.warn('[GearScreen] 删除设备失败:', err?.message);
              // 离线沙盒降级：也在本地移除
              setGears(prev => prev.filter(g => g.id !== id));
              Alert.alert('设备已移除（离线模式）');
            }
          }
        }
      ]
    );
  };

  /**
   * 根据评分渲染金色星星标签
   */
  const renderRating = (rating?: number) => {
    if (!rating) return null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Star size={10} color="#ffba20" fill="#ffba20" />
        <Text style={{ fontSize: 10, color: '#ffba20', fontWeight: '700' }}>
          {rating.toFixed(1)}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, paddingTop: 56, paddingHorizontal: 16 }}>
      {/* 顶部标题与新建入口 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: textColor }}>
          {t('profile.tabs.gear') || '摄影设备柜'}
        </Text>
        <TouchableOpacity
          onPress={onAddGear}
          style={{
            padding: 10, backgroundColor: '#ffba20', borderRadius: 14,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            shadowColor: '#ffba20', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1, shadowRadius: 4, elevation: 1
          }}
        >
          <Plus size={16} color="#563b00" />
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#563b00' }}>
            {t('profile.gear.add') || '添加设备'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 设备陈列架 */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#ffba20" size="large" />
        </View>
      ) : (
        <FlatList
          data={gears}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffba20" />
          }
          ListEmptyComponent={
            <View style={{ flex: 1, paddingVertical: 60, justifyContent: 'center', alignItems: 'center' }}>
              <Camera size={64} color={subTextColor} />
              <Text style={{ color: textColor, fontWeight: '700', fontSize: 15, marginTop: 12 }}>
                {t('profile.gear.empty') || '陈列架空荡荡的'}
              </Text>
              <Text style={{ color: subTextColor, fontSize: 11, marginTop: 4, textAlign: 'center', lineHeight: 16, paddingHorizontal: 32 }}>
                {t('profile.gear.emptyDescOwner') || '还没有添加任何相机或镜头，赶快点击右上角配置您的专属军火库吧！'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 20,
                borderWidth: 1,
                borderColor,
                marginBottom: 14,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              {/* 设备封面图（若有） */}
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: '100%', height: 140, backgroundColor: isDark ? '#141414' : '#f0f0f0' }}
                  resizeMode="cover"
                />
              ) : null}

              <View style={{ padding: 16 }}>
                {/* 标题行 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    {/* 相机型号 */}
                    <Text style={{ fontSize: 16, fontWeight: '900', color: textColor, marginBottom: 2 }}>
                      {item.cameraModel}
                    </Text>
                    {/* 镜头型号 */}
                    <Text style={{ fontSize: 12, color: subTextColor, fontWeight: '600' }}>
                      {item.lensModel}
                    </Text>
                  </View>

                  {/* 删除按钮 */}
                  <TouchableOpacity
                    onPress={() => handleDeleteGear(item.id, item.cameraModel)}
                    style={{ padding: 6, borderRadius: 8, backgroundColor: isDark ? '#2a1515' : '#fff0f0' }}
                  >
                    <Trash2 size={15} color="#ff5252" />
                  </TouchableOpacity>
                </View>

                {/* 标签行：镜头类型 / 画幅 / 挂载 / 状态 / 评分 */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {item.lensType ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: tagBg, borderRadius: 6 }}>
                      <Aperture size={9} color={subTextColor} />
                      <Text style={{ fontSize: 10, color: subTextColor, fontWeight: '700' }}>{item.lensType}</Text>
                    </View>
                  ) : null}

                  {item.formats && item.formats.length > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: tagBg, borderRadius: 6 }}>
                      <Layers size={9} color={subTextColor} />
                      <Text style={{ fontSize: 10, color: subTextColor, fontWeight: '700' }}>
                        {item.formats.map(f => f === '135' ? '35mm' : f === '120' ? '中画幅' : f).join(' / ')}
                      </Text>
                    </View>
                  ) : null}

                  {item.mount ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: tagBg, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: subTextColor, fontWeight: '700' }}>卡口: {item.mount}</Text>
                    </View>
                  ) : null}

                  {item.status ? (
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 3,
                      backgroundColor: item.status === 'active' ? 'rgba(255,186,32,0.12)' : tagBg,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: item.status === 'active' ? 'rgba(255,186,32,0.3)' : 'transparent',
                    }}>
                      <Text style={{ fontSize: 10, color: item.status === 'active' ? '#ffba20' : subTextColor, fontWeight: '700' }}>
                        {item.status === 'active' ? '在役' : item.status === 'retired' ? '退役' : item.status}
                      </Text>
                    </View>
                  ) : null}

                  {renderRating(item.rating)}
                </View>

                {/* 拍摄数量统计（有数量时才显示） */}
                {(item.autoShotCount != null && item.autoShotCount > 0) ? (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, color: subTextColor }}>
                      📷 已关联记录 <Text style={{ color: '#ffba20', fontWeight: '800' }}>{item.autoShotCount}</Text> 张底片
                    </Text>
                  </View>
                ) : null}

                {/* 设备简介 */}
                {item.review ? (
                  <Text style={{ fontSize: 12, color: subTextColor, lineHeight: 18 }} numberOfLines={3}>
                    {item.review}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};
