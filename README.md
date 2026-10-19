# Circlo – The Community Sharing Network

Circlo is a community-based item-sharing platform that allows users to share items, request items from other members, manage borrowing requests, and provide ratings and reviews. It encourages resource reuse and collaboration within a community.

## Features

- **User Registration and Login:** Create an account and log in to Circlo.
- **Share Items:** Publish items with a name, category, and description.
- **Browse Items:** View community-shared items and search/filter the available listings.
- **Borrow Requests:** Request to borrow items shared by other users.
- **Manage Requests:** Item owners can approve or reject incoming requests.
- **Automatic Approval:** Pending borrow requests can be automatically approved after 15 minutes if the item is still available and the request has not been rejected.
- **Borrowed Items:** View items whose borrowing requests have been approved.
- **Return Items:** Mark borrowed items as returned.
- **Ratings and Reviews:** Submit ratings and feedback for item owners.
- **Persistent Data:** Items and requests remain saved in the database when a user logs out.
- **Responsive Interface:** Access the application through a responsive web interface.

## Technologies Used

**Frontend**
- HTML5
- CSS3
- Vue.js 3
- JavaScript

**Backend**
- Node.js
- Express.js
- REST API

**Database**
- MySQL
- phpMyAdmin (for database management)

## Project Structure

```text
Circlo/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   └── routes/
│       ├── users.js
│       ├── items.js
│       ├── requests.js
│       └── ratings.js
├── database/
│   ├── circlo.sql
│   └── seed.sql
└── README.md
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- MySQL Server or XAMPP
- A web browser
- A code editor such as Visual Studio Code

## Installation and Setup

### 1. Clone or Download the Project

Download the Circlo project and open its root folder in Visual Studio Code.

### 2. Set Up the Database

1. Start MySQL using XAMPP or your installed MySQL server.
2. Open phpMyAdmin at `http://localhost/phpmyadmin`, or use the MySQL command line.
3. Import `database/circlo.sql`.
4. If `seed.sql` contains sample data you want to use, import it after creating the database.

The database name is `circlo`.

### 3. Configure the Database Connection

Open `backend/db.js` and update the connection settings with your MySQL credentials.

```javascript
const mysql=require('mysql2/promise');

const db=mysql.createPool({
    host:'localhost',
    user:'root',
    password:'YOUR_MYSQL_PASSWORD',
    database:'circlo'
});

module.exports=db;
```

Replace `YOUR_MYSQL_PASSWORD` with your actual MySQL password. If your local MySQL account has no password, use an empty string.

### 4. Install Backend Dependencies

Open a terminal in the project root and run:

```bash
cd backend
npm install
```

### 5. Start the Application

From the `backend` folder, run:

```bash
node server.js
```

If the server starts successfully, open:

**http://localhost:5000**

The backend serves the frontend and provides the API routes from the same server.

> Keep the terminal running while using Circlo. MySQL must also remain running.

## API Routes

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/users/register` | Register a user |
| POST | `/api/users/login` | Log in a user |
| GET | `/api/items` | Retrieve shared items |
| POST | `/api/items` | Publish an item |
| GET | `/api/requests` | Retrieve borrow requests |
| POST | `/api/requests` | Create a borrow request |
| PUT | `/api/requests/:id` | Approve or reject a request |
| PUT | `/api/requests/:id/return` | Return a borrowed item |
| GET | `/api/ratings` | Retrieve community ratings |
| POST | `/api/ratings` | Submit a rating and review |

## How to Use Circlo

1. Register a new account or log in.
2. Browse items shared by community members.
3. Request an available item you want to borrow.
4. View your requests in **My Requests**.
5. If you own shared items, open **Manage Requests** to approve or reject requests.
6. Open **Borrowed Items** to view approved borrowings and return items when finished.
7. Visit **Ratings** to rate an eligible item owner and leave feedback.
8. Log out when you finish. Logging out does not delete the saved database records.

## Automatic Borrow Request Approval

Circlo checks pending requests periodically. A request that has remained pending for at least 15 minutes can be automatically approved if the item is still available. The backend must be running for this automatic process to execute.

## Future Enhancements

- Secure authentication and role-based authorization
- Password hashing and improved input validation
- Notifications for request status changes
- Borrowing history and due dates
- Improved rating validation and duplicate-review prevention
- Deployment to a production hosting environment

## Project Purpose

Circlo aims to promote sharing, reuse, and community collaboration by making it easier for people to lend and borrow useful items rather than purchasing every item individually.

---

**Circlo – Share More. Waste Less. Build Community.**
