const { Pool } = require('pg'); 
require('dotenv').config({ path: 'D:/peronal/SMS_Pern/server/.env' }); 
const dbPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); 
async function fixSlips() { 
    try { 
        await dbPool.query('ALTER TABLE monthly_fee_slips ADD COLUMN IF NOT EXISTS issue_date DATE;'); 
        console.log('Added issue_date column to monthly_fee_slips.'); 
    } catch(e) { 
        console.error(e); 
    } finally { 
        dbPool.end(); 
    } 
} 
fixSlips();