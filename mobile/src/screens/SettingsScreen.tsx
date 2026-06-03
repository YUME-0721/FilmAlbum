import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Linking
} from 'react-native';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { changeLanguage } from '../i18n';
import client, { getBaseUrl } from '../api/client';
import { MMKV } from '../utils/safe-storage';
import {
  ArrowLeft, Sun, Moon, Smartphone, Globe, Server,
  LogOut, CheckCircle, XCircle, RotateCcw
} from 'lucide-react-native';

const storage = new MMKV();
const API_URL_KEY = 'api-server-url';
const DEFAULT_API_URL = 'http://10.0.2.2:8787';

interface SettingsScreenProps {
  onBack: () => void;
}

type ThemeModeOption = 'light' | 'dark' | 'system';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { t, i18n } = useTranslation();
  const { isDark, themeMode, setThemeMode } = useTheme();
  const { user, logout, isAuthenticated } = useAuthStore();

  const [apiUrl, setApiUrl] = useState(getBaseUrl());
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  const textColor = isDark ? '#e7e5e5' : '#1a1a1a';
  const subTextColor = isDark ? '#767575' : '#9a9a9a';
  const cardBg = isDark ? '#191a1a' : '#e8e8e8';
  const inputBg = isDark ? '#131313' : '#f0f0f0';
  const borderColor = isDark ? 'rgba(72,72,72,0.4)' : 'rgba(192,192,192,0.6)';
  const bgColor = isDark ? '#0e0e0e' : '#f5f5f5';

  // NOTE: 切换语言并持久化
  const handleToggleLanguage = () => {
    const next = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
    changeLanguage(next);
  };

  // NOTE: 保存并测试 API 连通性
  const handleTestConnection = async () => {
    const url = apiUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert(t('common.error'), t('settings.invalidUrl'));
      return;
    }
    storage.set(API_URL_KEY, url);
    setTestStatus('loading');
    
    // 重置前缀剥离标记，确保再次测试时状态干净
    storage.set('api-no-prefix', false);

    try {
      // 1. 优先尝试标准的 /api/health
      const response = await client.get('/api/health', { timeout: 5000 });
      if (response.status === 200) {
        setTestStatus('ok');
        Alert.alert('✅ ' + t('settings.connectSuccess'));
        return;
      }
    } catch (err) {
      // 2. 失败后自动降级尝试不含 /api 的 /health 接口 (生产环境兼容)
      try {
        const cleanUrl = url.replace(/\/$/, '');
        const fallbackResponse = await axios.get(`${cleanUrl}/health`, { timeout: 5000 });
        if (fallbackResponse.status === 200) {
          // 标记当前 API 无需 /api 前缀
          storage.set('api-no-prefix', true);
          setTestStatus('ok');
          Alert.alert(
            '✅ ' + t('settings.connectSuccess'),
            i18n.language === 'zh-CN'
              ? '已智能适配生产环境 API 前缀重写！'
              : 'Successfully adapted to production API prefix rewrite!'
          );
          return;
        }
      } catch (fallbackErr) {
        // 双路径均失败
      }
    }
    setTestStatus('error');
    Alert.alert('❌ ' + t('settings.connectFailed'));
  };

  // NOTE: 重置 API 地址为模拟器默认值
  const handleResetApiUrl = () => {
    storage.delete(API_URL_KEY);
    setApiUrl(DEFAULT_API_URL);
    setTestStatus('idle');
  };

  // NOTE: 退出登录前确认弹窗
  const handleLogout = () => {
    Alert.alert('退出登录', '确定要注销并离开暗房吗？', [
      { text: '取消', style: 'cancel' },
      { text: '注销', style: 'destructive', onPress: logout },
    ]);
  };

  // NOTE: 智能推导管理后台 Web 地址以打通双端
  const getSuggestedAdminUrl = (): string => {
    const base = apiUrl.trim();
    if (!base) return 'http://localhost:5173/admin';
    
    let cleanBase = base.replace(/\/$/, '');
    
    // 处理本地开发 (安卓模拟器 10.0.2.2:8787 后端对应 5173 前端)
    if (cleanBase.includes('8787')) {
      return cleanBase.replace('8787', '5173') + '/admin';
    }
    // 处理 Cloudflare 默认全栈部署命名规范 (-api.workers.dev -> -web.pages.dev)
    if (cleanBase.includes('-api.workers.dev')) {
      return cleanBase.replace('-api.workers.dev', '-web.pages.dev') + '/admin';
    }
    // 处理带 /api 后缀的统一子域名部署
    if (cleanBase.endsWith('/api')) {
      return cleanBase.slice(0, -4) + '/admin';
    }
    return cleanBase + '/admin';
  };

  // NOTE: 超级管理员一键直达跳转及部署密码说明提示
  const handleGoToAdmin = () => {
    const suggestedUrl = getSuggestedAdminUrl();
    Alert.alert(
      t('settings.systemAdmin') || '系统管理',
      i18n.language === 'zh-CN'
        ? `系统管理后台已在 Web 端集成，您可以访问以下推导出的后台地址进行全面配置：\n\n${suggestedUrl}\n\n超级管理员登录请使用您在部署后端时设置的管理员密码（默认为环境变量 ADMIN_PASSWORD）。`
        : `Super Admin Console is integrated into the Web client. You can access the console via the suggested URL below:\n\n${suggestedUrl}\n\nLog in using the admin password configured during backend deployment (defaults to ADMIN_PASSWORD env).`,
      [
        { text: t('common.cancel') || '取消', style: 'cancel' },
        { 
          text: i18n.language === 'zh-CN' ? '一键跳转' : 'Open Link', 
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(suggestedUrl);
              if (supported) {
                await Linking.openURL(suggestedUrl);
              } else {
                Alert.alert('提示', `无法直接在浏览器打开该链接，请手动复制：\n${suggestedUrl}`);
              }
            } catch {
              Alert.alert('提示', `打开链接失败，请手动访问：\n${suggestedUrl}`);
            }
          } 
        }
      ]
    );
  };

  const themeOptions: { value: ThemeModeOption; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('settings.light'), icon: <Sun size={16} color={themeMode === 'light' ? '#563b00' : subTextColor} /> },
    { value: 'dark', label: t('settings.dark'), icon: <Moon size={16} color={themeMode === 'dark' ? '#563b00' : subTextColor} /> },
    { value: 'system', label: t('settings.system'), icon: <Smartphone size={16} color={themeMode === 'system' ? '#563b00' : subTextColor} /> },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* 顶部导航栏 */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {!isAuthenticated && onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={{ padding: 10, backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor }}
          >
            <ArrowLeft size={20} color={textColor} />
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 20, fontWeight: '800', color: textColor }}>
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 当前账户信息卡 */}
        {user && (
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,186,32,0.15)', borderWidth: 1, borderColor: 'rgba(255,186,32,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#ffba20', fontWeight: '800', fontSize: 18 }}>
                  {(user.nickname || 'F')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: textColor, fontWeight: '700', fontSize: 15 }}>{user.nickname}</Text>
                <Text style={{ color: subTextColor, fontSize: 12 }}>{user.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 界面设置 */}
        <SectionTitle title={t('settings.interface')} textColor={subTextColor} />

        {/* 主题切换 */}
        <SettingCard bgColor={cardBg} borderColor={borderColor}>
          <Text style={{ color: textColor, fontWeight: '600', marginBottom: 12 }}>{t('settings.theme')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {themeOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setThemeMode(opt.value)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: themeMode === opt.value ? '#ffba20' : inputBg,
                  borderWidth: 1, borderColor: themeMode === opt.value ? '#ffba20' : borderColor,
                  alignItems: 'center', gap: 4,
                }}
              >
                {opt.icon}
                <Text style={{ fontSize: 11, fontWeight: '700', color: themeMode === opt.value ? '#563b00' : subTextColor }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingCard>

        {/* 语言切换 */}
        <SettingCard bgColor={cardBg} borderColor={borderColor}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Globe size={18} color={subTextColor} />
              <Text style={{ color: textColor, fontWeight: '600' }}>{t('settings.language')}</Text>
            </View>
            <TouchableOpacity
              onPress={handleToggleLanguage}
              style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor }}
            >
              <Text style={{ color: '#ffba20', fontWeight: '700', fontSize: 13 }}>
                {i18n.language === 'zh-CN' ? '中文 → EN' : 'EN → 中文'}
              </Text>
            </TouchableOpacity>
          </View>
        </SettingCard>

        {/* API 服务器配置 */}
        <SectionTitle title={t('settings.apiServerUrl')} textColor={subTextColor} />
        <SettingCard bgColor={cardBg} borderColor={borderColor}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Server size={16} color={subTextColor} />
            <Text style={{ color: subTextColor, fontSize: 12, flex: 1 }}>
              {t('settings.apiServerUrlPlaceholder')}
            </Text>
          </View>
          <TextInput
            value={apiUrl}
            onChangeText={(v) => {
              setApiUrl(v);
              setTestStatus('idle');
              // NOTE: 实时自动保存合法地址，防止用户未点测试连接直接返回导致未保存成功
              const trimmed = v.trim();
              if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                storage.set(API_URL_KEY, trimmed);
              }
            }}
            placeholder={DEFAULT_API_URL}
            placeholderTextColor={subTextColor}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{
              backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
              borderWidth: 1, borderColor, color: textColor, fontSize: 13,
              fontFamily: 'monospace', marginBottom: 10,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleTestConnection}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12,
                backgroundColor: '#ffba20',
                flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
              }}
            >
              {testStatus === 'loading'
                ? <ActivityIndicator size="small" color="#563b00" />
                : testStatus === 'ok'
                  ? <CheckCircle size={15} color="#563b00" />
                  : testStatus === 'error'
                    ? <XCircle size={15} color="#563b00" />
                    : null
              }
              <Text style={{ color: '#563b00', fontWeight: '700', fontSize: 13 }}>
                {t('settings.testConnection')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleResetApiUrl}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: inputBg, borderWidth: 1, borderColor, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <RotateCcw size={14} color={subTextColor} />
              <Text style={{ color: subTextColor, fontWeight: '600', fontSize: 13 }}>{t('settings.resetDefault')}</Text>
            </TouchableOpacity>
          </View>
        </SettingCard>

        {/* 系统管理 */}
        <SectionTitle title={t('settings.systemAdmin')} textColor={subTextColor} />
        <SettingCard bgColor={cardBg} borderColor={borderColor}>
          <Text style={{ color: textColor, fontWeight: '600', marginBottom: 6 }}>
            {t('settings.goToAdmin')}
          </Text>
          <Text style={{ color: subTextColor, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
            {i18n.language === 'zh-CN'
              ? '超级管理员控制台集成了用户管理、系统多图床同步（R2/HuggingFace）与 SMTP 邮件配置等核心功能，推荐使用大屏网页端操作。'
              : 'Super Admin Console integrates user levels, multi-channel storage, and SMTP configurations. Web operations are highly recommended.'}
          </Text>
          <TouchableOpacity
            onPress={handleGoToAdmin}
            style={{
              paddingVertical: 12, borderRadius: 12,
              backgroundColor: '#ffba20',
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
            }}
          >
            <Text style={{ color: '#563b00', fontWeight: '700', fontSize: 13 }}>
              {t('settings.goToAdmin')}
            </Text>
          </TouchableOpacity>
        </SettingCard>

        {/* 账号操作 */}
        <SectionTitle title={t('settings.account')} textColor={subTextColor} />
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <LogOut size={18} color="#ff5252" />
            <Text style={{ color: '#ff5252', fontWeight: '600', fontSize: 15 }}>{t('nav.logout')}</Text>
          </View>
          <Text style={{ color: subTextColor, fontSize: 12 }}>▶</Text>
        </TouchableOpacity>

        {/* 版本信息 */}
        <Text style={{ textAlign: 'center', color: subTextColor, fontSize: 11, marginTop: 32 }}>
          FilmAlbum v1.0.0 · 暗房影集
        </Text>
      </ScrollView>
    </View>
  );
};

// NOTE: 辅助组件：分区标题
const SectionTitle: React.FC<{ title: string; textColor: string }> = ({ title, textColor }) => (
  <Text style={{ fontSize: 11, fontWeight: '700', color: textColor, marginBottom: 8, marginTop: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
    {title}
  </Text>
);

// NOTE: 辅助组件：设置卡片容器
const SettingCard: React.FC<{ children: React.ReactNode; bgColor: string; borderColor: string }> = ({ children, bgColor, borderColor }) => (
  <View style={{ backgroundColor: bgColor, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor }}>
    {children}
  </View>
);
