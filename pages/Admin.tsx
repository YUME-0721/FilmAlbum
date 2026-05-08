/**
 * 超级管理员后台页面
 * 独立全屏布局，不使用主导航栏
 * 含独立的语言切换和明暗主题切换
 */
import { useState, useEffect } from 'react';
import { useSettings } from '../src/context/SettingsContext';
import { useTranslation } from '../src/hooks/useTranslation';
import { get, post, put, del } from '../src/api/client';
import {
  ShieldAlert, Users, Film, RefreshCw, Plus,
  Sun, Moon, Languages, LogOut, Settings2,
  ImageUp, Mail, Eye, EyeOff, Send,
  Pencil, Trash2, Search, X
} from 'lucide-react';

/** 管理员后台专属语言文本 */
const i18n = {
  'zh-CN': {
    title: '超级管理员',
    dashboard: '控制台',
    totalUsers: '总用户数',
    totalRolls: '总影集数',
    systemSettings: '系统设置',
    openRegistration: '开放注册',
    openRegistrationDesc: '允许新用户公开注册账号',
    defaultLanguage: '默认语言',
    lv2RollLimit: 'LV2 影集上限',
    lv2RollLimitDesc: 'LV2 用户最多可创建的影集数量',
    createUser: '创建用户',
    email: '邮箱',
    password: '密码',
    nickname: '昵称',
    level: '等级',
    create: '创建',
    creating: '创建中...',
    createSuccess: '创建成功',
    userManagement: '用户管理',
    id: 'ID',
    user: '用户',
    joined: '注册时间',
    logout: '退出登录',
    loginTitle: '管理员登录',
    adminPassword: '管理员密码',
    login: '登录',
    loginError: '密码错误或登录异常',
    on: '开启',
    off: '关闭',
    refresh: '刷新',
    updateFailed: '更新失败，请重试',
    lv1Desc: '只读权限',
    lv2Desc: '标准权限',
    lv3Desc: '无限制',
    imgBedSettings: '图床配置',
    imgBedUrl: '图床地址',
    imgBedUrlPlaceholder: 'https://img.example.com',
    imgBedToken: '图床 Token',
    imgBedTokenPlaceholder: '图床 API Token',
    saveImgBed: '保存图床配置',
    imgBedPath: '图床路径',
    imgBedPathPlaceholder: '/FilmAlbum/',
    apiSettings: 'API 配置 (自定义域名)',
    apiBaseUrl: 'API 地址',
    apiBaseUrlPlaceholder: 'https://api.example.com',
    saveApi: '保存 API 配置',
    smtpSettings: 'SMTP 邮件配置',
    smtpFrom: '发件人',
    smtpFromPlaceholder: 'FilmAlbum <no-reply@example.com>',
    smtpPassword: 'Resend API Key',
    smtpPasswordPlaceholder: 're_xxxxxxxx',
    saveSmtp: '保存邮件配置',
    testEmail: '发送测试邮件',
    testEmailTo: '收件邮箱',
    sendTest: '发送测试',
    sending: '发送中...',
    saved: '保存成功',
    saving: '保存中...',
    smtpNote: '目前仅支持 Resend。只需填入 Resend API Key 和发件人即可。',
    imgBedChannel: '全局渠道',
    imgBedNameType: '命名方式',
    imgBedPathDesc: '支持占位符：{userId}, {rollId}',
    strategyAvatar: '用户头像',
    strategyRoll: '影集原图',
    strategyPreview: '影集预览',
    strategyGear: '设备图像',
    strategyFilmStock: '胶卷型号',
    strategyPath: '路径模板',
    strategyCompress: '压缩',
    strategyChannel: '独立渠道',
    useGlobal: '跟随全局',
    tabSystem: '系统设置',
    tabUsers: '用户管理',
    tabImgBed: '图床配置',
    tabFilmStocks: '胶卷',
    filmStockManagement: '胶卷管理',
    addFilmStock: '新增胶卷',
    editFilmStock: '编辑胶卷',
    deleteFilmStock: '删除胶卷',
    confirmDelete: '确认删除此胶卷型号？',
    filmBrand: '品牌',
    filmBrandZh: '品牌中文名',
    filmBrandLogo: '品牌 LOGO URL',
    filmModel: '型号',
    filmIso: '感光度 (ISO)',
    filmFormat: '胶卷规格',
    filmType: '底片类型',
    filmProcess: '冲洗工艺',
    filterSearch: '搜索品牌或型号...',
    filterAll: '全部',
    filterFormat: '规格筛选',
    filterType: '类型筛选',
    resetFilter: '重置',
    noFilmStocks: '暂无胶卷型号，点击右上角新增',
  },
  'en-US': {
    title: 'Super Admin',
    dashboard: 'Dashboard',
    totalUsers: 'Total Users',
    totalRolls: 'Total Rolls',
    systemSettings: 'System Settings',
    openRegistration: 'Open Registration',
    openRegistrationDesc: 'Allow new users to register publicly',
    defaultLanguage: 'Default Language',
    lv2RollLimit: 'LV2 Roll Limit',
    lv2RollLimitDesc: 'Max rolls an LV2 user can create',
    createUser: 'Create User',
    email: 'Email',
    password: 'Password',
    nickname: 'Nickname',
    level: 'Level',
    create: 'Create',
    creating: 'Creating...',
    createSuccess: 'Created successfully',
    userManagement: 'User Management',
    id: 'ID',
    user: 'User',
    joined: 'Joined',
    logout: 'Logout',
    loginTitle: 'Admin Login',
    adminPassword: 'Admin Password',
    login: 'Login',
    loginError: 'Wrong password or login error',
    on: 'On',
    off: 'Off',
    refresh: 'Refresh',
    updateFailed: 'Update failed, please try again',
    lv1Desc: 'Read-only',
    lv2Desc: 'Standard',
    lv3Desc: 'Unlimited',
    imgBedSettings: 'Image Bed Config',
    imgBedUrl: 'Image Bed URL',
    imgBedUrlPlaceholder: 'https://img.example.com',
    imgBedToken: 'Image Bed Token',
    imgBedTokenPlaceholder: 'API Token',
    saveImgBed: 'Save Image Bed Config',
    imgBedPath: 'Image Bed Path',
    imgBedPathPlaceholder: '/FilmAlbum/',
    apiSettings: 'API Config (Custom Domain)',
    apiBaseUrl: 'API Base URL',
    apiBaseUrlPlaceholder: 'https://api.example.com',
    saveApi: 'Save API Config',
    smtpSettings: 'Email (SMTP) Config',
    smtpFrom: 'From Address',
    smtpFromPlaceholder: 'FilmAlbum <no-reply@example.com>',
    smtpPassword: 'Resend API Key',
    smtpPasswordPlaceholder: 're_xxxxxxxx',
    saveSmtp: 'Save Email Config',
    testEmail: 'Send Test Email',
    testEmailTo: 'Recipient',
    sendTest: 'Send Test',
    sending: 'Sending...',
    saved: 'Saved!',
    saving: 'Saving...',
    smtpNote: 'Only Resend is supported. Fill in the API Key and sender address.',
    imgBedChannel: 'Global Channel',
    imgBedNameType: 'Naming Type',
    imgBedPathDesc: 'Placeholders: {userId}, {rollId}',
    strategyAvatar: 'Avatar',
    strategyRoll: 'Roll Photo',
    strategyPreview: 'Preview',
    strategyGear: 'Gear',
    strategyFilmStock: 'Film Stock',
    strategyPath: 'Path Template',
    strategyCompress: 'Compress',
    strategyChannel: 'Channel',
    useGlobal: 'Global',
    tabSystem: 'System',
    tabUsers: 'Users',
    tabImgBed: 'ImageBed',
    tabFilmStocks: 'Film Stocks',
    filmStockManagement: 'Film Stock Management',
    addFilmStock: 'Add Film Stock',
    editFilmStock: 'Edit Film Stock',
    deleteFilmStock: 'Delete Film Stock',
    confirmDelete: 'Delete this film stock?',
    filmBrand: 'Brand',
    filmBrandZh: 'Chinese Brand Name',
    filmBrandLogo: 'Brand LOGO URL',
    filmModel: 'Model',
    filmIso: 'ISO',
    filmFormat: 'Format',
    filmType: 'Film Type',
    filmProcess: 'Process',
    filterSearch: 'Search brand or model...',
    filterAll: 'All',
    filterFormat: 'Format',
    filterType: 'Type',
    resetFilter: 'Reset',
    noFilmStocks: 'No film stocks yet. Click Add to create one.',
  }
};

