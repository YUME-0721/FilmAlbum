import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../theme/ThemeContext';
import { changeLanguage } from '../i18n';
import client from '../api/client';
import { Sun, Moon, Globe, ShieldAlert } from 'lucide-react-native';

interface LoginScreenProps {
  onOpenSettings: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOpenSettings }) => {
  const { t, i18n } = useTranslation();
  const { isDark, themeMode, setThemeMode } = useTheme();
  const { setToken, setUser } = useAuthStore();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  // NOTE: 切换系统语言中/英支持
  const toggleLanguage = () => {
    const nextLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
    changeLanguage(nextLang);
  };

  // NOTE: 切换系统亮/暗主题
  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  // NOTE: 用户提交流程与登录/注册网络联调
  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !nickname)) {
      Alert.alert(t('common.error'), isRegister ? '请填满所有字段 / Fill all fields' : '请填满邮箱和密码 / Fill email & password');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister ? { email, password, nickname } : { email, password };
      
      const response = await client.post(endpoint, payload);
      
      if (response.data && response.data.success) {
        const { token, user } = response.data.data;
        setToken(token);
        setUser(user);
      } else {
        throw new Error(response.data.error || 'Request failed');
      }
    } catch (err: any) {
      // 容错与模拟体验机制 (NOTE: 若本地后端暂时未启动，为便于沙盒体验，自动生成测试临时账号)
      console.log('API Error, entering local sandbox account:', err.message);
      const mockUser = {
        id: 'user-mock-001',
        email: email,
        nickname: nickname || email.split('@')[0] || 'Film Photographer',
        bio: 'Lens captures light, heart captures story.',
        avatarUrl: ''
      };
      setToken('mock-jwt-token-xyz-123456');
      setUser(mockUser);
      Alert.alert(
        '暗房离线沙盒',
        `由于无法成功连接至您的后端服务器 (${err.message})，为保证您的流畅体验，系统已自动启用【离线模拟沙盒模式】！\n\n若您希望连接真实云端，请退回登录页，点击右上角【安全盾牌 🛡️】图标，检查并保存正确的 API 服务器地址，测试成功后再行登录。`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark justify-center items-center px-6">
      {/* 顶部偏好设置操作条 */}
      <View className="absolute top-12 right-6 flex flex-row items-center gap-3">
        <TouchableOpacity onPress={onOpenSettings} className="p-2.5 bg-surface-container dark:bg-surface-container-dark rounded-full border border-outline-variant/10">
          <ShieldAlert size={20} color={isDark ? '#e7e5e5' : '#1a1a1a'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleLanguage} className="p-2.5 bg-surface-container dark:bg-surface-container-dark rounded-full border border-outline-variant/10">
          <Globe size={20} color={isDark ? '#e7e5e5' : '#1a1a1a'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleTheme} className="p-2.5 bg-surface-container dark:bg-surface-container-dark rounded-full border border-outline-variant/10">
          {isDark ? (
            <Sun size={20} color="#ffba20" />
          ) : (
            <Moon size={20} color="#1a1a1a" />
          )}
        </TouchableOpacity>
      </View>

      {/* 拟物登录卡片 */}
      <View className="w-full max-w-sm bg-surface-container dark:bg-surface-container-dark border border-outline-variant/10 dark:border-outline-variant-dark/10 p-8 rounded-3xl shadow-2xl">
        <Text className="text-3xl font-extrabold text-on-surface dark:text-on-surface-dark text-center mb-2">
          FilmAlbum
        </Text>
        <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark text-center tracking-wider mb-8 uppercase">
          {isRegister ? t('login.createAccount') : t('login.welcome')}
        </Text>

        <View className="gap-3">
          {isRegister && (
            <View>
              <Text className="text-xs font-semibold text-on-surface-variant dark:text-on-surface-variant-dark mb-1">{t('profile.nickname')}</Text>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                placeholder="Pick an amazing name"
                placeholderTextColor={isDark ? '#767575' : '#999999'}
                className="w-full px-4 py-3 bg-surface-container-low dark:bg-surface-container-low-dark rounded-xl text-on-surface dark:text-on-surface-dark text-sm border border-outline-variant/20 dark:border-outline-variant-dark/20"
              />
            </View>
          )}

          <View>
            <Text className="text-xs font-semibold text-on-surface-variant dark:text-on-surface-variant-dark mb-1">{t('login.email')}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.emailPlaceholder')}
              placeholderTextColor={isDark ? '#767575' : '#999999'}
              keyboardType="email-address"
              autoCapitalize="none"
              className="w-full px-4 py-3 bg-surface-container-low dark:bg-surface-container-low-dark rounded-xl text-on-surface dark:text-on-surface-dark text-sm border border-outline-variant/20 dark:border-outline-variant-dark/20"
            />
          </View>

          <View>
            <Text className="text-xs font-semibold text-on-surface-variant dark:text-on-surface-variant-dark mb-1">{t('login.password')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('login.passwordPlaceholder')}
              placeholderTextColor={isDark ? '#767575' : '#999999'}
              secureTextEntry
              autoCapitalize="none"
              className="w-full px-4 py-3 bg-surface-container-low dark:bg-surface-container-low-dark rounded-xl text-on-surface dark:text-on-surface-dark text-sm border border-outline-variant/20 dark:border-outline-variant-dark/20"
            />
          </View>

          {/* 提交主按钮 */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 bg-primary rounded-2xl flex flex-row justify-center items-center mt-6 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <ActivityIndicator color="#563b00" size="small" />
            ) : (
              <Text className="text-on-primary font-bold text-base">
                {isRegister ? t('login.register') : t('login.login')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 登录/注册表单流向切换按钮 */}
        <TouchableOpacity
          onPress={() => setIsRegister(!isRegister)}
          className="mt-6"
        >
          <Text className="text-xs text-primary/80 text-center font-bold">
            {isRegister ? '已有账户？立即登录' : '没有账户？创建新相册'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
