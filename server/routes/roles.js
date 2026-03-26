const router = require('express').Router();
const pool = require('../db');

// List All Roles
router.get('/', async (req, res) => {
    try {
        const roles = await pool.query("SELECT * FROM app_roles ORDER BY id ASC");
        // For each role, we might want to attach permissions, OR fetch them on demand.
        // Let's attach them for the list view to make it easy
        const permissions = await pool.query("SELECT * FROM role_permissions");
        
        const data = roles.rows.map(role => {
            return {
                ...role,
                permissions: permissions.rows.filter(p => p.role_id === role.id)
            };
        });

        res.json(data);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Create New Role
router.post('/', async (req, res) => {
    try {
        const { role_name, description, permissions } = req.body;
        
        // 1. Create Role
        const newRole = await pool.query(
            "INSERT INTO app_roles (role_name, description) VALUES ($1, $2) RETURNING *",
            [role_name, description]
        );
        const roleId = newRole.rows[0].id;

        // 2. Insert Permissions
        if (permissions && permissions.length > 0) {
            for (const p of permissions) {
                await pool.query(
                    "INSERT INTO role_permissions (role_id, module_name, can_read, can_write, can_delete) VALUES ($1, $2, $3, $4, $5)",
                    [roleId, p.module_name, p.can_read, p.can_write, p.can_delete]
                );
            }
        }

        res.json({ ...newRole.rows[0], permissions });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Update Role
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role_name, description, permissions } = req.body;

        // 1. Update Details
        await pool.query("UPDATE app_roles SET role_name = $1, description = $2 WHERE id = $3", [role_name, description, id]);

        // 2. Update Permissions (Delete all & Re-insert simplistic approach)
        await pool.query("DELETE FROM role_permissions WHERE role_id = $1", [id]);

        if (permissions && permissions.length > 0) {
            for (const p of permissions) {
                await pool.query(
                    "INSERT INTO role_permissions (role_id, module_name, can_read, can_write, can_delete) VALUES ($1, $2, $3, $4, $5)",
                    [id, p.module_name, p.can_read, p.can_write, p.can_delete]
                );
            }
        }

        res.json("Role updated");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Delete Role
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if System Default
        const check = await pool.query("SELECT is_system_default FROM app_roles WHERE id = $1", [id]);
        if (check.rows.length === 0) return res.status(404).json("Role not found");
        if (check.rows[0].is_system_default) {
            return res.status(403).json("Cannot delete system default role");
        }

        await pool.query("DELETE FROM app_roles WHERE id = $1", [id]);
        res.json("Role deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
