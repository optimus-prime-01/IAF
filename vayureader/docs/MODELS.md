# Database Models

Complete reference for all Mongoose schemas in VayuReader Backend v2.

## Overview

The application uses MongoDB with Mongoose ODM. All models include:
- Automatic timestamps (`createdAt`, `updatedAt`)
- Indexes for query optimization
- Validation rules
- Instance methods where applicable

---

## User Model

**File**: `src/models/User.js`  
**Collection**: `users`

Represents application users who authenticate via OTP.

### Schema

| Field | Type | Required | Unique | Index | Description |
|-------|------|----------|--------|-------|-------------|
| `name` | String | ✅ | ❌ | ❌ | User's full name (2-100 chars) |
| `phone_number` | String | ✅ | ✅ | ✅ | Phone number (unique identifier) |
| `deviceId` | String | ❌ | ❌ | ✅ | Current device ID bound to user |
| `previousDeviceId` | String | ❌ | ❌ | ❌ | Previous device ID (audit trail) |
| `lastLogin` | Date | ❌ | ❌ | ❌ | Last login timestamp |
| `isBlocked` | Boolean | ❌ | ❌ | ❌ | Whether user is blocked (default: false) |
| `createdAt` | Date | Auto | ❌ | ❌ | Account creation timestamp |
| `updatedAt` | Date | Auto | ❌ | ❌ | Last update timestamp |

### Indexes

```javascript
{ phone_number: 1 }  // Unique index
{ deviceId: 1 }      // Non-unique index
```

### Instance Methods

#### `toSafeObject()`

Returns sanitized user object for API responses (excludes sensitive fields).

```javascript
{
  id: ObjectId,
  name: String,
  phone_number: String
}
```

### Usage Example

```javascript
const User = require('./models/User');

// Create user
const user = new User({
  name: 'John Doe',
  phone_number: '+1234567890'
});
await user.save();

// Find by phone
const user = await User.findOne({ phone_number: '+1234567890' });

// Block user
user.isBlocked = true;
await user.save();
```

### Notes

- `phone_number` should be stored in E.164 format
- `deviceId` is set during OTP verification
- Device changes are logged to `UserAudit`
- Blocked users cannot login (checked in auth middleware)

---

## Admin Model

**File**: `src/models/Admin.js`  
**Collection**: `admins`

Represents administrators with role-based permissions.

### Schema

| Field | Type | Required | Unique | Index | Description |
|-------|------|----------|--------|-------|-------------|
| `name` | String | ✅ | ❌ | ✅ | Admin's full name (2-100 chars) |
| `contact` | String | ✅ | ✅ | ✅ | Contact number (unique identifier) |
| `isSuperAdmin` | Boolean | ❌ | ❌ | ❌ | Super admin privileges (default: false) |
| `permissions` | [String] | ❌ | ❌ | ❌ | Array of permission strings |
| `createdBy` | String | ❌ | ❌ | ❌ | Who created this admin (default: 'System') |
| `passwordHash` | String | ✅ | ❌ | ❌ | Bcrypt hashed password |
| `createdAt` | Date | Auto | ❌ | ❌ | Account creation timestamp |
| `updatedAt` | Date | Auto | ❌ | ❌ | Last update timestamp |

### Permissions

Available permissions (defined in `PERMISSIONS` constant):
- `manage_pdfs` - Create, update, delete PDFs
- `manage_dictionary` - Manage dictionary words
- `manage_abbreviations` - Manage abbreviations
- `manage_admins` - Create/delete sub-admins (super admin only)
- `view_audit` - View audit logs

### Indexes

```javascript
{ contact: 1 }  // Unique index
{ name: 1 }     // Non-unique index
```

### Instance Methods

#### `hasPermission(permission)`

Check if admin has a specific permission. Super admins always return `true`.

```javascript
if (admin.hasPermission('manage_pdfs')) {
  // Allow PDF operations
}
```

#### `toSafeObject()`

Returns sanitized admin object (excludes `passwordHash`).

```javascript
{
  id: ObjectId,
  name: String,
  contact: String,
  isSuperAdmin: Boolean,
  permissions: [String]  // All permissions if super admin
}
```

### Usage Example

