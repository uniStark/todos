<div align="center">

# ✨ STARK Todo List

<img src="https://img.shields.io/badge/Next.js-15.5.18-black?style=flat-square&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
<img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">

**A minimalist, modern, and highly polished Todo List application built with Next.js**

[English](README.md) | [简体中文](README.zh-CN.md)

[STARK Todo List Preview](https://todo.unistark.dpdns.org/)

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

- **📱 Responsive & PWA**
  - Desktop top tabs + mobile bottom navigation, touch-optimized
  - iPhone safe-area aware (Dynamic Island / home indicator), `100dvh` layouts
  - Installable PWA with a per-user dynamic manifest icon
  - Native iOS/Android packaging via Capacitor (separate build)

- **⚙️ Customization**
  - Multi-language (English & Chinese), customizable logo text
  - **Per-user custom browser tab / PWA icon** — upload by drag, paste, or file picker
  - Timezone selection, optional priority & groups, API-docs toggle, theme preferences

- **📊 Task Management**
  - Create, complete, edit, and delete tasks; groups, priorities (P0/P1/P2), and due dates
  - Quick actions: ⌘/Ctrl+Enter to add, double-click to edit, light toast on completion
  - Creation/completion timestamps; soft deletion (logical delete, data preserved)
  - Filter by status (All, Active, Completed) and by time (Today / Overdue / Upcoming)

- **🤖 AI Assistant** (optional)
  - Conversational task management — add / complete / update / delete via natural language
  - Voice input support
  - Works with any OpenAI-compatible gateway; model list fetched dynamically from `/v1/models`

- **📊 Interactive Analytics Dashboard**
  - Daily Activity trend charts (Creation vs Completion)
  - Task completion timeline (Gantt-style visual)
  - Real-time KPI statistics (Total, Completed, Success Rate)
  - Flexible date ranges (7 Days, 30 Days, All Time)

- **🔐 Multi-user & Security**
  - Registration / login with HttpOnly cookie sessions; change password (revokes other sessions)
  - Each user has fully isolated todos, groups, and AI chat history
  - scrypt-hashed passwords, same-origin (CSRF) checks on writes, in-memory rate limiting, controlled / invite-code registration

- **💾 Data Persistence & Maintenance**
  - SQLite database (better-sqlite3, WAL mode), per-user isolation
  - Automated maintenance sidecar — expired-session cleanup, soft-delete GC, periodic SQLite backups
  - Data survives restarts; fully traceable task history

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for local development)
- Docker (optional, for containerized deployment)

### Option 1: Local Development (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/uniStark/todos.git
   cd todos
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

### Option 2: Docker Deployment

1. **Start with Docker Compose**
   ```bash
   docker compose up -d --build
   ```
   Docker Compose builds the app, starts the container, and stores data in a persistent Docker volume.

2. **Quick update (rebuild and restart)**
   ```bash
   ./docker-update.sh
   ```
   This script will:
   - Stop the current container
   - Pull latest code (if Git repository)
   - Rebuild the Docker image (no cache)
   - Start the new container
   - Display logs automatically

3. **Create the first account / control registration**
   ```bash
   # By default the first account can register when the DB is empty; public
   # registration is then closed. To open public registration:
   echo "ALLOW_REGISTRATION=true" > .env
   # Or switch to invite-code registration (open, but a correct code is required):
   echo "INVITE_CODE=your_invite_code" >> .env
   ```
   On first visit you land on the login page — just register the first account; or bootstrap it from legacy JSON data with the migration script (see "Data migration" below).
   > Auth uses HttpOnly cookie sessions, passwords are scrypt-hashed, and write endpoints enforce same-origin (CSRF) checks. Each user's data is isolated.

4. **Configure AI features (optional)**
   ```bash
   # Leave unset to disable AI-backed features.
   # Works with any OpenAI-compatible gateway (OpenAI / self-hosted proxy / 3rd-party);
   # the model list is fetched dynamically from /v1/models.
   echo "AI_API_KEY=your_api_key" >> .env
   echo "AI_BASE_URL=https://api.openai.com/v1" >> .env   # any OpenAI-compatible endpoint
   echo "AI_DEFAULT_MODEL=gpt-4o-mini" >> .env            # default model
   ```
   > `AI_API_KEY` is optional for base Todo usage. If it is empty, AI-backed features may be unavailable, but Docker Compose configuration still works.

5. **(Optional) Migrate from legacy JSON data**
   ```bash
   # Import old todos.json/groups.json/chat-history.json into SQLite and create the first account.
   # Local: point DATA_DIR at the data dir; Docker: run inside the container with DATA_DIR=/app/data
   DATA_DIR=./data node scripts/migrate-json-to-sqlite.mjs <username> <password>
   ```

6. **Access the application**
   ```
   http://localhost:3002
   ```

6. **Management commands**
   ```bash
   # Stop containers
   docker compose down
   
   # Restart containers
   docker compose restart
   
   # View logs
   docker compose logs -f
   
   # Quick update (rebuild everything)
   ./docker-update.sh
   ```

7. **Data Persistence & Safe Updates**
   - Data is stored in a Docker volume named `todos-data`, which holds the SQLite database (`todos.db` + WAL files) and periodic backups under `backups/`.
   - **Important**: Always use `./docker-update.sh` for updates. Avoid running `docker compose down -v` manually, as the `-v` flag will permanently delete your data volumes.
   - To backup data:
     ```bash
     docker run --rm -v todos_web_todos-data:/data -v $(pwd):/backup alpine tar czf /backup/todos-backup.tar.gz -C /data .
     ```
   - To restore data:
     ```bash
     docker run --rm -v todos_web_todos-data:/data -v $(pwd):/backup alpine tar xzf /backup/todos-backup.tar.gz -C /data
     ```

