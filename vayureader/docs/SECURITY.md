# Security Hardening Guide

## VayuReader Backend v2

**Version**: 2.0  
**Date**: January 2026  
**Classification**: RESTRICTED - For Authorized Personnel Only  

---

## 1. Overview

This document provides security hardening guidelines for deploying VayuReader Backend v2 in production environments. It covers configuration best practices, security checklists, and compliance considerations.

---

## 2. Pre-Deployment Security Checklist

### 2.1 Environment Configuration

- [ ] **JWT_SECRET is strong** (minimum 32 characters, cryptographically random)
- [ ] **JWT_SECRET is not committed to version control**
- [ ] **MongoDB authentication enabled** (username/password configured)
- [ ] **Redis password protected** (if exposed to network)
- [ ] **SKIP_OTP_SEND=false** in production
- [ ] **NODE_ENV=production** set
- [ ] **Specific ALLOWED_ORIGINS** configured (no wildcards)

### 2.2 Network Security

- [ ] **HTTPS only** (HTTP redirects to HTTPS)
- [ ] **TLS 1.2+ enforced** (TLS 1.0/1.1 disabled)
- [ ] **Strong cipher suites** configured in Nginx
- [ ] **Internal services not exposed** (MongoDB, Redis, Node.js ports closed)
- [ ] **Firewall configured** (only ports 80, 443 open to public)

### 2.3 Application Security

- [ ] **Rate limiting enabled** on all endpoints
- [ ] **Helmet security headers** enabled
- [ ] **CORS properly configured** with specific origins
- [ ] **Cookie flags set** (HttpOnly, Secure, SameSite)
- [ ] **Input validation** on all endpoints
- [ ] **NoSQL injection protection** enabled

### 2.4 Operational Security

- [ ] **Audit logging enabled** for all admin actions
- [ ] **User activity logging** enabled
- [ ] **Log rotation** configured
- [ ] **Backup strategy** implemented
- [ ] **SSL certificate renewal** automated

---

## 3. Secure Configuration

### 3.1 Nginx SSL Configuration

**File**: `nginx/conf.d/default.conf`

```nginx
# Enforce HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    # SSL Certificate (use certbot for Let's Encrypt)
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # Modern SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    # SSL Session Caching
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'self';" always;

    # ... rest of configuration
}
```

### 3.2 MongoDB Security

**Docker Compose Configuration:**

```yaml
mongo:
  image: mongo:6
  container_name: vayureader_db
  environment:
    - MONGO_INITDB_ROOT_USERNAME=admin
    - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
  volumes:
    - mongo-data:/data/db
  networks:
    - backend-network
  restart: unless-stopped
  # No ports exposed to host
```

**Application Connection:**

```env
MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongo:27017/vayureader?authSource=admin
```

### 3.3 Redis Security

**Docker Compose Configuration:**

```yaml
redis:
  image: redis:7-alpine
  container_name: vayureader_cache
  command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
  volumes:
    - redis-data:/data
  networks:
    - backend-network
  restart: unless-stopped
  # No ports exposed to host
```

**Application Connection:**

```env
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
```

### 3.4 Cookie Security

**Production Cookie Configuration:**

```javascript
// User token cookie
res.cookie('auth_token', token, {
    httpOnly: true,      // Prevents JavaScript access (XSS protection)
    secure: true,        // HTTPS only
    sameSite: 'strict',  // CSRF protection
    maxAge: 100 * 365 * 24 * 60 * 60 * 1000,  // 100 years
    path: '/',
    domain: '.yourdomain.com'  // Set for cross-subdomain access if needed
});

// Admin token cookie
res.cookie('admin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,  // 1 day
    path: '/',
    domain: '.yourdomain.com'
});
```

---

## 4. Password Policy

### 4.1 Admin Password Requirements

Enforced in `src/middleware/validation.js`:

```javascript
const passwordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

const validatePassword = (password) => {
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters' };
    }
    if (password.length > 128) {
        return { valid: false, error: 'Password must not exceed 128 characters' };
    }
    if (!passwordPolicy.pattern.test(password)) {
        return { 
            valid: false, 
            error: 'Password must contain uppercase, lowercase, number, and special character' 
        };
    }
    return { valid: true };
};
```

### 4.2 Password Hashing

- **Algorithm**: bcrypt
- **Salt Rounds**: 10 (recommended minimum)
- **Example**:

```javascript
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};
```

---

## 5. Rate Limiting Strategy

### 5.1 Endpoint-Specific Limits

| Endpoint Category | Rate Limit | Window | Purpose |
|-------------------|------------|--------|---------|
| OTP Request | 5 requests | 15 minutes | Prevent SMS abuse |
| Login Verification | 5 requests | 1 minute | Prevent brute force |
| Admin Creation | 5 requests | 1 hour | Prevent account spam |
| Search API | 60 requests | 1 minute | Protect database |
| File Upload | 10 requests | 1 hour | Prevent storage abuse |
| General API | 100 requests | 15 minutes | Fair usage |

