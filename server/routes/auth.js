const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Fetch user with role info and permissions
        const result = await pool.query(`
            SELECT 
                u.id, u.username, u.password_hash, u.full_name, u.email, u.is_active, u.role_id,
                r.role_name,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'module_name', p.module_name,
                            'can_read', p.can_read,
                            'can_write', p.can_write,
                            'can_delete', p.can_delete
                        )
                    ) FILTER (WHERE p.module_name IS NOT NULL),
                    '[]'
                ) AS permissions
            FROM app_users u
            LEFT JOIN app_roles r ON u.role_id = r.id
            LEFT JOIN role_permissions p ON r.id = p.role_id
            WHERE u.username = $1
            GROUP BY u.id, u.username, u.password_hash, u.full_name, u.email, u.is_active, u.role_id, r.role_name
        `, [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = result.rows[0];

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({ message: 'Your account is disabled. Please contact the administrator.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash || '');
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Return user data (no password_hash)
        const { password_hash, ...safeUser } = user;
        res.json(safeUser);

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
