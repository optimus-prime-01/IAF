# CLI Scripts & Utilities

Complete reference for all command-line scripts in VayuReader Backend v2.

## Overview

The `scripts/` directory contains operational utilities for database management, user administration, and system maintenance.

**Location**: `scripts/`

---

## manageUsers.js

**Purpose**: Delete, block, or unblock users and admins from the command line.

### Usage

```bash
node scripts/manageUsers.js <type> <action> <identifier_flag> <value>
```

### Arguments

| Argument | Values | Description |
|----------|--------|-------------|
| `<type>` | `user` \| `admin` | Target entity type |
| `<action>` | `delete` \| `block` \| `unblock` | Action to perform |
| `<identifier_flag>` | `--contact` \| `--id` \| `--device` | How to identify the target |
| `<value>` | String | The actual identifier value |

### Identifier Flags

- `--contact` - Phone number for users, contact for admins
- `--id` - MongoDB `_id` (ObjectId)
- `--device` - Device ID (users only)

### Examples

```bash
# Block a user by phone number
node scripts/manageUsers.js user block --contact +1234567890

# Unblock a user by ID
node scripts/manageUsers.js user unblock --id 507f1f77bcf86cd799439011

# Delete a user by device ID
node scripts/manageUsers.js user delete --device abc123def456

# Delete an admin by contact
node scripts/manageUsers.js admin delete --contact +9876543210

# Delete an admin by ID
node scripts/manageUsers.js admin delete --id 507f1f77bcf86cd799439012
```

### Internals

1. Loads environment variables from `.env`
2. Connects to MongoDB
3. Finds the target document based on identifier
4. Performs the requested action:
   - **delete**: `Model.deleteOne({ _id })`
   - **block**: Sets `user.isBlocked = true` (users only)
   - **unblock**: Sets `user.isBlocked = false` (users only)
5. Logs result to console
6. Disconnects from MongoDB

### Notes

- Admin blocking is not supported (use delete instead)
- Blocked users cannot login (enforced in auth middleware)
- Deleted users' tokens become invalid immediately
- Use with caution in production

---

## seedAdmin.js

**Purpose**: Create the initial super admin account.

### Usage

```bash
node scripts/seedAdmin.js
```

### Environment Variables Required

- `SUPER_ADMIN_NAME` - Admin's full name
- `SUPER_ADMIN_CONTACT` - Admin's phone number
- `SUPER_ADMIN_PASSWORD` - Admin's password (will be hashed)

### Example

```bash
# Set environment variables
export SUPER_ADMIN_NAME="Super Admin"
export SUPER_ADMIN_CONTACT="+1234567890"
export SUPER_ADMIN_PASSWORD="SecurePassword123!"

# Run script
node scripts/seedAdmin.js
```

### Output

```
Connecting to MongoDB...
Connected to MongoDB
Creating super admin...
Super admin created successfully!
Name: Super Admin
Contact: +1234567890
Disconnected from DB
```

### Internals

1. Checks if super admin already exists (by contact)
2. If exists, exits with message
3. Hashes password using bcrypt (10 rounds)
4. Creates admin document with:
   - `isSuperAdmin: true`
   - All permissions
   - `createdBy: 'System'`
5. Saves to database

### Notes

- Run once during initial setup
- Password is hashed with bcrypt
- Super admin has all permissions automatically
- Cannot be deleted via API (only via script)

---

## create-super-admin.js

**Purpose**: Interactive script to create a super admin (alternative to seedAdmin.js).

### Usage

```bash
node scripts/create-super-admin.js
```

### Interactive Prompts

```
Enter super admin name: Super Admin
Enter contact number: +1234567890
Enter password: ********
Confirm password: ********
```

### Internals

- Uses `readline` for interactive input
- Validates password match
- Hashes password with bcrypt
- Creates super admin document

### Notes

- More user-friendly than `seedAdmin.js`
- Useful for manual admin creation
- Password is hidden during input

---

## reset-admin-password.js

**Purpose**: Reset an admin's password.

### Usage

```bash
node scripts/reset-admin-password.js <contact> <new_password>
```

### Arguments

- `<contact>` - Admin's contact number
- `<new_password>` - New password (will be hashed)

### Example

```bash
node scripts/reset-admin-password.js +1234567890 NewSecurePassword123!
```

### Output

```
Connecting to MongoDB...
Admin found: Super Admin
Password updated successfully!
```

### Internals

1. Finds admin by contact
2. Hashes new password with bcrypt
3. Updates `passwordHash` field
4. Saves document

### Notes

- Use when admin forgets password
- Password must meet strength requirements
- Admin must re-login after reset

---

## create-user.js

**Purpose**: Manually create a user account (for testing).

### Usage

```bash
node scripts/create-user.js <name> <phone_number>
```

### Arguments

- `<name>` - User's full name
- `<phone_number>` - User's phone number

### Example

```bash
node scripts/create-user.js "John Doe" +1234567890
```

### Output

```
User created successfully!
ID: 507f1f77bcf86cd799439011
Name: John Doe
Phone: +1234567890
```

### Internals

