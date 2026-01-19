# Low-Level Design (LLD) Document

## VayuReader Backend v2

**Version**: 2.0  
**Date**: January 2026  
**Author**: Development Team (IAF)  

---

## 1. Introduction

This Low-Level Design (LLD) document provides detailed technical specifications for the VayuReader Backend v2 system. It covers class/module designs, database schemas, API contracts, algorithm implementations, and code-level architecture.

---

## 2. Project Structure

```
VayuReader_Backend_v2/
├── src/
│   ├── config/                  # Configuration modules
│   │   ├── environment.js       # Environment variable loader
│   │   ├── database.js          # MongoDB connection
│   │   ├── redis.js             # Redis client setup
│   │   ├── cors.js              # CORS configuration
│   │   ├── apiLimit-config.js   # Rate limiting configuration
│   │   └── elasticsearch.js     # Elasticsearch client (optional)
│   │
│   ├── controllers/             # Request handlers
│   │   ├── auth.controller.js   # User authentication
│   │   ├── admin.controller.js  # Admin authentication & management
│   │   ├── pdf.controller.js    # PDF CRUD operations
│   │   ├── dictionary.controller.js  # Dictionary operations
│   │   ├── abbreviation.controller.js # Abbreviation operations
│   │   ├── audit.controller.js  # Audit log queries
│   │   └── sse.controller.js    # Server-Sent Events
│   │
│   ├── middleware/              # Express middleware
│   │   ├── auth.js              # User JWT authentication
│   │   ├── adminAuth.js         # Admin JWT authentication
│   │   ├── rateLimiter.js       # Rate limiting middleware
│   │   ├── validation.js        # Input validation
│   │   ├── errorHandler.js      # Global error handler
│   │   └── upload.js            # File upload (Multer)
│   │
│   ├── models/                  # Mongoose schemas
│   │   ├── User.js              # End-user model
│   │   ├── Admin.js             # Administrator model
│   │   ├── PdfDocument.js       # PDF metadata model
│   │   ├── Word.js              # Dictionary word model
│   │   ├── Abbreviation.js      # Abbreviation model
│   │   ├── UserAudit.js         # User activity log
│   │   └── AuditLog.js          # Admin action log
│   │
│   ├── routes/                  # Route definitions
│   │   ├── index.js             # Route aggregator
│   │   ├── auth.routes.js       # /api/auth/*
│   │   ├── admin.routes.js      # /api/admin/*
│   │   ├── pdf.routes.js        # /api/pdfs/*
│   │   ├── dictionary.routes.js # /api/dictionary/*
│   │   ├── abbreviation.routes.js # /api/abbreviations/*
│   │   ├── audit.routes.js      # /api/audit/*
│   │   └── sse.routes.js        # /api/events
│   │
│   ├── services/                # Business logic
│   │   ├── jwt.service.js       # JWT generation/verification
│   │   ├── otp.service.js       # OTP generation/encryption/storage
│   │   ├── sms.service.js       # SMS gateway integration
│   │   ├── search.service.js    # Search with caching
│   │   ├── pdf.service.js       # PDF file operations
│   │   ├── userAudit.service.js # User activity logging
│   │   ├── pubsub.service.js    # Redis Pub/Sub
│   │   └── sse.service.js       # SSE connection management
│   │
│   ├── utils/                   # Utility functions
│   │   ├── response.js          # Standardized API responses
│   │   ├── sanitize.js          # Input sanitization
│   │   └── fileValidation.js    # File type validation
│   │
│   ├── server.js                # Express app entry point
│   └── cluster.js               # Cluster mode for multi-core
│
├── scripts/                     # CLI utilities
│   ├── seedAdmin.js             # Create super admin
│   ├── manageUsers.js           # User/admin management
│   ├── reset-admin-password.js  # Password reset
│   ├── optimizeDb.js            # Database optimization
│   ├── syncElasticsearch.js     # ES data sync
│   ├── cleanupLogs.js           # Log retention
│   └── sms-simulator.js         # SMS gateway mock
│
├── nginx/                       # Nginx configuration
│   ├── conf.d/default.conf      # Server configuration
│   ├── nginx.conf               # Main nginx.conf
│   └── certs/                   # SSL certificates
│
├── docs/                        # Documentation
├── test/                        # Test files
├── uploads/                     # PDF/Image storage
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Container image
├── package.json                 # Dependencies
└── .env.example                 # Environment template
```

