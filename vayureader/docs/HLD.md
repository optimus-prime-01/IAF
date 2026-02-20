# High-Level Design (HLD) Document

## VayuReader Backend v2

**Version**: 2.0  
**Date**: January 2026  
**Author**: Development Team (IAF)  

---

## 1. Executive Summary

VayuReader Backend v2 is a secure, scalable, and containerized RESTful API backend designed for the Indian Air Force's document management and reading application. The system provides secure PDF document management, dictionary/abbreviation lookup services, OTP-based authentication, admin panel functionality, and real-time event notifications.

### Key Features
- **Dual Authentication System**: OTP-based authentication for users with device binding; Password + OTP 2FA for administrators
- **PDF Document Management**: Upload, categorize, search, and serve PDF documents
- **Dictionary & Abbreviation Services**: Word lookup, meanings, synonyms, and abbreviation expansions
- **Real-time Updates**: Server-Sent Events (SSE) for instant PDF notifications
- **Comprehensive Audit Trail**: User activity and admin action logging
- **Horizontal Scalability**: Docker-based deployment with Redis Pub/Sub

---

## 2. System Architecture

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                                     │
│      ┌────────────┐    ┌────────────┐    ┌────────────────────┐             │
│      │ Mobile App │    │ Web Browser│    │ Admin Dashboard    │             │
│      │ (React     │    │            │    │ (React Admin)      │             │
│      │  Native)   │    │            │    │                    │             │
│      └─────┬──────┘    └─────┬──────┘    └─────────┬──────────┘             │
│            │                 │                      │                        │
└────────────┼─────────────────┼──────────────────────┼────────────────────────┘
             │                 │                      │
             ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GATEWAY TIER                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         NGINX REVERSE PROXY                            │  │
│  │  • SSL/TLS Termination (HTTPS)                                        │  │
│  │  • Static File Serving (PDFs, Images)                                 │  │
│  │  • Proxy Caching (Dictionary/Abbreviation APIs)                       │  │
│  │  • Rate Limiting (Connection-level)                                   │  │
│  │  • SSE Optimization (No buffering)                                    │  │
│  │  • Security Headers (HSTS, X-Frame-Options, etc.)                     │  │
│  │  • HTTP/2 Support                                                     │  │
│  │  Port: 80 (HTTP) → 443 (HTTPS)                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION TIER                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    NODE.JS EXPRESS SERVER                              │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐  │  │
│  │  │ Routes      │ │ Controllers │ │ Services    │ │ Middleware      │  │  │
│  │  │ • /auth     │ │ • Auth      │ │ • JWT       │ │ • Authentication│  │  │
│  │  │ • /admin    │ │ • Admin     │ │ • OTP       │ │ • Rate Limiting │  │  │
│  │  │ • /pdfs     │ │ • PDF       │ │ • SMS       │ │ • Validation    │  │  │
│  │  │ • /dict     │ │ • Dictionary│ │ • Search    │ │ • Error Handling│  │  │
│  │  │ • /abbr     │ │ • Abbr      │ │ • SSE/PubSub│ │ • Sanitization  │  │  │
│  │  │ • /audit    │ │ • Audit     │ │ • Audit     │ │ • CORS          │  │  │
│  │  │ • /events   │ │ • SSE       │ │ • PDF       │ │ • Helmet        │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘  │  │
│  │  Port: 3000                                                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                   │                                    │
                   ▼                                    ▼
