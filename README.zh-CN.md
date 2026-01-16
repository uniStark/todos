<div align="center">

# ✨ STARK Todo List

<img src="https://img.shields.io/badge/Next.js-15.1.2-black?style=flat-square&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
<img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">

**基于 Next.js 构建的极简、现代、高度精致的待办事项应用**

[English](README.md) | [简体中文](README.zh-CN.md)

![STARK Todo List 预览](https://via.placeholder.com/800x400/f8fafc/1e293b?text=STARK+Todo+List)

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

- **💾 数据持久化**
  - 本地 JSON 存储（无需数据库）
  - 数据在应用重启后保留
  - 完全可追溯的任务历史

## 🚀 快速开始

### 环境要求

- Node.js 18+ (本地开发)
- Docker (可选，用于容器化部署)

### 方案一：本地开发（推荐）

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/stark-todo-list.git
   cd stark-todo-list
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

### 方案二：使用管理脚本

提供了便捷的 Shell 脚本用于轻松管理：

```bash
# 启动应用
./run.sh start

# 停止应用
./run.sh stop

# 重启并清理缓存
./run.sh restart

# 查看日志
./run.sh logs

# 检查状态
./run.sh status
```

### 方案三：Docker 部署

1. **使用 Docker 启动脚本（推荐）**
   ```bash
   ./docker-start.sh
   ```

2. **或手动使用 Docker Compose**
   ```bash
   # 确保 todos.json 存在
   echo "[]" > todos.json
   
   # 使用 Docker Compose 启动
   docker compose up -d
   ```

3. **访问应用**
   ```
   http://localhost:4000
   ```

## 📂 项目结构

```
stark-todo-list/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   └── todos/         # Todo CRUD 端点
│   │   ├── settings/          # 设置页面
│   │   ├── page.tsx           # 主页面
│   │   ├── layout.tsx         # 根布局
│   │   └── globals.css        # 全局样式
│   ├── components/            # React 组件
│   │   └── StarkLogo.tsx      # 动画 Logo
│   ├── contexts/              # React 上下文
│   │   └── SettingsContext.tsx
│   ├── lib/                   # 工具函数
│   │   ├── storage.ts         # JSON 文件操作
│   │   ├── translations.ts    # 国际化翻译
│   │   └── timezones.ts       # 时区数据
│   └── ...
├── public/                    # 静态资源
├── docker-compose.yml         # Docker Compose 配置
├── Dockerfile                 # Docker 镜像配置
├── run.sh                     # 管理脚本
├── docker-start.sh            # Docker 启动脚本
├── todos.json                 # 数据存储文件
└── package.json               # 项目依赖
```

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 3.4
- **动画**: Framer Motion
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
    "deletedAt": null
  }
]
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
