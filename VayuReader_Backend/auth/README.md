# 🔐 Authentication API

## 🚀 Live Deployment

You can test the live API hosted on Render here:

```
🔗 https://auth-service-sjhe.onrender.com/api/auth
```

## ⚙️ Quick Setup (Local)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd auth-system
npm install
```

### 2. Environment Setup
Create `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/auth_db
JWT_SECRET=your-secret-key
PORT=3000
```

### 3. Start Server

```bash
npm start
```

## 🧪 API Testing with Postman

### 🔹 1. Signup User
- **Method:** `POST`
- **URL (Live):** `https://auth-service-sjhe.onrender.com/api/auth/signup`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "name": "John Doe",
  "officer_id": "OFF123",
  "phone_number": "1234567890",
  "password": "password123"
}
```

### 🔹 2. Login User
- **Method:** `POST`
- **URL (Live):** `https://auth-service-sjhe.onrender.com/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "phone_number": "1234567890",
  "password": "password123"
}
```

- ✅ **Response:** Copy the `token` from the response

### 🔹 3. Get User Profile
- **Method:** `GET`
- **URL (Live):** `https://auth-service-sjhe.onrender.com/api/auth/profile`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <paste-token-here>`

## 📦 Dependencies

- **Express.js** - Web framework
- **MongoDB + Mongoose** - Database
- **JWT** - Token authentication
- **Bcrypt** - Password hashing
- **Joi** - Input validation





## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/auth_db` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` |
| `PORT` | Server port number | `3000` |

## 🚦 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/signup` | Register new user | ❌ |
| `POST` | `/api/auth/login` | User login | ❌ |
| `GET` | `/api/auth/profile` | Get user profile | ✅ |

## 📝 Response Examples

### Successful Login Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f123456789abcdef123456",
    "name": "John Doe",
    "officer_id": "OFF123",
    "phone_number": "1234567890"
  }
}
```

### Profile Response
```json
{
  "user": {
    "id": "64f123456789abcdef123456",
    "name": "John Doe",
    "officer_id": "OFF123",
    "phone_number": "1234567890",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```
