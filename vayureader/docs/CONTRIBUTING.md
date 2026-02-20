# Contributing Guide

Guidelines for contributing to VayuReader Backend v2.

## Development Workflow

1.  **Fork & Clone**: Clone the repository to your local machine.
2.  **Branch**: Create a feature branch (`git checkout -b feature/my-feature`).
3.  **Code**: Implement your changes.
4.  **Test**: Run `npm test` to ensure no regressions.
5.  **Lint**: Run `npm run lint` to fix style issues.
6.  **Commit**: Use descriptive commit messages.
7.  **Push**: Push to your fork and submit a Pull Request.

---

## Coding Standards

### Style Guide
We use **ESLint** with **Prettier**.
-   **Indentation**: 4 spaces.
-   **Semicolons**: Always.
-   **Quotes**: Single quotes.

**Run Linter**:
```bash
npm run lint
```

**Fix Auto-fixable Issues**:
```bash
npm run lint:fix
```

### Naming Conventions
-   **Variables/Functions**: camelCase (`getUser`, `isValid`).
-   **Classes/Models**: PascalCase (`User`, `PdfDocument`).
-   **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `JWT_SECRET`).
-   **Filenames**: camelCase (`auth.controller.js`, `user.model.js`).

---

## Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

-   `feat: add user blocking`
-   `fix: resolve null pointer in pdf service`
-   `docs: update API endpoints`
-   `chore: update dependencies`
-   `refactor: optimize search query`

---

## Pull Request Process
1.  **Description**: Clearly explain what the PR does.
2.  **Related Issue**: Link to the issue ID (e.g., `Fixes #123`).
3.  **Screenshots**: If applicable (e.g., Admin Dashboard changes).
4.  **Review**: Wait for at least one code review approval.
5.  **Merge**: Squash and merge is preferred.

---

## Project Structure
-   `src/config` - Configuration & env vars.
-   `src/controllers` - Request handlers.
-   `src/middleware` - Express middleware (Auth, Validation).
-   `src/models` - Mongoose schemas.
-   `src/routes` - API route definitions.
-   `src/services` - Business logic (Pure functions).
-   `scripts` - Operational scripts.
-   `docs` - Documentation.
