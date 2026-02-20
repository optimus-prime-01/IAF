# Authentication & Security

Complete guide to authentication, authorization, and security mechanisms in VayuReader Backend v2.

## Overview

The backend implements a **dual authentication system**:
1. **User Authentication** - OTP-based, device-bound, lifetime JWT tokens
2. **Admin Authentication** - Password + OTP 2FA, session-based JWT tokens

---

## User Authentication Flow

### 1. OTP Request (`POST /api/auth/login/request-otp`)

**Process**:
1. Client sends `phone_number`, `name`, and `deviceId`
2. Server validates phone number format
3. User is created if doesn't exist, or existing user is loaded
4. **Block check**: If `user.isBlocked === true`, return 401
5. OTP is generated (6-digit random number)
6. OTP is **encrypted with deviceId** using AES-256-CBC
7. Encrypted OTP stored in Redis with 5-minute TTL
8. SMS sent to user's phone number (async, fire-and-forget)
9. Response sent to client (includes OTP in dev mode)

**Security Features**:
- Rate limit: 5 requests per 15 minutes per IP
- Device-bound encryption prevents OTP reuse on different devices
- Redis TTL ensures OTP expires after 5 minutes
- User blocking enforced at request time

**Code Flow**:
```javascript
// src/controllers/auth.controller.js
const requestLoginOtp = async (req, res) => {
  const { phone_number, name, deviceId } = req.body;
  
  // Find or create user
  let user = await User.findOne({ phone_number });
  if (!user) {
    user = new User({ name, phone_number });
  } else if (user.isBlocked) {
    return response.unauthorized(res, 'User blocked');
  }
  
  // Generate and encrypt OTP
  const otp = generateOtp();  // 6-digit random
  await saveOtp(phone_number, otp, deviceId);  // Encrypt with deviceId
  
  // Send SMS (async)
  sendOtpSms(phone_number, otp).catch(err => console.error(err));
  
  return response.success(res, { message: 'OTP sent' });
};
```

---

### 2. OTP Verification (`POST /api/auth/login/verify-otp`)

**Process**:
1. Client sends `phone_number`, `otp`, and `deviceId`
2. Server retrieves encrypted OTP from Redis
3. OTP is **decrypted using deviceId**
4. If deviceId doesn't match, decryption fails → invalid OTP
5. OTP compared with submitted value
6. **Block check**: If `user.isBlocked === true`, return 401
7. Device binding logic:
   - If `user.deviceId` is empty → new user
   - If `user.deviceId !== deviceId` → device change (logged to `UserAudit`)
8. User's `deviceId` and `lastLogin` updated
9. **Lifetime JWT token** generated (100-year expiration)
10. Token set as HTTP-only cookie
11. Login logged to `UserAudit`

**Security Features**:
- Rate limit: 5 requests per 1 minute per IP
- Device-bound OTP prevents phishing attacks
- Lifetime token eliminates re-authentication UX friction
- Device changes logged for audit trail
- HTTP-only cookies prevent XSS attacks

**JWT Payload**:
```javascript
{
  userId: ObjectId,
  phone_number: String,
  deviceId: String,
  name: String,
  type: 'user',
  iat: Number,
  exp: Number  // 100 years from now
}
```

**Code Flow**:
```javascript
const verifyLoginOtp = async (req, res) => {
  const { phone_number, otp, deviceId } = req.body;
  
  const user = await User.findOne({ phone_number });
  if (!user) return response.badRequest(res, 'User not found');
  if (user.isBlocked) return response.unauthorized(res, 'User blocked');
  
  // Verify OTP (decrypts with deviceId)
  const verification = await verifyOtp(otp, phone_number, deviceId);
  if (!verification.valid) {
    return response.badRequest(res, verification.error);
  }
  
  // Delete OTP from Redis
  await deleteOtp(phone_number);
  
  // Detect device change
  const isDeviceChange = user.deviceId && user.deviceId !== deviceId;
  if (isDeviceChange) {
    logDeviceChange(user, user.deviceId, deviceId);
    user.previousDeviceId = user.deviceId;
  }
  
  // Update user
  user.deviceId = deviceId;
  user.lastLogin = new Date();
  await user.save();
  
  // Generate lifetime JWT
  const token = generateLifetimeUserToken(user._id, {
    deviceId,
    phone_number: user.phone_number,
    name: user.name
  });
  
  // Set cookie (100-year expiration)
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 100 * 365 * 24 * 60 * 60 * 1000
  });
  
  return response.success(res, { user, token, deviceChanged: isDeviceChange });
};
```

