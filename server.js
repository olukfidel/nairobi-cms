// server.js
// Main backend logic for the Express application.

const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const db = require('./database.js');

// Initialize the express app
const app = express();
const PORT = 8080; // Use port 8080 as required

// --- MIDDLEWARE SETUP ---

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management
app.use(session({
    secret: 'nairobi-county-secret-key-super-secure', // A strong secret is recommended
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// File upload handling
app.use(fileUpload());

// --- CORRECTION ---
// Create 'uploads' directory on the persistent disk if it doesn't exist
const uploadsDir = path.join('/data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(uploadsDir));

// --- AUTHENTICATION MIDDLEWARE ---

// Middleware to protect routes that require a user to be logged in
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }
    next();
};

// Middleware to protect routes that require admin privileges
const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }
    next();
};

// --- API ENDPOINTS ---

// Root endpoint to serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// POST /api/register - Register a new citizen user
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (email, password, role) VALUES (?, ?, ?)';
        db.run(sql, [email, hashedPassword, 'citizen'], function(err) {
            if (err) {
                // Check for unique constraint error
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ message: 'Email already registered.' });
                }
                return res.status(500).json({ message: 'Database error during registration.' });
            }
            res.status(201).json({ message: 'User registered successfully.', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during password hashing.' });
    }
});

// POST /api/login - Log in a user (citizen or admin)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Database error during login.' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            // Store user info in session, but exclude password
            req.session.user = {
                id: user.id,
                email: user.email,
                role: user.role
            };
            res.status(200).json({ message: 'Login successful.', user: req.session.user });
        } else {
            res.status(401).json({ message: 'Invalid credentials.' });
        }
    });
});

// POST /api/logout - Log out the current user
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out.' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.status(200).json({ message: 'Logout successful.' });
    });
});

// GET /api/session - Check the current user's session status
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ loggedIn: true, user: req.session.user });
    } else {
        res.status(200).json({ loggedIn: false });
    }
});

// POST /api/complaints - Submit a new complaint
app.post('/api/complaints', requireLogin, (req, res) => {
    const { description } = req.body;
    const userId = req.session.user.id;

    if (!description) {
        return res.status(400).json({ message: 'Complaint description cannot be empty.' });
    }

    const complaintSql = 'INSERT INTO complaints (user_id, description) VALUES (?, ?)';
    db.run(complaintSql, [userId, description], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Failed to submit complaint.' });
        }

        const complaintId = this.lastID;
        // Check if an image file was uploaded
        if (req.files && req.files.image) {
            const imageFile = req.files.image;
            const uniqueFilename = `${Date.now()}-${imageFile.name}`;
            
            // This path now correctly uses the /data/uploads directory
            const uploadPath = path.join(uploadsDir, uniqueFilename);

            imageFile.mv(uploadPath, (err) => {
                if (err) {
                    console.error('File upload error:', err);
                    // Even if image upload fails, the complaint text is saved.
                    // A more robust system might roll back the complaint insertion.
                    return res.status(500).json({ message: 'Image upload failed, but complaint was saved.' });
                }

                const imageSql = 'INSERT INTO images (complaint_id, filepath) VALUES (?, ?)';
                const publicPath = `/uploads/${uniqueFilename}`; // Path to be used in frontend
                db.run(imageSql, [complaintId, publicPath], (err) => {
                    if (err) {
                         return res.status(500).json({ message: 'Failed to save image reference to database.' });
                    }
                    res.status(201).json({ message: 'Complaint and image submitted successfully.' });
                });
            });
        } else {
            // No image was uploaded
            res.status(201).json({ message: 'Complaint submitted successfully.' });
        }
    });
});

// GET /api/complaints/my-complaints - Get all complaints for the logged-in citizen
app.get('/api/complaints/my-complaints', requireLogin, (req, res) => {
    const userId = req.session.user.id;
    // Use GROUP_CONCAT to aggregate multiple image filepaths into a single string
    const sql = `
        SELECT
            c.id, c.description, c.status, c.submitted_at,
            GROUP_CONCAT(i.filepath) AS images
        FROM complaints c
        LEFT JOIN images i ON c.id = i.complaint_id
        WHERE c.user_id = ?
        GROUP BY c.id
        ORDER BY c.submitted_at DESC
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to retrieve your complaints.' });
        }
        res.status(200).json(rows);
    });
});

// GET /api/complaints/all - (Admin only) Get all complaints from all users
app.get('/api/complaints/all', requireAdmin, (req, res) => {
    const sql = `
        SELECT
            c.id, c.description, c.status, c.submitted_at,
            u.email AS user_email,
            GROUP_CONCAT(i.filepath) AS images
        FROM complaints c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN images i ON c.id = i.complaint_id
        GROUP BY c.id
        ORDER BY c.submitted_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to retrieve all complaints.' });
        }
        res.status(200).json(rows);
    });
});

// PUT /api/complaints/:id - (Admin only) Update a complaint's status
app.put('/api/complaints/:id', requireAdmin, (req, res) => {
    const { status } = req.body;
    const complaintId = req.params.id;
    const validStatuses = ['Submitted', 'In Progress', 'Resolved'];

    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
    }

    const sql = 'UPDATE complaints SET status = ? WHERE id = ?';
    db.run(sql, [status, complaintId], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Failed to update complaint status.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Complaint not found.' });
        }
        res.status(200).json({ message: `Complaint ${complaintId} status updated to ${status}.` });
    });
});


// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});