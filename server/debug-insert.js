const { Pool } = require('pg');
require('dotenv').config({ path: 'D:/peronal/SMS_Pern/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const bcrypt = require('bcryptjs');

async function debugInsert() {
    try {
        const client = await pool.connect();
        await client.query('BEGIN');
        
        try {
            const prefix = 'MAR302026';
            const auto_admission_no = prefix + '001';
            const username = `STU-${auto_admission_no}`;
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash('student1', salt);
            
            let roleRes = await client.query("SELECT id FROM app_roles WHERE role_name = 'Student'");
            let role_id = roleRes.rows.length ? roleRes.rows[0].id : 1;
            
            // App User
            const u = await client.query(`INSERT INTO app_users (username, password_hash, full_name, email, role_id, is_active) VALUES ($1, $2, 'Test', null, $3, true) RETURNING id`, [username, password_hash, role_id]);
            console.log("inserted app user:", u.rows[0].id);

            // Family
            const f = await client.query("INSERT INTO families (family_name, primary_parent_name) VALUES ('Test Fam', 'Test Father') RETURNING family_id");
            console.log("inserted family:", f.rows[0].family_id);

            // Student
            await client.query(`INSERT INTO students (
                admission_no, first_name, user_id, family_id
            ) VALUES (
                $1, 'Test2', $2, $3
            )`, [auto_admission_no, u.rows[0].id, f.rows[0].family_id]);

            console.log('Successfully inserted everything');
            await client.query('ROLLBACK'); // roll it back just testing
        } catch(e) {
            await client.query('ROLLBACK');
            console.error(e);
        } finally {
            client.release();
        }
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
debugInsert();