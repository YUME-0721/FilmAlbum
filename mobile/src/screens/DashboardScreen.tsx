import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { FolderHeart, LogOut, Search, Plus, Calendar, MapPin, Settings } from 'lucide-react-native';

export interface FrameItem {
  id: string;
  imageUrl?: string;
  previewUrl?: string;
}

export interface RollItem {
  id: string;
  title: string;
  filmStock: string;
  camera: string;
  lens: string;
  location: string;
  shotDate: string;
  format: string;
  status: string;
  tags: string[];
  filmType?: string;            // 新增的底片工艺类型属性以对应系统预设
  endDate?: string;             // 拍摄结束时间
  frames?: FrameItem[];         // 聚合的底片照片列表
}

interface DashboardScreenProps {
  extraRolls?: RollItem[];      // 本地新建（未同步到服务端）的胶卷
  onSelectRoll: (roll: RollItem) => void;
  onAddRoll: () => void;        // 打开新建胶卷页
  onOpenSettings: () => void;   // 打开设置页
  onEditProfile: () => void;    // 打开个人资料编辑页
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ extraRolls = [], onSelectRoll, onAddRoll, onOpenSettings, onEditProfile }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user, logout, setUser } = useAuthStore();

  const textColor = isDark ? '#e7e5e5' : '#1a1a1a';
  const subTextColor = isDark ? '#767575' : '#9a9a9a';
  const borderColor = isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.5)';

  const [rolls, setRolls] = useState<RollItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // NOTE: 新增的高品质多维度（年份/底片类型/正倒序）筛选状态
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  // 从后端系统设置加载管理员配置的真实底片分类（默认为 彩色负片, 黑白负片, 彩色反转片, 黑白反转片）
  const [systemFilmTypes, setSystemFilmTypes] = useState<string[]>(["彩色负片", "黑白负片", "彩色反转片", "黑白反转片"]);

  // 控制年份与底片类型筛选浮层的显示隐藏状态
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // NOTE: extraRolls 变化时（新建了胶卷），合并到列表头部，避免重复
  useEffect(() => {
    if (extraRolls.length > 0) {
      setRolls(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const newOnes = extraRolls.filter(r => !existingIds.has(r.id));
        return [...newOnes, ...prev];
      });
    }
  }, [extraRolls]);

  // NOTE: 加载胶卷数据，若本地服务器未连通，自动展示预配置的经典高保真测试数据
  const fetchRolls = async () => {
    setLoading(true);
    try {
      const response = await client.get('/api/rolls');
      if (response.data && response.data.success && response.data.data) {
        setRolls(response.data.data);
      } else {
        throw new Error('Fetch rolls failed');
      }
    } catch (err) {
      console.log('Using fallback mock rolls data...');
      const mockRolls: RollItem[] = [
        {
          id: 'roll-mock-001',
          title: 'City Solitude (东京街角)',
          filmStock: 'Kodak Portra 400',
          camera: 'Leica M6',
          lens: 'Summicron 35mm f/2',
          location: 'Tokyo, Japan',
          shotDate: '2023-11-15',
          format: '135',
          status: 'COMPLETED',
          tags: ['东京', '街头', '人文'],
          frames: [
            {
              id: 'frame-mock-001',
              imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80'
            }
          ]
        },
        {
          id: 'roll-mock-002',
          title: '初试66黑白反转 (Ancient Xi\'an)',
          filmStock: 'Lucky SHD 100',
          camera: 'Rolleiflex 3.5F',
          lens: 'Xenar 75mm f/3.5',
          location: '中国 陕西 西安',
          shotDate: '2026-05-24',
          format: '120',
          status: 'COMPLETED',
          tags: ['西安', '钟楼', '中画幅', '黑白'],
          frames: [
            {
              id: 'frame-mock-002',
              imageUrl: 'https://images.unsplash.com/photo-1547984609-44d9777cb62e?auto=format&fit=crop&w=800&q=80'
            }
          ]
        },
        {
          id: 'roll-mock-003',
          title: 'Oceanic Drift (浪影)',
          filmStock: 'Fuji Superia X-TRA 400',
          camera: 'Nikon FM2',
          lens: 'Nikkor 50mm f/1.4',
          location: 'Fujian, China',
          shotDate: '2024-06-20',
          format: '135',
          status: 'COMPLETED',
          tags: ['海洋', '旅行', '彩色负片'],
          frames: [
            {
              id: 'frame-mock-003',
              imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
            }
          ]
        }
      ];
      setRolls(mockRolls);
    } finally {
      setLoading(false);
    }
  };

  // NOTE: 挂载时拉取服务端最新用户详情及统计数，保持数据流同步
  const fetchUserProfile = async () => {
    try {
      const response = await client.get('/api/auth/me');
      if (response.data && response.data.success && response.data.data) {
        setUser(response.data.data);
      }
    } catch (err) {
      console.log('Failed to sync user profile from server:', err);
    }
  };

  // 动态实时获取管理员在后台配置的系统底片工艺预设，保证双端严丝合缝
  const fetchSystemSettings = async () => {
    try {
      const response = await client.get('/api/system/settings');
      if (response.data && response.data.success && response.data.data && response.data.data.filmTypes) {
        setSystemFilmTypes(response.data.data.filmTypes);
      }
    } catch (err) {
      console.log('Failed to sync system film types preset, using local fallback:', err);
    }
  };

  useEffect(() => {
    fetchRolls();
    fetchUserProfile();
    fetchSystemSettings();
  }, []);

  // NOTE: 动态提取当前所有胶卷的唯一拍摄年份，保持筛选条件与实际数据动态对齐
  const availableYears = Array.from(
    new Set(
      rolls
        .map(r => r.shotDate ? r.shotDate.split('-')[0] : null)
        .filter(Boolean)
    )
  ).sort().reverse() as string[];

  // NOTE: 高阶综合筛选与排序算法，完全对齐Web端多维搜索与管理员基础设置
  const filteredRolls = rolls
    .filter(r => {
      // 1. 模糊匹配检索（标题/底片/相机/标签）
      const query = searchQuery.toLowerCase().trim();
      const matchQuery = !query ? true : (
        r.title.toLowerCase().includes(query) ||
        r.filmStock.toLowerCase().includes(query) ||
        r.camera.toLowerCase().includes(query) ||
        r.tags.some(tag => tag.toLowerCase().includes(query))
      );

      // 2. 拍摄年份筛选
      const year = r.shotDate ? r.shotDate.split('-')[0] : '';
      const matchYear = selectedYear === 'ALL' ? true : year === selectedYear;

      // 3. 底片工艺分类直接比对（根据后端设置的 "彩色负片", "黑白负片", "彩色反转片", "黑白反转片" 筛选）
      const matchType = selectedType === 'ALL' ? true : r.filmType === selectedType;

      return matchQuery && matchYear && matchType;
    })
    .sort((a, b) => {
      // 4. 正序 / 倒序时间轴排序（默认最新拍摄在最前）
      const dateA = a.shotDate || '0000-00-00';
      const dateB = b.shotDate || '0000-00-00';
      return sortOrder === 'DESC'
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    });

  // 按照 shotDate 从老到新稳定排序，用于生成如 #001、#002 这样绝对不变的全局影集编号
  const sortedAllRolls = [...rolls].sort((a, b) => {
    const dateA = a.shotDate || '0000-00-00';
    const dateB = b.shotDate || '0000-00-00';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    return a.id.localeCompare(b.id);
  });

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0e0e0e' : '#f5f5f5', paddingTop: 56, paddingHorizontal: 16 }}>
      {/* 顶部个人名片卡区 (参考 Web 端高水准移动端适配布局) */}
      <View style={{ marginBottom: 20 }}>
        {/* 第一行：头像与统计数据 + 操作按钮 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {/* 左侧大尺寸圆角方形头像 */}
          <View style={{
            width: 80,
            height: 80,
            backgroundColor: isDark ? 'rgba(255,186,32,0.08)' : 'rgba(255,186,32,0.05)',
            borderWidth: 1.5,
            borderColor: '#ffba20',
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            {user?.avatarUrl || user?.avatar ? (
              <Image
                source={{ uri: user.avatarUrl || user.avatar }}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />
            ) : (
              <Text style={{ color: '#ffba20', fontWeight: '900', fontSize: 30 }}>
                {(user?.nickname || 'F')[0].toUpperCase()}
              </Text>
            )}
          </View>

          {/* 右侧统计信息与操作按钮组合区 */}
          <View style={{ flex: 1, marginLeft: 18 }}>
            {/* 三列统计数 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#ffffff' : '#1a1a1a' }}>
                  {user?.followersCount ?? 0}
                </Text>
                <Text style={{ fontSize: 10, color: isDark ? '#767575' : '#9a9a9a', marginTop: 2 }}>粉丝数</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#ffffff' : '#1a1a1a' }}>
                  {user?.followingCount ?? 0}
                </Text>
                <Text style={{ fontSize: 10, color: isDark ? '#767575' : '#9a9a9a', marginTop: 2 }}>关注数</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#ffffff' : '#1a1a1a' }}>
                  {user?.likesCount ?? 0}
                </Text>
                <Text style={{ fontSize: 10, color: isDark ? '#767575' : '#9a9a9a', marginTop: 2 }}>获赞数</Text>
              </View>
            </View>

            {/* 功能按钮操作行 */}
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={onEditProfile}
                style={{
                  flex: 1,
                  height: 32,
                  backgroundColor: isDark ? '#191a1a' : '#eaeaea',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#e7e5e5' : '#555555' }}>
                  ✏️ 编辑资料
                </Text>
              </TouchableOpacity>

              {/* 设置 */}
              <TouchableOpacity
                onPress={onOpenSettings}
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: isDark ? '#191a1a' : '#eaeaea',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Settings size={14} color={isDark ? '#e7e5e5' : '#1a1a1a'} />
              </TouchableOpacity>

              {/* 注销 */}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('退出登录', '确定要注销并离开暗房吗？', [
                    { text: '取消', style: 'cancel' },
                    { text: '注销', style: 'destructive', onPress: logout }
                  ]);
                }}
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: isDark ? '#191a1a' : '#eaeaea',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <LogOut size={14} color="#ff5252" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 第二行：昵称与ID */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: isDark ? '#ffffff' : '#1a1a1a', letterSpacing: 0.5 }}>
            {user?.nickname || 'Film Photographer'}
          </Text>
          <Text style={{ fontSize: 10, color: isDark ? '#444444' : '#9a9a9a', fontWeight: '800' }}>
            ID: {user?.id ? user.id.slice(-4).toUpperCase() : '0001'}
          </Text>
        </View>

        {/* 第三行：个性签名 Bio */}
        <Text style={{ fontSize: 12, color: isDark ? '#767575' : '#666666', lineHeight: 18 }}>
          {user?.bio || '这个人很懒，什么都没写。'}
        </Text>
      </View>


      {/* 搜索与多维过滤筛选条 */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
        zIndex: 99, // 确保下拉框菜单能盖在列表上方
      }}>
        {/* 1. 搜索框 */}
        <View style={{
          flex: 1.2,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? '#191a1a' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)',
          borderRadius: 12,
          paddingHorizontal: 8,
          height: 38
        }}>
          <Search size={13} color="#767575" style={{ marginRight: 4 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="搜索..."
            placeholderTextColor="#767575"
            style={{ flex: 1, fontSize: 11, color: textColor, padding: 0 }}
          />
        </View>

        {/* 2. 年份下拉选择按钮 */}
        <View style={{ zIndex: 100 }}>
          <TouchableOpacity
            onPress={() => {
              setShowYearDropdown(!showYearDropdown);
              setShowTypeDropdown(false);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? '#191a1a' : '#ffffff',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)',
              borderRadius: 12,
              paddingHorizontal: 8,
              height: 38,
              gap: 4
            }}
          >
            <Calendar size={13} color={selectedYear === 'ALL' ? '#767575' : '#ffba20'} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: selectedYear === 'ALL' ? subTextColor : '#ffba20' }}>
              {selectedYear === 'ALL' ? '全部' : `${selectedYear}`}
            </Text>
            <Text style={{ fontSize: 8, color: '#767575' }}>▼</Text>
          </TouchableOpacity>

          {/* 年份下拉菜单浮层 */}
          {showYearDropdown && (
            <View style={{
              position: 'absolute',
              top: 42,
              left: 0,
              width: 100,
              backgroundColor: isDark ? '#1e1f1f' : '#ffffff',
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 12,
              padding: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 5,
              zIndex: 999
            }}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedYear('ALL');
                  setShowYearDropdown(false);
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  backgroundColor: selectedYear === 'ALL' ? 'rgba(255,186,32,0.1)' : 'transparent',
                  borderRadius: 8
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: selectedYear === 'ALL' ? '#ffba20' : textColor }}>
                  全部年份
                </Text>
              </TouchableOpacity>
              {availableYears.map(y => (
                <TouchableOpacity
                  key={y}
                  onPress={() => {
                    setSelectedYear(y);
                    setShowYearDropdown(false);
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    backgroundColor: selectedYear === y ? 'rgba(255,186,32,0.1)' : 'transparent',
                    borderRadius: 8
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: selectedYear === y ? '#ffba20' : textColor }}>
                    {y}年
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 3. 底片类型下拉选择按钮 */}
        <View style={{ zIndex: 100 }}>
          <TouchableOpacity
            onPress={() => {
              setShowTypeDropdown(!showTypeDropdown);
              setShowYearDropdown(false);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? '#191a1a' : '#ffffff',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)',
              borderRadius: 12,
              paddingHorizontal: 8,
              height: 38,
              gap: 4
            }}
          >
            <Text style={{ fontSize: 11, color: selectedType === 'ALL' ? '#767575' : '#ffba20' }}>🎛️</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: selectedType === 'ALL' ? subTextColor : '#ffba20', maxWidth: 65 }} numberOfLines={1}>
              {selectedType === 'ALL' ? '全部' : selectedType}
            </Text>
            <Text style={{ fontSize: 8, color: '#767575' }}>▼</Text>
          </TouchableOpacity>

          {/* 底片类型下拉菜单浮层 */}
          {showTypeDropdown && (
            <View style={{
              position: 'absolute',
              top: 42,
              right: 0,
              width: 120,
              backgroundColor: isDark ? '#1e1f1f' : '#ffffff',
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 12,
              padding: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 5,
              zIndex: 999
            }}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedType('ALL');
                  setShowTypeDropdown(false);
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  backgroundColor: selectedType === 'ALL' ? 'rgba(255,186,32,0.1)' : 'transparent',
                  borderRadius: 8
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: selectedType === 'ALL' ? '#ffba20' : textColor }}>
                  全部类型
                </Text>
              </TouchableOpacity>
              {systemFilmTypes.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setSelectedType(t);
                    setShowTypeDropdown(false);
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    backgroundColor: selectedType === t ? 'rgba(255,186,32,0.1)' : 'transparent',
                    borderRadius: 8
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: selectedType === t ? '#ffba20' : textColor }} numberOfLines={1}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 4. 正序 / 倒序切换按钮 */}
        <TouchableOpacity
          onPress={() => {
            setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC');
            setShowYearDropdown(false);
            setShowTypeDropdown(false);
          }}
          style={{
            width: 38,
            height: 38,
            backgroundColor: isDark ? '#191a1a' : '#ffffff',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffba20' }}>
            {sortOrder === 'DESC' ? '↓' : '↑'}
          </Text>
        </TouchableOpacity>

        {/* 5. 新建胶卷 + 按钮 */}
        <TouchableOpacity
          onPress={() => {
            onAddRoll();
            setShowYearDropdown(false);
            setShowTypeDropdown(false);
          }}
          style={{
            width: 38,
            height: 38,
            backgroundColor: '#ffba20',
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#ffba20',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 1
          }}
        >
          <Plus size={16} color="#563b00" />
        </TouchableOpacity>
      </View>

      {/* 影集胶带网格列表 */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#ffba20" size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredRolls}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="flex-1 py-20 justify-center items-center">
              <FolderHeart size={64} color="#484848" className="mb-4" />
              <Text className="text-on-surface font-bold text-base">{t('roll.empty')}</Text>
              <Text className="text-xs text-on-surface-variant mt-1">没有找到任何胶卷，导入第一卷吧</Text>
            </View>
          }
          renderItem={({ item }) => {
            const rollIndex = sortedAllRolls.findIndex(r => r.id === item.id);
            const rollNumberStr = rollIndex !== -1 ? `#${String(rollIndex + 1).padStart(3, '0')}` : '';

            return (
              <TouchableOpacity
                onPress={() => onSelectRoll(item)}
                className="w-full bg-surface-container border border-outline-variant/10 rounded-3xl p-5 mb-4 shadow-sm active:opacity-90"
              >
                {/* 左右分栏结构：左边是文字信息，右边是精致的方形大图预览 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* 左侧文字信息区 */}
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text className="text-lg font-bold text-on-surface mb-1">
                      {rollNumberStr ? `${rollNumberStr} ` : ''}{item.title}
                    </Text>

                    <Text className="text-xs text-on-surface-variant mb-3 tracking-wider uppercase font-semibold">
                      {item.filmStock}
                    </Text>

                    {/* 地点与时间详情 */}
                    <View className="space-y-1.5 gap-1">
                      <View className="flex flex-row items-center space-x-1.5 gap-1.5">
                        <MapPin size={12} color="#767575" />
                        <Text className="text-xs text-on-surface-variant truncate max-w-[95%]">
                          {item.location || 'N/A'}
                        </Text>
                      </View>
                      <View className="flex flex-row items-center space-x-1.5 gap-1.5">
                        <Calendar size={12} color="#767575" />
                        <Text className="text-xs text-on-surface-variant">
                          {item.shotDate || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 右侧大图预览（精致圆角正方形） */}
                  {item.frames && item.frames[0]?.imageUrl ? (
                    <View style={{ width: 90, height: 90, borderRadius: 14, overflow: 'hidden', backgroundColor: isDark ? '#191a1a' : '#eaeaea' }}>
                      <Image
                        source={{ uri: item.frames[0].imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}
                </View>

                {/* 底部机身与镜头绑定 */}
                <View className="flex flex-row justify-between items-center mt-4 pt-3 border-t border-outline-variant/10">
                  <Text className="text-[10px] text-on-surface-variant font-mono truncate max-w-[80%]">
                    📷 {item.camera} / {item.lens.split(' ')[0]}
                  </Text>
                  <Text className="text-[10px] text-primary font-bold">
                    GO ▶
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

