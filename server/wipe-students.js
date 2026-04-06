const { Pool } = require('pg');
require('dotenv').config({ path: 'D:/peronal/SMS_Pern/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function wipeStudents() {
    try {
        await pool.query('BEGIN');
        console.log('Wiping all student-related data to start fresh...');
        
        await pool.query('DELETE FROM slip_line_items;'); // Need to delete child records of fee slips first
        await pool.query('DELETE FROM fee_payments;');
        await pool.query('DELETE FROM monthly_fee_slips;');
        
        await pool.query('DELETE FROM admission_fee_payments;');
        await pool.query('DELETE FROM admission_fee_ledger;');
        
        await pool.query('DELETE FROM family_opb_payments;');
        
        // await pool.query('DELETE FROM exam_fee_payments;');
        // await pool.query('DELETE FROM exam_fee_slips;');

        // await pool.query('DELETE FROM student_records;');
        // await pool.query('DELETE FROM attendance;');
        await pool.query('DELETE FROM students;');
        await pool.query('DELETE FROM families;');
        
        // Only delete system-generated Student accounts
        await pool.query("DELETE FROM app_users WHERE username LIKE 'STU-%';");
        
        await pool.query('COMMIT');
        console.log('Successfully wiped all students and generated families/users from Supabase.');
    } catch(e) {
        await pool.query('ROLLBACK');
        console.error(e.message);
    } finally {
        pool.end();
    }
}
wipeStudents();
