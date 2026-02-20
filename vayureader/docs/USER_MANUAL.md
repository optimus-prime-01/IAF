# VayuReader Backend v2 - User Manual

## System Administration Guide

**Version**: 2.0  
**Date**: January 2026  
**Classification**: RESTRICTED - For Authorized Personnel Only  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Getting Started](#3-getting-started)
4. [User Management](#4-user-management)
5. [PDF Management](#5-pdf-management)
6. [Dictionary Management](#6-dictionary-management)
7. [Abbreviation Management](#7-abbreviation-management)
8. [Audit & Monitoring](#8-audit--monitoring)
9. [Troubleshooting](#9-troubleshooting)
10. [API Reference Quick Guide](#10-api-reference-quick-guide)
11. [Appendix](#appendix)

---

## 1. Introduction

### 1.1 Purpose

This User Manual provides comprehensive guidance for administrators and operators of the VayuReader Backend system. It covers day-to-day operations, system administration, content management, and troubleshooting procedures.

### 1.2 Intended Audience

- **System Administrators**: Personnel responsible for system deployment, maintenance, and monitoring
- **Content Administrators**: Personnel responsible for PDF uploads, dictionary updates, and content management
- **Super Administrators**: Personnel with full system access including user and admin management

### 1.3 Prerequisites

Before using this system, ensure you have:
- Access credentials (contact and password)
- Registered phone number for OTP authentication
- Authorized device for admin access
- Basic understanding of REST APIs (for API integration)

---

## 2. System Overview

### 2.1 What is VayuReader Backend?

VayuReader Backend is a secure document management and reference system designed for the Indian Air Force. It provides:

- **Secure PDF Document Management**: Upload, organize, and distribute PDF documents
- **Dictionary Services**: Word definitions, meanings, synonyms, and antonyms
- **Abbreviation Database**: Military and technical abbreviation expansions
- **User Authentication**: OTP-based secure login for mobile app users
- **Admin Portal**: Web-based administration for content and user management
- **Real-time Updates**: Instant notifications when content changes

### 2.2 System Components

| Component | Purpose | Access |
|-----------|---------|--------|
| **Nginx Gateway** | HTTPS entry point | https://your-domain.com |
| **Backend API** | REST API services | https://your-domain.com/api |
| **MongoDB** | Data storage | Internal only |
| **Redis** | Caching and sessions | Internal only |
| **Admin Dashboard** | Web-based admin UI | https://admin.your-domain.com |

### 2.3 User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **End User** | Mobile app users | View PDFs, search dictionary/abbreviations |
| **Sub-Admin** | Limited admin access | Specific permissions (PDF, Dictionary, etc.) |
| **Super Admin** | Full system access | All operations including admin management |

---

## 3. Getting Started

### 3.1 Installation (Docker)

#### Prerequisites

1. **Docker Desktop** installed and running
2. **Docker Compose** (included with Docker Desktop)
3. **SSL Certificates** (self-signed for development, CA-signed for production)

#### Step 1: Generate SSL Certificates

For local development with self-signed certificates:

**Windows (PowerShell):**
```powershell
docker run --rm -v "${PWD}/nginx/certs:/certs" alpine /bin/sh -c "apk add --no-cache openssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -subj '/C=IN/ST=Delhi/L=NewDelhi/O=IAF/CN=localhost'"
```

**Linux/Mac:**
```bash
docker run --rm -v "$(pwd)/nginx/certs:/certs" alpine /bin/sh -c "apk add --no-cache openssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -subj '/C=IN/ST=Delhi/L=NewDelhi/O=IAF/CN=localhost'"
```

#### Step 2: Configure Environment

Create `.env` file from template:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Required settings
MONGODB_URI=mongodb://mongo:27017/vayureader
REDIS_URL=redis://redis:6379
JWT_SECRET=your_super_secret_key_at_least_32_characters_long
OTP_GATEWAY_URL=http://sms-simulator:8000/smsc/sends

# Development settings
NODE_ENV=development
SKIP_OTP_SEND=true

# Production settings (uncomment for production)
# NODE_ENV=production
# SKIP_OTP_SEND=false
# ALLOWED_ORIGINS=https://admin.yourdomain.com,https://app.yourdomain.com
```

#### Step 3: Start the System

**Development (with SMS Simulator):**
```bash
docker-compose --profile dev up -d --build
```

**Production (without SMS Simulator):**
```bash
docker-compose up -d --build
```

#### Step 4: Verify Installation

1. **Check container status:**
   ```bash
   docker-compose ps
   ```
   All containers should show "Up" status.

2. **Check health endpoint:**
   ```bash
   curl -k https://localhost/health
   ```
   Should return: `{"status":"ok"}`

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

#### Step 5: Create Super Admin

Run the seed script to create the first administrator:

```bash
docker-compose exec app node scripts/seedAdmin.js "Admin Name" "9876543210" "StrongPassword123!"
```

**Output:**
```
Connecting to MongoDB...
Connected to MongoDB
Creating super admin...
Super admin created successfully!
Name: Admin Name
Contact: 9876543210
Disconnected from DB
```

### 3.2 Accessing the System

#### Admin Dashboard Login

1. Navigate to the Admin Dashboard URL
2. Enter your registered contact number
3. Enter your password
4. Click "Request OTP"
5. Enter the 6-digit OTP received on your phone
6. Click "Verify" to complete login

**Note:** In development mode with `SKIP_OTP_SEND=true`, the OTP is displayed in the API response.

#### API Access

All API endpoints are available at: `https://your-domain.com/api`

Example request:
```bash
curl -X GET https://localhost/api/pdfs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 3.3 Stopping the System

**Graceful shutdown:**
```bash
docker-compose down
```

**Stop and remove all data (CAUTION):**
```bash
docker-compose down -v
```

---

## 4. User Management

### 4.1 Viewing Users

Super Admins can view all registered users through the admin dashboard or API.

**Via API:**
```bash
# Get all users (paginated)
GET /api/admin/users?page=1&limit=20

# Search users by phone
GET /api/admin/users?search=9876543210
```

### 4.2 Blocking a User

When a user needs to be restricted from accessing the system:

**Via CLI:**
```bash
docker-compose exec app node scripts/manageUsers.js user block --contact +919876543210
```

**Effect:**
- User cannot request OTP
- User cannot verify OTP
- Existing JWT tokens become invalid (checked in middleware)
- User sees "Account blocked" error

### 4.3 Unblocking a User

To restore a blocked user's access:

**Via CLI:**
```bash
docker-compose exec app node scripts/manageUsers.js user unblock --contact +919876543210
```

### 4.4 Deleting a User

To permanently remove a user:

**Via CLI:**
```bash
# By phone number
docker-compose exec app node scripts/manageUsers.js user delete --contact +919876543210

# By user ID
docker-compose exec app node scripts/manageUsers.js user delete --id 507f1f77bcf86cd799439011

# By device ID
docker-compose exec app node scripts/manageUsers.js user delete --device abc123def456
```

**Warning:** This action is irreversible. The user will need to re-register.

### 4.5 Managing Admins

#### Creating a Sub-Admin

Only Super Admins can create new administrators.

**Via API:**
```bash
POST /api/admin/sub-admins
Content-Type: application/json
Authorization: Bearer SUPER_ADMIN_TOKEN

{
  "name": "New Admin",
  "contact": "+919876543211",
  "password": "SecurePassword123!",
  "permissions": ["manage_pdfs", "manage_dictionary"]
}
```

**Available Permissions:**
- `manage_pdfs` - Upload, edit, delete PDFs
- `manage_dictionary` - Manage dictionary words
- `manage_abbreviations` - Manage abbreviations
- `view_audit` - View audit logs
- `manage_admins` - Create/delete sub-admins (Super Admin only)

#### Deleting an Admin

**Via CLI:**
```bash
docker-compose exec app node scripts/manageUsers.js admin delete --contact +919876543211
```

**Note:** Super Admins cannot be deleted via API for security. Use the CLI script.

#### Resetting Admin Password

If an admin forgets their password:

**Via CLI:**
```bash
docker-compose exec app node scripts/reset-admin-password.js +919876543210 "NewSecurePassword123!"
```

---

## 5. PDF Management

### 5.1 Uploading PDFs

**Via Admin Dashboard:**
1. Navigate to "PDFs" → "Upload New"
2. Fill in the details:
   - **Title** (required): Descriptive name
   - **Category** (required): Select or create category
   - **Description** (optional): Brief summary
   - **PDF File** (required): Select PDF file (max 50MB)
   - **Thumbnail** (optional): Cover image (JPG/PNG)
3. Click "Upload"

**Via API:**
```bash
curl -X POST https://localhost/api/pdfs/upload \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "pdf=@/path/to/document.pdf" \
  -F "thumbnail=@/path/to/cover.jpg" \
  -F "title=Flight Operations Manual" \
  -F "description=Standard procedures for flight operations" \
  -F "category=Operations"
```

### 5.2 Updating PDFs

**Via Admin Dashboard:**
1. Navigate to "PDFs" → Find the PDF
2. Click "Edit"
3. Modify fields as needed
4. Click "Save Changes"

**Via API:**
```bash
curl -X PUT https://localhost/api/pdfs/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "title=Updated Title" \
  -F "category=New Category"
```

### 5.3 Deleting PDFs

**Via Admin Dashboard:**
1. Navigate to "PDFs" → Find the PDF
2. Click "Delete"
3. Confirm deletion

**Via API:**
```bash
curl -X DELETE https://localhost/api/pdfs/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Warning:** This removes both the database record and the physical files.

### 5.4 PDF Categories

Categories are created automatically when uploading PDFs. To view all categories:

**Via API:**
```bash
GET /api/pdfs/categories
```

### 5.5 File Storage

PDFs are stored in the `uploads/` directory with the following structure:
```
uploads/
├── abc123-uuid/
│   ├── document.pdf
│   └── thumbnail.jpg
├── def456-uuid/
│   ├── another.pdf
│   └── cover.png
```

**Backup Recommendation:** Regularly backup the `uploads/` directory alongside database backups.

---

## 6. Dictionary Management

### 6.1 Adding Words

**Via Admin Dashboard:**
1. Navigate to "Dictionary" → "Add Word"
2. Enter word details:
   - **Word** (required): The word to define
   - **Part of Speech**: noun, verb, adjective, etc.
   - **Definition** (required): Word meaning
   - **Synonyms** (optional): Related words
   - **Antonyms** (optional): Opposite words
   - **Example Sentences** (optional): Usage examples
3. Click "Save"

**Via API:**
```bash
curl -X POST https://localhost/api/dictionary \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "word": "AIRCRAFT",
    "meanings": [
      {
        "partOfSpeech": "noun",
        "definition": "A vehicle that can fly, such as a plane or helicopter",
        "synonyms": ["plane", "aeroplane", "jet"],
        "examples": ["The aircraft landed safely on the runway"]
      }
    ],
    "synonyms": ["plane", "jet"],
    "antonyms": []
  }'
```

### 6.2 Bulk Upload

For large dictionary imports:

**Via API:**
```bash
curl -X POST https://localhost/api/dictionary/upload \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "words": [
      {
        "word": "WORD1",
        "meanings": [{"definition": "Definition 1"}]
      },
      {
        "word": "WORD2",
        "meanings": [{"definition": "Definition 2"}]
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 2,
    "skipped": 0,
    "errors": []
  }
}
```

### 6.3 Updating Words

**Via API:**
```bash
curl -X PUT https://localhost/api/dictionary/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "meanings": [
      {
        "definition": "Updated definition"
      }
    ]
  }'
```

### 6.4 Exporting Dictionary

To backup or transfer dictionary data:

**Via API:**
```bash
GET /api/dictionary/export/all
```

### 6.5 Searching Words

Users can search the dictionary:

```bash
# Exact lookup
GET /api/dictionary/word/AIRCRAFT

# Search
GET /api/dictionary/search/air?page=1&limit=20
```

---

## 7. Abbreviation Management

### 7.1 Adding Abbreviations

**Via Admin Dashboard:**
1. Navigate to "Abbreviations" → "Add New"
2. Enter details:
   - **Abbreviation** (required): e.g., "NATO"
   - **Full Form** (required): e.g., "North Atlantic Treaty Organization"
3. Click "Save"

**Via API:**
```bash
curl -X POST https://localhost/api/abbreviations \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "abbreviation": "IAF",
    "fullForm": "Indian Air Force"
  }'
```

### 7.2 Bulk Upload

**Via API:**
```bash
curl -X POST https://localhost/api/abbreviations/upload \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "abbreviations": [
      {"abbreviation": "AOC", "fullForm": "Air Officer Commanding"},
      {"abbreviation": "CAS", "fullForm": "Chief of Air Staff"}
    ]
  }'
```

### 7.3 Searching Abbreviations

```bash
# Exact lookup
GET /api/abbreviations/IAF

# Search
GET /api/abbreviations/search/air?page=1&limit=20
```

---

## 8. Audit & Monitoring

### 8.1 User Activity Logs

Track user activities including logins, device changes, and PDF views.

**Via API:**
```bash
# Get user activity logs
GET /api/audit/user-logs?page=1&limit=50

# Filter by action type
GET /api/audit/user-logs?action=LOGIN

# Filter by user
GET /api/audit/user-logs?phone=+919876543210
```

**Logged Actions:**
- `LOGIN` - User login events
- `DEVICE_CHANGE` - User switched to new device
- `READ_PDF` - User viewed a PDF

### 8.2 Admin Action Logs

Track all administrative changes for compliance.

**Via API:**
```bash
# Get admin action logs
GET /api/audit/logs?page=1&limit=50

# Filter by admin
GET /api/audit/logs?adminName=Admin%20Name

# Filter by resource type
GET /api/audit/logs?resourceType=PDF
```

**Logged Actions:**
- `CREATE` - Resource created
- `UPDATE` - Resource modified
- `DELETE` - Resource deleted

**Resource Types:**
- `PDF` - PDF documents
- `DICTIONARY_WORD` - Dictionary entries
- `ABBREVIATION` - Abbreviation entries
- `ADMIN` - Administrator accounts

### 8.3 System Health Monitoring

**Health Endpoint:**
```bash
curl https://localhost/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T10:00:00.000Z"
}
```

### 8.4 Container Logs

**View all logs:**
```bash
docker-compose logs -f
```

**View specific service logs:**
```bash
docker-compose logs -f app    # Backend logs
docker-compose logs -f nginx  # Gateway logs
docker-compose logs -f mongo  # Database logs
docker-compose logs -f redis  # Cache logs
```

### 8.5 Database Optimization

Run periodically to ensure optimal performance:

```bash
docker-compose exec app node scripts/optimizeDb.js
```

**Output:**
```
Optimizing database...

Creating indexes...
✓ User indexes created
✓ Admin indexes created
✓ PdfDocument indexes created
...

Analyzing collections...
Users: 1,234 documents
PDFs: 567 documents
...

Optimization completed!
```

### 8.6 Log Cleanup

Remove old audit logs to free space:

```bash
# Dry run (see what would be deleted)
docker-compose exec app node scripts/cleanupLogs.js --days 90 --dry-run

# Actually delete
docker-compose exec app node scripts/cleanupLogs.js --days 90
```

---

## 9. Troubleshooting

### 9.1 Common Issues and Solutions

#### Cannot Login - "Invalid OTP"

**Cause:** Device ID mismatch between OTP request and verification

**Solution:**
1. Ensure the same device ID is sent in both requests
2. Clear app cache and retry
3. Check if OTP has expired (5 minutes validity)

#### Cannot Login - "User blocked"

**Cause:** User account has been blocked by administrator

**Solution:**
1. Contact administrator to unblock account
2. Admin runs: `node scripts/manageUsers.js user unblock --contact +91XXXXXXXXXX`

#### 502 Bad Gateway

**Cause:** Backend container is not running or not responding

**Solution:**
1. Check backend status: `docker-compose ps app`
2. View backend logs: `docker-compose logs app`
3. Restart backend: `docker-compose restart app`
4. If persists, check MongoDB connection

#### 429 Too Many Requests

**Cause:** Rate limit exceeded

**Solution:**
1. Wait for rate limit window to reset (check `Retry-After` header)
2. For OTP: Wait 15 minutes
3. For general API: Wait 15 minutes
4. For login attempts: Wait 1 minute

#### CORS Error

**Cause:** Frontend origin not in allowed list

**Solution:**
1. Check `ALLOWED_ORIGINS` in `.env`
2. Add frontend URL: `ALLOWED_ORIGINS=https://admin.yourdomain.com`
3. Restart: `docker-compose up -d`

#### SSL Certificate Warning

**Cause:** Self-signed certificate (development)

**Solution:**
1. **Development:** Click "Advanced" → "Proceed to localhost"
2. **Production:** Replace with CA-signed certificate

#### PDF Upload Failed - 413 Payload Too Large

**Cause:** File exceeds maximum size limit

**Solution:**
1. Ensure file is under 50MB
2. If larger files needed, update Nginx config:
   ```nginx
   client_max_body_size 100M;
   ```
3. Restart Nginx: `docker-compose restart nginx`

#### MongoDB Connection Error

**Cause:** Database container not ready or crashed

**Solution:**
1. Check MongoDB status: `docker-compose ps mongo`
2. View logs: `docker-compose logs mongo`
3. Restart MongoDB: `docker-compose restart mongo`
4. Wait 30 seconds for initialization

### 9.2 Checking System Status

#### Container Status
```bash
docker-compose ps
```

**Expected Output:**
```
NAME               STATUS          PORTS
vayureader_api     Up (healthy)    3000/tcp
vayureader_db      Up             27017/tcp
vayureader_cache   Up             6379/tcp
vayureader_gateway Up             80->80, 443->443
```

#### Redis Status
```bash
docker-compose exec redis redis-cli ping
# Expected: PONG
```

#### MongoDB Status
```bash
docker-compose exec mongo mongosh --eval "db.stats()"
```

### 9.3 Emergency Procedures

#### System Unresponsive

1. Stop all containers:
   ```bash
   docker-compose down
   ```

2. Check disk space:
   ```bash
   docker system df
   ```

3. Clean up if needed:
   ```bash
   docker system prune -f
   ```

4. Restart:
   ```bash
   docker-compose up -d
   ```

#### Data Recovery

If data corruption is suspected:

1. Stop the system
2. Backup current data:
   ```bash
   docker-compose exec mongo mongodump --out=/backup
   ```
3. Restore from previous backup:
   ```bash
   docker-compose exec mongo mongorestore /backup/previous
   ```

---

## 10. API Reference Quick Guide

### 10.1 Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login/request-otp` | Request OTP for user login | None |
| POST | `/api/auth/login/verify-otp` | Verify OTP and get token | None |
| GET | `/api/auth/profile` | Get current user profile | User |
| POST | `/api/auth/logout` | Clear auth cookie | None |

### 10.2 Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/login/request-otp` | Admin login step 1 | None |
| POST | `/api/admin/login/verify-otp` | Admin login step 2 | None |
| GET | `/api/admin/me` | Get admin profile | Admin |
| POST | `/api/admin/sub-admins` | Create sub-admin | Super Admin |
| DELETE | `/api/admin/sub-admins/:id` | Delete sub-admin | Super Admin |

### 10.3 PDF Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/pdfs` | Search/list PDFs | User/Admin |
| GET | `/api/pdfs/:id` | Get single PDF | User/Admin |
| POST | `/api/pdfs/upload` | Upload PDF | Admin |
| PUT | `/api/pdfs/:id` | Update PDF | Admin |
| DELETE | `/api/pdfs/:id` | Delete PDF | Admin |
| GET | `/api/pdfs/categories` | Get categories | User/Admin |

### 10.4 Dictionary Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dictionary/word/:word` | Lookup word | Public |
| GET | `/api/dictionary/search/:term` | Search words | Public |
| POST | `/api/dictionary` | Add word | Admin |
| PUT | `/api/dictionary/:id` | Update word | Admin |
| DELETE | `/api/dictionary/:id` | Delete word | Admin |
| POST | `/api/dictionary/upload` | Bulk upload | Admin |
| GET | `/api/dictionary/export/all` | Export all | Admin |

### 10.5 Abbreviation Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/abbreviations/:abbr` | Lookup abbreviation | Public |
| GET | `/api/abbreviations/search/:term` | Search | Public |
| POST | `/api/abbreviations` | Add abbreviation | Admin |
| POST | `/api/abbreviations/upload` | Bulk upload | Admin |

### 10.6 Audit Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/audit/logs` | Get admin action logs | Admin |
| GET | `/api/audit/user-logs` | Get user activity logs | Admin |

### 10.7 SSE Endpoint

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/events` | Real-time event stream | User/Admin |

---

## Appendix

### A. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 3000 | Server port |
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `REDIS_URL` | Yes | - | Redis connection URL |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `OTP_GATEWAY_URL` | Yes | - | SMS gateway URL |
| `OTP_EXPIRY_MINUTES` | No | 5 | OTP validity period |
| `SKIP_OTP_SEND` | No | false | Skip actual SMS sending |
| `ALLOWED_ORIGINS` | No | - | CORS allowed origins |

### B. Permission Reference

| Permission | Description | Endpoints |
|------------|-------------|-----------|
| `manage_pdfs` | Upload, edit, delete PDFs | `/api/pdfs/*` (POST, PUT, DELETE) |
| `manage_dictionary` | Manage dictionary | `/api/dictionary/*` (POST, PUT, DELETE) |
| `manage_abbreviations` | Manage abbreviations | `/api/abbreviations/*` (POST, PUT, DELETE) |
| `manage_admins` | Create/delete admins | `/api/admin/sub-admins/*` |
| `view_audit` | View audit logs | `/api/audit/*` |

### C. Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Permission denied |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

### D. Contact & Support

For technical support, contact your system administrator or IT department.

**Emergency Contacts:**
- System Administrator: [Contact Information]
- IT Support: [Contact Information]

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | Dev Team | Initial manual |
| 2.0 | Jan 2026 | Dev Team | Updated with SSE, enhanced admin features |
