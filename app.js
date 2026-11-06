
require('dotenv').config();

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./config/db');
const session = require('express-session');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60
    }
}));
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    next();
}
function requireAdmin(req, res, next) {
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    }
    next();
}
// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Registration backend
app.post('/register', async (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).send('Please fill in all fields.');
    }

    if (password.length < 8) {
        return res.status(400).send('Password must contain at least 8 characters.');
    }

    try {
        // Check duplicate email
        const [existingUser] = await db.promise().execute(
            'SELECT user_id FROM users WHERE email = ?',
            [email.trim()]
        );

        if (existingUser.length > 0) {
            return res.status(409).send('Email already registered. Please login.');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        await db.promise().execute(
            `INSERT INTO users (name, email, password, phone)
             VALUES (?, ?, ?, ?)`,
            [name.trim(), email.trim(), hashedPassword, phone.trim()]
        );

       res.redirect('/registration-success');
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send('Something went wrong. Please try again.');
    }
});
// Registration Success Page
app.get('/registration-success', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'registration-success.html'));
});
// Dashboard statistics
app.get('/api/dashboard-stats', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.promise().execute(
            `SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved
             FROM complaints
             WHERE user_id = ?`,
            [req.session.user.id]
        );

        res.json(rows[0]);

    } catch (error) {
        console.error('Dashboard statistics error:', error);
        res.status(500).json({
            message: 'Unable to load dashboard statistics.'
        });
    }
});
// My Profile page
app.get('/profile', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// Fetch logged-in user's profile
app.get('/api/profile', requireLogin, async (req, res) => {
    try {
        const [users] = await db.promise().execute(
            `SELECT name, email, phone
             FROM users
             WHERE user_id = ?`,
            [req.session.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User profile not found.'
            });
        }

        res.json(users[0]);

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            message: 'Unable to load profile.'
        });
    }
});
// Admin login page
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

// Admin login authentication
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Please enter email and password.');
    }

    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

        if (!adminEmail || !adminPasswordHash) {
            return res.status(500).send('Admin credentials are not configured.');
        }

        const emailMatches =
            email.trim().toLowerCase() === adminEmail.trim().toLowerCase();

        const passwordMatches =
            await bcrypt.compare(password, adminPasswordHash);

        if (!emailMatches || !passwordMatches) {
            return res.status(401).send('Invalid admin email or password.');
        }

        req.session.admin = {
            email: adminEmail
        };

        res.redirect('/admin/dashboard');

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).send('Unable to login. Please try again.');
    }
});

