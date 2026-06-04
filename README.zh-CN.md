<div align="center">

# ✨ STARK Todo List

<img src="https://img.shields.io/badge/Next.js-15.5.18-black?style=flat-square&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
<img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">

**基于 Next.js 构建的极简、现代、高度精致的待办事项应用**

[English](README.md) | [简体中文](README.zh-CN.md)

[STARK Todo List 预览](https://todo.unistark.dpdns.org/)

</div>

---

## 🎯 功能特性

- **🎨 现代化 UI/UX 设计**
  - 精美的动画 Logo，流畅过渡效果
  - 毛玻璃卡片与背景模糊特效
  - Framer Motion 驱动的丝滑动画
  - 色彩编码的任务统计（蓝色、橙色、绿色）

- **🌓 主题支持**
  - 浅色模式，鲜艳渐变
  - 深色模式，专业美学
  - 系统主题自动检测
  - 无缝主题切换

- **📱 响应式设计**
  - 桌面端优化的顶部导航标签
  - 移动端友好的底部导航栏
  - 触摸优化的交互元素
  - 所有屏幕尺寸的自适应布局

- **⚙️ 个性化定制**
  - 多语言支持（中文和英文）
  - 可自定义 Logo 文字
  - 时区选择
  - 主题模式偏好设置

- **📊 任务管理**
  - 创建、完成和删除任务
  - 任务创建和完成时间戳
  - 软删除（逻辑删除，保留数据）
  - 按状态筛选任务（全部、进行中、已完成）

- **📊 交互式数据分析仪表盘**
  - 每日动态趋势图（创建 vs 完成）
  - 任务完成时间轴（甘特图视觉效果）
  - 实时 KPI 指标统计（总数、完成数、成功率）
  - 灵活的时间范围选择（7天、一个月、所有时间）

- **🔐 多用户与数据隔离**
  - 用户注册 / 登录，基于 HttpOnly cookie 会话
  - 每个用户拥有独立私有的任务、分组与 AI 聊天记录
  - 密码 scrypt 哈希存储，写接口同源（CSRF）校验，受控注册开关

- **💾 数据持久化**
  - SQLite 数据库（better-sqlite3，WAL 模式）
  - 数据在应用重启后保留
  - 完全可追溯的任务历史

## 🚀 快速开始

### 环境要求

- Node.js 18+ (本地开发)
- Docker (可选，用于容器化部署)

### 方案一：本地开发（推荐）

1. **克隆仓库**
   ```bash
   git clone https://github.com/uniStark/todos.git
   cd todos
   ```

2. **安装依赖**
   ```bash
   npm install
   # 或
   pnpm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   # 或
   pnpm dev
   ```

4. **打开浏览器**
   ```
   http://localhost:3000
   ```

### 方案二：Docker 部署

1. **使用 Docker Compose 启动**
   ```bash
   docker compose up -d --build
   ```
   Docker Compose 会构建应用、启动容器，并使用 Docker 卷持久化数据。

2. **快速更新（重新构建并重启）**
   ```bash
   ./docker-update.sh
   ```
   此脚本会：
   - 停止当前容器
   - 拉取最新代码（如果是 Git 仓库）
   - 重新构建 Docker 镜像（无缓存）
   - 启动新容器
   - 自动显示日志

3. **创建首个账户 / 控制注册**
   ```bash
   # 默认：数据库为空时允许注册首个账户，之后公开注册关闭。
   # 开放公开注册：
   echo "ALLOW_REGISTRATION=true" > .env
   # 或改为“凭邀请码注册”（开放注册但需提供正确邀请码）：
   echo "INVITE_CODE=your_invite_code" >> .env
   ```
   首次访问应用会进入登录页，直接注册首个账户即可；或用迁移脚本从旧 JSON 数据引导首账户（见下方「数据迁移」）。
   > 认证基于 HttpOnly cookie 会话，密码以 scrypt 哈希存储，写接口做同源（CSRF）校验。每个用户的数据互相隔离。

4. **配置 AI 功能（可选）**
   ```bash
   # 不配置时，AI 相关功能不可用，但基础 Todo 功能可正常使用。
   # 支持任意 OpenAI 兼容网关（OpenAI / 自建代理 / 第三方），模型列表会动态从 /v1/models 拉取
   echo "AI_API_KEY=your_api_key" >> .env
   echo "AI_BASE_URL=https://api.openai.com/v1" >> .env   # 任意 OpenAI 兼容端点
   echo "AI_DEFAULT_MODEL=gpt-4o-mini" >> .env            # 默认模型
   ```
   > `AI_API_KEY` 仅用于 AI 功能，基础 Todo 使用不需要配置；即使留空，Docker Compose 配置也可正常解析。

5. **（可选）从旧版 JSON 数据迁移**
   ```bash
   # 把旧的 todos.json/groups.json/chat-history.json 导入 SQLite，并创建首个账户
   # 本地：DATA_DIR 指向数据目录；Docker：在容器内执行，DATA_DIR=/app/data
   DATA_DIR=./data node scripts/migrate-json-to-sqlite.mjs <用户名> <密码>
   ```

6. **访问应用**
   ```
   http://localhost:3002
   ```

6. **管理命令**
   ```bash
   # 停止容器
   docker compose down
   
   # 重启容器
   docker compose restart
   
   # 查看日志
   docker compose logs -f
   
   # 快速更新（重新构建所有内容）
   ./docker-update.sh
   ```

7. **数据持久化与安全更新**
   - 数据存储在名为 `todos-data` 的 Docker 卷中，持久化存储 `todos.json` 和 `stats.json`。
   - **重要提示**：在更新容器时，请务必使用 `./docker-update.sh`。不要手动运行 `docker compose down -v`，因为 `-v` 参数会永久删除您的所有数据卷。
   - 备份数据：
     ```bash
     docker run --rm -v todos_web_todos-data:/data -v $(pwd):/backup alpine tar czf /backup/todos-backup.tar.gz -C /data .
     ```
   - 恢复数据：
     ```bash
     docker run --rm -v todos_web_todos-data:/data -v $(pwd):/backup alpine tar xzf /backup/todos-backup.tar.gz -C /data
     ```

8. **清理（会删除数据）**
   ```bash
   docker compose down -v
   ```

## 📂 项目结构

```
Todos/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   └── todos/         # Todo CRUD 端点
│   │   ├── analytics/         # 数据分析与图表页面
│   │   ├── settings/          # 设置页面
│   │   ├── page.tsx           # 主页面
│   │   ├── layout.tsx         # 根布局
│   │   └── globals.css        # 全局样式
│   ├── components/            # React 组件
│   │   ├── StarkLogo.tsx      # 动画 Logo
│   │   └── AnalyticsDashboard.tsx # 数据可视化组件
│   ├── contexts/              # React 上下文
│   │   └── SettingsContext.tsx
│   ├── lib/                   # 工具函数
│   │   ├── storage.ts         # JSON 文件操作
│   │   ├── translations.ts    # 国际化翻译
│   │   └── timezones.ts       # 时区数据
│   └── ...
├── public/                    # 静态资源
├── scripts/
│   ├── generate-icons.js      # 图标生成脚本
│   ├── generate-mock-data.js  # 演示数据生成脚本
│   └── build-mobile.mjs       # Capacitor 静态构建辅助脚本
├── docker-compose.yml         # Docker Compose 配置
├── Dockerfile                 # Docker 镜像配置
├── docker-update.sh           # Docker 重建/更新脚本
├── todos.json                 # 数据存储文件
└── package.json               # 项目依赖
```

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 3.4
- **动画**: Framer Motion
- **图表**: Recharts
- **图标**: Lucide React
- **容器化**: Docker & Docker Compose

## 📝 数据格式

任务存储在 `todos.json` 中，格式如下：

```json
[
  {
    "id": "uuid",
    "text": "任务描述",
    "completed": false,
    "createdAt": 1705392000000,
    "completedAt": null,
    "deleted": false,
    "deletedAt": null,
    "groupId": "default",
    "priority": "P2"
  }
]
```

## 🔌 API 接口文档

应用提供 RESTful API 用于程序化访问。在浏览器中访问 `/api-docs` 可查看交互式 API 文档。

### 认证方式

所有任务 / 分组 / AI 接口都需要登录。先调用登录接口拿到会话 cookie，后续请求携带该 cookie 即可：

```bash
# 登录并把会话 cookie 保存到 cookie jar
curl -X POST https://your-domain/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "alice", "password": "your_password"}'

# 后续请求携带 cookie
curl https://your-domain/api/todos -b cookies.txt
```

> 会话基于 HttpOnly cookie（`todo_session`），写接口要求同源（CSRF 校验）。每个用户只能访问自己的数据。

### 接口列表

#### 任务接口 (`/api/todos`)

| 方法 | 认证 | 描述 |
|------|------|------|
| GET | ✅ | 获取当前用户的活跃任务 |
| POST | ✅ | 创建新任务 |
| PUT | ✅ | 更新现有任务 |
| DELETE | ✅ | 软删除任务 |

**GET /api/todos**
```bash
curl https://your-domain/api/todos -b cookies.txt
```

**POST /api/todos**
```bash
curl -X POST https://your-domain/api/todos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"text": "新任务", "groupId": "default", "priority": "P1"}'
```

**PUT /api/todos**
```bash
curl -X PUT https://your-domain/api/todos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"id": "uuid", "completed": true, "text": "更新后的文本"}'
```

**DELETE /api/todos**
```bash
curl -X DELETE "https://your-domain/api/todos?id=uuid" -b cookies.txt
```

#### 分组接口 (`/api/groups`)

| 方法 | 认证 | 描述 |
|------|------|------|
| GET | ✅ | 获取当前用户的分组 |
| POST | ✅ | 创建新分组 |
| DELETE | ✅ | 删除分组 |

**GET /api/groups**
```bash
curl https://your-domain/api/groups -b cookies.txt
```

**POST /api/groups**
```bash
curl -X POST https://your-domain/api/groups \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "工作"}'
```

**DELETE /api/groups**
```bash
curl -X DELETE "https://your-domain/api/groups?id=uuid" -b cookies.txt
```

#### 统计接口 (`/api/stats`)

| 方法 | 认证 | 描述 |
|------|------|------|
| GET | ❌ | 获取 PV/UV 统计 |
| POST | ❌ | 更新访问统计 |

**GET /api/stats**
```bash
curl https://your-domain/api/stats
```

#### 认证接口 (`/api/auth/*`)

| 方法 | 端点 | 认证 | 描述 |
|------|------|------|------|
| POST | `/api/auth/register` | ❌ | 注册（受 `ALLOW_REGISTRATION` / `INVITE_CODE` 控制，首用户放行），body 可含 `inviteCode`，成功后种会话 cookie |
| POST | `/api/auth/login` | ❌ | 登录，成功后种会话 cookie |
| POST | `/api/auth/logout` | ✅ | 注销当前会话 |
| GET | `/api/auth/me` | — | 查询当前登录态与是否开放注册 |

**POST /api/auth/login**
```bash
curl -X POST https://your-domain/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "alice", "password": "your_password"}'
```

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

更多详情请查看 [贡献指南](CONTRIBUTING.md)。

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 基于 [Next.js](https://nextjs.org/) 构建
- UI 设计灵感来自现代极简主义
- 由 STARK 用 ❤️ 打造

---

<div align="center">

**[⬆ 返回顶部](#-stark-todo-list)**

由 STARK 用 ❤️ 制作 | 基于 Next.js

</div>
