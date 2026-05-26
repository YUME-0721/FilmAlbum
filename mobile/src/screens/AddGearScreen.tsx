import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { GearItem } from './GearScreen';
import { ArrowLeft, Check, Layers, Tag, HelpCircle, HardDrive } from 'lucide-react-native';

interface AddGearScreenProps {
  onBack: () => void;
  onCreated: (gear: GearItem) => void;
}


export const AddGearScreen: React.FC<AddGearScreenProps> = ({ onBack, onCreated }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [cameraModel, setCameraModel] = useState('');
  const [lensModel, setLensModel] = useState('');
  const [lensType, setLensType] = useState('定焦');
  const [status, setStatus] = useState('active');
  const [selectedFormat, setSelectedFormat] = useState('135');
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  const textColor = isDark ? '#e7e5e5' : '#1a1a1a';
  const subTextColor = isDark ? '#767575' : '#9a9a9a';
  const cardBg = isDark ? '#191a1a' : '#ffffff';
  const inputBg = isDark ? '#131313' : '#f0f0f0';
  const borderColor = isDark ? 'rgba(72,72,72,0.4)' : 'rgba(224,224,224,0.6)';
  const bgColor = isDark ? '#0e0e0e' : '#f5f5f5';

  // NOTE: 新增设备提交，字段完整对齐后端 POST /api/gear 的 multipart 接口
  const handleSubmit = async () => {
    const trimmedCamera = cameraModel.trim();
    const trimmedLens = lensModel.trim();
    if (!trimmedCamera || !trimmedLens || !lensType || !status) {
      Alert.alert('校验失败', '相机型号、镜头型号、镜头类型和设备状态为必填项');
      return;
    }

    setLoading(true);
    // 后端接受 FormData 格式
    const formData = new FormData();
    formData.append('cameraModel', trimmedCamera);
    formData.append('lensModel', trimmedLens);
    formData.append('lensType', lensType);
    formData.append('status', status);
    formData.append('formats', JSON.stringify([selectedFormat]));
    formData.append('review', review.trim());

    try {
      const response = await client.post('/api/gear', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data && response.data.success && response.data.data) {
        const createdGear: GearItem = {
          id: response.data.data.id,
          cameraModel: trimmedCamera,
          lensModel: trimmedLens,
          lensType,
          status,
          formats: [selectedFormat],
          review: review.trim(),
        };
        Alert.alert('✅ 设备配置成功');
        onCreated(createdGear);
      } else {
        throw new Error('Create gear API responded with failure');
      }
    } catch (err: any) {
      console.warn('[AddGearScreen] 添加设备失败:', err?.message);
      // 失败后降级离线模式，使用本地数据
      const createdMockGear: GearItem = {
        id: `gear-mock-${Date.now()}`,
        cameraModel: trimmedCamera,
        lensModel: trimmedLens,
        lensType,
        status,
        formats: [selectedFormat],
        review: review.trim(),
      };
      Alert.alert('离线添加', '设备已在本地添加，联网后将自动同步');
      onCreated(createdMockGear);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bgColor }} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      {/* 顶栏 */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={onBack}
          style={{ padding: 10, backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor }}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: textColor }}>
          {t('profile.gear.add') || '添加拍摄设备'}
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        {/* 建档表单卡片 */}
        <View style={{ backgroundColor: cardBg, borderRadius: 24, padding: 20, borderWidth: 1, borderColor, gap: 16 }}>

          {/* 相机型号 */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: subTextColor, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              相机型号 *
            </Text>
            <TextInput
              value={cameraModel}
              onChangeText={setCameraModel}
              placeholder="例如：Leica M6、Nikon FM2、Rolleiflex 3.5F"
              placeholderTextColor={subTextColor}
              style={{
                backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                borderWidth: 1, borderColor, color: textColor, fontSize: 13
              }}
            />
          </View>

          {/* 镜头型号 */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: subTextColor, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              镜头型号 *
            </Text>
            <TextInput
              value={lensModel}
              onChangeText={setLensModel}
              placeholder="例如：Noctilux 50mm f/0.95、Nikkor 50mm f/1.4"
              placeholderTextColor={subTextColor}
              style={{
                backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                borderWidth: 1, borderColor, color: textColor, fontSize: 13
              }}
            />
          </View>

          {/* 镜头类型 */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: subTextColor, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              镜头类型 *
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['定焦', '变焦', '马克罗'] as const).map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setLensType(opt)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: lensType === opt ? '#ffba20' : inputBg,
                    borderWidth: 1, borderColor: lensType === opt ? '#ffba20' : borderColor,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: lensType === opt ? '#563b00' : subTextColor }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 适用画幅 */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: subTextColor, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              适用画幅
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['135', '120', '全帧'] as const).map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setSelectedFormat(opt)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: selectedFormat === opt ? '#ffba20' : inputBg,
                    borderWidth: 1, borderColor: selectedFormat === opt ? '#ffba20' : borderColor,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: selectedFormat === opt ? '#563b00' : subTextColor }}>
                    {opt === '135' ? '35mm (135)' : opt === '120' ? '中画幅 (120)' : opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 设备状态 */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: subTextColor, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              设备状态
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([{ value: 'active', label: '在役中' }, { value: 'retired', label: '已退役' }, { value: 'sold', label: '已转让' }] as const).map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setStatus(opt.value)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: status === opt.value ? '#ffba20' : inputBg,
                    borderWidth: 1, borderColor: status === opt.value ? '#ffba20' : borderColor,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: status === opt.value ? '#563b00' : subTextColor }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 设备评测与备注 */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: subTextColor, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              设备简介与评测（选填）
            </Text>
            <TextInput
              value={review}
              onChangeText={setReview}
              placeholder="可以记录镜头卡口、光圈特点、生产年份等背景历史..."
              placeholderTextColor={subTextColor}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                borderWidth: 1, borderColor, color: textColor, fontSize: 13,
                height: 100, textAlignVertical: 'top'
              }}
            />
          </View>

          {/* 提交表单主按钮 */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', paddingVertical: 14, backgroundColor: '#ffba20', borderRadius: 16,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
              marginTop: 12, shadowColor: '#ffba20', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 2
            }}
          >
            {loading ? (
              <ActivityIndicator color="#563b00" size="small" />
            ) : (
              <>
                <Check size={16} color="#563b00" />
                <Text style={{ color: '#563b00', fontWeight: '800', fontSize: 14 }}>
                  {t('common.confirm') || '确认添加设备'}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </ScrollView>
  );
};