┌──────────────────────────────────┐  ┌────────────────────────────────────────┐
│          CACHE TIER              │  │           DATA TIER                     │
│  ┌────────────────────────────┐  │  │  ┌──────────────────────────────────┐  │
│  │         REDIS              │  │  │  │           MONGODB                 │  │
│  │                            │  │  │  │                                   │  │
│  │  • OTP Storage (5 min TTL) │  │  │  │  Collections:                     │  │
│  │  • Rate Limit Counters     │  │  │  │  • users                          │  │
│  │  • Search Cache (60s TTL)  │  │  │  │  • admins                         │  │
│  │  • Session Data            │  │  │  │  • pdfdocuments                   │  │
│  │  • Pub/Sub (SSE Events)    │  │  │  │  • words                          │  │
│  │                            │  │  │  │  • abbreviations                  │  │
│  │  Port: 6379                │  │  │  │  • useraudits                     │  │
│  └────────────────────────────┘  │  │  │  • auditlogs                      │  │
└──────────────────────────────────┘  │  │                                   │  │
                                      │  │  Port: 27017                      │  │
                                      │  └──────────────────────────────────┘  │
                                      └────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│       EXTERNAL SERVICES          │
│  ┌────────────────────────────┐  │
│  │      SMS GATEWAY           │  │
│  │  (OTP Delivery)            │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │    ELASTICSEARCH (Optional)│  │
│  │  (Advanced Search)         │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 2.2 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Runtime** | Node.js | 20.x LTS | JavaScript execution environment |
| **Framework** | Express.js | 4.x | Web application framework |
| **Database** | MongoDB | 6.x | Document-oriented NoSQL database |
| **Cache** | Redis | 7.x | In-memory data structure store |
| **Gateway** | Nginx | Alpine | Reverse proxy and load balancer |
| **Containerization** | Docker | Latest | Container runtime |
| **Orchestration** | Docker Compose | Latest | Multi-container deployment |
| **Search (Optional)** | Elasticsearch | 8.x | Full-text search engine |

---

## 3. Component Design

### 3.1 Gateway Layer (Nginx)

**Responsibilities:**
- SSL/TLS encryption and certificate management
- HTTP to HTTPS redirection
- Static file serving (PDFs, thumbnails)
- API proxy caching for read-heavy endpoints
- Connection-level rate limiting
- Security headers injection
- SSE connection handling (no buffering)
- Load balancing (future multi-instance support)

**Key Configuration:**
- Max upload size: 50MB
- PDF caching: 7 days
- API cache TTL: 5 minutes
- SSE timeout: 24 hours
- Keepalive connections: 32

### 3.2 Application Layer (Node.js/Express)

**Core Modules:**

| Module | Purpose |
|--------|---------|
| **Routes** | URL endpoint definitions and request routing |
| **Controllers** | Request handling and response formatting |
| **Services** | Business logic and data processing |
| **Middleware** | Cross-cutting concerns (auth, validation, rate limiting) |
| **Models** | MongoDB schema definitions with Mongoose |
| **Config** | Environment configuration and constants |
| **Utils** | Helper functions and utilities |

### 3.3 Data Layer

**MongoDB Collections:**

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| `users` | End-user accounts | `phone_number` (unique), `deviceId` |
| `admins` | Administrator accounts | `contact` (unique), `name` |
| `pdfdocuments` | PDF metadata | `title`, `category`, `createdAt`, text index |
| `words` | Dictionary words | `word` (unique), text index |
| `abbreviations` | Abbreviation expansions | `abbreviation` (unique), text index |
| `useraudits` | User activity logs | `timestamp`, `userId`, `action` |
| `auditlogs` | Admin action logs | `timestamp`, `adminName`, `resourceType` |

**Redis Data Structures:**

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `otp:<phone>` | Encrypted OTP storage | 5 minutes |
| `rl:<prefix>:<ip>` | Rate limit counters | Window-based |
| `search:<type>:<term>` | Search result cache | 60 seconds |
| `pdf:categories` | Category list cache | 1 hour |

### 3.4 External Services

**SMS Gateway:**
- Purpose: OTP delivery to user phones
- Protocol: HTTP REST API
- Fallback: SMS Simulator for development

**Elasticsearch (Optional):**
- Purpose: Advanced fuzzy search and autocomplete
- Indices: `vayu_words`, `vayu_abbreviations`
- Sync: Real-time via application, bulk via CLI script

