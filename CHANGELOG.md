# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-16

### Added
- Initial release of STARK Todo List
- Modern, minimalist UI with glassmorphism design
- Animated STARK logo with smooth transitions
- Color-coded task statistics (Blue, Orange, Green)
- Light and dark theme support with system preference detection
- Multi-language support (English & Chinese)
- Customizable logo text
- Timezone selection
- Theme mode preferences
- Task management with creation and completion timestamps
- Soft deletion (logical delete) for task preservation
- Task filtering by status (All, Active, Completed)
- Local JSON storage for data persistence
- Responsive design for desktop and mobile
- Docker support with Docker Compose configuration
- Management script (`run.sh`) for easy local deployment
- Smooth animations powered by Framer Motion

### Changed
- Port configuration:
  - Local development: Port 3000
  - Docker deployment: Port 4000

### Technical Stack
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 3.4
- Framer Motion for animations
- Lucide React for icons

---

## How to Update

To update to the latest version:

```bash
git pull origin main
npm install
./run.sh restart
```

For Docker:

```bash
git pull origin main
./docker-start.sh
```
