# 🏢 LeaveTrack — Employee Leave Tracker

A full-stack web application for managing employee leave requests, built with **Node.js/Express**, **React**, **SQLite**, and **Docker**.

---

## 📋 Project Description

LeaveTrack allows employees to submit leave requests (annual, sick, unpaid) and lets admins approve or reject them via a dashboard. Authentication is handled with JWT tokens, and the entire system runs with a single `docker-compose up` command.

---

## 🛠 Tech Stack

| Layer          | Technology                  |
|----------------|-----------------------------|
| Frontend       | React 18, React Router v6   |
| Backend        | Node.js, Express.js         |
| Database       | SQLite (via `better-sqlite3`) |
| Auth           | JWT (`jsonwebtoken`) + bcrypt |
| Containerization | Docker, Docker Compose, Nginx |

---

## 🚀 Setup & Run Instructions

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/leave-tracker.git
cd leave-tracker
```

### 2. Configure environment (optional)
```bash
cp .env.example .env
# Edit .env to set a strong JWT_SECRET for production
```

### 3. Start the entire system
```bash
docker-compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3000/api (proxied through Nginx — not directly exposed)
- **DB Viewer (sqlite-web)**: http://localhost:8080

### 4. Demo credentials (auto-seeded)

| Role     | Email                  | Password     |
|----------|------------------------|--------------|
| Admin    | admin@company.com      | password123  |
| Employee | alice@company.com      | password123  |
| Employee | bob@company.com        | password123  |

### 5. Stop the system
```bash
docker-compose down          # stops containers (data persists)
docker-compose down -v       # stops + wipes the SQLite volume
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:3000)                                    │
└───────────────────┬─────────────────────────────────────────────────┘
                    │ HTTP
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Docker: frontend container (Nginx on port 80 → host port 3000)    │
│                                                                     │
│  ┌────────────────────────────┐  ┌──────────────────────────────┐  │
│  │  /  → serve React bundle  │  │  /api/* → proxy_pass         │  │
│  │  (static files in /html)  │  │           http://backend:5000 │  │
│  └────────────────────────────┘  └──────────────┬───────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                                   │ Internal Docker network
                                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Docker: backend container (Node/Express on port 5000)             │
│                                                                     │
│  Routes:                                                           │
│    POST /api/auth/login         → issue JWT                        │
│    POST /api/auth/register      → create employee                  │
│    GET  /api/leaves             → list leaves (role-scoped)        │
│    POST /api/leaves             → submit leave request             │
│    PATCH /api/leaves/:id/status → approve / reject (admin only)   │
│    DELETE /api/leaves/:id       → withdraw pending leave           │
│                                                                     │
│  Middleware: cors → morgan (logging) → authenticate → route handler│
│                                                                     │
│  ⚠️  Port 5000 is internal only — not exposed to the host.        │
│     All API traffic enters via Nginx at localhost:3000/api         │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │ better-sqlite3 (synchronous)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Docker Volume: sqlite_data  →  /app/data/leave_tracker.db        │
│                                                                     │
│  Tables:  users (id, name, email, password_hash, role)             │
│           leaves (id, user_id FK, type, start_date, end_date,      │
│                   reason, status, created_at, updated_at)          │
└─────────────────────────────────────────────────────────────────────┘
                    │ also mounted by
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Docker: sqlite-web container (Flask on port 8080)                 │
│  Live DB browser → http://localhost:8080                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Internal Workflow: How a Leave Request Travels Through the System

This section traces a complete leave request lifecycle from click to database.

### Step 1 — Employee clicks "Submit Request" (React Frontend)
```
EmployeeDashboard.js → handleSubmit()
  └── calls createLeave(form) from src/api/api.js
        └── axios.post("/api/leaves", { type, start_date, end_date, reason })
              └── Interceptor injects: Authorization: Bearer <JWT>
```
The Axios request interceptor in `api.js` reads the JWT from `localStorage` and attaches it to every outgoing request automatically.

### Step 2 — Nginx receives the request
```
Browser → POST http://localhost:3000/api/leaves
  └── Nginx matches location /api/
        └── proxy_pass http://backend:5000
              └── Forwards to Express with headers intact
```
Nginx running inside the `frontend` container acts as a reverse proxy. The browser never directly contacts the backend container — it always goes through Nginx.

### Step 3 — Express middleware chain (Backend)
```
Request enters Express
  ├── cors()      → Checks origin header is allowed
  ├── express.json() → Parses the JSON body into req.body
  ├── morgan()    → Logs "POST /api/leaves 201" to stdout
  └── authenticate middleware (auth.js)
        ├── Reads "Authorization: Bearer <token>"
        ├── jwt.verify(token, SECRET) → decodes payload
        └── Attaches req.user = { id, email, role, name }
