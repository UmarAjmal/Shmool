const { Pool } = require('pg');
require('dotenv').config({ path: 'D:/peronal/SMS_Pern/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function debug() {
    try {
        const users = await pool.query("SELECT * FROM app_users WHERE email = 'test@test.com'");
        console.log('App Users with some email:', users.rowCount);
        
        // Wait, what if the err.code === '23505' actually throws on something entirely different?
        // Let's modify students.js to print the ACTUAL error detail without rejecting it blindly.
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
debug();