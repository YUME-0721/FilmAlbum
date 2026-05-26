// NOTE: Babel 配置 —— NativeWind v4 依赖 babel-plugin-nativewind 来将
// JSX 中的 className 转译为 React Native 的 style 对象
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
