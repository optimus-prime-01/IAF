# Rate Limiting

Complete guide to rate limiting configuration and implementation in VayuReader Backend v2.

## Overview

The backend implements **two-layer rate limiting**:
1. **Application-level** (Express + Redis) - Granular per-endpoint limits
2. **Connection-level** (Nginx) - Broad connection limits

**Purpose**:
- Prevent abuse and DDoS attacks
- Ensure fair resource allocation
- Protect SMS gateway from spam
- Maintain system stability under load

---

## Application-Level Rate Limiting

### Implementation

**Library**: `express-rate-limit` + `rate-limit-redis`  
**Storage**: Redis (distributed across multiple instances)  
**Configuration**: `src/config/apiLimit-config.js`

### Architecture

```
Client Request
    ↓
Nginx (connection limit)
    ↓
Express Middleware
    ↓
Rate Limiter Middleware
    ↓
Redis (check/increment counter)
    ↓
Controller (if allowed)
```

---

## Configuration File

**File**: `src/config/apiLimit-config.js`

```javascript
const apiLimitConfig = {
  // Default limit for all endpoints
  default: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                   // 100 requests
    message: 'Too many requests, please try again later'
  },
  
  // Authentication endpoints
  auth: {
    otp: {
      prefix: 'otp',
      windowMs: 15 * 60 * 1000,  // 15 minutes
      max: 5,                     // 5 OTP requests
      message: 'Too many OTP requests, please try again later'
    },
    login: {
      prefix: 'login',
      windowMs: 60 * 1000,       // 1 minute
      max: 5,                     // 5 login attempts
      message: 'Too many login attempts, please try again later'
    },
    createAdmin: {
      prefix: 'create-admin',
      windowMs: 60 * 60 * 1000,  // 1 hour
      max: 5,                     // 5 admin creations
      message: 'Too many admin creation attempts'
    }
  },
  
  // File uploads
  uploads: {
    dictionary: {
      prefix: 'upload-dict',
      windowMs: 60 * 60 * 1000,  // 1 hour
      max: 10,                    // 10 uploads
      message: 'Upload limit exceeded'
    },
    abbreviation: {
      prefix: 'upload-abbr',
      windowMs: 60 * 60 * 1000,  // 1 hour
      max: 10,                    // 10 uploads
      message: 'Upload limit exceeded'
    }
  },
  
  // Search operations
  search: {
    prefix: 'search',
    windowMs: 60 * 1000,         // 1 minute
    max: 60,                      // 60 searches (1/sec average)
    message: 'Search limit exceeded, please slow down'
  }
};
```

### Configuration Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefix` | String | Redis key prefix (must be unique) |
| `windowMs` | Number | Time window in milliseconds |
| `max` | Number | Max requests allowed in window |
| `message` | String | Error message when limit exceeded |

---

## Rate Limiter Factory

**File**: `src/middleware/rateLimiter.js`

### createLimiter Function

```javascript
const createLimiter = ({ prefix, windowMs, max, message }) => {
  return rateLimit({
    windowMs: windowMs || rateLimitConfig.windowMs,
    max: max || rateLimitConfig.maxRequests,
    store: createRedisStore(prefix),
    message: {
      success: false,
      message: message || 'Too many requests, please try again later',
      errorCode: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,   // RateLimit-* headers
    legacyHeaders: false     // X-RateLimit-* headers (deprecated)
  });
};
```

### Redis Store

```javascript
const createRedisStore = (prefix) => {
  try {
    return new RedisStore({
      sendCommand: async (...args) => {
        if (!redisClient.isOpen) {
          await connectRedis();
        }
        return redisClient.sendCommand(args);
      },
      prefix: `rl:${prefix}:`  // e.g., "rl:otp:192.168.1.1"
    });
  } catch (error) {
    console.warn(`Redis store failed for ${prefix}, using memory store`);
    return undefined;  // Falls back to memory store
  }
};
```

**Why Redis?**
- Distributed rate limiting across multiple server instances
- Persistent counters (survive server restarts)
- Atomic increment operations
- Automatic expiration (TTL)

---

## Pre-Configured Limiters

### apiLimiter (Default)

```javascript
const apiLimiter = createLimiter({
  prefix: 'api',
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

**Applied to**: Most endpoints (unless overridden)

### otpLimiter

```javascript
const otpLimiter = createLimiter({
  prefix: 'otp',
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests, please try again later'
});
```

**Applied to**:
- `POST /api/auth/login/request-otp`
- `POST /api/admin/login/request-otp`

**Why Strict?**
- Prevents SMS gateway abuse
- Limits cost (SMS charges per message)
- Prevents brute-force attacks

### loginLimiter

```javascript
const loginLimiter = createLimiter({
  prefix: 'login',
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});
```

**Applied to**:
- `POST /api/auth/login/verify-otp`
- `POST /api/admin/login/verify-otp`

**Why Strict?**
- Prevents OTP brute-force (6-digit = 1M combinations)
- 5 attempts per minute = 300 attempts per hour max
- Protects against credential stuffing

---

## Usage in Routes

### Example: Auth Routes

```javascript
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');