---

## 4. Security Architecture

### 4.1 Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     USER AUTHENTICATION (OTP-Based)                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Step 1: Request OTP                                                     │
│  ┌─────────┐         ┌──────────┐         ┌────────┐         ┌───────┐  │
│  │ Client  │ ──1──▶  │ Backend  │ ──2──▶  │ Redis  │ ──3──▶  │  SMS  │  │
│  │         │         │          │         │(Store) │         │Gateway│  │
│  └─────────┘         └──────────┘         └────────┘         └───────┘  │
│      │                    │                                       │     │
│      │   {phone, name,    │   Encrypt OTP with                   │     │
│      │    deviceId}       │   deviceId, 5min TTL                 │ SMS │
│      │                    │                                       │ ──▶ │
│                                                                          │
│  Step 2: Verify OTP                                                      │
│  ┌─────────┐         ┌──────────┐         ┌────────┐        ┌────────┐  │
│  │ Client  │ ──4──▶  │ Backend  │ ──5──▶  │ Redis  │        │MongoDB │  │
│  │         │ ◀──7──  │          │ ◀──6──  │(Verify)│  ──6─▶ │(Update)│  │
│  └─────────┘         └──────────┘         └────────┘        └────────┘  │
│      │                    │                                              │
│      │   {phone, otp,     │   Decrypt with deviceId,                    │
│      │    deviceId}       │   Generate Lifetime JWT (100 years)         │
│      │                    │                                              │
│      │ ◀─── JWT Token + Set HTTP-Only Cookie                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                    ADMIN AUTHENTICATION (2FA: Password + OTP)             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Step 1: Password + OTP Request                                          │
│  ┌─────────┐         ┌──────────┐         ┌────────┐         ┌───────┐  │
│  │ Admin   │ ──1──▶  │ Backend  │ ──2──▶  │ Redis  │ ──3──▶  │  SMS  │  │
│  │ Panel   │ ◀──4──  │(Bcrypt)  │         │        │         │Gateway│  │
│  └─────────┘         └──────────┘         └────────┘         └───────┘  │
│      │                    │                                              │
│      │   {contact,        │   Verify password,                          │
│      │    password}       │   Issue temp loginToken (5min)              │
│      │                    │                                              │
│                                                                          │
│  Step 2: Verify OTP                                                      │
│  ┌─────────┐         ┌──────────┐         ┌────────┐                    │
│  │ Admin   │ ──5──▶  │ Backend  │ ──6──▶  │ Redis  │                    │
│  │ Panel   │ ◀──7──  │          │         │        │                    │
│  └─────────┘         └──────────┘         └────────┘                    │
│      │                    │                                              │
│      │   {contact, otp,   │   Verify OTP,                               │
│      │    loginToken}     │   Generate Admin JWT (1 day)                │
│      │                    │                                              │
│      │ ◀─── Admin JWT + Permissions + Set HTTP-Only Cookie              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Security Layers

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Transport** | HTTPS/TLS 1.2+ | Encrypt data in transit |
| **Gateway** | Nginx Rate Limiting | Prevent DDoS at connection level |
| **Application** | Redis Rate Limiting | Granular per-endpoint rate limits |
| **Authentication** | JWT + HTTP-Only Cookies | Prevent XSS token theft |
| **Authorization** | RBAC (Role-Based Access Control) | Permission enforcement |
| **Validation** | express-validator, Mongoose | Input validation and sanitization |
| **NoSQL Injection** | express-mongo-sanitize | Prevent NoSQL injection attacks |
| **ReDoS Prevention** | Custom regex sanitization | Prevent regex-based DoS |
| **Headers** | Helmet.js | Security headers (HSTS, X-Frame-Options, etc.) |
| **OTP Security** | Device-bound AES-256-CBC encryption | Prevent OTP interception |

### 4.3 Role-Based Access Control (RBAC)

