# VayuReader Backend v2 Documentation

## Overview
The **VayuReader Backend** provides a RESTful API for PDF management, dictionary & abbreviation services, authentication, real‑time events (SSE), and admin management. It is built with **Node.js**, **Express**, **MongoDB**, **Redis**, and **Docker** for production deployment.

## Table of Contents
- [Setup & Installation](setup.md)
- [Configuration](CONFIGURATION.md)
- [API Endpoints](ENDPOINTS.md)
- [Services Overview](SERVICES.md)
- [Scripts & CLI Tools](SCRIPTS.md)
- [Server‑Sent Events (SSE)](SSE.md)
- [Performance & Scaling](PERFORMANCE.md)
- [Testing & Linting](testing.md)
- [Contribution Guidelines](CONTRIBUTING.md)

## Quick Start (Local Development)
```bash
# Clone repository
git clone <repo-url>
cd VayuReader_Backend_v2

# Install dependencies
npm install

# Create .env (copy from .env.example)
cp .env.example .env
# Edit .env with your values (MongoDB URI, Redis URL, etc.)

# Start services (MongoDB, Redis, Nginx) via Docker Compose
docker-compose up -d

# Run the backend
npm run dev   # uses nodemon for hot‑reloading
```
The API will be available at `http://localhost:3000/api/`.

## Docker Production Build
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```
See `docker-compose.prod.yml` for production‑specific settings (TLS, multi‑stage builds, environment variables).

## License
MIT © VayuReader Team