1. Checks if user already exists
2. Creates user document
3. Saves to database

### Notes

- Useful for testing without OTP flow
- User can login normally via OTP
- No device binding until first login

---

## optimizeDb.js

**Purpose**: Optimize database performance by creating indexes and analyzing collections.

### Usage

```bash
node scripts/optimizeDb.js
```

### What It Does

1. **Creates Indexes**:
   - User: `phone_number`, `deviceId`
   - Admin: `contact`, `name`
   - PdfDocument: `title`, `category`, `uploadedBy`, `createdAt`, text index
   - Word: `word`, text index
   - Abbreviation: `abbreviation`, text index
   - UserAudit: `userId`, `phone_number`, `action`, `timestamp`
   - AuditLog: `resourceType`, `resourceId`, `adminName`, `timestamp`

2. **Analyzes Collections**:
   - Document count
   - Average document size
   - Total size
   - Index count

3. **Provides Recommendations**:
   - Slow query detection
   - Missing indexes
   - Large collections

### Output

```
Optimizing database...

Creating indexes...
✓ User indexes created
✓ Admin indexes created
✓ PdfDocument indexes created
✓ Word indexes created
✓ Abbreviation indexes created
✓ UserAudit indexes created
✓ AuditLog indexes created

Analyzing collections...
Users: 1,234 documents (avg 512 bytes, total 631 KB)
Admins: 5 documents (avg 256 bytes, total 1.3 KB)
PDFs: 567 documents (avg 1024 bytes, total 581 KB)
...

Recommendations:
- Consider archiving old audit logs (>90 days)
- UserAudit collection is large (10 MB), consider partitioning
```

### Internals

- Uses `Model.collection.createIndex()` for each index
- Queries `db.collection.stats()` for analysis
- Calculates recommendations based on thresholds

### Notes

- Run after schema changes
- Run periodically in production (monthly)
- Safe to run multiple times (idempotent)

---

## syncElasticsearch.js

**Purpose**: Sync MongoDB data to Elasticsearch for advanced search.

### Usage

```bash
node scripts/syncElasticsearch.js [--full]
```

### Flags

- `--full` - Full re-index (deletes existing data)
- (no flag) - Incremental sync (only new/updated documents)

### Example

```bash
# Full re-index
node scripts/syncElasticsearch.js --full

# Incremental sync
node scripts/syncElasticsearch.js
```

### What It Syncs

1. **Dictionary Words**:
   - Index: `dictionary`
   - Fields: `word`, `meanings`, `synonyms`, `antonyms`

2. **Abbreviations**:
   - Index: `abbreviations`
   - Fields: `abbreviation`, `fullForm`

3. **PDFs**:
   - Index: `pdfs`
   - Fields: `title`, `description`, `category`

### Output

```
Connecting to Elasticsearch...
Connected to Elasticsearch

Syncing dictionary words...
Indexed 1,234 words

Syncing abbreviations...
Indexed 567 abbreviations

Syncing PDFs...
Indexed 89 PDFs

Sync completed!
Total documents: 1,890
```

### Internals

1. Connects to Elasticsearch (URL from `.env`)
2. Creates indexes if they don't exist
3. Queries MongoDB for documents
4. Bulk indexes to Elasticsearch
5. Logs progress and errors

### Notes

- Requires Elasticsearch running
- Full re-index can take time for large datasets
- Incremental sync uses `updatedAt` timestamp
- See `docs/ELASTICSEARCH.md` for details

---

## cleanupLogs.js

**Purpose**: Delete old audit logs to free up space.

### Usage

```bash
node scripts/cleanupLogs.js --days <number> [--dry-run]
```

### Arguments

- `--days` - Retention period in days (records older than this will be deleted)
- `--dry-run` - Simulate deletion without actually removing data

### Example

```bash
# Delete logs older than 90 days
node scripts/cleanupLogs.js --days 90

# Dry run to see what would be deleted
node scripts/cleanupLogs.js --days 60 --dry-run
```

### Output

```
Cleanup Configuration:
- Retention Days: 90
- Cutoff Date: 2023-10-12T10:00:00.000Z
- Mode: LIVE

Found logs older than 90 days:
- UserAudit: 1,500 records
- AuditLog: 250 records

Deleting old UserAudit logs...
✓ Deleted 1500 UserAudit records

Deleting old AuditLog logs...
✓ Deleted 250 AuditLog records

Cleanup completed successfully!
```

### Notes

- Targets both `UserAudit` and `AuditLog` collections
- Recommended to run via cron job provided in `docs/SCRIPTS.md`
- Backup database before running with short retention periods

---

## sms-simulator.js

**Purpose**: Simulate SMS gateway for development (no actual SMS sent).

### Usage

```bash
node scripts/sms-simulator.js
```

### What It Does

- Starts HTTP server on port 8080
- Receives OTP requests from backend
- Logs OTP to console (instead of sending SMS)
- Returns success response

### Output

```
SMS Simulator running on port 8080

[2024-01-10 10:00:00] OTP Request
To: +1234567890
Message: Your OTP is: 123456
```

### Configuration

