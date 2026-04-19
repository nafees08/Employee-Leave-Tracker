## API Internal Report

### Overview
The backend API is a Node.js Express app located in `backend/src`. It exposes endpoints under `/api/*` and uses SQLite via `better-sqlite3` for persistence. Authentication is JWT-based, and the API enforces role-based access for admin vs employee behavior.

---

## Core components

### `backend/src/index.js`
- Sets up the Express app.
- Uses global middleware:
  - `cors` with origin from `process.env.CORS_ORIGIN` or `http://localhost:3000`
  - `express.json()` to parse JSON bodies
  - `morgan("dev")` for request logging
- Mounts routes:
  - `/api/auth` → `backend/src/routes/auth.js`
  - `/api/leaves` → `backend/src/routes/leaves.js`
- Defines a health check at `/api/health`
- Includes a global error handler that returns `500` for uncaught errors.

---

## Database layer

### `backend/src/db/database.js`
- Uses `better-sqlite3` with file path from `process.env.DB_PATH` or default `data/leave_tracker.db`
- Ensures the data directory exists via `fs.mkdirSync`
- Enables SQLite WAL mode for concurrency
- Creates two tables if missing:
  - `users`
    - `id`, `name`, `email`, `password`, `role`
  - `leaves`
    - `id`, `user_id`, `type`, `start_date`, `end_date`, `reason`, `status`, `created_at`, `updated_at`
- Seeds demo users and sample leave requests on first run
- Uses `bcryptjs` to hash seeded passwords

---

## Authentication middleware

### `backend/src/middleware/auth.js`
- Verifies JWT tokens from the `Authorization: Bearer <token>` header
- Uses secret from `process.env.JWT_SECRET` or fallback `"super_secret_dev_key"`
- On success attaches `req.user = { id, email, role }`
- Defines two middlewares:
  - `authenticate` — requires a valid JWT
  - `requireAdmin` — requires `req.user.role === "admin"`

---

## Auth routes

### `backend/src/routes/auth.js`
- `POST /api/auth/register`
  - Accepts `{ name, email, password, role? }`
  - Hashes the password and inserts a new user
  - Prevents public registration as admin by forcing `admin` role to `employee`
  - Returns `201` with user id
  - Returns `409` if email already exists
- `POST /api/auth/login`
  - Accepts `{ email, password }`
  - Looks up the user by email
  - Verifies password with bcrypt
  - Returns a JWT containing `{ id, email, role, name }`
  - Token lifetime is `8h`
  - Returns user info plus token

---

## Leave request routes

### `backend/src/routes/leaves.js`
- All routes are protected by `authenticate`
- Role-aware route behavior:
  - Admin can see all leave requests
  - Employee sees only their own

Routes:
- `GET /api/leaves`
  - Admin returns all leaves joined with employee info
  - Employee returns their own leaves
- `GET /api/leaves/:id`
  - Returns a single leave
  - Employees can only view their own
- `POST /api/leaves`
  - Creates a new leave request
  - Required fields: `type`, `start_date`, `end_date`
  - Validates leave type and date order
  - Inserts leave with status `pending`
- `PATCH /api/leaves/:id/status`
  - Admin-only via `requireAdmin`
  - Updates a leave from `pending` to `approved` or `rejected`
  - Rejects non-pending updates
- `DELETE /api/leaves/:id`
  - Employee can delete their own pending leave
  - Admin can delete any leave
- `GET /api/leaves/users/all`
  - Admin-only user listing for dashboard filtering

---

## Internal access control

- `authenticate` ensures only logged-in users can access `/api/leaves/*`
- `requireAdmin` further restricts admin-only actions
- Employee actions are limited by checking:
  - `req.user.id === leave.user_id`
  - `req.user.role !== "admin"` for non-admin operations
- Admin can list all users and approve/reject leaves

---

## Data flow summary

1. Client sends request to `/api/*`
2. `index.js` routes it to auth or leave router
3. For protected leave routes:
   - `authenticate` checks JWT
   - If admin-only, `requireAdmin` checks role
4. Route handlers query SQLite via prepared statements
5. Responses are returned as JSON
6. Errors bubble to global handler if not explicitly handled

---

## Important behaviors
- JWT secret is hard-coded fallback in development
- Database is file-backed SQLite and seeded automatically
- Passwords are hashed with bcrypt
- Leave lifecycle:
  - Created as `pending`
  - Only admin can change status
  - Employees can delete pending leaves only
- Admin sees extra employee metadata on leave queries
