# 🐳 VayuReader Backend - Docker Setup & Administration Guide

This document provides a comprehensive guide to understanding, running, and debugging the VayuReader Backend in a containerized Docker environment.

---

## 🏗️ Architecture Overview

The system runs as a multi-container application orchestrated by **Docker Compose**. It consists of 5 isolated services that communicate over a private bridge network.

### Service Map
| Service | Container Name | Internal Port | Host Port | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Nginx** | `vayureader_gateway` | 80, 443 | **80, 443** | **Entry Point**. Reverse proxy, SSL termination, and static file server. |
| **App** | `vayureader_api` | 3000 | - | **Backend**. Node.js API server (Express). |
| **Mongo** | `vayureader_db` | 27017 | - | **Database**. Persistent primary data store. |
| **Redis** | `vayureader_cache` | 6379 | - | **Cache**. Session storage, OTPs, and rate limiting. |
| **SMS** | `vayureader_sms` | 8000 | **8000** | **Dev Tool**. Local SMS simulator. **(Enabled with `--profile dev`)** |

> **Note**: Only Nginx (80/443) and SMS Simulator (8000) are exposed to your host machine. The Backend, Database, and Redis are locked inside the internal network for security.

---

## ⚙️ Configuration Explained

### 1. `docker-compose.yml` Breakdown
This file is the blueprint for the entire stack.

*   **`networks`**: We use a custom bridge network (`backend-network`). This allows services to resolve each other by name (e.g., the backend connects to `mongodb://mongo:27017` because the service name is `mongo`).
*   **`volumes`**:
    *   `./uploads`: Shared between **App** (to write files) and **Nginx** (to serve files).
    *   `mongo-data`: A managed volume to persist database records even if containers are destroyed.
*   **`healthcheck`**:
    *   The **App** service has a `healthcheck` that pings `/health`.
    *   **Nginx** relies on `depends_on: { condition: service_healthy }`. This ensures Nginx **waits** until the backend is fully running before starting, preventing "502 Bad Gateway" errors on startup.
*   **`profiles`**:
    *   The `sms-simulator` is assigned to the `dev` profile. It will NOT start in production.

### 2. Environment Variables (`.env`)
The Docker container loads environment variables from your `.env` file. Crucial variables for Docker:

*   `NODE_ENV=production`: Optimizes Node.js for performance.
*   `MONGODB_URI`: set to `mongodb://mongo:27017/vayureader` (Docker DNS).
*   `ALLOWED_ORIGINS`: Must include your frontend URL (e.g., `https://localhost:3000`) for CORS.
*   **`OTP_GATEWAY_URL`**:
    *   **Development**: `http://sms-simulator:8000/smsc/sends`
    *   **Production**: `https://api.your-sms-provider.com/send` (Replace with real vendor URL)

### 3. Nginx Configuration (`nginx/conf.d/default.conf`)
*   **SSL Termination**: Handles HTTPS encryption so your Node.js app doesn't have to.
*   **Proxy Pass**: Forwards requests to `http://app:3000`.
*   **Client Body Size**: Set to `50M` to allow large PDF uploads.

---

## 🚀 Installation & Setup

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.

### step 1: Generate SSL Certificates
Since we use HTTPS locally, we need self-signed certificates. You can generate these **using Docker** (no need to install OpenSSL on Windows):

```bash
docker run --rm -v ${PWD}/nginx/certs:/certs -w /certs alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt -subj "/C=IN/ST=Delhi/L=NewDelhi/O=IAF/OU=IT/CN=localhost"
```

### Step 2: Start the Stack

**For Development (with SMS Simulator):**
```bash
docker-compose --profile dev up -d --build
```

**For Production (No Simulator):**
```bash
docker-compose up -d --build
```
*(Only Nginx, App, Mongo, and Redis will start)*

### Step 3: Create Super Admin
You cannot register a Super Admin via the API. You must seed it directly into the running container:

```bash
# Syntax: node scripts/seedAdmin.js "<Name>" "<Phone>" "<Password>"
docker-compose exec app node scripts/seedAdmin.js "Admin User" "9999999999" "StrongPassword123"
```

---

## 🛠️ Switching to Production

To go live, follow these steps:

1.  **Stop the dev stack**: `docker-compose down`
2.  **Update `.env`**:
    *   Change `OTP_GATEWAY_URL` to your real SMS provider's endpoint.
    *   Ensure `ALLOWED_ORIGINS` matches your production domain (e.g., `https://reader.iaf.in`).
3.  **Run without dev profile**:
    ```bash
    docker-compose up -d --build
    ```
    The `vayureader_sms` container will NOT be created.

---

## 🛠️ Debugging & Troubleshooting

### Viewing Logs
If something isn't working, the logs are your best friend.

**View all logs (streaming):**
```bash
docker-compose logs -f
```

**View specific service logs:**
```bash
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f mongo
```

### Accessing Containers (Shell)
To inspect files or run commands inside a container:

**Access Backend Shell:**
```bash
docker-compose exec app sh
# Now you are inside the container at /usr/src/app
ls -la
exit
```

**Access Database Shell:**
```bash
docker-compose exec mongo mongosh
# Inside Mongo shell:
# use vayureader
# db.users.find()
```

### Common Issues & Solutions

#### 1. 502 Bad Gateway (Nginx)
*   **Cause**: Nginx is running, but the Backend is down or not reachable.
*   **Fix**:
    1.  Check backend logs: `docker-compose logs app`.
    2.  If backend is up, restart Nginx to force a reconnect: `docker-compose restart nginx`.

#### 2. CORS Errors (Frontend)
*   **Cause**: The browser blocked the request because the origin isn't allowed.
*   **Fix**:
    1.  Check `docker-compose.yml`. Ensure `ALLOWED_ORIGINS` includes your frontend URL exactly (e.g., `https://localhost:3000`).
    2.  Apply changes: `docker-compose up -d`.

#### 3. Upload Failed (413 Payload Too Large)
*   **Cause**: File is larger than Nginx's limit (default 1MB).
*   **Fix**:
    1.  Edit `nginx/conf.d/default.conf`.
    2.  Ensure `client_max_body_size 50M;` is present.
    3.  Restart Nginx: `docker-compose restart nginx`.

#### 4. SSL/Https Warnings in Browser
*   **Cause**: Self-signed certificate.
*   **Fix**: This is normal for localhost. Click "Advanced" -> "Proceed to localhost (unsafe)".

#### 5. "MongoNetworkError" or Database Connection Failures
*   **Cause**: The backend started before the database was ready.
*   **Fix**: The app should auto-retry. If not, restart the app: `docker-compose restart app`.

---

## 📜 Cheat Sheet: Useful Commands

| Action | Command |
| :--- | :--- |
| **Start Dev (with Sim)** | `docker-compose --profile dev up -d --build` |
| **Start Prod (No Sim)** | `docker-compose up -d --build` |
| **Stop Everything** | `docker-compose down` |
| **View Logs** | `docker-compose logs -f` |
| **Restart Service** | `docker-compose restart <service_name>` |
| **Prune (Clean Up)** | `docker system prune -a` (warning: deletes all unused images) |
