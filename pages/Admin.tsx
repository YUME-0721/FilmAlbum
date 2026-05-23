/**
 * 超级管理员后台页面
 * 独立全屏布局，不使用主导航栏
 * 含独立的语言切换和明暗主题切换
 */
import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../src/context/SettingsContext';
import { useTranslation } from '../src/hooks/useTranslation';
import { get, post, put, del } from '../src/api/client';
import {
  ShieldAlert, Users, Film, RefreshCw, Plus,
  Sun, Moon, Languages, LogOut, Settings2,
  ImageUp, Mail, Eye, EyeOff, Send,
  Pencil, Trash2, Search, X, ShieldCheck
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
    imgBedSettings: '图片存储',
    imgBedUrl: '图床地址',
    imgBedUrlPlaceholder: 'https://img.example.com',
    imgBedToken: '图床 Token',
    imgBedTokenPlaceholder: '图床 API Token',
    saveImgBed: '保存图片存储',
    imgBedPath: '基础路径',
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
    strategyPost: '动态图片',
    strategyPath: '路径模板',
    strategyCompress: '压缩',
    strategyChannel: '独立渠道',
    useGlobal: '跟随全局',
    tabSystem: '系统设置',
    tabUsers: '用户管理',
    tabImgBed: '图片存储',
    tabFilmStocks: '胶卷',
    filmStockManagement: '胶卷管理',
    addFilmStock: '新增胶卷',
    editFilmStock: '编辑胶卷',
    deleteFilmStock: '删除胶卷',
    confirmDelete: '确认删除胶卷型号 {name}？',
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
    confirm: '确认',
    cancel: '取消',
    albums: '影集数',
    levelSettings: '等级与权限设置',
    levelName: '等级名称',
    levelValue: '等级标识',
    levelDesc: '等级描述',
    rollLimit: '影集数量限制',
    gearLimit: '设备数量限制',
    canPost: '允许发布帖子',
    canComment: '允许评论',
    addLevel: '添加等级',
    editLevel: '编辑等级',
    deleteLevel: '删除等级',
    confirmDeleteLevel: '确认删除等级 {name}？',
    maintenance: '系统维护',
    backupAndRestore: '系统备份与还原',
    backupNow: '立即备份',
    restoreData: '还原数据',
    includeContent: '包含影集与内容数据 (体积较大)',
    backupDesc: '备份文件包含系统配置、用户信息以及影集元数据。注意：备份不包含第三方图床中的原始图片文件。',
    restoreConfirm: '确定要还原数据吗？这将覆盖当前所有数据且不可撤销！',
    backupSuccess: '备份已生成，正在下载...',
    restoreSuccess: '系统已成功恢复',
    invalidBackupFile: '无效的备份文件',
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
    strategyPost: 'Post Image',
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
    confirmDelete: 'Delete film stock {name}?',
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
    confirm: 'Confirm',
    cancel: 'Cancel',
    albums: 'Albums',
    levelSettings: 'Levels & Permissions',
    levelName: 'Level Name',
    levelValue: 'Value',
    levelDesc: 'Description',
    rollLimit: 'Album Limit',
    gearLimit: 'Gear Limit',
    canPost: 'Can Post',
    canComment: 'Can Comment',
    addLevel: 'Add Level',
    editLevel: 'Edit Level',
    deleteLevel: 'Delete Level',
    confirmDeleteLevel: 'Delete level {name}?',
    maintenance: 'Maintenance',
    backupAndRestore: 'Backup & Restore',
    backupNow: 'Backup Now',
    restoreData: 'Restore Data',
    includeContent: 'Include Album & Content (Larger Size)',
    backupDesc: 'Backup file includes system config, users, and album metadata. Note: It does NOT include original images in external image beds.',
    restoreConfirm: 'Are you sure you want to restore? This will overwrite ALL current data and cannot be undone!',
    backupSuccess: 'Backup generated, downloading...',
    restoreSuccess: 'System restored successfully',
    invalidBackupFile: 'Invalid backup file',
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
    img_bed_path: '/FilmAlbum/',
    user_levels: '[]',
    roll_formats: '',
    film_types: ''
  });
  const [userLevels, setUserLevels] = useState<any[]>([]);
  const [rollFormats, setRollFormats] = useState<any[]>([]);
  const [filmTypes, setFilmTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', nickname: '', level: 'lv1' });
  const [createStatus, setCreateStatus] = useState({ type: '', message: '' });

  // 超级管理员修改选定用户登录密码的状态管理
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<any | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordChangeStatus, setPasswordChangeStatus] = useState({ type: '', message: '' });

  // API 服务器地址状态与方法
  const [apiServerUrl, setApiServerUrl] = useState(localStorage.getItem('api_server_url') || '');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // 保存 API 服务器地址 (同步本地 LocalStorage 与后端 D1 数据库)
  const handleSaveApiUrl = async () => {
    const trimmed = apiServerUrl.trim();
    if (trimmed && !/^https?:\/\//.test(trimmed)) {
      alert(adminLang === 'zh-CN' ? '请输入合法的 API 地址 (必须以 http:// 或 https:// 开头)' : 'Please enter a valid API URL (must start with http:// or https://)');
      return;
    }
    if (trimmed) {
      localStorage.setItem('api_server_url', trimmed);
    } else {
      localStorage.removeItem('api_server_url');
    }
    if (token) {
      await handleUpdateSetting('api_base_url', trimmed);
    }
    alert(adminLang === 'zh-CN' ? 'API 服务器地址已保存并生效' : 'API server URL saved successfully');
    setIsConfigOpen(false);
  };

  // 重置为默认 API 地址
  const handleResetApiUrl = async () => {
    localStorage.removeItem('api_server_url');
    setApiServerUrl('');
    if (token) {
      await handleUpdateSetting('api_base_url', '');
    }
    alert(adminLang === 'zh-CN' ? '已重置为默认 API 地址' : 'Reset to default API URL successfully');
    setIsConfigOpen(false);
  };

  // 测试 API 连接可用性
  const handleTestConnection = async (urlToTest: string) => {
    let targetUrl = urlToTest.trim();
    if (!targetUrl) {
      targetUrl = window.location.origin;
    }

    if (targetUrl && !/^https?:\/\//.test(targetUrl)) {
      alert(adminLang === 'zh-CN' ? '无效的 API 地址' : 'Invalid API URL');
      return;
    }

    setIsTestingUrl(true);
    try {
      let cleanUrl = targetUrl.replace(/\/$/, '');
      if (cleanUrl.startsWith('http') && !cleanUrl.endsWith('/api')) {
        cleanUrl += '/api';
      }
      const healthUrl = cleanUrl.startsWith('http') ? `${cleanUrl}/health` : `${cleanUrl || window.location.origin}/api/health`;

      const response = await fetch(healthUrl, { method: 'GET' });
      if (!response.ok) {
        throw new Error('Connection error');
      }
      const data = await response.json();
      if (data && data.status === 'ok') {
        alert(adminLang === 'zh-CN' ? '连接成功！' : 'Connected successfully!');
      } else {
        throw new Error('Health check not OK');
      }
    } catch {
      alert(adminLang === 'zh-CN' ? '连接失败，请检查 API 地址是否正确或跨域是否允许' : 'Connection failed. Please check the URL or CORS settings');
    } finally {
      setIsTestingUrl(false);
    }
  };

  // 图片存储配置状态
  const [imgBed, setImgBed] = useState({ 
    storage_type: 'img_bed',
    img_bed_url: '', 
    img_bed_token: '', 
    img_bed_path: '/FilmAlbum/',
    img_bed_channel: 'huggingface',
    img_bed_name_type: 'index',
    webdav_url: '',
    webdav_username: '',
    webdav_password: '',
    webdav_path: '/FilmAlbum/',
    // 显式初始化策略字段，防止 TS 报错
    avatar_path: '', avatar_compress: 'true', avatar_channel: '',
    roll_path: '', roll_compress: 'false', roll_channel: '',
    preview_path: '', preview_compress: 'true', preview_channel: '',
    gear_path: '', gear_compress: 'true', gear_channel: '',
    film_stock_path: '', film_stock_compress: 'true', film_stock_channel: '',
    post_path: '', post_compress: 'true', post_channel: '',
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
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'imgbed' | 'filmstocks' | 'maintenance'>('system');

  // 胶卷模块状态
  const [filmStocks, setFilmStocks] = useState<any[]>([]);
  const [filmStocksLoading, setFilmStocksLoading] = useState(false);
  const [filmFilter, setFilmFilter] = useState({ search: '', format: '', filmType: '' });
  const [showFilmModal, setShowFilmModal] = useState(false);
  const [editingFilm, setEditingFilm] = useState<any | null>(null);
  const [filmForm, setFilmForm] = useState({ brand: '', brandZh: '', model: '', iso: '', format: '135', filmType: 'COLOR_NEGATIVE', process: 'C-41', brandLogo: '' });
  const [filmSaveStatus, setFilmSaveStatus] = useState({ type: '', message: '' });
   const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [includeContentBackup, setIncludeContentBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setFilmSaveStatus({ type: 'error', message: adminLang === 'zh-CN' ? '品牌、型号、感光度为必填项' : 'Brand, model and ISO are required' });
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
      console.error('Save film stock error:', err);
      setFilmSaveStatus({ type: 'error', message: err.message || at('updateFailed') });
    }
  };

  const handleDeleteFilmStock = (id: string, name: string) => {
    setConfirmModal({
      show: true,
      title: at('deleteFilmStock'),
      message: at('confirmDelete').replace('{name}', name),
      onConfirm: async () => {
        try {
          const res = await del(`/admin/film-stocks/${id}`, undefined, { headers: { Authorization: `Bearer ${token}` } });
          if (res.success) fetchFilmStocks();
        } catch (e) {
          console.error('delete film stock failed', e);
        }
        setConfirmModal(null);
      }
    });
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
        if (s['api_base_url']) {
          setApiServerUrl(s['api_base_url']);
        }
        // 将图床和 SMTP 配置回填到对应表单（密文不展示）
        setImgBed({
          storage_type:      s['storage_type']      || 'img_bed',
          img_bed_url:       s['img_bed_url']       || '',
          img_bed_token:     s['img_bed_token'] ? '••••••••' : '',
          img_bed_path:      s['img_bed_path']      || '/FilmAlbum/',
          img_bed_channel:   s['img_bed_channel']   || 'huggingface',
          img_bed_name_type: s['img_bed_name_type'] || 'index',
          webdav_url:        s['webdav_url']        || '',
          webdav_username:   s['webdav_username']   || '',
          webdav_password:   s['webdav_password'] ? '••••••••' : '',
          webdav_path:       s['webdav_path']       || '/FilmAlbum/',
          // 回填各类型策略
          avatar_path:     s['avatar_path']     || '{userId}/',
          avatar_compress: s['avatar_compress'] || 'true',
          avatar_channel:  s['avatar_channel']  || '',
          roll_path:       s['roll_path']       || '{userId}/photos/{rollId}/',
          roll_compress:   s['roll_compress']   || 'false',
          roll_channel:    s['roll_channel']    || '',
          preview_path:    s['preview_path']    || '{userId}/photos/{rollId}/preview/',
          preview_compress:s['preview_compress']|| 'true',
          preview_channel: s['preview_channel'] || '',
          gear_path:       s['gear_path']       || '{userId}/Gear/',
          gear_compress:   s['gear_compress']   || 'true',
          gear_channel:    s['gear_channel']    || '',
          film_stock_path: s['film_stock_path'] || 'Films/',
          film_stock_compress: s['film_stock_compress'] || 'true',
          film_stock_channel: s['film_stock_channel'] || '',
          post_path:       s['post_path']       || '{userId}/Posts/',
          post_compress:   s['post_compress']   || 'true',
          post_channel:    s['post_channel']    || '',
        });
        setSmtp({
          smtp_from:     s['smtp_from']     || '',
          smtp_password: s['smtp_password'] ? '••••••••' : '',
        });
        if (s['user_levels']) {
          try {
            setUserLevels(JSON.parse(s['user_levels']));
          } catch (e) {
            console.error('Failed to parse user levels', e);
          }
        }
        if (s['roll_formats']) {
          try { setRollFormats(JSON.parse(s['roll_formats'])); } catch (e) {}
        }
        if (s['film_types']) {
          try { setFilmTypes(JSON.parse(s['film_types'])); } catch (e) {}
        }
      }
      if (usersRes.success && usersRes.data) setUsers(usersRes.data.users);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403 || err.message?.includes('401') || err.message?.includes('403')) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const res = await put('/admin/settings', { key, value }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setSystemSettings(prev => ({ ...prev, [key]: value }));
        if (key === 'user_levels') setUserLevels(JSON.parse(value));
        if (key === 'roll_formats') {
          try { setRollFormats(JSON.parse(value)); alert(at('saved')); } catch (e) { alert('JSON Error'); }
        }
        if (key === 'film_types') {
          try { setFilmTypes(JSON.parse(value)); alert(at('saved')); } catch (e) { alert('JSON Error'); }
        }
      } else {
        alert(at('updateFailed'));
      }
    } catch {
      alert(at('updateFailed'));
    }
  };

  const handleSaveUserLevels = (levels: any[]) => {
    handleUpdateSetting('user_levels', JSON.stringify(levels));
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

  // 超级管理员提交更新选定用户的登录密码
  const handleUpdateUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    if (newPasswordVal.trim().length < 6) {
      setPasswordChangeStatus({ type: 'error', message: adminLang === 'zh-CN' ? '密码长度至少 6 位' : 'Password must be at least 6 characters' });
      return;
    }
    
    setPasswordChangeStatus({ type: 'loading', message: at('saving') });
    try {
      const res = await put(`/admin/users/${selectedUserForPassword.id}/password`, { password: newPasswordVal }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setPasswordChangeStatus({ type: 'success', message: adminLang === 'zh-CN' ? '密码已更新' : 'Password updated successfully' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setSelectedUserForPassword(null);
          setNewPasswordVal('');
          setPasswordChangeStatus({ type: '', message: '' });
        }, 1500);
      } else {
        setPasswordChangeStatus({ type: 'error', message: res.error || at('updateFailed') });
      }
    } catch (err: any) {
      setPasswordChangeStatus({ type: 'error', message: err.message || at('updateFailed') });
    }
  };

  // 保存图床配置
  const handleSaveImgBed = async () => {
    const { storage_type, img_bed_url, img_bed_path, img_bed_channel, img_bed_name_type, webdav_url, webdav_username, webdav_path } = imgBed;
    const payload: Record<string, string> = { storage_type };
    if (img_bed_url) payload['img_bed_url'] = img_bed_url;
    if (img_bed_path) payload['img_bed_path'] = img_bed_path;
    if (img_bed_channel) payload['img_bed_channel'] = img_bed_channel;
    if (img_bed_name_type) payload['img_bed_name_type'] = img_bed_name_type;
    
    if (webdav_url) payload['webdav_url'] = webdav_url;
    if (webdav_username) payload['webdav_username'] = webdav_username;
    if (webdav_path) payload['webdav_path'] = webdav_path;
    
    // 包含所有策略字段
    ['avatar', 'roll', 'preview', 'gear', 'film_stock', 'post'].forEach(type => {
      payload[`${type}_path`] = (imgBed as any)[`${type}_path`];
      payload[`${type}_compress`] = String((imgBed as any)[`${type}_compress`]);
      payload[`${type}_channel`] = (imgBed as any)[`${type}_channel`];
    });

    if (imgBed.img_bed_token && imgBed.img_bed_token !== '••••••••') {
      payload['img_bed_token'] = imgBed.img_bed_token;
    }
    if (imgBed.webdav_password && imgBed.webdav_password !== '••••••••') {
      payload['webdav_password'] = imgBed.webdav_password;
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

  const handleBackup = async () => {
    try {
      const response = await get('/admin/system/backup', { includeContent: String(includeContentBackup) }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.success) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `FilmAlbum_Backup_${new Date().toISOString().split('T')[0]}_${includeContentBackup ? 'Full' : 'Config'}.json`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(at('backupSuccess'));
      }
    } catch (err) {
      alert(at('updateFailed'));
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(at('restoreConfirm'))) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = JSON.parse(event.target?.result as string);
        if (!content.tables) {
          alert(at('invalidBackupFile'));
          return;
        }

        const response = await post('/admin/system/restore', content, { headers: { Authorization: `Bearer ${token}` } });
        if (response.success) {
          alert(at('restoreSuccess'));
          window.location.reload();
        } else {
          alert(response.error || at('updateFailed'));
        }
      } catch (err) {
        alert(at('invalidBackupFile'));
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // ── 颜色常量与样式基础 ────────────────────────────────────────────
  const bg = isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#f8f9fa]';
  const text = isDarkMode ? 'text-[#f4f4f5]' : 'text-[#18181b]';
  const cardBg = isDarkMode ? 'bg-[#121212] border-white/5 shadow-2xl shadow-black/50' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50';
  const inputCls = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all duration-300 focus:ring-4 ${
    isDarkMode 
      ? 'bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/10' 
      : 'bg-[#f4f4f5] border-transparent text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:ring-blue-100'
  }`;
  const mutedText = isDarkMode ? 'text-white/40' : 'text-gray-400';
  const dividerCls = isDarkMode ? 'divide-white/5' : 'divide-gray-100';

  // ── 侧边栏 (Sidebar) ───────────────────────────────────────────
  const Sidebar = () => (
    <aside className={`fixed z-50 flex flex-col transition-all duration-300 ${
      isDarkMode ? 'bg-[#121212] border-r border-white/5' : 'bg-white border-r border-gray-100 shadow-sm'
    } md:left-0 md:top-0 md:h-screen md:w-64 border-t md:border-t-0 bottom-0 w-full h-16 md:py-8 md:px-4 px-2`}>
      {/* 桌面端 Logo */}
      <div className="hidden md:flex items-center gap-3 px-4 mb-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h1 className="font-black tracking-wider text-sm uppercase">{at('title')}</h1>
          <p className={`text-[10px] font-medium tracking-widest uppercase ${mutedText}`}>Workspace</p>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex md:flex-col items-center md:items-stretch justify-around md:justify-start h-full md:h-auto gap-0.5 md:gap-2 w-full md:w-auto">
        {[
          { id: 'system',     icon: Settings2, label: at('tabSystem') },
          { id: 'users',      icon: Users,     label: at('tabUsers') },
          { id: 'filmstocks', icon: Film,       label: at('tabFilmStocks') },
          { id: 'imgbed',     icon: ImageUp,    label: at('tabImgBed') },
          { id: 'maintenance', icon: RefreshCw, label: at('maintenance') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 px-1 md:px-4 py-1.5 md:py-3.5 rounded-xl md:rounded-2xl text-[9px] md:text-sm font-bold transition-all duration-300 flex-1 md:flex-initial min-w-0 ${
              activeTab === tab.id
                ? (isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600')
                : (isDarkMode ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50')
            }`}
          >
            <tab.icon className={`w-4 h-4 md:w-[18px] md:h-[18px] shrink-0 ${activeTab === tab.id ? "scale-110 transition-transform" : "transition-transform"}`} />
            <span className="truncate max-w-full">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* 底部操作区 (桌面端显示) */}
      <div className="hidden md:flex flex-col gap-3 mt-auto pt-6 border-t border-inherit">
        <div className="flex gap-3">
          <button onClick={toggleLanguage} className={`flex-1 flex justify-center items-center h-12 rounded-2xl transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`} title="Toggle Language">
            <Languages size={18} />
          </button>
          <button onClick={toggleTheme} className={`flex-1 flex justify-center items-center h-12 rounded-2xl transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-400' : 'bg-gray-50 hover:bg-gray-100 text-blue-600'}`} title="Toggle Theme">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        {token && (
          <button onClick={handleLogout} className="flex items-center justify-center gap-2 h-12 rounded-2xl text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <LogOut size={16} />
            {at('logout')}
          </button>
        )}
      </div>
    </aside>
  );

  // ── 移动端头部 (Mobile Header) ─────────────────────────────────
  const MobileHeader = () => (
    <header className={`md:hidden flex items-center justify-between px-4 h-14 sticky top-0 z-40 backdrop-blur-xl border-b ${isDarkMode ? 'bg-[#0a0a0a]/80 border-white/5' : 'bg-[#f8f9fa]/80 border-gray-100'}`}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center text-white">
          <ShieldAlert size={12} />
        </div>
        <span className="font-bold text-xs uppercase tracking-widest">{at('title')}</span>
      </div>
      <div className="flex gap-1">
        <button onClick={toggleLanguage} className="p-2 opacity-70 hover:opacity-100"><Languages size={16} /></button>
        <button onClick={toggleTheme} className={`p-2 ${isDarkMode ? 'text-amber-400' : 'text-blue-600'}`}>{isDarkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
        {token && <button onClick={handleLogout} className="p-2 text-red-500"><LogOut size={16} /></button>}
      </div>
    </header>
  );

  // ── 登录页 ────────────────────────────────────────────────
  if (!token) {
    return (
      <div className={`min-h-screen ${bg} ${text} transition-colors duration-500 relative flex items-center justify-center overflow-hidden`}>
        {/* Decorative Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 animate-pulse ${isDarkMode ? 'bg-blue-600/30' : 'bg-blue-300/40'}`} style={{ animationDuration: '8s' }} />
          <div className={`absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 animate-pulse ${isDarkMode ? 'bg-indigo-600/30' : 'bg-indigo-300/40'}`} style={{ animationDuration: '10s' }} />
        </div>
        
        <div className="absolute top-6 right-6 flex gap-3 z-10">
           <button onClick={() => setIsConfigOpen(!isConfigOpen)} className={`p-3 rounded-2xl backdrop-blur-md transition-all hover:scale-110 ${isConfigOpen ? 'text-blue-500 rotate-90' : ''} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white/50 hover:bg-white shadow-sm'}`} title="API 配置"><Settings2 size={18} /></button>
           <button onClick={toggleLanguage} className={`p-3 rounded-2xl backdrop-blur-md transition-all hover:scale-110 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white/50 hover:bg-white shadow-sm'}`}><Languages size={18} /></button>
           <button onClick={toggleTheme} className={`p-3 rounded-2xl backdrop-blur-md transition-all hover:scale-110 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-400' : 'bg-white/50 hover:bg-white shadow-sm text-blue-600'}`}>{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>

        <div className="w-full max-w-sm px-4 relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-10">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-[28px] mb-6 shadow-2xl rotate-3 ${
              isDarkMode ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/5 shadow-blue-500/20 border border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-indigo-50 shadow-blue-500/10 border border-white'
            }`}>
              <ShieldAlert size={36} className="text-blue-500 -rotate-3" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">{at('loginTitle')}</h1>
            <p className={`text-sm mt-2 font-medium tracking-wide uppercase ${mutedText}`}>Film Album Workspace</p>
          </div>

          <div className={`rounded-[32px] border p-8 backdrop-blur-2xl ${cardBg}`}>
            {isConfigOpen && (
              <div className="mb-6 p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant/10 space-y-4 animate-in slide-in-from-top-4 duration-300">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>
                    API 服务器地址 (API URL)
                  </label>
                  <input
                    type="text"
                    value={apiServerUrl}
                    onChange={(e) => setApiServerUrl(e.target.value)}
                    placeholder="https://api.example.com"
                    className={inputCls}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveApiUrl}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    保存并生效
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestConnection(apiServerUrl)}
                    disabled={isTestingUrl}
                    className={`px-4 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  >
                    {isTestingUrl ? '...' : '测试'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetApiUrl}
                    className="py-2.5 px-3 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-[0.98] rounded-xl text-xs font-bold transition-all"
                  >
                    重置
                  </button>
                </div>
              </div>
            )}

            {loginError && (
              <div className="mb-6 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold animate-in slide-in-from-top-2">
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>
                  {at('adminPassword')}
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} !py-3.5 !px-5 text-base shadow-inner`}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white text-sm font-bold rounded-2xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
              >
                {isLoggingIn ? <RefreshCw size={18} className="animate-spin" /> : null}
                {isLoggingIn ? '...' : at('login')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── 主控制台 ──────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-500 flex`}>
      <Sidebar />

      <div className="flex-1 md:ml-64 pb-32 md:pb-8 min-h-screen flex flex-col relative">
        {/* Decorative Background */}
        <div className="absolute inset-0 pointer-events-none fixed">
          <div className={`absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 ${isDarkMode ? 'bg-blue-600/30' : 'bg-blue-300/40'}`} />
        </div>

        <MobileHeader />

        <main className="flex-1 p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full relative z-10">


          {/* 系统设置 TAB */}
          {activeTab === 'system' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 系统基础设置 */}
                <div className={`rounded-[32px] border ${cardBg} overflow-hidden flex flex-col`}>
                  <div className={`px-5 md:px-8 py-5 md:py-6 border-b ${dividerCls} flex items-center gap-4 ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                      <Settings2 size={24} />
                    </div>
                    <div>
                      <h2 className="font-black text-lg tracking-tight">{at('systemSettings')}</h2>
                      <p className={`text-xs font-medium mt-1 ${mutedText}`}>System Preferences</p>
                    </div>
                  </div>
                  <div className="p-5 md:p-8 space-y-6 md:space-y-8 flex-1">
                    <div className="flex items-center justify-between gap-6 p-4 rounded-2xl bg-black/5 dark:bg-white/5 transition-colors hover:bg-black/10 dark:hover:bg-white/10">
                      <div>
                        <p className="font-bold text-base">{at('openRegistration')}</p>
                        <p className={`text-xs mt-1 ${mutedText}`}>{at('openRegistrationDesc')}</p>
                      </div>
                      <button
                        onClick={() => handleUpdateSetting('open_registration', settings.open_registration === 'true' ? 'false' : 'true')}
                        className={`relative inline-flex h-8 w-14 rounded-full transition-all duration-300 ease-in-out shrink-0 shadow-inner ${
                          settings.open_registration === 'true' ? 'bg-blue-500' : isDarkMode ? 'bg-white/20' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out mt-1 ml-1 ${
                          settings.open_registration === 'true' ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>{at('defaultLanguage')}</label>
                      <select value={settings.default_language} onChange={(e) => handleUpdateSetting('default_language', e.target.value)} className={inputCls}>
                        <option value="zh-CN">简体中文</option>
                        <option value="en-US">English</option>
                      </select>
                    </div>

                    {/* API 服务器地址配置 */}
                    <div className={`pt-6 border-t ${dividerCls}`}>
                      <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>{at('apiSettings') || 'API 服务器配置'}</label>
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={apiServerUrl}
                          onChange={(e) => setApiServerUrl(e.target.value)}
                          placeholder={at('apiBaseUrlPlaceholder') || 'https://api.example.com'}
                          className={inputCls}
                        />
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleSaveApiUrl}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all"
                          >
                            {at('saveApi') || '保存 API 配置'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestConnection(apiServerUrl)}
                            disabled={isTestingUrl}
                            className={`px-4 rounded-2xl text-xs font-bold border transition-all disabled:opacity-50 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                          >
                            {isTestingUrl ? '...' : '测试'}
                          </button>
                          <button
                            type="button"
                            onClick={handleResetApiUrl}
                            className="py-3 px-6 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-[0.98] rounded-2xl text-xs font-bold transition-all"
                          >
                            重置
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SMTP 设置 */}
                <div className={`rounded-[32px] border ${cardBg} overflow-hidden flex flex-col`}>
                  <div className={`px-5 md:px-8 py-5 md:py-6 border-b ${dividerCls} flex items-center gap-4 ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
                    <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h2 className="font-black text-lg tracking-tight">{at('smtpSettings')}</h2>
                      <p className={`text-xs font-medium mt-1 ${mutedText}`}>Email Configuration</p>
                    </div>
                  </div>
                  <div className="p-5 md:p-8 space-y-6 flex-1">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>{at('smtpFrom')}</label>
                      <input type="text" placeholder={at('smtpFromPlaceholder')} value={smtp.smtp_from} onChange={(e) => setSmtp(p => ({ ...p, smtp_from: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>{at('smtpPassword')}</label>
                      <input type="password" placeholder={at('smtpPasswordPlaceholder')} value={smtp.smtp_password} onChange={(e) => setSmtp(p => ({ ...p, smtp_password: e.target.value }))} className={inputCls} />
                    </div>
                    <button onClick={handleSaveSmtp} className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-lg shadow-violet-500/20 transition-all">保存 SMTP 配置</button>
                    
                    <div className={`pt-6 mt-2 border-t ${dividerCls}`}>
                      <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>发送测试邮件</label>
                      <div className="flex gap-3">
                        <input type="email" placeholder="输入测试收件人邮箱" value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} className={`${inputCls} flex-1`} />
                        <button onClick={handleTestEmail} className={`px-6 rounded-2xl text-xs font-bold transition-all border shadow-sm ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>测试</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 胶卷基础设置 */}
              <div className={`rounded-[32px] border ${cardBg} p-5 md:p-8 shadow-sm`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                    <Film size={24} />
                  </div>
                  <div>
                    <h2 className="font-black text-xl tracking-tight">胶卷基础设置</h2>
                    <p className={`text-xs font-medium mt-1 ${mutedText}`}>Roll Formats & Film Types (JSON)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>胶卷规格 (Roll Formats)</label>
                    <textarea
                      value={settings.roll_formats}
                      onChange={(e) => setSystemSettings(p => ({...p, roll_formats: e.target.value}))}
                      className={`${inputCls} font-mono text-xs`}
                      rows={10}
                    />
                    <button onClick={() => handleUpdateSetting('roll_formats', settings.roll_formats)} className="mt-3 w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all">保存规格设置</button>
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>底片类型 (Film Types)</label>
                    <textarea
                      value={settings.film_types}
                      onChange={(e) => setSystemSettings(p => ({...p, film_types: e.target.value}))}
                      className={`${inputCls} font-mono text-xs`}
                      rows={10}
                    />
                    <button onClick={() => handleUpdateSetting('film_types', settings.film_types)} className="mt-3 w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all">保存类型设置</button>
                  </div>
                </div>
              </div>

              {/* 等级设置区域 */}
              <div className={`rounded-[32px] border ${cardBg} p-5 md:p-8 shadow-sm`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h2 className="font-black text-xl tracking-tight">{at('levelSettings')}</h2>
                      <p className={`text-xs font-medium mt-1 ${mutedText}`}>User Roles & Permissions</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newLevel = { value: `lv${userLevels.length + 1}`, label: `LV${userLevels.length + 1}`, description: '', roll_limit: 10, gear_limit: 5, can_post: true, can_comment: true };
                      handleSaveUserLevels([...userLevels, newLevel]);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                  >
                    <Plus size={18} />
                    {at('addLevel')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userLevels.map((level, idx) => (
                    <div key={level.value} className={`p-5 md:p-6 rounded-[24px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5 hover:border-blue-500/30' : 'bg-gray-50/50 border-gray-100 hover:border-blue-300'} transition-all duration-300 group relative flex flex-col`}>
                      <button 
                        onClick={() => {
                          const next = [...userLevels];
                          next.splice(idx, 1);
                          handleSaveUserLevels(next);
                        }}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 hover:scale-110 active:scale-95"
                        title={at('deleteLevel')}
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="flex gap-4 mb-5">
                        <div className="flex-1">
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-50`}>{at('levelName')}</label>
                          <input 
                            value={level.label} 
                            onChange={(e) => {
                              const next = [...userLevels];
                              next[idx].label = e.target.value;
                              setUserLevels(next);
                            }}
                            onBlur={() => handleSaveUserLevels(userLevels)}
                            className={`${inputCls} !py-2 !px-3 !bg-transparent border-none text-lg font-black focus:ring-0 px-0 -ml-3`} 
                          />
                        </div>
                        <div className="w-24">
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-50`}>{at('levelValue')}</label>
                          <input 
                            value={level.value} 
                            onChange={(e) => {
                              const next = [...userLevels];
                              next[idx].value = e.target.value;
                              setUserLevels(next);
                            }}
                            onBlur={() => handleSaveUserLevels(userLevels)}
                            className={`${inputCls} !py-2 !px-3 font-mono text-blue-500 font-bold bg-blue-500/5`} 
                          />
                        </div>
                      </div>

                      <div className="mb-6">
                        <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-50`}>{at('levelDesc')}</label>
                        <input 
                          value={level.description} 
                          onChange={(e) => {
                            const next = [...userLevels];
                            next[idx].description = e.target.value;
                            setUserLevels(next);
                          }}
                          onBlur={() => handleSaveUserLevels(userLevels)}
                          className={inputCls} 
                          placeholder="e.g. Standard Member"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6 mt-auto">
                        <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50`}>{at('rollLimit')}</label>
                          <input 
                            type="number"
                            value={level.roll_limit} 
                            onChange={(e) => {
                              const next = [...userLevels];
                              next[idx].roll_limit = parseInt(e.target.value) || 0;
                              setUserLevels(next);
                            }}
                            onBlur={() => handleSaveUserLevels(userLevels)}
                            className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0 outline-none" 
                          />
                        </div>
                        <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50`}>{at('gearLimit')}</label>
                          <input 
                            type="number"
                            value={level.gear_limit} 
                            onChange={(e) => {
                              const next = [...userLevels];
                              next[idx].gear_limit = parseInt(e.target.value) || 0;
                              setUserLevels(next);
                            }}
                            onBlur={() => handleSaveUserLevels(userLevels)}
                            className="w-full bg-transparent border-none p-0 font-bold text-lg focus:ring-0 outline-none" 
                          />
                        </div>
                      </div>

                      <div className={`flex flex-col gap-3 pt-5 border-t ${dividerCls}`}>
                        <label className="flex items-center justify-between cursor-pointer group/toggle">
                          <span className="text-xs font-bold">{at('canPost')}</span>
                          <div className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${level.can_post ? 'bg-emerald-500' : isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform mt-1 ml-1 ${level.can_post ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                          <input 
                            type="checkbox" 
                            checked={level.can_post} 
                            onChange={(e) => {
                              const next = [...userLevels];
                              next[idx].can_post = e.target.checked;
                              handleSaveUserLevels(next);
                            }}
                            className="sr-only"
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer group/toggle">
                          <span className="text-xs font-bold">{at('canComment')}</span>
                          <div className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${level.can_comment ? 'bg-emerald-500' : isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform mt-1 ml-1 ${level.can_comment ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                          <input 
                            type="checkbox" 
                            checked={level.can_comment} 
                            onChange={(e) => {
                              const next = [...userLevels];
                              next[idx].can_comment = e.target.checked;
                              handleSaveUserLevels(next);
                            }}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 用户管理 TAB */}
          {activeTab === 'users' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              {/* 美化后的统计卡片 & 操作栏 */}
              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className={`flex-1 p-6 rounded-[32px] border ${isDarkMode ? 'bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-white border-blue-100'} relative overflow-hidden group shadow-sm`}>
                  <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-300/40'}`}></div>
                  <div className="relative flex items-center gap-6">
                    <div className={`p-5 rounded-[24px] shadow-inner ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white text-blue-600 shadow-blue-100/50'}`}>
                      <Users size={32} />
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-blue-400/80' : 'text-blue-600/80'}`}>{at('totalUsers')}</p>
                      <p className={`text-4xl font-black font-mono tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.users}</p>
                    </div>
                  </div>
                </div>

                <div className={`flex-1 p-6 rounded-[32px] border ${isDarkMode ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100'} relative overflow-hidden group shadow-sm`}>
                  <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-300/40'}`}></div>
                  <div className="relative flex items-center gap-6">
                    <div className={`p-5 rounded-[24px] shadow-inner ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white text-emerald-600 shadow-emerald-100/50'}`}>
                      <Film size={32} />
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>{at('totalRolls')}</p>
                      <p className={`text-4xl font-black font-mono tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.rolls}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end md:w-32">
                  <button
                    onClick={fetchDashboardData}
                    disabled={isLoading}
                    className={`w-full h-full min-h-[110px] flex flex-col items-center justify-center gap-3 rounded-[32px] border transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm group ${
                      isDarkMode 
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white' 
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <RefreshCw size={24} className={`${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{at('refresh')}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                  <div className={`rounded-[32px] border ${cardBg} p-5 md:p-8 space-y-6 flex flex-col h-full`}>
                    <div>
                      <h2 className="font-black text-lg tracking-tight text-blue-500">{at('createUser')}</h2>
                      <p className={`text-xs font-medium mt-1 ${mutedText}`}>Add new member</p>
                    </div>
                    <form onSubmit={handleCreateUser} className="space-y-4 flex-1 flex flex-col">
                      <input type="email" required placeholder={at('email')} value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className={inputCls} />
                      <input type="password" required placeholder={at('password')} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className={inputCls} />
                      <input type="text" required placeholder={at('nickname')} value={newUser.nickname} onChange={(e) => setNewUser({...newUser, nickname: e.target.value})} className={inputCls} />
                      <select value={newUser.level} onChange={(e) => setNewUser({...newUser, level: e.target.value})} className={inputCls}>
                        {userLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                      <button type="submit" className="w-full py-3.5 mt-auto bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">{at('create')}</button>
                    </form>
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <div className={`rounded-[32px] border ${cardBg} overflow-hidden`}>
                    {/* 桌面端用户列表表格 */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className={isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50/50'}>
                          <tr className={`border-b ${dividerCls}`}>
                            <th className={`px-8 py-5 text-[10px] uppercase font-bold tracking-widest ${mutedText}`}>{at('id')}</th>
                            <th className={`px-8 py-5 text-[10px] uppercase font-bold tracking-widest ${mutedText}`}>{at('user')}</th>
                            <th className={`px-8 py-5 text-[10px] uppercase font-bold tracking-widest ${mutedText}`}>{at('level')}</th>
                            <th className={`px-8 py-5 text-[10px] uppercase font-bold tracking-widest ${mutedText}`}>{at('albums')}</th>
                            <th className={`px-8 py-5 text-[10px] uppercase font-bold tracking-widest ${mutedText}`}>{at('joined')}</th>
                            <th className={`px-8 py-5 text-[10px] uppercase font-bold tracking-widest ${mutedText}`}>{adminLang === 'zh-CN' ? '操作' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className={dividerCls + " divide-y"}>
                          {users.map(user => (
                            <tr key={user.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'}`}>
                              <td className="px-8 py-5 font-mono text-xs opacity-50">#{String(user.id).padStart(4, '0')}</td>
                              <td className="px-8 py-5">
                                <div className="font-bold">{user.nickname}</div>
                                <div className="text-xs opacity-50">{user.email}</div>
                              </td>
                              <td className="px-8 py-5">
                                <select value={user.level} onChange={(e) => handleUpdateUserLevel(String(user.id), e.target.value)} className="bg-transparent border-none text-xs font-bold text-blue-500 outline-none cursor-pointer focus:ring-0 p-0">
                                  {userLevels.map(l => <option key={l.value} value={l.value} className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>{l.label}</option>)}
                                </select>
                              </td>
                              <td className="px-8 py-5">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  user.rollCount > 0 
                                    ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') 
                                    : (isDarkMode ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400')
                                }`}>
                                  {user.rollCount || 0}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-xs opacity-50 font-medium">{new Date(user.createdAt).toLocaleDateString()}</td>
                              <td className="px-8 py-5">
                                <button 
                                  onClick={() => {
                                    setSelectedUserForPassword(user);
                                    setNewPasswordVal('');
                                    setShowPasswordModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl text-xs font-bold transition-all active:scale-95"
                                >
                                  <Pencil size={12} />
                                  {adminLang === 'zh-CN' ? '修改密码' : 'Password'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 移动端用户列表卡片组 */}
                    <div className="block md:hidden divide-y divide-inherit">
                      {users.map(user => (
                        <div key={user.id} className="p-5 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs opacity-50">#{String(user.id).padStart(4, '0')}</span>
                              <span className="font-bold text-sm">{user.nickname}</span>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              user.rollCount > 0 
                                ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') 
                                : (isDarkMode ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400')
                            }`}>
                              {user.rollCount || 0} {adminLang === 'zh-CN' ? '影集' : 'Albums'}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className={mutedText}>{adminLang === 'zh-CN' ? '账号/邮箱' : 'Email'}</span>
                              <span className="opacity-80 font-medium truncate max-w-[200px]">{user.email}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={mutedText}>{adminLang === 'zh-CN' ? '用户等级' : 'User Level'}</span>
                              <select value={user.level} onChange={(e) => handleUpdateUserLevel(String(user.id), e.target.value)} className="bg-transparent border-none text-xs font-bold text-blue-500 outline-none cursor-pointer focus:ring-0 p-0 text-right">
                                {userLevels.map(l => <option key={l.value} value={l.value} className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>{l.label}</option>)}
                              </select>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={mutedText}>{adminLang === 'zh-CN' ? '注册时间' : 'Joined Date'}</span>
                              <span className="opacity-50">{new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-dashed border-inherit flex justify-end">
                            <button 
                              onClick={() => {
                                setSelectedUserForPassword(user);
                                setNewPasswordVal('');
                                setShowPasswordModal(true);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl text-xs font-bold transition-all active:scale-95"
                            >
                              <Pencil size={12} />
                              {adminLang === 'zh-CN' ? '修改用户密码' : 'Change Password'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 系统维护 (Maintenance) ───────────────────────────────── */}
          {activeTab === 'maintenance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 rounded-[24px] bg-indigo-500 shadow-lg shadow-indigo-500/20 text-white">
                  <RefreshCw size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight">{at('backupAndRestore')}</h1>
                  <p className={`text-sm font-medium mt-1 ${mutedText}`}>System Maintenance & Data Protection</p>
                </div>
              </div>

              <div className={`rounded-[32px] border ${cardBg} p-5 md:p-8 shadow-sm`}>
                <div className="flex flex-col gap-6">
                  <div className={`p-5 md:p-8 rounded-[24px] ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-100'} border`}>
                    <div className="flex items-start gap-4 mb-8">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                        <ShieldAlert size={20} />
                      </div>
                      <p className="text-sm leading-relaxed opacity-70">
                        {at('backupDesc')}
                      </p>
                    </div>
                    
                    <div className="mt-8 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <label className="flex items-center gap-4 cursor-pointer group">
                          <div 
                            className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                              includeContentBackup 
                                ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/20' 
                                : 'border-current opacity-30 group-hover:opacity-60'
                            }`}
                            onClick={() => setIncludeContentBackup(!includeContentBackup)}
                          >
                            {includeContentBackup && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                          </div>
                          <span className="text-base font-bold">{at('includeContent')}</span>
                        </label>
                        
                        <div className="flex gap-4 w-full md:w-auto">
                          <button 
                            onClick={handleBackup} 
                            className="flex-1 md:flex-none px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            {at('backupNow')}
                          </button>
                          <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className={`flex-1 md:flex-none px-10 py-4 border rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                              isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {at('restoreData')}
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json" 
                            onChange={handleRestore} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 胶卷管理 TAB */}
          {activeTab === 'filmstocks' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              {/* 筛选栏 + 操作按钮 */}
              <div className={`rounded-[32px] border ${cardBg} p-6 shadow-sm`}>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className={`flex items-center gap-3 flex-1 px-5 py-3 rounded-2xl border transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-[#242424] border-white/10 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10' 
                      : 'bg-[#f4f4f5] border-transparent focus-within:bg-white focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100'
                  }`}>
                    <Search size={18} className={mutedText} />
                    <input
                      type="text"
                      placeholder={at('filterSearch')}
                      value={filmFilter.search}
                      onChange={e => handleFilmFilter({ ...filmFilter, search: e.target.value })}
                      className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
                    />
                    {filmFilter.search && (
                      <button 
                        onClick={() => handleFilmFilter({ ...filmFilter, search: '' })} 
                        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <X size={14} className="opacity-40" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                      value={filmFilter.format}
                      onChange={e => handleFilmFilter({ ...filmFilter, format: e.target.value })}
                      className={`${inputCls} !w-full md:!w-40 !rounded-2xl !py-3 !px-4 cursor-pointer`}
                    >
                      <option value="">{at('filterAll')} {at('filmFormat')}</option>
                      {rollFormats.map(r => <option key={r.format} value={r.format}>{r.label}</option>)}
                    </select>
                    
                    <select
                      value={filmFilter.filmType}
                      onChange={e => handleFilmFilter({ ...filmFilter, filmType: e.target.value })}
                      className={`${inputCls} !w-full md:!w-48 !rounded-2xl !py-3 !px-4 cursor-pointer`}
                    >
                      <option value="">{at('filterAll')} {at('filmType')}</option>
                      {filmTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    {(filmFilter.search || filmFilter.format || filmFilter.filmType) && (
                      <button
                        onClick={() => handleFilmFilter({ search: '', format: '', filmType: '' })}
                        className={`flex items-center justify-center min-w-[48px] h-[46px] rounded-2xl border transition-all ${
                          isDarkMode 
                            ? 'border-white/10 hover:bg-white/5 text-white/70 hover:text-white' 
                            : 'border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                        }`}
                        title={at('resetFilter')}
                      >
                        <RefreshCw size={18} className="rotate-90" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setEditingFilm(null);
                      setFilmForm({ brand: '', brandZh: '', model: '', iso: '', format: '135', filmType: 'COLOR_NEGATIVE', process: 'C-41', brandLogo: '' });
                      setFilmSaveStatus({ type: '', message: '' });
                      setShowFilmModal(true);
                    }}
                    className="flex items-center justify-center gap-2 h-[46px] px-6 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white text-sm font-bold rounded-2xl transition-all whitespace-nowrap shadow-lg shadow-violet-500/20 w-full md:w-auto"
                  >
                    <Plus size={18} />
                    {at('addFilmStock')}
                  </button>
                </div>
              </div>

              {/* 胶卷卡片列表 */}
              {filmStocksLoading ? (
                <div className="flex justify-center items-center py-32">
                  <RefreshCw size={32} className="animate-spin text-blue-500" />
                </div>
              ) : filmStocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6">
                  <div className="p-6 rounded-full bg-black/5 dark:bg-white/5">
                    <Film size={48} className="opacity-20" />
                  </div>
                  <p className={`text-sm font-medium ${mutedText}`}>{at('noFilmStocks')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filmStocks.map(stock => {
                    const typeLabel = FILM_TYPE_LABELS[adminLang][stock.filmType] || stock.filmType;
                    const typeColor: Record<string, string> = {
                      COLOR_NEGATIVE: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
                      BW_NEGATIVE:    'text-gray-500 bg-gray-500/10 border-gray-500/20',
                      COLOR_POSITIVE: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
                      BW_POSITIVE:    'text-blue-500 bg-blue-500/10 border-blue-500/20',
                    };
                    const is120 = stock.format === '120';
                    const chipColor = typeColor[stock.filmType] || 'text-gray-500 bg-gray-500/10 border-gray-500/20';
                    const logoUrl = stock.brandLogo;

                    return (
                      <div
                        key={stock.id}
                        className={`group relative rounded-[24px] border ${cardBg} p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                          is120 
                            ? (isDarkMode ? 'border-amber-500/20 hover:border-amber-500/50 bg-gradient-to-br from-amber-500/[0.03] to-transparent shadow-amber-500/10' : 'border-amber-200 hover:border-amber-400 bg-gradient-to-br from-amber-50/50 to-white shadow-amber-500/10')
                            : (isDarkMode ? 'border-blue-500/20 hover:border-blue-500/50 bg-gradient-to-br from-blue-500/[0.03] to-transparent shadow-blue-500/10' : 'border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50/50 to-white shadow-blue-500/10')
                        }`}
                      >
                        {/* 规格角标 */}
                        <div className={`absolute -right-2 -top-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg z-10 ${
                          is120 ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                        }`}>
                          {stock.format}
                        </div>

                        {/* 品牌区域 */}
                        <div className="flex items-center gap-4">
                          {logoUrl ? (
                            <img src={logoUrl} alt={stock.brand} className="w-12 h-12 object-contain rounded-xl bg-white/5 p-1 border border-white/5" />
                          ) : (
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shadow-inner ${isDarkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                              {stock.brand.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 truncate">
                              {stock.brand} {stock.brandZh && <span className="ml-1 opacity-70">/ {stock.brandZh}</span>}
                            </p>
                            <p className="font-black text-lg leading-tight truncate">{stock.model}</p>
                          </div>
                        </div>

                        {/* 信息 chips */}
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${chipColor}`}>
                            {typeLabel}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${isDarkMode ? 'border-white/10 text-white/60 bg-white/5' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
                            ISO {stock.iso}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            is120 ? 'text-amber-600 bg-amber-500/10 border-amber-500/20' : 'text-blue-600 bg-blue-500/10 border-blue-500/20'
                          }`}>
                            {stock.format}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${isDarkMode ? 'border-white/10 text-white/60 bg-white/5' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
                            {stock.process}
                          </span>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-3 mt-auto pt-5 border-t border-inherit transition-all duration-300">
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
                            className={`flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl font-bold transition-all ${
                              isDarkMode 
                                ? 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white' 
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <Pencil size={14} />
                            {at('editFilmStock')}
                          </button>
                          <button
                            onClick={() => handleDeleteFilmStock(stock.id, `${stock.brand} ${stock.model}`)}
                            className={`flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl font-bold transition-all ${
                              isDarkMode
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                                : 'bg-red-50 hover:bg-red-100 text-red-600'
                            }`}
                          >
                            <Trash2 size={14} />
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
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowFilmModal(false)}>
                  <div className={`rounded-[32px] border ${cardBg} p-8 w-full max-w-lg shadow-2xl scale-in-center animate-in zoom-in-95 duration-300`} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="font-black text-xl tracking-tight">{editingFilm ? at('editFilmStock') : at('addFilmStock')}</h2>
                      <button onClick={() => setShowFilmModal(false)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-60`}>{at('filmBrand')}</label>
                          <input
                            type="text"
                            value={filmForm.brand}
                            onChange={e => setFilmForm(p => ({ ...p, brand: e.target.value }))}
                            className={inputCls}
                            placeholder="e.g.: Kodak"
                          />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-60`}>{at('filmBrandZh')}</label>
                          <input
                            type="text"
                            value={filmForm.brandZh}
                            onChange={e => setFilmForm(p => ({ ...p, brandZh: e.target.value }))}
                            className={inputCls}
                            placeholder="e.g.: 柯达"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-5">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-60`}>{at('filmModel')}</label>
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
                        <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-60`}>{at('filmBrandLogo')}</label>
                        <input
                          type="url"
                          value={filmForm.brandLogo}
                          onChange={e => setFilmForm(p => ({ ...p, brandLogo: e.target.value }))}
                          className={inputCls}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-60`}>{at('filmIso')}</label>
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
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-60`}>{at('filmFormat')}</label>
                          <select value={filmForm.format} onChange={e => setFilmForm(p => ({ ...p, format: e.target.value }))} className={inputCls}>
                            {rollFormats.map(r => (
                              <option key={r.format} value={r.format}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-60`}>{at('filmType')}</label>
                          <select value={filmForm.filmType} onChange={e => setFilmForm(p => ({ ...p, filmType: e.target.value }))} className={inputCls}>
                            {filmTypes.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 opacity-60`}>{at('filmProcess')}</label>
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
                        <div className={`p-4 rounded-2xl text-sm font-bold ${filmSaveStatus.type === 'error' ? 'bg-red-500/10 text-red-500' : filmSaveStatus.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {filmSaveStatus.message}
                        </div>
                      )}

                      <div className="flex gap-4 pt-4 mt-8 border-t border-inherit">
                        <button
                          onClick={() => setShowFilmModal(false)}
                          className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all border ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`}
                        >
                          {adminLang === 'zh-CN' ? '取消' : 'Cancel'}
                        </button>
                        <button
                          onClick={handleSaveFilmStock}
                          disabled={filmSaveStatus.type === 'loading'}
                          className="flex-1 py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                        >
                          {filmSaveStatus.type === 'loading' ? at('saving') : (editingFilm ? (adminLang === 'zh-CN' ? '保存修改' : 'Save') : (adminLang === 'zh-CN' ? '添加胶卷' : 'Add'))}
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
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className={`rounded-[32px] border ${cardBg} p-5 md:p-8 space-y-10`}>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 mb-6 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10">
                      <ImageUp size={20} />
                    </div>
                    基础配置 / Basic Setup
                  </h3>
                  
                  <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <label className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${imgBed.storage_type === 'img_bed' ? 'border-amber-500 bg-amber-500/5' : (isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')}`}>
                      <input type="radio" name="storageType" value="img_bed" checked={imgBed.storage_type === 'img_bed'} onChange={(e) => setImgBed(p => ({ ...p, storage_type: e.target.value }))} className="hidden" />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${imgBed.storage_type === 'img_bed' ? 'border-amber-500' : 'border-gray-400'}`}>
                        {imgBed.storage_type === 'img_bed' && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                      </div>
                      <span className="font-bold text-sm">图床接口 (Image Hosting API)</span>
                    </label>
                    <label className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${imgBed.storage_type === 'webdav' ? 'border-blue-500 bg-blue-500/5' : (isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')}`}>
                      <input type="radio" name="storageType" value="webdav" checked={imgBed.storage_type === 'webdav'} onChange={(e) => setImgBed(p => ({ ...p, storage_type: e.target.value }))} className="hidden" />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${imgBed.storage_type === 'webdav' ? 'border-blue-500' : 'border-gray-400'}`}>
                        {imgBed.storage_type === 'webdav' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                      </div>
                      <span className="font-bold text-sm">WebDAV 存储 (自建 NAS 等)</span>
                    </label>
                  </div>

                  {imgBed.storage_type === 'img_bed' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase mb-2 ml-1 opacity-50">{at('imgBedUrl')}</label>
                        <input type="url" value={imgBed.img_bed_url} onChange={(e) => setImgBed(p => ({ ...p, img_bed_url: e.target.value }))} className={inputCls} placeholder="https://img.example.com" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-2 ml-1 opacity-50">{at('imgBedToken')}</label>
                        <input type="password" value={imgBed.img_bed_token} onChange={(e) => setImgBed(p => ({ ...p, img_bed_token: e.target.value }))} className={inputCls} placeholder="••••••••••••••••" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-2 ml-1 opacity-50">{at('imgBedChannel')}</label>
                        <select value={imgBed.img_bed_channel} onChange={(e) => setImgBed(p => ({ ...p, img_bed_channel: e.target.value }))} className={inputCls}>
                          <option value="telegram">Telegram (大文件)</option>
                          <option value="cfr2">CloudFlare R2 (大文件，私密)</option>
                          <option value="s3">S3 (大文件，私密，收费)</option>
                          <option value="discord">Discord (大文件分片存储)</option>
                          <option value="huggingface">HuggingFace (大文件直传)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {imgBed.storage_type === 'webdav' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase mb-2 ml-1 opacity-50">WebDAV URL</label>
                        <input type="url" value={imgBed.webdav_url} onChange={(e) => setImgBed(p => ({ ...p, webdav_url: e.target.value }))} className={inputCls} placeholder="https://nas.example.com:5006" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-2 ml-1 opacity-50">WebDAV 用户名 (Username)</label>
                        <input type="text" value={imgBed.webdav_username} onChange={(e) => setImgBed(p => ({ ...p, webdav_username: e.target.value }))} className={inputCls} placeholder="admin" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-2 ml-1 opacity-50">WebDAV 密码 (Password)</label>
                        <input type="password" value={imgBed.webdav_password} onChange={(e) => setImgBed(p => ({ ...p, webdav_password: e.target.value }))} className={inputCls} placeholder="••••••••••••••••" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase mb-2 ml-1 opacity-50">基础路径 (Base Path)</label>
                        <input type="text" value={imgBed.webdav_path} onChange={(e) => setImgBed(p => ({ ...p, webdav_path: e.target.value }))} className={inputCls} placeholder="/FilmAlbum/" />
                      </div>
                    </div>
                  )}
                </div>

                <div className={`pt-10 border-t ${dividerCls}`}>
                  <h3 className="text-sm font-black text-amber-500 mb-6 uppercase tracking-widest flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10">
                      <Settings2 size={20} />
                    </div>
                    上传策略 / Upload Strategies
                  </h3>
                  {/* 桌面端上传策略表格 */}
                  <div className={`hidden md:block overflow-hidden border rounded-[24px] ${isDarkMode ? 'border-white/5 bg-[#1a1a1a]/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className={isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-100/50'}>
                        <tr className={`border-b ${dividerCls}`}>
                          <th className={`px-6 py-4 font-bold uppercase tracking-widest text-[10px] ${mutedText}`}>{at('user')}</th>
                          <th className={`px-6 py-4 font-bold uppercase tracking-widest text-[10px] ${mutedText}`}>路径模板 (Path)</th>
                          <th className={`px-6 py-4 font-bold uppercase tracking-widest text-[10px] ${mutedText}`}>渠道 (Channel)</th>
                          <th className={`px-6 py-4 font-bold uppercase tracking-widest text-[10px] ${mutedText} text-center`}>压缩</th>
                        </tr>
                      </thead>
                      <tbody className={dividerCls + " divide-y"}>
                        {[
                          { key: 'avatar', label: '用户头像' },
                          { key: 'roll', label: '影集原图' },
                          { key: 'preview', label: '影集预览' },
                          { key: 'gear', label: '设备图像' },
                          { key: 'film_stock', label: '胶卷型号' },
                          { key: 'post', label: at('strategyPost') },
                        ].map((item) => (
                          <tr key={item.key} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-white'}`}>
                            <td className="px-6 py-4 font-bold text-xs">{item.label}</td>
                            <td className="px-6 py-4">
                              <input type="text" value={(imgBed as any)[`${item.key}_path`]} onChange={(e) => setImgBed(p => ({ ...p, [`${item.key}_path`]: e.target.value }))} className={`w-full bg-transparent border-none p-2 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500/30 ${isDarkMode ? 'focus:bg-white/5' : 'focus:bg-gray-100'}`} />
                            </td>
                            <td className="px-6 py-4">
                              <select value={(imgBed as any)[`${item.key}_channel`]} onChange={(e) => setImgBed(p => ({ ...p, [`${item.key}_channel`]: e.target.value }))} className={`w-full bg-transparent border-none p-2 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/30 cursor-pointer ${isDarkMode ? 'focus:bg-white/5' : 'focus:bg-gray-100'}`}>
                                <option value="" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>跟随全局</option>
                                <option value="telegram" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>Telegram</option>
                                <option value="cfr2" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>CloudFlare R2</option>
                                <option value="s3" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>S3</option>
                                <option value="discord" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>Discord</option>
                                <option value="huggingface" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>HuggingFace</option>
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => setImgBed(p => ({ ...p, [`${item.key}_compress`]: (imgBed as any)[`${item.key}_compress`] === 'true' ? 'false' : 'true' }))}
                                  className={`relative inline-flex h-6 w-11 rounded-full transition-all duration-300 ease-in-out shadow-inner ${
                                    (imgBed as any)[`${item.key}_compress`] === 'true' ? 'bg-amber-500' : isDarkMode ? 'bg-white/20' : 'bg-gray-300'
                                  }`}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out mt-1 ml-1 ${
                                    (imgBed as any)[`${item.key}_compress`] === 'true' ? 'translate-x-5' : 'translate-x-0'
                                  }`} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 移动端上传策略卡片组 */}
                  <div className="block md:hidden space-y-4">
                    {[
                      { key: 'avatar', label: '用户头像' },
                      { key: 'roll', label: '影集原图' },
                      { key: 'preview', label: '影集预览' },
                      { key: 'gear', label: '设备图像' },
                      { key: 'film_stock', label: '胶卷型号' },
                      { key: 'post', label: at('strategyPost') },
                    ].map((item) => (
                      <div key={item.key} className={`p-5 rounded-2xl border ${isDarkMode ? 'border-white/5 bg-[#1a1a1a]/50' : 'border-gray-100 bg-gray-50/50'} flex flex-col gap-4`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-amber-500">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] opacity-60">{adminLang === 'zh-CN' ? '启用压缩' : 'Compress'}</span>
                            <button
                              onClick={(e) => setImgBed(p => ({ ...p, [`${item.key}_compress`]: (imgBed as any)[`${item.key}_compress`] === 'true' ? 'false' : 'true' }))}
                              className={`relative inline-flex h-6 w-11 rounded-full transition-all duration-300 ease-in-out shadow-inner ${
                                (imgBed as any)[`${item.key}_compress`] === 'true' ? 'bg-amber-500' : isDarkMode ? 'bg-white/20' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out mt-1 ml-1 ${
                                (imgBed as any)[`${item.key}_compress`] === 'true' ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1.5 opacity-50">路径模板 (Path Template)</label>
                            <input
                              type="text"
                              value={(imgBed as any)[`${item.key}_path`]}
                              onChange={(e) => setImgBed(p => ({ ...p, [`${item.key}_path`]: e.target.value }))}
                              className={inputCls}
                              placeholder="{userId}/"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1.5 opacity-50">独立存储渠道 (Channel)</label>
                            <select
                              value={(imgBed as any)[`${item.key}_channel`]}
                              onChange={(e) => setImgBed(p => ({ ...p, [`${item.key}_channel`]: e.target.value }))}
                              className={inputCls}
                            >
                              <option value="" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>跟随全局 (Global)</option>
                              <option value="telegram" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>Telegram</option>
                              <option value="cfr2" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>CloudFlare R2</option>
                              <option value="s3" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>S3</option>
                              <option value="discord" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>Discord</option>
                              <option value="huggingface" className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>HuggingFace</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className={`mt-4 ml-2 text-[10px] font-medium tracking-wide opacity-50`}>{at('imgBedPathDesc')}</p>
                </div>

                <div className="space-y-4 pt-4">
                  {imgBedSaveStatus.message && (
                    <div className={`text-sm font-bold px-6 py-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 ${
                      imgBedSaveStatus.type === 'success' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                        : imgBedSaveStatus.type === 'error'
                          ? 'bg-red-500/10 border-red-500/20 text-red-500'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    }`}>
                      <div className="flex items-center gap-3">
                        {imgBedSaveStatus.type === 'loading' ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        {imgBedSaveStatus.message}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleSaveImgBed} 
                    disabled={imgBedSaveStatus.type === 'loading'}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-white font-bold rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {imgBedSaveStatus.type === 'loading' ? <RefreshCw size={20} className="animate-spin" /> : <ImageUp size={20} />}
                    {imgBedSaveStatus.type === 'loading' ? at('saving') : '保存并应用图床策略'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 全局确认弹窗 */}
      {confirmModal?.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className={`w-full max-w-sm rounded-3xl border ${cardBg} p-6 shadow-2xl scale-in-center animate-in zoom-in-95 duration-200`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold">{confirmModal?.title}</h3>
                <p className={`mt-2 text-sm ${mutedText}`}>{confirmModal?.message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setConfirmModal(null)}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'
                }`}
              >
                {at('cancel')}
              </button>
              <button
                onClick={confirmModal?.onConfirm}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {at('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码对话框 Modal */}
      {showPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-[32px] border p-8 relative ${cardBg} animate-in zoom-in-95 duration-300 shadow-2xl`}>
            <button
              onClick={() => { setShowPasswordModal(false); setSelectedUserForPassword(null); }}
              className={`absolute top-6 right-6 p-2 rounded-xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
            >
              <X size={18} />
            </button>
            <div className="mb-6">
              <h3 className="text-xl font-black tracking-tight text-blue-500">修改用户密码</h3>
              <p className={`text-xs font-medium mt-1 ${mutedText}`}>修改 {selectedUserForPassword.nickname} 的登录密码</p>
            </div>
            {passwordChangeStatus.message && (
              <div className={`mb-6 px-4 py-3 rounded-2xl text-xs font-bold ${
                passwordChangeStatus.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' :
                passwordChangeStatus.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-500' :
                'bg-blue-500/10 border border-blue-500/20 text-blue-500 animate-pulse'
              }`}>
                {passwordChangeStatus.message}
              </div>
            )}
            <form onSubmit={handleUpdateUserPassword} className="space-y-6">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1 ${mutedText}`}>新密码 (New Password)</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className={inputCls}
                  placeholder="请输入该用户的新密码 (至少6位)"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setShowPasswordModal(false); setSelectedUserForPassword(null); }}
                  className={`flex-1 py-3.5 border rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                    isDarkMode ? 'border-white/10 hover:bg-white/5 text-white/75' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {at('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={passwordChangeStatus.type === 'loading'}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {at('confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