// Protected admin dashboard
app.get('/admin/dashboard', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Admin dashboard statistics API
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const [complaints] = await db.promise().execute(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END) AS underReview,
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
            FROM complaints
        `);

        const [departments] = await db.promise().execute(`
            SELECT COUNT(*) AS total FROM departments
        `);

        res.json({
            total: complaints[0].total || 0,
            pending: complaints[0].pending || 0,
            underReview: complaints[0].underReview || 0,
            resolved: complaints[0].resolved || 0,
            departments: departments[0].total || 0
        });

    } catch (error) {
        console.error('Admin statistics error:', error);
        res.status(500).json({
            message: 'Unable to load admin statistics.'
        });
    }
});

// Admin logout
app.get('/admin/logout', (req, res) => {
    delete req.session.admin;
    res.redirect('/admin/login');
});
// Start server
const PORT = process.env.PORT || 3000;

// Login backend
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Please enter email and password.');
    }

    try {
        // Find user by email
        const [users] = await db.promise().execute(
            'SELECT user_id, name, email, password FROM users WHERE email = ?',
            [email.trim()]
        );

       if (users.length === 0) {
    return res.redirect('/login?error=invalid');
}
        const user = users[0];

        // Compare entered password with stored hash
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
    return res.redirect('/login?error=invalid');
}

        // Create login session
        req.session.user = {
            id: user.user_id,
            name: user.name,
            email: user.email
        };
// Redirect to dashboard
res.redirect('/dashboard');

} catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Something went wrong. Please try again.');
}
});
// Protected dashboard
app.get('/dashboard', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Get logged-in user details
app.get('/api/user', requireLogin, (req, res) => {
    res.json({
        name: req.session.user.name
    });
});
// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Unable to logout.');
        }

        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// Open complaint submission page
app.get('/complaints/new', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'new-complaint.html'));
});

// Submit a new complaint
app.post('/complaints', requireLogin, async (req, res) => {
    const { subject, category, description } = req.body;

    if (!subject || !category || !description) {
        return res.status(400).send('Please fill in all complaint details.');
    }

    try {
        const userId = req.session.user.id;

        await db.promise().execute(
            `INSERT INTO complaints
            (user_id, subject, description, category, complaint_date, status)
            VALUES (?, ?, ?, ?, CURRENT_DATE, ?)`,
            [
                userId,
                subject.trim(),
                description.trim(),
                category,
                'Pending'
            ]
        );
     res.redirect('/complaint-success');
        

    } catch (error) {
        console.error('Complaint submission error:', error);
        res.status(500).send('Unable to submit complaint. Please try again.');
    }
});
// Complaint Success Page
app.get('/complaint-success', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'complaint-success.html'));
});
// My Complaints page
app.get('/my-complaints', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'my-complaints.html'));
});

// Fetch complaints belonging to logged-in user
app.get('/api/my-complaints', requireLogin, async (req, res) => {
    try {
        const [complaints] = await db.promise().execute(
            `SELECT complaint_id, subject, description,
                    category, complaint_date, status
             FROM complaints
             WHERE user_id = ?
             ORDER BY complaint_id DESC`,
            [req.session.user.id]
        );

        res.json(complaints);

    } catch (error) {
        console.error('Fetch complaints error:', error);
        res.status(500).json({
            message: 'Unable to fetch complaints.'
        });
    }
});

// Fetch all complaints for admin
app.get('/api/admin/complaints', requireAdmin, async (req, res) => {
    try {
        const [complaints] = await db.promise().execute(`
            SELECT
                c.complaint_id,
                c.subject,
                c.category,
                c.description,
                c.complaint_date,
                c.status,
                u.name AS user_name,
                u.email AS user_email
            FROM complaints c
            JOIN users u ON c.user_id = u.user_id
            ORDER BY c.complaint_id DESC
        `);

        res.json(complaints);

    } catch (error) {
        console.error('Admin complaints error:', error);
        res.status(500).json({
            message: 'Unable to fetch complaints.'
        });
    }
});

 // Update complaint status (Admin only)
app.put('/api/admin/complaints/:id/status', requireAdmin, async (req, res) => {
    const complaintId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = ['Pending', 'Under Review', 'Resolved'];

    if (!Number.isInteger(complaintId) || complaintId <= 0) {
        return res.status(400).json({
            message: 'Invalid complaint ID.'
        });
    }

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: 'Invalid complaint status.'
        });
    }

    try {
        const [result] = await db.promise().execute(
            'UPDATE complaints SET status = ? WHERE complaint_id = ?',
            [status, complaintId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Complaint not found.'
            });
        }

        res.json({
            message: 'Complaint status updated successfully!',
            status
        });

    } catch (error) {
        console.error('Status update error:', error);

        res.status(500).json({
            message: 'Unable to update complaint status.'
        });
    }
});

// Fetch all departments
app.get('/api/admin/departments', requireAdmin, async (req, res) => {
    try {
        const [departments] = await db.promise().execute(
            `SELECT department_id, department_name, contact_person, email, phone
             FROM departments
             ORDER BY department_id DESC`
        );

        res.json(departments);

    } catch (error) {
        console.error('Department fetch error:', error);
        res.status(500).json({
            message: 'Unable to fetch departments.'
        });
    }
});


// Add a new department
app.post('/api/admin/departments', requireAdmin, async (req, res) => {
    const { department_name, contact_person, email, phone } = req.body;

    if (!department_name || !contact_person || !email || !phone) {
        return res.status(400).json({
            message: 'Please fill in all department details.'
        });
    }

    try {
        const [result] = await db.promise().execute(
            `INSERT INTO departments
             (department_name, contact_person, email, phone)
             VALUES (?, ?, ?, ?)`,
            [
                department_name.trim(),
                contact_person.trim(),
                email.trim(),
                phone.trim()
            ]
        );

        res.status(201).json({
            message: 'Department added successfully!',
            departmentId: result.insertId
        });

    } catch (error) {
        console.error('Department insert error:', error);
        res.status(500).json({
            message: 'Unable to add department.'
        });
    }
});

// Edit department
app.put('/api/admin/departments/:id', requireAdmin, async (req, res) => {
    const departmentId = Number(req.params.id);
    const { department_name, contact_person, email, phone } = req.body;

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
        return res.status(400).json({ message: 'Invalid department ID.' });
    }

    if (!department_name?.trim() || !contact_person?.trim() ||
        !email?.trim() || !phone?.trim()) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const [result] = await db.promise().execute(
            `UPDATE departments
             SET department_name = ?, contact_person = ?, email = ?, phone = ?
             WHERE department_id = ?`,
            [
                department_name.trim(),
                contact_person.trim(),
                email.trim(),
                phone.trim(),
                departmentId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Department not found.' });
        }

        res.json({ message: 'Department updated successfully!' });

    } catch (error) {
        console.error('Department update error:', error);
        res.status(500).json({ message: 'Unable to update department.' });
    }
});


// Delete department
app.delete('/api/admin/departments/:id', requireAdmin, async (req, res) => {
    const departmentId = Number(req.params.id);

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
        return res.status(400).json({ message: 'Invalid department ID.' });
    }

    try {
        const [result] = await db.promise().execute(
            'DELETE FROM departments WHERE department_id = ?',
            [departmentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Department not found.' });
        }

        res.json({ message: 'Department deleted successfully!' });

    } catch (error) {
        console.error('Department delete error:', error);
        res.status(500).json({ message: 'Unable to delete department.' });
    }
});


app.listen(PORT, () => {
    console.log(`Harika Resolve running at http://localhost:${PORT}`);
});
