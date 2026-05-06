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

居流相册（Film Album）是一款专为胶片摄影爱好者打造的社交与管理平台。它不仅是一个展示作品的舞台，更是一个全方位的胶片档案管理系统。

---

## 🚀 部署指南 (Deployment Guide)

项目采用全栈 **Cloudflare** 方案，部署成本接近 **￥0**。请按照以下步骤依次操作：

### 1. 准备数据库 (D1 Database)
无论采用哪种部署方式，都需先初始化数据库：
1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，点击 **Workers & Pages** -> **D1** -> **Create Database**。
2.  命名为 `film-album-db` 并创建。
3.  **初始化表结构**：点击该数据库 -> **Import** -> 上传本项目中的 `backend/src/db/schema.sql` 并执行。（此方式最稳妥，避免了手动粘贴的错误）

---

### 方案 A：GitHub Actions 自动化部署 (最推荐 🚀)

此方案适合长期使用及 Fork 用户，配置一次后，后续所有 `git push` 将自动同步前后端更新。

#### 1. 准备 Cloudflare 凭据
1.  **Account ID**：在 Cloudflare Dashboard 首页右侧找到 `Account ID`。
2.  **API Token**：前往 **My Profile** -> **API Tokens** -> **Create Token**，选择 **Edit Cloudflare Workers** 模板，确保拥有 D1 和 Worker 编辑权限。

#### 2. 配置 GitHub Secrets
在你的 GitHub 仓库中，进入 **Settings** -> **Secrets and variables** -> **Actions**，添加以下 Secret：
- `CLOUDFLARE_API_TOKEN`: 你的 API 令牌。
- `CLOUDFLARE_ACCOUNT_ID`: 你的账户 ID。

#### 3. 配置环境变量 (可选)
在 **Settings** -> **Secrets and variables** -> **Actions** -> **Variables** 中添加：
- `VITE_API_BASE_URL`: 你的后端 API 域名（用于前端构建打包）。

#### 4. 触发部署
当你向 `main` 分支推送代码或手动运行 Action 时，系统将全自动部署前后端。

---

### 方案 B：命令行部署 (CLI)

适合开发者，通过本地终端快速完成。

#### 1. 后端部署
```bash
cd backend && npm install
npx wrangler login
# 记得在 wrangler.toml 中填入你的 database_id
npx wrangler secret put ADMIN_PASSWORD
npx wrangler deploy
```

#### 2. 前端部署
```bash
npm install
npm run build
# 按照提示上传至 Cloudflare Pages 或关联 GitHub 仓库
```

---

### 2. 关键：解决 Cookie 登录失效
> **⚠️ 注意**：如果前端和后端域名不属于同级（如一个是 `.pages.dev`，一个是 `.workers.dev`），浏览器将限制 Cookie 传输导致登录失效。
> 
> **解决方案**：在 Cloudflare 中为后端 Worker 绑定一个 **Custom Domain**（例如 `api.yourdomain.com`），建议通过网页端 `Workers -> Triggers -> Custom Domains` 手动添加。

### 3. 初始化：通过管理员后台完成配置
访问 `https://your-site.com/admin`，使用 `ADMIN_PASSWORD` 登录后即可在网页上配置图床和邮件服务。

---

## 📸 界面预览

<div align="center">
  <img width="800" src="./Screenshots/home.png" alt="瀑布流主页视图" />
  <br/><br/>
  <img width="800" src="./Screenshots/speace.png" alt="摄影师个人空间" />
  <img width="800" src="./Screenshots/pic.png" alt="数字观片台与胶片档案" />
</div>

---

## 📄 开源协议
本项目采用 [MIT License](LICENSE) 开源协议。
