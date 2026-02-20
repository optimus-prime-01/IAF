# Nginx Configuration

Complete guide to the Nginx reverse proxy configuration for VayuReader Backend v2.

## Overview

Nginx serves as a reverse proxy with the following responsibilities:
- **SSL/TLS termination** - Handles HTTPS connections
- **Proxy caching** - Caches read-heavy API responses
- **Static file serving** - Serves uploaded PDFs and images directly
- **SSE optimization** - Disables buffering for Server-Sent Events
- **Rate limiting** - Connection-level limits (complementing application-level limits)
- **Security headers** - HSTS, X-Frame-Options, etc.

**Configuration File**: `nginx/conf.d/default.conf`

---

## Server Blocks

### HTTP Server (Port 80)

Minimal configuration for development/testing. In production, this should redirect to HTTPS.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name localhost;
    
    # Proxy all requests to backend
    location / {
        proxy_pass http://backend;
        # ... proxy headers ...
    }
}
```

**Recommendation**: Add HTTP → HTTPS redirect in production:
```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

---

### HTTPS Server (Port 443)

Main production server with SSL, caching, and optimizations.

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localhost;
    
    client_max_body_size 50M;  # Allow 50MB uploads
    
    # SSL configuration
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    
    # ... locations ...
}
```

---

## SSL/TLS Configuration

### Certificate Setup

**Development** (Self-Signed):
```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/server.key \
  -out nginx/certs/server.crt \
  -subj "/CN=localhost"
```

**Production** (Let's Encrypt):
```bash
# Use certbot
certbot certonly --webroot -w /var/www/html -d yourdomain.com
```

### SSL Protocols & Ciphers

```nginx
# Modern compatibility (TLS 1.2 and 1.3 only)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...;

# Session caching
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

**Why TLS 1.2+?**
- TLS 1.0 and 1.1 are deprecated (RFC 8996)
- Vulnerable to attacks (BEAST, POODLE)
- PCI DSS requires TLS 1.2+

### Security Headers

```nginx
# HSTS (force HTTPS for 1 year)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN";

# XSS protection
add_header X-XSS-Protection "1; mode=block";

# Prevent MIME sniffing
add_header X-Content-Type-Options "nosniff";
```

---

## Location Blocks

### 1. SSE Endpoint (`/api/events`)

**Purpose**: Server-Sent Events for real-time PDF updates

