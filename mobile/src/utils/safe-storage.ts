// NOTE: 动态加载原生 MMKV，仅在此做模块引用，不在顶级作用域实例化任何 MMKV 实例
// HACK: 在 Android 刚启动时，C++ JSI 绑定尚未被注入到 JS 全局对象，此阶段调用 new OriginalMMKV() 必定抛出异常
//       因此严格禁止在顶级作用域实例化 MMKV，所有实例化操作必须延迟至 App.tsx 的 initApp 生命周期后进行
let OriginalMMKV: any = null;
let isOriginalMMKVLoaded = false;
try {
  const mod = require('react-native-mmkv');
  if (mod && typeof mod.MMKV === 'function') {
    OriginalMMKV = mod.MMKV;
    isOriginalMMKVLoaded = true;
  }
} catch (e) {
  // 静默捕获加载失败，降级由后续初始化逻辑处理
}

// NOTE: 动态加载 Expo FileSystem 模块，用作非 JSI 环境下的文件级本地持久化兜底
let FileSystemMod: any = null;
try {
  // NOTE: expo-file-system SDK56 重组了导出，documentDirectory 等静态常量必须从 /legacy 子路径导入
  // 否则 require('expo-file-system') 返回的模块上 documentDirectory 为 undefined，导致备份路径始终为 none
  FileSystemMod = require('expo-file-system/legacy');
} catch (e) {

  // 静默捕获加载失败
}

/**
 * 惰性获取本地持久化文件路径，仅在 Native bridge 常量可用后才返回有效路径
 * NOTE: documentDirectory 在 App 顶级作用域加载时可能为 undefined（RN 尚未完成 Native 注入），
 *       必须使用惰性 Getter 推迟到 App.tsx initApp 生命周期后才可安全调用
 */
let _storageFilePath: string | null = null;
export function getStorageFile(): string | null {
  if (_storageFilePath) return _storageFilePath;
  if (FileSystemMod && FileSystemMod.documentDirectory) {
    _storageFilePath = FileSystemMod.documentDirectory + 'safe_storage_fallback.json';
  }
  return _storageFilePath;
}

// NOTE: 存储初始化就绪 Promise，供 App.tsx 的 initApp 函数 await 等待，确保 Zustand 在数据完全恢复后才读取状态
let resolveReady: () => void;
export const storageReadyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

// NOTE: 预初始化缓冲区：在存储初始化完成前，将所有写入操作暂存于此内存 Map，初始化完成后统一回放合并
// 💡 这是根治 Race Condition 的核心机制：早期的读取不会影响后续从磁盘恢复的数据，写入也不会被丢弃
const preInitBuffer = new Map<string, string | number | boolean>();
let isStorageInitialized = false;
let activeStorage: any = null; // 初始化完成后，统一的最终存储实例（MMKV 原生实例 or MemoryStorage）

// NOTE: 内存存储实现，作为 JSI 未准备就绪或处于 Chrome Debugger 等不支持 JSI 调试环境下的降级方案
let isStoragePreloaded = false; // 💡 仅在文件数据完成加载后才允许回写磁盘，彻底防范早期回写覆盖历史数据

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
    // 💡 仅在磁盘数据被成功预加载并合并完毕后，才允许向磁盘写入，彻底杜绝早期写入清空历史备份的 Race Condition
    if (isStoragePreloaded) {
      persistToDisk();
    }
  }

  delete(key: string): void {
    MemoryStorage.globalData.delete(key);
    if (isStoragePreloaded) {
      persistToDisk();
    }
  }

  clearAll(): void {
    MemoryStorage.globalData.clear();
    if (isStoragePreloaded) {
      persistToDisk();
    }
  }
}

// NOTE: 异步静默写入文件系统，确保在内存模式下修改能够得到完美的跨会话持久化
async function persistToDisk() {
  const file = getStorageFile();
  if (!FileSystemMod || !file) return;
  try {
    const obj = Object.fromEntries(MemoryStorage.globalData.entries());
    await FileSystemMod.writeAsStringAsync(file, JSON.stringify(obj));
  } catch (e) {
    console.warn('[Antigravity SafeStorage] 写入持久化本地缓存文件失败:', e);
  }
}

/**
 * 核心初始化函数 —— 必须在 App.tsx 的 useEffect 中（React 挂载后）调用
 *
 * NOTE: 执行顺序：
 *   1. 尝试创建真实的 OriginalMMKV 原生实例，并执行读写探测以验证其可用性
 *   2. 若原生 MMKV 成功 → 以原生实例作为 activeStorage，立即就绪
 *   3. 若原生 MMKV 失败 → 以 MemoryStorage 作为 activeStorage，异步从磁盘 JSON 文件恢复历史数据
 *   4. 将 preInitBuffer 中早期的写入回放合并入 activeStorage
 *   5. 解决 storageReadyPromise，通知 App.tsx 的 initApp 正式开始读取 Zustand 状态
 */
