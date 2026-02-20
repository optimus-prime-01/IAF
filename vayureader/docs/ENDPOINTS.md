# API Endpoints Reference

Complete API reference for VayuReader Backend v2. All routes are prefixed with `/api`.

## Response Format

All endpoints return JSON in this standard format:

```json
{
  "success": true|false,
  "data": { ... },           // Present on success
  "message": "...",          // Optional descriptive message
  "errorCode": "ERROR_CODE" // Present on error
}
```

## Rate Limiting

Rate limits are enforced per IP address using Redis. Headers returned:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Unix timestamp when limit resets

---

## Authentication Endpoints

### POST `/auth/login/request-otp`

Request an OTP for user login. Creates a new user if the phone number doesn't exist.

**Authentication**: None (public)  
**Rate Limit**: `auth.otp` (5 requests per 15 minutes)

**Request Body**:
```json
{
  "phone_number": "string (required)",  // E.164 format recommended
  "name": "string (required)",          // 2-100 characters
  "deviceId": "string (required)"       // Unique device identifier
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "message": "OTP request received",
    "otp": "123456"  // Only in dev mode (SKIP_OTP_SEND=true)
  }
}
```

**Error Responses**:
- `400`: Missing required fields, invalid phone number
- `401`: User is blocked
- `429`: Rate limit exceeded

**Notes**:
- OTP is encrypted with `deviceId` and stored in Redis (5 min TTL)
- If user exists and is blocked, returns 401
- SMS is sent asynchronously (fire-and-forget)

---

### POST `/auth/login/verify-otp`

Verify OTP and complete login. Issues a lifetime JWT token.

**Authentication**: None (public)  
**Rate Limit**: `auth.login` (5 requests per 1 minute)

**Request Body**:
```json
{
  "phone_number": "string (required)",
  "otp": "string (required)",          // 6-digit code
  "deviceId": "string (required)"      // Must match OTP request
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "phone_number": "+1234567890"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewDevice": false,
    "deviceChanged": true
  },
  "message": "Login successful (device changed)"
}
```

**Error Responses**:
- `400`: Invalid OTP, expired OTP, user not found
- `401`: User is blocked
- `429`: Rate limit exceeded

**Notes**:
- Sets `auth_token` HTTP-only cookie (100-year expiration)
- Detects device changes and logs to `UserAudit`
- OTP is deleted from Redis after verification

---

### GET `/auth/profile`

Get current authenticated user's profile.

**Authentication**: Required (JWT)  
**Rate Limit**: `default` (100 requests per 15 minutes)