---

## 3. Database Schema Design

### 3.1 User Schema

**Collection**: `users`

```javascript
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone_number: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    index: true,
    validate: {
      validator: (v) => /^\+?[1-9]\d{1,14}$/.test(v),
      message: 'Invalid phone number format'
    }
  },
  deviceId: {
    type: String,
    index: true,
    default: null
  },
  previousDeviceId: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isBlocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ phone_number: 1 }, { unique: true });
UserSchema.index({ deviceId: 1 });

// Instance Methods
UserSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    name: this.name,
    phone_number: this.phone_number
  };
};
```

### 3.2 Admin Schema

**Collection**: `admins`

```javascript
const AdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  contact: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false  // Exclude from queries by default
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  permissions: [{
    type: String,
    enum: [
      'manage_pdfs',
      'manage_dictionary',
      'manage_abbreviations',
      'manage_admins',
      'view_audit'
    ]
  }],
  createdBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true
});

// Instance Methods
AdminSchema.methods.hasPermission = function(permission) {
  if (this.isSuperAdmin) return true;
  return this.permissions.includes(permission);
};

AdminSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    name: this.name,
    contact: this.contact,
    isSuperAdmin: this.isSuperAdmin,
    permissions: this.isSuperAdmin ? PERMISSIONS : this.permissions
  };
};
```

### 3.3 PdfDocument Schema

**Collection**: `pdfdocuments`

```javascript
const PdfDocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Text index for full-text search
PdfDocumentSchema.index(
  { title: 'text', description: 'text', category: 'text' },
  { weights: { title: 10, category: 5, description: 1 } }
);

// Compound indexes
PdfDocumentSchema.index({ category: 1, createdAt: -1 });
PdfDocumentSchema.index({ createdAt: -1 });
```

### 3.4 Word Schema

**Collection**: `words`

```javascript
const MeaningSchema = new mongoose.Schema({
  partOfSpeech: {
    type: String,
    enum: ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 
           'preposition', 'conjunction', 'interjection', 'other']
  },
  definition: {
    type: String,
    required: true
  },
  synonyms: [String],
  examples: [String]
}, { _id: false });

const WordSchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  meanings: {
    type: [MeaningSchema],
    required: true,
    validate: {
      validator: (v) => v && v.length > 0,
      message: 'At least one meaning is required'
    }
  },
  synonyms: [String],
  antonyms: [String]
}, {
  timestamps: true
});

// Text index for search
WordSchema.index({ word: 'text' });
```

### 3.5 Abbreviation Schema

**Collection**: `abbreviations`

```javascript
const AbbreviationSchema = new mongoose.Schema({
  abbreviation: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  fullForm: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

// Text index for search
AbbreviationSchema.index(
  { abbreviation: 'text', fullForm: 'text' },
  { weights: { abbreviation: 10, fullForm: 1 } }
);
```

### 3.6 UserAudit Schema

**Collection**: `useraudits`

```javascript
const UserAuditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  phone_number: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['LOGIN', 'DEVICE_CHANGE', 'READ_PDF'],
    index: true
  },
  deviceId: {
    type: String,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
UserAuditSchema.index({ userId: 1, action: 1 });
UserAuditSchema.index({ phone_number: 1, timestamp: -1 });
UserAuditSchema.index({ action: 1, timestamp: -1 });
UserAuditSchema.index({ timestamp: -1 });
```

### 3.7 AuditLog Schema

**Collection**: `auditlogs`

```javascript
const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['PDF', 'DICTIONARY_WORD', 'ABBREVIATION', 'ADMIN'],
    index: true
  },
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  adminName: {
    type: String,
    required: true,
    index: true
  },
  adminContact: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ adminName: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, resourceType: 1 });
AuditLogSchema.index({ timestamp: -1 });
```

