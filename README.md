# Circlo – The Community Sharing Network

[![Node.js](https://img.shields.io/badge/Node.js-v16+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21+-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> **Share More. Waste Less. Build Community.**

**Circlo** is a modern community-based resource-sharing web platform. It connects neighbors, students, and community members to lend and borrow everyday items—such as tools, electronics, board games, appliances, and books—instead of buying items that are rarely used. Circlo promotes circular economy practices, sustainable consumption, and community collaboration.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema & Migration](#database-schema--migration)
- [Prerequisites](#prerequisites)
- [Quick Start & Installation](#quick-start--installation)
  - [1. Clone Repository](#1-clone-or-download)
  - [2. Set Up the Database](#2-set-up-the-database)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Install Dependencies](#4-install-backend-dependencies)
  - [5. Run the Application](#5-run-the-application)
- [Environment Variables](#environment-variables)
- [REST API Reference](#rest-api-reference)
- [How to Use Circlo](#how-to-use-circlo)
- [Deployment on Vercel](#deployment-on-vercel)
- [Architecture & Security](#architecture--security)
- [License](#license)

---

## Features

### 📦 Item Sharing & Media Management
- **List Items with Images**: Publish items with names, categories, descriptions, and optional photo uploads. Supports JPG, PNG, and WebP up to 5MB.
- **Smart Image Storage**: Multi-tier storage pipeline supports **Cloudinary CDN** for persistent cloud hosting in serverless environments, local disk storage for development, and Base64 Data URI fallback.
- **Instant Search & Category Filtering**: Browse available community items with live search by keyword and category filters (Tools, Electronics, Books, Sports, Kitchen, etc.).

### 🤝 Lending Lifecycle & Concurrency Control
- **Borrow Requests**: Send borrow requests for any available item in the community.
- **Manage Requests**: Item owners can review incoming requests and approve or reject them.
- **Race Condition Protection**: Database transactions with row-level locks (`SELECT ... FOR UPDATE`) ensure an item cannot be concurrently claimed by multiple users.
- **Automatic Request Approval**: Background workers check pending borrow requests every 30 seconds. Unanswered requests older than 15 minutes are automatically approved if the item is still available.
- **Borrowed Items & Return Tracking**: Borrowers can view active loans and return items to immediately restore their availability in the community pool.

### ⏰ Return Reminders & Notifications
- **Due Dates for Borrowed Items**: Automatic assignment of return deadlines upon approval (default: 7 days, configurable via `DEFAULT_BORROW_DAYS`).
- **Overdue Detection**: Automated background tasks and Vercel Cron monitor overdue loans and trigger notifications for both borrower and item owner.
- **In-App Notification Center**: Real-time notification drawer with unread badges, overdue warnings, and single-click "Mark as Read" or "Mark All as Read".

### 🔒 User Security & Peer Trust
- **Bcrypt Password Security**: Safe password storage using `bcryptjs` (salt rounds: 10), minimum length constraints, and normalized email checks.
- **Peer Ratings & Reviews**: Community feedback system with 1-to-5 star ratings and written reviews to maintain trust.
- **Persistent Data**: User session and community data are safely maintained in MySQL.

### 📱 Responsive & Accessible UI
- **Single Page Application (SPA)**: Powered by Vue 3 for reactive state updates without heavy build-tooling dependencies.
- **Mobile-First 3-Dot Navigation**: Accessible slide-out navigation with aria attributes, responsive glassmorphism navbar, and dynamic notification counter badges.
- **SEO & Canonical URLs**: Pre-configured `robots.txt`, open-graph metadata, meta descriptions, and canonical URL redirects.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, Modern Vanilla CSS3, Vue.js 3 (CDN), JavaScript (ES6+) |
| **Backend** | Node.js, Express.js 4.x, REST API |
| **Database** | MySQL 8.x / MariaDB, `mysql2/promise` connection pooling |
| **Security & Utilities** | `bcryptjs` (password hashing), `multer` (file handling), `cors` |
| **Cloud Storage** | Cloudinary SDK (image uploads) |
| **Deployment** | Vercel Serverless Functions (`@vercel/node`), Vercel Static, Vercel Cron |

---

## Project Structure

```text
Circlo/
├── backend/
│   ├── routes/
│   │   ├── items.js             # Item browsing, filtering, and image upload
│   │   ├── notifications.js     # Overdue checking and notification routes
│   │   ├── ratings.js           # Member ratings and community reviews
│   │   ├── requests.js          # Borrow request creation, approval, and returns
│   │   └── users.js             # User registration and bcrypt authentication
│   ├── uploads/                 # Local directory for uploaded item photos (fallback)
│   ├── db.js                    # MySQL connection pool with environment configuration
│   ├── package.json             # Backend dependencies and run scripts
│   ├── server.js                # Express app, local server listen, background tasks
│   └── storage.js               # Multer middleware & Cloudinary storage handler
├── database/
│   ├── circlo.sql               # Base database schema (tables, foreign keys, constraints)
│   ├── migration.sql            # Migration script for existing databases (adds due dates & notifications)
│   └── seed.sql                 # Sample demo data (users, items, categories)
├── frontend/
│   ├── app.js                   # Vue 3 application logic, state, and API client
│   ├── index.html               # Semantic HTML5 UI, navigation, and modals
│   ├── robots.txt               # Search engine crawler permissions
│   └── style.css                # Responsive custom stylesheet & design system
├── vercel.json                  # Vercel deployment routes, rewrites, and cron jobs
└── README.md                    # Project documentation
```

---

## Database Schema & Migration

The Circlo relational schema consists of 5 interconnected tables:

1. **`users`**: User profiles (`id`, `name`, `email`, hashed `password`).
2. **`items`**: Catalog of items (`id`, `user_id`, `name`, `category`, `description`, `status`, `image_url`).
3. **`borrow_requests`**: Loan transactions (`id`, `item_id`, `borrower_id`, `status`, `created_at`, `approved_at`, `due_at`).
4. **`ratings`**: Feedback and 1-5 star ratings (`id`, `reviewer_id`, `user_id`, `item_id`, `rating`, `comment`).
5. **`notifications`**: In-app notifications and alerts (`id`, `user_id`, `request_id`, `type`, `message`, `is_read`, `created_at`).

### Initializing the Database
- For a **new setup**, import `database/circlo.sql`.
- If you have an **existing database** from earlier versions, run `database/migration.sql` to add the `image_url`, `approved_at`, `due_at` columns, and the `notifications` table without losing existing records.
- Optionally import `database/seed.sql` for sample testing accounts and items.

---

## Prerequisites

Before running the application, make sure you have:

- [Node.js](https://nodejs.org/) (v16 or higher) and `npm`
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) (v8.x) or [XAMPP](https://www.apachefriends.org/)
- A modern web browser (Chrome, Edge, Firefox, Safari)
- Optional: A free [Cloudinary](https://cloudinary.com/) account for cloud-hosted images

---

## Quick Start & Installation

### 1. Clone or Download

```bash
git clone https://github.com/ArchiGajera/Circlo.git
cd Circlo
```

### 2. Set Up the Database

#### Using XAMPP / phpMyAdmin:
1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open `http://localhost/phpmyadmin` in your browser.
3. Click **Import** and select `database/circlo.sql`.
4. (Optional) Import `database/seed.sql` to populate sample data.

#### Using MySQL Command Line:
```bash
mysql -u root -p < database/circlo.sql
mysql -u root -p circlo < database/seed.sql   # Optional seed data
```

### 3. Configure Environment Variables

For default local installations using XAMPP (host: `localhost`, user: `root`, no password, database: `circlo`), **no configuration is required**—the server defaults to these settings automatically.

To customize your database connection, default loan period, or Cloudinary credentials, set environment variables in your terminal or create a `.env` file in `backend/`:

```env
# Database Settings
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=circlo

# Application Settings
PORT=5000
DEFAULT_BORROW_DAYS=7

# Cloud Image Storage (Optional - Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Install Backend Dependencies

Navigate to the `backend` folder and install dependencies:

```bash
cd backend
npm install
```

### 5. Run the Application

Start the server:

```bash
npm start
# or
node server.js
```

Open your browser and navigate to:

👉 **http://localhost:5000**

The Express backend serves the Vue frontend and the REST API together on port 5000.

---

## Environment Variables

| Variable | Description | Default (Local) |
|---|---|---|
| `DB_HOST` | MySQL hostname or IP | `localhost` |
| `DB_PORT` | MySQL connection port | `3306` |
| `DB_USER` | MySQL database username | `root` |
| `DB_PASSWORD` | MySQL user password | `""` (empty) |
| `DB_NAME` | Database name | `circlo` |
| `PORT` | Local web server listening port | `5000` |
| `DEFAULT_BORROW_DAYS` | Default duration (in days) before an approved item is due | `7` |
| `NODE_ENV` | Application environment (`development` / `production`) | `development` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name (for image uploads) | *None (Local fallback)* |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | *None* |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | *None* |
| `CLOUDINARY_URL` | Cloudinary connection URI string alternative | *None* |

---

## REST API Reference

### 👤 Authentication & Users

| Method | Endpoint | Description | Payload / Parameters |
|---|---|---|---|
| `POST` | `/api/users/register` | Register a new user | `{ "name": "...", "email": "...", "password": "..." }` |
| `POST` | `/api/users/login` | Log in an existing user | `{ "email": "...", "password": "..." }` |
| `GET` | `/api/users` | List registered members (public info) | *None* |

### 📦 Items Catalog

| Method | Endpoint | Description | Payload / Parameters |
|---|---|---|---|
| `GET` | `/api/items` | Retrieve shared items with owner info | Query params: `?search=...&category=...&status=...` |
| `POST` | `/api/items` | Publish an item listing with optional photo | `multipart/form-data`: `user_id`, `name`, `category`, `description`, `image` |

### 🔄 Borrow Requests & Loans

| Method | Endpoint | Description | Payload / Parameters |
|---|---|---|---|
| `GET` | `/api/requests` | List all borrow requests with due dates & overdue status | *None* |
| `POST` | `/api/requests` | Submit a new request to borrow an item | `{ "item_id": 1, "borrower_id": 2 }` |
| `PUT` | `/api/requests/:id` | Approve or reject a pending request | `{ "status": "Approved" }` or `{ "status": "Rejected" }` |
| `PUT` | `/api/requests/:id/return` | Mark an approved borrowing as returned | *None* |

### 🔔 Notifications & Reminders

| Method | Endpoint | Description | Payload / Parameters |
|---|---|---|---|
| `GET` | `/api/notifications` | Fetch notifications for a user | Query params: `?user_id=1` |
| `PUT` | `/api/notifications/:id/read` | Mark a single notification as read | `params.id` |
| `PUT` | `/api/notifications/read-all` | Mark all notifications as read for a user | `{ "user_id": 1 }` |
| `GET` | `/api/notifications/check-overdue` | Trigger overdue checks and notification creation | *None* |

### 🌟 Ratings & Reviews

| Method | Endpoint | Description | Payload / Parameters |
|---|---|---|---|
| `GET` | `/api/ratings` | Retrieve community ratings and reviews | *None* |
| `POST` | `/api/ratings` | Submit a peer review and 1-5 star score | `{ "reviewer_id": 1, "user_id": 2, "item_id": 3, "rating": 5, "comment": "..." }` |

### 🩺 Health & Maintenance

| Method | Endpoint | Description | Payload / Parameters |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint | *None* |
| `GET` | `/api/cron/check-overdue` | Vercel Cron endpoint to process overdue items | *None* |

---

## How to Use Circlo

1. **Sign Up / Log In**: Create an account or log in with your email and password.
2. **Share an Item**: Click **Share Item**, upload an image of the item, select a category, and submit the listing.
3. **Borrow an Item**: Browse the catalog, filter by category or search by keyword, and click **Request to Borrow**.
4. **Approve Incoming Requests**: If you are an owner, open **Manage Requests** to accept or decline requests.
5. **Automatic Loan Approval**: If an owner does not respond within 15 minutes, eligible requests are automatically approved by the system.
6. **Track Due Dates**: Check **Borrowed Items** to see the return deadline and any active overdue alerts.
7. **Return Items**: When finished, click **Return Item** to mark the item available for someone else.
8. **Leave Feedback**: Visit the **Ratings** tab to rate the lender and share your experience with the community.

---

## Deployment on Vercel

Circlo is configured for seamless deployment on [Vercel](https://vercel.com/) via `vercel.json`.

### 1. Database Provisioning
Serverless platforms require an external cloud-hosted MySQL database. You can use free tiers from:
- [Aiven for MySQL](https://aiven.io/)
- [TiDB Serverless](https://www.pingcap.com/tidb-serverless/)
- [Railway](https://railway.app/)
- [PlanetScale](https://planetscale.com/)

Import `database/circlo.sql` into your cloud database.

### 2. Configure Vercel Project
1. Push your repository to GitHub.
2. Import the repository in your [Vercel Dashboard](https://vercel.com/dashboard).
3. Under **Project Settings > Environment Variables**, add:
   - `DB_HOST`
   - `DB_PORT` (e.g. `3306`)
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `NODE_ENV`: `production`
   - `DEFAULT_BORROW_DAYS`: `7`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
4. Deploy! Vercel automatically routes `/api/*` to serverless Node handlers and serves the frontend statically.
5. Vercel Cron automatically invokes `/api/cron/check-overdue` every hour (`0 * * * *`).

---

## Architecture & Security

- **Password Security**: Passwords are never stored in plain text. `bcryptjs` is applied with 10 salt rounds before database insertion.
- **Transactional Consistency**: Approving a request or returning an item executes inside an explicit database transaction (`beginTransaction`, `commit`, `rollback`) with pessimistic locking (`FOR UPDATE`) to prevent double-lending.
- **SQL Injection Prevention**: All queries use parameterized statements (`?` placeholders) executed via `mysql2/promise`.
- **Upload Hardening**: Uploaded files are validated against allowed MIME types (`image/jpeg`, `image/png`, `image/webp`) and capped at 5 MB. In serverless environments, images are streamed directly to Cloudinary or base64-encoded to prevent read-only filesystem errors.

---

## License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

---

<p align="center">
  <b>Circlo</b> — <i>Share More. Waste Less. Build Community.</i>
</p>
