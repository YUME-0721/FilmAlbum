<div align="center">
  <img width="100%" src="./Screenshots/logo.webp" alt="logo" />
  <br/>
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/YUME-0721/FilmAlbum&root=backend"><img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare Workers" /></a>
  <br/><br/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Hono-E36022?style=for-the-badge&logo=hono&logoColor=white" />
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare-workers&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <br/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
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
*   **🛡️ 分级权限系统**：三级用户权限（LV1 只读 / LV2 标准 / LV3 无限），通过隐藏后台灵活管理。

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

## 🚀 部署指南 (Deployment Guide)

项目采用全栈 **Cloudflare** 方案，部署成本接近 **￥0**。请按照以下步骤依次操作：

### 方案 A：图形化部署 (推荐 🌟)

如果你不想使用命令行，可以完全通过 Cloudflare 网页后台完成部署。

#### 1. 后端部署 (Workers + D1)
1.  **创建数据库**：
    - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，点击 **Workers & Pages** -> **D1** -> **Create Database**。
    - 命名为 `film-album-db`。
    - **初始化表结构**：进入该数据库的 **Console** 页面，从本项目 GitHub 仓库复制 `backend/src/db/schema.sql` 的内容，粘贴并点击 **Execute**。
2.  **创建并关联 Worker**：
    - 点击 **Workers & Pages** -> **Create Application** -> **Create Worker**。
    - 命名为 `film-album-api` 并点击部署（初始代码无关紧要）。
    - 进入 Worker 详情页，选择 **Settings** -> **Git Integration** -> **Connect to Git**。
    - 选择你的仓库。在配置页面，将 **Root Directory** 设置为 `backend`。
3.  **配置变量与绑定**：
    - **绑定数据库**：在 Worker 的 **Settings** -> **Bindings** 中，点击 **Add Binding** -> **D1 Database**。变量名填 `DB`，数据库选择 `film-album-db`。
    - **设置密码**：在 **Settings** -> **Variables** 中，点击 **Add Secret**。变量名填 `ADMIN_PASSWORD`，值为你的管理员密码。

#### 2. 前端部署 (Pages)
1.  点击 **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**。
2.  选择仓库。在构建设置中：
    - **Framework preset**: `Vite`
    - **Build command**: `npm run build`
    - **Build output directory**: `dist`
3.  **配置环境变量**：点击 **Add Environment Variable**，添加 `VITE_API_BASE_URL`，值为你的后端 Worker 地址（例如：`https://film-api.xxx.workers.dev/api`）。

---

### 方案 B：命令行部署 (CLI)

适合开发者，通过本地终端快速完成。

#### 1. 后端部署
1.  **安装并登录**：
    ```bash
    cd backend && npm install
    npx wrangler login
    ```
2.  **创建数据库**：
    ```bash
    npx wrangler d1 create film-album-db
    ```
    *记下 `database_id` 并更新到 `backend/wrangler.toml`。*
3.  **初始化与部署**：
    ```bash
    npx wrangler d1 execute film-album-db --remote --file=./src/db/schema.sql
    npx wrangler secret put ADMIN_PASSWORD
    npx wrangler deploy
    ```

#### 2. 前端部署
直接在 Cloudflare Pages 后台关联 GitHub 仓库即可。

---

### 3. 关键：解决 Cookie 登录失效 (域名绑定)

> **⚠️ 注意**：如果前端和后端域名不属于同级（例如一个是 `.pages.dev`，一个是 `.workers.dev`），由于浏览器限制，登录会失效。
> 
> **解决方案**：在 Cloudflare 中为后端 Worker 绑定一个 **Custom Domain**（例如 `api.yourdomain.com`），并将前端的 `VITE_API_BASE_URL` 指向它。

---

### 4. 初始化：通过管理员后台完成配置

访问 `https://your-site.com/admin`，使用 `ADMIN_PASSWORD` 登录后，可直接在网页上配置图床和邮件服务。

| 配置项 | 说明 |
|--------|------|
| 🖼️ **图床配置** | 填写图床地址和 API Token |
| 📧 **邮件配置** | 填写 Resend API Key 和发件人地址，可发测试邮件验证 |
| 👥 **开放注册** | 控制是否允许新用户公开注册 |
| 🌐 **默认语言** | 设置网站全局默认语言（中文 / English） |
| 📁 **LV2 影集上限** | 设置 LV2 用户可创建的影集数量上限 |
| 👤 **用户管理** | 查看所有用户，修改用户等级，手动创建账号 |

---

## 🛡️ 用户权限等级

| 等级 | 权限说明 |
|------|---------|
| **LV1**（默认） | 只读权限：可浏览所有内容，但无法发帖、创建影集、添加设备或评论 |
| **LV2** | 标准权限：可使用全部功能，但影集数量有上限（后台可配置，默认 10 个） |
| **LV3** | 无限制权限：完全解锁，无任何数量限制 |

> 新注册用户默认为 LV1，需要管理员在 `/admin` 后台手动升级等级。

---

## 📸 界面预览

<div align="center">
  <img width="800" src="./Screenshots/home.png" alt="瀑布流主页视图" />
  <br/><br/>
  <img width="800" src="./Screenshots/speace.png" alt="摄影师个人空间" />
  <img width="800" src="./Screenshots/pic.png" alt="数字观片台与胶片档案" />
  <br/><br/>
</div>

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

<p align="center">由 <b>Antigravity</b> 驱动，用心记录每一格感光面积。</p>
