## App Architecture Report: Frontend-Backend Interaction

### Overview
The application follows a client-server architecture with a React-based frontend and a Node.js Express backend. The frontend communicates with the backend via RESTful HTTP APIs, using JWT for authentication. All interactions are secured, with role-based access control (admin vs employee). The frontend is served via Nginx in production, while the backend runs on Express.

---

## Frontend Architecture

### Core Components

#### `frontend/src/App.js`
- Root component using React Router for navigation.
- Wraps the app in `AuthProvider` for global auth state.
- Defines routes:
  - `/` → Redirects based on user role (admin to `/admin`, employee to `/dashboard`)
  - `/login` → Public login page
  - `/register` → Public registration page
  - `/dashboard` → Protected employee dashboard
  - `/admin` → Protected admin-only dashboard
- Uses `ProtectedRoute` to enforce authentication and role checks.

#### `frontend/src/context/AuthContext.js`
- React Context for managing authentication state.
- Stores `user` (profile data), `token` (JWT), and `isAdmin` flag.
- Persists state in `localStorage` for session continuity.
- Provides `login` function: Calls API, stores token/user, updates state.
- Provides `logout` function: Clears localStorage and state.
- Rehydrates state on app load from localStorage.

#### `frontend/src/api/api.js`
- Axios-based HTTP client configured with base URL (`/api` in production).
- Request interceptor: Automatically attaches `Authorization: Bearer <token>` from localStorage.
- Response interceptor: Handles 401 errors by clearing auth data and redirecting to `/login`.
- Exports API functions:
  - Auth: `login`, `register`
  - Leaves: `getLeaves`, `getLeave`, `createLeave`, `updateStatus`, `deleteLeave`, `getAllUsers`

#### `frontend/src/components/ProtectedRoute.js`
- Higher-order component for route protection.
- Checks if user is authenticated; redirects to `/login` if not.
- Optional `adminOnly` prop: Redirects non-admins to `/dashboard`.

#### Pages
- `LoginPage.js`: Handles login form, calls `AuthContext.login`, navigates post-success.
- `EmployeeDashboard.js`: Fetches user's leaves, allows creating/deleting pending requests.
- `AdminDashboard.js`: Fetches all leaves, allows approving/rejecting, filters by status.

---

## Backend Interaction

### HTTP Communication
- Frontend uses Axios for all API calls to `/api/*` endpoints.
- JWT is sent in `Authorization` header on every request.
- Backend validates JWT via `authenticate` middleware.
- Responses are JSON; errors include status codes and messages.

### Authentication Flow
1. User submits login form in `LoginPage`.
2. `AuthContext.login` calls `api.login(email, password)`.
3. Backend verifies credentials, returns JWT and user data.
4. Token stored in localStorage; user state updated.
5. Subsequent requests include JWT automatically via interceptor.
6. On 401, interceptor clears auth and redirects to login.

### Data Flow
- Pages use `useEffect` to fetch data on mount (e.g., `getLeaves`).
- CRUD operations trigger API calls and re-fetch data.
- Employee sees only their leaves; admin sees all with employee metadata.
- Forms validate client-side before API submission.
- Success/error messages displayed via state.

### Role-Based Access
- `ProtectedRoute` enforces login; `adminOnly` restricts admin routes.
- API routes use `authenticate` and `requireAdmin` middlewares.
- Frontend conditionally renders UI based on `isAdmin` (e.g., approve/reject buttons).

---

## State Management
- Global auth state via `AuthContext`.
- Local component state for forms, loading, errors, and fetched data.
- No external state library; relies on React hooks.

---

## Error Handling
- API errors caught in try/catch, display user-friendly messages.
- Axios interceptor globally handles 401 by logging out.
- Backend returns structured error responses (e.g., `{ error: "message" }`).

---

## Deployment Interaction
- Frontend served by Nginx (static files).
- Backend runs on port 5000 (configurable).
- CORS configured for frontend origin.
- In Docker, frontend proxies API calls to backend container.

---

## Key Interaction Patterns
- **Login/Logout**: Persistent via localStorage; automatic token refresh not implemented.
- **Data Fetching**: On-demand in components; no caching or optimistic updates.
- **Real-time**: No WebSockets; manual refresh required.
- **Security**: JWT expires in 8 hours; no refresh mechanism.

This architecture ensures secure, role-aware interactions between the React frontend and Express backend, with clear separation of concerns.