/**
 * 底片高级大图查看器与元数据编辑器 (移动端高保真还原)
 * 支持双击缩放、单指平移、旋转查看、删除底片、标签管理、光影边框实时预览以及 3600px 高清带边框 ViewShot 导出保存至相册
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, Image, Modal, TouchableOpacity, ScrollView, 
  TextInput, Alert, StyleSheet, Dimensions, PanResponder, 
  ActivityIndicator, Clipboard, FlatList, Platform
} from 'react-native';
import { 
  X, ZoomIn, ZoomOut, RotateCw, Trash2, Info, ArrowLeft, 
  HardDriveDownload, Check, Plus, Tag, Copy, Eye, Sliders
} from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library/legacy';
import { cacheDirectory, downloadAsync, deleteAsync } from 'expo-file-system/legacy';
import client from '../api/client';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import { FrameItem } from './FilmStripCard';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 💡 常见胶卷品牌 LOGO 资产映射表 (从 Web 端高精度同步，支持中英文双向匹配)
const commonBrands = [
  { name: 'FUJIFILM', displayName: '富士', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774608830532.webp' },
  { name: 'Kodak', displayName: '柯达', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774609038242.webp' },
  { name: 'Lucky', displayName: '乐凯', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774605924805.webp' },
  { name: 'Agfa', displayName: '爱克发', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774609367814.webp' },
  { name: 'LOMOGRAPHY', displayName: '乐魔', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774610093361.webp' },
  { name: 'Leica', displayName: '徕卡', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774609923703.webp' }
];

const getBrandLogoUrl = (filmStock: string) => {
  if (!filmStock) return null;
  const brandName = filmStock.trim().split(' ')[0].toLowerCase();
  const found = commonBrands.find(
    b => b.name.toLowerCase() === brandName || b.displayName.toLowerCase() === brandName
  );
  return found ? found.logoUrl : null;
};

// 💡 格式化文件大小 (字节转化为 KB/MB)，与网页端保持完全同步
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// 📸 大图列表子 Item 组件：自我维护独立 loading 状态，彻底解决 FlatList 滑动时多个 Image 状态竞争导致的卡死一直在 LOADING 问题
interface ViewerImageItemProps {
  item: FrameItem;
  isCurrent: boolean;
  borderType: 'none' | 'white' | 'black';
  borderOptions: any;
  isShowingOriginal: boolean;
  scale: number;
  rotation: number;
  position: { x: number; y: number };
  getRotationScale: () => number;
  panResponder: any;
  renderExposureString: () => string;
  handleDoubleClick: () => void;
  brandInitial: string;
  roll: any;
  isDark: boolean;
}

const ViewerImageItem: React.FC<ViewerImageItemProps> = ({
  item,
  isCurrent,
  borderType,
  borderOptions,
  isShowingOriginal,
  scale,
  rotation,
  position,
  getRotationScale,
  panResponder,
  renderExposureString,
  handleDoubleClick,
  brandInitial,
  roll,
  isDark
}) => {
  const [loading, setLoading] = useState(true);
  const [logoFailed, setLogoFailed] = useState(false);
  const activeImage = isShowingOriginal ? item.imageUrl : (item.previewUrl || item.imageUrl);
  const loadingTimerRef = useRef<any>(null);

  // 💡 仅在图片地址 activeImage 发生真实改变时，如果该 Item 当前正被用户查看，才去重置为 loading 状态
  // 彻底排除了 isCurrent 作为依赖项！在翻页时绝不会因为 isCurrent 发生改变而错误地将已加载好的图片重置为 LOADING
  useEffect(() => {
    if (isCurrent) {
      setLoading(true);
      setLogoFailed(false);
      
      // 🚀 建立 2.5 秒的极速自动保底关圈机制，防范弱网或缓存导致的原生 onLoadEnd 回调丢失，100% 杜绝转圈卡死
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
      loadingTimerRef.current = setTimeout(() => {
        setLoading(false);
      }, 2500);
    }
    
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [activeImage]);

  const handleLoadSuccess = () => {
    setLoading(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  // 💡 智能物理装裱卡纸比例计算：135 呈现经典 3:2 横卡纸，120 6x6/6x7 呈现大气大方装裱卡纸，且在旋转 90/270 度时自动倒置高宽比包裹竖图
  const getCardAspectRatio = () => {
    if (borderType === 'none') return undefined;
    const formatName = String(roll.format || '135').toLowerCase();
    
    let baseRatio = 3 / 2.06; // 135 画幅经典拟物边框长宽比，极大收窄左右白边
    if (formatName.includes('6x6') || formatName.includes('6x7') || formatName.includes('120') || (roll.filmStock || '').toLowerCase().includes('120')) {
      baseRatio = 1 / 1.06; // 6x6 方形中画幅白卡纸物理边框黄金比例，收窄白边
    }

    // 💡 旋转重新计算边框：如果图片顺时针旋转了 90 或 270 度，高宽比完全颠倒，自适应变成高挑的竖向卡片
    if (rotation === 90 || rotation === 270) {
      return 1 / baseRatio;
    }
    return baseRatio;
  };

  return (
    <View style={{ width: SCREEN_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      {/* 光影边框预览封装容器 */}
      <View 
        style={[
          styles.borderPreviewContainer, 
          borderType === 'none' 
            ? { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.62, elevation: 0, shadowOpacity: 0 } 
            : (borderType === 'white' ? styles.borderWhite : styles.borderBlack),
          { aspectRatio: getCardAspectRatio() } // 👈 动态覆写并装裱
        ]}
      >
        <View 
          style={[
            styles.imageWrapper,
            isCurrent ? {
              transform: [
                { scale: scale * getRotationScale() },
                { rotate: `${rotation}deg` },
                { translateX: position.x },
                { translateY: position.y }
              ]
            } : {},
            borderType === 'none' ? { height: '100%' } : { flex: 1 } // 无边框占满，有边框使用自适应 Flex 以完全撑满并收窄左右白边
          ]}
          {...(isCurrent ? panResponder.panHandlers : {})}
        >
          {loading && isCurrent && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#ffba20" size="small" />
              <Text style={styles.loadingText}>LOADING...</Text>
            </View>
          )}
          
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={handleDoubleClick}
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          >
            <Image
              source={{ uri: activeImage }}
              style={[
                styles.mainImage,
                { 
                  aspectRatio: borderType === 'none' 
                    ? undefined 
                    : (String(roll.format).includes('6x6') || String(roll.format).includes('120') ? 1.0 : 1.5)
                }
              ]}
              resizeMode="contain"
              onLoadStart={() => {
                if (isCurrent) setLoading(true);
              }}
              onLoad={handleLoadSuccess}
              onLoadEnd={handleLoadSuccess}
            />
          </TouchableOpacity>
        </View>

        {/* 拟物光影边框底栏文字说明 (实时预览) */}
        {borderType !== 'none' && (
          <View style={[styles.borderInfoBar, { borderTopColor: borderType === 'white' ? '#eaeaea' : '#222222' }]}>
            {borderOptions.showFilmStock && (() => {
              const logoUrl = getBrandLogoUrl(roll.filmStock);
              return (
                <View style={styles.borderLogoCol}>
                  {logoUrl && !logoFailed ? (
                    <ExpoImage 
                      source={{ uri: logoUrl }} 
                      style={[styles.brandIconMini, { backgroundColor: 'transparent' }]} 
                      contentFit="contain"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <View style={styles.brandIconMini}>
                      <Text style={styles.brandIconText}>{brandInitial}</Text>
                    </View>
                  )}
                  <View style={styles.brandTextWrapper}>
                    <Text style={[styles.brandTextMain, { color: borderType === 'white' ? '#1a1a1a' : '#ffffff' }]}>
                      {roll.filmStock.split(' ')[0].toUpperCase()}
                    </Text>
                    <Text style={[styles.brandTextSub, { color: borderType === 'white' ? '#666' : '#aaa' }]}>
                      {roll.filmStock.split(' ').slice(1).join(' ').toUpperCase() || 'FILM'}
                    </Text>
                  </View>
                </View>
              );
            })()}

            <View style={styles.borderExifCol}>
              <View style={{ alignItems: 'flex-end' }}>
                {borderOptions.showCamera && (
                  <Text style={[styles.borderExifMain, { color: borderType === 'white' ? '#1a1a1a' : '#ffffff' }]} numberOfLines={1}>
                    {(item.camera || roll.camera).toUpperCase()}
                  </Text>
                )}
                {borderOptions.showLens && (
                  <Text style={[styles.borderExifSub, { color: borderType === 'white' ? '#666' : '#aaa' }]} numberOfLines={1}>
                    {item.lens || roll.lens}
                  </Text>
                )}
              </View>

              <View style={[styles.borderDivider, { backgroundColor: borderType === 'white' ? '#ccc' : '#444' }]} />

              <View style={{ alignItems: 'flex-start' }}>
                {borderOptions.showDate && (
                  <Text style={[styles.borderExifMain, { color: borderType === 'white' ? '#1a1a1a' : '#ffffff' }]}>
                    {item.shotDate || roll.shotDate}
                  </Text>
                )}
                {borderOptions.showExposure && (
                  <Text style={[styles.borderExifSub, { color: borderType === 'white' ? '#666' : '#aaa' }]}>
                    {renderExposureString()}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

interface PhotoViewerModalProps {
  visible: boolean;
  roll: {
    id: string;
    title: string;
    filmStock: string;
    camera: string;
    lens: string;
    shotDate: string;
    format: string;
    tags?: string[];
  };
  frames: FrameItem[];
  initialIndex: number;
  onClose: () => void;
  onRefreshRoll: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  visible,
  roll,
  frames: initialFrames,
  initialIndex,
  onClose,
  onRefreshRoll
}) => {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  
  // 核心数据状态
  const [frames, setFrames] = useState<FrameItem[]>(initialFrames);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isListReady, setIsListReady] = useState(false);
  const currentFrame = frames[currentIndex];
  
  // 💡 智能物理装裱卡纸比例计算：135 呈现经典 3:2 横卡纸，120 6x6/6x7 呈现大气大方装裱卡纸，且在旋转 90/270 度时自动倒置高宽比包裹竖图
  const getCardAspectRatio = () => {
    if (borderType === 'none') return undefined;
    const formatName = String(roll.format || '135').toLowerCase();
    
    let baseRatio = 3 / 2.06; // 135 画幅经典拟物边框长宽比，极大收窄左右白边
    if (formatName.includes('6x6') || formatName.includes('6x7') || formatName.includes('120') || (roll.filmStock || '').toLowerCase().includes('120')) {
      baseRatio = 1 / 1.06; // 6x6 方形中画幅白卡纸物理边框黄金比例，收窄白边
    }

    // 💡 旋转重新计算边框：如果图片顺时针旋转了 90 或 270 度，高宽比完全颠倒，自适应变成高挑的竖向卡片
    if (rotation === 90 || rotation === 270) {
      return 1 / baseRatio;
    }
    return baseRatio;
  };
  
  // 视觉与控制状态
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // 控制详情表单 Sheet 的显隐

  // 缩放、平移与旋转状态
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 边框配置状态
  const [borderType, setBorderType] = useState<'none' | 'white' | 'black'>('none');
  const [borderOptions, setBorderOptions] = useState({
    showFilmStock: true,
    showCamera: true,
    showLens: true,
    showDate: true,
    showExposure: true
  });

  // 编辑字段状态
  const [editForm, setEditForm] = useState({
    camera: '',
    lens: '',
    aperture: '',
    shutterSpeed: '',
    iso: '',
    exposureCompensation: '',
    shotDate: '',
    location: '',
    description: ''
  });
  
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // ViewShot 引用，用于带边框高清渲染
  const borderViewShotRef = useRef<any>(null);

  // 手势记录引用，防止横向手势滑动冲突
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // 📸 FlatList 引用，用于控制水平照片列表的物理顺滑滑动定位
  const flatListRef = useRef<FlatList<any>>(null);

  // 深度监听外部数据
  useEffect(() => {
    setFrames(initialFrames);
  }, [initialFrames]);

  useEffect(() => {
    if (visible) {
      setIsListReady(false); // 👈 打开时先进入“秒开单图占位通道”，绝不卡顿和黑屏
      setCurrentIndex(initialIndex);
      resetViewerState();

      // 💡 延迟 350ms 等待 Modal 原生滑入动画彻底平息，组件尺寸完全测量稳定后，再悄无声息地挂载多图滚动 FlatList
      const timer = setTimeout(() => {
        setIsListReady(true);
        if (flatListRef.current) {
          try {
            flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
          } catch (e) {
            console.warn('Initial scroll index error:', e);
          }
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [visible, initialIndex]);

  // 当切换图片或编辑初始化时，重置图片加载状态，并填入表单默认值
  useEffect(() => {
    if (!currentFrame) return;
    setIsShowingOriginal(false);
    
    // 初始化编辑表单
    setEditForm({
      camera: currentFrame.camera || roll.camera || '',
      lens: currentFrame.lens || roll.lens || '',
      aperture: currentFrame.aperture || '',
      shutterSpeed: currentFrame.shutterSpeed || '',
      iso: currentFrame.iso || '',
      exposureCompensation: currentFrame.exposureCompensation || '0',
      shotDate: currentFrame.shotDate || roll.shotDate || '',
      location: currentFrame.location || '',
      description: currentFrame.description || ''
    });

    // 解析标签
    try {
      if (typeof currentFrame.tags === 'string') {
        setTags(JSON.parse(currentFrame.tags));
      } else if (Array.isArray(currentFrame.tags)) {
        setTags(currentFrame.tags);
      } else {
        setTags([]);
      }
    } catch {
      setTags([]);
    }
  }, [currentIndex, currentFrame, visible]);

  // 重置查看器状态（缩放、位移、旋转）
  const resetViewerState = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // 双击图片快速放大或恢复
  const handleDoubleClick = () => {
    if (scale > 1) {
      resetViewerState();
    } else {
      setScale(2.2);
      setPosition({ x: 0, y: 0 });
    }
  };

  // 顺时针旋转图片
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // 智能旋转高宽比缩放适配因子：避免立起来时顶穿或裁切屏幕
  const getRotationScale = () => {
    if (rotation !== 90 && rotation !== 270) return 1;
    const formatName = String(roll.format || '135').toLowerCase();
    
    // 💡 旋转缩放自适应：高度保持 100% 物理拉伸时，120 比例为 1:1 受宽度限制，0.70 最饱满；135 比例为 1.5:1 受高度限制，0.62 完美契合让出底栏
    if (formatName.includes('6x6') || formatName.includes('6x7') || formatName.includes('120') || (roll.filmStock || '').toLowerCase().includes('120')) {
      return 0.70;
    }
    return 0.62;
  };

  // 滑动平移手势处理器 (当放大时启用拖拽平移)
  const lastGesture = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => scale > 1,
      onMoveShouldSetPanResponder: () => scale > 1,
      onPanResponderGrant: () => {
        lastGesture.current = { x: position.x, y: position.y };
      },
      onPanResponderMove: (_, gestureState) => {
        if (scale <= 1) return;
        const newX = lastGesture.current.x + gestureState.dx;
        const newY = lastGesture.current.y + gestureState.dy;

        // 设定阻尼边界限制
        const maxOffsetWidth = (SCREEN_WIDTH * scale - SCREEN_WIDTH) / 2;
        const maxOffsetHeight = (SCREEN_HEIGHT * 0.5 * scale - SCREEN_HEIGHT * 0.5) / 2;

        setPosition({
          x: Math.max(-maxOffsetWidth, Math.min(maxOffsetWidth, newX)),
          y: Math.max(-maxOffsetHeight, Math.min(maxOffsetHeight, newY))
        });
      },
      onPanResponderRelease: () => {}
    })
  ).current;

  // 切换底片
  const goToFrame = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < frames.length) {
      setCurrentIndex(targetIndex);
      resetViewerState();
    }
  };

  // 全屏横向划过手势翻页（仅在未放大时生效）
  const handleTouchStart = (e: any) => {
    if (scale > 1) return;
    const { pageX, pageY } = e.nativeEvent;
    touchStartRef.current = { x: pageX, y: pageY };
  };

  const handleTouchEnd = (e: any) => {
    if (scale > 1 || !touchStartRef.current) {
      touchStartRef.current = null;
      return;
    }
    const { pageX, pageY } = e.nativeEvent;
    const dx = pageX - touchStartRef.current.x;
    const dy = pageY - touchStartRef.current.y;
    touchStartRef.current = null;

    // 滑动敏感度限制：横向滑移 > 50px，且夹角合理
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) {
        // 向右滑，切换到上一张
        goToFrame(currentIndex > 0 ? currentIndex - 1 : frames.length - 1);
      } else {
        // 向左滑，切换到下一张
        goToFrame(currentIndex < frames.length - 1 ? currentIndex + 1 : 0);
      }
    }
  };

  // 保存修改后的底片档案至后端
  const handleSaveChanges = async (customForm = editForm, customTags = tags) => {
    if (!currentFrame) return;
    setIsSavingDetails(true);
    try {
      const payload = {
        ...customForm,
        tags: customTags
      };
      
      const response = await client.put(`/api/rolls/${roll.id}/frames/${currentFrame.id}`, payload);
      if (response.data && response.data.success) {
        // 局部更新缓存状态
        const updatedFrames = frames.map((f, i) => {
          if (i === currentIndex) {
            return {
              ...f,
              ...customForm,
              tags: customTags
            };
          }
          return f;
        });
        setFrames(updatedFrames);
        onRefreshRoll(); // 刷新外层列表
      } else {
        throw new Error('Save failed');
      }
    } catch (err: any) {
      console.error('更新底片信息失败:', err);
      Alert.alert('❌ 同步失败', err.message || '请检查您的网络连接并稍后重试');
    } finally {
      setIsSavingDetails(false);
    }
  };

  // 添加标签并自动保存
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    const nextTags = [...tags, trimmed];
    setTags(nextTags);
    setTagInput('');
    handleSaveChanges(editForm, nextTags);
  };

  // 删除标签并自动保存
  const handleRemoveTag = (targetTag: string) => {
    const nextTags = tags.filter(t => t !== targetTag);
    setTags(nextTags);
    handleSaveChanges(editForm, nextTags);
  };

  // 彻底删除单张照片
  const handleDeleteFrame = () => {
    if (!currentFrame) return;
    Alert.alert(
      '⚠️ 彻底删除底片',
      `您确定要从影集《${roll.title}》中永久删除第 ${currentFrame.frameNumber || currentIndex + 1} 帧曝光底片吗？此操作将永久抹除云端记录，不可恢复！`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定删除', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const res = await client.delete(`/api/rolls/${roll.id}/frames/${currentFrame.id}`);
              if (res.data && res.data.success) {
                Alert.alert('✅ 删除成功', '底片已彻底从影集中被抹除！');
                onRefreshRoll();
                
                // 处理列表切换
                if (frames.length <= 1) {
                  onClose();
                } else {
                  const newFrames = frames.filter((_, i) => i !== currentIndex);
                  setFrames(newFrames);
                  setCurrentIndex(Math.max(0, currentIndex - 1));
                }
              } else {
                throw new Error('Delete response failed');
              }
            } catch (err: any) {
              console.error('删除底片失败:', err);
              Alert.alert('❌ 删除失败', err.message || '网络请求错误，请稍后重试');
            }
          }
        }
      ]
    );
  };

  // 导出原图保存至本地相册
  const handleSaveOriginal = async () => {
    if (!currentFrame) return;
    setIsExporting(true);
    let localUri: string | null = null;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('⚠️ 权限不足', '需要相册写入权限才能保存底片原图，请在系统设置中开启');
        return;
      }

      // NOTE: 在 Android 上 ExpoMediaLibrary.saveToLibraryAsync 无法直接复制远端 URL，需先下载到本地临时文件系统
      const filename = currentFrame.imageUrl.split('/').pop() || `original_photo_${Date.now()}.jpg`;
      const tempPath = cacheDirectory + filename;
      
      const downloadResult = await downloadAsync(currentFrame.imageUrl, tempPath);
      localUri = downloadResult.uri;

      // 使用本地临时路径保存到系统相册
      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('✅ 保存成功', '高清原图已成功保存到您的本地相册！');
    } catch (err: any) {
      console.error('保存高清原图失败:', err);
      Alert.alert('❌ 保存失败', err.message || '原图下载处理异常');
    } finally {
      setIsExporting(false);
      // NOTE: 保存成功或失败后，静默清理本地缓存的临时文件，避免存储膨胀
      if (localUri) {
        try {
          await deleteAsync(localUri, { idempotent: true });
        } catch (e) {
          console.warn('清理保存临时文件失败:', e);
        }
      }
    }
  };

  // 导出带光影边框的卡片保存至相册 (离屏 3600px ViewShot 拍照模式)
  const handleSaveBordered = async () => {
    if (!currentFrame) return;
    setIsExporting(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('⚠️ 权限不足', '需要相册写入权限才能导出卡片图片，请在系统设置中开启');
        return;
      }

      // 等待 100ms 触发渲染就绪
      await new Promise(resolve => setTimeout(resolve, 100));

      const uri = await captureRef(borderViewShotRef, {
        format: 'jpg',
        quality: 0.92,
        result: 'tmpfile',
        pixelRatio: 1,
        width: 3600, // 完美对齐 Web 端物理像素级别
      } as any);

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ 导出成功', '精美光影边框相册卡片已成功渲染并保存至系统相册！');
    } catch (err: any) {
      console.error('光影边框渲染导出失败:', err);
      Alert.alert('❌ 导出失败', err.message || '画布光栅化生成失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // NOTE: 统一底片保存入口：根据用户当前选择的光影边框状态，自动决定保存高清原图还是导出高清装裱卡纸
  const handleSavePhoto = async () => {
    if (borderType === 'none') {
      await handleSaveOriginal();
    } else {
      await handleSaveBordered();
    }
  };

  // 渲染单张底片曝光参数连接字
  const renderExposureString = () => {
    if (!currentFrame) return '';
    const parts = [
      currentFrame.aperture, 
      currentFrame.shutterSpeed, 
      currentFrame.iso ? `ISO ${currentFrame.iso}` : ''
    ].filter(Boolean);
    
    if (
      currentFrame.exposureCompensation && 
      currentFrame.exposureCompensation !== '0' && 
      currentFrame.exposureCompensation !== '0.0'
    ) {
      const compVal = currentFrame.exposureCompensation.startsWith('+') || currentFrame.exposureCompensation.startsWith('-')
        ? currentFrame.exposureCompensation
        : `+${currentFrame.exposureCompensation}`;
      parts.push(`EV ${compVal}`);
    }
    return parts.join('   ');
  };

  if (!currentFrame) return null;

  const activeImage = isShowingOriginal ? currentFrame.imageUrl : (currentFrame.previewUrl || currentFrame.imageUrl);
  const brandInitial = (roll.filmStock || 'K').trim().charAt(0).toUpperCase();
  const isViewerDark = borderType === 'white' ? true : (borderType === 'black' ? false : isDark);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isViewerDark ? '#000000' : '#f7f7f7' }]}>
        
        {/* 顶部状态与功能悬浮条 */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={[styles.iconButton, { backgroundColor: isViewerDark ? '#1a1a1a' : '#ffffff' }]}>
            <ArrowLeft size={18} color={isViewerDark ? '#ffffff' : '#1a1a1a'} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: isViewerDark ? '#ffffff' : '#1a1a1a' }]} numberOfLines={1}>
            {roll.title} ({currentIndex + 1}/{frames.length})
          </Text>

          <TouchableOpacity onPress={handleDeleteFrame} style={styles.iconButton}>
            <Trash2 size={16} color="#ff5252" />
          </TouchableOpacity>
        </View>

        {/* 核心大图展示区 (物理重叠守望架构，提供 100% 绝对秒开，防抖、防黑屏、防滑动失效) */}
        <View style={styles.imageContainer}>
          {/* 🛡️ 守望单图：永远居于最底层作为底片物理靠山，一瞬间亮起，且在整个生命周期永不卸载，100% 阻断任何由于 remount 或列表计算导致的短暂黑屏 */}
          <View style={[StyleSheet.absoluteFill, { opacity: isListReady ? 0 : 1 }]}>
            <ViewerImageItem
              item={frames[currentIndex] || currentFrame}
              isCurrent={true}
              borderType={scale > 1 ? 'none' : borderType} // 💡 绝妙设计：放大缩小图片时自动动态隐藏边框以满屏查看大图细节！
              borderOptions={borderOptions}
              isShowingOriginal={isShowingOriginal}
              scale={1}
              rotation={0}
              position={{ x: 0, y: 0 }}
              getRotationScale={() => 1}
              panResponder={{ panHandlers: {} }}
              renderExposureString={renderExposureString}
              handleDoubleClick={() => {}}
              brandInitial={brandInitial}
              roll={roll}
              isDark={isViewerDark}
            />
          </View>

          {/* 🎞️ 滑动滑块：浮在守望单图上方，作为高层手势链。在 Modal 物理尺寸完全稳固后悄无声息挂载，并因 initialScrollIndex 此时 100% 精准测算而直接定位到位 */}
          {isListReady && (
            <FlatList
              ref={flatListRef}
              data={frames}
              horizontal={true}
              pagingEnabled={true}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              scrollEnabled={scale <= 1} // 💡 绝妙设计：双击放大时禁用水平滑动翻页，在原图或缩小状态下允许滑动
              initialScrollIndex={initialIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index
              })}
              onMomentumScrollEnd={(e) => {
                // 滑动完全停止时，平滑更新当前的底片索引，底层的守望单图也将瞬间且无痕同步为当前看图，完成全链路无缝守望
                const nextIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                if (nextIndex >= 0 && nextIndex < frames.length && nextIndex !== currentIndex) {
                  setCurrentIndex(nextIndex);
                }
              }}
              style={StyleSheet.absoluteFill}
              renderItem={({ item, index }) => (
                <ViewerImageItem
                  item={item}
                  isCurrent={index === currentIndex}
                  borderType={scale > 1 ? 'none' : borderType} // 💡 绝妙设计：放大缩小图片时自动动态隐藏边框以满屏查看大图细节！
                  borderOptions={borderOptions}
                  isShowingOriginal={isShowingOriginal}
                  scale={scale}
                  rotation={rotation}
                  position={position}
                  getRotationScale={getRotationScale}
                  panResponder={panResponder}
                  renderExposureString={renderExposureString}
                  handleDoubleClick={handleDoubleClick}
                  brandInitial={brandInitial}
                  roll={roll}
                  isDark={isViewerDark}
                />
              )}
            />
          )}
        </View>

        {/* 高清原图切换与缩放旋转极奢胶囊控制器 */}
        <View style={styles.controlContainer}>
          {/* 原图切换 */}
          <TouchableOpacity 
            onPress={() => setIsShowingOriginal(!isShowingOriginal)}
            style={[styles.capsuleBtn, isShowingOriginal ? styles.capsuleBtnActive : {}]}
          >
            <Eye size={12} color={isShowingOriginal ? '#563b00' : (isViewerDark ? '#e7e5e5' : '#1a1a1a')} />
            <Text style={[styles.capsuleText, { color: isShowingOriginal ? '#563b00' : (isViewerDark ? '#e7e5e5' : '#1a1a1a') }]}>
              {isShowingOriginal ? '高清原图' : '预览画质'}
            </Text>
          </TouchableOpacity>

          {/* 旋转 */}
          <TouchableOpacity onPress={handleRotate} style={styles.controlIconBtn}>
            <RotateCw size={14} color={isViewerDark ? '#e7e5e5' : '#1a1a1a'} />
          </TouchableOpacity>

          {/* 放大 */}
          <TouchableOpacity 
            onPress={() => setScale(prev => {
              const next = Math.min(prev + 0.3, 3);
              const rounded = Math.round(next * 10) / 10;
              return Math.abs(rounded - 1.0) < 0.05 ? 1 : rounded;
            })} 
            style={styles.controlIconBtn}
          >
            <ZoomIn size={14} color={isViewerDark ? '#e7e5e5' : '#1a1a1a'} />
          </TouchableOpacity>

          {/* 缩小 */}
          <TouchableOpacity 
            onPress={() => setScale(prev => {
              const next = Math.max(prev - 0.3, 0.4);
              const rounded = Math.round(next * 10) / 10;
              return Math.abs(rounded - 1.0) < 0.05 ? 1 : rounded;
            })} 
            style={styles.controlIconBtn}
          >
            <ZoomOut size={14} color={isViewerDark ? '#e7e5e5' : '#1a1a1a'} />
          </TouchableOpacity>

          {/* 信息看板展开开关 */}
          <TouchableOpacity 
            onPress={() => setShowSidebar(!showSidebar)}
            style={[styles.capsuleBtn, showSidebar ? styles.capsuleBtnActive : {}]}
          >
            <Sliders size={12} color={showSidebar ? '#563b00' : (isViewerDark ? '#e7e5e5' : '#1a1a1a')} />
            <Text style={[styles.capsuleText, { color: showSidebar ? '#563b00' : (isViewerDark ? '#e7e5e5' : '#1a1a1a') }]}>
              {t('roll.photoArchive')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 详情与编辑 Sheet 上拉抽屉面板 */}
        {showSidebar && (
          <View style={[styles.drawerSheet, { backgroundColor: isDark ? '#131313' : '#ffffff', borderTopColor: isDark ? '#262626' : '#eaeaea' }]}>
            {/* 抽屉把手 */}
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: isDark ? '#ffffff' : '#1a1a1a' }]}>🎞️ 曝光档案与后期暗房</Text>
              <TouchableOpacity onPress={() => setShowSidebar(false)} style={styles.drawerCloseBtn}>
                <X size={16} color={isDark ? '#888' : '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.drawerContent}
              keyboardShouldPersistTaps="always"
            >
              {/* 一、光影边框配置面板 */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🖼️ 拟物光影边框 (卡纸装裱)</Text>
                <View style={styles.borderSelectRow}>
                  {(['none', 'white', 'black'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setBorderType(type)}
                      style={[
                        styles.borderSelector,
                        borderType === type ? styles.borderSelectorActive : {},
                        { backgroundColor: type === 'white' ? '#f0f0f0' : (type === 'black' ? '#262626' : 'transparent') }
                      ]}
                    >
                      <Text style={[
                        styles.borderSelText,
                        { color: type === 'white' ? '#1a1a1a' : (type === 'black' ? '#ffffff' : (isDark ? '#888' : '#666')) },
                        borderType === type ? { fontWeight: '900' } : {}
                      ]}>
                        {type === 'none' ? '无边框' : (type === 'white' ? '优雅白框' : '深邃黑框')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {borderType !== 'none' && (
                  <View style={styles.borderOptionsList}>
                    <Text style={styles.optionMiniTitle}>边框元素显示控制：</Text>
                    <View style={styles.optionsWrap}>
                      {[
                        { key: 'showFilmStock', label: '胶卷Logo' },
                        { key: 'showCamera', label: '相机机身' },
                        { key: 'showLens', label: '镜头型号' },
                        { key: 'showDate', label: '拍摄日期' },
                        { key: 'showExposure', label: '曝光参数' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          onPress={() => setBorderOptions(prev => ({ ...prev, [item.key]: !((prev as any)[item.key]) }))}
                          style={[
                            styles.optionItem,
                            (borderOptions as any)[item.key] ? styles.optionItemActive : {},
                            { borderColor: isDark ? '#262626' : '#eaeaea' }
                          ]}
                        >
                          <Text style={[
                            styles.optionItemText,
                            (borderOptions as any)[item.key] ? styles.optionItemTextActive : { color: isDark ? '#888' : '#666' }
                          ]}>
                            {(borderOptions as any)[item.key] ? '✓ ' : ''}{item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 二、拍摄信息 */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>⚙️ {t('roll.shotInfo')}</Text>
                
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>{t('roll.date')}</Text>
                    <TextInput
                      value={editForm.shotDate}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, shotDate: txt }))}
                      onBlur={() => handleSaveChanges()}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={isDark ? '#666' : '#999'}
                      style={[styles.textInput, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>{t('roll.location')}</Text>
                    <TextInput
                      value={editForm.location}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, location: txt }))}
                      onBlur={() => handleSaveChanges()}
                      placeholder={t('roll.inputLocation')}
                      placeholderTextColor={isDark ? '#666' : '#999'}
                      style={[styles.textInput, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>{t('roll.camera')}</Text>
                    <TextInput
                      value={editForm.camera}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, camera: txt }))}
                      onBlur={() => handleSaveChanges()}
                      placeholder={t('roll.inputCamera')}
                      placeholderTextColor={isDark ? '#666' : '#999'}
                      style={[styles.textInput, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>{t('roll.lens')}</Text>
                    <TextInput
                      value={editForm.lens}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, lens: txt }))}
                      onBlur={() => handleSaveChanges()}
                      placeholder={t('roll.inputLens')}
                      placeholderTextColor={isDark ? '#666' : '#999'}
                      style={[styles.textInput, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                    />
                  </View>
                </View>
              </View>

              {/* 三、曝光参数 */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>⚙️ {t('roll.exposure')}</Text>
                
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>{t('roll.aperture')}</Text>
                    <TextInput
                      value={editForm.aperture}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, aperture: txt }))}
                      onBlur={() => handleSaveChanges()}
                      placeholder={t('roll.placeholders.aperture')}
                      placeholderTextColor={isDark ? '#666' : '#999'}
                      style={[styles.textInput, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>{t('roll.shutterSpeed')}</Text>
                    <TextInput
                      value={editForm.shutterSpeed}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, shutterSpeed: txt }))}
                      onBlur={() => handleSaveChanges()}
                      placeholder={t('roll.placeholders.shutterSpeed')}
                      placeholderTextColor={isDark ? '#666' : '#999'}
                      style={[styles.textInput, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>{t('roll.iso')}</Text>
                    <TextInput
                      value={editForm.iso}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, iso: txt }))}
                      onBlur={() => handleSaveChanges()}
                      placeholder={t('roll.placeholders.iso')}
                      placeholderTextColor={isDark ? '#666' : '#999'}
                      style={[styles.textInput, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>{t('roll.exposureCompensation')}</Text>
                    <TextInput
                      value={editForm.exposureCompensation}
                      onChangeText={(txt) => setEditForm(prev => ({ ...prev, exposureCompensation: txt }))}
                      onBlur={() => handleSaveChanges()}
                      placeholder={t('roll.placeholders.exposureCompensation')}
                      placeholderTextColor={isDark ? '#666' : '#999'}
                      style={[styles.textInput, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                    />
                  </View>
                </View>
              </View>

              {/* 三、标签 */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🏷️ {t('roll.tags')}</Text>
                
                <View style={styles.tagInputRow}>
                  <TextInput
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={handleAddTag}
                    returnKeyType="done"
                    placeholder={i18n.language === 'zh-CN' ? '新增自定义标签，回车或点击+号添加...' : 'Add custom tag, press enter or +...'}
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    style={[styles.tagInput, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                  />
                  <TouchableOpacity onPress={handleAddTag} style={styles.tagAddBtn}>
                    <Plus size={16} color="#563b00" />
                  </TouchableOpacity>
                </View>

                <View style={styles.tagsContainer}>
                  {(!roll.tags || roll.tags.length === 0) && tags.length === 0 ? (
                    <Text style={{ fontSize: 11, color: isDark ? '#666' : '#999', fontStyle: 'italic' }}>
                      {t('roll.noTags')}
                    </Text>
                  ) : (
                    <>
                      {/* 胶卷公共标签（只读） */}
                      {roll.tags?.map((tag, index) => (
                        <View key={`roll-${index}`} style={[styles.tagBadge, { backgroundColor: isDark ? '#1a1a1a' : '#eaeaea', borderColor: isDark ? '#333' : '#ddd', borderWidth: 0.5 }]}>
                          <Tag size={12} color={isDark ? '#888' : '#767575'} />
                          <Text style={[styles.tagText, { color: isDark ? '#aaa' : '#666' }]}>{tag}</Text>
                        </View>
                      ))}
                      {/* 照片专属标签（可删除） */}
                      {tags.map((tag) => (
                        <View key={tag} style={[styles.tagBadge, { backgroundColor: isDark ? '#262626' : '#f0f0f0' }]}>
                          <Tag size={12} color="#ffba20" />
                          <Text style={[styles.tagText, { color: isDark ? '#e7e5e5' : '#333' }]}>{tag}</Text>
                          <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={styles.tagDelBtn}>
                            <Text style={{ color: '#ff5252', fontSize: 13, fontWeight: 'bold' }}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              </View>

              {/* 四、存储信息 */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>💾 存储信息</Text>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>文件格式</Text>
                  <View style={styles.infoValueRow}>
                    <Text style={[styles.infoValueText, { color: isDark ? '#ddd' : '#222', fontWeight: 'bold' }]}>
                      {currentFrame.fileFormat 
                        ? (currentFrame.fileFormat.includes('/') ? currentFrame.fileFormat.split('/')[1] : currentFrame.fileFormat).toUpperCase()
                        : '-'}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>文件大小</Text>
                  <View style={styles.infoValueRow}>
                    <Text style={[styles.infoValueText, { color: isDark ? '#ddd' : '#222', fontWeight: 'bold' }]}>
                      {formatFileSize(currentFrame.fileSize)}
                    </Text>
                  </View>
                </View>
              </View>

            </ScrollView>

            {/* 底部保存与下载胶囊操作面板 */}
            <View style={[styles.bottomActionBar, { backgroundColor: isDark ? '#191919' : '#fafafa' }]}>
              {/* 💡 根据当前光影边框配置，智能自适应保存大图或原图到系统相册，顶宽黄金胶囊 */}
              <TouchableOpacity onPress={handleSavePhoto} style={styles.actionBtnActiveFull}>
                <HardDriveDownload size={15} color="#563b00" />
                <Text style={styles.actionBtnActiveFullText}>
                  保存底片
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>

      {/* ========================================================= */}
      {/* 💡 隐形离屏 3600px 高分辨率装裱卡片渲染板 (ViewShot Capture Ref 目标物) */}
      {/* ========================================================= */}
      <View style={styles.hiddenRenderContainer}>
        <ViewShot
          ref={borderViewShotRef}
          options={{ format: 'jpg', quality: 0.95 }}
          style={[
            styles.highResCard,
            { 
              backgroundColor: borderType === 'black' ? '#000000' : '#ffffff',
              aspectRatio: getCardAspectRatio()
            }
          ]}
        >
          {/* 大图装裱区 */}
          <View style={styles.highResImageWrap}>
            <Image
              source={{ uri: currentFrame.imageUrl }}
              style={[
                styles.highResImage,
                rotation !== 0 ? {
                  transform: [
                    { rotate: `${rotation}deg` },
                    { scale: getRotationScale() } // 高精旋转缩放因子对齐，防止立起来时切到白边
                  ]
                } : {}
              ]}
              resizeMode="contain"
            />
          </View>
          
          {/* 拟物高分边框底栏文字说明 */}
          {borderType !== 'none' && (
            <View 
              style={[
                styles.highResInfoBar, 
                { 
                  backgroundColor: borderType === 'black' ? '#000000' : '#ffffff',
                  borderTopColor: borderType === 'black' ? '#111111' : '#f0f0f0'
                }
              ]}
            >
              {/* 左侧胶卷型号 Logo */}
              {borderOptions.showFilmStock && (() => {
                const logoUrl = getBrandLogoUrl(roll.filmStock);
                return (
                  <View style={styles.highResLogoCol}>
                    {logoUrl ? (
                      <ExpoImage 
                        source={{ uri: logoUrl }} 
                        style={[styles.highResBrandIcon, { backgroundColor: 'transparent' }]} 
                        contentFit="contain"
                      />
                    ) : (
                      <View style={styles.highResBrandIcon}>
                        <Text style={styles.highResBrandText}>{brandInitial}</Text>
                      </View>
                    )}
                    <View style={styles.highResBrandLabels}>
                      <Text style={[styles.highResBrandMain, { color: borderType === 'black' ? '#ffffff' : '#1a1a1a' }]}>
                        {roll.filmStock.split(' ')[0].toUpperCase()}
                      </Text>
                      <Text style={[styles.highResBrandSub, { color: borderType === 'black' ? '#888888' : '#555555' }]}>
                        {roll.filmStock.split(' ').slice(1).join(' ').toUpperCase() || 'FILM'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* 右侧 Exif 与曝光信息列 */}
              <View style={styles.highResExifCol}>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {borderOptions.showCamera && (
                    <Text style={[styles.highResExifMain, { color: borderType === 'black' ? '#ffffff' : '#1a1a1a' }]}>
                      {(currentFrame.camera || roll.camera).toUpperCase()}
                    </Text>
                  )}
                  {borderOptions.showLens && (
                    <Text style={[styles.highResExifSub, { color: borderType === 'black' ? '#888888' : '#555555' }]}>
                      {currentFrame.lens || roll.lens}
                    </Text>
                  )}
                </View>

                {/* 竖线分割 */}
                <View style={[styles.highResDivider, { backgroundColor: borderType === 'black' ? '#333333' : '#cccccc' }]} />

                <View style={{ alignItems: 'flex-start', gap: 4 }}>
                  {borderOptions.showDate && (
                    <Text style={[styles.highResExifMain, { color: borderType === 'black' ? '#ffffff' : '#1a1a1a' }]}>
                      {currentFrame.shotDate || roll.shotDate}
                    </Text>
                  )}
                  {borderOptions.showExposure && (
                    <Text style={[styles.highResExifSub, { color: borderType === 'black' ? '#888888' : '#555555' }]}>
                      {renderExposureString()}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </ViewShot>
      </View>

      {/* 导出遮罩层 */}
      {isExporting && (
        <View style={styles.exportingMask}>
          <ActivityIndicator size="large" color="#ffba20" />
          <Text style={styles.exportingText}>⏳ 正在生成高分辨率装裱图像，请稍候...</Text>
        </View>
      )}

    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    alignItems: 'center',
  },
  headerBar: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    maxWidth: '65%',
  },
  imageContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  borderPreviewContainer: {
    width: SCREEN_WIDTH * 0.94,
    aspectRatio: 3/2.06, // 智能高宽比基准比例，极大收窄左右白边
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  borderWhite: {
    backgroundColor: '#ffffff',
    padding: SCREEN_WIDTH * 0.035, // 从 4.5% 缩减为 3.5%，极大地收窄左右边框白边
    paddingBottom: SCREEN_WIDTH * 0.035, // 底部 padding 同步缩减为 3.5%，暴砍底部过宽的空白！
  },
  borderBlack: {
    backgroundColor: '#000000',
    padding: SCREEN_WIDTH * 0.035,
    paddingBottom: SCREEN_WIDTH * 0.035,
  },
  imageWrapper: {
    width: '100%',
    flex: 1, // 💡 绝妙设计：用自适应 Flex 代替写死百分比高度，让图片包装区占据剩下全部空间，图片因此在垂直方向撑得更开，左右白边自动被急剧缩窄
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffba20',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 6,
  },
  
  // 拟物边框实时预览小栏
  borderInfoBar: {
    width: '100%',
    // 💡 绝妙设计：不写死 height，由内容高度自适应撑开（约只占 8% 高度），文字下方绝对无任何大片多余空白！
    borderTopWidth: 0.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8, // 提供恰到好处的优雅顶距缓冲
    paddingBottom: 2, // 极窄底距，彻底解决文字下方多余空白太多的问题！
  },
  borderLogoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandIconMini: {
    width: 26,
    height: 26,
    borderRadius: 5,
    backgroundColor: '#ffba20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  brandTextWrapper: {
    justifyContent: 'center',
  },
  brandTextMain: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandTextSub: {
    fontSize: 7.5,
    fontWeight: '600',
  },
  borderExifCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  borderExifMain: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  borderExifSub: {
    fontSize: 7.5,
    fontWeight: '500',
  },
  borderDivider: {
    width: 1,
    height: 18,
  },

  // 极奢胶囊控制器
  controlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26,26,26,0.15)',
    borderRadius: 24,
    padding: 6,
    marginBottom: 20,
    gap: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  capsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  capsuleBtnActive: {
    backgroundColor: '#ffba20',
  },
  capsuleText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  controlIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 抽屉 Sheet
  drawerSheet: {
    position: 'absolute',
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 100,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  drawerTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  drawerCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  sectionCard: {
    width: '100%',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#ffba20',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  borderSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  borderSelector: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
  },
  borderSelectorActive: {
    borderColor: '#ffba20',
    borderWidth: 1.5,
  },
  borderSelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  borderOptionsList: {
    gap: 8,
    marginTop: 4,
  },
  optionMiniTitle: {
    fontSize: 10,
    color: '#767575',
    fontWeight: 'bold',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  optionItemActive: {
    borderColor: '#ffba20',
    backgroundColor: 'rgba(255,186,32,0.15)',
  },
  optionItemText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  optionItemTextActive: {
    color: '#ffba20',
    fontWeight: '900',
  },

  // 表单排版
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
    gap: 6,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#767575',
  },
  textInput: {
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 11.5,
    fontWeight: '700',
  },
  disabledInput: {
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(128,128,128,0.08)',
    paddingHorizontal: 12,
    fontSize: 11.5,
    fontWeight: '700',
  },
  saveBtn: {
    height: 38,
    backgroundColor: '#ffba20',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#563b00',
  },

  // 标签管理
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  tagAddBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#ffba20',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagDelBtn: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 存储信息
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#767575',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoValueText: {
    fontSize: 10,
    maxWidth: SCREEN_WIDTH * 0.46,
    fontFamily: 'monospace',
  },

  // 底部下载按钮
  bottomActionBar: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 24,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnActive: {
    flex: 1.5,
    height: 38,
    backgroundColor: '#ffba20',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  actionBtnActiveFull: {
    flex: 1,
    height: 40,
    backgroundColor: '#ffba20',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#ffba20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  actionBtnActiveFullText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#563b00',
  },

  // =========================================================
  // 💡 隐形离屏高清卡片渲染板块 (ViewShot 3600px 专用物理模型排版)
  // =========================================================
  hiddenRenderContainer: {
    position: 'absolute',
    left: -9999, // 物理性置于屏幕不可见坐标系外
    top: -9999,
  },
  highResCard: {
    width: 3600, // 锁死 3600px 物理像素
    paddingHorizontal: 126, // 3600 * 3.5% = 126px (自适应窄边框对齐)
    paddingTop: 126,
    paddingBottom: 126, // 3600 * 3.5% = 126px (暴砍底部厚边空白)
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  highResImageWrap: {
    width: '100%',
    flex: 1, // 💡 绝妙设计：提升大图容器为 Flex 撑满，图片在垂直方向最大延展，左右白边自动剧烈压缩
    justifyContent: 'center',
    alignItems: 'center',
  },
  highResImage: {
    width: '100%',
    height: '100%',
  },
  highResInfoBar: {
    width: '100%',
    // 由内容高度自适应，消除死高占比带来的多余空白
    borderTopWidth: 5, // 应用内 0.5px 的 10.6 倍
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 85, // 应用内 8px 的 10.6 倍，优雅顶距缓冲
    paddingBottom: 21, // 应用内 2px 的 10.6 倍，极窄底距缓冲，彻底干掉文字下方空白！
  },
  highResLogoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 64, // 应用内 6px 的 10.6 倍
  },
  highResBrandIcon: {
    width: 276, // 应用内 26px 的 10.6 倍
    height: 276,
    borderRadius: 53, // 应用内 5px 的 10.6 倍
    backgroundColor: '#ffba20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highResBrandText: {
    fontSize: 148, // 应用内 14px 的 10.6 倍
    fontWeight: 'bold',
    color: '#000000',
  },
  highResBrandLabels: {
    justifyContent: 'center',
  },
  highResBrandMain: {
    fontSize: 95, // 应用内 9px 的 10.6 倍
    fontWeight: '900',
    letterSpacing: 5,
  },
  highResBrandSub: {
    fontSize: 80, // 应用内 7.5px 的 10.6 倍
    fontWeight: '600',
  },
  highResExifCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 85, // 应用内 8px 的 10.6 倍
  },
  highResExifMain: {
    fontSize: 90, // 应用内 8.5px 的 10.6 倍
    fontWeight: '700',
  },
  highResExifSub: {
    fontSize: 80, // 应用内 7.5px 的 10.6 倍
    fontWeight: '500',
  },
  highResDivider: {
    width: 10, // 应用内 1px 的 10.6 倍
    height: 190, // 应用内 18px 的 10.6 倍
  },

  // 遮罩层
  exportingMask: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    gap: 12,
  },
  exportingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
