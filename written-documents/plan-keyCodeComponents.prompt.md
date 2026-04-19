## Key Code Components and Their Purpose

### Backend Components

#### `backend/src/index.js`
- **Purpose**: Main entry point for the Express server. Configures global middleware (CORS, JSON parsing, logging), mounts API routes, and starts the HTTP server. Includes error handling for uncaught exceptions.

#### `backend/src/db/database.js`
- **Purpose**: Initializes the SQLite database using better-sqlite3. Defines schema for `users` and `leaves` tables, enables WAL mode for concurrency, and seeds demo data (users and sample leave requests) on first run.

#### `backend/src/middleware/auth.js`
- **Purpose**: Provides JWT-based authentication middleware. `authenticate` verifies the Bearer token and attaches user data to `req.user`. `requireAdmin` ensures only admins can access certain routes.

#### `backend/src/routes/auth.js`
- **Purpose**: Handles authentication endpoints. `POST /api/auth/register` creates new users (defaulting to employee role). `POST /api/auth/login` verifies credentials and returns a JWT token with user info.

#### `backend/src/routes/leaves.js`
- **Purpose**: Manages leave request CRUD operations. All routes are protected. Supports role-based access: employees see their own leaves; admins see all. Includes endpoints for listing, creating, updating status, and deleting leaves.

### Frontend Components

#### `frontend/src/App.js`
- **Purpose**: Root React component. Sets up React Router with protected routes for login, registration, employee dashboard, and admin dashboard. Wraps the app in `AuthProvider` for global auth state.

#### `frontend/src/context/AuthContext.js`
- **Purpose**: React Context for authentication state management. Stores user data, JWT token, and admin flag. Handles login/logout, persisting state in localStorage for session continuity.

#### `frontend/src/api/api.js`
- **Purpose**: Axios-based HTTP client for backend communication. Configures base URL, attaches JWT via request interceptor, and handles 401 errors by logging out. Exports functions for auth and leave API calls.

#### `frontend/src/components/ProtectedRoute.js`
- **Purpose**: Higher-order component for route protection. Redirects unauthenticated users to login and non-admins away from admin routes.

#### `frontend/src/components/Navbar.js`
- **Purpose**: Navigation bar component. Displays app branding, user name, admin badge (if applicable), and logout button. Handles logout navigation.

#### `frontend/src/components/StatusBadge.js`
- **Purpose**: UI component for displaying leave request status. Renders colored badges (pending: yellow, approved: green, rejected: red) with appropriate styling.

#### `frontend/src/pages/LoginPage.js`
- **Purpose**: Login form page. Collects email/password, calls auth API, updates context on success, and navigates to dashboard. Displays errors and demo credentials.

#### `frontend/src/pages/RegisterPage.js`
- **Purpose**: Registration form page. Collects name/email/password, submits to API, and redirects to login on success. Handles validation and errors.

#### `frontend/src/pages/EmployeeDashboard.js`
- **Purpose**: Employee interface. Displays user's leave history, stats, and a form to request new leaves. Allows withdrawing pending requests. Fetches data on mount and refreshes after actions.

#### `frontend/src/pages/AdminDashboard.js`
- **Purpose**: Admin interface. Lists all leave requests with employee details, filters by status, and provides approve/reject actions. Includes stats and table view for management.

These components form the core of the leave tracker app, handling everything from database persistence to user authentication, API communication, and UI rendering.