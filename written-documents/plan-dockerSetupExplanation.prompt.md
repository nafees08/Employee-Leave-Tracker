## Docker Setup Explanation

### Overview
The application uses Docker Compose to orchestrate a multi-container setup with separate services for the backend (Node.js/Express API) and frontend (React app served by Nginx). This enables easy development, deployment, and scaling. The setup includes persistent data storage for the SQLite database and internal networking for secure API communication.

---

## Docker Compose Configuration (`docker-compose.yml`)

### Services
- **backend**:
  - Builds from `./backend/Dockerfile`.
  - Runs the Express server on port 5000 inside the container.
  - Environment variables: `NODE_ENV=production`, `PORT=5000`, `JWT_SECRET` (from env or default), `DB_PATH=/app/data/leave_tracker.db`, `CORS_ORIGIN=http://localhost:3000`.
  - Uses a named volume `sqlite_data` mounted to `/app/data` for persistent SQLite storage.
  - Connected to `app_network` for internal communication.
  - Health check: Polls `/api/health` every 15s to ensure the service is ready.

- **frontend**:
  - Builds from `./frontend/Dockerfile` with build arg `REACT_APP_API_URL=/api`.
  - Serves the app on port 80 inside the container, exposed to host port 3000.
  - Depends on the backend being healthy before starting.
  - Connected to `app_network`.

### Volumes
- **sqlite_data**: A local Docker volume to persist the SQLite database file across container restarts and rebuilds.

### Networks
- **app_network**: A bridge network allowing secure communication between backend and frontend containers without exposing internal ports externally.

### Key Behaviors
- `docker compose up --build` builds images if needed and starts both services.
- Backend starts first; frontend waits for backend health check.
- API calls from frontend to `/api/*` are proxied internally via Nginx.

---

## Backend Dockerfile (`backend/Dockerfile`)

### Multi-Stage Build
- **Stage 1 (deps)**: Uses `node:20-alpine` to install dependencies. Copies `package*.json` and runs `npm ci --omit=dev` for production dependencies. This stage is cached separately for faster rebuilds.
- **Stage 2 (runtime)**: Fresh `node:20-alpine` image. Copies node_modules from deps stage, then copies source code (`src` directory). Creates `/app/data` directory for SQLite and sets ownership to a non-root user (`appuser`).

### Security and Runtime
- Runs as non-root user (`appuser`) for security.
- Exposes port 5000.
- Sets production environment variables.
- CMD: `node src/index.js` to start the server.

### Purpose
- Produces a lightweight, secure image with only runtime dependencies.
- Ensures the database directory is writable by the app user.

---

## Frontend Dockerfile (`frontend/Dockerfile`)

### Multi-Stage Build
- **Stage 1 (build)**: Uses `node:20-alpine` to build the React app. Installs dependencies, copies source, sets `REACT_APP_API_URL` (defaults to `/api`), and runs `npm run build` to generate static files in `/app/build`.
- **Stage 2 (serve)**: Uses `nginx:1.25-alpine`. Removes default config, copies custom `nginx.conf`, and copies built files to `/usr/share/nginx/html`.

### Runtime
- Exposes port 80.
- CMD: `nginx -g daemon off;` to run Nginx in foreground.

### Purpose
- Builds the React app in a Node environment, then serves it statically with Nginx for better performance and security.

---

## Nginx Configuration (`frontend/nginx.conf`)

### Server Block
- Listens on port 80.
- Serves static files from `/usr/share/nginx/html`.
- Index: `index.html`.

### React Router Support
- `location /`: Uses `try_files $uri $uri/ /index.html` to serve `index.html` for all non-file requests (e.g., `/dashboard`), enabling client-side routing.

### API Proxy
- `location /api/`: Proxies requests to `http://backend:5000` (backend service via Docker DNS).
- Sets headers for proper forwarding (Host, X-Real-IP, etc.).
- Supports WebSocket upgrades if needed.
- Timeouts: 60s for connect and read.

### Security and Caching
- Adds security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`.
- Caches static assets (JS, CSS, images) for 1 year with immutable flag.

### Purpose
- Handles static file serving efficiently.
- Routes API calls to the backend without exposing internal ports.
- Ensures SPA routing works correctly.

---

## How It All Works Together
1. **Build and Run**: `docker compose up --build` creates images, starts backend (waits for health), then frontend.
2. **Networking**: Frontend and backend communicate via `app_network`; external access only through port 3000.
3. **Data Persistence**: SQLite file survives container restarts via volume.
4. **Development**: For dev, run without Docker; for prod, use this setup.
5. **Scaling**: Compose can scale services; backend could be replicated with shared volume.

This setup provides a production-ready, containerized environment with separation of concerns, security best practices, and easy deployment.