```javascript
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

// Create admin
const passwordHash = await bcrypt.hash('password123', 10);
const admin = new Admin({
  name: 'Admin User',
  contact: '+1234567890',
  passwordHash,
  permissions: ['manage_pdfs', 'manage_dictionary']
});
await admin.save();

// Verify password
const isValid = await bcrypt.compare(password, admin.passwordHash);

// Check permission
if (admin.hasPermission('manage_pdfs')) {
  // Allowed
}
```

### Notes

- Super admins have all permissions automatically
- Password must be hashed with bcrypt (10 rounds)
- Admin login requires 2FA (password + OTP)

---

## PdfDocument Model

**File**: `src/models/PdfDocument.js`  
**Collection**: `pdfdocuments`

Represents PDF documents uploaded to the system.

### Schema

| Field | Type | Required | Unique | Index | Description |
|-------|------|----------|--------|-------|-------------|
| `title` | String | ✅ | ❌ | ✅ | PDF title (1-200 chars) |
| `description` | String | ❌ | ❌ | ❌ | Optional description (max 1000 chars) |
| `category` | String | ✅ | ❌ | ✅ | Category name |
| `pdfUrl` | String | ✅ | ❌ | ❌ | Relative path to PDF file |
| `thumbnailUrl` | String | ❌ | ❌ | ❌ | Relative path to thumbnail |
| `uploadedBy` | ObjectId | ✅ | ❌ | ✅ | Reference to Admin who uploaded |
| `views` | Number | ❌ | ❌ | ❌ | View count (default: 0) |
| `createdAt` | Date | Auto | ❌ | ✅ | Upload timestamp |
| `updatedAt` | Date | Auto | ❌ | ❌ | Last update timestamp |

### Indexes

```javascript
{ title: 1 }
{ category: 1 }
{ uploadedBy: 1 }
{ createdAt: -1 }
{ title: 'text', description: 'text', category: 'text' }  // Full-text search
```

### Instance Methods

None (uses static queries).

### Usage Example

```javascript
const PdfDocument = require('./models/PdfDocument');

// Create PDF
const pdf = new PdfDocument({
  title: 'Technical Manual',
  description: 'System documentation',
  category: 'Technical',
  pdfUrl: '/uploads/abc123/file.pdf',
  thumbnailUrl: '/uploads/abc123/thumb.jpg',
  uploadedBy: adminId
});
await pdf.save();

// Increment views
await PdfDocument.findByIdAndUpdate(
  pdfId,
  { $inc: { views: 1 } },
  { new: true }
);

// Search PDFs
const results = await PdfDocument.find({
  $text: { $search: 'technical manual' }
});
```

### Notes

- Files stored in `uploads/<uuid>/` directory
- `pdfUrl` and `thumbnailUrl` are relative paths
- View count incremented on each GET request
- Deletions trigger file cleanup

---

## Word Model

**File**: `src/models/Word.js`  
**Collection**: `words`

Represents dictionary words with meanings and related terms.

### Schema

| Field | Type | Required | Unique | Index | Description |
|-------|------|----------|--------|-------|-------------|
| `word` | String | ✅ | ✅ | ✅ | The word (stored uppercase) |
| `meanings` | [Meaning] | ✅ | ❌ | ❌ | Array of meaning objects |
| `synonyms` | [String] | ❌ | ❌ | ❌ | Word-level synonyms |
| `antonyms` | [String] | ❌ | ❌ | ❌ | Word antonyms |
| `createdAt` | Date | Auto | ❌ | ❌ | Creation timestamp |
| `updatedAt` | Date | Auto | ❌ | ❌ | Last update timestamp |

### Meaning Sub-Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `partOfSpeech` | String | ❌ | Part of speech (noun, verb, etc.) |
| `definition` | String | ✅ | The definition |
| `synonyms` | [String] | ❌ | Meaning-specific synonyms |
| `examples` | [String] | ❌ | Usage examples |

### Indexes

```javascript
{ word: 1 }  // Unique index
```

### Validation

- At least one meaning required
- Word automatically converted to uppercase

### Usage Example

```javascript
const Word = require('./models/Word');

// Create word
const word = new Word({
  word: 'example',
  meanings: [
    {
      partOfSpeech: 'noun',
      definition: 'A thing characteristic of its kind',
      synonyms: ['sample', 'instance'],
      examples: ['This is an example sentence']
    }
  ],
  synonyms: ['sample'],
  antonyms: []
});
await word.save();

// Find word (case-insensitive)
const word = await Word.findOne({ word: 'EXAMPLE' });
```