```nginx
location /api/events {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection '';  # Disable keep-alive
    
    # CRITICAL: Disable buffering for SSE
    proxy_buffering off;
    proxy_cache off;
    
    # Long timeouts (24 hours)
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
    
    # Chunked transfer encoding
    chunked_transfer_encoding on;
    
    # Standard proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Why These Settings?**
- `proxy_buffering off` - Nginx won't buffer responses, allowing real-time streaming
- `proxy_cache off` - SSE responses must not be cached
- `Connection ''` - Disables keep-alive, required for SSE
- Long timeouts - SSE connections stay open indefinitely
- `chunked_transfer_encoding on` - Allows streaming without Content-Length

**Testing**:
```bash
curl -N -H "Authorization: Bearer <token>" https://localhost/api/events
```

---

### 2. Cached API Endpoints

**Purpose**: Cache read-heavy dictionary and abbreviation lookups

```nginx
location ~ ^/api/(dictionary/(word|search)|abbreviations($|/.*)) {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    
    # Enable proxy cache
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;  # Cache successful responses for 5 minutes
    proxy_cache_key "$request_uri";
    
    # Add cache status header (for debugging)
    add_header X-Cache-Status $upstream_cache_status;
    
    # Standard proxy headers
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Cache Zone Definition** (in `nginx.conf`):
```nginx
proxy_cache_path /var/cache/nginx/api_cache
    levels=1:2
    keys_zone=api_cache:10m
    max_size=100m
    inactive=60m
    use_temp_path=off;
```

**Cache Status Values**:
- `HIT` - Response served from cache
- `MISS` - Response not in cache, fetched from backend
- `BYPASS` - Cache bypassed (e.g., POST request)
- `EXPIRED` - Cached response expired, revalidating
- `STALE` - Serving stale content while revalidating

**Testing**:
```bash
# First request (MISS)
curl -I https://localhost/api/dictionary/word/example
# X-Cache-Status: MISS

# Second request (HIT)
curl -I https://localhost/api/dictionary/word/example
# X-Cache-Status: HIT
```

**Cache Invalidation**:
```bash
# Manual cache clear
docker-compose exec nginx rm -rf /var/cache/nginx/api_cache/*
```

---

### 3. General API Proxy

**Purpose**: Proxy all other API requests (auth, admin, PDFs, etc.)

```nginx
location /api {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**No Caching** - Auth, admin, and write operations should never be cached.

---

### 4. Static PDF Files

**Purpose**: Serve PDFs directly from filesystem with optimizations

```nginx
location ~ ^/uploads/(.*\.pdf)$ {
    alias /usr/src/app/uploads/$1;
    autoindex off;  # Disable directory listing
    
    # Allow byte-range requests (for PDF streaming/seeking)
    add_header Accept-Ranges bytes;
    
    # Long cache (PDFs rarely change)
    expires 7d;
    add_header Cache-Control "public, immutable";
    
    # Efficient file transfer
    sendfile on;
    tcp_nopush on;
    
    # Rate limiting (prevent bandwidth hogging)
    limit_rate 2m;          # 2 MB/s per connection
    limit_rate_after 5m;    # After first 5MB
}
```

**Why These Settings?**
- `sendfile on` - Zero-copy file transfer (kernel → network, bypassing userspace)
- `tcp_nopush on` - Send full packets (reduces overhead)
- `Accept-Ranges bytes` - Allows PDF viewers to seek/jump pages
- `limit_rate` - Prevents single user from consuming all bandwidth
- `immutable` - Browser won't revalidate (saves requests)

**Testing**:
```bash
# Download PDF
curl -O https://localhost/uploads/abc123/file.pdf

# Range request (download bytes 0-1023)
curl -H "Range: bytes=0-1023" https://localhost/uploads/abc123/file.pdf
```

---

### 5. Static Image Files (Thumbnails)

**Purpose**: Serve thumbnails with aggressive caching

```nginx
location ~ ^/uploads/(.*\.(jpg|jpeg|png|webp|gif))$ {
    alias /usr/src/app/uploads/$1;
    autoindex off;
    
    # Very long cache (images are immutable)
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

**Why 30 Days?**
- Thumbnails never change (UUID filenames)
- Reduces server load
- Improves client performance

---

### 6. Other Static Uploads

**Purpose**: Catch-all for other uploaded files

```nginx
location /uploads/ {
    root /usr/src/app;
    autoindex off;
    expires 30d;
    add_header Cache-Control "public, no-transform";
}
```

---

### 7. Root Location (Fallback)

**Purpose**: Proxy everything else to backend

```nginx
location / {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## Upstream Configuration

**File**: `nginx/nginx.conf`

```nginx
upstream backend {
    # Single backend server (for now)
    server app:3000;
    
    # Connection pooling
    keepalive 32;
}
```

**For Load Balancing** (multiple backend instances):
```nginx
upstream backend {
    least_conn;  # Route to server with fewest connections
    
    server app1:3000 weight=1;
    server app2:3000 weight=1;
    server app3:3000 weight=1;
    
    keepalive 64;
}
```

---

## Performance Tuning

### Worker Processes

```nginx
# Auto-detect CPU cores
worker_processes auto;

# Max connections per worker
events {
    worker_connections 1024;
}
```

**Total Capacity**: `worker_processes × worker_connections = max concurrent connections`

### Buffers

```nginx
http {
    # Client body buffer
    client_body_buffer_size 128k;
    client_max_body_size 50m;
    
    # Proxy buffers
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    proxy_busy_buffers_size 8k;
}
```

### Timeouts

```nginx
http {
    # Client timeouts
    client_body_timeout 12s;
    client_header_timeout 12s;
    send_timeout 10s;
    
    # Keep-alive
    keepalive_timeout 65s;
    keepalive_requests 100;
}
```

---

## Logging

### Access Log

```nginx
http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'cache:$upstream_cache_status';
    
    access_log /var/log/nginx/access.log main;
}
```

**Custom Fields**:
- `$upstream_cache_status` - Cache hit/miss status
- `$http_x_forwarded_for` - Original client IP (behind proxy)

### Error Log

```nginx
error_log /var/log/nginx/error.log warn;
```

**Log Levels**: `debug`, `info`, `notice`, `warn`, `error`, `crit`, `alert`, `emerg`

### Viewing Logs

```bash
# Access log
docker-compose logs nginx | grep access

# Error log
docker-compose logs nginx | grep error

# Follow logs
docker-compose logs -f nginx
```

---

## Security

### Rate Limiting (Connection-Level)

```nginx
http {
    # Define rate limit zones
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;
    
    server {
        # Apply to API endpoints
        location /api {
            limit_req zone=api_limit burst=20 nodelay;
            # ...
        }
        
        # Stricter limit for auth
        location /api/auth {
            limit_req zone=auth_limit burst=5 nodelay;
            # ...
        }
    }
}
```

**Parameters**:
- `rate=10r/s` - 10 requests per second average
- `burst=20` - Allow bursts up to 20 requests
- `nodelay` - Don't delay requests within burst limit

### IP Blacklisting

```nginx
# Block specific IPs
deny 192.168.1.100;
deny 10.0.0.0/8;

# Allow all others
allow all;
```

### Geo-Blocking

```nginx
geo $blocked_country {
    default 0;
    CN 1;  # Block China
    RU 1;  # Block Russia
}

server {
    if ($blocked_country) {
        return 403;
    }
}
```

---

## Monitoring

### Nginx Status Page

```nginx
location /nginx_status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;  # Only localhost
    deny all;
}
```

**Output**:
```
Active connections: 42
server accepts handled requests
 1234 1234 5678