---

## 4. Service Layer Design

### 4.1 JWT Service

**File**: `src/services/jwt.service.js`

```javascript
/**
 * JWT Service - Token generation and verification
 */

const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/environment');
const PERMISSIONS = require('../constants/permissions');

/**
 * Generate lifetime user token (100 years)
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {Object} payload - Additional token data
 * @returns {String} JWT token
 */
const generateLifetimeUserToken = (userId, payload) => {
  return jwt.sign(
    {
      userId,
      ...payload,
      type: 'user'
    },
    jwtConfig.secret,
    { expiresIn: '100y' }
  );
};

/**
 * Generate admin session token (1 day)
 * @param {Object} admin - Admin document
 * @returns {String} JWT token
 */
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
    jwtConfig.secret,
    { expiresIn: '1d' }
  );
};

/**
 * Generate temporary login token for 2FA flow (5 minutes)
 * @param {String} contact - Admin contact
 * @returns {String} JWT token
 */
const generateLoginToken = (contact) => {
  return jwt.sign(
    { contact, type: 'admin_login' },
    jwtConfig.secret,
    { expiresIn: '5m' }
  );
};

/**
 * Verify and decode JWT token
 * @param {String} token - JWT token string
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  return jwt.verify(token, jwtConfig.secret);
};

module.exports = {
  generateLifetimeUserToken,
  generateAdminToken,
  generateLoginToken,
  verifyToken
};
```

### 4.2 OTP Service

**File**: `src/services/otp.service.js`

```javascript
/**
 * OTP Service - Generation, encryption, storage, verification
 */

const crypto = require('crypto');
const { getClient: getRedisClient } = require('../config/redis');
const { otp: otpConfig } = require('../config/environment');

const OTP_TTL = otpConfig.expiryMinutes * 60; // Convert to seconds
const SALT = 'vayureader_otp_salt_v2'; // Fixed salt for key derivation

/**
 * Generate 6-digit random OTP
 * @returns {String} 6-digit OTP
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Encrypt OTP with device ID using AES-256-CBC
 * @param {String} otp - Plain OTP
 * @param {String} deviceId - Device identifier for key derivation
 * @returns {String} Encrypted OTP (iv:ciphertext)
 */
const encryptOtp = (otp, deviceId) => {
  // Derive key from deviceId using PBKDF2
  const key = crypto.pbkdf2Sync(deviceId, SALT, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt OTP using device ID
 * @param {String} encryptedData - Encrypted OTP (iv:ciphertext)
 * @param {String} deviceId - Device identifier
 * @returns {String} Decrypted OTP
 * @throws {Error} If decryption fails (wrong deviceId)
 */
const decryptOtp = (encryptedData, deviceId) => {
  const [ivHex, encrypted] = encryptedData.split(':');
  const key = crypto.pbkdf2Sync(deviceId, SALT, 100000, 32, 'sha256');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Save OTP to Redis with encryption
 * @param {String} phone_number - User's phone number
 * @param {String} otp - Plain OTP
 * @param {String} deviceId - Device identifier (or 'admin' for admin OTPs)
 */
const saveOtp = async (phone_number, otp, deviceId) => {
  const redisClient = getRedisClient();
  const encrypted = encryptOtp(otp, deviceId);
  await redisClient.setEx(`otp:${phone_number}`, OTP_TTL, encrypted);
};

/**
 * Verify OTP from Redis
 * @param {String} otp - Submitted OTP
 * @param {String} phone_number - User's phone number
 * @param {String} deviceId - Device identifier
 * @returns {Object} { valid: boolean, error?: string }
 */
const verifyOtp = async (otp, phone_number, deviceId) => {
  const redisClient = getRedisClient();
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
    // Decryption failed - wrong deviceId
    return { valid: false, error: 'Invalid OTP or device mismatch' };
  }
};

/**
 * Delete OTP from Redis after successful verification
 * @param {String} phone_number - User's phone number
 */
const deleteOtp = async (phone_number) => {
  const redisClient = getRedisClient();
  await redisClient.del(`otp:${phone_number}`);
};

/**
 * Check if OTP sending should be skipped (dev mode)
 * @returns {Boolean}
 */
const shouldSkipSend = () => {
  return otpConfig.skipSend === true;
};

module.exports = {
  generateOtp,
  saveOtp,
  verifyOtp,
  deleteOtp,
  shouldSkipSend
};
```

