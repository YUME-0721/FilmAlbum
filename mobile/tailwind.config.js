/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: 扫描所有 App 页面与组件文件中的 Tailwind 样式，包含 src/ 目录
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // NOTE: 胶片相册语义化调色盘 —— 以暗色底片美学为主，亮色为辅的双主题配色系统
        // 品牌金色（主色）：暗/亮模式通用
        primary: {
          DEFAULT: '#ffba20',
          dim: '#f0ad00',
          container: '#5e4200',
        },
        'on-primary': '#563b00',
        // NOTE: on-surface 系列：暗色模式用近白，亮色模式用近黑（通过 dark: 变体区分）
        'on-surface': '#1a1a1a',
        'on-surface-dark': '#e7e5e5',
        'on-surface-variant': '#484848',
        'on-surface-variant-dark': '#767575',
        // NOTE: surface 系列：暗色模式用纯黑到近黑，亮色模式用近白到白
        surface: '#f5f5f5',
        'surface-dark': '#0e0e0e',
        'surface-container': '#e8e8e8',
        'surface-container-dark': '#191a1a',
        'surface-container-lowest': '#ffffff',
        'surface-container-lowest-dark': '#000000',
        'surface-container-low': '#f0f0f0',
        'surface-container-low-dark': '#131313',
        'surface-container-high': '#e0e0e0',
        'surface-container-high-dark': '#1f2020',
        'surface-container-highest': '#d8d8d8',
        'surface-container-highest-dark': '#252626',
        'surface-variant': '#e8e8e8',
        'surface-variant-dark': '#252626',
        'surface-bright': '#f8f8f8',
        'surface-bright-dark': '#2b2c2c',
        outline: '#9a9a9a',
        'outline-dark': '#767575',
        'outline-variant': '#c0c0c0',
        'outline-variant-dark': '#484848',
        error: {
          DEFAULT: '#ff5252',
          on: '#ffffff',
        }
      },
      fontFamily: {
        mono: ['Space Grotesk', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