---

### 3. Token Validation (Middleware)

**Process** (`src/middleware/auth.js`):
1. Extract token from `Authorization` header or `auth_token` cookie
2. Verify JWT signature using `JWT_SECRET`
3. Check token type is `'user'`
4. **Database lookup**: Query `User` by `userId` from token
5. **Block check**: If user not found or `isBlocked === true`, return 401
6. Attach user info to `req.user`
7. Call `next()`

**Security Features**:
- Token signature verification prevents tampering
- Database lookup ensures deleted/blocked users can't access resources
- Async middleware allows DB check without blocking event loop

**Code**:
```javascript
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];
    if (!token) return response.unauthorized(res, 'No token');
    
    const decoded = verifyToken(token);
    if (decoded.type !== 'user') {
      return response.unauthorized(res, 'Invalid token type');
    }
    
    // Check if user still exists and is not blocked
    const user = await User.findById(decoded.userId).select('isBlocked');
    if (!user) return response.unauthorized(res, 'User not found');
    if (user.isBlocked) return response.unauthorized(res, 'User blocked');
    
    req.user = {
      userId: decoded.userId,
      phone_number: decoded.phone_number,
      deviceId: decoded.deviceId,
      name: decoded.name
    };
    
    next();
  } catch (error) {
    return response.unauthorized(res, 'Invalid token');
  }
};
```

---

## Admin Authentication Flow

### 1. Password + OTP Request (`POST /api/admin/login/request-otp`)

**Process**:
1. Client sends `contact` and `password`
2. Server finds admin by contact
3. Password verified using bcrypt
4. If valid, OTP generated and sent via SMS
5. **Temporary login token** issued (5-minute expiration)
6. Login token returned to client for OTP verification step

**Security Features**:
- Rate limit: 5 requests per 15 minutes
- Bcrypt password hashing (10 rounds)
- Temporary token prevents OTP bypass
- 2FA required for all admin logins

**Code**:
```javascript
const requestLoginOtp = async (req, res) => {
  const { contact, password } = req.body;
  
  const admin = await Admin.findOne({ contact });
  if (!admin) return response.notFound(res, 'Admin not found');
  
  // Verify password
  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) return response.unauthorized(res, 'Invalid credentials');
  
  // Generate OTP
  const otp = generateOtp();
  await saveOtp(contact, otp, 'admin');  // No device binding for admins
  
  // Send SMS
  sendOtpSms(contact, otp).catch(err => console.error(err));
  
  // Generate temporary login token (5 min expiry)
  const loginToken = jwt.sign(
    { contact, type: 'admin_login' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  
  return response.success(res, { loginToken, message: 'OTP sent' });
};
```

---

### 2. OTP Verification (`POST /api/admin/login/verify-otp`)

**Process**:
1. Client sends `contact`, `otp`, and `loginToken`
2. Server verifies `loginToken` signature and expiration
3. OTP retrieved from Redis and verified
4. **Admin JWT token** generated (1-day expiration)
5. Token set as HTTP-only cookie
6. Admin login logged to `AuditLog`

**Security Features**:
- Rate limit: 5 requests per 1 minute
- Login token prevents OTP verification without password
- Session-based JWT (1-day expiry) for admins
- All admin actions logged

