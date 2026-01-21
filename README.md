<div align="center">

# ✨ STARK Todo List

<img src="https://img.shields.io/badge/Next.js-15.1.2-black?style=flat-square&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
<img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">

**A minimalist, modern, and highly polished Todo List application built with Next.js**

[English](README.md) | [简体中文](README.zh-CN.md)

![STARK Todo List Preview](https://via.placeholder.com/800x400/f8fafc/1e293b?text=STARK+Todo+List)

</div>

---

## 🎯 Features

- **🎨 Modern UI/UX Design**
  - Beautiful animated logo with smooth transitions
  - Glassmorphism cards with backdrop blur effects
  - Smooth animations powered by Framer Motion
  - Color-coded task statistics (Blue, Orange, Green)

- **🌓 Theme Support**
  - Light mode with vibrant gradients
  - Dark mode with professional aesthetics
  - System preference detection
  - Seamless theme switching

- **📱 Responsive Design**
  - Desktop-optimized with top navigation tabs
  - Mobile-friendly with bottom navigation bar
  - Touch-optimized interactive elements
  - Adaptive layouts for all screen sizes

- **⚙️ Customization**
  - Multi-language support (English & Chinese)
  - Customizable logo text
  - Timezone selection
  - Theme mode preferences

- **📊 Task Management**
  - Create, complete, and delete tasks
  - Task creation and completion timestamps
  - Soft deletion (logical delete with data preservation)
  - Filter tasks by status (All, Active, Completed)

- **💾 Data Persistence**
  - Local JSON storage (no database required)
  - Data survives app restarts
  - Fully traceable task history

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for local development)
- Docker (optional, for containerized deployment)

### Option 1: Local Development (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/stark-todo-list.git
   cd stark-todo-list
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

### Option 2: Using Management Script

A convenient shell script is provided for easy management:

```bash
# Start the application
./run.sh start

# Stop the application
./run.sh stop

# Restart with cache cleanup
./run.sh restart

# View logs
./run.sh logs

# Check status
./run.sh status
```

### Option 3: Docker Deployment

1. **Using the Docker startup script (Recommended)**
   ```bash
   ./docker-start.sh
   ```
   The script will:
   - Build and start the Docker container
   - Automatically display backend logs
   - Use Docker volume for data persistence

2. **Or manually with Docker Compose**
   ```bash
   # Start with Docker Compose
   docker compose up -d --build
   
   # View logs
   docker compose logs -f
   ```

3. **Access the application**
   ```
   http://localhost:4000
   ```

4. **Data Persistence**
   - Data is stored in a Docker volume named `todos-data`
   - To backup data:
     ```bash
     docker run --rm -v stark-todo-list_todos-data:/data -v $(pwd):/backup alpine tar czf /backup/todos-backup.tar.gz -C /data .
     ```
   - To restore data:
     ```bash
     docker run --rm -v stark-todo-list_todos-data:/data -v $(pwd):/backup alpine tar xzf /backup/todos-backup.tar.gz -C /data
     ```

5. **Clean up (removes data)**
   ```bash
   docker compose down -v
   ```

## 📂 Project Structure

```
stark-todo-list/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   └── todos/         # Todo CRUD endpoints
│   │   ├── settings/          # Settings page
│   │   ├── page.tsx           # Main page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   └── StarkLogo.tsx      # Animated logo
│   ├── contexts/              # React contexts
│   │   └── SettingsContext.tsx
│   ├── lib/                   # Utility functions
│   │   ├── storage.ts         # JSON file operations
│   │   ├── translations.ts    # i18n translations
│   │   └── timezones.ts       # Timezone data
│   └── ...
├── public/                    # Static assets
├── docker-compose.yml         # Docker Compose config
├── Dockerfile                 # Docker image config
├── run.sh                     # Management script
├── docker-start.sh            # Docker startup script
├── todos.json                 # Data storage file
└── package.json               # Project dependencies
```

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Containerization**: Docker & Docker Compose

## 📝 Data Format

Tasks are stored in `todos.json` with the following structure:

```json
[
  {
    "id": "uuid",
    "text": "Task description",
    "completed": false,
    "createdAt": 1705392000000,
    "completedAt": null,
    "deleted": false,
    "deletedAt": null
  }
]
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

For more details, see [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Powered by [Next.js](https://nextjs.org/)
- UI Design inspired by modern minimalism
- Built with ❤️ by the STARK

---

<div align="center">

**[⬆ Back to Top](#-stark-todo-list)**

Made with ❤️ by STARK | Powered by Next.js

</div>
