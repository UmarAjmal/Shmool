const pool = require('./db');
async function debug() {
    // 1. Check fee plans and their heads
    console.log('\n=== FEE PLANS & HEADS ===');
    const plans = await pool.query(`
        SELECT fp.plan_id, fp.plan_name, fp.class_id, fh.head_id, fh.head_name, fh.head_type, fph.amount
        FROM fee_plans fp
        LEFT JOIN fee_plan_heads fph ON fph.plan_id = fp.plan_id
        LEFT JOIN fee_heads fh ON fh.head_id = fph.head_id
        WHERE fp.is_active = TRUE
        ORDER BY fp.plan_id, fh.head_id
    `);
    console.table(plans.rows);

    // 2. Check all fee_heads (especially prev_balance)
    console.log('\n=== ALL FEE HEADS ===');
    const heads = await pool.query(`SELECT head_id, head_name, head_type, is_active FROM fee_heads ORDER BY head_id`);
    console.table(heads.rows);

    // 3. Check Jan 2026 slips - what status are they?
    console.log('\n=== JAN 2026 SLIPS STATUS ===');
    const janSlips = await pool.query(`
        SELECT mfs.slip_id, mfs.family_id, mfs.student_id, mfs.month, mfs.year,
               mfs.total_amount, mfs.paid_amount, mfs.status, mfs.is_family_slip
        FROM monthly_fee_slips mfs
        WHERE mfs.month = 1 AND mfs.year = 2026
        ORDER BY mfs.slip_id
    `);
    console.table(janSlips.rows);

    // 4. Check if Feb slips already exist and their line items
    console.log('\n=== FEB 2026 SLIPS & LINE ITEMS ===');
    const febSlips = await pool.query(`
        SELECT mfs.slip_id, mfs.family_id, mfs.student_id, mfs.total_amount, mfs.status,
               sli.head_name, sli.amount
        FROM monthly_fee_slips mfs
        LEFT JOIN slip_line_items sli ON sli.slip_id = mfs.slip_id
        WHERE mfs.month = 2 AND mfs.year = 2026
        ORDER BY mfs.slip_id, sli.item_id
    `);
    console.table(febSlips.rows);

    // 5. Simulate the pending query for families in Jan slips
    console.log('\n=== PENDING BALANCE SIMULATION (for families with Jan slips) ===');
    const pending = await pool.query(`
        SELECT mfs.family_id, mfs.slip_id, mfs.status,
               mfs.total_amount, mfs.paid_amount,
               COALESCE(excl.excl_sum, 0) AS excl_sum,
               GREATEST(0, mfs.total_amount - COALESCE(excl.excl_sum,0) - mfs.paid_amount) AS net_pending
        FROM monthly_fee_slips mfs
        LEFT JOIN (
            SELECT sli.slip_id, SUM(sli.amount) AS excl_sum
            FROM slip_line_items sli
            LEFT JOIN fee_heads fh ON fh.head_id = sli.head_id
            WHERE fh.head_type = 'prev_balance'
               OR sli.head_name ILIKE '%previous balance%'
               OR sli.head_name ILIKE '%opening balance%'
               OR fh.head_name  ILIKE '%admission%'
               OR sli.head_name ILIKE '%admission%'
            GROUP BY sli.slip_id
        ) excl ON excl.slip_id = mfs.slip_id
        WHERE mfs.status != 'paid'
          AND (mfs.year < 2026 OR (mfs.year = 2026 AND mfs.month < 2))
        ORDER BY mfs.family_id, mfs.year, mfs.month
    `);
    console.table(pending.rows);

    pool.end();
}
debug().catch(e => { console.error(e); pool.end(); });