### 4.3 Search Service

**File**: `src/services/search.service.js`

```javascript
/**
 * Search Service - Dictionary and Abbreviation search with caching
 */

const { getClient: getRedisClient } = require('../config/redis');
const Word = require('../models/Word');
const Abbreviation = require('../models/Abbreviation');

const CACHE_TTL = 60; // 60 seconds

/**
 * Search dictionary words with caching
 * @param {String} term - Search term
 * @param {Object} options - { page, limit }
 * @returns {Object} { results, pagination }
 */
const searchDictionary = async (term, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  const cacheKey = `word:search:${term.toLowerCase()}:${page}:${limit}`;
  
  // Check cache
  const redisClient = getRedisClient();
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Build query
  let query = {};
  if (term) {
    query = {
      $or: [
        { word: new RegExp(`^${escapeRegex(term)}`, 'i') },
        { $text: { $search: term } }
      ]
    };
  }
  
  // Execute query
  const [results, total] = await Promise.all([
    Word.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ word: 1 })
        .lean(),
    Word.countDocuments(query)
  ]);
  
  const response = {
    results,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit
    }
  };
  
  // Cache results
  await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));
  
  return response;
};

/**
 * Get single word by exact match
 * @param {String} word - Word to lookup
 * @returns {Object|null} Word document
 */
const getWord = async (word) => {
  const cacheKey = `word:${word.toUpperCase()}`;
  
  const redisClient = getRedisClient();
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const result = await Word.findOne({ word: word.toUpperCase() }).lean();
  
  if (result) {
    await redisClient.setEx(cacheKey, CACHE_TTL * 60, JSON.stringify(result)); // 1 hour
  }
  
  return result;
};

/**
 * Search abbreviations with caching
 * @param {String} term - Search term
 * @param {Object} options - { page, limit }
 * @returns {Object} { results, pagination }
 */
const searchAbbreviation = async (term, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  const cacheKey = `abbr:search:${term.toLowerCase()}:${page}:${limit}`;
  
  const redisClient = getRedisClient();
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  let query = {};
  if (term) {
    query = {
      $or: [
        { abbreviation: new RegExp(`^${escapeRegex(term)}`, 'i') },
        { $text: { $search: term } }
      ]
    };
  }
  
  const [results, total] = await Promise.all([
    Abbreviation.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ abbreviation: 1 })
                .lean(),
    Abbreviation.countDocuments(query)
  ]);
  
  const response = {
    results,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit
    }
  };
  
  await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));
  
  return response;
};

/**
 * Invalidate cache for a specific word
 * @param {String} word - Word to invalidate
 */
const invalidateWordCache = async (word) => {
  const redisClient = getRedisClient();
  await redisClient.del(`word:${word.toUpperCase()}`);
  // Also invalidate search caches (pattern matching)
  const keys = await redisClient.keys('word:search:*');
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

/**
 * Escape special regex characters
 * @param {String} string - Input string
 * @returns {String} Escaped string
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  searchDictionary,
  searchAbbreviation,
  getWord,
  invalidateWordCache
};
```

### 4.4 Pub/Sub Service

**File**: `src/services/pubsub.service.js`

