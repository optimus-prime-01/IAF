# Configuration

This document explains every environment variable and configuration object used by the **VayuReader Backend**. All variables are loaded from a `.env` file (via `dotenv`). Missing required variables cause the server to abort on startup.

## Core Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | – | MongoDB connection string. Example: `mongodb://localhost:27017/vayu_reader` |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection URL used for caching, rate‑limiting and OTP storage |
| `JWT_SECRET` | ✅ | – | Secret for signing JWTs (minimum 32 characters). |
| `JWT_EXPIRY_DAYS` | ❌ | `1` | Number of days a user JWT is valid (used for *lifetime* token generation). |
| `OTP_GATEWAY_URL` | ✅ | – | URL of the SMS gateway used to send OTPs. |
| `OTP_EXPIRY_MINUTES` | ❌ | `5` | OTP validity period in minutes. |
| `SKIP_OTP_SEND` | ❌ | `false` | Set to `true` in development to skip actual SMS sending. |
| `ALLOWED_ORIGINS` | ❌ | `[]` | Comma‑separated list of origins allowed for CORS (e.g., `http://localhost:3000`). |
| `RATE_LIMIT_WINDOW_MS` | ❌ | `900000` (15 min) | Time window for generic API rate limiting. |
| `RATE_LIMIT_MAX_REQUESTS` | ❌ | `100` | Max generic requests per IP per window. |
| `OTP_RATE_LIMIT_MAX` | ❌ | `5` | Max OTP requests per IP per window. |
| `NODE_ENV` | ❌ | `development` | Determines environment (`development` vs `production`). |
| `PORT` | ❌ | `3000` | Port the Express server listens on. |
| `TESTING` | ❌ | `false` | When `true`, cookies use `SameSite=None` for cross‑origin testing. |

## Exported Configuration Objects
The file `src/config/environment.js` aggregates the above variables into convenient objects:
```js
module.exports = {
  server,      // { port, nodeEnv, isDevelopment }
  database,    // { uri, options }
  jwt,         // { secret, expiryDays }
  otp,         // { gatewayUrl, expiryMinutes, skipSend }
  cors,        // { allowedOrigins }
  rateLimit,   // { windowMs, maxRequests, otpMaxRequests }
  redis        // { url }
};
```
These objects are imported throughout the codebase (e.g., rate‑limiter, JWT service, Redis client).

## Rate‑Limiting Configuration (`apiLimit-config.js`)
A dedicated config file defines granular limits per endpoint:
```js
module.exports = {
  default: { windowMs: 15*60*1000, max: 100, message: 'Too many requests' },
  auth: {
    otp: { prefix: 'otp', windowMs: 15*60*1000, max: 5, message: 'Too many OTP requests' },
    login: { prefix: 'login', windowMs: 60*1000, max: 5, message: 'Too many login attempts' }
  },
  uploads: {
    dictionary: { prefix: 'upload-dict', windowMs: 60*60*1000, max: 10, message: 'Upload limit exceeded' },
    abbreviation: { prefix: 'upload-abbr', windowMs: 60*60*1000, max: 10, message: 'Upload limit exceeded' }
  },
  search: { prefix: 'search', windowMs: 60*1000, max: 60, message: 'Search limit exceeded' }
};
```
The `rateLimiter` middleware consumes this config via `createLimiter`.

---
**Tip:** When adding a new endpoint, extend this file and reference the new limiter in the route definition.
