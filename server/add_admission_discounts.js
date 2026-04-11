const pool = require('./db');
async function run() {
    try {
        await pool.query('ALTER TABLE admission_fee_ledger ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0');
        await pool.query('ALTER TABLE admission_fee_payments ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0');
        console.log('Columns added successfully');
    } catch(e) {
        console.error('Error adding columns:', e);
    } finally {
        pool.end();
    }
}
run();