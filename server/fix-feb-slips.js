const pool = require('./db');
async function fix() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Only delete unpaid Feb 2026 slips (paid ones would be blocked anyway)
        const toDelete = await client.query(
            `SELECT slip_id FROM monthly_fee_slips WHERE month = 2 AND year = 2026 AND status != 'paid'`
        );
        const ids = toDelete.rows.map(r => r.slip_id);
        console.log(`Found ${ids.length} unpaid Feb 2026 slips to delete:`, ids);

        if (ids.length > 0) {
            await client.query(`DELETE FROM fee_payments    WHERE slip_id = ANY($1)`, [ids]);
            await client.query(`DELETE FROM slip_line_items WHERE slip_id = ANY($1)`, [ids]);
            await client.query(`DELETE FROM monthly_fee_slips WHERE slip_id = ANY($1)`, [ids]);
            console.log('Deleted successfully.');
        }

        await client.query('COMMIT');
        console.log('Done. Please regenerate February slips from the UI.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error:', e.message);
    } finally { client.release(); pool.end(); }
}
fix();
