# FilmAlbum 移动端（Android）

> 胶卷摄影管理应用 · 移动客户端
>
> 基于 **Expo + React Native** 构建，支持 Android。

---

## 目录

- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [环境准备](#环境准备)
- [本地开发](#本地开发)
- [构建 APK / AAB](#构建-apk--aab)
- [核心功能模块](#核心功能模块)
- [关键技术实现](#关键技术实现)
- [状态管理](#状态管理)
- [API 通信](#api-通信)
- [主题与国际化](#主题与国际化)
- [常见问题](#常见问题)

---

## 项目简介

FilmAlbum 移动端是一款面向胶卷摄影师的数字暗房管理应用，提供：

- 📷 **影集管理**：创建和管理胶卷影集（支持 135 / 120 多种画幅规格）
- 🎞️ **底片记录**：逐帧记录光圈、快门、ISO 等曝光参数
- 🖼️ **索引图导出**：在本地生成并导出高清拟物底片联系单（Contact Sheet），分辨率达 3600px 宽
- 🔭 **设备柜**：管理相机机身与镜头的使用记录
- 📡 **云端同步**：与 FilmAlbum 后端 API 实时同步数据
- 🌓 **深色模式**：完整支持系统级深色 / 浅色主题自动切换
- 🌐 **多语言**：支持中文 / 英文（i18n）

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| **运行时框架** | React Native | 0.85.3 |
| **开发平台** | Expo SDK | ~56.0.4 |
| **语言** | TypeScript | ~6.0.3 |
| **UI 框架** | React | 19.2.3 |
| **图标库** | Lucide React Native | ^0.468.0 |
| **样式方案** | NativeWind (Tailwind CSS) | 4.1.23 |
| **状态管理** | Zustand | ^5.0.2 |
| **数据请求** | Axios + TanStack Query | ^1.7.9 / ^5.62.7 |
| **本地存储** | react-native-mmkv (带 FileSystem 降级) | ^4.3.1 |
| **图片截图** | react-native-view-shot | ^4.0.3 |
| **动画引擎** | React Native Reanimated | 4.3.1 |
| **手势处理** | React Native Gesture Handler | ~2.31.1 |
| **图片选择** | expo-image-picker | ~56.0.13 |
| **文件分享** | expo-sharing | ~56.0.13 |
| **国际化** | i18next + react-i18next | ^24.0.5 |
| **SVG 支持** | react-native-svg | ^15.13.0 |

---

## 目录结构

```
mobile/
├── App.tsx                  # 应用根组件，路由注册与全局 Provider 挂载
├── index.ts                 # Expo 入口文件
├── app.json                 # Expo 应用配置（包名、图标、版本等）
├── package.json             # 项目依赖与脚本
├── tsconfig.json            # TypeScript 配置
├── metro.config.js          # Metro 打包器配置
├── tailwind.config.js       # Tailwind/NativeWind 主题配置
├── babel.config.js          # Babel 转换配置
├── android/                 # Android 原生工程目录
│   ├── app/
│   │   ├── build.gradle     # Android 应用构建配置
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/com/filmalbum/app/
│   │           ├── MainApplication.kt   # Expo 原生模块注册
│   │           └── MainActivity.kt
│   └── build.gradle         # 项目级构建配置
├── assets/                  # 静态资源（图标、启动屏等）
└── src/
    ├── api/
    │   └── client.ts        # Axios 实例，含 Auth Token 拦截器
    ├── components/
    │   └── FilmStripCard.tsx # 底片条卡片通用组件
    ├── i18n/                 # 国际化资源文件（中文/英文）
    ├── screens/              # 页面组件
    │   ├── LoginScreen.tsx        # 登录页
    │   ├── DashboardScreen.tsx    # 影集主页（卷列表）
    │   ├── RollDetailScreen.tsx   # 影集详情（底片管理 + 索引图导出）
    │   ├── AddRollScreen.tsx      # 新建影集
    │   ├── ExploreScreen.tsx      # 探索广场
    │   ├── PostDetailScreen.tsx   # 动态帖子详情
    │   ├── GearScreen.tsx         # 设备柜列表
    │   ├── AddGearScreen.tsx      # 添加设备
    │   ├── EditProfileScreen.tsx  # 编辑个人资料
    │   └── SettingsScreen.tsx     # 应用设置
    ├── store/                # Zustand 全局状态
    ├── theme/
    │   └── ThemeContext.tsx  # 深色/浅色主题 Context
    └── utils/
        └── safe-storage.ts  # MMKV + FileSystem 双层持久化存储
```

---

## 环境准备

### 必要工具

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | ≥ 18.0 | 推荐 LTS 版本 |
| npm | ≥ 9.0 | 随 Node.js 安装 |
| JDK | 17 | Android 构建必须 |
| Android Studio | 最新稳定版 | 含 Android SDK |
| Expo Go | 最新版 | 真机预览（可选） |

### Android SDK 配置

在 `~/.bashrc` 或系统环境变量中配置：

```bash
export ANDROID_HOME=$HOME/Android/Sdk   # Windows: 系统属性 → 环境变量
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 安装依赖

```bash
cd mobile
npm install
```

---

## 本地开发

### 启动 Metro 开发服务器

```bash
cd mobile
npx expo start
```

启动后会显示 QR 码，可通过以下方式连接：

- **Expo Go 扫码**（最简单，无需构建 APK）
- **本地模拟器**：按 `a` 自动打开 Android 模拟器
- **热重载**：代码修改后按 `r` 手动触发，`Ctrl+S` 保存自动重载

### TypeScript 类型检查

```bash
cd mobile
npx tsc --noEmit
```

### 调试

- **Metro 日志**：在终端中实时查看 `LOG` / `WARN` / `ERROR`
- **Flipper**：启动后在 Flipper 客户端连接，支持网络请求检查、Redux/Zustand 状态查看
- **Chrome DevTools**：在手机摇晃或模拟器菜单中选择 "Open Debugger" 进入 JS 调试

---

## 构建 APK / AAB

### 方式一：Expo Go 调试构建（推荐用于开发）

```bash
# 直接连接到运行中的 Metro 服务器，无需生成 APK
npx expo start
```

### 方式二：本地原生构建（生成 APK）

```bash
# 确保已配置好 Android SDK 和 JDK 17
npx expo run:android
```

此命令会：
1. 生成 `android/` 目录下的原生 Gradle 工程
2. 调用 Gradle 编译并生成 debug APK
3. 自动安装到连接的 Android 设备或模拟器

### 方式三：生成正式发布版 AAB

```bash
cd android
./gradlew bundleRelease
```

生成的 `.aab` 文件位于：

```
android/app/build/outputs/bundle/release/app-release.aab
```

> **注意**：发布前需要配置签名密钥，在 `android/app/build.gradle` 的 `signingConfigs` 中填入 keystore 路径和密码。

### 方式四：Expo EAS 云端构建（推荐用于分发）

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview    # 生成 APK 供测试
eas build -p android --profile production # 生成 AAB 供上架
```

---

## 核心功能模块

### 📋 影集列表（DashboardScreen）

- 展示当前用户所有胶卷影集
- 支持下拉刷新和分页加载
- 显示影集状态（拍摄中 / 冲洗中 / 已完成）
- 点击进入详情页

### 🎞️ 影集详情（RollDetailScreen）

**底片管理：**
- 展示该影集内全部底片的拟物胶片条界面
- 支持上传相册照片关联到底片
- 支持拖拽排序（乐观更新 + 后端同步）
- 支持删除单张底片

**索引图导出（核心功能）：**
- 在 Android 端本地生成高清拟物底片联系单
- 输出分辨率：**3600 × N 像素**，JPG 格式，体积约 1.5–3MB
- 渲染方式：离屏大画布（`react-native-view-shot`）+ `captureRef`
- 导出后直接唤起系统原生分享菜单（微信、保存相册等）

### 🔭 设备柜（GearScreen）

- 展示用户名下所有相机与镜头设备
- 卡片信息：相机型号、镜头型号、镜头类型、适用画幅、设备状态、关联底片数量
- 支持下拉刷新与删除操作

### 🌐 探索广场（ExploreScreen）

- 浏览社区用户公开发布的胶片摄影动态
- 支持查看单篇动态详情、点赞、评论

---

## 关键技术实现

### 索引图本地高清导出

**问题背景：**

Android 端 Fresco 图片引擎会根据 Image 组件在屏幕上的布局宽度进行降采样解码。如果渲染画布被屏幕物理分辨率限制，截图只能得到低清图片（约 1280px）。

**解决方案：**

```
┌────────────────────────────────────────────────────┐
│  主页面根 View                                       │
│                                                    │
│  ┌─────────────────┐   ┌──────────────────────┐    │
│  │  正常页面内容     │   │  离屏 ViewShot 大画布  │    │
│  │  (用户可见)       │   │  position: absolute  │    │
│  │                 │   │  left: -9999         │    │
│  │                 │   │  width: 3600dp       │    │
│  └─────────────────┘   │  (用户不可见)         │    │
│                        └──────────────────────┘    │
└────────────────────────────────────────────────────┘
```

- `ViewShot` 组件（常驻挂载，非条件渲染）绝对定位到 `left: -9999`，彻底脱离屏幕可视区
- 宽度硬写死为 `3600`，强迫 Fresco 以超高分辨率解码所有底片图片
- 使用 `captureRef(ref, { pixelRatio: 1, width: 3600, quality: 0.8 })` 进行 1:1 像素精确捕获
- 加载完成检测：通过 `onLoad` 回调计数，全部加载后延迟 500ms 触发截图（避免 GPU 未完成渲染）

### 持久化存储降级策略

```
优先使用 react-native-mmkv（原生高性能 KV 存储）
    ↓ 若原生模块加载失败（如 Expo Go 沙盒环境）
降级使用 expo-file-system（基于文件系统的 JSON 存储）
    ↓ 若文件系统也不可用
降级使用内存存储（运行时有效，重启后丢失）
```

实现位置：[`src/utils/safe-storage.ts`](./src/utils/safe-storage.ts)

### 离线容错

所有 API 请求均使用 `try/catch` 包裹：
- 网络正常：请求后端 API，更新真实数据
- 网络异常：使用本地 Mock 数据降级渲染，同时输出 `console.warn` 告知开发者

---

## 状态管理

使用 **Zustand** 进行轻量级全局状态管理：

```
src/store/
├── authStore.ts     # 用户认证状态（Token、用户信息）
└── ...
```

Token 持久化通过 `safe-storage.ts` 工具类实现，在应用启动时自动恢复登录状态。

---

## API 通信

**Axios 实例配置**（[`src/api/client.ts`](./src/api/client.ts)）：

```typescript
// 请求拦截：自动注入 Authorization Bearer Token
// 响应拦截：统一处理 401 未授权（自动跳转登录）
```

**后端 API 基础地址**：在 `client.ts` 中配置 `baseURL`，指向 FilmAlbum 后端服务。

**主要 API 路由：**

| 接口 | 说明 |
|------|------|
| `POST /api/auth/login` | 用户登录 |
| `GET /api/rolls` | 获取影集列表 |
| `GET /api/rolls/:id` | 获取影集详情（含底片） |
| `POST /api/rolls` | 创建影集 |
| `PUT /api/rolls/:id/frames/reorder` | 底片排序 |
| `GET /api/gear` | 获取设备列表 |
| `POST /api/gear` | 添加设备 |
| `GET /api/posts` | 获取广场动态 |
| `POST /api/upload` | 上传图片 |

---

## 主题与国际化

### 深色 / 浅色主题

通过 [`src/theme/ThemeContext.tsx`](./src/theme/ThemeContext.tsx) 提供全局主题 Context：

```typescript
const { isDark } = useTheme();
const textColor = isDark ? '#e7e5e5' : '#1a1a1a';
```

主题跟随系统设置自动切换，也可在 **设置页** 手动覆盖。

### 国际化（i18n）

使用 `i18next` + `react-i18next`，语言文件位于 `src/i18n/`。

```typescript
const { t } = useTranslation();
<Text>{t('dashboard.title')}</Text>
```

当前支持语言：**简体中文（zh-CN）**、**English（en）**

---

## 常见问题

### Q: 安装依赖时报错

```bash
npm install --legacy-peer-deps
```

### Q: Android 构建失败，提示 JAVA_HOME 未设置

在系统环境变量中设置 `JAVA_HOME` 指向 JDK 17 安装目录，例如：

```
JAVA_HOME=C:\Program Files\Java\jdk-17
```

### Q: Expo Go 提示 "MMKV 未能加载"

这是正常现象。Expo Go 是沙盒环境，不支持原生 MMKV 模块。  
应用已自动降级到 FileSystem 持久化存储，功能完全正常。

### Q: 索引图导出显示"排版画布尚未准备完毕"

这是极少数情况下 `react-native-view-shot` 的原生 Ref 未能及时就绪导致的。  
当前已实现 **15 次 × 100ms 自动重试机制**，一般不会出现。  
若仍出现，请先确保影集内的底片图片均已加载完成，再尝试导出。

### Q: 打包后图标显示为默认 Expo 图标

确保 `assets/` 目录下存在以下文件：
- `icon.png`（1024×1024）
- `android-icon-foreground.png`（自适应图标前景）
- `android-icon-background.png`（自适应图标背景）

### Q: API 请求全部失败

检查 `src/api/client.ts` 中的 `baseURL` 是否指向正确的后端服务地址，  
确认后端服务已正常启动，且手机与服务器网络互通。

---

## 许可证

见项目根目录 [LICENSE](./LICENSE) 文件。
