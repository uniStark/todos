# STARK Todo List 🚀

一个基于 Next.js 开发的、具有极致简约审美与黑白色调科技风的 Todo List 应用。本项目采用前后端分离架构，数据持久化存储于本地 JSON 文件。

## ✨ 项目特性

- **科技感 UI/UX**：
  - **粒子特效 Logo**：主页中心拥有动态粒子化“STARK”Logo，支持鼠标实时交互与磁力排斥效果。
  - **丝滑动画**：使用 `framer-motion` 实现任务添加、删除、状态切换时的平滑过渡与物理弹簧效果。
  - **自适应主题**：完美适配 macOS/Windows 系统深色模式与浅色模式。
- **核心功能**：
  - **时间追踪**：记录并展示每个任务的创建时间与完成时间。
  - **逻辑删除**：任务删除后不会从物理磁盘移除，而是标记为 `deleted`，确保数据可追溯。
  - **本地持久化**：无需数据库配置，数据自动存储在根目录下的 `todos.json`。
- **现代化架构**：
  - **前端**：Next.js 15 (App Router) + Tailwind CSS + Lucide React。
  - **后端**：Next.js API Routes。
  - **管理**：提供一键式本地管理脚本。

## 🛠️ 快速启动

### 方案一：本地运行（推荐）

本项目提供了一个全自动管理脚本 `run.sh`：

1. **启动应用**：
   ```bash
   ./run.sh start
   ```
   *脚本会自动安装依赖并在后台启动应用。*

2. **停止应用**：
   ```bash
   ./run.sh stop
   ```

3. **常用命令**：
   - `./run.sh restart`：彻底重启并清理缓存。
   - `./run.sh logs`：查看运行日志。
   - `./run.sh status`：查看运行状态。

### 方案二：Docker Compose 运行

如果您更倾向于容器化部署：

```bash
docker compose up -d
```

应用启动后，请访问：[http://localhost:3000](http://localhost:3000)

## 📂 项目结构

```text
├── src/
│   ├── app/           # Next.js App Router (页面与 API)
│   ├── components/    # 粒子 Logo 等 React 组件
│   ├── lib/           # 数据读写工具类
│   └── globals.css    # 全局样式与 Tailwind 指令
├── run.sh             # 本地一键管理脚本
├── todos.json         # 数据存储文件
├── Dockerfile         # 镜像构建配置
└── package.json       # 项目依赖
```

## 📝 持久化数据说明

数据保存在项目根目录的 `todos.json` 中。
- **创建时间**：`createdAt` (Timestamp)
- **完成时间**：`completedAt` (Timestamp)
- **删除标记**：`deleted: true` (逻辑删除)

## 🤝 贡献与反馈

如果您有任何建议或发现了 Bug，欢迎随时交流。

---
*Powered by Next.js & & Gemini 3 Flash & STARK Design*
*THINKS CURSOR BY MAC*