```

### Step 4 — Route handler runs (leaves.js)
```javascript
// POST /api/leaves handler
router.post("/", (req, res) => {
  // 1. Validate required fields
  // 2. Check date logic (end >= start)
  // 3. db.prepare(INSERT).run(req.user.id, type, start_date, end_date, reason)
  // 4. Fetch the newly created row and return it as JSON
})
```

### Step 5 — SQLite write
```sql
INSERT INTO leaves (user_id, type, start_date, end_date, reason)
VALUES (2, 'annual', '2025-08-01', '2025-08-05', 'Family vacation');
-- status defaults to 'pending', created_at defaults to datetime('now')
```

### Step 6 — Response flows back
```
SQLite row → Express res.status(201).json(newLeave)
  └── Nginx forwards 201 response to browser
        └── React updates UI with setLeaves([...])
              └── New row appears instantly in the table ✅
```

### Step 7 — Admin approves (PATCH flow)
```
Admin clicks "Approve" → updateStatus(id, "approved")
  └── PATCH /api/leaves/:id/status  { status: "approved" }
        └── authenticate → requireAdmin middleware (blocks non-admins with 403)
              └── Validates status ∈ ['approved','rejected']
                    └── UPDATE leaves SET status='approved' WHERE id=?
                          └── Returns updated row → UI re-fetches and reflects change
```

---

## 📁 Folder Structure

```
leave-tracker/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── database.js       # SQLite init, schema, seed
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT authenticate + requireAdmin
│   │   ├── routes/
│   │   │   ├── auth.js           # /api/auth/login, /api/auth/register
│   │   │   └── leaves.js         # Full CRUD for leave requests
│   │   └── index.js              # Express app entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── api.js            # Axios instance + all API calls
│   │   ├── components/
│   │   │   ├── Navbar.js         # Top navigation bar
│   │   │   ├── StatusBadge.js    # Coloured status pill
│   │   │   └── ProtectedRoute.js # Auth guard for React Router
│   │   ├── context/
│   │   │   └── AuthContext.js    # Global auth state (login/logout)
│   │   ├── pages/
│   │   │   ├── LoginPage.js      # Login form
│   │   │   ├── RegisterPage.js   # Registration form
│   │   │   ├── EmployeeDashboard.js  # Submit + view own leaves
│   │   │   └── AdminDashboard.js     # View all + approve/reject
│   │   ├── App.js                # React Router config
│   │   ├── index.js              # React entry point
│   │   └── index.css             # Global design system
│   ├── public/
│   │   └── index.html
│   ├── nginx.conf                # Nginx: serve React + proxy /api
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml            # Orchestrates all three containers
│                                 #   frontend → :3000
│                                 #   backend  → internal :5000
│                                 #   sqlite-web (DB viewer) → :8080
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔐 API Reference

| Method | Endpoint                     | Auth Required | Role   | Description                     |
|--------|------------------------------|---------------|--------|---------------------------------|
| POST   | `/api/auth/register`         | No            | —      | Create a new employee account   |
| POST   | `/api/auth/login`            | No            | —      | Get a JWT token                 |
| GET    | `/api/health`                | No            | —      | Health check                    |
| GET    | `/api/leaves`                | Yes           | Any    | List leaves (role-scoped)       |
| POST   | `/api/leaves`                | Yes           | Any    | Submit a new leave request      |
| GET    | `/api/leaves/:id`            | Yes           | Any    | Get a specific leave            |
| PATCH  | `/api/leaves/:id/status`     | Yes           | Admin  | Approve or reject a leave       |
| DELETE | `/api/leaves/:id`            | Yes           | Any    | Withdraw a pending leave        |

---

## 🐳 Docker Setup Explanation

### Why two containers?
Separating frontend and backend into independent containers follows the microservices principle — each can be rebuilt, scaled, or redeployed independently.

### `backend` container
- Built from `node:20-alpine` (small footprint).
- Multi-stage build: first stage installs npm packages, second stage is the lean runtime image.
- Runs as a **non-root user** (`appuser`) for security.
- Mounts a **named Docker volume** (`sqlite_data`) so the SQLite database file persists even if the container is destroyed.

### `frontend` container
- Stage 1: `node:20-alpine` runs `npm run build` to produce optimised static files.
- Stage 2: `nginx:alpine` serves those files and proxies `/api/*` → `backend:5000`.
- Nginx uses Docker's internal DNS to resolve the service name `backend`.

### `sqlite-web` container
- Runs [sqlite-web](https://github.com/coleifer/sqlite-web), a lightweight browser-based SQLite viewer.
- Mounts the **same `sqlite_data` volume** as the backend, so it reads the live database file directly — no file copying needed.
- Accessible at **http://localhost:8080** while the stack is running.
- Use it to monitor registrations, leave requests, approvals, and rejections in real-time.

### `depends_on` with health check
`frontend` waits for `backend` to pass its health check (`GET /api/health`) before starting Nginx, ensuring the API is ready before the first browser request arrives.

### Named volume `sqlite_data`
```yaml
volumes:
  sqlite_data:       # managed by Docker, survives container restarts
```
The SQLite `.db` file lives at `/app/data/leave_tracker.db` inside the backend container. This path is mapped to the Docker volume, so data is never lost when you do `docker-compose down`.
