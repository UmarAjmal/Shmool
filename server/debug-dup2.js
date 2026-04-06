const { Pool } = require('pg');
require('dotenv').config({ path: 'D:/peronal/SMS_Pern/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function debug() {
    try {
        const testDuplicate = await pool.query(`
            SELECT table_name, constraint_name, column_name 
            FROM information_schema.key_column_usage 
            WHERE table_name IN ('students', 'app_users')
        `);
        console.log("Constraints and columns:", testDuplicate.rows);

        // Also check if any duplicate admission number logic is failing due to empty table
        const testQuery = await pool.query("SELECT admission_no FROM students WHERE admission_no LIKE 'MAR302026%' ORDER BY admission_no DESC LIMIT 1");
        console.log("Latest student:", testQuery.rows);

        // Or are we passing duplicate EMAIL? (Which might have a custom unique constraint)
        const emailCheck = await pool.query("SELECT email FROM app_users");
        console.log("Existing Emails:", emailCheck.rows);

    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
debug();