**Request Headers**:
```
Authorization: Bearer <token>
```
Or cookie: `auth_token`

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "phone_number": "+1234567890"
    }
  }
}
```

**Error Responses**:
- `401`: No token, invalid token, user blocked/deleted
- `404`: User not found

---

### POST `/auth/logout`

Clear authentication cookie.

**Authentication**: None  
**Rate Limit**: `default`

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Admin Endpoints

### POST `/admin/login/request-otp`

Step 1 of admin 2FA login: verify password and send OTP.

**Authentication**: None (public)  
**Rate Limit**: `auth.otp` (5 requests per 15 minutes)

**Request Body**:
```json
{
  "contact": "string (required)",     // Admin phone number
  "password": "string (required)"     // Plain text password
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "loginToken": "temp-jwt-token",
    "message": "OTP sent to your registered contact",
    "otp": "123456"  // Only in dev mode
  }
}
```

**Error Responses**:
- `400`: Missing fields
- `401`: Invalid credentials
- `404`: Admin not found
- `429`: Rate limit exceeded

**Notes**:
- Password is verified using bcrypt
- Temporary `loginToken` (5 min expiry) is issued for OTP verification
- OTP sent via SMS gateway

---

### POST `/admin/login/verify-otp`

Step 2 of admin 2FA login: verify OTP and complete login.

**Authentication**: None (requires `loginToken` from step 1)  
**Rate Limit**: `auth.login` (5 requests per 1 minute)

**Request Body**:
```json
{
  "contact": "string (required)",
  "otp": "string (required)",
  "loginToken": "string (required)"  // From request-otp response
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Admin Name",
      "contact": "+1234567890",
      "isSuperAdmin": true,
      "permissions": ["manage_pdfs", "manage_dictionary", ...]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Error Responses**:
- `400`: Invalid OTP, expired OTP
- `401`: Invalid loginToken
- `429`: Rate limit exceeded

**Notes**:
- Sets `admin_token` HTTP-only cookie (1-day expiration)
- Logs admin login to `AuditLog`

---

### GET `/admin/me`

Get current authenticated admin's profile.

**Authentication**: Required (Admin JWT)  
**Rate Limit**: `default`

**Request Headers**:
```
Authorization: Bearer <admin_token>
```
Or cookie: `admin_token`

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Admin Name",
      "contact": "+1234567890",
      "isSuperAdmin": false,
      "permissions": ["manage_pdfs"]
    }
  }
}
```

**Error Responses**:
- `401`: No token, invalid token
- `404`: Admin not found

---

### POST `/admin/logout`

Clear admin authentication cookie.

**Authentication**: None  
**Rate Limit**: `default`

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## PDF Endpoints

### GET `/pdfs`

Search PDFs with optional query parameters.

**Authentication**: Required (User or Admin JWT)  
**Rate Limit**: `search` (60 requests per 1 minute)

**Query Parameters**:
- `q` (string, optional): Search term (title, description, category)
- `category` (string, optional): Filter by category
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 20, max: 100)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "pdfs": [
      {
        "id": "507f1f77bcf86cd799439011",
        "title": "Document Title",
        "description": "Description text",
        "category": "Technical",
        "pdfUrl": "/uploads/abc123/file.pdf",
        "thumbnailUrl": "/uploads/abc123/thumb.jpg",
        "uploadedBy": "Admin Name",
        "views": 42,
        "createdAt": "2024-01-10T10:00:00.000Z"
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

**Error Responses**:
- `401`: Not authenticated
- `429`: Rate limit exceeded

---

### GET `/pdfs/all`

Get all PDFs (paginated, no search).

**Authentication**: Required (User or Admin JWT)  
**Rate Limit**: `default`

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 20, max: 100)

**Success Response**: Same as `/pdfs` search endpoint

---

### GET `/pdfs/categories`

Get list of distinct PDF categories.

**Authentication**: Required (User or Admin JWT)  
**Rate Limit**: `default`

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "categories": ["Technical", "Medical", "Legal", "Educational"]
  }
}
```

---

### GET `/pdfs/:id`

Get single PDF by ID and increment view count.

**Authentication**: Required (User or Admin JWT)  
**Rate Limit**: `default`

**URL Parameters**:
- `id` (string, required): MongoDB ObjectId

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "pdf": {
      "id": "507f1f77bcf86cd799439011",
      "title": "Document Title",
      "description": "Description text",
      "category": "Technical",
      "pdfUrl": "/uploads/abc123/file.pdf",
      "thumbnailUrl": "/uploads/abc123/thumb.jpg",
      "uploadedBy": "Admin Name",
      "views": 43,
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T15:30:00.000Z"
    }
  }
}
```

**Error Responses**:
- `400`: Invalid ObjectId format
- `401`: Not authenticated
- `404`: PDF not found

**Notes**:
- View count is incremented atomically
- Logs view to `UserAudit` if user is authenticated

---

### POST `/pdfs/upload`

Upload a new PDF document (admin only).

**Authentication**: Required (Admin JWT with `manage_pdfs` permission)  
**Rate Limit**: `uploads.pdf` (10 requests per 1 hour)

**Request**: `multipart/form-data`

**Form Fields**:
- `pdf` (file, required): PDF file (max 50MB)
- `thumbnail` (file, optional): Image file (JPG/PNG/WEBP, max 50MB)
- `title` (string, required): PDF title
- `description` (string, optional): Description
- `category` (string, required): Category name

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "pdf": {
      "id": "507f1f77bcf86cd799439011",
      "title": "New Document",
      "pdfUrl": "/uploads/abc123/file.pdf",
      "thumbnailUrl": "/uploads/abc123/thumb.jpg"
    }
  },
  "message": "PDF uploaded successfully"
}
```

**Error Responses**:
- `400`: Missing required fields, invalid file type
- `401`: Not authenticated or insufficient permissions
- `413`: File too large
- `429`: Rate limit exceeded

**Notes**:
- Files stored in `uploads/<uuid>/` directory
- Publishes `PDF_ADDED` event to SSE subscribers
- Logs action to `AuditLog`

---

### PUT `/pdfs/:id`

Update existing PDF (admin only).

**Authentication**: Required (Admin JWT with `manage_pdfs` permission)  
**Rate Limit**: `default`

**URL Parameters**:
- `id` (string, required): MongoDB ObjectId

**Request**: `multipart/form-data`

