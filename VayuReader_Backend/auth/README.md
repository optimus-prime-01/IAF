# Auth API

A Node.js/Express authentication API with JWT, validation, and MongoDB.

---

## 🚀 Features

- **User Signup** (`POST /api/auth/signup`)
- **User Login** (`POST /api/auth/login`)
- **Get Profile** (`GET /api/auth/profile`, JWT protected)
- **Health Check Endpoints** for all main routes

---

## 🛣️ Endpoints

| Method | Route                | Description                |
|--------|----------------------|----------------------------|
| POST   | `/api/auth/signup`   | Register a new user        |
| POST   | `/api/auth/login`    | Login and get JWT token    |
| GET    | `/api/auth/profile`  | Get user profile (protected) |

---

## 🩺 Health Check

The API provides health check endpoints for each main route.

| Endpoint                        | Description                        |
|----------------------------------|------------------------------------|
| `GET /api/auth/health`           | General health check               |
| `GET /api/auth/health/signup`    | Health check for signup endpoint   |
| `GET /api/auth/health/login`     | Health check for login endpoint    |
| `GET /api/auth/health/profile`   | Health check for profile endpoint  |

#### Example Usage

```bash
curl http://localhost:3000/api/auth/health
curl http://localhost:3000/api/auth/health/signup
curl http://localhost:3000/api/auth/health/login
curl http://localhost:3000/api/auth/health/profile
```

**Sample Response:**
```json
{
  "status": "ok",
  "route": "POST /api/auth/signup"
}
```

---

## 🧑‍💻 Usage

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Set up your `.env` file** with MongoDB URI, JWT secret, and port.

   Example:
   ```
   MONGO_URI=mongodb://localhost:27017/auth
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

3. **Start the server:**
   ```sh
   npm run dev
   ```

---

## 📁 Project Structure

```
auth-api/
├── controllers/
├── middleware/
├── models/
├── routes/
├── schemas/
├── server.js
├── .env
└── README.md
```

---