// OTP request (5 per 15 min)
router.post('/login/request-otp',
  otpLimiter,
  authController.requestLoginOtp
);

// OTP verification (5 per 1 min)
router.post('/login/verify-otp',
  loginLimiter,
  authController.verifyLoginOtp
);
```

### Example: Custom Limiter

```javascript
const { createLimiter } = require('../middleware/rateLimiter');
const apiLimitConfig = require('../config/apiLimit-config');

// Use config from apiLimit-config.js
const bulkUploadLimiter = createLimiter({
  ...apiLimitConfig.uploads.dictionary
});

router.post('/dictionary/upload',
  authenticateAdmin,
  bulkUploadLimiter,
  dictionaryController.uploadDictionary
);
```

### Example: Dynamic Limiter

```javascript
// Create limiter on-the-fly
const customLimiter = createLimiter({
  prefix: 'custom-endpoint',
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 20,
  message: 'Custom limit exceeded'
});

router.post('/custom-endpoint',
  customLimiter,
  controller.customAction
);
```

---

## Response Headers

When rate limit is active, these headers are included:

### Standard Headers (RateLimit-*)

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1704902400
```

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Maximum requests allowed in window |
| `RateLimit-Remaining` | Requests remaining in current window |
| `RateLimit-Reset` | Unix timestamp when limit resets |

### When Limit Exceeded

**Status Code**: `429 Too Many Requests`

**Response Body**:
```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "errorCode": "RATE_LIMIT_EXCEEDED"
}
```

**Headers**:
```
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1704902400
Retry-After: 900
```

---

## Redis Key Structure

### Key Format

```
rl:<prefix>:<identifier>
```

**Examples**:
```
rl:otp:192.168.1.100
rl:login:192.168.1.100
rl:api:192.168.1.100
rl:search:192.168.1.100
```

### Identifier

By default, the identifier is the client's IP address (`req.ip`).

**Custom Identifier** (e.g., by user ID):
```javascript
const createLimiter = ({ prefix, windowMs, max, message }) => {
  return rateLimit({
    // ... other options ...
    keyGenerator: (req) => {
      return req.user?.userId || req.ip;  // Use userId if authenticated
    }
  });
};
```

### TTL

Keys automatically expire after `windowMs`:
```
TTL rl:otp:192.168.1.100
# Output: 895 (seconds remaining)
```

---

## Monitoring

### View Rate Limit Status

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# List all rate limit keys
KEYS rl:*

# Get specific key value
GET rl:otp:192.168.1.100

# Get TTL
TTL rl:otp:192.168.1.100
```

### Clear Rate Limits

```bash
# Clear all rate limits
docker-compose exec redis redis-cli FLUSHDB

# Clear specific prefix
docker-compose exec redis redis-cli --eval "return redis.call('del', unpack(redis.call('keys', 'rl:otp:*')))"

# Clear specific IP
docker-compose exec redis redis-cli DEL rl:otp:192.168.1.100
```

---

## Nginx Connection-Level Rate Limiting

**File**: `nginx/conf.d/default.conf`

### Configuration

```nginx
http {
  # Define rate limit zones
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
  limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;
  
  server {
    # Apply to API endpoints
    location /api {
      limit_req zone=api_limit burst=20 nodelay;
      proxy_pass http://backend;
    }
    
    # Stricter limit for auth
    location /api/auth {
      limit_req zone=auth_limit burst=5 nodelay;
      proxy_pass http://backend;
    }
  }
}
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `zone=api_limit:10m` | Zone name and memory size (10MB) |
| `rate=10r/s` | Average rate (10 requests/second) |
| `burst=20` | Allow bursts up to 20 requests |
| `nodelay` | Process burst requests immediately |

### How It Works

1. **Leaky Bucket Algorithm**:
   - Requests fill a "bucket" at `rate`
   - Bucket capacity is `burst`
   - Excess requests are rejected

2. **Example** (rate=10r/s, burst=20):
   - Client sends 30 requests instantly
   - First 20 requests accepted (burst)
   - Next 10 requests queued (processed at 10r/s)
   - Last 10 requests rejected (503 error)

### Response

**Status Code**: `503 Service Temporarily Unavailable`

**Body**:
```html
<html>
<head><title>503 Service Temporarily Unavailable</title></head>
<body>
<center><h1>503 Service Temporarily Unavailable</h1></center>
</body>
</html>
```

---

## Best Practices

### 1. Set Appropriate Limits

**Too Strict**:
- Legitimate users get blocked
- Poor user experience
- Support tickets increase

**Too Lenient**:
- Abuse not prevented
- System overload
- Costs increase (SMS, bandwidth)

**Guidelines**:
- **Auth endpoints**: 5-10 per minute
- **Search endpoints**: 60-120 per minute
- **Upload endpoints**: 10-20 per hour
- **General API**: 100-200 per 15 minutes

### 2. Use Different Limits for Different Endpoints

