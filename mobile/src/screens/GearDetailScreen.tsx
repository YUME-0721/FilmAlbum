import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Linking, StyleSheet, Dimensions
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { GearItem } from './GearScreen';
import {
  ArrowLeft, Camera, Star, Disc, Layers, ExternalLink, Calendar
} from 'lucide-react-native';

interface GearDetailScreenProps {
  gear: GearItem;
  onBack: () => void;
}

export const GearDetailScreen: React.FC<GearDetailScreenProps> = ({ gear, onBack }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [detail, setDetail] = useState<GearItem>(gear);
  const [loading, setLoading] = useState(true);

  const textColor = isDark ? '#e7e5e5' : '#1a1a1a';
  const subTextColor = isDark ? '#767575' : '#9a9a9a';
  const cardBg = isDark ? '#191a1a' : '#ffffff';
  const borderColor = isDark ? 'rgba(72,72,72,0.4)' : 'rgba(224,224,224,0.6)';
  const bgColor = isDark ? '#0e0e0e' : '#f5f5f5';
  const tagBg = isDark ? '#141414' : '#eaeaea';

  // 拉取最新的设备详情，实现实时同步
  const fetchGearDetail = async () => {
    setLoading(true);
    try {
      const response = await client.get(`/api/gear/${gear.id}`);
      if (response.data && response.data.success && response.data.data) {
        setDetail(response.data.data);
      }
    } catch (err: any) {
      console.warn('[GearDetailScreen] 无法获取最新详情，使用本地传入数据:', err.message);
      // 保持本地传入的 gear 作为 fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGearDetail();
  }, [gear.id]);

  const handleOpenExternal = () => {
    if (detail.externalUrl) {
      Linking.openURL(detail.externalUrl).catch(err => {
        console.error('Failed to open external link:', err);
      });
    }
  };

  // 状态显示
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
      case 'using':
        return '正在使用';
      case 'retired':
      case 'used':
        return '曾经拥有';
      case 'wanted':
        return '愿望清单';
      default:
        return status;
    }
  };

  // 解析画幅
  const formatText = (formats?: string[]) => {
    if (!formats || formats.length === 0) return '35mm';
    return formats.map(f => f === '135' ? '35mm' : f === '120' ? '中画幅' : f).join(' / ');
  };

  // 设备介绍段落拆分，第一个字不作特殊大写
  const reviewParagraphs = detail.review
    ? detail.review.split('\n').filter(p => p.trim())
    : ['暂无设备介绍。'];

  // 星级渲染
  const renderStars = (rating: number = 0) => {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            color="#ffba20"
            fill={i < Math.round(rating) ? '#ffba20' : 'transparent'}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* 顶部导航 */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={onBack}
          style={{ padding: 10, backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor }}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '800', color: textColor, flex: 1 }} numberOfLines={1}>
          设备档案
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* 设备图片展示 */}
        <View style={{ width: '100%', height: 260, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#141414' : '#f0f0f0', borderBottomWidth: 1, borderBottomColor: borderColor }}>
          {detail.imageUrl ? (
            <Image
              source={{ uri: detail.imageUrl }}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Camera size={64} color={subTextColor} style={{ opacity: 0.5 }} />
              <Text style={{ fontSize: 12, color: subTextColor, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                No Equipment Image
              </Text>
            </View>
          )}
        </View>

        <View style={{ padding: 20 }}>
          {/* 状态与卡口标签 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {detail.status ? (
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4,
                backgroundColor: (detail.status === 'active' || detail.status === 'using') ? 'rgba(255,186,32,0.12)' : (detail.status === 'wanted' ? 'rgba(244,63,94,0.12)' : tagBg),
                borderRadius: 8,
                borderWidth: 1,
                borderColor: (detail.status === 'active' || detail.status === 'using') ? 'rgba(255,186,32,0.3)' : (detail.status === 'wanted' ? 'rgba(244,63,94,0.3)' : 'transparent'),
              }}>
                <Text style={{ fontSize: 10, color: (detail.status === 'active' || detail.status === 'using') ? '#ffba20' : (detail.status === 'wanted' ? '#f43f5e' : subTextColor), fontWeight: '800' }}>
                  {getStatusText(detail.status)}
                </Text>
              </View>
            ) : null}

            {detail.mount ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: tagBg, borderRadius: 8 }}>
                <Layers size={10} color={subTextColor} />
                <Text style={{ fontSize: 10, color: subTextColor, fontWeight: '800' }}>
                  {detail.mount} 卡口
                </Text>
              </View>
            ) : null}
          </View>

          {/* 相机型号与搭配镜头 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: textColor, marginBottom: 4 }}>
              {detail.cameraModel}
            </Text>
            {detail.lensModel ? (
              <Text style={{ fontSize: 14, color: subTextColor, fontWeight: '600' }}>
                搭配: <Text style={{ color: textColor }}>{detail.lensModel}</Text>
              </Text>
            ) : null}
          </View>

          {/* 核心指标参数格栅 */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            {/* 常用画幅 */}
            <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, padding: 12, borderWidth: 1, borderColor, justifyContent: 'space-between', minHeight: 70 }}>
              <Text style={{ fontSize: 9, color: subTextColor, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>常用画幅</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffba20', marginTop: 4 }}>
                {formatText(detail.formats)}
              </Text>
            </View>
            {/* 已拍快门 */}
            <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, padding: 12, borderWidth: 1, borderColor, justifyContent: 'space-between', minHeight: 70 }}>
              <Text style={{ fontSize: 9, color: subTextColor, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>已拍快门</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: textColor, marginTop: 4 }}>
                {detail.autoShotCount ?? 0} <Text style={{ fontSize: 9, fontWeight: 'normal', color: subTextColor }}>张</Text>
              </Text>
            </View>
            {/* 主观评分 */}
            <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, padding: 12, borderWidth: 1, borderColor, justifyContent: 'space-between', minHeight: 70 }}>
              <Text style={{ fontSize: 9, color: subTextColor, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>主观评分</Text>
              {renderStars(detail.rating)}
            </View>
          </View>

          {/* 设备介绍/点评 */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffba20', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              设备点评与历史介绍
            </Text>
            <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor }}>
              {reviewParagraphs.map((para, index) => (
                <Text
                  key={index}
                  style={{
                    fontSize: 13,
                    color: textColor,
                    lineHeight: 20,
                    marginBottom: index === reviewParagraphs.length - 1 ? 0 : 12,
                    textAlign: 'justify'
                  }}
                >
                  {para}
                </Text>
              ))}
            </View>
          </View>

          {/* 外部链接按钮 */}
          {detail.externalUrl ? (
            <TouchableOpacity
              onPress={handleOpenExternal}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginTop: 24, paddingVertical: 12, borderRadius: 14,
                backgroundColor: isDark ? 'rgba(255,186,32,0.1)' : 'rgba(255,186,32,0.06)',
                borderWidth: 1, borderColor: '#ffba20'
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffba20' }}>
                查看更多相关评测资料
              </Text>
              <ExternalLink size={14} color="#ffba20" />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};