### Notes

- Words stored in uppercase for consistency
- Supports multiple meanings per word
- Synonyms can be at word or meaning level

---

## Abbreviation Model

**File**: `src/models/Abbreviation.js`  
**Collection**: `abbreviations`

Represents abbreviations and their full forms.

### Schema

| Field | Type | Required | Unique | Index | Description |
|-------|------|----------|--------|-------|-------------|
| `abbreviation` | String | ✅ | ✅ | ✅ | The abbreviation (stored uppercase) |
| `fullForm` | String | ✅ | ❌ | ❌ | Full form/expansion |
| `createdAt` | Date | Auto | ❌ | ❌ | Creation timestamp |
| `updatedAt` | Date | Auto | ❌ | ❌ | Last update timestamp |

### Indexes

```javascript
{ abbreviation: 1 }  // Unique index
{ abbreviation: 'text', fullForm: 'text' }  // Full-text search
```

### Usage Example

```javascript
const Abbreviation = require('./models/Abbreviation');

// Create abbreviation
const abbr = new Abbreviation({
  abbreviation: 'API',
  fullForm: 'Application Programming Interface'
});
await abbr.save();

// Search
const results = await Abbreviation.find({
  $text: { $search: 'application' }
});
```

### Notes

- Abbreviations stored in uppercase
- Full-text search on both fields

---

## UserAudit Model

**File**: `src/models/UserAudit.js`  
**Collection**: `useraudits`

Records user activities for auditing and analytics.

### Schema

| Field | Type | Required | Unique | Index | Description |
|-------|------|----------|--------|-------|-------------|
| `userId` | ObjectId | ✅ | ❌ | ✅ | Reference to User |
| `phone_number` | String | ✅ | ❌ | ✅ | Denormalized phone number |
| `action` | String | ✅ | ❌ | ✅ | Action type (enum) |
| `deviceId` | String | ❌ | ❌ | ✅ | Device ID |
| `metadata` | Mixed | ❌ | ❌ | ❌ | Additional action details |
| `timestamp` | Date | ❌ | ❌ | ✅ | Action timestamp (default: now) |
| `createdAt` | Date | Auto | ❌ | ❌ | Record creation |
| `updatedAt` | Date | Auto | ❌ | ❌ | Last update |

### Action Types

```javascript
USER_ACTIONS = {
  LOGIN: 'LOGIN',
  DEVICE_CHANGE: 'DEVICE_CHANGE',
  READ_PDF: 'READ_PDF'
}
```

### Metadata Structure

**LOGIN**:
```javascript
{
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
}
```

**DEVICE_CHANGE**:
```javascript
{
  previousDeviceId: 'old-device-123',
  newDeviceId: 'new-device-456'
}
```

**READ_PDF**:
```javascript
{
  pdfId: '507f1f77bcf86cd799439011',
  title: 'Document Title'
}
```

### Indexes

```javascript
{ timestamp: -1 }
{ userId: 1, action: 1 }
{ phone_number: 1, timestamp: -1 }
{ action: 1, timestamp: -1 }
{ deviceId: 1 }
```

### Usage Example

```javascript
const UserAudit = require('./models/UserAudit');
const { USER_ACTIONS } = require('./models/UserAudit');

// Log login
await UserAudit.create({
  userId: user._id,
  phone_number: user.phone_number,
  action: USER_ACTIONS.LOGIN,
  deviceId: 'device-123',
  metadata: {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }
});

// Query user activity
const logs = await UserAudit.find({
  userId: user._id,
  action: USER_ACTIONS.READ_PDF
}).sort({ timestamp: -1 }).limit(10);
```

### Notes

- Separate from admin audit logs
- Phone number denormalized for faster queries
- Indexed for time-series queries

---

## AuditLog Model

**File**: `src/models/AuditLog.js`  
**Collection**: `auditlogs`

Records administrative actions for accountability and compliance.

### Schema

