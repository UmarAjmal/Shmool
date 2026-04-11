const pool = require('./db');

async function fixSlips() {
    try {
        // Let's see if we can update the most recent slip to have months_list
        const res = await pool.query(`UPDATE monthly_fee_slips SET months_list = ARRAY[6,7], has_multi_months = true WHERE slip_id IN (SELECT slip_id FROM monthly_fee_slips WHERE month=6 AND year=2026 ORDER BY slip_id DESC) RETURNING *`);
        console.log('Updated slips:', res.rowCount);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
fixSlips();