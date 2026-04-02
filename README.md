<div align="center">
<img width="1200" alt="Film Album Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 居流相册 (Film Album)

> **属于胶片摄影师的数字角落。让每一卷底片，都在数字世界找到最美的一站。**

居流相册（Film Album）是一款专为胶片摄影爱好者打造的社交与管理平台。它不仅是一个展示作品的舞台，更是一个全方位的胶片档案管理系统，从镜头型号到扫描参数，完整记录光影背后的每一份细节。

---

## 🌟 项目亮点

*   **🎬 数字化观片台**：模拟传统灯箱观片体验，以胶片长条形式展示整卷底片，支持帧位调整与 EXIF 式元数据记录。
*   **🖼️ 极速视觉流**：主页采用智能瀑布流布局。全面适配 **WebP 预览图技术**，在保证画质的同时实现毫秒级首屏加载。
*   **📷 设备与胶卷库**：内置设备管理模块，追踪相机、镜头的使用频率；支持自定义胶卷型号库，涵盖从 Kodak Portra 到 Cinestill 的全线档案。
*   **🎨 精美边框导出**：一键生成带有品牌 Logo、拍摄参数及边框的视觉长图，完美适配社交媒体分享。
*   **🤝 社区互动**：关注你喜爱的摄影师，点赞、评论、分享，在胶片的世界里不再孤单。

---

## 🛠️ 技术栈

### 前端 (Frontend)
- **核心框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **样式方案**: TailwindCSS 4 + Vanilla CSS
- **动画库**: Framer Motion (motion/react)
- **路由**: React Router 7

### 后端 (Backend)
- **运行环境**: Cloudflare Workers
- **Web 框架**: Hono
- **数据库**: Cloudflare D1 (SQLite-based)
- **鉴权**: JWT (JSON Web Token)
- **图片处理**: 智能 WebP 压缩流

---

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/your-repo/film-album.git
cd film-album
```

### 2. 后端配置与运行
```bash
cd backend
npm install
# 初始化本地数据库
npm run db:init
# 运行后端 API (Local Wrangler Dev)
npm run dev
```

### 3. 前端配置与运行
```bash
# 返回根目录
cd ..
npm install
# 启动前端开发服务器
npm run dev
```

---

## 📦 部署指南

项目基于 **Cloudflare Stack** 构建，可享受几乎零成本的高性能托管。

### 1. 部署后端 (Cloudflare Workers)
1.  登录 Cloudflare 控制台，创建一个 **D1 数据库**（例如：`film-album-db`）。
2.  修改 `/backend/wrangler.toml` 中的 `database_id` 为你刚创建的 ID。
3.  设置环境变量：
    ```bash
    npx wrangler secret put JWT_SECRET      # 设置 JWT 密钥
    npx wrangler secret put IMG_BED_TOKEN  # 设置图床 Token
    ```
4.  部署：`npx wrangler deploy`。

### 2. 初始化生产数据库
```bash
npm run db:init -- --remote
```

### 3. 部署前端 (Cloudflare Pages)
1.  在 Cloudflare Pages 中关联你的项目仓库。
2.  设置构建配置：
    -   **Build command**: `npm run build`
    -   **Build output directory**: `dist`
3.  配置环境变量 `VITE_API_BASE_URL` 指向你的 Workers 地址。

---

## 📸 预览

*(请在此处替换或添加项目的实际屏幕截图)*

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

<p align="center">由 <b>Antigravity</b> 驱动，用心记录每一格感光面积。</p>