```javascript
/**
 * Redis Pub/Sub Service for real-time event distribution
 */

const { createClient } = require('redis');
const { redis: redisConfig } = require('../config/environment');

let publisher = null;
let subscriber = null;
const subscriptions = new Map();

/**
 * Initialize Pub/Sub clients
 */
const initialize = async () p> {
  // Publisher client (reuse main client)
  publisher = createClient({ url: redisConfig.url });
  await publisher.connect();
  
  // Dedicated subscriber client (required by Redis protocol)
  subscriber = createClient({ url: redisConfig.url });
  await subscriber.connect();
  
  console.log('Redis Pub/Sub initialized');
};

/**
 * Publish event to channel
 * @param {String} channel - Channel name
 * @param {Object} data - Event data
 */
const publishEvent = async (channel, data) => {
  if (!publisher || !publisher.isOpen) {
    console.warn('Publisher not ready, event dropped:', channel);
    return;
  }
  
  const message = JSON.stringify({
    ...data,
    timestamp: new Date().toISOString()
  });
  
  await publisher.publish(channel, message);
};

/**
 * Subscribe to channel
 * @param {String} channel - Channel name
 * @param {Function} callback - Handler function(message)
 */
const subscribe = async (channel, callback) => {
  if (!subscriber || !subscriber.isOpen) {
    throw new Error('Subscriber not ready');
  }
  
  await subscriber.subscribe(channel, (message) => {
    try {
      callback(message);
    } catch (error) {
      console.error('Subscription callback error:', error);
    }
  });
  
  subscriptions.set(channel, callback);
};

/**
 * Unsubscribe from channel
 * @param {String} channel - Channel name
 */
const unsubscribe = async (channel) => {
  if (subscriber && subscriber.isOpen) {
    await subscriber.unsubscribe(channel);
  }
  subscriptions.delete(channel);
};

/**
 * Cleanup connections
 */
const shutdown = async () => {
  if (publisher) await publisher.quit();
  if (subscriber) await subscriber.quit();
};

module.exports = {
  initialize,
  publishEvent,
  subscribe,
  unsubscribe,
  shutdown
};
```

---

## 5. Middleware Design

### 5.1 Authentication Middleware

**File**: `src/middleware/auth.js`

```javascript
/**
 * User Authentication Middleware
 */

const { verifyToken } = require('../services/jwt.service');
const User = require('../models/User');
const response = require('../utils/response');

/**
 * Authenticate user requests
 * - Extracts token from cookie or Authorization header
 * - Verifies JWT signature
 * - Checks user exists and is not blocked
 * - Attaches user info to req.user
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Extract token
    const token = req.cookies?.auth_token || 
                  req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return response.unauthorized(res, 'No token provided');
    }
    
    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return response.unauthorized(res, 'Invalid or expired token');
    }
    
    // Check token type
    if (decoded.type !== 'user') {
      return response.unauthorized(res, 'Invalid token type');
    }
    
    // Verify user exists and is not blocked
    const user = await User.findById(decoded.userId).select('isBlocked').lean();
    
    if (!user) {
      return response.unauthorized(res, 'User not found');
    }
    
    if (user.isBlocked) {
      return response.unauthorized(res, 'User account is blocked');
    }
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      phone_number: decoded.phone_number,
      deviceId: decoded.deviceId,
      name: decoded.name
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return response.serverError(res, 'Authentication failed');
  }
};

module.exports = { authenticateUser };
```

### 5.2 Rate Limiter Middleware

**File**: `src/middleware/rateLimiter.js`

```javascript
/**
 * Rate Limiting Middleware with Redis storage
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getClient: getRedisClient, connectRedis } = require('../config/redis');
const response = require('../utils/response');

/**
 * Create rate limiter with Redis store
 * @param {Object} config - { prefix, windowMs, max, message }
 * @returns {Function} Express middleware
 */
const createLimiter = ({ prefix, windowMs, max, message }) => {
  return rateLimit({
    windowMs: windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: max || 100,                       // Default: 100 requests
    standardHeaders: true,                  // RateLimit-* headers
    legacyHeaders: false,                   // Disable X-RateLimit-* headers
    
    // Redis store for distributed rate limiting
    store: new RedisStore({
      sendCommand: async (...args) => {
        const client = getRedisClient();
        if (!client.isOpen) {
          await connectRedis();
        }
        return client.sendCommand(args);
      },
      prefix: `rl:${prefix}:`
    }),
    
    // Custom error handler
    handler: (req, res) => {
      console.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
      return response.tooManyRequests(res, message || 'Too many requests');
    },
    
    // Key generator (default: IP address)
    keyGenerator: (req) => {
      return req.ip;
    }
  });
};

// Pre-configured limiters
const apiLimiter = createLimiter({
  prefix: 'api',
  windowMs: 15 * 60 * 1000,
  max: 100
});

const otpLimiter = createLimiter({
  prefix: 'otp',
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests, please try again in 15 minutes'
});

const loginLimiter = createLimiter({
  prefix: 'login',
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again in 1 minute'
});

const searchLimiter = createLimiter({
  prefix: 'search',
  windowMs: 60 * 1000,
  max: 60,
  message: 'Search rate limit exceeded'
});

module.exports = {
  createLimiter,
  apiLimiter,
  otpLimiter,
  loginLimiter,
  searchLimiter
};
```

