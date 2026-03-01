# Architectural Decisions & Trade-offs

## Overview

This document outlines the key decisions made when building the Task Manager API and Dashboard, the trade-offs considered, security measures implemented, and what would be improved given more time.

---

## Architectural Decisions

### 1. PHP with No Framework

The API was built in vanilla PHP 8.1+ without a framework like Laravel or Symfony.

**Why:** For a focused REST API with a small set of endpoints, a full framework adds significant overhead — both in setup time and bundle size. A lightweight custom router in `index.php` is easier to reason about and has zero unnecessary dependencies.

**Trade-off:** No framework means no built-in ORM, no validation library, no middleware pipeline, and no scaffolding. All of these had to be implemented manually, which works fine at this scale but would become painful as the project grows.

---

### 2. JWT for Authentication (Stateless)

Authentication is handled via JSON Web Tokens using the `firebase/php-jwt` library.

**Why:** JWTs are stateless, the server does not need to store session data or hit the database on every authenticated request. The token is self-contained and carries the user ID (`sub` claim), issued-at (`iat`), and expiry (`exp`).

**Trade-off:** Stateless tokens cannot be invalidated before they expire. If a user logs out or their account is compromised, the token remains valid until expiry. A token blacklist or short expiry window is needed to mitigate this.

---

### 3. PDO with Prepared Statements

All database queries use PHP's PDO with prepared statements rather than raw string interpolation.

**Why:** Prepared statements are the standard defence against SQL injection. PDO also provides a consistent interface regardless of the underlying database engine, making a potential switch from MariaDB to PostgreSQL less painful.

**Trade-off:** PDO is more verbose than a query builder or ORM. Writing raw SQL for every query is manageable now but becomes harder to maintain as schema complexity grows.

---

### 4. Separation of `public/` as Document Root

The web server document root is pointed at `public/` with all application code living in `src/`.

**Why:** This ensures that source files, configuration, `.env`, and `vendor/` are never directly accessible via HTTP. Only `index.php` and static assets in `public/` are exposed to the web.

**Trade-off:** Requires correct web server configuration (`.htaccess` for Apache or a `location` block for Nginx). A misconfigured server could expose the entire project root.

---

### 5. Next.js for the Dashboard

The frontend was built with Next.js rather than plain React or another framework.

**Why:** Next.js provides file-based routing, server-side rendering options, and a mature ecosystem out of the box. It pairs well with a separate API backend and handles routing, bundling, and TypeScript configuration with minimal setup.

**Trade-off:** Next.js is heavier than a plain Vite + React setup for a simple dashboard. The additional complexity of the Next.js build pipeline adds friction in deployment.

---

### 6. MariaDB with ENUM Columns

Status and priority fields use MariaDB's native `ENUM` type rather than a separate lookup table or a `VARCHAR` with a check constraint.

**Why:** ENUMs enforce valid values at the database level with no extra joins. They are readable, compact, and well-supported in MariaDB.

**Trade-off:** ENUMs are painful to alter — adding or removing a value requires an `ALTER TABLE` which can lock the table on large datasets. A lookup table or application-level validation would be more flexible long term.

---

## Security Considerations Implemented

### Password Hashing
Passwords are hashed using PHP's `password_hash()` with the `PASSWORD_BCRYPT` algorithm before being stored. Plain-text passwords are never saved or logged. Verification uses `password_verify()` which is constant-time and resistant to timing attacks.

### SQL Injection Prevention
All database queries use PDO prepared statements with bound parameters. No user input is ever interpolated directly into a SQL string.

### JWT Signature Validation
Every authenticated request runs through `AuthMiddleware` which decodes and validates the JWT signature against the server-side secret. Expired and tampered tokens are rejected with a `401` response.

### Sensitive Files Protected
The `.env` file and `vendor/` directory sit outside the `public/` document root and are never accessible via HTTP.

### Least Privilege DB User
The database user `task_manager_user` is granted only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on the `task_manager` schema. It has no `DROP`, `CREATE`, `ALTER`, or `GRANT` privileges, limiting the blast radius of a potential SQL injection or credential leak.

---

## What Would Be Improved With More Time

### 1. Refresh Tokens
The current implementation issues a single JWT that expires after 1 hour with no way to renew it silently. A refresh token flow (short-lived access token + long-lived refresh token stored in an `HttpOnly` cookie) would give a much better user experience without sacrificing security.

### 2. Token Blacklist / Logout
There is currently no logout endpoint because JWTs are stateless. Adding a `personal_access_tokens` table to track issued tokens would allow proper logout and token revocation.

### 3. Input Validation Layer
Validation logic is currently inline inside each controller method. A dedicated `Validator` class with reusable rules (required, min length, email format, etc.) would make controllers cleaner and validation consistent across all endpoints.

### 4. Rate Limiting
There is no rate limiting on the auth endpoints. A brute-force attack on `/api/auth/login` is possible. A simple Redis-backed rate limiter or a middleware that tracks attempts per IP would address this.

### 5. Proper Error Logging
Errors are currently returned directly to the client. In production, internal errors should be logged to a file or service (e.g. Sentry) and the client should only receive a generic `500` message with no stack trace or internal details.

### 6. HTTPS Enforcement
The API currently runs over HTTP. In production, all traffic should be served over HTTPS with a valid TLS certificate and HTTP requests redirected automatically.

### 7. Database Migrations Runner
SQL migrations are currently applied manually. A simple migration runner that tracks which migrations have been applied would make schema changes safe and repeatable across environments.

### 8. API Versioning
All routes currently live under `/api/`. Prefixing with a version (e.g. `/api/v1/`) from the start makes it possible to introduce breaking changes in a new version without disrupting existing clients.

### 9. Test Coverage
There are no automated tests. Unit tests for the model layer and integration tests for each endpoint (using PHPUnit and a test database) would catch regressions early and give confidence when making changes.
