import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { ArrowLeft, Film, Camera as CameraIcon, MapPin, Calendar, Tag, X, Check } from 'lucide-react-native';
import { RollItem } from './DashboardScreen';

// 影集画幅格式列表 & 影集胶卷类型列表 (将作为公开设置从系统 API 动态更新载入)
const DEFAULT_ROLL_FORMATS = [
  {"format":"135","label":"35mm (135)","frames":["半格","35mm","xpan"],"frameCols":{"半格":12,"35mm":6,"xpan":1}},
  {"format":"120","label":"中画幅 (120)","frames":["620","630","645","6x6","6x7","6x9"],"frameCols":{"620":1,"630":1,"645":4,"6x6":3,"6x7":3,"6x9":2}}
];

const DEFAULT_FILM_TYPES = ["彩色负片", "黑白负片", "彩色反转片", "黑白反转片"];

// 影集状态选项
const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: '已完成' },
  { value: 'SHOOTING', label: '拍摄中' },
  { value: 'DEVELOPING', label: '冲洗中' },
];

interface AddRollScreenProps {
  onBack: () => void;
  onCreated: (roll: RollItem) => void;
}

export const AddRollScreen: React.FC<AddRollScreenProps> = ({ onBack, onCreated }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  // 基础参数状态
  const [title, setTitle] = useState('');
  const [filmStock, setFilmStock] = useState('');
  const [location, setLocation] = useState('');
  const [camera, setCamera] = useState('');
  const [lens, setLens] = useState('');
  const [shotDate, setShotDate] = useState(new Date().toISOString().split('T')[0].replace(/-/g, '/'));
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0].replace(/-/g, '/'));
  const [format, setFormat] = useState('35mm');
  const [filmType, setFilmType] = useState('彩色负片');
  const [status, setStatus] = useState('COMPLETED');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 联想下拉菜单辅助状态与系统规格动态设定
  const [allFilmStocks, setAllFilmStocks] = useState<any[]>([]);
  const [allGears, setAllGears] = useState<any[]>([]);
  const [activeInput, setActiveInput] = useState<'filmStock' | 'camera' | 'lens' | null>(null);
  
  const [rollFormats, setRollFormats] = useState<any[]>(DEFAULT_ROLL_FORMATS);
  const [filmTypes, setFilmTypes] = useState<string[]>(DEFAULT_FILM_TYPES);

  // 加载联想字典与系统全局胶卷及画幅规范
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const [stocksRes, gearRes, systemRes] = await Promise.all([
          client.get('/api/film-stocks').catch(() => ({ data: { data: [] } })),
          client.get('/api/gear').catch(() => ({ data: { data: [] } })),
          client.get('/api/system/settings').catch(() => null)
        ]);
        if (stocksRes.data?.success && stocksRes.data?.data) {
          setAllFilmStocks(stocksRes.data.data);
        }
        if (gearRes.data?.success && gearRes.data?.data) {
          setAllGears(gearRes.data.data);
        }
        if (systemRes?.data?.success && systemRes?.data?.data) {
          if (systemRes.data.data.rollFormats) setRollFormats(systemRes.data.data.rollFormats);
          if (systemRes.data.data.filmTypes) setFilmTypes(systemRes.data.data.filmTypes);
        }
      } catch (err) {
        console.warn('加载字典及系统参数失败:', err);
      }
    };
    loadSuggestions();
  }, []);

  // NOTE: 核心算法：识别当前输入的胶卷型号基础大画幅规格（135 / 120），实现动态下拉匹配
  const getBaseFormat = () => {
    const stock = filmStock.toLowerCase();
    if (stock.includes('120') || stock.includes('medium') || stock.includes('中画幅') || stock.includes('6x6') || stock.includes('645') || stock.includes('6x7')) {
      return '120';
    }
    const matched = allFilmStocks.find(s => `${s.brand} ${s.model}`.toLowerCase() === stock);
    if (matched && matched.format) {
      if (matched.format.includes('120')) return '120';
    }
    return '135';
  };

  const baseFormat = getBaseFormat();
  const formatConfig = rollFormats.find(f => f.format === baseFormat) || rollFormats[0];
  const activeFormats: string[] = formatConfig ? formatConfig.frames : [];

  // 当基础规格切换，且当前选择画幅不在可选项内，智能自动回落适配
  useEffect(() => {
    if (activeFormats.length > 0 && !activeFormats.includes(format)) {
      setFormat(activeFormats[1] || activeFormats[0]); // 优先选取 35mm 或 6x6，退而求其次选首个
    }
  }, [baseFormat, activeFormats]);

  const addTag = (value: string) => {
    const trimmed = value.replace(/[, ]+$/, '').trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('校验失败', '请输入影集标题');
      return;
    }
    if (!filmStock.trim()) {
      Alert.alert('校验失败', '请输入胶卷型号');
      return;
    }

    setLoading(true);
    const payload = {
      title: title.trim(),
      filmStock: filmStock.trim(),
      camera: camera.trim(),
      lens: lens.trim(),
      location: location.trim(),
      shotDate: shotDate.replace(/\//g, '-'),
      endDate: endDate.replace(/\//g, '-'),
      format,
      filmType,
      tags,
      status,
    };

    try {
      const response = await client.post('/api/rolls', payload);
      if (response.data?.success && response.data?.data) {
        const newRoll: RollItem = response.data.data;
        Alert.alert('✅ 建档成功', `《${newRoll.title}》已成功发布并同步`, [
          { text: '查看详情', onPress: () => onCreated(newRoll) },
          { text: '返回列表', onPress: onBack },
        ]);
      } else {
        throw new Error('API format exception');
      }
    } catch (err) {
      const localRoll: RollItem = {
        id: `roll-local-${Date.now()}`,
        ...payload,
      };
      Alert.alert('📦 离线保存', '后端未连接，已将新影集记录保存在本地暗房沙盒中', [
        { text: '查看详情', onPress: () => onCreated(localRoll) },
        { text: '返回列表', onPress: onBack },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const inputBg = isDark ? '#191a1a' : '#ffffff';
  const borderColor = isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)';
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const placeholderColor = isDark ? '#767575' : '#9a9a9a';
  const cardBg = isDark ? '#191a1a' : '#f5f5f5';

  const filteredStocks = filmStock.trim() 
    ? allFilmStocks.filter(s => `${s.brand} ${s.model}`.toLowerCase().includes(filmStock.toLowerCase()))
    : allFilmStocks.slice(0, 5);

  const filteredCameras = allGears.filter(g => g.type === 'CAMERA' && g.name.toLowerCase().includes(camera.toLowerCase()));
  const filteredLenses = allGears.filter(g => g.type === 'LENS' && g.name.toLowerCase().includes(lens.toLowerCase()));

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: isDark ? '#0e0e0e' : '#f5f5f5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 顶栏 */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={onBack}
          style={{ padding: 10, backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor }}
        >
          <ArrowLeft size={18} color={textColor} />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '900', color: textColor }}>
          📷 创建影集
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{ padding: 10, backgroundColor: '#ffba20', borderRadius: 12 }}
        >
          {loading
            ? <ActivityIndicator size="small" color="#563b00" />
            : <Check size={18} color="#563b00" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {/* 影集标题 */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 6, letterSpacing: 0.5 }}>
            影集标题
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="请输入影集标题，如：初试66黑白反转"
            placeholderTextColor={placeholderColor}
            style={{
              backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
              borderWidth: 1, borderColor, color: textColor, fontSize: 13,
            }}
          />
        </View>

        {/* 胶卷型号 & 拍摄地点 */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, zIndex: 10 }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 6, letterSpacing: 0.5 }}>
              胶卷型号
            </Text>
            <TextInput
              value={filmStock}
              onChangeText={(txt) => { setFilmStock(txt); setActiveInput('filmStock'); }}
              onFocus={() => setActiveInput('filmStock')}
              placeholder="例如：Lucky 1021"
              placeholderTextColor={placeholderColor}
              style={{
                backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                borderWidth: 1, borderColor, color: textColor, fontSize: 13,
              }}
            />
            {/* 胶卷联想推荐卡 */}
            {activeInput === 'filmStock' && filteredStocks.length > 0 && (
              <View style={{
                position: 'absolute', top: 68, left: 0, right: 0,
                backgroundColor: isDark ? '#191a1a' : '#ffffff',
                borderRadius: 12, borderWidth: 1, borderColor: '#ffba20',
                paddingVertical: 4, zIndex: 99, elevation: 5,
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6
              }}>
                {filteredStocks.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setFilmStock(`${item.brand} ${item.model}`);
                      if (item.format) setFormat(item.format);
                      if (item.filmType) setFilmType(item.filmType);
                      setActiveInput(null);
                    }}
                    style={{
                      paddingVertical: 10, paddingHorizontal: 14,
                      borderBottomWidth: idx === filteredStocks.length - 1 ? 0 : 0.5,
                      borderBottomColor: isDark ? 'rgba(72,72,72,0.2)' : 'rgba(224,224,224,0.4)'
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: textColor }}>{item.brand} {item.model}</Text>
                    <Text style={{ fontSize: 9, color: placeholderColor, marginTop: 2 }}>{item.filmType || '彩色负片'} • {item.format || '135'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 6, letterSpacing: 0.5 }}>
              拍摄地点
            </Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="例如：陕西 西安"
              placeholderTextColor={placeholderColor}
              style={{
                backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                borderWidth: 1, borderColor, color: textColor, fontSize: 13,
              }}
            />
          </View>
        </View>

        {/* 相机型号 & 镜头型号 (账号设备筛选匹配) */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, zIndex: 5 }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 6, letterSpacing: 0.5 }}>
              相机型号
            </Text>
            <TextInput
              value={camera}
              onChangeText={(txt) => { setCamera(txt); setActiveInput('camera'); }}
              onFocus={() => setActiveInput('camera')}
              placeholder="例如：Nikon F3"
              placeholderTextColor={placeholderColor}
              style={{
                backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                borderWidth: 1, borderColor, color: textColor, fontSize: 13,
              }}
            />
            {/* 相机联想卡 */}
            {activeInput === 'camera' && filteredCameras.length > 0 && (
              <View style={{
                position: 'absolute', top: 68, left: 0, right: 0,
                backgroundColor: isDark ? '#191a1a' : '#ffffff',
                borderRadius: 12, borderWidth: 1, borderColor: '#ffba20',
                paddingVertical: 4, zIndex: 99, elevation: 5
              }}>
                {filteredCameras.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setCamera(item.name);
                      if (item.format) setFormat(item.format);
                      setActiveInput(null);
                    }}
                    style={{
                      paddingVertical: 10, paddingHorizontal: 14,
                      borderBottomWidth: idx === filteredCameras.length - 1 ? 0 : 0.5,
                      borderBottomColor: isDark ? 'rgba(72,72,72,0.2)' : 'rgba(224,224,224,0.4)'
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: textColor }}>{item.name}</Text>
                    <Text style={{ fontSize: 9, color: placeholderColor, marginTop: 2 }}>{item.brand} • {item.format === '135' ? '35mm' : '中画幅'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={{ flex: 1, position: 'relative' }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 6, letterSpacing: 0.5 }}>
              镜头型号
            </Text>
            <TextInput
              value={lens}
              onChangeText={(txt) => { setLens(txt); setActiveInput('lens'); }}
              onFocus={() => setActiveInput('lens')}
              placeholder="例如：NIKKOR 50mm f1.8D"
              placeholderTextColor={placeholderColor}
              style={{
                backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                borderWidth: 1, borderColor, color: textColor, fontSize: 13,
              }}
            />
            {/* 镜头联想卡 */}
            {activeInput === 'lens' && filteredLenses.length > 0 && (
              <View style={{
                position: 'absolute', top: 68, left: 0, right: 0,
                backgroundColor: isDark ? '#191a1a' : '#ffffff',
                borderRadius: 12, borderWidth: 1, borderColor: '#ffba20',
                paddingVertical: 4, zIndex: 99, elevation: 5
              }}>
                {filteredLenses.map((item, idx, arr) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setLens(item.name);
                      setActiveInput(null);
                    }}
                    style={{
                      paddingVertical: 10, paddingHorizontal: 14,
                      borderBottomWidth: idx === arr.length - 1 ? 0 : 0.5,
                      borderBottomColor: isDark ? 'rgba(72,72,72,0.2)' : 'rgba(224,224,224,0.4)'
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: textColor }}>{item.name}</Text>
                    <Text style={{ fontSize: 9, color: placeholderColor, marginTop: 2 }}>{item.brand}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* 拍摄开始时间 & 拍摄结束时间 */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 6, letterSpacing: 0.5 }}>
              拍摄开始时间
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={shotDate}
                onChangeText={setShotDate}
                placeholder="2026/05/24"
                placeholderTextColor={placeholderColor}
                style={{
                  backgroundColor: inputBg, borderRadius: 12, paddingLeft: 14, paddingRight: 36, paddingVertical: 12,
                  borderWidth: 1, borderColor, color: textColor, fontSize: 13,
                }}
              />
              <Calendar size={14} color={placeholderColor} style={{ position: 'absolute', right: 12, top: 15 }} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 6, letterSpacing: 0.5 }}>
              拍摄结束时间
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026/05/24"
                placeholderTextColor={placeholderColor}
                style={{
                  backgroundColor: inputBg, borderRadius: 12, paddingLeft: 14, paddingRight: 36, paddingVertical: 12,
                  borderWidth: 1, borderColor, color: textColor, fontSize: 13,
                }}
              />
              <Calendar size={14} color={placeholderColor} style={{ position: 'absolute', right: 12, top: 15 }} />
            </View>
          </View>
        </View>

        {/* 画幅 & 类型 (核心改动：自适应过滤显示) */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 6, letterSpacing: 0.5 }}>
              画幅 ({baseFormat} 规格)
            </Text>
            <View style={{ position: 'relative' }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
              >
                {activeFormats.map(f => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFormat(f)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: format === f ? '#ffba20' : cardBg,
                      borderWidth: 1, borderColor: format === f ? '#ffba20' : borderColor,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '900', color: format === f ? '#563b00' : textColor }}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 6, letterSpacing: 0.5 }}>
              类型
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
            >
              {filmTypes.map(ft => (
                <TouchableOpacity
                  key={ft}
                  onPress={() => setFilmType(ft)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: filmType === ft ? 'rgba(255,186,32,0.15)' : cardBg,
                    borderWidth: 1, borderColor: filmType === ft ? '#ffba20' : borderColor,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', color: filmType === ft ? '#ffba20' : textColor }}>
                    {ft}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* 影集状态 */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, marginBottom: 8, letterSpacing: 0.5 }}>
            影集状态
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setStatus(opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: status === opt.value ? '#ffba20' : cardBg,
                  borderWidth: 1,
                  borderColor: status === opt.value ? '#ffba20' : borderColor,
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '900', color: status === opt.value ? '#563b00' : textColor }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 自定义标签 */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 }}>
            <Tag size={12} color={placeholderColor} />
            <Text style={{ fontSize: 11, fontWeight: '900', color: placeholderColor, letterSpacing: 0.5 }}>
              自定义标签
            </Text>
          </View>
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={() => addTag(tagInput)}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            placeholder="键入标签后按空格或回车添加..."
            placeholderTextColor={placeholderColor}
            returnKeyType="done"
            style={{
              backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
              borderWidth: 1, borderColor, color: textColor, fontSize: 13, marginBottom: 10,
            }}
          />
          {tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(tag => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => removeTag(tag)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: 10, paddingVertical: 5,
                    backgroundColor: 'rgba(255,186,32,0.12)',
                    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,186,32,0.3)',
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#ffba20', fontWeight: '700' }}>#{tag}</Text>
                  <X size={10} color="#ffba20" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 底部操作按钮：取消 & 提交创建 */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={onBack}
            style={{
              flex: 1, paddingVertical: 14, borderRadius: 12,
              backgroundColor: cardBg, borderWidth: 1, borderColor,
              justifyContent: 'center', alignItems: 'center'
            }}
          >
            <Text style={{ color: textColor, fontWeight: '800', fontSize: 14 }}>
              取消
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{
              flex: 2, paddingVertical: 14, borderRadius: 12,
              backgroundColor: '#ffba20',
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
              shadowColor: '#ffba20', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6,
              elevation: 4
            }}
          >
            {loading
              ? <ActivityIndicator color="#563b00" />
              : <Text style={{ color: '#563b00', fontWeight: '900', fontSize: 14 }}>
                  创建影集 ✦
                </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