```javascript
// Expensive operation (database write)
const uploadLimiter = createLimiter({ max: 10, windowMs: 60*60*1000 });

// Cheap operation (cached read)
const searchLimiter = createLimiter({ max: 60, windowMs: 60*1000 });
```

### 3. Whitelist Trusted IPs

```javascript
const createLimiter = ({ prefix, windowMs, max, message }) => {
  return rateLimit({
    // ... other options ...
    skip: (req) => {
      const trustedIPs = ['192.168.1.100', '10.0.0.1'];
      return trustedIPs.includes(req.ip);
    }
  });
};
```

### 4. Use User-Based Limits for Authenticated Endpoints

```javascript
keyGenerator: (req) => {
  return req.user?.userId || req.ip;
}
```

**Benefits**:
- More accurate tracking
- Prevents IP-based bypass (VPN, proxy)
- Better for mobile users (changing IPs)

### 5. Log Rate Limit Violations

```javascript
const createLimiter = ({ prefix, windowMs, max, message }) => {
  return rateLimit({
    // ... other options ...
    handler: (req, res) => {
      console.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
      res.status(429).json({
        success: false,
        message,
        errorCode: 'RATE_LIMIT_EXCEEDED'
      });
    }
  });
};
```

---

## Troubleshooting

### "Too many requests" Error (Legitimate User)

**Cause**: User exceeded rate limit  
**Solution**:
1. Check if limit is too strict
2. Whitelist user's IP temporarily
3. Clear rate limit for that IP:
   ```bash
   docker-compose exec redis redis-cli DEL rl:api:192.168.1.100
   ```

### Rate Limits Not Working

**Symptoms**: No rate limiting enforced  
**Causes**:
1. Redis not connected
2. Middleware not applied to route
3. Fallback to memory store (not distributed)

**Solution**:
```bash
# Check Redis connection
docker-compose logs redis

# Check middleware order
# Rate limiter must be BEFORE controller
router.post('/endpoint',
  rateLimiter,  // ← Must be here
  controller.action
);
```

### Different Limits on Different Servers

**Cause**: Using memory store instead of Redis  
**Solution**:
- Ensure Redis is running
- Check Redis connection in logs
- Verify `createRedisStore` is not falling back

### Rate Limit Persists After Window

**Cause**: Redis key not expiring  
**Solution**:
```bash
# Check TTL
docker-compose exec redis redis-cli TTL rl:api:192.168.1.100

# If -1 (no expiry), manually delete
docker-compose exec redis redis-cli DEL rl:api:192.168.1.100
```

---

## Performance Impact

### Redis Overhead

**Per Request**:
- 1 Redis `INCR` command (~1ms)
- 1 Redis `EXPIRE` command (~1ms)
- Total: ~2ms overhead

**Optimization**:
- Use pipelining for multiple commands
- Use connection pooling
- Monitor Redis latency

### Memory Usage

**Per IP**:
- Key: ~50 bytes
- Value: ~10 bytes
- Total: ~60 bytes per IP

**Example** (10,000 unique IPs):
- 10,000 × 60 bytes = 600 KB
- Negligible memory usage

---

## Security Considerations

1. **Don't rely solely on rate limiting** - Use authentication, input validation, etc.
2. **Monitor for distributed attacks** - Single IP limit can be bypassed with botnets
3. **Use CAPTCHA for critical endpoints** - Additional layer for auth, registration
4. **Implement account lockout** - After N failed login attempts
5. **Log and alert on violations** - Detect attack patterns

---

## Testing

### Manual Testing

```bash
# Test OTP limit (5 per 15 min)
for i in {1..6}; do
  curl -X POST https://localhost/api/auth/login/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phone_number":"+1234567890","name":"Test","deviceId":"test"}'
  echo ""
done

# 6th request should return 429
```

### Automated Testing

```javascript
const request = require('supertest');
const app = require('../src/app');

describe('Rate Limiting', () => {
  it('should block after 5 OTP requests', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login/request-otp')
        .send({ phone_number: '+1234567890', name: 'Test', deviceId: 'test' });
      expect(res.status).toBe(200);
    }
    
    // 6th request should be blocked
    const res = await request(app)
      .post('/api/auth/login/request-otp')
      .send({ phone_number: '+1234567890', name: 'Test', deviceId: 'test' });
    expect(res.status).toBe(429);
    expect(res.body.errorCode).toBe('RATE_LIMIT_EXCEEDED');
  });
});
```

---

## Production Checklist

- [ ] Redis configured and running
- [ ] Rate limits set appropriately for each endpoint
- [ ] Trusted IPs whitelisted (if applicable)
- [ ] Rate limit violations logged
- [ ] Monitoring/alerting configured
- [ ] Nginx connection limits configured
- [ ] CAPTCHA implemented for critical endpoints
- [ ] Account lockout implemented for failed logins
- [ ] Rate limit headers enabled (`standardHeaders: true`)
- [ ] Documentation updated with current limits

---

## References

- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
- [rate-limit-redis Documentation](https://github.com/express-rate-limit/rate-limit-redis)
- [Nginx Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
- [IETF Rate Limit Headers](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers)