**JWT Payload**:
```javascript
{
  adminId: ObjectId,
  contact: String,
  name: String,
  isSuperAdmin: Boolean,
  permissions: [String],
  type: 'admin',
  iat: Number,
  exp: Number  // 1 day from now
}
```

---

### 3. Admin Middleware

**Process** (`src/middleware/adminAuth.js`):
1. Extract token from `Authorization` header or `admin_token` cookie
2. Verify JWT signature
3. Check token type is `'admin'`
4. Attach admin info to `req.admin`
5. Call `next()`

**Permission Checking**:
```javascript
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.admin.isSuperAdmin) return next();  // Super admin bypass
    if (!req.admin.permissions.includes(permission)) {
      return response.forbidden(res, 'Insufficient permissions');
    }
    next();
  };
};
```

**Usage**:
```javascript
router.post('/pdfs/upload',
  authenticateAdmin,
  requirePermission('manage_pdfs'),
  pdfController.uploadPdf
);
```

---

## OTP Service (`src/services/otp.service.js`)

### Encryption

**Algorithm**: AES-256-CBC  
**Key Derivation**: PBKDF2 from `deviceId` (or 'admin' for admins)  
**IV**: Random 16 bytes per OTP

**Why Device-Bound Encryption?**
- Prevents OTP interception and replay on different devices
- Even if Redis is compromised, OTPs are useless without correct deviceId
- Adds layer of defense against phishing attacks

**Code**:
```javascript
const crypto = require('crypto');

const encryptOtp = (otp, deviceId) => {
  const key = crypto.pbkdf2Sync(deviceId, 'salt', 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

const decryptOtp = (encryptedData, deviceId) => {
  const [ivHex, encrypted] = encryptedData.split(':');
  const key = crypto.pbkdf2Sync(deviceId, 'salt', 100000, 32, 'sha256');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

### Redis Storage

**Key Format**: `otp:<phone_number>`  
**Value**: Encrypted OTP string  
**TTL**: 5 minutes (300 seconds)

**Code**:
```javascript
const saveOtp = async (phone_number, otp, deviceId) => {
  const encrypted = encryptOtp(otp, deviceId);
  await redisClient.setEx(`otp:${phone_number}`, 300, encrypted);
};

const verifyOtp = async (otp, phone_number, deviceId) => {
  const encrypted = await redisClient.get(`otp:${phone_number}`);
  if (!encrypted) {
    return { valid: false, error: 'OTP expired or not found' };
  }
  
  try {
    const decrypted = decryptOtp(encrypted, deviceId);
    if (decrypted !== otp) {
      return { valid: false, error: 'Invalid OTP' };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid OTP or device' };
  }
};
```

---

## JWT Service (`src/services/jwt.service.js`)

### Token Generation

**User Token** (Lifetime):
```javascript
const generateLifetimeUserToken = (userId, payload) => {
  return jwt.sign(
    {
      userId,
      ...payload,
      type: 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: '100y' }  // Effectively lifetime
  );
};
```

**Admin Token** (Session):
```javascript
const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      adminId: admin._id,
      contact: admin.contact,
      name: admin.name,
      isSuperAdmin: admin.isSuperAdmin,
      permissions: admin.isSuperAdmin ? PERMISSIONS : admin.permissions,
      type: 'admin'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};
```

### Token Verification

```javascript
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};
```

---

## Security Best Practices

### 1. Password Storage

- **Never store plaintext passwords**
- Use bcrypt with 10+ rounds
- Validate password strength on creation

```javascript
const bcrypt = require('bcryptjs');

