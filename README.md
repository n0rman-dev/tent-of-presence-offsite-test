# Task Manager — Manual Setup Guide

## Requirements

Make sure you have these installed:
- PHP 8.1+
- Composer
- Node.js 20+
- npm
- MySQL / MariaDB
- A web server (Apache or PHP's built-in server for local dev)

Check versions:
```bash
php --version
composer --version
node --version
npm --version
mysql --version
```

---

## 1. Database Setup

Log in as root:
```bash
sudo mysql -u root
```

Run the queries in `task-manager-api/database.sql`
```sql
SOURCE task-manager-api/database.sql
```


---

## 2. PHP API Setup

Navigate to the API folder:
```bash
cd task-manager-api
```

Install dependencies:
```bash
composer install
```

Create and configure `.env`:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Application
APP_ENV=development
APP_URL=http://localhost

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=task_manager
DB_USER=task_manager_user
DB_PASS=strong_password

# JWT
JWT_SECRET=your-super-secret
JWT_EXPIRY=3600
```

Start the PHP development server:
```bash
php -S localhost:8000 -t public
```

Test it's working — open Postman:
```
http://localhost:8000/api/auth/register
```

---

## 3. Next.js Dashboard Setup

Open a new terminal tab, navigate to the dashboard:
```bash
cd task-dashboard
```

Install dependencies:
```bash
npm install
```

If you did not use localhost:8000, edit `task-dashboard/utils/api.ts`:
```env
baseURL: 'http://localhost:8000', // replace with your PHP backend
```

Start the development server:
```bash
npm run dev
```

Open in browser:
```
http://localhost:3000
```

---

## 4. Running the project day to day

Every time you want to run the project, you need two terminals open:

**Terminal 1 — API:**
```bash
cd task-manager-api
php -S localhost:8000 -t public
```

**Terminal 2 — Dashboard:**
```bash
cd task-dashboard
npm run dev
```

Then open `http://localhost:3000/auth/register` in your browser.

---

## Troubleshooting

**API returns database error:**
- Check your `.env` credentials match the DB user you created
- Make sure MariaDB is running: `sudo service mysql start`

**composer install fails:**
- Make sure PHP 8.1+ is installed: `php --version`
- Make sure Composer is installed: `composer --version`

**npm install fails:**
- Make sure Node 20+ is installed: `node --version`

**Port already in use:**
```bash
# Kill whatever is on port 8000
sudo fuser -k 8000/tcp

# Kill whatever is on port 3000
sudo fuser -k 3000/tcp
```
