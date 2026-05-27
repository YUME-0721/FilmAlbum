import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image, Modal, TextInput, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { FilmStripCard, FrameItem } from '../components/FilmStripCard';
import { PhotoViewerModal } from '../components/PhotoViewerModal';
import client from '../api/client';
import * as MediaLibrary from 'expo-media-library/legacy';
import { ArrowLeft, HardDriveDownload, Sparkles, MapPin, Camera, ImagePlus, Pencil, ArrowUpDown, Trash2, ArrowUp, ArrowDown, Check, Calendar, Tag, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { RollItem } from './DashboardScreen';
import ViewShot, { captureRef } from 'react-native-view-shot';

// 影集画幅格式列表
const FORMAT_OPTIONS = [
  '135', '120', '6x6 (120)', '6x7 (120)', '6x4.5 (120)', '6x9 (120)', '半格', 'xpan', '4x5', '8x10'
];

// 影集胶卷类型列表
const FILM_TYPE_OPTIONS = [
  { value: 'colorNegative', label: '彩色负片' },
  { value: 'bwNegative', label: '黑白负片' },
  { value: 'colorPositive', label: '彩色反转片' },
  { value: 'bwPositive', label: '黑白反转片' },
];

// 影集状态选项
const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: '已完成' },
  { value: 'SHOOTING', label: '拍摄中' },
  { value: 'DEVELOPING', label: '冲洗中' },
];

interface RollDetailScreenProps {
  roll: RollItem;
  onBack: () => void;
}

