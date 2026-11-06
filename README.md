# 🏢 Hostel Management System (HostelMS)

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-v5.3.0-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![JavaScript](https://img.shields.io/badge/ES6%2B-Vanilla%20JS-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A full-stack, enterprise-grade **Hostel Management System** built with Node.js, Express 5, MySQL, and modern Vanilla JavaScript. Designed for colleges, universities, and residential hostels to streamline student registration, room capacity tracking, and bed allocations in real-time.

---

## 📸 Overview & Highlights

- **Executive Overview Dashboard**: Real-time KPI metric cards (Total Students, Total Rooms, Available Rooms, Active Allocations), a dynamic hostel capacity & bed utilization gauge, and live activity feeds.
- **Student Directory**: Register student profiles with roll number uniqueness protection, academic year, department, contact info, gradient avatar badges, and search/filtering.
- **Room & Bed Inventory**: Dual-view interface with **Tabular Records** and an **Interactive Visual Grid** displaying individual bed slots (occupied vs. free) and current occupants.
- **Room Allocations & Checkouts**: Fast room assignment workflow ensuring only unallocated students and vacant rooms can be paired. Includes a one-click **"Vacate Room"** action that automatically recalculates room capacity and frees up beds.
- **Enterprise Design System**: Modern dark slate sidebar (`#0f172a`), topbar breadcrumbs, live MySQL health indicator, stacked toast notifications, custom confirmation modals, and one-click **CSV data exports**.

---

## 🚀 Features

### 👨‍🎓 Student Management
- **Directory & Profiles**: Manage student name, roll number, department, year, contact phone, email, and gender.
- **Avatar Badges**: Dynamically generated color-coordinated avatar badges with resident initials.
- **Smart Filtering**: Instant multi-attribute search across names, roll numbers, departments, and room assignments.
- **Safety Validations**: Duplicate roll number prevention (`ER_DUP_ENTRY`) and protection against deleting students with active room allocations.

### 🛏️ Room & Bed Inventory
- **Capacity Tracking**: Monitor capacity, current occupants, and available beds dynamically.
- **Interactive Visual Grid**: Toggle between standard tables and visual cards showing bed icons (`🛏️`), room categories (Single, Double, Triple, Deluxe), floor tags, and occupant names.
- **Automatic Status Management**: Automatically switches room status to `Full` when capacity is reached and reverts back to `Available` upon checkout.
- **Maintenance Lock**: Flag rooms undergoing maintenance to prevent new allocations.

### 📋 Allocation Workflow
- **Validated Allocation**: Select candidate students (only unallocated residents shown) and rooms (only rooms with open capacity shown).
- **One-Click Check-out / Vacate**: Complete an allocation with a single click; bed availability and dashboard analytics update instantly.
- **Historical Ledger**: Filter between `Active` residencies and `Completed` historical stays.

### 📊 System Utilities
- **One-Click CSV Export**: Download student lists, room inventories, and allocation reports as `.csv` files.
- **In-App Toast Engine**: Non-blocking toast notifications with progress timers replacing intrusive browser alerts.
- **Custom Confirmation Modals**: Built-in modal dialogs for safe, confirmed deletion and vacating workflows.

---

## 🛠️ Tech Stack

- **Backend**: [Node.js](https://nodejs.org/) & [Express 5](https://expressjs.com/) (RESTful APIs, static file hosting)
- **Database**: [MySQL](https://www.mysql.com/) via `mysql2` connection driver
- **Frontend**: Semantic HTML5, CSS3 Custom Properties (Design System), Vanilla JavaScript (ES6+), [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) & [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) fonts
- **Icons**: Responsive Inline SVG Icons (Lucide/Feather inspired)

---

## 🗄️ Database Schema (`hms`)

The system operates on a relational MySQL database named `hms`:

```sql
CREATE DATABASE IF NOT EXISTS hms;
USE hms;

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    roll_number VARCHAR(30) NOT NULL UNIQUE,
    department VARCHAR(50),
    year INT,
    phone VARCHAR(15),
    email VARCHAR(100),
    gender VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    room_type VARCHAR(30),
    capacity INT NOT NULL,
    floor INT,
    status ENUM('Available', 'Full', 'Maintenance') DEFAULT 'Available'
);

-- 3. Allocations Table
CREATE TABLE IF NOT EXISTS allocations (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    allocated_on DATE NOT NULL,
    status ENUM('Active', 'Completed') DEFAULT 'Active',
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);
```

---

## 📦 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **MySQL Server** (v8.0 or higher) running locally or remotely

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/sirrianand-pixel/hostelms.git
cd hostelms
npm install
```

### 3. Database Configuration
Ensure MySQL is running, create the `hms` database using the SQL script above, and configure credentials in [`db/connection.js`](db/connection.js):

```javascript
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'YOUR_MYSQL_PASSWORD', // update with your password
    database: 'hms'
});
```

### 4. Running the Application
Start the server in production mode:
```bash
npm start
```

Or run with automatic reload during development:
```bash
npm run dev
```

Once started, open your web browser and navigate to:
```
http://localhost:3000
```

---

## 🌐 RESTful API Endpoints

### Student Endpoints (`/api/students`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/students` | Get all registered students with room status |
| `GET` | `/api/students/unallocated` | Get only students without active room allocations |
| `GET` | `/api/students/:id` | Fetch single student record |
| `POST` | `/api/students` | Register a new student |
| `PUT` | `/api/students/:id` | Update an existing student |
| `DELETE` | `/api/students/:id` | Delete student (blocked if room is actively allocated) |

### Room Endpoints (`/api/rooms`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/rooms` | Get all rooms with computed occupancy and occupant names |
| `GET` | `/api/rooms/available` | Get rooms with free beds and not in maintenance |
| `GET` | `/api/rooms/:id` | Fetch single room details |
| `POST` | `/api/rooms` | Create a new room configuration |
| `PUT` | `/api/rooms/:id` | Update room details |
| `DELETE` | `/api/rooms/:id` | Delete room (blocked if occupied) |

### Allocation Endpoints (`/api/allocations`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/allocations` | List allocations (supports `?status=Active` or `?status=Completed`) |
| `GET` | `/api/allocations/stats` | Real-time aggregate dashboard metrics |
| `POST` | `/api/allocations` | Allocate student to room & update room capacity |
| `PUT` | `/api/allocations/:id/vacate` | Vacate student, mark Completed, and release bed |
| `DELETE` | `/api/allocations/:id` | Remove allocation record permanently |

---

## 📂 Project Structure

```
hostelms/
├── db/
│   └── connection.js          # MySQL connection pool and configuration
├── public/
│   ├── css/
│   │   └── style.css          # Design system, theme variables, and components
│   ├── js/
│   │   ├── app.js             # UI core: toasts, confirm modals, CSV export
│   │   ├── students.js        # Student directory controller
│   │   ├── rooms.js           # Room inventory & visual grid controller
│   │   └── allocation.js      # Allocation & checkout ledger controller
│   ├── index.html             # Executive Overview Dashboard
│   ├── students.html          # Student Directory Page
│   ├── rooms.html             # Room & Bed Inventory Page
│   └── allocation.html        # Room Allocations Page
├── routes/
│   ├── studentRoutes.js       # Student CRUD API routes
│   ├── roomRoutes.js          # Room inventory API routes
│   └── allocationRoutes.js    # Room allocation & stats API routes
├── package.json               # Dependencies and npm scripts
├── server.js                  # Express server entry point
└── README.md                  # Project documentation
```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
