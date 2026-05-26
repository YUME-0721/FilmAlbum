// NOTE: 必须在最顶部导入全局 CSS，NativeWind v4 依赖此文件注入 Tailwind 样式
import './global.css';

import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import axios from 'axios';
import { MMKV, storageReadyPromise } from './src/utils/safe-storage';

const storage = new MMKV();

// NOTE: App 启动或重载时自动静默探测 API 域名，以无缝感应并适配线上生产环境的 /api 前缀重写
const detectApiPrefix = async () => {
  try {
    const apiUrl = storage.getString('api-server-url') || 'http://10.0.2.2:8787';
    const cleanUrl = apiUrl.trim().replace(/\/$/, '');
    if (!cleanUrl.startsWith('http')) return;

    // 1. 优先探测标准的 /api/health
    const res = await axios.get(`${cleanUrl}/api/health`, { timeout: 3000 });
    if (res.status === 200) {
      storage.set('api-no-prefix', false);
      return;
    }
  } catch (err) {
    // 2. 失败则降级探测 /health 路径 (适配去除了 /api 的生产环境反代域名)
    try {
      const apiUrl = storage.getString('api-server-url') || 'http://10.0.2.2:8787';
      const cleanUrl = apiUrl.trim().replace(/\/$/, '');
      const resFallback = await axios.get(`${cleanUrl}/health`, { timeout: 3000 });
      if (resFallback.status === 200) {
        storage.set('api-no-prefix', true);
        console.log('[AutoPrefix] App boot auto-detected and adapted to prefix-rewritten API domain!');
      }
    } catch (e) {
      // 均失败则不影响现有流程
    }
  }
};
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useAuthStore } from './src/store/useAuthStore';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen, RollItem } from './src/screens/DashboardScreen';
import { RollDetailScreen } from './src/screens/RollDetailScreen';
import { AddRollScreen } from './src/screens/AddRollScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ExploreScreen, PostItem } from './src/screens/ExploreScreen';
import { PostDetailScreen } from './src/screens/PostDetailScreen';
import { GearScreen, GearItem } from './src/screens/GearScreen';
import { AddGearScreen } from './src/screens/AddGearScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { Film, Compass, Camera } from 'lucide-react-native';
import './src/i18n'; // 挂载 i18n 国际化引擎

// NOTE: 路由状态枚举，全面扩展以无缝承载动态、设备资产链、个人资料编辑页
type Screen = 'login' | 'dashboard' | 'addRoll' | 'settings' | 'rollDetail' | 'explore' | 'postDetail' | 'gear' | 'addGear' | 'editProfile';

// NOTE: 主题切换动画时长与缓动配置
const THEME_TRANSITION_MS = 350;
const THEME_EASING = Easing.bezier(0.4, 0, 0.2, 1);