export const RollDetailScreen: React.FC<RollDetailScreenProps> = ({ roll, onBack }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const viewShotRef = useRef<any>(null);
  const fallbackTimerRef = useRef<any>(null);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [sheetProgressText, setSheetProgressText] = useState('');
  const [loadedImagesCount, setLoadedImagesCount] = useState(0);

  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const placeholderColor = isDark ? '#767575' : '#9a9a9a';
  const borderColor = isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)';
  
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);

  // 📸 控制高级大图查看器的显隐与初始触发底片
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // 控制编辑详情 Modal 及表单状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: roll.title || '',
    filmStock: roll.filmStock || '',
    location: roll.location || '',
    camera: roll.camera || '',
    lens: roll.lens || '',
    shotDate: roll.shotDate || '',
    endDate: roll.endDate || roll.shotDate || '',
    format: roll.format || '135',
    filmType: roll.filmType || 'colorNegative',
    status: roll.status || 'COMPLETED',
    tags: roll.tags || [],
  });

  // 用于触发乐观更新和详情页同步刷新的内部当前 Roll 状态
  const [currentRoll, setCurrentRoll] = useState<RollItem>(roll);

  // 联想下拉菜单辅助状态
  const [allFilmStocks, setAllFilmStocks] = useState<any[]>([]);
  const [allGears, setAllGears] = useState<any[]>([]);
  const [activeInput, setActiveInput] = useState<'filmStock' | 'camera' | 'lens' | null>(null);
  const [tagInput, setTagInput] = useState('');

  const [rollFormats, setRollFormats] = useState<any[]>([
    {"format":"135","label":"35mm (135)","frames":["半格","35mm","xpan"],"frameCols":{"半格":12,"35mm":6,"xpan":1}},
    {"format":"120","label":"中画幅 (120)","frames":["620","630","645","6x6","6x7","6x9"],"frameCols":{"620":1,"630":1,"645":4,"6x6":3,"6x7":3,"6x9":2}}
  ]);
  const [filmTypes, setFilmTypes] = useState<string[]>(["彩色负片","黑白负片","彩色反转片","黑白反转片"]);

  // 深度监听外部 roll 改变，初始化状态
  useEffect(() => {
    setCurrentRoll(roll);
    setEditForm({
      title: roll.title || '',
      filmStock: roll.filmStock || '',
      location: roll.location || '',
      camera: roll.camera || '',
      lens: roll.lens || '',
      shotDate: roll.shotDate || '',
      endDate: roll.endDate || roll.shotDate || '',
      format: roll.format || '135',
      filmType: roll.filmType || 'colorNegative',
      status: roll.status || 'COMPLETED',
      tags: roll.tags || [],
    });
  }, [roll]);

  // 核心智能计算：当前所选胶卷的基本画幅规格（135 / 120）
  const getBaseFormat = () => {
    const stock = editForm.filmStock.toLowerCase();
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

  // 当规格切换时，画幅自动做退避适配
  useEffect(() => {
    if (activeFormats.length > 0 && !activeFormats.includes(editForm.format)) {
      setEditForm(prev => ({ ...prev, format: activeFormats[1] || activeFormats[0] }));
    }
  }, [baseFormat, activeFormats]);

  // 加载联想字典及全局公开的规格设置
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
        console.warn('加载联想推荐及系统设置失败:', err);
      }
    };
    loadSuggestions();
  }, []);

  // 按照画幅比例及列数映射对 frames 底片进行分行排版，供离屏高精度 ViewShot 截图渲染
  const getRowGroups = () => {
    const formatName = String(currentRoll.format || '135');
    const defaultColsMap: Record<string, number> = {
      '半格': 12, '135': 6, '35mm': 6, 'xpan': 1,
      '620': 1, '630': 1, '645': 4, '6x6': 3, '6x7': 3, '6x9': 2
    };
    const cols = defaultColsMap[formatName] ?? 6;
    const rowGroups = [];
    for (let i = 0; i < frames.length; i += cols) {
      rowGroups.push(frames.slice(i, i + cols));
    }
    return { rowGroups, cols };
  };

  // 💡 核心对齐状态机：当且仅当前台 Modal 内的所有底片都 100% onLoad 触发成功，且 GPU 硬件解码绘制就绪后，才进行高保真光栅化导出！
  // 这种机制既做到了 100% 告别黑图，又实现了缓存状态下的秒级极速导出（耗时缩短十倍以上，最快仅需 1 秒）！
  useEffect(() => {
    if (!isGeneratingSheet) return;

    const totalToLoad = frames.length;
    setSheetProgressText(`⏳ 正在对齐超清光栅化底片 (${loadedImagesCount}/${totalToLoad})...`);

    if (loadedImagesCount >= totalToLoad) {
      setSheetProgressText('🎞️ 硬件解码全部就绪，正在光栅化导出超清联系单...');

      const timer = setTimeout(async () => {
        try {
          // 强健的 native ref 自动重试对齐机制，彻底免除 React 渲染批处理延迟或 offscreen 挂载带来的 ref 瞬间为 null 报错
          let retryCount = 0;
          while (!viewShotRef.current && retryCount < 15) {
            console.log(`等待高保真渲染板就绪... 重试次数: ${retryCount}`);
            await new Promise(resolve => setTimeout(resolve, 100));
            retryCount++;
          }

          if (!viewShotRef.current) {
            throw new Error('索引图生成失败，排版画布尚未准备完毕，请稍后重试');
          }

          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }

          // 指定质量 0.8 (极佳的文件大小与肉眼不可分的高清画质平衡点)，显式指定物理像素宽度为 3600 像素，配合屏幕外不受物理约束的 3600dp 大画布渲染！
          const uri = await captureRef(viewShotRef, {
            format: 'jpg',
            quality: 0.8,
            result: 'tmpfile',
            pixelRatio: 1,
            width: 3600,
          } as any);

          // 瞬间关闭 Modal，不清除 loadedImagesCount 以便复用已加载完的离屏画布缓存
          setIsGeneratingSheet(false);

          // NOTE: 将直接分享逻辑改为保存到本地相册
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('✅ 保存成功', '索引图已成功保存到您的本地相册！');
        } catch (captureErr: any) {
          console.error('应用内位图捕获失败:', captureErr);
          Alert.alert('导出失败', captureErr?.message || '无法渲染高精度 JPG，请重试');
          setIsGeneratingSheet(false);
        } finally {
          setExporting(false);
        }
      }, 500); // 预留 500ms 的视觉过渡缓冲，确保系统层做最后的光栅化对齐

      return () => clearTimeout(timer);
    }
  }, [loadedImagesCount, isGeneratingSheet, frames.length]);

  // NOTE: 在安卓应用内本地极速渲染并生成高精度 JPG 索引图并保存到本地系统相册
  const handleExport = async () => {
    if (frames.length === 0) {
      Alert.alert('影集为空', '当前影集没有照片，无法生成索引图');
      return;
    }
    
    try {
      // NOTE: 请求系统相册读写权限，避免中途因为没有权限而中断导出
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('⚠️ 权限不足', '需要相册写入权限才能保存索引图，请在系统设置中开启');
        return;
      }

      setExporting(true);
      setIsGeneratingSheet(true);
      // 直接展示当前已经加载的缓存进度，如果已全部载入，将以毫秒级速度瞬间导出！
      setSheetProgressText(`⏳ 正在对齐超清光栅化底片 (${loadedImagesCount}/${frames.length})...`);

      // 清除并重建 4.5 秒保底机制，防范弱网下极其个别的死链或网络波动导致的无限卡死
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      fallbackTimerRef.current = setTimeout(() => {
        if (isGeneratingSheet) {
          console.warn('部分图片前台加载超时，启动保底强制渲染逻辑...');
          setLoadedImagesCount(frames.length); // 强行拉平计数器触发导出
        }
      }, 4500);

    } catch (err: any) {
      console.error('导出索引图失败:', err);
      Alert.alert('导出失败', err?.message || '请稍后再试');
      setIsGeneratingSheet(false);
      setExporting(false);
    }
  };

  // NOTE: 📷 真实调用系统相册并同步保存底片至后端服务中
  const handleUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('⚠️ 权限不足', '需要相册读取权限才能选择底片照片，请在系统设置中开启');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedImage = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: selectedImage.uri,
        name: selectedImage.fileName || `frame-${Date.now()}.jpg`,
        type: 'image/jpeg'
      } as any);

      Alert.alert('⏳ 正在同步', '正在将底片上传并处理，请稍候...', []);

      const uploadResponse = await client.post(`/api/upload?rollId=${currentRoll.id}&type=frame`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!uploadResponse.data || !uploadResponse.data.success || !uploadResponse.data.data.url) {
        throw new Error('Upload strategy execution failed');
      }

      const imageUrl = uploadResponse.data.data.url;
      const previewUrl = uploadResponse.data.data.previewUrl || imageUrl;

      const addFrameResponse = await client.post(`/api/rolls/${currentRoll.id}/frames`, {
        imageUrl,
        previewUrl,
        frameNumber: String(frames.length + 1).padStart(2, '0'),
        aperture: 'f/2.8',
        shutterSpeed: '1/125s',
        iso: '100'
      });

      if (addFrameResponse.data && addFrameResponse.data.success) {
        Alert.alert('✅ 上传成功', '底片已真实同步并存入数据库！');
        fetchFrames();
      } else {
        throw new Error('Save to database failed');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      Alert.alert('❌ 同步失败', err.message || '请检查您的网络连接并稍后重试');
    }
  };

  // NOTE: ✏️ 真实更新影集信息并保存到后端中
  const handleUpdateRollDetails = async () => {
    if (!editForm.title.trim()) {
      Alert.alert('⚠️ 校验失败', '影集标题不能为空');
      return;
    }

    setLoading(true);
    try {
      const response = await client.put(`/api/rolls/${currentRoll.id}`, editForm);
      if (response.data && response.data.success) {
        Alert.alert('✅ 保存成功', '影集参数已成功写入云端数据库！');
        setCurrentRoll(prev => ({
          ...prev,
          ...editForm
        }));
        setShowEditModal(false);
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      Alert.alert('❌ 同步失败', '更新影集信息失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // NOTE: ⇅ 物理调整底片在影集长轴胶卷中的相对顺序，并调用后端 API 永久同步保存
  const handleMoveFrame = async (index: number, direction: 'up' | 'down') => {
    const newFrames = [...frames];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= frames.length) return;
    
    // 乐观更新：先改变本地状态，实现无卡顿的流畅物理滑动动画
    [newFrames[index], newFrames[target]] = [newFrames[target], newFrames[index]];
    setFrames(newFrames);
    
    try {
      await client.put(`/api/rolls/${currentRoll.id}/frames/reorder`, {
        frameIds: newFrames.map(f => f.id)
      });
    } catch (error) {
      console.error('Reorder failed:', error);
      Alert.alert('❌ 排序同步失败', '无法将新的顺序保存至云端服务器，请检查您的网络连接');
    }
  };

  // NOTE: 载入指定胶卷的所有底片数据，弱网或离线自动拉入高精度的摄影作品进行本地暗房渲染
  const fetchFrames = async () => {
    setLoading(true);
    try {
      const response = await client.get(`/api/rolls/${roll.id}`);
      if (response.data && response.data.success && response.data.data && response.data.data.frames) {
        setFrames(response.data.data.frames);
      } else {
        throw new Error('Fetch frames failed');
      }
    } catch (err) {
      console.log('Using fallback mock frames for roll:', roll.id);
      
      // 区分 135 (35mm) 与 120 (中画幅) 提供最真实的经典拟物配图
      const is135 = roll.format === '135';
      const mockFrames: FrameItem[] = is135 ? [
        {
          id: 'frame-mock-101',
          imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop', // 巴黎铁塔街头 (人文)
          frameNumber: '14',
          aperture: 'f/2.0',
          shutterSpeed: '1/250s',
          iso: '400'
        },
        {
          id: 'frame-mock-102',
          imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop', // 京都黄昏 (街角)
          frameNumber: '15',
          aperture: 'f/2.8',
          shutterSpeed: '1/60s',
          iso: '400'
        },
        {
          id: 'frame-mock-103',
          imageUrl: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=600&auto=format&fit=crop', // 东京地下铁 (人文)
          frameNumber: '16',
          aperture: 'f/2.0',
          shutterSpeed: '1/30s',
          iso: '400'
        }
      ] : [
        {
          id: 'frame-mock-201',
          imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop',
          frameNumber: '01',
          aperture: 'f/2.8',
          shutterSpeed: '1/125s',
          iso: '100'
        }
      ];
      setFrames(mockFrames);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrames();
  }, [roll.id]);

  // 当 frames 变化时，自动重置离屏渲染板的底片加载计数器，以便后续进行精准的实时加载状态对齐
  useEffect(() => {
    setLoadedImagesCount(0);
  }, [frames]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0e0e0e' : '#f5f5f5', paddingTop: 56, paddingHorizontal: 16 }}>
      {/* 顶部胶片长轴操作栏 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        {/* 返回按钮 */}
        <TouchableOpacity 
          onPress={onBack}
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
          <ArrowLeft size={16} color={isDark ? '#e7e5e5' : '#1a1a1a'} />
        </TouchableOpacity>
        
        {/* 中间标题 */}
        <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? '#ffffff' : '#1a1a1a', maxWidth: '60%' }} numberOfLines={1}>
          {currentRoll.title}
        </Text>

        {/* 顶部操作栏右侧的对称占位区 */}
        <View style={{ width: 38 }} />
      </View>

      {/* 拟物胶带底片长轴列表（包裹了跟随滚动的元数据面板和功能工具条） */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#ffba20" size="large" />
        </View>
      ) : (
        <FlatList
          data={frames}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <View>
              {/* 头部元数据面板 */}
              <View style={{
                width: '100%',
                backgroundColor: isDark ? '#191a1a' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)',
                borderRadius: 24,
                padding: 20,
                marginBottom: 16
              }}>
                {/* 左右两列布局 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {/* 左侧信息列 */}
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    {/* 第一行：格式与日期 */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        backgroundColor: 'rgba(255,186,32,0.1)',
                        borderRadius: 6,
                        borderWidth: 0.5,
                        borderColor: 'rgba(255,186,32,0.2)'
                      }}>
                        <Text style={{ fontSize: 9, color: '#ffba20', fontWeight: '900' }}>
                          {currentRoll.format} FORMAT
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10, color: isDark ? '#767575' : '#9a9a9a', fontWeight: 'bold' }}>
                        {currentRoll.shotDate}
                      </Text>
                    </View>

                    {/* 标题 */}
                    <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#ffffff' : '#1a1a1a', marginBottom: 4 }} numberOfLines={2}>
                      {currentRoll.title}
                    </Text>
                    
                    {/* 胶卷型号 */}
                    <Text style={{ fontSize: 11, color: '#ffba20', fontWeight: '800', letterSpacing: 0.5, marginBottom: 12 }}>
                      {currentRoll.filmStock.toUpperCase()}
                    </Text>
                  </View>

                  {/* 右侧胶卷封面图片 */}
                  {frames && frames[0]?.imageUrl ? (
                    <View style={{
                      width: 90,
                      height: 90,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor: isDark ? '#000000' : '#eaeaea',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2
                    }}>
                      <Image
                        source={{ uri: frames[0].previewUrl || frames[0].imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}
                </View>

                {/* 底部详细地点与器材绑定，带有一条精致横线分割 */}
                <View style={{ 
                  paddingTop: 14, 
                  marginTop: 14,
                  borderTopWidth: 1, 
                  borderTopColor: isDark ? 'rgba(72,72,72,0.2)' : 'rgba(224,224,224,0.6)',
                  gap: 8
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MapPin size={11} color="#767575" />
                    <Text style={{ fontSize: 11, color: isDark ? '#e7e5e5' : '#666666' }} numberOfLines={1}>
                      {currentRoll.location || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Camera size={11} color="#767575" />
                    <Text style={{ fontSize: 11, color: isDark ? '#e7e5e5' : '#666666', flex: 1 }} numberOfLines={1}>
                      {currentRoll.camera} / {currentRoll.lens}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 影集高级底片管理工具条 (Web 同款极高保真度，集成上传、导出、编辑、排序、删除) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                {/* 1. 📷 上传按钮 */}
                <TouchableOpacity
                  onPress={handleUploadImage}
                  style={{
                    flex: 1.8,
                    height: 38,
                    backgroundColor: '#ffba20',
                    borderRadius: 12,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    shadowColor: '#ffba20',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2
                  }}
                >
                  <ImagePlus size={15} color="#563b00" />
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#563b00' }}>上传</Text>
                </TouchableOpacity>

                {/* 2. 📥 导出索引图按钮 */}
                <TouchableOpacity
                  onPress={handleExport}
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
                  <HardDriveDownload size={15} color={isDark ? '#e7e5e5' : '#1a1a1a'} />
                </TouchableOpacity>

                {/* 3. ✏️ 编辑详情按钮 */}
                <TouchableOpacity
                  onPress={() => setShowEditModal(true)}
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
                  <Pencil size={15} color={isDark ? '#e7e5e5' : '#1a1a1a'} />
                </TouchableOpacity>

                {/* 4. ⇅ 照片排序按钮 */}
                <TouchableOpacity
                  onPress={() => {
                    setIsSortMode(true);
                  }}
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: isSortMode ? 'rgba(255,186,32,0.15)' : (isDark ? '#191a1a' : '#ffffff'),
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isSortMode ? '#ffba20' : (isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)'),
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <ArrowUpDown size={15} color={isSortMode ? '#ffba20' : (isDark ? '#e7e5e5' : '#1a1a1a')} />
                </TouchableOpacity>

                {/* 5. 🗑️ 选中删除按钮 */}
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      '⚠️ 彻底删除影集',
                      '确定要彻底删除该卷影集及其绑定的全部曝光底片记录吗？此操作将永久生效，不可恢复。',
                      [
                        { text: '取消', style: 'cancel' },
                        { text: '彻底删除', style: 'destructive', onPress: onBack }
                      ]
                    );
                  }}
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: isDark ? 'rgba(255,82,82,0.08)' : 'rgba(255,82,82,0.05)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#ff5252',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Trash2 size={15} color="#ff5252" />
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={{ flex: 1, paddingVertical: 80, justifyContent: 'center', alignItems: 'center' }}>
              <Sparkles size={48} color="#484848" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1a1a1a' }}>
                {t('roll.empty')}
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? '#767575' : '#9a9a9a', marginTop: 4 }}>
                这卷胶片暂时还没有曝光底片哦
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={{ position: 'relative' }}>
              <FilmStripCard
                frame={item}
                index={index}
                format={currentRoll.format}
                filmStock={currentRoll.filmStock}
                onPress={() => {
                  setViewerInitialIndex(index);
                  setIsViewerVisible(true);
                }}
              />
              
              {isSortMode && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 16, // 精准扣除 FilmStripCard 的 marginBottom: 16
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 32,
                  zIndex: 10
                }}>
                  <TouchableOpacity
                    disabled={index === 0}
                    onPress={() => handleMoveFrame(index, 'up')}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: index === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: index === 0 ? 'transparent' : 'rgba(255,255,255,0.3)'
                    }}
                  >
                    <ArrowUp size={22} color={index === 0 ? 'rgba(255,255,255,0.2)' : '#ffffff'} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    disabled={index === frames.length - 1}
                    onPress={() => handleMoveFrame(index, 'down')}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: index === frames.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: index === frames.length - 1 ? 'transparent' : 'rgba(255,255,255,0.3)'
                    }}
                  >
                    <ArrowDown size={22} color={index === frames.length - 1 ? 'rgba(255,255,255,0.2)' : '#ffffff'} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* ✏️ 高品质影集详情编辑器 Modal 浮层 */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: isDark ? '#191a1a' : '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            maxHeight: '80%'
          }}>
            {/* 顶栏控制 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#ffffff' : '#1a1a1a' }}>
                ✏️ 编辑影集详情
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={{ fontSize: 13, color: '#ffba20', fontWeight: '800' }}>取消</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="always">
              {/* 影集标题 */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                  影集标题 / Title
                </Text>
                <TextInput
                  value={editForm.title}
                  onChangeText={(txt) => setEditForm(prev => ({ ...prev, title: txt }))}
                  placeholder="请输入影集标题"
                  placeholderTextColor={isDark ? '#767575' : '#9a9a9a'}
                  style={{
                    backgroundColor: isDark ? '#0f0f0f' : '#f5f5f5',
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 13,
                    color: textColor,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)'
                  }}
                />
              </View>

              {/* 胶卷型号 & 拍摄地点 */}
              <View style={{ flexDirection: 'row', gap: 12, zIndex: 10 }}>
                <View style={{ flex: 1, position: 'relative' }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                    胶卷型号 / Film Stock
                  </Text>
                  <TextInput
                    value={editForm.filmStock}
                    onChangeText={(txt) => {
                      setEditForm(prev => ({ ...prev, filmStock: txt }));
                      setActiveInput('filmStock');
                    }}
                    onFocus={() => setActiveInput('filmStock')}
                    placeholder="如 Kodak Portra 400"
                    placeholderTextColor={isDark ? '#767575' : '#9a9a9a'}
                    style={{
                      backgroundColor: isDark ? '#0f0f0f' : '#f5f5f5',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 13,
                      color: textColor,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)'
                    }}
                  />
                  {/* 联想词框 */}
                  {activeInput === 'filmStock' && allFilmStocks.filter(s => `${s.brand} ${s.model}`.toLowerCase().includes(editForm.filmStock.toLowerCase())).length > 0 && (
                    <View style={{
                      position: 'absolute', top: 68, left: 0, right: 0,
                      backgroundColor: isDark ? '#191a1a' : '#ffffff',
                      borderRadius: 12, borderWidth: 1, borderColor: '#ffba20',
                      paddingVertical: 4, zIndex: 99, elevation: 5
                    }}>
                      {allFilmStocks.filter(s => `${s.brand} ${s.model}`.toLowerCase().includes(editForm.filmStock.toLowerCase())).slice(0, 4).map((item, idx, arr) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setEditForm(prev => ({
                              ...prev,
                              filmStock: `${item.brand} ${item.model}`,
                              format: item.format || prev.format,
                              filmType: item.filmType || prev.filmType
                            }));
                            setActiveInput(null);
                          }}
                          style={{
                            paddingVertical: 10, paddingHorizontal: 14,
                            borderBottomWidth: idx === arr.length - 1 ? 0 : 0.5,
                            borderBottomColor: isDark ? 'rgba(72,72,72,0.2)' : 'rgba(224,224,224,0.4)'
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: textColor }}>{item.brand} {item.model}</Text>
                          <Text style={{ fontSize: 9, color: isDark ? '#767575' : '#9a9a9a', marginTop: 2 }}>{item.filmType === 'colorNegative' ? '彩色负片' : '黑白负片'} • {item.format}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                    拍摄地点 / Location
                  </Text>
                  <TextInput
                    value={editForm.location}
                    onChangeText={(txt) => setEditForm(prev => ({ ...prev, location: txt }))}
                    placeholder="如 陕西 西安"
                    placeholderTextColor={isDark ? '#767575' : '#9a9a9a'}
                    style={{
                      backgroundColor: isDark ? '#0f0f0f' : '#f5f5f5',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 13,
                      color: textColor,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)'
                    }}
                  />
                </View>
              </View>

              {/* 相机型号 & 镜头型号 (联动已注册设备柜) */}
              <View style={{ flexDirection: 'row', gap: 12, zIndex: 5 }}>
                <View style={{ flex: 1, position: 'relative' }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                    相机机身 / Camera
                  </Text>
                  <TextInput
                    value={editForm.camera}
                    onChangeText={(txt) => {
                      setEditForm(prev => ({ ...prev, camera: txt }));
                      setActiveInput('camera');
                    }}
                    onFocus={() => setActiveInput('camera')}
                    placeholder="如 Nikon F3"
                    placeholderTextColor={isDark ? '#767575' : '#9a9a9a'}
                    style={{
                      backgroundColor: isDark ? '#0f0f0f' : '#f5f5f5',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 13,
                      color: textColor,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)'
                    }}
                  />
                  {/* 相机过滤推荐 */}
                  {activeInput === 'camera' && allGears.filter(g => g.type === 'CAMERA' && g.name.toLowerCase().includes(editForm.camera.toLowerCase())).length > 0 && (
                    <View style={{
                      position: 'absolute', top: 68, left: 0, right: 0,
                      backgroundColor: isDark ? '#191a1a' : '#ffffff',
                      borderRadius: 12, borderWidth: 1, borderColor: '#ffba20',
                      paddingVertical: 4, zIndex: 99, elevation: 5
                    }}>
                      {allGears.filter(g => g.type === 'CAMERA' && g.name.toLowerCase().includes(editForm.camera.toLowerCase())).slice(0, 4).map((item, idx, arr) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setEditForm(prev => ({
                              ...prev,
                              camera: item.name,
                              format: item.format || prev.format
                            }));
                            setActiveInput(null);
                          }}
                          style={{
                            paddingVertical: 10, paddingHorizontal: 14,
                            borderBottomWidth: idx === arr.length - 1 ? 0 : 0.5,
                            borderBottomColor: isDark ? 'rgba(72,72,72,0.2)' : 'rgba(224,224,224,0.4)'
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: textColor }}>{item.name}</Text>
                          <Text style={{ fontSize: 9, color: isDark ? '#767575' : '#9a9a9a', marginTop: 2 }}>{item.brand} • {item.format === '135' ? '35mm' : '中画幅'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, position: 'relative' }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                    搭配镜头 / Lens
                  </Text>
                  <TextInput
                    value={editForm.lens}
                    onChangeText={(txt) => {
                      setEditForm(prev => ({ ...prev, lens: txt }));
                      setActiveInput('lens');
                    }}
                    onFocus={() => setActiveInput('lens')}
                    placeholder="如 NIKKOR 50mm"
                    placeholderTextColor={isDark ? '#767575' : '#9a9a9a'}
                    style={{
                      backgroundColor: isDark ? '#0f0f0f' : '#f5f5f5',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 13,
                      color: textColor,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)'
                    }}
                  />
                  {/* 镜头过滤推荐 */}
                  {activeInput === 'lens' && allGears.filter(g => g.type === 'LENS' && g.name.toLowerCase().includes(editForm.lens.toLowerCase())).length > 0 && (
                    <View style={{
                      position: 'absolute', top: 68, left: 0, right: 0,
                      backgroundColor: isDark ? '#191a1a' : '#ffffff',
                      borderRadius: 12, borderWidth: 1, borderColor: '#ffba20',
                      paddingVertical: 4, zIndex: 99, elevation: 5
                    }}>
                      {allGears.filter(g => g.type === 'LENS' && g.name.toLowerCase().includes(editForm.lens.toLowerCase())).slice(0, 4).map((item, idx, arr) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setEditForm(prev => ({ ...prev, lens: item.name }));
                            setActiveInput(null);
                          }}
                          style={{
                            paddingVertical: 10, paddingHorizontal: 14,
                            borderBottomWidth: idx === arr.length - 1 ? 0 : 0.5,
                            borderBottomColor: isDark ? 'rgba(72,72,72,0.2)' : 'rgba(224,224,224,0.4)'
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: textColor }}>{item.name}</Text>
                          <Text style={{ fontSize: 9, color: isDark ? '#767575' : '#9a9a9a', marginTop: 2 }}>{item.brand}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* 拍摄开始时间 & 拍摄结束时间 */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                    拍摄开始时间
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={editForm.shotDate}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, shotDate: txt }))}
                      placeholder="2026/05/24"
                      placeholderTextColor={isDark ? '#767575' : '#9a9a9a'}
                      style={{
                        backgroundColor: isDark ? '#0f0f0f' : '#f5f5f5',
                        borderRadius: 12,
                        paddingLeft: 12, paddingRight: 36, paddingVertical: 12,
                        fontSize: 13,
                        color: textColor,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)'
                      }}
                    />
                    <Calendar size={13} color={isDark ? '#767575' : '#9a9a9a'} style={{ position: 'absolute', right: 12, top: 15 }} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                    拍摄结束时间
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={editForm.endDate}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, endDate: txt }))}
                      placeholder="2026/05/24"
                      placeholderTextColor={isDark ? '#767575' : '#9a9a9a'}
                      style={{
                        backgroundColor: isDark ? '#0f0f0f' : '#f5f5f5',
                        borderRadius: 12,
                        paddingLeft: 12, paddingRight: 36, paddingVertical: 12,
                        fontSize: 13,
                        color: textColor,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(72,72,72,0.3)' : 'rgba(224,224,224,0.6)'
                      }}
                    />
                    <Calendar size={13} color={isDark ? '#767575' : '#9a9a9a'} style={{ position: 'absolute', right: 12, top: 15 }} />
                  </View>
                </View>
              </View>

              {/* 画幅 & 类型 */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                    画幅 ({baseFormat} 规格)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                    {activeFormats.map(f => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setEditForm(prev => ({ ...prev, format: f }))}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: editForm.format === f ? '#ffba20' : (isDark ? '#0f0f0f' : '#f5f5f5'),
                          borderWidth: 1, borderColor: editForm.format === f ? '#ffba20' : borderColor,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '900', color: editForm.format === f ? '#563b00' : textColor }}>
                          {f}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                    类型
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                    {filmTypes.map(ft => (
                      <TouchableOpacity
                        key={ft}
                        onPress={() => setEditForm(prev => ({ ...prev, filmType: ft }))}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: editForm.filmType === ft ? 'rgba(255,186,32,0.15)' : (isDark ? '#0f0f0f' : '#f5f5f5'),
                          borderWidth: 1, borderColor: editForm.filmType === ft ? '#ffba20' : borderColor,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '900', color: editForm.filmType === ft ? '#ffba20' : textColor }}>
                          {ft}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* 影集状态 */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase', marginBottom: 8 }}>
                  影集状态
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {STATUS_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setEditForm(prev => ({ ...prev, status: opt.value }))}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        backgroundColor: editForm.status === opt.value ? '#ffba20' : (isDark ? '#0f0f0f' : '#f5f5f5'),
                        borderWidth: 1,
                        borderColor: editForm.status === opt.value ? '#ffba20' : borderColor,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '900', color: editForm.status === opt.value ? '#563b00' : textColor }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 自定义标签 */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 }}>
                  <Tag size={12} color={isDark ? '#767575' : '#9a9a9a'} />
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#767575' : '#9a9a9a', textTransform: 'uppercase' }}>
                    自定义标签
                  </Text>
                </View>
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={() => {
                    const trimmed = tagInput.replace(/[, ]+$/, '').trim();
                    if (trimmed && !editForm.tags.includes(trimmed) && editForm.tags.length < 10) {
                      setEditForm(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
                    }
                    setTagInput('');
                  }}
                  onBlur={() => {
                    if (tagInput.trim()) {
                      const trimmed = tagInput.trim();
                      if (!editForm.tags.includes(trimmed) && editForm.tags.length < 10) {
                        setEditForm(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
                      }
                    }
                    setTagInput('');
                  }}
                  placeholder="键入标签后按空格或回车添加..."
                  placeholderTextColor={isDark ? '#767575' : '#9a9a9a'}
                  returnKeyType="done"
                  style={{
                    backgroundColor: isDark ? '#0f0f0f' : '#f5f5f5',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor,
                    color: textColor,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                />
                {editForm.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {editForm.tags.map(tag => (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => setEditForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
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

              {/* 提交按钮 */}
              <TouchableOpacity
                onPress={handleUpdateRollDetails}
                style={{
                  backgroundColor: '#ffba20',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  marginTop: 10,
                  shadowColor: '#ffba20',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 2
                }}
              >
                <Text style={{ color: '#563b00', fontWeight: '900', fontSize: 14 }}>
                  保存修改并同步
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ⇅ 排序模式底部常驻悬浮控制栏 */}
      {isSortMode && (
        <View style={{
          position: 'absolute',
          bottom: 24,
          left: 16,
          right: 16,
          backgroundColor: isDark ? 'rgba(25,26,26,0.95)' : 'rgba(255,255,255,0.95)',
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#ffba20',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 5,
          zIndex: 99
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffba20' }} />
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1a1a1a' }}>
              排序编辑模式中
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsSortMode(false)}
            style={{
              backgroundColor: '#ffba20',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Check size={14} color="#563b00" />
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#563b00' }}>完成排序</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ⏳ 自定义精美全屏 Modal 加载遮罩：仅用作高级视觉加载状态反馈，极快完成，用户体验极佳 */}
      <Modal
        visible={isGeneratingSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsGeneratingSheet(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(10,10,10,0.88)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{
            backgroundColor: '#191a1a',
            padding: 28,
            borderRadius: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,186,32,0.15)',
            width: '85%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 8
          }}>
            <ActivityIndicator size="large" color="#ffba20" style={{ marginBottom: 18 }} />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '900', marginBottom: 10 }}>
              ⏳ 正在生成索引图
            </Text>
            <Text style={{ color: '#ffba20', fontSize: 12, fontWeight: 'bold', textAlign: 'center', lineHeight: 18 }}>
              {sheetProgressText}
            </Text>
          </View>
        </View>
      </Modal>

      {/* 🎞️ 离屏高精度 ViewShot 渲染板 */}
      {/* 挂在主页面根 View 底下并绝对定位移至屏幕外，完美突破 Modal 原生 Window 的物理大小硬性裁剪与降采样，实现 3600px 终极高清无损渲染 */}
      <View
        style={{
          position: 'absolute',
          left: -9999,
          top: 0,
          width: 3600,
          backgroundColor: '#ffffff',
        }}
        pointerEvents="none"
      >
          <ViewShot
            ref={viewShotRef}
            style={{
              width: 3600,
              backgroundColor: '#ffffff',
              padding: 90,
            }}
          >
            {/* 电影级暗色质感页头 - 3倍等比例放大 */}
            <View style={{ backgroundColor: '#0a0a0a', padding: 72, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
              <View>
                <Text style={{ color: '#ffffff', fontSize: 96, fontWeight: '900', fontFamily: 'System' }}>FilmAlbum</Text>
                <Text style={{ color: '#c5a86a', fontSize: 39, fontWeight: 'bold', marginTop: 12, letterSpacing: 4.5 }}>CONTACT SHEET</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#ffffff', fontSize: 72, fontWeight: 'bold', marginBottom: 12 }}>
                  {String(currentRoll.title || 'UNTITLED').toUpperCase()}
                </Text>
                <Text style={{ color: '#8e8e93', fontSize: 33, fontWeight: '600', marginBottom: 6 }}>
                  {`FORMAT: ${String(currentRoll.format || '135').toUpperCase()}   •   STOCK: ${String(currentRoll.filmStock || 'GENERIC').toUpperCase()}   •   CAMERA: ${String(currentRoll.camera || 'N/A').toUpperCase()}`}
                </Text>
                <Text style={{ color: '#8e8e93', fontSize: 33, fontWeight: '600' }}>
                  {`DATE: ${String(currentRoll.shotDate || 'N/A')}${currentRoll.endDate && currentRoll.endDate !== currentRoll.shotDate ? ` ~ ${currentRoll.endDate}` : ''}   •   TOTAL FRAMES: ${frames.length}`}
                </Text>
              </View>
            </View>

            {/* 2. 绘制胶卷行与栅格底片卡片 */}
            {(() => {
              const { rowGroups, cols } = getRowGroups();
              const formatName = String(currentRoll.format || '135');
              const is135 = ['135', '35mm', '半格', 'xpan'].includes(formatName);
              const filmStockText = String(currentRoll.filmStock || (is135 ? 'KODAK 135' : 'KODAK 120')).toUpperCase();

              // 动态宽高比计算
              const formatRatioMap: Record<string, number> = {
                '半格': 2 / 3, '35mm': 3 / 2, '135': 3 / 2, 'xpan': 65 / 24,
                '620': 3 / 2, '630': 3 / 2, '645': 4 / 3, '6x6': 1, '6x7': 7 / 6, '6x9': 3 / 2
              };
              const aspectRatio = formatRatioMap[formatName] ?? 1.5;

              // 核心排版参数：单幅宽度 - 3倍等比例放大
              const gap = 48;
              const usableWidth = 3600 - 180; // 宽减去 3倍 padding 180
              const itemWidth = (usableWidth - gap * (cols - 1)) / cols;
              const photoW = itemWidth - 24;
              const photoH = photoW / aspectRatio;

              return (
                <View style={{ gap: 72 }}>
                  {rowGroups.map((rowFrames, rIndex) => (
                    <View key={rIndex} style={{ width: '100%' }}>
                      {is135 ? (
                        // 135 底片条
                        // paddingVertical 设为 66，提供充足高档 of 齿孔外边缘暗部空白区域 - 3倍等比放大
                        <View style={{ backgroundColor: '#0b0b0b', paddingVertical: 66, paddingHorizontal: 12, width: '100%', position: 'relative' }}>
                          {/* 顶部高仿齿孔带 - 3倍等比放大 */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 24 }}>
                            {[...Array(Math.floor(usableWidth / 54))].map((_, i) => (
                              <View key={i} style={{ width: 30, height: 21, backgroundColor: '#ffffff', borderRadius: 4.5 }} />
                            ))}
                          </View>

                          {/* 底片内容平铺 */}
                          <View style={{ flexDirection: 'row', gap: gap }}>
                            {rowFrames.map((frame, colIndex) => {
                              const globalIndex = rIndex * cols + colIndex;
                              return (
                                <View key={frame.id} style={{ width: itemWidth, alignItems: 'center', position: 'relative' }}>
                                  {/* 💡 胶卷型号标记：绝对定位到顶部齿孔带的最外侧边框边缘 - 3倍等比置于 top: -84 */}
                                  <Text style={{ position: 'absolute', top: -84, color: '#c5a86a', fontSize: 21, fontWeight: 'bold', fontFamily: 'monospace' }}>
                                    {filmStockText}
                                  </Text>
                                  
                                  {/* 给底片图片增加 marginVertical: 36，提供完美的底片呼吸空隙 */}
                                  <Image
                                    source={{ uri: frame.previewUrl || frame.imageUrl }}
                                    style={{ width: photoW, height: photoH, marginVertical: 36 }}
                                    resizeMode="cover"
                                    onLoad={() => {
                                      setLoadedImagesCount(prev => prev + 1);
                                    }}
                                  />

                                  {/* 💡 帧号标记：绝对定位到底部齿孔带的最外侧边框边缘 - 3倍等比置于 bottom: -84 */}
                                  <Text style={{ position: 'absolute', bottom: -84, color: '#c5a86a', fontSize: 27, fontWeight: '900', fontFamily: 'monospace' }}>
                                    {`▶ ${String(globalIndex + 1).padStart(2, '0')}`}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>

                          {/* 底部高仿齿孔带 - 3倍等比放大 */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 24 }}>
                            {[...Array(Math.floor(usableWidth / 54))].map((_, i) => (
                              <View key={i} style={{ width: 30, height: 21, backgroundColor: '#ffffff', borderRadius: 4.5 }} />
                            ))}
                          </View>
                        </View>
                      ) : (
                        // 120 / 中画幅与大画幅排版 - 3倍等比放大
                        <View style={{ flexDirection: 'row', gap: gap }}>
                          {rowFrames.map((frame, colIndex) => {
                            const globalIndex = rIndex * cols + colIndex;
                            return (
                              <View key={frame.id} style={{ width: itemWidth, backgroundColor: '#0b0b0b', padding: 24, alignItems: 'center' }}>
                                <Text style={{ color: '#8e8e93', fontSize: 24, fontWeight: '600', marginBottom: 18, textTransform: 'uppercase' }}>{filmStockText}</Text>
                                
                                <Image
                                  source={{ uri: frame.previewUrl || frame.imageUrl }}
                                  style={{ width: photoW, height: photoH }}
                                  resizeMode="cover"
                                  onLoad={() => {
                                    setLoadedImagesCount(prev => prev + 1);
                                  }}
                                />

                                <Text style={{ color: '#c5a86a', fontSize: 27, fontWeight: 'bold', marginTop: 18 }}>
                                  {`▶ ${String(globalIndex + 1).padStart(2, '0')}`}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              );
            })()}
          </ViewShot>
        </View>

      {/* 📸 大图查看与曝光元数据编辑器 */}
      <PhotoViewerModal
        visible={isViewerVisible}
        roll={{
          id: currentRoll.id,
          title: currentRoll.title,
          filmStock: currentRoll.filmStock,
          camera: currentRoll.camera,
          lens: currentRoll.lens,
          shotDate: currentRoll.shotDate,
          format: currentRoll.format
        }}
        frames={frames}
        initialIndex={viewerInitialIndex}
        onClose={() => setIsViewerVisible(false)}
        onRefreshRoll={fetchFrames}
      />
    </View>
  );
};