---

## 6. API Endpoint Specifications

### 6.1 Authentication Endpoints

#### POST /api/auth/login/request-otp

**Request:**
```json
{
  "phone_number": "+919876543210",
  "name": "John Doe",
  "deviceId": "abc123def456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "otp": "123456"  // Only in dev mode
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - User is blocked
- `429 Too Many Requests` - Rate limit exceeded

#### POST /api/auth/login/verify-otp

**Request:**
```json
{
  "phone_number": "+919876543210",
  "otp": "123456",
  "deviceId": "abc123def456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "phone_number": "+919876543210"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewDevice": false,
    "deviceChanged": true
  },
  "message": "Login successful"
}
```

**Cookies Set:**
```
Set-Cookie: auth_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=3153600000
```

### 6.2 PDF Endpoints

#### GET /api/pdfs

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | - | Search term |
| `category` | string | - | Filter by category |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pdfs": [
      {
        "id": "507f1f77bcf86cd799439011",
        "title": "Flight Operations Manual",
        "description": "Standard procedures...",
        "category": "Operations",
        "pdfUrl": "/uploads/abc123/manual.pdf",
        "thumbnailUrl": "/uploads/abc123/thumb.jpg",
        "uploadedBy": "Admin Name",
        "views": 1234,
        "createdAt": "2026-01-19T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  }
}
```

#### POST /api/pdfs/upload

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pdf` | file | Yes | PDF file (max 50MB) |
| `thumbnail` | file | No | Image file (jpg/png/webp) |
| `title` | string | Yes | PDF title |
| `description` | string | No | Description |
| `category` | string | Yes | Category name |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "pdf": {
      "id": "507f1f77bcf86cd799439011",
      "title": "New Manual",
      "pdfUrl": "/uploads/uuid123/file.pdf",
      "thumbnailUrl": "/uploads/uuid123/thumb.jpg"
    }
  },
  "message": "PDF uploaded successfully"
}
```

### 6.3 SSE Endpoint

#### GET /api/events

**Headers:**
```
Authorization: Bearer <token>
Accept: text/event-stream
```

**Response Stream:**
```
event: connected
data: {"message":"Connected to events stream"}

event: PDF_ADDED
data: {"id":"507f...","title":"New PDF","category":"Ops","timestamp":"2026-01-19T10:00:00.000Z"}

:heartbeat

event: PDF_DELETED
data: {"id":"507f...","timestamp":"2026-01-19T11:00:00.000Z"}
```

---

## 7. Algorithm Specifications

### 7.1 OTP Encryption Algorithm

```
┌──────────────────────────────────────────────────────────────────────┐
│                    OTP ENCRYPTION FLOW                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Input: OTP (6 digits), DeviceId (string)                           │
│                                                                      │
│  Step 1: Key Derivation (PBKDF2)                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ key = PBKDF2(password: deviceId, salt: "vayureader_otp_salt_v2")││
│  │       iterations: 100,000                                        ││
│  │       keylen: 32 bytes                                           ││
│  │       digest: SHA-256                                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Step 2: Generate Random IV                                         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ iv = crypto.randomBytes(16)  // 16 bytes = 128 bits             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Step 3: Encrypt OTP (AES-256-CBC)                                  │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ cipher = createCipheriv('aes-256-cbc', key, iv)                 ││
│  │ encrypted = cipher.update(otp, 'utf8', 'hex')                   ││
│  │ encrypted += cipher.final('hex')                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Step 4: Combine IV + Ciphertext                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ output = iv.toString('hex') + ':' + encrypted                   ││
│  │ Example: "a1b2c3d4e5f6....:9f8e7d6c5b4a..."                     ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Output: Encrypted string stored in Redis with 5-min TTL            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 Password Hashing (Admin)

```javascript
// Hashing (during admin creation)
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