**Form Fields** (all optional):
- `pdf` (file): New PDF file
- `thumbnail` (file): New thumbnail
- `title` (string): New title
- `description` (string): New description
- `category` (string): New category

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "pdf": { /* updated PDF object */ }
  },
  "message": "PDF updated successfully"
}
```

**Error Responses**:
- `400`: Invalid ObjectId
- `401`: Not authenticated or insufficient permissions
- `404`: PDF not found
- `429`: Rate limit exceeded

**Notes**:
- Old files are deleted if replaced
- Publishes `PDF_UPDATED` event to SSE

---

### DELETE `/pdfs/:id`

Delete a PDF document (admin only).

**Authentication**: Required (Admin JWT with `manage_pdfs` permission)  
**Rate Limit**: `default`

**URL Parameters**:
- `id` (string, required): MongoDB ObjectId

**Success Response** (200):
```json
{
  "success": true,
  "message": "PDF deleted successfully"
}
```

**Error Responses**:
- `400`: Invalid ObjectId
- `401`: Not authenticated or insufficient permissions
- `404`: PDF not found

**Notes**:
- Deletes files from filesystem
- Publishes `PDF_DELETED` event to SSE
- Logs action to `AuditLog`

---

## Dictionary Endpoints

### GET `/dictionary/word/:word`

Look up a word and get related words.

**Authentication**: None (public)  
**Rate Limit**: `search`

**URL Parameters**:
- `word` (string, required): Word to look up

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "word": {
      "id": "507f1f77bcf86cd799439011",
      "word": "example",
      "meanings": ["A thing characteristic of its kind"],
      "relatedWords": ["sample", "instance"]
    }
  }
}
```

**Error Responses**:
- `404`: Word not found
- `429`: Rate limit exceeded

---

### GET `/dictionary/search/:term?`

Search dictionary words (case-insensitive, partial match).

**Authentication**: None (public)  
**Rate Limit**: `search` (60 requests per 1 minute)

**URL Parameters**:
- `term` (string, optional): Search term

**Query Parameters**:
- `page` (number, optional): Page number
- `limit` (number, optional): Results per page

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "507f1f77bcf86cd799439011",
        "word": "example",
        "meanings": ["A thing characteristic of its kind"]
      }
    ],
    "pagination": { /* pagination object */ }
  }
}
```

**Notes**:
- Results cached in Redis (60s TTL)
- Empty term returns all words (paginated)

---

### GET `/dictionary/words`

Get first 100 words (for quick preview).

**Authentication**: Required (User or Admin JWT)  
**Rate Limit**: `default`

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "words": [ /* array of word objects */ ]
  }
}
```

---

### GET `/dictionary/words/all`

Get all dictionary words (paginated, admin view).

**Authentication**: Required (User or Admin JWT)  
**Rate Limit**: `default`

**Query Parameters**:
- `page` (number, optional)
- `limit` (number, optional)

**Success Response**: Same structure as search endpoint

---

### POST `/dictionary`

Add a new word (admin only).

**Authentication**: Required (Admin JWT with `manage_dictionary` permission)  
**Rate Limit**: `default`

**Request Body**:
```json
{
  "word": "string (required)",
  "meanings": ["string"] (required, array),
  "relatedWords": ["string"] (optional, array)
}
```

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "word": { /* created word object */ }
  },
  "message": "Word added successfully"
}
```

**Error Responses**:
- `400`: Missing fields, duplicate word
- `401`: Not authenticated or insufficient permissions

---

### PUT `/dictionary/:id`

Update a word (admin only).

**Authentication**: Required (Admin JWT with `manage_dictionary` permission)  
**Rate Limit**: `default`

**URL Parameters**:
- `id` (string, required): MongoDB ObjectId

**Request Body** (all optional):
```json
{
  "word": "string",
  "meanings": ["string"],
  "relatedWords": ["string"]
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "word": { /* updated word object */ }
  },
  "message": "Word updated successfully"
}
```

**Error Responses**:
- `400`: Invalid ObjectId
- `401`: Not authenticated or insufficient permissions
- `404`: Word not found

---

### DELETE `/dictionary/:id`

Delete a word (admin only).

**Authentication**: Required (Admin JWT with `manage_dictionary` permission)  
**Rate Limit**: `default`

**URL Parameters**:
- `id` (string, required): MongoDB ObjectId

**Success Response** (200):
```json
{
  "success": true,
  "message": "Word deleted successfully"
}
```

**Error Responses**:
- `400`: Invalid ObjectId
- `401`: Not authenticated or insufficient permissions
- `404`: Word not found

---

### POST `/dictionary/upload`

Bulk upload dictionary from JSON (admin only).

**Authentication**: Required (Admin JWT with `manage_dictionary` permission)  
**Rate Limit**: `uploads.dictionary` (10 requests per 1 hour)

**Request Body**:
```json
{
  "words": [
    {
      "word": "example",
      "meanings": ["definition"],
      "relatedWords": ["sample"]
    }
  ]
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "imported": 150,
    "skipped": 5,
    "errors": []
  },
  "message": "Bulk upload completed"
}
```

---

### GET `/dictionary/export/all`

Export all words as JSON (admin only).

**Authentication**: Required (Admin JWT with `manage_dictionary` permission)  
**Rate Limit**: `default`

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "words": [ /* all word objects */ ],
    "count": 1000
  }
}
```