**Permission Matrix:**

| Role | manage_pdfs | manage_dictionary | manage_abbreviations | manage_admins | view_audit |
|------|-------------|-------------------|----------------------|---------------|------------|
| **User** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Sub-Admin** | ✅* | ✅* | ✅* | ❌ | ✅* |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |

*Configurable per admin

---

## 5. Data Flow Diagrams

### 5.1 PDF Upload Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Admin  │     │  Nginx  │     │ Backend │     │ MongoDB │     │  Redis  │
│Dashboard│     │         │     │         │     │         │     │(Pub/Sub)│
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │
     │──── POST /api/pdfs/upload ───▶│               │               │
     │   (multipart: pdf, metadata)  │               │               │
     │               │               │               │               │
     │               │──────────────▶│               │               │
     │               │               │── Validate ──▶│               │
     │               │               │── Save File ─▶│               │
     │               │               │── Save Meta ─▶│──────────────▶│
     │               │               │               │               │
     │               │               │── Publish ────│──────────────▶│
     │               │               │   PDF_ADDED   │               │
     │               │               │               │               │
     │               │◀──────────────│               │               │
     │◀──────────────│               │               │               │
     │   201 Created + PDF Details   │               │               │
     │               │               │               │               │
     │               │               │               │         SSE Clients
     │               │               │               │          receive
     │               │               │               │          PDF_ADDED
```

### 5.2 Dictionary Lookup Flow (Cached)

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client │     │  Nginx  │     │ Backend │     │  Redis  │     │ MongoDB │
│         │     │ (Cache) │     │         │     │ (Cache) │     │         │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │
     │── GET /api/dictionary/word/EXAMPLE ────────▶ │               │
     │               │               │               │               │
     │               │── Check Nginx Cache ────────▶│               │
     │               │   (X-Cache-Status: MISS)     │               │
     │               │               │               │               │
     │               │──────────────▶│── Check Redis Cache ────────▶│
     │               │               │   word:EXAMPLE               │
     │               │               │               │               │
     │               │               │◀── Cache MISS ────────────────│
     │               │               │               │               │
     │               │               │───────────────│──────────────▶│
     │               │               │               │◀──────────────│
     │               │               │               │   Word Data   │
     │               │               │◀──────────────│               │
     │               │               │   Store in    │               │
     │               │               │   Redis (24h) │               │
     │               │◀──────────────│               │               │
     │               │   Store in    │               │               │
     │               │   Nginx (5m)  │               │               │
     │◀──────────────│               │               │               │
     │   Word Definition             │               │               │
     │                               │               │               │
     │── GET /api/dictionary/word/EXAMPLE (repeat) ─▶               │
     │◀──────────────│               │               │               │
     │   X-Cache-Status: HIT (Nginx) │               │               │
```

---

## 6. Deployment Architecture

### 6.1 Docker Container Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Docker Compose Stack                                │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    backend-network (bridge)                           │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   nginx     │  │    app      │  │   mongo     │  │   redis     │  │  │
│  │  │ (gateway)   │  │  (backend)  │  │ (database)  │  │  (cache)    │  │  │
│  │  │             │  │             │  │             │  │             │  │  │
│  │  │ Port:       │  │ Port:       │  │ Port:       │  │ Port:       │  │  │
│  │  │ 80, 443     │  │ 3000        │  │ 27017       │  │ 6379        │  │  │
│  │  │ (exposed)   │  │ (internal)  │  │ (internal)  │  │ (internal)  │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │  │
│  │         │                │                │                │         │  │
│  │         └────────────────┴────────────────┴────────────────┘         │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    sms-simulator (dev profile)                   │  │  │
│  │  │                    Port: 8000 (exposed)                          │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Volumes:                                                                   │
│  • ./uploads ──────────────▶ app, nginx (shared)                           │
│  • mongo-data ─────────────▶ mongo (persistent)                            │
│  • ./nginx/certs ──────────▶ nginx (SSL certificates)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Scaling Strategy