const hashPassword = async (plainPassword) => {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

// Verification (during login)
const verifyPassword = async (plainPassword, hash) => {
  return await bcrypt.compare(plainPassword, hash);
};
```

**Time Complexity:** O(2^SALT_ROUNDS) - intentionally slow to prevent brute force

### 7.3 Search Ranking Algorithm

```javascript
/**
 * Dictionary Word Search Ranking
 * 
 * Priority Order:
 * 1. Exact match (uppercase) - Score: 100
 * 2. Prefix match - Score: 50
 * 3. Text search match - Score: text score from MongoDB
 */

const searchWord = async (term) => {
  const results = await Word.aggregate([
    {
      $match: {
        $or: [
          { word: term.toUpperCase() },  // Exact match
          { word: { $regex: `^${escapeRegex(term)}`, $options: 'i' } },  // Prefix
          { $text: { $search: term } }  // Full-text
        ]
      }
    },
    {
      $addFields: {
        score: {
          $cond: {
            if: { $eq: ['$word', term.toUpperCase()] },
            then: 100,
            else: {
              $cond: {
                if: { $regexMatch: { input: '$word', regex: `^${term}`, options: 'i' } },
                then: 50,
                else: { $meta: 'textScore' }
              }
            }
          }
        }
      }
    },
    { $sort: { score: -1 } },
    { $limit: 20 }
  ]);
  
  return results;
};
```

---

## 8. Error Handling

### 8.1 Error Response Format

```javascript
// utils/response.js

const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

const error = (res, message, errorCode, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode
  });
};

// Standard error methods
const badRequest = (res, message = 'Bad Request') => 
  error(res, message, 'BAD_REQUEST', 400);

const unauthorized = (res, message = 'Unauthorized') => 
  error(res, message, 'UNAUTHORIZED', 401);

const forbidden = (res, message = 'Forbidden') => 
  error(res, message, 'FORBIDDEN', 403);

const notFound = (res, message = 'Not Found') => 
  error(res, message, 'NOT_FOUND', 404);

const tooManyRequests = (res, message = 'Too Many Requests') => 
  error(res, message, 'RATE_LIMIT_EXCEEDED', 429);

const serverError = (res, message = 'Internal Server Error') => 
  error(res, message, 'SERVER_ERROR', 500);
```

### 8.2 Global Error Handler

```javascript
// middleware/errorHandler.js

const response = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return response.badRequest(res, messages.join(', '));
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return response.badRequest(res, `${field} already exists`);
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return response.unauthorized(res, 'Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    return response.unauthorized(res, 'Token expired');
  }
  
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return response.badRequest(res, 'File too large (max 50MB)');
  }
  
  // Default server error
  return response.serverError(res);
};

module.exports = errorHandler;
```

---

## 9. Configuration Management

### 9.1 Environment Variables

**File**: `.env.example`

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/vayureader

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
JWT_EXPIRY_DAYS=1

# OTP
OTP_GATEWAY_URL=http://localhost:8000/smsc/sends
OTP_EXPIRY_MINUTES=5
SKIP_OTP_SEND=true

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
OTP_RATE_LIMIT_MAX=5

# Elasticsearch (Optional)
ELASTICSEARCH_NODE=http://localhost:9200

# Testing
TESTING=false
```

### 9.2 Configuration Module

**File**: `src/config/environment.js`

```javascript
require('dotenv').config();

// Fail-fast validation
const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'OTP_GATEWAY_URL'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`FATAL: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

// JWT secret minimum length check
if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

