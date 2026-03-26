const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');

// ==========================================
// DEPARTMENTS API
// ==========================================

// List Departments
router.get('/departments', async (req, res) => {
    try {
        // Also count employees in each department
        const query = `
            SELECT d.*, COUNT(e.employee_id) as employee_count 
            FROM departments d
            LEFT JOIN employees e ON d.department_id = e.department_id
            GROUP BY d.department_id
            ORDER BY d.department_name ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Create Department
router.post('/departments', async (req, res) => {
    try {
        const { department_name, head_of_department, description } = req.body;
        const newDept = await pool.query(
            "INSERT INTO departments (department_name, head_of_department, description) VALUES ($1, $2, $3) RETURNING *",
            [department_name, head_of_department, description]
        );
        res.json(newDept.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Delete Department
router.delete('/departments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM departments WHERE department_id = $1", [id]);
        res.json("Department deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});


// ==========================================
// EMPLOYEES API
// ==========================================

// List Employees
router.get('/employees', async (req, res) => {
    try {
        const query = `
            SELECT e.*, d.department_name, u.username as system_username
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN app_users u ON e.app_user_id = u.id
            ORDER BY e.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Create Employee (with optional System User creation)
router.post('/employees', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start Transaction

        const {
            first_name, last_name, email, phone, cnic, designation, 
            department_id, joining_date, salary, address,
            gender, dob, marital_status, father_name,
            emergency_contact, qualification, experience, blood_group,
            create_system_user, // boolean
            username, password, role_id // optional
        } = req.body;

        let app_user_id = null;

        // 1. Create System User if requested
        if (create_system_user && username && password && role_id) {
            // Check if username exists
            const userCheck = await client.query("SELECT * FROM app_users WHERE username = $1", [username]);
            if (userCheck.rows.length > 0) {
                throw new Error("Username already taken");
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const fullName = `${first_name} ${last_name}`;

            const newUser = await client.query(
                "INSERT INTO app_users (username, password_hash, full_name, role_id) VALUES ($1, $2, $3, $4) RETURNING id",
                [username, hashedPassword, fullName, role_id]
            );
            app_user_id = newUser.rows[0].id;
        }

        // 2. Create Employee Record
        const newEmployee = await client.query(
            `INSERT INTO employees (
                first_name, last_name, email, phone, cnic, designation, 
                department_id, joining_date, salary, address, app_user_id,
                gender, dob, marital_status, father_name,
                emergency_contact, qualification, experience, blood_group
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
            [
                first_name, last_name, email, phone, cnic, designation,
                department_id, joining_date, salary, address, app_user_id,
                gender, dob, marital_status, father_name, 
                emergency_contact, qualification, experience, blood_group
            ]
        );

        await client.query('COMMIT'); // Commit Transaction
        res.json(newEmployee.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Get Single Employee by ID
router.get('/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT e.*, d.department_name, u.username as system_username, u.is_active as user_active, u.id as user_id
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN app_users u ON e.app_user_id = u.id
            WHERE e.employee_id = $1
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) return res.status(404).json("Employee not found");
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Update Employee Status
router.patch('/employees/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Active' or 'Inactive'
        
        await pool.query("UPDATE employees SET status = $1 WHERE employee_id = $2", [status, id]);
        res.json("Status updated");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Delete Employee (and optionally unlink user?)
router.delete('/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM employees WHERE employee_id = $1", [id]);
        res.json("Employee deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Update Employee (with optional System User creation for employees who don't have one yet)
router.put('/employees/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const {
            first_name, last_name, email, phone, cnic, designation, 
            department_id, joining_date, salary, address,
            gender, dob, marital_status, father_name,
            emergency_contact, qualification, experience, blood_group,
            create_system_user, username, password, role_id
        } = req.body;

        // Check if employee already has a system user
        const empCheck = await client.query("SELECT app_user_id FROM employees WHERE employee_id = $1", [id]);
        if (empCheck.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

        let app_user_id = empCheck.rows[0].app_user_id; // keep existing
        let setUserCol = '';

        // Only create a system user if:
        // - explicitly requested
        // - employee doesn't already have one
        // - all required fields are provided
        if (create_system_user && !app_user_id && username && password && role_id) {
            const userCheck = await client.query("SELECT id FROM app_users WHERE username = $1", [username]);
            if (userCheck.rows.length > 0) throw new Error("Username already taken");

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const fullName = `${first_name} ${last_name}`;

            const newUser = await client.query(
                "INSERT INTO app_users (username, password_hash, full_name, role_id) VALUES ($1, $2, $3, $4) RETURNING id",
                [username, hashedPassword, fullName, role_id]
            );
            app_user_id = newUser.rows[0].id;
            setUserCol = ', app_user_id = $19';
        }

        if (setUserCol) {
            await client.query(`
                UPDATE employees SET
                    first_name=$1, last_name=$2, email=$3, phone=$4, cnic=$5,
                    designation=$6, department_id=$7, joining_date=$8, salary=$9,
                    address=$10, gender=$11, dob=$12, marital_status=$13,
                    father_name=$14, emergency_contact=$15, qualification=$16,
                    experience=$17, blood_group=$18, app_user_id=$19
                WHERE employee_id=$20`,
                [first_name, last_name, email, phone, cnic, designation,
                 department_id, joining_date, salary, address, gender, dob,
                 marital_status, father_name, emergency_contact, qualification,
                 experience, blood_group, app_user_id, id]
            );
        } else {
            await client.query(`
                UPDATE employees SET
                    first_name=$1, last_name=$2, email=$3, phone=$4, cnic=$5,
                    designation=$6, department_id=$7, joining_date=$8, salary=$9,
                    address=$10, gender=$11, dob=$12, marital_status=$13,
                    father_name=$14, emergency_contact=$15, qualification=$16,
                    experience=$17, blood_group=$18
                WHERE employee_id=$19`,
                [first_name, last_name, email, phone, cnic, designation,
                 department_id, joining_date, salary, address, gender, dob,
                 marital_status, father_name, emergency_contact, qualification,
                 experience, blood_group, id]
            );
        }

        await client.query('COMMIT');
        res.json("Employee updated successfully");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});


module.exports = router;