| Field | Type | Required | Unique | Index | Description |
|-------|------|----------|--------|-------|-------------|
| `action` | String | ✅ | ❌ | ✅ | Action type (CREATE/UPDATE/DELETE) |
| `resourceType` | String | ✅ | ❌ | ✅ | Type of resource affected |
| `resourceId` | String | ✅ | ❌ | ✅ | ID of affected resource |
| `adminId` | ObjectId | ❌ | ❌ | ❌ | Reference to Admin |
| `adminName` | String | ✅ | ❌ | ✅ | Admin name (denormalized) |
| `adminContact` | String | ✅ | ❌ | ❌ | Admin contact |
| `details` | Mixed | ❌ | ❌ | ❌ | Additional details (old/new values) |
| `timestamp` | Date | ❌ | ❌ | ✅ | Action timestamp (default: now) |
| `createdAt` | Date | Auto | ❌ | ❌ | Record creation |
| `updatedAt` | Date | Auto | ❌ | ❌ | Last update |

### Action Types

```javascript
['CREATE', 'UPDATE', 'DELETE']
```

### Resource Types

```javascript
['PDF', 'DICTIONARY_WORD', 'ABBREVIATION', 'ADMIN']
```

### Indexes

```javascript
{ timestamp: -1 }
{ resourceType: 1, resourceId: 1 }
{ adminName: 1 }
{ action: 1, resourceType: 1 }
```

### Usage Example

```javascript
const AuditLog = require('./models/AuditLog');

// Log PDF creation
await AuditLog.create({
  action: 'CREATE',
  resourceType: 'PDF',
  resourceId: pdf._id.toString(),
  adminId: admin._id,
  adminName: admin.name,
  adminContact: admin.contact,
  details: {
    title: pdf.title,
    category: pdf.category
  }
});

// Log word update
await AuditLog.create({
  action: 'UPDATE',
  resourceType: 'DICTIONARY_WORD',
  resourceId: word._id.toString(),
  adminId: admin._id,
  adminName: admin.name,
  adminContact: admin.contact,
  details: {
    oldMeanings: oldWord.meanings,
    newMeanings: word.meanings
  }
});

// Query admin actions
const logs = await AuditLog.find({
  adminName: 'Admin User',
  resourceType: 'PDF'
}).sort({ timestamp: -1 });
```

### Notes

- Admin info denormalized for faster queries
- `details` field stores old/new values for updates
- Indexed for compliance reporting

---

## Common Patterns

### Pagination

```javascript
const page = parseInt(req.query.page) || 1;
const limit = Math.min(parseInt(req.query.limit) || 20, 100);
const skip = (page - 1) * limit;

const results = await Model.find(query)
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });

const total = await Model.countDocuments(query);

return {
  results,
  pagination: {
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    totalItems: total,
    itemsPerPage: limit
  }
};
```

### Full-Text Search

```javascript
// Requires text index
const results = await Model.find({
  $text: { $search: searchTerm }
}, {
  score: { $meta: 'textScore' }
}).sort({ score: { $meta: 'textScore' } });
```

### Atomic Updates

```javascript
// Increment view count
await PdfDocument.findByIdAndUpdate(
  pdfId,
  { $inc: { views: 1 } },
  { new: true }
);
```

---

## Index Management

### Creating Indexes

Indexes are automatically created when the server starts. To manually ensure indexes:

```bash
node scripts/optimizeDb.js
```

### Viewing Indexes

```javascript
const indexes = await Model.collection.getIndexes();
console.log(indexes);
```

### Performance Tips

1. **Use indexes for frequent queries** - All `find()` queries should use indexed fields
2. **Compound indexes** - Create compound indexes for multi-field queries
3. **Text indexes** - Use for full-text search (one per collection)
4. **Avoid regex on non-indexed fields** - Use text search instead
5. **Monitor slow queries** - Enable MongoDB profiling in production

---

## Validation

All models use Mongoose validation:

```javascript
// Built-in validators
{
  type: String,
  required: [true, 'Field is required'],
  minlength: [2, 'Too short'],
  maxlength: [100, 'Too long'],
  unique: true,
  trim: true,
  uppercase: true,
  enum: ['VALUE1', 'VALUE2']
}

// Custom validators
{
  validate: {
    validator: function(v) {
      return v && v.length > 0;
    },
    message: 'Custom validation message'
  }
}
```

---

## Timestamps

All models include automatic timestamps:

```javascript
{
  timestamps: true  // Adds createdAt and updatedAt
}
```

Access in queries:

```javascript
const recentDocs = await Model.find({
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
});
```
