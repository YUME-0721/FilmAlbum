<div align="center">
  <img width="100%" src="./Screenshots/logo.webp" alt="logo" />
  <br/>
  <a href="https://github.com/YUME-0721/FilmAlbum/actions"><img src="https://github.com/YUME-0721/FilmAlbum/actions/workflows/deploy.yml/badge.svg" alt="Deploy Status" /></a>
  <br/><br/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Hono-E36022?style=for-the-badge&logo=hono&logoColor=white" />
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare-workers&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
</div>

# 居流相册 (Film Album)

> **属于胶片摄影师的数字角落。让每一卷底片，都在数字世界找到最美的一站。**

居流相册（Film Album）是一款专为胶片摄影爱好者打造的社交与管理平台。它不仅是一个展示作品的舞台，更是一个全方位的胶片档案管理系统。

---

## 🚀 极速部署指南 (Quick Start)

得益于 GitHub Actions，你可以在不打开 Cloudflare 后台的情况下完成 99% 的部署工作。

### 第一步：准备 Cloudflare 凭据
1.  **Account ID**：登录 [Cloudflare](https://dash.cloudflare.com/)，在首页右侧复制 `Account ID`。
2.  **API Token**：
    - 前往 **My Profile** -> **API Tokens** -> **Create Token**。
    - 选择 **Edit Cloudflare Workers** 模板。
    - **重要**：在权限中点击“添加更多”，增加 `账户 -> D1 -> 编辑` 权限。
    - 复制并保存生成的令牌。

### 第二步：配置 GitHub Secrets
在你的 GitHub 仓库中，进入 **Settings** -> **Secrets and variables** -> **Actions**，点击 **New repository secret** 添加以下三个密钥：

| 密钥名称 | 说明 |
| :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | 刚才创建的 API 令牌 |
| `CLOUDFLARE_ACCOUNT_ID` | 你的 Cloudflare 账户 ID |
| `ADMIN_PASSWORD` | **自定义管理员密码**（用于登录 /admin） |

### 第三步：触发自动化部署
1.  在 GitHub 仓库页面点击顶部的 **Actions** 标签。
2.  在左侧选择 **Deploy to Cloudflare**。
3.  点击右侧的 **Run workflow** -> **Run workflow**。
4.  **Action 会自动帮你完成：** 创建 D1 数据库 -> 初始化表结构 -> 设置管理员密码 -> 发布前后端。

---

## ⚠️ 部署后必做：绑定自定义域名 (解决登录失效)

由于浏览器对 `.workers.dev` 和 `.pages.dev` 之间的 Cookie 跨域限制，**默认域名无法登录管理员后台**。

**解决方案：**
1.  在 Cloudflare 中为后端 Worker 绑定一个 **Custom Domain**（例如 `api.yourdomain.com`）。
    - 路径：`Workers -> film-album-api -> Triggers -> Custom Domains -> Add Custom Domain`。
2.  访问 `https://your-site.com/admin`，填入刚才设置的 `ADMIN_PASSWORD` 即可开始配置图床。

---

## 📸 界面预览

<div align="center">
  <img width="800" src="./Screenshots/home.png" alt="主页" />
  <br/><br/>
  <img width="800" src="./Screenshots/speace.png" alt="个人空间" />
</div>

---

## 📄 开源协议
本项目采用 [MIT License](LICENSE) 开源协议。
