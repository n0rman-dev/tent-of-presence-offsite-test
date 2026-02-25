# Task Manager API

RESTful API built with PHP 8.1+ and JWT authentication.

## Requirements

- PHP 8.1+
- Composer
- MySQL / MariaDB

## Setup

```bash
# 1. Install dependencies
composer install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your DB credentials and a strong JWT_SECRET

# 3. Run the migration SQL
mysql -u root -p < database.sql

# 4. Point your web server document root to /public
php -S localhost:8000 -t public
```

## Endpoints

### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Response `201`**
```json
{
  "message": "User registered successfully.",
  "token": "<jwt>",
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", ... }
}
```

---

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Response `200`**
```json
{
  "message": "Login successful.",
  "token": "<jwt>",
  "user": { ... }
}
```

---

### Get Current User *(authenticated)*
```
GET /api/auth/me
Authorization: Bearer <jwt>
```

**Response `200`**
```json
{
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", ... }
}
```

## Error Responses

| Status | Meaning                      |
|--------|------------------------------|
| 400    | Bad request / invalid JSON   |
| 401    | Unauthorized / expired token |
| 404    | Not found                    |
| 409    | Email already registered     |
| 422    | Validation failed            |
| 500    | Server error                 |


