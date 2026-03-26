const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');

// List All Users
router.get('/', async (req, res) => {
    try {
        const users = await pool.query(`
            SELECT u.id, u.username, u.full_name, u.email, u.is_active, r.role_name, u.role_id 
            FROM app_users u 
            LEFT JOIN app_roles r ON u.role_id = r.id 
            ORDER BY u.id ASC
        `);
        res.json(users.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Create User
router.post('/', async (req, res) => {
    try {
        const { username, password, full_name, email, role_id } = req.body;

        // Check availability
        const check = await pool.query("SELECT * FROM app_users WHERE username = $1", [username]);
        if (check.rows.length > 0) return res.status(400).json("Username already exists");

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO app_users (username, password_hash, full_name, email, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, role_id",
            [username, password_hash, full_name, email, role_id]
        );

        res.json(newUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Update User
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, role_id, is_active, password } = req.body;

        if (password) {
             const salt = await bcrypt.genSalt(10);
             const password_hash = await bcrypt.hash(password, salt);
             await pool.query("UPDATE app_users SET password_hash = $1 WHERE id = $2", [password_hash, id]);
        }

        await pool.query(
            "UPDATE app_users SET full_name = $1, email = $2, role_id = $3, is_active = $4 WHERE id = $5",
            [full_name, email, role_id, is_active, id]
        );

        res.json("User updated");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Delete Key
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM app_users WHERE id = $1", [id]);
        res.json("User deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Change Password Only
router.patch('/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        
        await pool.query("UPDATE app_users SET password_hash = $1 WHERE id = $2", [password_hash, id]);
        res.json("Password updated");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
