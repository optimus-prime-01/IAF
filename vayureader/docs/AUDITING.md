# Auditing & Logs

Comprehensive guide to the auditing system in VayuReader Backend v2.

## Overview

The auditing system provides accountability and analytics by tracking:
1.  **Admin Actions** (`AuditLog`): Changes to data (create, update, delete).
2.  **User Activity** (`UserAudit`): Logins, device changes, and content consumption.

---

## 1. Admin Audit Logs

**Model**: `src/models/AuditLog.js`  
**Storage**: MongoDB collection `auditlogs`

### What is Logged
-   **Resource Changes**: Modifications to PDFs, Dictionary Words, and Abbreviations.
-   **Admin Management**: Creation and deletion of sub-admins.

### Log Structure
```javascript
{
  action: "UPDATE",
  resourceType: "DICTIONARY_WORD",
  resourceId: "507f1f...",
  adminName: "Super Admin",
  details: {
    oldMeanings: [...],
    newMeanings: [...]
  },
  timestamp: ISODate("...")
}
```

### Accessing Logs
Admins with `view_audit` permission can query logs via API:
-   `GET /api/audit/logs`: Filter by type, date, or admin.
-   `GET /api/audit/stats`: Aggregate statistics (counts by type).

### Retention Policy
Currently, logs are retained indefinitely. For production, a retention policy (e.g., 1 year) should be implemented using a TTL index or cron job.

---

## 2. User Audit Logs

**Model**: `src/models/UserAudit.js`  
**Storage**: MongoDB collection `useraudits`

### What is Logged
-   **LOGIN**: Successful authentication via OTP.
-   **DEVICE_CHANGE**: Login from a new device ID (security critical).
-   **READ_PDF**: User viewed a document.

### Device Tracking
Device changes are critical for security monitoring.
```javascript
{
  action: "DEVICE_CHANGE",
  userId: "...",
  phone_number: "+91...",
  deviceId: "new-device-id",
  metadata: {
    previousDeviceId: "old-device-id"
  }
}
```

### Analytics
User audit logs power internal dashboards to show:
-   Daily Active Users (DAU)
-   Most popular documents
-   User retention rates

---

## Logging Implementation

**Service**: `src/services/userAudit.service.js`

Logging is asynchronous and non-blocking. Failures to log do not block the main request flow (fire-and-forget).

```javascript
// Example: Logging a login
const logLogin = async (user, deviceId) => {
    try {
        await UserAudit.create({ /* ... */ });
    } catch (err) {
        console.error('Audit log failed:', err);
    }
};
```

---

## Best Practices
-   **Denormalization**: Important fields (user phone, admin name) are denormalized into logs to ensure history is preserved even if the original user/admin is deleted.
-   **Immutability**: Audit logs should never be updated or deleted via API.
-   **Indexing**: Timestamps and Action types are indexed for fast retrieval.