// Hash password
const passwordHash = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, admin.passwordHash);
```

### 2. JWT Secrets

- **Minimum 32 characters** (enforced in `environment.js`)
- Use cryptographically random strings
- Rotate secrets periodically in production
- Store in environment variables, never in code

### 3. Cookie Security

**Production Settings**:
```javascript
res.cookie('auth_token', token, {
  httpOnly: true,        // Prevents XSS access
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  maxAge: 100 * 365 * 24 * 60 * 60 * 1000
});
```

**Development Settings**:
```javascript
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: false,         // Allow HTTP for localhost
  sameSite: 'lax',       // Allow cross-origin for testing
  maxAge: 100 * 365 * 24 * 60 * 60 * 1000
});
```

### 4. Rate Limiting

All authentication endpoints are rate-limited:
- OTP requests: 5 per 15 minutes
- Login attempts: 5 per 1 minute
- General API: 100 per 15 minutes

See `docs/RATE_LIMITING.md` for details.

### 5. Input Validation

All inputs are validated and sanitized:

```javascript
// Phone number validation
const validatePhoneNumber = (req, res, next) => {
  const { phone_number } = req.body;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;  // E.164 format
  if (!phoneRegex.test(phone_number)) {
    return response.badRequest(res, 'Invalid phone number');
  }
  next();
};

// Sanitization
const sanitizePhone = (phone) => phone.trim().replace(/\s/g, '');
const sanitizeName = (name) => name.trim().substring(0, 100);
```

### 6. CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 7. Helmet Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: false,  // Disabled for API
  crossOriginEmbedderPolicy: false
}));
```

---

## User Blocking

### Block User

```bash
node scripts/manageUsers.js user block --contact +1234567890
```

**Effect**:
- User cannot request OTP
- User cannot verify OTP
- Existing tokens become invalid (checked in middleware)

### Unblock User

```bash
node scripts/manageUsers.js user unblock --contact +1234567890
```

---

## Admin Permissions

### Permission Matrix

| Permission | Description | Endpoints |
|------------|-------------|-----------|
| `manage_pdfs` | Create, update, delete PDFs | `/api/pdfs/*` (POST, PUT, DELETE) |
| `manage_dictionary` | Manage dictionary words | `/api/dictionary/*` (POST, PUT, DELETE) |
| `manage_abbreviations` | Manage abbreviations | `/api/abbreviations/*` (POST, PUT, DELETE) |
| `manage_admins` | Create/delete sub-admins | `/api/admin/sub-admins/*` (super admin only) |
| `view_audit` | View audit logs | `/api/audit/*` |

### Super Admin

- Has all permissions automatically
- Can create/delete other admins
- Cannot be deleted via API (only via script)

---

## Audit Logging

### User Actions

Logged to `UserAudit` collection:
- `LOGIN` - Every successful login
- `DEVICE_CHANGE` - When deviceId changes
- `READ_PDF` - When user views a PDF

### Admin Actions

Logged to `AuditLog` collection:
- `CREATE` - PDF, word, abbreviation, admin created
- `UPDATE` - Resource updated
- `DELETE` - Resource deleted

See `docs/AUDITING.md` for details.

---

## Security Checklist

- [ ] JWT_SECRET is at least 32 characters
- [ ] HTTPS enabled in production
- [ ] Cookies use `secure: true` in production
- [ ] Rate limiting enabled on all auth endpoints
- [ ] CORS configured with specific origins
- [ ] Helmet security headers enabled
- [ ] Input validation on all endpoints
- [ ] Passwords hashed with bcrypt (10+ rounds)
- [ ] OTPs encrypted with device binding
- [ ] User blocking enforced in middleware
- [ ] Admin permissions checked on protected routes
- [ ] Audit logging enabled for all admin actions
- [ ] Redis password protected
- [ ] MongoDB authentication enabled
- [ ] Environment variables secured (not in git)

---

## Troubleshooting

### "Invalid OTP" Error

**Cause**: Device ID mismatch between request-otp and verify-otp  
**Solution**: Ensure client sends same `deviceId` in both requests

### "User blocked" Error

**Cause**: User's `isBlocked` field is `true`  
**Solution**: Unblock user via script or admin panel

### "Token expired" Error (Admin)

**Cause**: Admin JWT expired after 1 day  
**Solution**: Re-login to get new token

### "Insufficient permissions" Error

**Cause**: Admin lacks required permission  
**Solution**: Grant permission or use super admin account
