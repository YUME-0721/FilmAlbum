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

居流相册（Film Album）是一款专为胶片摄影爱好者打造的社交与管理平台。它不仅是一个展示作品的舞台，更是一个全方位的胶片档案管理系统，支持多端图床同步、高清原图存储以及深度的胶片信息管理。

---

## ✨ 核心特性

- 📸 **专业胶片管理**：支持胶卷型号、ISO、画幅、冲洗工艺及相机镜头的深度关联与展示。
- 🚀 **大文件直传方案**：
  - **HuggingFace 直传**：通过 S3 预签名 URL 模式，彻底绕过 Cloudflare 100MB 限制。
  - **分块上传**：支持 Telegram、CloudFlare R2、S3、Discord 等渠道的高效分块存储（8MB/块）。
- 🎨 **极速访问体验**：基于 WebP 格式的智能预览图系统，列表页秒开，单张页加载原图。
- 🛡️ **数据安全保障**：逐张上传同步策略，确保在大批量照片上传时网络波动不丢失数据。
- ⚙️ **灵活图床策略**：支持针对头像、影集、设备等不同类型自定义存储路径与渠道。

---

## 🚀 极速部署指南 (Quick Start)

得益于 GitHub Actions，你可以在不打开 Cloudflare 后台的情况下完成 99% 的部署工作。

### 第一步：准备 Cloudflare 凭据
1.  **Account ID**：登录 [Cloudflare](https://dash.cloudflare.com/)，在首页右侧复制 `Account ID`。
2.  **API Token**：前往 **My Profile** -> **API Tokens** -> **Create Token**，选择 **Edit Cloudflare Workers** 模板，并在权限中额外增加 `账户 -> D1 -> 编辑` 权限。复制生成的令牌。

### 第二步：配置 GitHub Secrets & Variables
在你的 GitHub 仓库中，进入 **Settings** -> **Secrets and variables** -> **Actions**：

#### 1. 添加 Secrets (加密密钥)
| 密钥名称 | 说明 |
| :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | 刚才创建的 API 令牌 |
| `CLOUDFLARE_ACCOUNT_ID` | 你的 Cloudflare 账户 ID |
| `ADMIN_PASSWORD` | **自定义管理员密码**（用于登录 /admin） |

#### 2. 添加 Variables (环境变量)
点击 **Variables** 标签页，添加以下变量：
| 变量名称 | 说明 |
| :--- | :--- |
| `VITE_API_BASE_URL` | **你的后端 API 域名**。例如 `https://api.yourdomain.com`（必须以 https:// 开头） |

### 第三步：触发自动化部署
1.  在 GitHub 仓库页面点击顶部的 **Actions** -> **Deploy to Cloudflare**。
2.  点击 **Run workflow**。
3.  **Action 会自动帮你完成：** 创建 D1 数据库 -> 初始化表结构 -> 设置密码 -> 创建前端项目 -> 发布全栈应用。

---

## ⚠️ 部署后必做：绑定自定义域名

由于浏览器对 `.workers.dev` 和 `.pages.dev` 之间的 Cookie 跨域限制，**你必须使用自定义域名才能正常登录**。

1.  **后端绑定**：在 Cloudflare 中为 `film-album-api` 绑定你在 `VITE_API_BASE_URL` 中填写的域名。
    - 路径：`Workers -> film-album-api -> Triggers -> Custom Domains -> Add`。
2.  **前端绑定**：同理，为 `film-album-web` 绑定你的前端主域名（如 `yourdomain.com`）。
3.  **完成**：访问你的前端域名，进入 `/admin` 登录即可。

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
