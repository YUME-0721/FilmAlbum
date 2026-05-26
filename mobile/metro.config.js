// NOTE: Metro 打包器配置 —— 集成 NativeWind v4 CSS 编译与 Node.js polyfill
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// NOTE: 将所有对 Node.js 内置 buffer 模块的引用重定向到 npm 的 buffer polyfill 包
// react-native-svg 的 fetchData.ts 中 `import { Buffer } from 'buffer'` 会触发此解析
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
};

// NOTE: withNativeWind 在 Metro 编译链路中注入 Tailwind CSS 处理器，
// 负责将 global.css 中的 @tailwind 指令编译为 React Native 可用的样式对象
module.exports = withNativeWind(config, { input: './global.css' });