**Horizontal Scaling (Recommended for 200K+ Users):**

```
                        ┌─────────────────────┐
                        │    Load Balancer    │
                        │   (Nginx/HAProxy)   │
                        └──────────┬──────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │   App #1    │          │   App #2    │          │   App #3    │
   │  (Node.js)  │          │  (Node.js)  │          │  (Node.js)  │
   └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │   Redis     │          │   MongoDB   │          │   Elastic   │
   │  Cluster    │          │  Replica Set│          │   Search    │
   │             │          │             │          │             │
   └─────────────┘          └─────────────┘          └─────────────┘
```

---

## 7. Non-Functional Requirements

### 7.1 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 100ms | Cached endpoints |
| API Response Time (p95) | < 500ms | Database queries |
| PDF Download Throughput | 500+ concurrent | With rate limiting |
| Cache Hit Rate | > 90% | Redis and Nginx |
| System Uptime | 99.9% | Excluding maintenance |

### 7.2 Scalability Requirements

| Metric | Current | Target |
|--------|---------|--------|
| Concurrent Users | 1,000 | 200,000+ |
| PDF Storage | 10 GB | 1 TB+ |
| Dictionary Words | 10,000 | 100,000+ |
| Daily API Requests | 100,000 | 10,000,000+ |

### 7.3 Security Requirements

- All data encrypted in transit (TLS 1.2+)
- Passwords hashed with bcrypt (10+ rounds)
- OTPs encrypted with AES-256-CBC
- JWT secrets minimum 32 characters
- Rate limiting on all endpoints
- Regular security audit compliance

---

## 8. Integration Points

### 8.1 Frontend Applications

| Application | Type | Integration Method |
|-------------|------|-------------------|
| VayuReader Mobile | React Native | REST API + SSE |
| Admin Dashboard | React Web | REST API + SSE |

### 8.2 External Services

| Service | Purpose | Protocol |
|---------|---------|----------|
| SMS Gateway | OTP delivery | HTTPS REST |

---

## 9. Disaster Recovery

### 9.1 Backup Strategy

| Data | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| MongoDB | Daily | 30 days | mongodump + cloud storage |
| Uploads (PDFs) | Daily | 30 days | File sync to backup storage |
| Redis | Not critical | N/A | Reconstructable from DB |
| Configurations | On change | Indefinite | Git version control |

### 9.2 Recovery Procedures

1. **Database Recovery**: Restore from latest mongodump
2. **File Recovery**: Sync from backup storage
3. **Configuration**: Deploy from version control
4. **Cache Warming**: Automatic on first requests

---

## 10. Monitoring & Observability

### 10.1 Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic health check (HTTP 200) |
| `GET /health/ready` | Readiness probe (DB + Redis connectivity) |
| `GET /nginx_status` | Nginx connection statistics |

### 10.2 Key Metrics to Monitor

- API response times (p50, p95, p99)
- Error rates by endpoint
- Redis hit/miss ratio
- MongoDB query times
- Active SSE connections
- Rate limit violations
- Memory and CPU usage

---

## 11. Glossary

| Term | Definition |
|------|------------|
| **SSE** | Server-Sent Events - HTTP-based unidirectional real-time communication |
| **JWT** | JSON Web Token - Secure token format for authentication |
| **OTP** | One-Time Password - Temporary code for authentication |
| **2FA** | Two-Factor Authentication - Multiple authentication factors |
| **RBAC** | Role-Based Access Control - Permission management system |
| **TTL** | Time-To-Live - Expiration time for cached data |
| **CDN** | Content Delivery Network - Distributed static file serving |
| **HSTS** | HTTP Strict Transport Security - Force HTTPS header |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | Dev Team | Initial HLD |
| 2.0 | Jan 2026 | Dev Team | Updated with SSE, enhanced security, scaling strategies |