### 5.2 Account Lockout

After 5 failed login attempts within 15 minutes:

```javascript
const handleLoginAttempt = async (contact, success) => {
    const key = `login_attempts:${contact}`;
    
    if (success) {
        await redisClient.del(key);
        return;
    }
    
    const attempts = await redisClient.incr(key);
    await redisClient.expire(key, 15 * 60); // 15 minutes
    
    if (attempts >= 5) {
        // Log security event
        console.warn(`Account lockout triggered for: ${contact}`);
        // Optionally notify admin
    }
};
```

---

## 6. Input Validation & Sanitization

### 6.1 NoSQL Injection Prevention

**Middleware**: `express-mongo-sanitize`

```javascript
const mongoSanitize = require('express-mongo-sanitize');

// Remove $ and . from request to prevent NoSQL injection
app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`NoSQL Injection attempt blocked: ${key}`);
    }
}));
```

### 6.2 ReDoS Prevention

**Custom regex escaping**:

```javascript
const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Safe usage
const safePattern = new RegExp(`^${escapeRegex(userInput)}`, 'i');
```

### 6.3 File Upload Validation

```javascript
const allowedMimeTypes = {
    pdf: ['application/pdf'],
    image: ['image/jpeg', 'image/png', 'image/webp']
};

const validateUpload = (file, type) => {
    const allowed = allowedMimeTypes[type] || [];
    
    if (!allowed.includes(file.mimetype)) {
        return { valid: false, error: 'Invalid file type' };
    }
    
    // Check magic bytes (file signature)
    const signatures = {
        'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47]
    };
    
    const fileBuffer = fs.readFileSync(file.path);
    const signature = signatures[file.mimetype];
    
    if (signature) {
        const matches = signature.every((byte, i) => fileBuffer[i] === byte);
        if (!matches) {
            return { valid: false, error: 'File signature mismatch' };
        }
    }
    
    return { valid: true };
};
```

---

## 7. Audit Logging Requirements

### 7.1 Events to Log

**User Events:**
- Successful login
- Failed login attempts
- Device changes
- PDF access
- Password changes

**Admin Events:**
- All CRUD operations
- Permission changes
- User management actions
- Bulk operations

### 7.2 Log Format

```javascript
{
    timestamp: "2026-01-19T10:00:00.000Z",
    action: "CREATE",
    resourceType: "PDF",
    resourceId: "507f1f77bcf86cd799439011",
    adminId: "507f1f77bcf86cd799439012",
    adminName: "Admin User",
    adminContact: "+919876543210",
    ip: "192.168.1.100",
    userAgent: "Mozilla/5.0...",
    details: {
        title: "New Document",
        category: "Operations"
    }
}
```

### 7.3 Log Retention

- **User Activity Logs**: 1 year minimum
- **Admin Audit Logs**: 3 years minimum (compliance)
- **Security Events**: 5 years (investigations)

---

## 8. Security Headers

### 8.1 Helmet Configuration

```javascript
const helmet = require('helmet');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
```

### 8.2 Expected Response Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
```

---

## 9. Incident Response

### 9.1 Security Incident Types

| Type | Severity | Response Time |
|------|----------|---------------|
| Suspected breach | Critical | Immediate |
| Account compromise | High | 1 hour |
| DDoS attack | High | 15 minutes |
| Rate limit abuse | Medium | 4 hours |
| Failed login spike | Low | 24 hours |

### 9.2 Response Procedures

**Account Compromise:**
1. Block affected user immediately
2. Invalidate all tokens (rotate JWT secret if widespread)
3. Notify user via alternative channel
4. Review audit logs
5. Document incident

**DDoS Attack:**
1. Enable additional rate limiting
2. Block suspicious IPs at firewall
3. Scale up resources if needed
4. Enable CDN protection (CloudFlare)
5. Document attack patterns

---

## 10. Periodic Security Tasks

### 10.1 Daily

- [ ] Review failed login attempts
- [ ] Check container health
- [ ] Monitor rate limit violations

### 10.2 Weekly

- [ ] Review audit logs for anomalies
- [ ] Check SSL certificate expiration
- [ ] Verify backup completion

### 10.3 Monthly

- [ ] Rotate database credentials
- [ ] Review user access patterns
- [ ] Update dependencies for security patches
- [ ] Run vulnerability scan

### 10.4 Quarterly

- [ ] Rotate JWT secret
- [ ] Review and update firewall rules
- [ ] Conduct security audit
- [ ] Update documentation

---

## 11. Compliance Considerations

### 11.1 Data Protection

- All data encrypted in transit (TLS 1.2+)
- Sensitive data (passwords, OTPs) encrypted at rest
- PII minimized and access controlled
- Audit trail maintained for all access

### 11.2 Access Control

- Role-based access control (RBAC)
- Principle of least privilege
- Multi-factor authentication for admins
- Session timeout enforcement

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Dev Team | Initial security guide |