---

## Abbreviation Endpoints

### GET `/abbreviations`

Search abbreviations with optional query.

**Authentication**: None (public)  
**Rate Limit**: `search`

**Query Parameters**:
- `q` (string, optional): Search term
- `page` (number, optional)
- `limit` (number, optional)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "abbreviations": [
      {
        "id": "507f1f77bcf86cd799439011",
        "abbreviation": "API",
        "fullForm": "Application Programming Interface",
        "description": "Optional description"
      }
    ],
    "pagination": { /* pagination object */ }
  }
}
```

**Notes**:
- Results cached in Redis (60s TTL)

---

### GET `/abbreviations/all`

Get all abbreviations (paginated).

**Authentication**: Required (User or Admin JWT)  
**Rate Limit**: `default`

**Query Parameters**:
- `page` (number, optional)
- `limit` (number, optional)

**Success Response**: Same as search endpoint

---

### GET `/abbreviations/:abbr`

Look up specific abbreviation.

**Authentication**: None (public)  
**Rate Limit**: `search`

**URL Parameters**:
- `abbr` (string, required): Abbreviation to look up

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "abbreviation": {
      "id": "507f1f77bcf86cd799439011",
      "abbreviation": "API",
      "fullForm": "Application Programming Interface",
      "description": "Optional description"
    }
  }
}
```

**Error Responses**:
- `404`: Abbreviation not found

---

### POST `/abbreviations`

Create new abbreviation (admin only).

**Authentication**: Required (Admin JWT with `manage_abbreviations` permission)  
**Rate Limit**: `default`

**Request Body**:
```json
{
  "abbreviation": "string (required)",
  "fullForm": "string (required)",
  "description": "string (optional)"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "abbreviation": { /* created object */ }
  },
  "message": "Abbreviation created successfully"
}
```

**Error Responses**:
- `400`: Missing fields, duplicate abbreviation
- `401`: Not authenticated or insufficient permissions

---

### PUT `/abbreviations/:id`

Update abbreviation (admin only).

**Authentication**: Required (Admin JWT with `manage_abbreviations` permission)  
**Rate Limit**: `default`

**URL Parameters**:
- `id` (string, required): MongoDB ObjectId

**Request Body** (all required):
```json
{
  "abbreviation": "string",
  "fullForm": "string",
  "description": "string (optional)"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "abbreviation": { /* updated object */ }
  },
  "message": "Abbreviation updated successfully"
}
```

---

### DELETE `/abbreviations/:id`

Delete abbreviation (admin only).

**Authentication**: Required (Admin JWT with `manage_abbreviations` permission)  
**Rate Limit**: `default`

**URL Parameters**:
- `id` (string, required): MongoDB ObjectId

**Success Response** (200):
```json
{
  "success": true,
  "message": "Abbreviation deleted successfully"
}
```

---

### POST `/abbreviations/bulk`

Bulk upload abbreviations (admin only).

**Authentication**: Required (Admin JWT with `manage_abbreviations` permission)  
**Rate Limit**: `uploads.abbreviation` (10 requests per 1 hour)

**Request Body**:
```json
{
  "abbreviations": [
    {
      "abbreviation": "API",
      "fullForm": "Application Programming Interface"
    }
  ]
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "imported": 50,
    "skipped": 2,
    "errors": []
  }
}
```

---

### GET `/abbreviations/export/all`

Export all abbreviations (admin only).