const AppContent: React.FC = () => {
  const { isDark } = useTheme();
  const isFirstRender = useRef(true);

  // NOTE: 0 = 亮色，1 = 暗色。使用共享值驱动背景色插值和内容透明度呼吸动画
  const themeProgress = useSharedValue(isDark ? 1 : 0);
  const contentOpacity = useSharedValue(1);
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const [screen, setScreen] = useState<Screen>('login');
  const [selectedRoll, setSelectedRoll] = useState<RollItem | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  type Tab = 'rolls' | 'explore' | 'gear';
  const [activeTab, setActiveTab] = useState<Tab>('rolls');
  
  // NOTE: 保存本地临时胶卷和设备列表引用，以支撑高水准离线沙盒
  const [localRolls, setLocalRolls] = useState<RollItem[]>([]);
  const [localGears, setLocalGears] = useState<GearItem[]>([]);

  // NOTE: 优雅的自定义 Toast 状态与弹簧动画控制
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastY = useSharedValue(-120);
  const toastOpacity = useSharedValue(0);
  const [prevAuth, setPrevAuth] = useState(isAuthenticated);

  const showToast = (message: string) => {
    setToastMessage(message);
    toastY.value = withTiming(-120, { duration: 0 }, () => {
      toastY.value = withSpring(54, { damping: 15, stiffness: 120 });
    });
    toastOpacity.value = withTiming(1, { duration: 250 });

    setTimeout(() => {
      toastY.value = withSpring(-120, { damping: 15 });
      toastOpacity.value = withTiming(0, { duration: 250 }, () => {
        runOnJS(setToastMessage)(null);
      });
    }, 2500);
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        // 确保从文件系统/MMKV持久化加载回全部数据后再做初始化
        await storageReadyPromise;
      } catch (e) {
        // 忽略
      }
      initialize();
      detectApiPrefix();
    };
    initApp();
  }, []);

  // NOTE: isDark 变化时触发平滑动画：背景色插值 + 内容层「呼吸」透明度
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // 内容层先微微淡出再淡入，营造柔和过渡感
    contentOpacity.value = withTiming(0.92, { duration: THEME_TRANSITION_MS / 2, easing: THEME_EASING }, () => {
      contentOpacity.value = withTiming(1, { duration: THEME_TRANSITION_MS / 2, easing: THEME_EASING });
    });
    themeProgress.value = withTiming(isDark ? 1 : 0, { duration: THEME_TRANSITION_MS, easing: THEME_EASING });
  }, [isDark]);

  // NOTE: 背景色通过 interpolateColor 在亮色 and 暗色之间平滑过渡
  const animatedBgStyle = useAnimatedStyle(() => ({
    flex: 1,
    backgroundColor: interpolateColor(themeProgress.value, [0, 1], ['#f5f5f5', '#0e0e0e']),
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: contentOpacity.value,
  }));

  // NOTE: 自定义 Toast 的高品质模糊拟物动画卡片样式
  const animatedToastStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: toastY.value,
    left: '8%',
    right: '8%',
    backgroundColor: isDark ? 'rgba(25, 26, 26, 0.96)' : 'rgba(255, 255, 255, 0.96)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 186, 32, 0.25)' : 'rgba(255, 186, 32, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    opacity: toastOpacity.value,
    zIndex: 9999,
  }));

  // 认证状态变化时自动切换到 dashboard 或 login
  useEffect(() => {
    if (!isLoading) {
      setScreen(isAuthenticated ? 'dashboard' : 'login');
      // 当从“未登录”切换为“已登录”状态时，触发高逼格自消失 Toast
      if (isAuthenticated && !prevAuth) {
        showToast('欢迎回来，继续您的底片摄影旅程 📸');
      }
      setPrevAuth(isAuthenticated);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0e0e0e' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffba20" />
      </View>
    );
  }

  // NOTE: 当子页面返回时，统一切回用户离开前的那个 Tab，保证操作的连贯性
  const handleBackToTab = () => {
    setScreen(activeTab === 'rolls' ? 'dashboard' : activeTab === 'explore' ? 'explore' : 'gear');
  };

  // NOTE: 新建胶卷后追加到本地列表，并直接导航到详情页
  const handleRollCreated = (roll: RollItem) => {
    setLocalRolls(prev => [roll, ...prev]);
    setSelectedRoll(roll);
    setScreen('rollDetail');
  };

  // NOTE: 新增设备资产后合并到本地列表，并返回设备柜
  const handleGearCreated = (gear: GearItem) => {
    setLocalGears(prev => [gear, ...prev]);
    setScreen('gear');
  };

  // 状态机路由分发
  const renderScreen = () => {
    if (!isAuthenticated) {
      if (screen === 'settings') {
        return <SettingsScreen onBack={() => setScreen('login')} />;
      }
      return <LoginScreen onOpenSettings={() => setScreen('settings')} />;
    }

    switch (screen) {
      case 'addRoll':
        return (
          <AddRollScreen
            onBack={handleBackToTab}
            onCreated={handleRollCreated}
          />
        );
      case 'settings':
        return <SettingsScreen onBack={handleBackToTab} />;
      case 'rollDetail':
        return selectedRoll ? (
          <RollDetailScreen
            roll={selectedRoll}
            onBack={handleBackToTab}
          />
        ) : null;
      case 'explore':
        return (
          <ExploreScreen
            onSelectPost={(post) => {
              setSelectedPost(post);
              setScreen('postDetail');
            }}
          />
        );
      case 'postDetail':
        return selectedPost ? (
          <PostDetailScreen
            post={selectedPost}
            onBack={handleBackToTab}
          />
        ) : null;
      case 'gear':
        return (
          <GearScreen
            onAddGear={() => setScreen('addGear')}
          />
        );
      case 'addGear':
        return (
          <AddGearScreen
            onBack={handleBackToTab}
            onCreated={handleGearCreated}
          />
        );
      case 'editProfile':
        return (
          <EditProfileScreen
            onBack={handleBackToTab}
            onSaved={() => setScreen('dashboard')}
          />
        );
      default:
        return (
          <DashboardScreen
            extraRolls={localRolls}
            onSelectRoll={(roll) => { setSelectedRoll(roll); setScreen('rollDetail'); }}
            onAddRoll={() => setScreen('addRoll')}
            onOpenSettings={() => setScreen('settings')}
            onEditProfile={() => setScreen('editProfile')}
          />
        );
    }
  };

  // NOTE: 只有当用户已登录，且处于 Rolls / Explore / Gear 3个主频道页面时，才展示底部 Tab 栏
  const showTabBar = isAuthenticated && (screen === 'dashboard' || screen === 'explore' || screen === 'gear');

  return (
    <Animated.View style={animatedBgStyle}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Animated.View style={animatedContentStyle}>
        {renderScreen()}
      </Animated.View>
      
      {showTabBar && (
        <View style={{
          flexDirection: 'row',
          height: 64,
          backgroundColor: isDark ? '#191a1a' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 8
        }}>
          {/* Tab 1: 胶卷 */}
          <TouchableOpacity
            onPress={() => { setScreen('dashboard'); setActiveTab('rolls'); }}
            style={{ alignItems: 'center', flex: 1, paddingVertical: 6 }}
          >
            <Film size={20} color={activeTab === 'rolls' ? '#ffba20' : (isDark ? '#767575' : '#9a9a9a')} />
            <Text style={{
              fontSize: 10,
              fontWeight: '800',
              marginTop: 4,
              color: activeTab === 'rolls' ? '#ffba20' : (isDark ? '#767575' : '#9a9a9a')
            }}>
              胶卷
            </Text>
          </TouchableOpacity>

          {/* Tab 2: 动态 */}
          <TouchableOpacity
            onPress={() => { setScreen('explore'); setActiveTab('explore'); }}
            style={{ alignItems: 'center', flex: 1, paddingVertical: 6 }}
          >
            <Compass size={20} color={activeTab === 'explore' ? '#ffba20' : (isDark ? '#767575' : '#9a9a9a')} />
            <Text style={{
              fontSize: 10,
              fontWeight: '800',
              marginTop: 4,
              color: activeTab === 'explore' ? '#ffba20' : (isDark ? '#767575' : '#9a9a9a')
            }}>
              动态
            </Text>
          </TouchableOpacity>

          {/* Tab 3: 设备 */}
          <TouchableOpacity
            onPress={() => { setScreen('gear'); setActiveTab('gear'); }}
            style={{ alignItems: 'center', flex: 1, paddingVertical: 6 }}
          >
            <Camera size={20} color={activeTab === 'gear' ? '#ffba20' : (isDark ? '#767575' : '#9a9a9a')} />
            <Text style={{
              fontSize: 10,
              fontWeight: '800',
              marginTop: 4,
              color: activeTab === 'gear' ? '#ffba20' : (isDark ? '#767575' : '#9a9a9a')
            }}>
              设备
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 优雅高阶 Toast 组件挂载 */}
      {toastMessage && (
        <Animated.View style={animatedToastStyle}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 186, 32, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
            <Compass size={16} color="#ffba20" />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#ffffff' : '#1a1a1a', flex: 1 }}>
            {toastMessage}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

// NOTE: 导出 App 根组件，全局包裹 ThemeProvider 主题引擎
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
