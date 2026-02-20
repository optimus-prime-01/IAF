# Deployment Guide

Instructions for deploying VayuReader Backend v2 to production.

## Prerequisites
-   Docker Engine & Docker Compose
-   Domain name (for SSL)
-   Access to SMS Gateway (if using real SMS)

---

## 1. Environment Setup

Create a `.env.production` file (do NOT commit this to Git). Reference `CONFIGURATION.md` for all variables.

**Critical Production Variables**:
```env
NODE_ENV=production
MONGODB_URI=mongodb://user:password@mongo-host:27017/vayureader?authSource=admin
JWT_SECRET=<complex_random_string_min_32_chars>
REDIS_URL=redis://redis-host:6379
OTP_GATEWAY_URL=https://sms-provider.com/send
ALLOWED_ORIGINS=https://admin.yourdomain.com
SKIP_OTP_SEND=false
```

---

## 2. Docker Deployment

### Production Compose File
Use `docker-compose.prod.yml` (ensure it exists or create based on standard compose).

```bash
# Build and Run
docker-compose -f docker-compose.prod.yml up --build -d
```

### Improvements for Production
-   **Multi-stage Build**: Ensure `Dockerfile` uses a multi-stage process to discard dev dependencies and limit image size.
-   **Restart Policies**: Set `restart: always` for all services.
-   **Logging**: Configure a logging driver (e.g., json-file with max-size).

---

## 3. SSL/TLS Setup

1.  **Generate Certificates**: Use Certbot (Let's Encrypt).
    ```bash
    certbot certonly --webroot -w /var/www/html -d api.yourdomain.com
    ```
2.  **Mount Certificates**: Ensure Nginx volume mounts point to the generated certs.
3.  **Update Nginx Config**: Verify `ssl_certificate` paths in `default.conf`.

---

## 4. Production Checklist

-   [ ] **Security**:
    -   [ ] Change all default passwords (Mongo, Redis).
    -   [ ] firewall rules (only 80/443 open to public).
    -   [ ] `JWT_SECRET` is strong.
-   [ ] **Data**:
    -   [ ] Persistent volumes configured for MongoDB and Uploads.
    -   [ ] Backup strategy in place for DB and Uploads.
-   [ ] **Performance**:
    -   [ ] Indexes ensured (`npm run optimize-db`).
    -   [ ] Nginx caching enabled.
-   [ ] **Monitoring**:
    -   [ ] Logs are being collected/rotated.
    -   [ ] Uptime monitoring configured (ping endpoint).

---

## 5. Updates & Rollbacks

**Zero-Downtime Deployment**:
-   Generally requires orchestration (Kubernetes/Swarm) or blue-green deployment with a load balancer.
-   With `docker-compose`, there will be brief downtime during container restart.

**Standard Update**:
```bash
git pull origin main
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```