module.exports = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production'
  },
  database: {
    uri: process.env.MONGODB_URI
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiryDays: parseInt(process.env.JWT_EXPIRY_DAYS, 10) || 1
  },
  otp: {
    gatewayUrl: process.env.OTP_GATEWAY_URL,
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
    skipSend: process.env.SKIP_OTP_SEND === 'true'
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    otpMaxRequests: parseInt(process.env.OTP_RATE_LIMIT_MAX, 10) || 5
  }
};
```

---

## 10. Testing Specifications

### 10.1 Unit Test Structure

```javascript
// tests/services/otp.service.test.js

const { generateOtp, saveOtp, verifyOtp, deleteOtp } = require('../../src/services/otp.service');

describe('OTP Service', () => {
  describe('generateOtp', () => {
    it('should generate 6-digit numeric OTP', () => {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    });
    
    it('should generate unique OTPs', () => {
      const otps = new Set();
      for (let i = 0; i < 100; i++) {
        otps.add(generateOtp());
      }
      expect(otps.size).toBeGreaterThan(90); // Allow some duplicates
    });
  });
  
  describe('saveOtp and verifyOtp', () => {
    const phone = '+1234567890';
    const deviceId = 'test-device';
    const otp = '123456';
    
    afterEach(async () => {
      await deleteOtp(phone);
    });
    
    it('should save and verify correct OTP', async () => {
      await saveOtp(phone, otp, deviceId);
      const result = await verifyOtp(otp, phone, deviceId);
      expect(result.valid).toBe(true);
    });
    
    it('should reject wrong OTP', async () => {
      await saveOtp(phone, otp, deviceId);
      const result = await verifyOtp('999999', phone, deviceId);
      expect(result.valid).toBe(false);
    });
    
    it('should reject wrong deviceId', async () => {
      await saveOtp(phone, otp, deviceId);
      const result = await verifyOtp(otp, phone, 'wrong-device');
      expect(result.valid).toBe(false);
    });
  });
});
```

### 10.2 Integration Test Structure

```javascript
// tests/routes/auth.routes.test.js

const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');

describe('Auth Routes', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });
  
  describe('POST /api/auth/login/request-otp', () => {
    it('should return 200 for valid request', async () => {
      const res = await request(app)
        .post('/api/auth/login/request-otp')
        .send({
          phone_number: '+1234567890',
          name: 'Test User',
          deviceId: 'test-device'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login/request-otp')
        .send({
          phone_number: '+1234567890'
          // Missing name and deviceId
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
    
    it('should return 429 when rate limit exceeded', async () => {
      const payload = {
        phone_number: '+1234567890',
        name: 'Test User',
        deviceId: 'test-device'
      };
      
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login/request-otp')
          .send(payload);
      }
      
      // 6th request should be rate limited
      const res = await request(app)
        .post('/api/auth/login/request-otp')
        .send(payload);
      
      expect(res.status).toBe(429);
    });
  });
});
```

---

## 11. Deployment Specifications

### 11.1 Dockerfile

```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Build stage (if needed)
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run lint

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy application code
COPY --chown=node:node . .

# Create uploads directory
RUN mkdir -p uploads && chown node:node uploads

# Switch to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "src/server.js"]
```

### 11.2 Docker Compose

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: vayureader_gateway
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/certs:/etc/nginx/certs
      - ./uploads:/usr/src/app/uploads:ro
    depends_on:
      app:
        condition: service_healthy
    networks:
      - backend-network
    restart: unless-stopped

  app:
    build:
      context: .
      target: production
    container_name: vayureader_api
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/vayureader
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    volumes:
      - ./uploads:/usr/src/app/uploads
    depends_on:
      - mongo
      - redis
    networks:
      - backend-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  mongo:
    image: mongo:6
    container_name: vayureader_db
    volumes:
      - mongo-data:/data/db
    networks:
      - backend-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: vayureader_cache
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - backend-network
    restart: unless-stopped

  sms-simulator:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: vayureader_sms
    command: node scripts/sms-simulator.js
    ports:
      - "8000:8000"
    networks:
      - backend-network
    profiles:
      - dev

networks:
  backend-network:
    driver: bridge

volumes:
  mongo-data:
  redis-data:
```

---

## 12. Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | Dev Team | Initial LLD |
| 2.0 | Jan 2026 | Dev Team | Added SSE, enhanced security, detailed algorithms |
