# Testing Guide

Guidelines for testing VayuReader Backend v2.

## Testing Frameworks
-   **Jest**: Unit and Integration testing runner.
-   **Supertest**: HTTP assertions for integration tests.

## Running Tests

### 1. Run All Tests
```bash
npm test
```

### 2. Run with Coverage
```bash
npm run test:coverage
```

### 3. Run Specific File
```bash
npx jest src/tests/auth.test.js
```

### 4. Watch Mode
```bash
npm run test:watch
```

---

## Test Storage
Tests are located in `src/tests/`.

## Writing Tests

### Unit Tests
Focus on testing individual functions in isolation (e.g., Services).
-   Mock dependencies (e.g., database, Redis).
-   Test edge cases.

**Example**:
```javascript
describe('OTP Service', () => {
  it('should generate valid 6-digit OTP', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^[0-9]{6}$/);
  });
});
```

### Integration Tests
Focus on API endpoints.
-   Use a **test database**.
-   Test the full flow (Request -> Controller -> Service -> DB -> Response).
-   Setup/Teardown: Connect/disconnect DB before/after tests.

**Example**:
```javascript
const request = require('supertest');
const app = require('../app');

describe('POST /api/auth/login', () => {
  it('should return 400 for invalid phone', async () => {
    const res = await request(app)
      .post('/api/auth/login/request-otp')
      .send({ phone_number: 'invalid' });
    expect(res.statusCode).toEqual(400);
  });
});
```

---

## Test Database
Use `cross-env` to set `NODE_ENV=test`.
Ensure `MONGODB_URI` in `.env.test` points to a separate database (e.g., `vayureader_test`) to avoid wiping development data.

## Continuous Integration
Tests are automatically run in the CI pipeline (e.g., GitHub Actions) on every Pull Request.
