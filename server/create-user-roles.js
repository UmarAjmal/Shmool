const pool = require('./db');
const bcrypt = require('bcryptjs');

async function createAuthTables() {
    try {
        console.log("Setting up User & Role Management Tables...");

        // 1. Create Roles Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_roles (
                id SERIAL PRIMARY KEY,
                role_name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                is_system_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Create Permissions Table
        // We will store permissions as a JSONB object or separate table.
        // Let's use a separate table for cleaner relational queries
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id SERIAL PRIMARY KEY,
                role_id INT REFERENCES app_roles(id) ON DELETE CASCADE,
                module_name VARCHAR(50) NOT NULL,
                can_read BOOLEAN DEFAULT FALSE,
                can_write BOOLEAN DEFAULT FALSE,
                can_delete BOOLEAN DEFAULT FALSE,
                UNIQUE(role_id, module_name)
            );
        `);

        // 3. Create Users Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                email VARCHAR(100),
                role_id INT REFERENCES app_roles(id) ON DELETE SET NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Seed Administrator Role
        const roleCheck = await pool.query("SELECT * FROM app_roles WHERE role_name = 'Administrator'");
        let adminRoleId;

        if (roleCheck.rows.length === 0) {
            console.log("Creating default Administrator role...");
            const newRole = await pool.query(
                "INSERT INTO app_roles (role_name, description, is_system_default) VALUES ($1, $2, $3) RETURNING id",
                ['Administrator', 'Full System Access', true]
            );
            adminRoleId = newRole.rows[0].id;

            // Assign All Permissions
            const modules = ['dashboard', 'students', 'teachers', 'academic', 'settings', 'users_roles', 'fees'];
            
            for (const mod of modules) {
                await pool.query(
                    "INSERT INTO role_permissions (role_id, module_name, can_read, can_write, can_delete) VALUES ($1, $2, $3, $4, $5)",
                    [adminRoleId, mod, true, true, true]
                );
            }

            // Create Default Admin User
            // Password: 'admin123'
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            await pool.query(
                "INSERT INTO app_users (username, password_hash, full_name, email, role_id) VALUES ($1, $2, $3, $4, $5)",
                ['admin', hashedPassword, 'System Administrator', 'admin@smartschool.com', adminRoleId]
            );
            console.log("Default Admin user created (user: admin, pass: admin123)");

        } else {
            console.log("Administrator role already exists.");
            adminRoleId = roleCheck.rows[0].id;
        }

        console.log("Auth tables setup complete.");

    } catch (err) {
        console.error("Error setting up auth tables:", err);
    }
}

createAuthTables();