**Authentication**: Required (Admin JWT with `manage_abbreviations` permission)  
**Rate Limit**: `default`

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "abbreviations": [ /* all objects */ ],
    "count": 500
  }
}
```

---

## Audit Endpoints

### GET `/audit/logs`

Get paginated audit logs with optional filters (admin only).

**Authentication**: Required (Admin JWT with `view_audit` permission)  
**Rate Limit**: `default`

**Query Parameters**:
- `page` (number, optional): Page number
- `limit` (number, optional): Results per page
- `type` (string, optional): Filter by log type (`LOGIN`, `DEVICE_CHANGE`, `ADMIN_ACTION`)
- `userId` (string, optional): Filter by user ID
- `startDate` (ISO string, optional): Filter from date
- `endDate` (ISO string, optional): Filter to date

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "507f1f77bcf86cd799439011",
        "type": "LOGIN",
        "userId": "507f1f77bcf86cd799439012",
        "userName": "John Doe",
        "phoneNumber": "+1234567890",
        "deviceId": "device-123",
        "metadata": {
          "ip": "192.168.1.1",
          "userAgent": "Mozilla/5.0..."
        },
        "timestamp": "2024-01-10T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 200,
      "itemsPerPage": 20
    }
  }
}
```

**Error Responses**:
- `401`: Not authenticated or insufficient permissions

---

### GET `/audit/stats`

Get audit statistics (admin only).

**Authentication**: Required (Admin JWT with `view_audit` permission)  
**Rate Limit**: `default`

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "totalLogins": 1500,
    "totalDeviceChanges": 45,
    "totalAdminActions": 230,
    "uniqueUsers": 350,
    "recentActivity": [
      {
        "date": "2024-01-10",
        "logins": 120,
        "deviceChanges": 3
      }
    ]
  }
}
```

---

## SSE Endpoint

### GET `/events`

Establish Server-Sent Events connection for real-time updates.

**Authentication**: Required (User or Admin JWT)  
**Rate Limit**: `default`

**Request Headers**:
```
Authorization: Bearer <token>
Accept: text/event-stream
```

**Response**: Event stream (Content-Type: `text/event-stream`)

**Event Types**:

1. **connected** - Initial connection confirmation
```
event: connected
data: {"message":"Connected to event stream"}
```

2. **PDF_ADDED** - New PDF uploaded
```
event: PDF_ADDED
data: {"pdfId":"507f...","title":"New Document","uploadedBy":"Admin"}
```

3. **PDF_UPDATED** - PDF modified
```
event: PDF_UPDATED
data: {"pdfId":"507f...","title":"Updated Document"}
```

4. **PDF_DELETED** - PDF removed
```
event: PDF_DELETED
data: {"pdfId":"507f..."}
```

**Notes**:
- Connection stays open indefinitely
- Heartbeat comments (`:heartbeat`) sent every 30s
- Nginx configured with `proxy_buffering off` for SSE
- Events published via Redis Pub/Sub

**Client Example**:
```javascript
const evtSource = new EventSource('/api/events', {
  headers: { Authorization: `Bearer ${token}` }
});

evtSource.addEventListener('PDF_ADDED', (e) => {
  const data = JSON.parse(e.data);
  console.log('New PDF:', data.title);
});

evtSource.onerror = () => {
  console.log('Connection lost, reconnecting...');
};
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `RATE_LIMIT_EXCEEDED` | Too many requests from this IP |
| `OTP_RATE_LIMIT_EXCEEDED` | Too many OTP requests |
| `LOGIN_RATE_LIMIT_EXCEEDED` | Too many login attempts |
| `INVALID_CREDENTIALS` | Wrong password or contact |
| `INVALID_OTP` | OTP is incorrect or expired |
| `USER_BLOCKED` | User account is blocked |
| `INSUFFICIENT_PERMISSIONS` | Admin lacks required permission |
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE_ENTRY` | Resource already exists |

---

## Pagination

All paginated endpoints support:
- `page`: Page number (1-indexed, default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes:
```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Authentication Headers

**User Authentication**:
```
Authorization: Bearer <user_jwt_token>
```
Or cookie: `auth_token`

**Admin Authentication**:
```
Authorization: Bearer <admin_jwt_token>
```
Or cookie: `admin_token`

---

## File Upload Limits

- **Max file size**: 50MB
- **Allowed PDF types**: `application/pdf`
- **Allowed image types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Upload directory**: `uploads/<uuid>/`

---

## Caching

Cached endpoints (Nginx proxy cache, 5 min TTL):
- `/api/dictionary/word/:word`
- `/api/dictionary/search/:term`
- `/api/abbreviations`
- `/api/abbreviations/:abbr`

Cache headers:
- `X-Cache-Status`: `HIT`, `MISS`, or `BYPASS`

Redis caching (application level, 60s TTL):
- Dictionary search results
- Abbreviation search results
