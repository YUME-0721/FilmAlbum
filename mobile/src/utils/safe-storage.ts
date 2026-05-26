// NOTE: 动态加载原生 MMKV，兼容 JSI 未就绪环境
let OriginalMMKV: any = null;
let isOriginalMMKVLoaded = false;
try {
  const mod = require('react-native-mmkv');
  if (mod && typeof mod.MMKV === 'function') {
    OriginalMMKV = mod.MMKV;
    isOriginalMMKVLoaded = true;
  }
} catch (e) {
  // 静默捕获加载失败
}

// NOTE: 动态加载 Expo FileSystem 模块，用作非真机/Expo Go 降级时的文件级本地持久化兜底
let FileSystemMod: any = null;
let STORAGE_FILE: string | null = null;
try {
  FileSystemMod = require('expo-file-system');
  if (FileSystemMod && FileSystemMod.documentDirectory) {
    STORAGE_FILE = FileSystemMod.documentDirectory + 'safe_storage_fallback.json';
  }
} catch (e) {
  // 静默捕获加载失败
}

let resolveReady: () => void;
export const storageReadyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

// NOTE: 内存存储实现，作为 JSI 未准备就绪或处于 Chrome Debugger 等不支持 JSI 调试环境下的高可用降级方案
class MemoryStorage {
  public static globalData = new Map<string, string | number | boolean>();

  getString(key: string): string | undefined {
    const val = MemoryStorage.globalData.get(key);
    return typeof val === 'string' ? val : undefined;
  }

  getNumber(key: string): number | undefined {
    const val = MemoryStorage.globalData.get(key);
    return typeof val === 'number' ? val : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const val = MemoryStorage.globalData.get(key);
    return typeof val === 'boolean' ? val : undefined;
  }

  set(key: string, value: string | number | boolean): void {
    MemoryStorage.globalData.set(key, value);
    persistToDisk();
  }

  delete(key: string): void {
    MemoryStorage.globalData.delete(key);
    persistToDisk();
  }

  clearAll(): void {
    MemoryStorage.globalData.clear();
    persistToDisk();
  }
}

// NOTE: 异步静默写入文件系统，确保在内存模式下修改能够得到完美的跨会话持久化
async function persistToDisk() {
  if (!FileSystemMod || !STORAGE_FILE) return;
  try {
    const obj = Object.fromEntries(MemoryStorage.globalData.entries());
    await FileSystemMod.writeAsStringAsync(STORAGE_FILE, JSON.stringify(obj));
  } catch (e) {
    console.warn('[Antigravity SafeStorage] 写入持久化本地缓存文件失败:', e);
  }
}

// NOTE: 启动时静默从文件系统恢复数据
let isStoragePreloaded = false;
export async function preloadMemoryStorageFromDisk() {
  if (isStoragePreloaded) return;
  if (!FileSystemMod || !STORAGE_FILE) {
    isStoragePreloaded = true;
    resolveReady();
    return;
  }
  try {
    const info = await FileSystemMod.getInfoAsync(STORAGE_FILE);
    if (info.exists) {
      const content = await FileSystemMod.readAsStringAsync(STORAGE_FILE);
      if (content) {
        const parsed = JSON.parse(content);
        for (const [k, v] of Object.entries(parsed)) {
          MemoryStorage.globalData.set(k, v as any);
        }
        console.log('[Antigravity SafeStorage] 从本地持久化文件成功恢复了缓存配置项:', Object.keys(parsed));
      }
    }
  } catch (e) {
    console.warn('[Antigravity SafeStorage] 读取持久化本地缓存文件失败:', e);
  } finally {
    isStoragePreloaded = true;
    resolveReady();
  }
}

// 模块加载时立刻异步执行缓存恢复
if (isOriginalMMKVLoaded) {
  // 原生 MMKV 正常工作，立即标记 Ready 状态
  setTimeout(() => resolveReady(), 0);
} else {
  // 需要回退到文件系统持久化方案
  preloadMemoryStorageFromDisk();
}

// NOTE: 封装安全的 MMKV 代理类，防止在 Debug/非真机/JSI 未就绪环境中抛出致命红屏崩溃
export class MMKV {
  private static hasWarned = false;
  private instance: {
    getString: (key: string) => string | undefined;
    getNumber: (key: string) => number | undefined;
    getBoolean: (key: string) => boolean | undefined;
    set: (key: string, value: string | number | boolean) => void;
    delete: (key: string) => void;
    clearAll: () => void;
  };

  constructor(options?: any) {
    if (isOriginalMMKVLoaded && OriginalMMKV) {
      try {
        this.instance = new OriginalMMKV(options);
        return;
      } catch (error) {
        // 若原生实例化仍然失败，回退到内存存储
        if (!MMKV.hasWarned) {
          console.warn('[Antigravity SafeStorage] MMKV 初始化失败，已自动降级为高可用内存存储(Memory Storage)。', error);
          MMKV.hasWarned = true;
        }
        this.instance = new MemoryStorage();
        return;
      }
    }
    // 原生模块不可用时直接使用内存存储，并一次性输出警告
    if (!MMKV.hasWarned) {
      console.warn('[Antigravity SafeStorage] 原生 MMKV 未能加载，已自动开启带 FileSystem 兜底的持久化高可用内存存储。');
      MMKV.hasWarned = true;
    }
    this.instance = new MemoryStorage();
  }

  getString(key: string): string | undefined {
    return this.instance.getString(key);
  }

  getNumber(key: string): number | undefined {
    return this.instance.getNumber(key);
  }

  getBoolean(key: string): boolean | undefined {
    return this.instance.getBoolean(key);
  }

  set(key: string, value: string | number | boolean): void {
    this.instance.set(key, value);
  }

  delete(key: string): void {
    this.instance.delete(key);
  }

  clearAll(): void {
    this.instance.clearAll();
  }
}
