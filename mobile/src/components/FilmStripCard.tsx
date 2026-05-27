import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

export interface FrameItem {
  id: string;
  imageUrl: string;
  previewUrl?: string; // 💡 轻量自适应缩略预览图，用于瞬时秒级渲染
  frameNumber: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  camera?: string;
  lens?: string;
  shotDate?: string;
  exposureCompensation?: string;
  description?: string;
  location?: string;
  tags?: string[] | string;
  fileSize?: number; // 💡 底片文件大小（字节数）
  fileFormat?: string; // 💡 底片文件格式
}

interface FilmStripCardProps {
  frame: FrameItem;
  index: number;
  format: '135' | '120' | string;
  filmStock: string;
  onPress?: () => void;
}

export const FilmStripCard: React.FC<FilmStripCardProps> = ({ frame, index, format, filmStock, onPress }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  
  const is135 = format === '135' || format === '半格' || format === '35mm';
  const frameNum = frame.frameNumber || String(index + 1).padStart(2, '0');
  const filmStockText = (filmStock || (is135 ? 'KODAK 135' : 'KODAK 120')).toUpperCase();

  // NOTE: 高维 135 拟物底片卡片设计，直角无圆角，无论何种主题均为纯黑底与黑边框，复现暗房剪裁胶片条质感
  if (is135) {
    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={onPress}
        style={{
          width: '100%',
          backgroundColor: '#000000',
          padding: 2,
          paddingBottom: 6,
          marginBottom: 16,
          borderRadius: 0, // 强制直角无圆角
          borderWidth: 1.5,
          borderColor: '#1a1a1a', // 纯黑胶片边缘描边
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 4
        }}
      >
        {/* 顶部齿孔带 */}
        <View style={{ width: '100%', height: 32, backgroundColor: '#000000', position: 'relative' }}>
          {/* 6个圆角物理齿孔，暗底孔隙 */}
          <View style={{ position: 'absolute', left: 12, right: 12, bottom: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
            {[...Array(6)].map((_, i) => (
              <View 
                key={i} 
                style={{
                  width: '8%',
                  height: 12,
                  backgroundColor: '#262626', // 复现物理胶片底片的镂空感深灰齿孔
                  borderRadius: 2
                }} 
              />
            ))}
          </View>
          {/* 胶卷型号文字，温暖的底片橙黄色刻字 */}
          <View style={{ position: 'absolute', top: 3, left: 0, right: 0, alignItems: 'center' }}>
            <Text 
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                letterSpacing: 2,
                color: 'rgba(255,186,32,0.4)',
                transform: [{ scale: 0.8 }]
              }}
            >
              {filmStockText}
            </Text>
          </View>
        </View>

        {/* 胶片底底图区域：直角、无圆角、纯黑色背景 */}
        <View style={{ width: '100%', aspectRatio: 3/2, backgroundColor: '#000000', overflow: 'hidden' }}>
          <Image
            source={{ uri: frame.previewUrl || frame.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>

        {/* 底部齿孔与帧号带 */}
        <View style={{ width: '100%', height: 36, backgroundColor: '#000000', position: 'relative' }}>
          {/* 6个圆角物理齿孔 */}
          <View style={{ position: 'absolute', left: 12, right: 12, top: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
            {[...Array(6)].map((_, i) => (
              <View 
                key={i} 
                style={{
                  width: '8%',
                  height: 12,
                  backgroundColor: '#262626',
                  borderRadius: 2
                }}
              />
            ))}
          </View>
          {/* 帧号，橙黄底片字 */}
          <View style={{ position: 'absolute', bottom: 4, left: 0, right: 0, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', color: '#ffba20', transform: [{ scale: 0.8 }] }}>
              ▶ {frameNum}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // NOTE: 复古 120 中画幅底片卡片设计，直角无圆角，全黑色卡底与深邃氛围
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        width: '100%',
        backgroundColor: '#000000',
        padding: 8,
        marginBottom: 16,
        borderRadius: 0, // 强制直角无圆角
        borderWidth: 1.5,
        borderColor: '#1a1a1a', // 纯黑色宽卡纸边框描边
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4
      }}
    >
      {/* 顶部胶卷品牌栏 */}
      <View style={{ width: '100%', height: 28, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 2, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
          {filmStockText}
        </Text>
      </View>

      {/* 照片区，无圆角，纯黑背景与黑边框 */}
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#000000', overflow: 'hidden' }}>
        <Image
          source={{ uri: frame.previewUrl || frame.imageUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>

      {/* 底部帧号标记栏 */}
      <View style={{ width: '100%', height: 32, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 2, color: '#ffba20', textTransform: 'uppercase' }}>
          ▶ {frameNum}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