Reading: 0 Writing: 1 Waiting: 41
```

### Prometheus Exporter

Use `nginx-prometheus-exporter`:
```bash
docker run -p 9113:9113 nginx/nginx-prometheus-exporter:latest \
  -nginx.scrape-uri=http://nginx/nginx_status
```

---

## Troubleshooting

### 502 Bad Gateway

**Cause**: Backend is down or unreachable  
**Solution**:
```bash
# Check backend status
docker-compose ps app

# Check backend logs
docker-compose logs app

# Restart backend
docker-compose restart app
```

### 504 Gateway Timeout

**Cause**: Backend is slow or hung  
**Solution**:
- Increase `proxy_read_timeout`
- Check backend performance
- Add more backend instances

### SSE Not Working

**Symptoms**: Events not received, connection closes immediately  
**Solution**:
- Verify `proxy_buffering off` in `/api/events` location
- Check `proxy_read_timeout` is long enough
- Ensure client sends `Accept: text/event-stream`

### Cache Not Working

**Symptoms**: `X-Cache-Status: BYPASS` on all requests  
**Solution**:
- Verify cache zone is defined in `nginx.conf`
- Check cache directory exists and is writable
- Ensure requests are GET (POST/PUT/DELETE bypass cache)

---

## Production Checklist

- [ ] SSL certificate from trusted CA (not self-signed)
- [ ] HTTP → HTTPS redirect enabled
- [ ] HSTS header enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Access logs enabled
- [ ] Error logs enabled
- [ ] Cache directory configured
- [ ] `client_max_body_size` set appropriately
- [ ] Worker processes set to `auto`
- [ ] Upstream health checks configured (if load balancing)
- [ ] Monitoring/alerting configured
- [ ] Log rotation configured

---

## Docker Integration

### Dockerfile

```dockerfile
FROM nginx:alpine

# Copy custom config
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Create cache directory
RUN mkdir -p /var/cache/nginx/api_cache

# Expose ports
EXPOSE 80 443
```

### Docker Compose

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/conf.d:/etc/nginx/conf.d
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    - ./nginx/certs:/etc/nginx/certs
    - ./uploads:/usr/src/app/uploads:ro
  depends_on:
    - app
  networks:
    - backend
```

---

## References

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx SSE Configuration](https://www.nginx.com/blog/nginx-nodejs-websockets-socketio/)
- [Nginx Caching Guide](https://www.nginx.com/blog/nginx-caching-guide/)
- [SSL Best Practices](https://wiki.mozilla.org/Security/Server_Side_TLS)
