# Caching Strategy

Complete guide to caching layers in VayuReader Backend v2.

## Overview

Caching is implemented at multiple layers to ensure low latency and reduced database load:
1.  **Nginx Proxy Cache** - Caches HTTP responses for read-heavy endpoints.
2.  **Application Cache (Redis)** - Caches computed results and database queries.
3.  **Client-Side Cache** - Browser caching via HTTP headers.

---

## 1. Nginx Proxy Cache

**Purpose**: Caches entire HTTP responses for static or quasi-static data.
**Location**: `nginx/conf.d/default.conf`

| Endpoint | TTL | Cache Key |
|---|---|---|
| `/api/dictionary/word/:word` | 5 min | `$request_uri` |
| `/api/dictionary/search/:term` | 5 min | `$request_uri` |
| `/api/abbreviations/*` | 5 min | `$request_uri` |

**Headers**:
-   `X-Cache-Status`: Indicates cache hit/miss (`HIT`, `MISS`, `BYPASS`).

**Invalidation**:
Since Nginx cache is file-based in the container, it's typically cleared by redeploying or waiting for TTL. For immediate invalidation, admin scripts would be needed to delete cache files (not currently exposed via API).

---

## 2. Application Cache (Redis)

**Purpose**: Stores expensive query results and frequent lookups.
**Implementation**: `src/services/search.service.js`, `src/services/otp.service.js`

### Dictionary & Abbreviations

Search results are cached in Redis to avoid hitting Elasticsearch or MongoDB repeatedly for the same query.

-   **Key Format**: `search:dict:<query>` or `search:abbr:<query>`
-   **TTL**: 60 seconds (configurable)
-   **Structure**: JSON stringified array of results

### OTP Storage

OTPs are strictly cached in Redis.

-   **Key Format**: `otp:<phone_number>`
-   **TTL**: 5 minutes
-   **Data**: Encrypted OTP string (device-bound)

### Implementation Pattern

```javascript
const getCachedData = async (key) => {
    // 1. Check Redis
    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached);

    // 2. Fetch from Source (DB/ES)
    const data = await fetchDataFromDb();

    // 3. Store in Redis
    await redisClient.setEx(key, 60, JSON.stringify(data));

    return data;
};
```

---

## 3. Client-Side Caching

**Purpose**: Reduces network requests for static assets.
**Location**: Nginx configuration

| Asset Type | TTL | Headers |
|---|---|---|
| PDFs (`.pdf`) | 7 days | `Cache-Control: public, immutable` |
| Images (`.jpg`, `.png`) | 30 days | `Cache-Control: public, immutable` |
| Other Uploads | 30 days | `Cache-Control: public, no-transform` |

**Note**: API responses generally default to `no-cache` unless served via the specific cached Nginx locations.

---

## Redis Configuration

**Service**: `src/config/redis.js`

-   **Client**: Uses `redis` npm package.
-   **Connection**: Single shared connection for general operations with auto-reconnect.
-   **Pub/Sub**: Dedicated client instance for subscriptions (required by Redis protocol).

### Best Practices

1.  **Always use TTL**: Never store keys indefinitely (except perhaps for configuration flags).
2.  **Handle Failures**: Application should fallback gracefully to DB if Redis is down.
3.  **Namespace Keys**: Use colons (e.g., `user:123`, `cache:search:term`) to organize keys.

---

## Monitoring

Use `docker-compose exec redis redis-cli` to inspect cache:
-   `INFO memory`: Check memory usage.
-   `INFO stats`: Check cache hits/misses.
-   `DBSIZE`: Total number of keys.
