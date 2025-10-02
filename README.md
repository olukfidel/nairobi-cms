
Nairobi County Complaint Management System (CMS)
A self-contained, full-stack web application designed for the citizens of Nairobi County to file complaints and for administrators to manage them. The entire system is built to run seamlessly within a Node.js environment, specifically optimized for Termux on Android devices.
(Screenshot of the Admin Dashboard showing all complaints)
Table of Contents
 * Features
 * Tech Stack
 * Prerequisites
 * Installation & Setup
 * How to Use
   * Admin Credentials
 * File Structure
 * API Endpoints
 * License
Features
 * Two User Roles:
   * Citizen: Can register, log in, submit complaints (with an optional image), and view their personal complaint history.
   * Admin: Can log in, view all complaints from all users, and update the status of each complaint.
 * Secure Authentication: User registration and login with password hashing (bcrypt) and session management (express-session).
 * File Uploads: Citizens can attach an image to their complaint for better context.
 * Responsive UI: A clean, mobile-first design built into a single HTML file, ensuring a great user experience on any device.
 * Persistent Storage: Uses a self-contained SQLite database file (nairobi_complaints.db) for all data.
 * Zero Dependencies: Once Node.js and the npm packages are installed, the application runs without needing any external database servers or services.
🔧 Tech Stack
 * Backend: Node.js, Express.js
 * Frontend: HTML5, CSS3, Vanilla JavaScript (Single Page Application architecture)
 * Database: SQLite3
 * Authentication: bcrypt for password hashing, express-session for session management
 * File Handling: express-fileupload
 * Runtime Environment: Designed for Termux on Android
Prerequisites
Before you begin, ensure you have the following installed:
 * Node.js (v16 or newer)
 * npm (comes with Node.js)
 * Termux (if running on Android)
 * A modern web browser
🚀 Installation & Setup
Follow these steps to get the application running:
 * Clone the repository:
   git clone <your-repository-url>
cd nairobi-cms

 * Install dependencies:
   This command reads the package.json file and installs all the required libraries (like Express, SQLite3, etc.) into the node_modules directory.
   npm install

 * Start the server:
   This command executes the start script defined in package.json, which runs node server.js.
   npm start

 * Access the application:
   The server will start, and you will see a confirmation message in the console.
   ✅ Server is running on http://localhost:8080

   Open your web browser and navigate to http://localhost:8080.
How to Use
Citizen User
 * Navigate to the application.
 * Click on Login / Register.
 * Fill out the Register form and click the "Register" button.
 * Log in with your new credentials.
 * You will be redirected to your personal dashboard where you can:
   * Fill out the form to submit a new complaint.
   * View the status and history of your past complaints.
Admin User
The admin user is automatically created the first time the server starts.
 * Navigate to the application and click Login / Register.
 * Log in using the predefined admin credentials.
 * You will be redirected to the Admin Dashboard, which displays a table of all complaints from every user.
 * From this table, you can directly change a complaint's status using the dropdown menu in the Status column.
🔑 Admin Credentials
 * Email: admin@nrb.gov
 * Password: AdminPassword123
File Structure
The project is structured to be simple and self-contained:
nairobi-cms/
│
├── node_modules/       # All installed npm packages
├── uploads/            # Directory where complaint images are stored
│
├── database.js         # Handles SQLite database connection and table creation
├── index.html          # The single file containing all frontend HTML, CSS, and JS
├── nairobi_complaints.db # The SQLite database file (created on first run)
├── package.json        # Project metadata and dependencies
├── package-lock.json   # Records the exact versions of dependencies
└── server.js           # The main Express.js backend server and API logic

API Endpoints
All API routes are prefixed with /api.
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | /register | Registers a new citizen user. | No |
| POST | /login | Logs in a user (citizen or admin). | No |
| POST | /logout | Logs out the current user. | Yes |
| GET | /session | Checks the current user's session status. | No |
| POST | /complaints | Submits a new complaint (with optional image). | Citizen |
| GET | /complaints/my-complaints | Gets all complaints for the logged-in citizen. | Citizen |
| GET | /complaints/all | (Admin Only) Gets all complaints from all users. | Admin |
| PUT | /complaints/:id | (Admin Only) Updates the status of a complaint. | Admin |
License
This project is licensed under the MIT License. See the LICENSE.md file for details.