Set in `.env`:
```
OTP_GATEWAY_URL=http://sms-simulator:8080/send
SKIP_OTP_SEND=false  # Set to true to skip entirely
```

### Internals

- Express server listening on `/send`
- Parses request body for phone number and message
- Logs to console
- Returns `{ success: true }`

### Notes

- For development only
- Allows testing OTP flow without SMS costs
- Can be replaced with real SMS gateway in production

---

## Common Patterns

### Running Scripts in Docker

```bash
# Execute script in running container
docker-compose exec app node scripts/manageUsers.js user block --contact +1234567890

# Run script in new container
docker-compose run --rm app node scripts/seedAdmin.js
```

### Environment Variables

All scripts load `.env` automatically:

```javascript
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
```

### Database Connection

Standard pattern:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('DB Connection Error:', error);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();
  
  // ... script logic ...
  
  await mongoose.disconnect();
  process.exit(0);
};

run();
```

### Error Handling

```javascript
try {
  const user = await User.findOne({ phone_number });
  if (!user) {
    console.log('User not found');
    process.exit(0);
  }
  
  // ... perform action ...
  
  console.log('Success!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
```

---

## Best Practices

1. **Always use `.env`** - Never hardcode credentials
2. **Validate inputs** - Check arguments before processing
3. **Confirm destructive actions** - Prompt user before deleting
4. **Log everything** - Console output for audit trail
5. **Exit cleanly** - Always disconnect from DB
6. **Use exit codes** - 0 for success, 1 for error
7. **Handle errors gracefully** - Catch and log all errors

---

## Troubleshooting

### "Cannot connect to MongoDB"

**Cause**: MongoDB not running or wrong connection string  
**Solution**:
```bash
# Check MongoDB status
docker-compose ps mongodb

# Check connection string in .env
cat .env | grep MONGODB_URI

# Restart MongoDB
docker-compose restart mongodb
```

### "User not found"

**Cause**: Wrong identifier or user doesn't exist  
**Solution**:
- Verify phone number format (E.164)
- Check ObjectId is valid
- Query database manually to confirm

### "Permission denied"

**Cause**: Script requires admin privileges  
**Solution**:
```bash
# Run with sudo (if needed)
sudo node scripts/manageUsers.js ...

# Or change file permissions
chmod +x scripts/manageUsers.js
```

---

## Creating New Scripts

### Template

```javascript
#!/usr/bin/env node

/**
 * Script Name
 * 
 * Description of what the script does.
 * 
 * Usage: node scripts/script-name.js <args>
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('../src/models/User');

// Parse arguments
const args = process.argv.slice(2);

const printUsage = () => {
  console.log('Usage: node scripts/script-name.js <arg1> <arg2>');
  process.exit(1);
};

if (args.length < 2) printUsage();

const [arg1, arg2] = args;

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('DB Connection Error:', error);
    process.exit(1);
  }
};

// Main logic
const run = async () => {
  await connectDB();
  
  try {
    // ... your logic here ...
    
    console.log('Success!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
    process.exit(0);
  }
};

// Execute
run();
```

### Adding to package.json

```json
{
  "scripts": {
    "script:name": "node scripts/script-name.js"
  }
}
```

Usage:
```bash
npm run script:name -- arg1 arg2
```

---

## Security Considerations

1. **Never log sensitive data** - Passwords, tokens, etc.
2. **Validate all inputs** - Prevent injection attacks
3. **Use parameterized queries** - Avoid NoSQL injection
4. **Limit script access** - Only authorized users
5. **Audit script usage** - Log who ran what and when
6. **Encrypt sensitive files** - If storing credentials

---

## Automation

### Cron Jobs

```bash
# Run database optimization weekly
0 2 * * 0 cd /app && node scripts/optimizeDb.js >> /var/log/optimize.log 2>&1

# Sync Elasticsearch daily
0 3 * * * cd /app && node scripts/syncElasticsearch.js >> /var/log/sync.log 2>&1
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Seed admin
  run: node scripts/seedAdmin.js
  env:
    SUPER_ADMIN_NAME: ${{ secrets.ADMIN_NAME }}
    SUPER_ADMIN_CONTACT: ${{ secrets.ADMIN_CONTACT }}
    SUPER_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
```

---

## Script Inventory

| Script | Purpose | Frequency | Destructive |
|--------|---------|-----------|-------------|
| `manageUsers.js` | User/admin management | As needed | ✅ Yes |
| `seedAdmin.js` | Create super admin | Once (setup) | ❌ No |
| `create-super-admin.js` | Interactive admin creation | As needed | ❌ No |
| `reset-admin-password.js` | Reset admin password | As needed | ⚠️ Modifies |
| `create-user.js` | Create test user | As needed | ❌ No |
| `optimizeDb.js` | Database optimization | Weekly | ❌ No |
| `syncElasticsearch.js` | Elasticsearch sync | Daily | ⚠️ Full re-index |
| `cleanupLogs.js` | Delete old logs | Monthly | ✅ Yes |
| `sms-simulator.js` | SMS gateway simulator | Dev only | ❌ No |