/** 胶卷底片类型标签（中英文） */
const FILM_TYPE_LABELS: Record<'zh-CN' | 'en-US', Record<string, string>> = {
  'zh-CN': { COLOR_NEGATIVE: '彩色负片', BW_NEGATIVE: '黑白负片', COLOR_POSITIVE: '彩色正片 (反转片)', BW_POSITIVE: '黑白正片' },
  'en-US': { COLOR_NEGATIVE: 'Color Negative', BW_NEGATIVE: 'B&W Negative', COLOR_POSITIVE: 'Color Positive (Slide)', BW_POSITIVE: 'B&W Positive' },
};

/** 胶卷规格标签（中英文） */
const FILM_FORMAT_LABELS: Record<'zh-CN' | 'en-US', Record<string, string>> = {
  'zh-CN': { '135': '35mm (135)', '120': '中画幅 (120)' },
  'en-US': { '135': '35mm (135)', '120': 'Medium (120)' },
};

export default function Admin() {
  // NOTE: Admin 页面有独立的 theme 和 language 状态，
  // 与全局 SettingsContext 保持同步但可独立切换
  const { isDarkMode, setThemeMode, themeMode, language, setLanguage } = useSettings();
  const { t } = useTranslation();

  // 当前后台界面的语言，优先跟随全局语言
  const [adminLang, setAdminLang] = useState<'zh-CN' | 'en-US'>(
    (language as 'zh-CN' | 'en-US') || 'zh-CN'
  );
  const at = (key: keyof typeof i18n['zh-CN']): string => i18n[adminLang][key] as string;

  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [stats, setStats] = useState({ users: 0, rolls: 0 });
  const [settings, setSystemSettings] = useState({
    open_registration: 'true',
    default_language: 'zh-CN',
    lv2_roll_limit: '10',
    api_base_url: '',
    img_bed_path: '/FilmAlbum/'
  });
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', nickname: '', level: 'lv1' });
  const [createStatus, setCreateStatus] = useState({ type: '', message: '' });

  // 图床配置状态
  const [imgBed, setImgBed] = useState({ 
    img_bed_url: '', 
    img_bed_token: '', 
    img_bed_path: '/FilmAlbum/',
    img_bed_channel: 'huggingface',
    img_bed_name_type: 'index',
    // 显式初始化策略字段，防止 TS 报错
    avatar_path: '', avatar_compress: 'true', avatar_channel: '',
    roll_path: '', roll_compress: 'false', roll_channel: '',
    preview_path: '', preview_compress: 'true', preview_channel: '',
    gear_path: '', gear_compress: 'true', gear_channel: '',
    film_stock_path: '', film_stock_compress: 'true', film_stock_channel: '',
  });
  const [imgBedSaveStatus, setImgBedSaveStatus] = useState({ type: '', message: '' });
  const [showImgToken, setShowImgToken] = useState(false);


  // SMTP / Resend 配置状态
  const [smtp, setSmtp] = useState({ smtp_from: '', smtp_password: '' });
  const [smtpSaveStatus, setSmtpSaveStatus] = useState({ type: '', message: '' });
  const [showSmtpKey, setShowSmtpKey] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState({ type: '', message: '' });

  // 选项卡状态
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'imgbed' | 'filmstocks'>('system');

  // 胶卷模块状态
  const [filmStocks, setFilmStocks] = useState<any[]>([]);
  const [filmStocksLoading, setFilmStocksLoading] = useState(false);
  const [filmFilter, setFilmFilter] = useState({ search: '', format: '', filmType: '' });
  const [showFilmModal, setShowFilmModal] = useState(false);
  const [editingFilm, setEditingFilm] = useState<any | null>(null);
  const [filmForm, setFilmForm] = useState({ brand: '', brandZh: '', model: '', iso: '', format: '135', filmType: 'COLOR_NEGATIVE', process: 'C-41', brandLogo: '' });
  const [filmSaveStatus, setFilmSaveStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  // NOTE: 当切换到胶卷 Tab 时懒加载胶卷数据
  useEffect(() => {
    if (token && activeTab === 'filmstocks' && filmStocks.length === 0) {
      fetchFilmStocks();
    }
  }, [token, activeTab]);

  // 同步管理后台语言到全局 language 变动
  useEffect(() => {
    setAdminLang((language as 'zh-CN' | 'en-US') || 'zh-CN');
  }, [language]);

  const fetchFilmStocks = async (filter = filmFilter) => {
    setFilmStocksLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter.search)   params['search']   = filter.search;
      if (filter.format)   params['format']   = filter.format;
      if (filter.filmType) params['filmType'] = filter.filmType;
      const res = await get<any[]>('/admin/film-stocks', params, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success && res.data) setFilmStocks(res.data);
    } catch (e) {
      console.error('Failed to fetch film stocks', e);
    } finally {
      setFilmStocksLoading(false);
    }
  };

  const handleFilmFilter = (next: typeof filmFilter) => {
    setFilmFilter(next);
    fetchFilmStocks(next);
  };

  const handleSaveFilmStock = async () => {
    if (!filmForm.brand.trim() || !filmForm.model.trim() || !filmForm.iso) {
      alert(adminLang === 'zh-CN' ? '品牌、型号、感光度为必填项' : 'Brand, model and ISO are required');
      return;
    }
    setFilmSaveStatus({ type: 'loading', message: at('saving') });
    try {
      const payload = { ...filmForm, iso: Number(filmForm.iso) };
      let res: any;
      if (editingFilm) {
        res = await put(`/admin/film-stocks/${editingFilm.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        res = await post('/admin/film-stocks', payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (res.success) {
        setFilmSaveStatus({ type: 'success', message: at('saved') });
        setShowFilmModal(false);
        setEditingFilm(null);
        setFilmForm({ brand: '', brandZh: '', model: '', iso: '', format: '135', filmType: 'COLOR_NEGATIVE', process: 'C-41', brandLogo: '' });
        fetchFilmStocks();
      } else {
        setFilmSaveStatus({ type: 'error', message: res.error || at('updateFailed') });
      }
    } catch (err: any) {
      setFilmSaveStatus({ type: 'error', message: err.message || at('updateFailed') });
    }
  };

  const handleDeleteFilmStock = async (id: string) => {
    if (!window.confirm(at('confirmDelete'))) return;
    try {
      const res = await del(`/admin/film-stocks/${id}`, undefined, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) fetchFilmStocks();
    } catch (e) {
      console.error('delete film stock failed', e);
    }
  };

  const toggleLanguage = () => {
    const next = adminLang === 'zh-CN' ? 'en-US' : 'zh-CN';
    setAdminLang(next);
    setLanguage(next); // 同步到全局
  };

  const toggleTheme = () => {
    setThemeMode(isDarkMode ? 'light' : 'dark');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await post<{ token: string }>('/admin/login', { password });
      if (res.success && res.data) {
        setToken(res.data.token);
        localStorage.setItem('adminToken', res.data.token);
      } else {
        setLoginError(res.error || at('loginError'));
      }
    } catch (err: any) {
      setLoginError(err.message || at('loginError'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('adminToken');
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, settingsRes, usersRes] = await Promise.all([
        get<{ users: number; rolls: number }>('/admin/stats', undefined, { headers }),
        get<Record<string, string>>('/admin/settings', undefined, { headers }),
        get<{ users: any[] }>('/admin/users', undefined, { headers }),
      ]);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (settingsRes.success && settingsRes.data) {
        const s = settingsRes.data as Record<string, string>;
        setSystemSettings(s as any);
        // 将图床和 SMTP 配置回填到对应表单（密文不展示）
        setImgBed({
          img_bed_url:       s['img_bed_url']       || '',
          img_bed_token:     s['img_bed_token'] ? '••••••••' : '',
          img_bed_path:      s['img_bed_path']      || '/FilmAlbum/',
          img_bed_channel:   s['img_bed_channel']   || 'huggingface',
          img_bed_name_type: s['img_bed_name_type'] || 'index',
          // 回填各类型策略
          avatar_path:     s['avatar_path']     || '{userId}/',
          avatar_compress: s['avatar_compress'] || 'true',
          avatar_channel:  s['avatar_channel']  || '',
          roll_path:       s['roll_path']       || '{userId}/{rollId}/',
          roll_compress:   s['roll_compress']   || 'false',
          roll_channel:    s['roll_channel']    || '',
          preview_path:    s['preview_path']    || '{userId}/{rollId}/preview/',
          preview_compress:s['preview_compress']|| 'true',
          preview_channel: s['preview_channel'] || '',
          gear_path:       s['gear_path']       || '{userId}/Gear/',
          gear_compress:   s['gear_compress']   || 'true',
          gear_channel:    s['gear_channel']    || '',
          film_stock_path: s['film_stock_path'] || 'Films/',
          film_stock_compress: s['film_stock_compress'] || 'true',
          film_stock_channel: s['film_stock_channel'] || '',
        });
        setSmtp({
          smtp_from:     s['smtp_from']     || '',
          smtp_password: s['smtp_password'] ? '••••••••' : '',
        });
      }
      if (usersRes.success && usersRes.data) setUsers(usersRes.data.users);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('403')) handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const res = await put('/admin/settings', { key, value }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setSystemSettings(prev => ({ ...prev, [key]: value }));
      } else {
        alert(at('updateFailed'));
      }
    } catch {
      alert(at('updateFailed'));
    }
  };

  const handleUpdateUserLevel = async (userId: string, level: string) => {
    try {
      const res = await put(`/admin/users/${userId}/level`, { level }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setUsers(users.map(u => String(u.id) === String(userId) ? { ...u, level } : u));
      }
    } catch {
      alert(at('updateFailed'));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateStatus({ type: 'loading', message: at('creating') });
    try {
      const res = await post('/admin/users', newUser, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setCreateStatus({ type: 'success', message: at('createSuccess') });
        setNewUser({ email: '', password: '', nickname: '', level: 'lv1' });
        fetchDashboardData();
      } else {
        setCreateStatus({ type: 'error', message: res.error || 'Error' });
      }
    } catch (err: any) {
      setCreateStatus({ type: 'error', message: err.message || 'Error' });
    }
  };

  // 保存图床配置
  const handleSaveImgBed = async () => {
    const { img_bed_url, img_bed_path, img_bed_channel, img_bed_name_type } = imgBed;
    const payload: Record<string, string> = {};
    if (img_bed_url) payload['img_bed_url'] = img_bed_url;
    if (img_bed_path) payload['img_bed_path'] = img_bed_path;
    if (img_bed_channel) payload['img_bed_channel'] = img_bed_channel;
    if (img_bed_name_type) payload['img_bed_name_type'] = img_bed_name_type;
    
    // 包含所有策略字段
    ['avatar', 'roll', 'preview', 'gear', 'film_stock'].forEach(type => {
      payload[`${type}_path`] = (imgBed as any)[`${type}_path`];
      payload[`${type}_compress`] = String((imgBed as any)[`${type}_compress`]);
      payload[`${type}_channel`] = (imgBed as any)[`${type}_channel`];
    });

    if (imgBed.img_bed_token && imgBed.img_bed_token !== '••••••••') {
      payload['img_bed_token'] = imgBed.img_bed_token;
    }
    if (Object.keys(payload).length === 0) return;

    setImgBedSaveStatus({ type: 'loading', message: at('saving') });
    try {
      const res = await put('/admin/settings/batch', payload, { headers: { Authorization: `Bearer ${token}` } });
      setImgBedSaveStatus({ type: res.success ? 'success' : 'error', message: res.success ? at('saved') : (res.error || at('updateFailed')) });
    } catch (err: any) {
      setImgBedSaveStatus({ type: 'error', message: err.message || at('updateFailed') });
    }
  };


  // 保存 SMTP 配置
  const handleSaveSmtp = async () => {
    const payload: Record<string, string> = {};
    if (smtp.smtp_from) payload['smtp_from'] = smtp.smtp_from;
    if (smtp.smtp_password && smtp.smtp_password !== '••••••••') {
      payload['smtp_password'] = smtp.smtp_password;
    }
    if (Object.keys(payload).length === 0) return;

    setSmtpSaveStatus({ type: 'loading', message: at('saving') });
    try {
      const res = await put('/admin/settings/batch', payload, { headers: { Authorization: `Bearer ${token}` } });
      setSmtpSaveStatus({ type: res.success ? 'success' : 'error', message: res.success ? at('saved') : (res.error || at('updateFailed')) });
    } catch (err: any) {
      setSmtpSaveStatus({ type: 'error', message: err.message || at('updateFailed') });
    }
  };

  // 发送测试邮件
  const handleTestEmail = async () => {
    if (!testEmailTo) return;
    setTestEmailStatus({ type: 'loading', message: at('sending') });
    try {
      const res = await post('/admin/test-email', { to: testEmailTo }, { headers: { Authorization: `Bearer ${token}` } });
      setTestEmailStatus({ type: res.success ? 'success' : 'error', message: res.success ? '测试邮件已发送' : (res.error || at('updateFailed')) });
    } catch (err: any) {
      setTestEmailStatus({ type: 'error', message: err.message || at('updateFailed') });
    }
  };

  // ── 颜色常量 ────────────────────────────────────────────
  const bg = isDarkMode ? 'bg-[#0d0d0d]' : 'bg-gray-50';
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const cardBg = isDarkMode ? 'bg-[#1a1a1a] border-white/8' : 'bg-white border-gray-200';
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    isDarkMode ? 'bg-[#242424] border-white/10 text-white placeholder:text-white/30' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
  }`;
  const mutedText = isDarkMode ? 'text-white/40' : 'text-gray-400';
  const dividerCls = isDarkMode ? 'divide-white/8' : 'divide-gray-100';

  // ── 顶部导航栏 ───────────────────────────────────────────
  const Topbar = () => (
    <header className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 border-b backdrop-blur-md ${
      isDarkMode ? 'bg-[#0d0d0d]/90 border-white/8' : 'bg-white/90 border-gray-200'
    }`}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 mr-4">
          <ShieldAlert size={20} className="text-blue-500" />
          <span className="font-bold tracking-wider text-sm uppercase hidden sm:inline">{at('title')}</span>
        </div>

        <nav className="flex items-center gap-1">
          {[
            { id: 'system',     icon: Settings2, label: at('tabSystem') },
            { id: 'users',      icon: Users,     label: at('tabUsers') },
            { id: 'filmstocks', icon: Film,       label: at('tabFilmStocks') },
            { id: 'imgbed',     icon: ImageUp,    label: at('tabImgBed') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                  : (isDarkMode ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
              }`}
            >
              <tab.icon size={14} />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* 语言切换 */}
        <button
          onClick={toggleLanguage}
          title={adminLang === 'zh-CN' ? 'Switch to English' : '切换到中文'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${
            isDarkMode
              ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
        >
          <Languages size={14} />
          {adminLang === 'zh-CN' ? 'EN' : '中'}
        </button>

        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? (adminLang === 'zh-CN' ? '切换至亮色模式' : 'Switch to Light') : (adminLang === 'zh-CN' ? '切换至暗色模式' : 'Switch to Dark')}
          className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
            isDarkMode
              ? 'border-white/10 bg-white/5 hover:bg-white/10 text-amber-400'
              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-blue-600'
          }`}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* 退出登录（仅登录后显示） */}
        {token && (
          <button
            onClick={handleLogout}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 active:scale-95 ${
              isDarkMode
                ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400'
                : 'border-red-200 bg-red-50 hover:bg-red-100 text-red-600'
            }`}
          >
            <LogOut size={14} />
            {at('logout')}
          </button>
        )}
      </div>
    </header>
  );

  // ── 登录页 ────────────────────────────────────────────────
  if (!token) {
    return (
      <div className={`min-h-screen ${bg} ${text} transition-colors duration-300`}>
        <Topbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50'
              }`}>
                <ShieldAlert size={32} className="text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold">{at('loginTitle')}</h1>
              <p className={`text-sm mt-1 ${mutedText}`}>Film Album · Admin Portal</p>
            </div>

            <div className={`rounded-2xl border p-6 ${cardBg}`}>
              {loginError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {loginError}
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-widest mb-1.5 ${mutedText}`}>
                    {at('adminPassword')}
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? <RefreshCw size={16} className="animate-spin" /> : null}
                  {isLoggingIn ? '...' : at('login')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 主控制台 ──────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-300`}>
      <Topbar />

      <main className="pt-14 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


          {/* 系统设置 TAB */}
          {activeTab === 'system' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`rounded-2xl border ${cardBg}`}>
                  <div className="px-5 py-4 border-b border-inherit flex items-center gap-2">
                    <Settings2 size={16} className="text-blue-500" />
                    <h2 className="font-bold text-sm uppercase tracking-widest">{at('systemSettings')}</h2>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-sm">{at('openRegistration')}</p>
                        <p className={`text-xs mt-0.5 ${mutedText}`}>{at('openRegistrationDesc')}</p>
                      </div>
                      <button
                        onClick={() => handleUpdateSetting('open_registration', settings.open_registration === 'true' ? 'false' : 'true')}
                        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                          settings.open_registration === 'true' ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 mt-1 ml-1 ${
                          settings.open_registration === 'true' ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-1.5">{at('defaultLanguage')}</p>
                      <select value={settings.default_language} onChange={(e) => handleUpdateSetting('default_language', e.target.value)} className={inputCls}>
                        <option value="zh-CN">简体中文</option>
                        <option value="en-US">English</option>
                      </select>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-1.5">{at('lv2RollLimit')}</p>
                      <input type="number" value={settings.lv2_roll_limit} onBlur={(e) => handleUpdateSetting('lv2_roll_limit', e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>

                <div className={`rounded-2xl border ${cardBg}`}>
                  <div className="px-5 py-4 border-b border-inherit flex items-center gap-2">
                    <Mail size={16} className="text-violet-500" />
                    <h2 className="font-bold text-sm uppercase tracking-widest">{at('smtpSettings')}</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <input type="text" placeholder={at('smtpFrom')} value={smtp.smtp_from} onChange={(e) => setSmtp(p => ({ ...p, smtp_from: e.target.value }))} className={inputCls} />
                    <input type="password" placeholder={at('smtpPassword')} value={smtp.smtp_password} onChange={(e) => setSmtp(p => ({ ...p, smtp_password: e.target.value }))} className={inputCls} />
                    <button onClick={handleSaveSmtp} className="w-full py-2 bg-violet-600 text-white rounded-lg text-sm font-bold">保存 SMTP</button>
                    <div className="pt-4 border-t border-white/5">
                      <div className="flex gap-2">
                        <input type="email" placeholder="测试邮箱" value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} className={inputCls} />
                        <button onClick={handleTestEmail} className="px-4 bg-white/5 border border-white/10 rounded-lg text-xs font-bold">测试</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 用户管理 TAB */}
          {activeTab === 'users' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
              {/* 美化后的统计卡片 & 操作栏 */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className={`flex-1 p-5 rounded-3xl border ${isDarkMode ? 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-white border-blue-100'} relative overflow-hidden group shadow-sm`}>
                  <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-300/40'}`}></div>
                  <div className="relative flex items-center gap-5">
                    <div className={`p-4 rounded-2xl shadow-inner ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white text-blue-600 shadow-blue-100/50'}`}>
                      <Users size={28} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-blue-400/80' : 'text-blue-600/80'}`}>{at('totalUsers')}</p>
                      <p className={`text-3xl font-black font-mono tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.users}</p>
                    </div>
                  </div>
                </div>

                <div className={`flex-1 p-5 rounded-3xl border ${isDarkMode ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100'} relative overflow-hidden group shadow-sm`}>
                  <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-300/40'}`}></div>
                  <div className="relative flex items-center gap-5">
                    <div className={`p-4 rounded-2xl shadow-inner ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white text-emerald-600 shadow-emerald-100/50'}`}>
                      <Film size={28} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>{at('totalRolls')}</p>
                      <p className={`text-3xl font-black font-mono tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.rolls}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end md:w-32">
                  <button
                    onClick={fetchDashboardData}
                    disabled={isLoading}
                    className={`w-full h-full min-h-[96px] flex flex-col items-center justify-center gap-2 rounded-3xl border transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm group ${
                      isDarkMode 
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white' 
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <RefreshCw size={22} className={`${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{at('refresh')}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <div className={`rounded-2xl border ${cardBg} p-5 space-y-4`}>
                    <h2 className="font-bold text-xs uppercase tracking-widest text-blue-500">{at('createUser')}</h2>
                    <form onSubmit={handleCreateUser} className="space-y-3">
                      <input type="email" required placeholder={at('email')} value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className={inputCls} />
                      <input type="password" required placeholder={at('password')} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className={inputCls} />
                      <input type="text" required placeholder={at('nickname')} value={newUser.nickname} onChange={(e) => setNewUser({...newUser, nickname: e.target.value})} className={inputCls} />
                      <select value={newUser.level} onChange={(e) => setNewUser({...newUser, level: e.target.value})} className={inputCls}>
                        <option value="lv1">LV1</option>
                        <option value="lv2">LV2</option>
                        <option value="lv3">LV3</option>
                      </select>
                      <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{at('create')}</button>
                    </form>
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
                    <table className="w-full text-left text-sm">
                      <thead className={isDarkMode ? 'bg-white/2' : 'bg-gray-50'}>
                        <tr className={mutedText}>
                          <th className="px-6 py-3 text-[10px] uppercase font-bold">{at('id')}</th>
                          <th className="px-6 py-3 text-[10px] uppercase font-bold">{at('user')}</th>
                          <th className="px-6 py-3 text-[10px] uppercase font-bold">{at('level')}</th>
                          <th className="px-6 py-3 text-[10px] uppercase font-bold">{at('joined')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users.map(user => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 font-mono text-xs opacity-50">#{String(user.id).padStart(4, '0')}</td>
                            <td className="px-6 py-4">
                              <div className="font-bold">{user.nickname}</div>
                              <div className="text-xs opacity-50">{user.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <select value={user.level} onChange={(e) => handleUpdateUserLevel(String(user.id), e.target.value)} className="bg-transparent border-none text-xs font-bold text-blue-500">
                                <option value="lv1">LV1</option>
                                <option value="lv2">LV2</option>
                                <option value="lv3">LV3</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 text-xs opacity-50">{new Date(user.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 胶卷管理 TAB */}
          {activeTab === 'filmstocks' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
              {/* 筛选栏 + 操作按钮 */}
              <div className={`rounded-2xl border ${cardBg} p-4`}>
                <div className="flex flex-col md:flex-row gap-3 items-center">
                  <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border ${isDarkMode ? 'bg-[#242424] border-white/10' : 'bg-white border-gray-200'}`}>
                    <Search size={14} className={mutedText} />
                    <input
                      type="text"
                      placeholder={at('filterSearch')}
                      value={filmFilter.search}
                      onChange={e => handleFilmFilter({ ...filmFilter, search: e.target.value })}
                      className="flex-1 bg-transparent outline-none text-sm"
                    />
                    {filmFilter.search && (
                      <button onClick={() => handleFilmFilter({ ...filmFilter, search: '' })} className="opacity-40 hover:opacity-100">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <select
                    value={filmFilter.format}
                    onChange={e => handleFilmFilter({ ...filmFilter, format: e.target.value })}
                    className={`${inputCls} w-auto min-w-[120px]`}
                  >
                    <option value="">{at('filterAll')} {at('filmFormat')}</option>
                    <option value="135">35mm (135)</option>
                    <option value="120">{adminLang === 'zh-CN' ? '中画幅 (120)' : 'Medium (120)'}</option>
                  </select>
                  <select
                    value={filmFilter.filmType}
                    onChange={e => handleFilmFilter({ ...filmFilter, filmType: e.target.value })}
                    className={`${inputCls} w-auto min-w-[140px]`}
                  >
                    <option value="">{at('filterAll')} {at('filmType')}</option>
                    <option value="COLOR_NEGATIVE">{FILM_TYPE_LABELS[adminLang]['COLOR_NEGATIVE']}</option>
                    <option value="BW_NEGATIVE">{FILM_TYPE_LABELS[adminLang]['BW_NEGATIVE']}</option>
                    <option value="COLOR_POSITIVE">{FILM_TYPE_LABELS[adminLang]['COLOR_POSITIVE']}</option>
                    <option value="BW_POSITIVE">{FILM_TYPE_LABELS[adminLang]['BW_POSITIVE']}</option>
                  </select>
                  {(filmFilter.search || filmFilter.format || filmFilter.filmType) && (
                    <button
                      onClick={() => handleFilmFilter({ search: '', format: '', filmType: '' })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}
                    >
                      {at('resetFilter')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingFilm(null);
                      setFilmForm({ brand: '', model: '', iso: '', format: '135', filmType: 'COLOR_NEGATIVE', process: 'C-41', brandLogo: '' });
                      setFilmSaveStatus({ type: '', message: '' });
                      setShowFilmModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap shadow-lg shadow-violet-500/20"
                  >
                    <Plus size={14} />
                    {at('addFilmStock')}
                  </button>
                </div>
              </div>

              {/* 胶卷卡片列表 */}
              {filmStocksLoading ? (
                <div className="flex justify-center items-center py-24">
                  <RefreshCw size={24} className="animate-spin opacity-40" />
                </div>
              ) : filmStocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <Film size={64} className="opacity-15" />
                  <p className={`text-sm ${mutedText}`}>{at('noFilmStocks')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filmStocks.map(stock => {
                    const typeLabel = FILM_TYPE_LABELS[adminLang][stock.filmType] || stock.filmType;
                    const typeColor: Record<string, string> = {
                      COLOR_NEGATIVE: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
                      BW_NEGATIVE:    'text-gray-400 bg-gray-400/10 border-gray-400/20',
                      COLOR_POSITIVE: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
                      BW_POSITIVE:    'text-blue-400 bg-blue-400/10 border-blue-400/20',
                    };
                    const chipColor = typeColor[stock.filmType] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
                    const logoUrl = stock.brandLogo;

                    return (
                      <div
                        key={stock.id}
                        className={`group rounded-2xl border ${cardBg} p-5 flex flex-col gap-3 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}
                      >
                        {/* 品牌区域 */}
                        <div className="flex items-center gap-3">
                          {logoUrl ? (
                            <img src={logoUrl} alt={stock.brand} className="w-9 h-9 object-contain rounded-lg bg-white/5 p-1" />
                          ) : (
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                              {stock.brand.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 truncate">
                              {stock.brand} {stock.brandZh && <span className="ml-1 opacity-70">/ {stock.brandZh}</span>}
                            </p>
                            <p className="font-bold text-sm leading-tight truncate">{stock.model}</p>
                          </div>
                        </div>

                        {/* 信息 chips */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${chipColor}`}>
                            {typeLabel}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDarkMode ? 'border-white/10 text-white/60' : 'border-gray-200 text-gray-500'}`}>
                            ISO {stock.iso}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDarkMode ? 'border-white/10 text-white/60' : 'border-gray-200 text-gray-500'}`}>
                            {stock.format}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDarkMode ? 'border-white/10 text-white/60' : 'border-gray-200 text-gray-500'}`}>
                            {stock.process}
                          </span>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2 mt-auto pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => {
                              setEditingFilm(stock);
                              setFilmForm({
                                brand: stock.brand, brandZh: stock.brandZh || '', model: stock.model,
                                iso: String(stock.iso), format: stock.format,
                                filmType: stock.filmType, process: stock.process,
                                brandLogo: stock.brandLogo || ''
                              });
                              setFilmSaveStatus({ type: '', message: '' });
                              setShowFilmModal(true);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg font-bold transition-colors ${isDarkMode ? 'hover:bg-white/8 text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                          >
                            <Pencil size={12} />
                            {at('editFilmStock')}
                          </button>
                          <button
                            onClick={() => handleDeleteFilmStock(stock.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg font-bold transition-colors text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={12} />
                            {at('deleteFilmStock')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 新增/编辑 Modal */}
              {showFilmModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowFilmModal(false)}>
                  <div className={`rounded-2xl border ${cardBg} p-6 w-full max-w-md shadow-2xl`} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-bold text-base">{editingFilm ? at('editFilmStock') : at('addFilmStock')}</h2>
                      <button onClick={() => setShowFilmModal(false)} className="opacity-50 hover:opacity-100 transition-opacity">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${mutedText}`}>{at('filmBrand')}</label>
                          <input
                            type="text"
                            value={filmForm.brand}
                            onChange={e => setFilmForm(p => ({ ...p, brand: e.target.value }))}
                            className={inputCls}
                            placeholder="e.g.: Kodak"
                          />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${mutedText}`}>{at('filmBrandZh')}</label>
                          <input
                            type="text"
                            value={filmForm.brandZh}
                            onChange={e => setFilmForm(p => ({ ...p, brandZh: e.target.value }))}
                            className={inputCls}
                            placeholder="e.g.: 柯达"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${mutedText}`}>{at('filmModel')}</label>
                          <input
                            type="text"
                            value={filmForm.model}
                            onChange={e => setFilmForm(p => ({ ...p, model: e.target.value }))}
                            className={inputCls}
                            placeholder="e.g.: Portra 400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${mutedText}`}>{at('filmBrandLogo')}</label>
                        <input
                          type="url"
                          value={filmForm.brandLogo}
                          onChange={e => setFilmForm(p => ({ ...p, brandLogo: e.target.value }))}
                          className={inputCls}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${mutedText}`}>{at('filmIso')}</label>
                          <input
                            type="number"
                            min="1"
                            value={filmForm.iso}
                            onChange={e => setFilmForm(p => ({ ...p, iso: e.target.value }))}
                            className={inputCls}
                            placeholder="400"
                          />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${mutedText}`}>{at('filmFormat')}</label>
                          <select value={filmForm.format} onChange={e => setFilmForm(p => ({ ...p, format: e.target.value }))} className={inputCls}>
                            <option value="135">35mm (135)</option>
                            <option value="120">{adminLang === 'zh-CN' ? '中画幅 (120)' : 'Medium (120)'}</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${mutedText}`}>{at('filmType')}</label>
                          <select value={filmForm.filmType} onChange={e => setFilmForm(p => ({ ...p, filmType: e.target.value }))} className={inputCls}>
                            <option value="COLOR_NEGATIVE">{FILM_TYPE_LABELS[adminLang]['COLOR_NEGATIVE']}</option>
                            <option value="BW_NEGATIVE">{FILM_TYPE_LABELS[adminLang]['BW_NEGATIVE']}</option>
                            <option value="COLOR_POSITIVE">{FILM_TYPE_LABELS[adminLang]['COLOR_POSITIVE']}</option>
                            <option value="BW_POSITIVE">{FILM_TYPE_LABELS[adminLang]['BW_POSITIVE']}</option>
                          </select>
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${mutedText}`}>{at('filmProcess')}</label>
                          <select value={filmForm.process} onChange={e => setFilmForm(p => ({ ...p, process: e.target.value }))} className={inputCls}>
                            <option value="C-41">C-41</option>
                            <option value="E-6">E-6</option>
                            <option value="ECN-2">ECN-2</option>
                            <option value="D-76">D-76</option>
                            <option value="D-67">D-67</option>
                          </select>
                        </div>
                      </div>

                      {filmSaveStatus.message && (
                        <p className={`text-xs font-bold ${filmSaveStatus.type === 'error' ? 'text-red-400' : filmSaveStatus.type === 'success' ? 'text-green-400' : 'opacity-50'}`}>
                          {filmSaveStatus.message}
                        </p>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setShowFilmModal(false)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}
                        >
                          {adminLang === 'zh-CN' ? '取消' : 'Cancel'}
                        </button>
                        <button
                          onClick={handleSaveFilmStock}
                          disabled={filmSaveStatus.type === 'loading'}
                          className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {filmSaveStatus.type === 'loading' ? at('saving') : (editingFilm ? (adminLang === 'zh-CN' ? '保存修改' : 'Save') : (adminLang === 'zh-CN' ? '添加' : 'Add'))}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 图床配置 TAB */}
          {activeTab === 'imgbed' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
              <div className={`rounded-2xl border ${cardBg} p-6 space-y-8`}>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-2">
                    <ImageUp size={16} />
                    基础配置
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">{at('imgBedUrl')}</label>
                      <input type="url" value={imgBed.img_bed_url} onChange={(e) => setImgBed(p => ({ ...p, img_bed_url: e.target.value }))} className={inputCls} placeholder="https://img.example.com" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">{at('imgBedToken')}</label>
                      <input type="password" value={imgBed.img_bed_token} onChange={(e) => setImgBed(p => ({ ...p, img_bed_token: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">{at('imgBedChannel')}</label>
                      <select value={imgBed.img_bed_channel} onChange={(e) => setImgBed(p => ({ ...p, img_bed_channel: e.target.value }))} className={inputCls}>
                        <option value="huggingface">HuggingFace</option>
                        <option value="cloudflare">Cloudflare</option>
                        <option value="r2">Cloudflare R2</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <h3 className="text-xs font-bold text-amber-500 mb-4 uppercase tracking-widest">上传策略 (Upload Strategies)</h3>
                  <div className="overflow-x-auto border border-white/5 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className={isDarkMode ? 'bg-white/5' : 'bg-gray-50'}>
                        <tr className="opacity-50">
                          <th className="px-4 py-3 font-bold uppercase text-[9px]">{at('user')}</th>
                          <th className="px-4 py-3 font-bold uppercase text-[9px]">路径模板 (Path)</th>
                          <th className="px-4 py-3 font-bold uppercase text-[9px]">渠道 (Channel)</th>
                          <th className="px-4 py-3 font-bold uppercase text-[9px] text-center">压缩</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {[
                          { key: 'avatar', label: '用户头像' },
                          { key: 'roll', label: '影集原图' },
                          { key: 'preview', label: '影集预览' },
                          { key: 'gear', label: '设备图像' },
                          { key: 'film_stock', label: '胶卷型号' },
                        ].map((item) => (
                          <tr key={item.key} className={isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-3 font-bold">{item.label}</td>
                            <td className="px-4 py-3">
                              <input type="text" value={(imgBed as any)[`${item.key}_path`]} onChange={(e) => setImgBed(p => ({ ...p, [`${item.key}_path`]: e.target.value }))} className="w-full bg-transparent border-none p-0 text-[11px] focus:ring-0" />
                            </td>
                            <td className="px-4 py-3">
                              <select value={(imgBed as any)[`${item.key}_channel`]} onChange={(e) => setImgBed(p => ({ ...p, [`${item.key}_channel`]: e.target.value }))} className="bg-transparent border-none p-0 text-[11px] focus:ring-0">
                                <option value="">默认全局</option>
                                <option value="huggingface">HF</option>
                                <option value="cloudflare">CF</option>
                                <option value="r2">R2</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input type="checkbox" checked={(imgBed as any)[`${item.key}_compress`] === 'true'} onChange={(e) => setImgBed(p => ({ ...p, [`${item.key}_compress`]: String(e.target.checked) }))} className="rounded bg-transparent border-white/20 text-amber-500 focus:ring-0" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className={`mt-3 text-[10px] italic ${mutedText}`}>{at('imgBedPathDesc')}</p>
                </div>

                <button onClick={handleSaveImgBed} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]">
                  保存并应用图床策略
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