export async function preloadMemoryStorageFromDisk() {
  if (isStorageInitialized) return;

  // 步骤 1：尝试创建并验证原生 MMKV 实例
  let mmkvInstance: any = null;
  if (isOriginalMMKVLoaded && OriginalMMKV) {
    try {
      mmkvInstance = new OriginalMMKV();
      // 💡 执行读写探测，确认 JSI 绑定在此时点已真正注入
      const TEST_KEY = '__storage_probe__';
      mmkvInstance.set(TEST_KEY, 'ok');
      const probeResult = mmkvInstance.getString(TEST_KEY);
      mmkvInstance.delete(TEST_KEY);
      if (probeResult !== 'ok') {
        throw new Error('MMKV read-write probe failed');
      }
      activeStorage = mmkvInstance;
      console.log('[Antigravity SafeStorage] 原生 MMKV 实例探测成功，已启用高性能原生存储。');
    } catch (error) {
      console.warn('[Antigravity SafeStorage] 原生 MMKV 实例化或探测失败，已自动降级为文件系统兜底持久化存储。', error);
      mmkvInstance = null;
    }
  }

  // 步骤 2：若原生 MMKV 不可用，使用 MemoryStorage + 文件系统备份兜底
  if (!activeStorage) {
    const fallbackMemory = new MemoryStorage();
    activeStorage = fallbackMemory;

    // 步骤 2a：从磁盘 JSON 文件中恢复历史数据
    const file = getStorageFile();
    if (FileSystemMod && file) {
      try {
        const info = await FileSystemMod.getInfoAsync(file);
        if (info.exists) {
          const content = await FileSystemMod.readAsStringAsync(file);
          if (content) {
            const parsed = JSON.parse(content);
            // 💡 磁盘历史数据拥有最高优先级，无条件覆盖 MemoryStorage 中的任何初始值
            for (const [k, v] of Object.entries(parsed)) {
              MemoryStorage.globalData.set(k, v as any);
            }
            console.log('[Antigravity SafeStorage] 从本地持久化文件成功恢复数据，条目数:', Object.keys(parsed).length);
          }
        }
      } catch (e) {
        console.warn('[Antigravity SafeStorage] 读取持久化本地缓存文件失败:', e);
      }
    }

    isStoragePreloaded = true;
  }

  // 步骤 3：将预初始化缓冲区的早期写入回放到 activeStorage
  // NOTE: 回放时，activeStorage 中已有的磁盘恢复数据优先级更高，因此仅回放尚未存在的 key
  if (preInitBuffer.size > 0) {
    console.log('[Antigravity SafeStorage] 回放预初始化缓冲区，条目数:', preInitBuffer.size);
    for (const [k, v] of preInitBuffer.entries()) {
      // 💡 仅当 activeStorage 中不存在该 key 时才回放，确保磁盘恢复的历史数据不被覆盖
      const existingVal = activeStorage.getString?.(k) ?? activeStorage.getNumber?.(k) ?? activeStorage.getBoolean?.(k);
      if (existingVal === undefined || existingVal === null) {
        activeStorage.set(k, v);
      }
    }
    preInitBuffer.clear();
  }

  // 若使用文件系统兜底，在全部合并完成后执行一次主动落盘，确保磁盘文件为最新合并状态
  if (isStoragePreloaded) {
    await persistToDisk();
  }

  isStorageInitialized = true;
  resolveReady();
}

// NOTE: 封装安全的存储代理类
// 在初始化完成前：读操作从 preInitBuffer 读，写操作写入 preInitBuffer
// 在初始化完成后：读写操作直接转发到 activeStorage（原生 MMKV 或 MemoryStorage）
export class MMKV {
  private static hasWarnedFallback = false;
  private options?: any;

  constructor(options?: any) {
    this.options = options;
    // 💡 构造函数不做任何原生实例化，完全惰性化，彻底解除 JSI 时序依赖
  }

  private getStorage() {
    if (isStorageInitialized && activeStorage) {
      return activeStorage;
    }
    // 初始化未完成时返回 null，读写操作将回落到 preInitBuffer
    return null;
  }

  getString(key: string): string | undefined {
    const storage = this.getStorage();
    if (storage) {
      return storage.getString(key);
    }
    const val = preInitBuffer.get(key);
    return typeof val === 'string' ? val : undefined;
  }

  getNumber(key: string): number | undefined {
    const storage = this.getStorage();
    if (storage) {
      return storage.getNumber(key);
    }
    const val = preInitBuffer.get(key);
    return typeof val === 'number' ? val : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const storage = this.getStorage();
    if (storage) {
      return storage.getBoolean(key);
    }
    const val = preInitBuffer.get(key);
    return typeof val === 'boolean' ? val : undefined;
  }

  set(key: string, value: string | number | boolean): void {
    const storage = this.getStorage();
    if (storage) {
      storage.set(key, value);
    } else {
      // 初始化完成前，暂存到预缓冲区，等待 initApp 回放
      preInitBuffer.set(key, value);
    }
  }

  delete(key: string): void {
    const storage = this.getStorage();
    if (storage) {
      storage.delete(key);
    } else {
      preInitBuffer.delete(key);
    }
  }

  clearAll(): void {
    const storage = this.getStorage();
    if (storage) {
      storage.clearAll();
    } else {
      preInitBuffer.clear();
    }
  }
}

export function getStorageDiagnostic() {
  const file = getStorageFile();
  const isUsingMMKV = isStorageInitialized && activeStorage && !(activeStorage instanceof MemoryStorage);
  return {
    isMMKVLoaded: isOriginalMMKVLoaded,
    isMMKVActive: isUsingMMKV,
    isFileSystemLoaded: FileSystemMod !== null,
    storageFile: file ? file.split('/').pop() : 'none',
    storageType: isUsingMMKV ? 'MMKV-Native' : (FileSystemMod ? 'File-Fallback' : 'Memory-Only'),
    preloaded: isStorageInitialized,
    bufferSize: preInitBuffer.size,
  };
}