8. **Clean up (removes data)**
   ```bash
   docker compose down -v
   ```

## 📂 Project Structure

```
Todos/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/                   # API routes
│   │   │   ├── todos/ groups/ stats/   # CRUD + visit stats
│   │   │   ├── auth/              # register / login / logout / me / change-password / icon
│   │   │   ├── ai/                # AI chat & actions
│   │   │   └── health/            # health check
│   │   ├── analytics/             # Insights & charts page
│   │   ├── settings/              # Settings page
│   │   ├── api-docs/              # Interactive API docs
│   │   ├── manifest.webmanifest/  # Per-user dynamic PWA manifest
│   │   └── page.tsx · layout.tsx · globals.css
│   ├── components/                # TodoItem, AnalyticsDashboard, AIChat, VoiceButton, AuthModal, StarkLogo, ...
│   ├── contexts/                  # Auth / Settings / Toast contexts
│   └── lib/
│       ├── db/                    # SQLite layer: index.ts + userRepo / todosRepo / groupsRepo / chatRepo / sessionRepo / statsRepo
│       ├── auth/                  # session & password (scrypt)
│       └── translations.ts · timezones.ts · validation.ts · rateLimit.ts · chatStorage.ts
├── public/                        # Static assets
├── scripts/                       # maintenance.mjs (sidecar), migrate-json-to-sqlite.mjs, restore-sqlite.mjs, ...
├── docker-compose.yml             # app + maintenance sidecar
├── Dockerfile                     # Multi-stage build (.next/cache mount)
├── docker-update.sh               # Rebuild/update script
└── package.json
```

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **Database**: SQLite (better-sqlite3, WAL)
- **Animation**: Framer Motion · **Charts**: Recharts · **Icons**: Lucide React
- **Mobile**: Capacitor (iOS/Android packaging)
- **Containerization**: Docker & Docker Compose

## 📝 Data Model

Data is stored in **SQLite** (`todos.db`) with per-user isolation. Each todo row looks like:

```json
{
  "id": "uuid",
  "userId": "owner-uuid",
  "text": "Task description",
  "completed": false,
  "createdAt": 1705392000000,
  "completedAt": null,
  "deleted": false,
  "deletedAt": null,
  "groupId": "default",
  "priority": "P2",
  "dueDate": "2026-01-31"
}
```

> Legacy JSON files (`todos.json` / `groups.json` / `chat-history.json`) are only used as a one-time import source — see the migration script in Quick Start.

## 🔌 API Reference

The application provides a RESTful API for programmatic access. View the interactive API documentation at `/api-docs` in your browser.

### Authentication

All todos / groups / AI endpoints require login. Call the login endpoint to obtain a session cookie, then send that cookie on subsequent requests:

```bash
# Log in and save the session cookie to a cookie jar
curl -X POST https://your-domain/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "alice", "password": "your_password"}'

# Subsequent requests carry the cookie
curl https://your-domain/api/todos -b cookies.txt
```

> Sessions are HttpOnly cookies (`todo_session`); write endpoints require same-origin (CSRF check). Each user can only access their own data.

### Endpoints

#### Todos API (`/api/todos`)

| Method | Auth | Description |
|--------|------|-------------|
| GET | ✅ | Get the current user's active todos |
| POST | ✅ | Create a new todo |
| PUT | ✅ | Update an existing todo |
| DELETE | ✅ | Soft delete a todo |

**GET /api/todos**
```bash
curl https://your-domain/api/todos -b cookies.txt
```

**POST /api/todos**
```bash
curl -X POST https://your-domain/api/todos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"text": "New task", "groupId": "default", "priority": "P1"}'
```

**PUT /api/todos**
```bash
curl -X PUT https://your-domain/api/todos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"id": "uuid", "completed": true, "text": "Updated text"}'
```

**DELETE /api/todos**
```bash
curl -X DELETE "https://your-domain/api/todos?id=uuid" -b cookies.txt
```

#### Groups API (`/api/groups`)

| Method | Auth | Description |
|--------|------|-------------|
| GET | ✅ | Get the current user's groups |
| POST | ✅ | Create a new group |
| DELETE | ✅ | Delete a group |

**GET /api/groups**
```bash
curl https://your-domain/api/groups -b cookies.txt
```

**POST /api/groups**
```bash
curl -X POST https://your-domain/api/groups \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Work"}'
```

**DELETE /api/groups**
```bash
curl -X DELETE "https://your-domain/api/groups?id=uuid" -b cookies.txt
```

#### Stats API (`/api/stats`)

| Method | Auth | Description |
|--------|------|-------------|
| GET | ❌ | Get PV/UV statistics (public) |
| POST | same-origin | Record a visit (same-origin + rate-limited) |

**GET /api/stats**
```bash
curl https://your-domain/api/stats
```

#### Auth API (`/api/auth/*`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register (gated by `ALLOW_REGISTRATION` / `INVITE_CODE`, first user allowed); body may include `inviteCode`; sets session cookie |
| POST | `/api/auth/login` | ❌ | Log in; sets session cookie |
| POST | `/api/auth/logout` | ✅ | Destroy current session |
| GET | `/api/auth/me` | — | Query current login state and whether registration is open |
| POST | `/api/auth/change-password` | ✅ | Change password (revokes other sessions) |
| GET / POST | `/api/auth/icon` | ✅ | Get / upload the current user's custom icon |

**POST /api/auth/login**
```bash
curl -X POST https://your-domain/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "alice", "password": "your_password"}'
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
- Built with ❤️ by Adrian Stark

---

<div align="center">

**[⬆ Back to Top](#-stark-todo-list)**

Made with ❤️ by Adrian Stark | Powered by Next.js

</div>
