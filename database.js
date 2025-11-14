// database.js
// Handles SQLite database connection and schema setup.

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// The database file name
const DB_SOURCE = 'nairobi_complaints.db';

// Initialize the database connection
const db = new sqlite3.Database('/data/nairobi_complaints.db', (err) => {
    if (err) {
        // Cannot open database
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');
        // Use serialize to ensure table creation and admin setup happens in order
        db.serialize(() => {
            console.log('Setting up database schema...');

            // Enable foreign key support
            db.run('PRAGMA foreign_keys = ON;', (err) => {
                if (err) console.error("Error enabling foreign keys:", err.message);
            });

            // Create users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'citizen' CHECK(role IN ('citizen', 'admin'))
                )
            `, (err) => {
                if (err) {
                    console.error("Error creating users table:", err.message);
                } else {
                     // Create the admin user only if the table was just created or admin doesn't exist
                    const adminEmail = 'admin@nrb.gov';
                    const adminPassword = 'AdminPassword123'; // As specified in prompt
                    const saltRounds = 10;

                    db.get(`SELECT * FROM users WHERE email = ?`, [adminEmail], (err, row) => {
                        if (err) {
                            console.error("Error checking for admin user:", err.message);
                            return;
                        }
                        if (!row) {
                            bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
                                if (err) {
                                    console.error("Error hashing admin password:", err.message);
                                    return;
                                }
                                db.run(`
                                    INSERT INTO users (email, password, role) VALUES (?, ?, ?)
                                `, [adminEmail, hash, 'admin'], (err) => {
                                    if (err) {
                                        console.error("Error creating admin user:", err.message);
                                    } else {
                                        console.log('Admin user created successfully.');
                                    }
                                });
                            });
                        }
                    });
                }
            });

            // Create complaints table
            db.run(`
                CREATE TABLE IF NOT EXISTS complaints (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'In Progress', 'Resolved')),
                    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `, (err) => {
                 if (err) console.error("Error creating complaints table:", err.message);
            });


            // Create images table
            db.run(`
                CREATE TABLE IF NOT EXISTS images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    complaint_id INTEGER NOT NULL,
                    filepath TEXT NOT NULL,
                    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
                )
            `, (err) => {
                 if (err) console.error("Error creating images table:", err.message);
            });

             console.log('Database schema setup complete.');
        });
    }
});

module.exports = db;
