# Lumina User Management System

A premium light-theme user management workspace built with React, Tailwind-ready CSS, Express, MongoDB and JWT authentication.

## Structure

- `frontend/` Vite + React dashboard with responsive people directory, search, filters, list/grid views, and invite flow.
- `backend/` Express REST API with MongoDB user model, bcrypt password hashing, JWT auth, and role-based authorization.

## Run locally

### Frontend

```powershell
cd frontend
npm install
# Optional: copy .env.example to .env.local to change the API URL
npm run dev
```

Open `http://localhost:5173`.

### Backend

```powershell
cd backend
Copy-Item .env.example .env
# Set MONGO_URI and JWT_SECRET in .env
npm install
npm run dev
```

The API runs at `http://localhost:5000`.

## Database storage

User records are stored in MongoDB, in the `lumina` database and `users` collection. The database is not stored inside this project folder. By default, the backend connects to a local MongoDB service at:

```text
mongodb://127.0.0.1:27017/lumina
```

Make sure MongoDB is installed and running locally, or replace `MONGO_URI` in `backend/.env` with a MongoDB Atlas connection string. Passwords are never stored as plain text; they are hashed with bcrypt before being saved.

The root `.gitignore` excludes `node_modules`, build output, `.env` files, logs, and local editor files. Only `.env.example` files are intended to be committed.

### Email invitations

Inviting an employee sends an email through SMTP. Add these values to `backend/.env` before using **Invite an employee**:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
MAIL_FROM=Lumina <no-reply@example.com>
```

For Gmail, use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`, and an App Password rather than your normal account password. Restart the backend after changing `.env`. If SMTP is not configured or delivery fails, the pending employee is rolled back and the dashboard shows an error instead of reporting a false success.

## API endpoints

- `POST /api/auth/signup` - create an account
- `POST /api/auth/login` - get a JWT
- `GET /api/users` - list users (Bearer token required)
- `GET /api/users/:id` - get a user
- `POST /api/users` - create a user (Admin only)
- `PATCH /api/users/:id` - update own profile or any user as Admin
- `DELETE /api/users/:id` - delete a user (Admin only)
- `GET /api/health` - service health check

For Postman, set `Authorization: Bearer <token>` after logging in. Auth request bodies use `name`, `email`, and `password`; admin user creation additionally accepts `role` (`Admin`, `Editor`, or `Viewer`).

## Authentication flow

The frontend starts on the responsive login screen. Use **Create an account** to register; new public accounts are always created as `Viewer` users. After login/signup, the JWT is stored in browser local storage and sent with protected API requests. Use the profile control in the sidebar to log out. Admins can create, update, and delete users; regular users can update only their own profile.

For a quick Postman test:

1. `POST /api/auth/signup` with `{ "name": "Test User", "email": "test@example.com", "password": "password123" }`.
2. Copy the returned `token`.
3. Call `GET /api/users` with `Authorization: Bearer <token>`.
