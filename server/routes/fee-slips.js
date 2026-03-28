const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /fee-slips/generate
router.post('/generate', async (req, res) => {
    const client = await pool.connect();
    try {
        const { class_id, year, due_date, issue_date, extra_heads } = req.body;
        // Accept either months[] array (new) or single month (backward compat)
        const rawMonths = req.body.months || (req.body.month ? [req.body.month] : null);
        if (!class_id || !rawMonths || rawMonths.length === 0 || !year)
            return res.status(400).json({ error: 'class_id, months (array), and year are required' });

        const monthsArray = rawMonths.map(Number).sort((a, b) => a - b); // sorted ascending
        const firstMonth  = monthsArray[0];
        const lastMonth   = monthsArray[monthsArray.length - 1];
        const monthsCount = monthsArray.length;

        // Build a human-readable label like "Feb 2026" or "Feb – Mar 2026"
        const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthLabel  = monthsCount === 1
            ? `${MONTH_NAMES[firstMonth - 1]} ${year}`
            : `${MONTH_NAMES[firstMonth - 1]} – ${MONTH_NAMES[lastMonth - 1]} ${year}`;

        // For backward compat let month = firstMonth when needed
        const month = firstMonth;

        await client.query('BEGIN');

        const planResult = await client.query(
            `SELECT fp.plan_id 
             FROM fee_plans fp 
             LEFT JOIN fee_plan_classes fpc ON fpc.plan_id = fp.plan_id 
             WHERE (fp.class_id = $1 OR fpc.class_id = $1 OR fp.applies_to_all = TRUE) 
               AND fp.is_active = TRUE 
             LIMIT 1`,
            [class_id]
        );
        if (planResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'No active fee plan found for this class.' });
        }
        const planId = planResult.rows[0].plan_id;
        const planHeads = await client.query(
            `SELECT fph.amount, fh.head_id, fh.head_name, fh.head_type FROM fee_plan_heads fph
             JOIN fee_heads fh ON fph.head_id = fh.head_id WHERE fph.plan_id = $1`, [planId]
        );

        // Get all active students in this class WITH their family_fee and total family size (across ALL classes)
        const studentsResult = await client.query(
            `SELECT s.student_id, s.family_id, s.first_name, s.last_name,
                    s.admission_no, s.monthly_fee AS personal_monthly_fee,
                    COALESCE(f.family_fee, 0) AS family_fee,
                    (SELECT COUNT(*) FROM students s2
                     WHERE s2.family_id = s.family_id AND s2.status = 'Active') AS total_family_size,
                    c.class_id AS sort_class_id
             FROM students s
             LEFT JOIN families f ON f.family_id = s.family_id
             LEFT JOIN classes c ON c.class_id = s.class_id
             WHERE s.class_id = $1 AND s.status = 'Active'
             ORDER BY s.family_id NULLS LAST, c.class_id DESC NULLS LAST, s.first_name`, [class_id]
        );
        if (studentsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'No active students found in this class' });
        }

        // ─── Group students by family_id to identify multi-member families ───
        // Only use family_fee for families with 2+ active members (across all classes)
        const familyGroups = {}; // family_id → [students]
        const soloStudents = [];
        for (const student of studentsResult.rows) {
            const familySize = parseInt(student.total_family_size) || 1;
            if (!student.family_id || familySize <= 1) {
                soloStudents.push(student);
            } else {
                if (!familyGroups[student.family_id]) familyGroups[student.family_id] = [];
                familyGroups[student.family_id].push(student);
            }
        }

        let generatedCount = 0, skippedCount = 0;

        // ─── Find Previous Balance plan head (if any) ─────────────────────────
        const pbPlanHead = planHeads.rows.find(h => h.head_type === 'prev_balance');

        // ─── Preload Previous Balance per family (OPB + pending old slip fees) ──
        // Formula: OPB_remaining + SUM(outstanding from previous unpaid slips)
        // Exclusions: prev_balance line items in old slips (avoid double count), admission fees
        let familyPBMap = {}; // family_id → total previous balance amount
        if (pbPlanHead) {
            const allFamilyIds = [
                ...Object.keys(familyGroups),
                ...soloStudents.filter(s => s.family_id).map(s => s.family_id)
            ].filter(Boolean); // keep as strings — family_id is 'FAM-2026-XXXX' not integer
            const uniqueFamilyIds = [...new Set(allFamilyIds)];
            if (uniqueFamilyIds.length > 0) {
                // 1. OPB remaining from families table
                const opbRes = await client.query(
                    `SELECT family_id,
                            GREATEST(0, COALESCE(opening_balance,0) - COALESCE(opening_balance_paid,0)) AS opb_remaining
                     FROM families WHERE family_id = ANY($1)`,
                    [uniqueFamilyIds]
                );
                const opbMap = {};
                for (const r of opbRes.rows) opbMap[r.family_id] = parseFloat(r.opb_remaining) || 0;

                // 2. Outstanding fees from all previous unpaid/partial slips
                //    Strip prev_balance + admission fee line items to avoid double-counting
                const pendingRes = await client.query(
                    `SELECT mfs.family_id,
                            COALESCE(SUM(GREATEST(0,
                                mfs.total_amount
                                - COALESCE(excl.excl_sum, 0)
                                - mfs.paid_amount
                            )), 0) AS pending_fees
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
                     WHERE mfs.family_id = ANY($1)
                       AND mfs.status != 'paid'
                       AND (mfs.year < $2 OR (mfs.year = $2 AND mfs.month < $3))
                     GROUP BY mfs.family_id`,
                    [uniqueFamilyIds, year, month]
                );
                const pendingMap = {};
                for (const r of pendingRes.rows) pendingMap[r.family_id] = parseFloat(r.pending_fees) || 0;

                // 3. Combine OPB + pending into familyPBMap
                for (const fid of uniqueFamilyIds) {
                    const total = (opbMap[fid] || 0) + (pendingMap[fid] || 0);
                    if (total > 0) familyPBMap[fid] = total;
                }
            }
        }

        // ─── Helper: build line items from plan heads (skips prev_balance — handled separately) ─
        const buildLineItems = (personalFee) => {
            return planHeads.rows
                .filter(head => head.head_type !== 'prev_balance') // Previous Balance added separately
                .map(head => {
                    const isTuition = head.head_name.toLowerCase().includes('tuition');
                    const unitAmount = (isTuition && personalFee > 0) ? personalFee : parseFloat(head.amount);
                    const finalAmount = unitAmount * monthsCount;
                    const headName = monthsCount > 1 && isTuition
                        ? `${head.head_name} (${monthLabel})`
                        : head.head_name;
                    return {
                        head_id: head.head_id,
                        head_name: headName,
                        amount: finalAmount
                    };
                });
        };

        const insertSlip = async (student, totalAmount, lineItems, isFamilySlip) => {
            const slip = await client.query(
                `INSERT INTO monthly_fee_slips
                    (student_id, family_id, class_id, month, year, due_date, issue_date, total_amount, is_family_slip)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING slip_id`,
                [student.student_id, student.family_id, class_id,
                 month, year, due_date || null, issue_date || null, totalAmount, isFamilySlip]
            );
            const slipId = slip.rows[0].slip_id;
            for (const item of lineItems)
                await client.query(
                    `INSERT INTO slip_line_items (slip_id, head_id, head_name, amount) VALUES ($1, $2, $3, $4)`,
                    [slipId, item.head_id, item.head_name, item.amount]
                );
            if (extra_heads && extra_heads.length > 0)
                for (const extra of extra_heads)
                    if (extra.amount && parseFloat(extra.amount) > 0)
                        await client.query(
                            `INSERT INTO slip_line_items (slip_id, head_id, head_name, amount, note) VALUES ($1,$2,$3,$4,$5)`,
                            [slipId, extra.head_id || null, extra.head_name, extra.amount, extra.note || null]
                        );
            return slipId;
        };

        // ─── FAMILY SLIPS: One slip per family (using family_fee) ─────────────
        for (const [fid, members] of Object.entries(familyGroups)) {
            // Check if ANY member already has a slip for ANY of the selected months
            const existing = await client.query(
                `SELECT slip_id FROM monthly_fee_slips
                 WHERE family_id = $1 AND year = $2 AND month = ANY($3)`,
                [fid, year, monthsArray]
            );
            if (existing.rows.length > 0) { skippedCount++; continue; }

            // Primary = member in highest class (most senior sibling)
            const primary = members[0]; // already ordered by class_id DESC
            const familyFee = parseFloat(primary.family_fee) || 0;

            // Multiply family fee by number of months
            const combinedFamilyFee = familyFee * monthsCount;
            const familyHeadName = monthsCount > 1 ? `Family Monthly Fee (${monthLabel})` : 'Family Monthly Fee';
            const tuitionHead = planHeads.rows.find(h => h.head_name.toLowerCase().includes('tuition'));
            let totalAmount = combinedFamilyFee;
            const lineItems = [{ head_id: tuitionHead?.head_id || null, head_name: familyHeadName, amount: combinedFamilyFee }];

            // ── Add Previous Balance for this family if plan has PB head ───────
            const famPB = pbPlanHead && fid && familyPBMap[fid] ? familyPBMap[fid] : 0;
            if (famPB > 0) {
                lineItems.push({ head_id: pbPlanHead.head_id, head_name: 'Previous Balance', amount: famPB });
                totalAmount += famPB;
            }

            if (extra_heads && extra_heads.length > 0)
                totalAmount += extra_heads.filter(h => h.amount && parseFloat(h.amount) > 0)
                    .reduce((s, h) => s + parseFloat(h.amount), 0);

            await insertSlip(primary, totalAmount, lineItems, true);
            generatedCount++;
        }

        // ─── INDIVIDUAL SLIPS: Solo students (no family or single-member family) ──
        for (const student of soloStudents) {
            const existing = await client.query(
                'SELECT slip_id FROM monthly_fee_slips WHERE student_id=$1 AND year=$2 AND month = ANY($3)',
                [student.student_id, year, monthsArray]
            );
            if (existing.rows.length > 0) { skippedCount++; continue; }

            const personalFee = parseFloat(student.personal_monthly_fee) || 0;
            const lineItems = buildLineItems(personalFee);
            let totalAmount = lineItems.reduce((s, h) => s + h.amount, 0);

            // ── Add Previous Balance for this student's family if plan has PB head ─
            const indivPB = pbPlanHead && student.family_id && familyPBMap[student.family_id]
                ? familyPBMap[student.family_id] : 0;
            if (indivPB > 0) {
                lineItems.push({ head_id: pbPlanHead.head_id, head_name: 'Previous Balance', amount: indivPB });
                totalAmount += indivPB;
            }

            if (extra_heads && extra_heads.length > 0)
                totalAmount += extra_heads.filter(h => h.amount && parseFloat(h.amount) > 0)
                    .reduce((s, h) => s + parseFloat(h.amount), 0);

            await insertSlip(student, totalAmount, lineItems, false);
            generatedCount++;
        }

        const coveredByFamilySlips = Object.values(familyGroups).reduce((s, m) => s + m.length, 0);
        const coveredByIndividual = soloStudents.length;

        await client.query('COMMIT');
        res.status(201).json({
            message: 'Fee slips generated',
            generated: generatedCount,
            skipped: skippedCount,
            total_students: studentsResult.rows.length,
            total_covered: coveredByFamilySlips + coveredByIndividual,
            family_slips: Object.keys(familyGroups).length,
            family_covered_students: coveredByFamilySlips,
            individual_slips: soloStudents.length
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// GET /fee-slips?class_id=&year=&month= (class_id optional, month optional)
router.get('/', async (req, res) => {
    try {
        const { class_id, month, year } = req.query;
        if (!year) return res.status(400).json({ error: 'year is required' });

        // Build WHERE conditions dynamically
        const params = [year];
        const monthClause  = month    ? `AND mfs.month = $${params.push(month)}`    : '';
        const classClause  = class_id
            ? `AND (
                mfs.class_id = $${params.push(class_id)}
                OR (
                  mfs.is_family_slip = TRUE
                  AND mfs.family_id IN (
                    SELECT family_id FROM students
                    WHERE class_id = $${params.length} AND status = 'Active' AND family_id IS NOT NULL
                  )
                )
              )`
            : '';

        const result = await pool.query(`
            SELECT mfs.*, s.first_name, s.last_name, s.admission_no, s.family_id,
                   s.father_name, s.father_phone, c.class_name,
                COALESCE(JSON_AGG(JSON_BUILD_OBJECT('item_id',sli.item_id,'head_name',sli.head_name,'amount',sli.amount,'note',sli.note) ORDER BY sli.item_id) FILTER (WHERE sli.item_id IS NOT NULL),'[]') as line_items
            FROM monthly_fee_slips mfs
            JOIN students s ON mfs.student_id = s.student_id
            LEFT JOIN classes c ON mfs.class_id = c.class_id
            LEFT JOIN slip_line_items sli ON mfs.slip_id = sli.slip_id
            WHERE mfs.year = $1
              ${monthClause}
              ${classClause}
            GROUP BY mfs.slip_id, s.first_name, s.last_name, s.admission_no, s.family_id,
                     s.father_name, s.father_phone, c.class_name
            ORDER BY mfs.month ASC, s.first_name ASC`, params);
        const stats = {
            total_students: result.rows.length,
            total_amount: result.rows.reduce((s, r) => s + parseFloat(r.total_amount), 0),
            paid_amount: result.rows.reduce((s, r) => s + parseFloat(r.paid_amount), 0),
            paid_count: result.rows.filter(r => r.status === 'paid').length,
            unpaid_count: result.rows.filter(r => r.status === 'unpaid').length,
            partial_count: result.rows.filter(r => r.status === 'partial').length,
        };

        // For family slips, attach all active students in this class that share the family_id
        const familySlipIds = result.rows
            .filter(r => r.is_family_slip && r.family_id)
            .map(r => r.family_id);
        if (familySlipIds.length > 0) {
            const membersResult = await pool.query(
                `SELECT s.student_id, s.first_name, s.last_name, s.admission_no, s.family_id,
                        c.class_name, c.class_id
                 FROM students s
                 LEFT JOIN classes c ON s.class_id = c.class_id
                 WHERE s.family_id = ANY($1) AND s.status = 'Active'
                 ORDER BY c.class_id DESC NULLS LAST, s.first_name`,
                [familySlipIds]
            );
            const membersMap = {};
            for (const m of membersResult.rows) {
                if (!membersMap[m.family_id]) membersMap[m.family_id] = [];
                membersMap[m.family_id].push(m);
            }
            for (const row of result.rows) {
                if (row.is_family_slip && row.family_id) {
                    row.family_members = membersMap[row.family_id] || [];
                } else {
                    row.family_members = [];
                }
            }
        }

        res.json({ slips: result.rows, stats });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ADMISSION FEE LEDGER — declared BEFORE /:id to avoid conflict
// ============================================================

// GET /fee-slips/admission-fees
router.get('/admission-fees', async (req, res) => {
    try {
        const { status, class_id } = req.query;
        let whereClause = '1=1';
        const params = [];
        if (status && status !== 'all') { params.push(status); whereClause += ` AND afl.status = $${params.length}`; }
        else if (!status) { whereClause += ` AND afl.status IN ('unpaid','partial')`; }
        if (class_id) { params.push(class_id); whereClause += ` AND s.class_id = $${params.length}`; }
        const result = await pool.query(`
            SELECT afl.ledger_id, afl.student_id, afl.total_amount, afl.paid_amount,
                (afl.total_amount - afl.paid_amount) AS remaining_amount, afl.status, afl.admission_date,
                s.first_name, s.last_name, s.admission_no, s.father_name, s.student_mobile, s.monthly_fee,
                c.class_name, sec.section_name
            FROM admission_fee_ledger afl
            JOIN students s ON afl.student_id = s.student_id
            LEFT JOIN classes c ON s.class_id = c.class_id
            LEFT JOIN sections sec ON s.section_id = sec.section_id
            WHERE ${whereClause}
            ORDER BY CASE afl.status WHEN 'unpaid' THEN 1 WHEN 'partial' THEN 2 ELSE 3 END, afl.admission_date DESC
        `, params);
        const statsResult = await pool.query(`
            SELECT COUNT(*) FILTER (WHERE status='unpaid') AS unpaid_count,
                   COUNT(*) FILTER (WHERE status='partial') AS partial_count,
                   COUNT(*) FILTER (WHERE status='paid') AS paid_count,
                   COALESCE(SUM(total_amount),0) AS total_billed,
                   COALESCE(SUM(paid_amount),0) AS total_collected,
                   COALESCE(SUM(total_amount-paid_amount),0) AS total_outstanding
            FROM admission_fee_ledger`);
        res.json({ ledgers: result.rows, stats: statsResult.rows[0] });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// GET /fee-slips/admission-fees/student/:student_id
router.get('/admission-fees/student/:student_id', async (req, res) => {
    try {
        const { student_id } = req.params;
        const ledger = await pool.query(`
            SELECT afl.*, (afl.total_amount - afl.paid_amount) AS remaining_amount,
                s.first_name, s.last_name, s.admission_no, s.monthly_fee, s.father_name,
                c.class_name, sec.section_name
            FROM admission_fee_ledger afl
            JOIN students s ON afl.student_id = s.student_id
            LEFT JOIN classes c ON s.class_id = c.class_id
            LEFT JOIN sections sec ON s.section_id = sec.section_id
            WHERE afl.student_id = $1`, [student_id]);
        if (ledger.rows.length === 0) return res.json({ ledger: null, payments: [] });
        const payments = await pool.query(`SELECT * FROM admission_fee_payments WHERE ledger_id=$1 ORDER BY payment_date DESC`, [ledger.rows[0].ledger_id]);
        res.json({ ledger: ledger.rows[0], payments: payments.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /fee-slips/admission-fees/:ledger_id/pay
router.post('/admission-fees/:ledger_id/pay', async (req, res) => {
    const client = await pool.connect();
    try {
        const { ledger_id } = req.params;
        const { amount_paid, payment_method, received_by, reference_no, notes, payment_date } = req.body;
        if (!amount_paid || parseFloat(amount_paid) <= 0)
            return res.status(400).json({ error: 'amount_paid must be greater than 0' });
        await client.query('BEGIN');
        const ledger = await client.query('SELECT * FROM admission_fee_ledger WHERE ledger_id=$1 FOR UPDATE', [ledger_id]);
        if (ledger.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Admission fee ledger not found' }); }
        const current = ledger.rows[0];
        const newPaid = parseFloat(current.paid_amount) + parseFloat(amount_paid);
        const total = parseFloat(current.total_amount);
        if (newPaid > total) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Overpayment not allowed. Remaining: Rs. ${(total - parseFloat(current.paid_amount)).toFixed(0)}` }); }
        const newStatus = newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
        await client.query(`INSERT INTO admission_fee_payments (ledger_id, amount_paid, payment_date, payment_method, received_by, reference_no, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [ledger_id, amount_paid, payment_date || new Date(), payment_method || 'cash', received_by, reference_no, notes]);
        const updated = await client.query(`UPDATE admission_fee_ledger SET paid_amount=$1, status=$2 WHERE ledger_id=$3 RETURNING *, (total_amount-paid_amount) AS remaining_amount`, [newPaid, newStatus, ledger_id]);
        await client.query('COMMIT');
        res.json({ message: `Payment of Rs. ${parseFloat(amount_paid).toFixed(0)} recorded`, ledger: updated.rows[0], status: newStatus });
    } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ error: err.message }); }
    finally { client.release(); }
});

// ============================================================
// PRINT QUEUE — family-grouped vouchers with print tracking
// GET /fee-slips/print-queue?month=&year=&class_id=
// ============================================================
router.get('/print-queue', async (req, res) => {
    const { month, year, class_id } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'month and year required' });
    try {
        // Fetch all slips for this month/year with student + class info + line items
        const result = await pool.query(`
            SELECT mfs.slip_id, mfs.student_id, mfs.family_id, mfs.class_id,
                   mfs.total_amount, mfs.paid_amount, mfs.status, mfs.due_date, mfs.issue_date,
                   mfs.is_printed, mfs.printed_at, mfs.is_family_slip,
                   s.first_name, s.last_name, s.admission_no, s.monthly_fee, s.father_name, s.family_id AS s_family_id,
                   c.class_name, c.class_id AS c_class_id,
                   COALESCE(JSON_AGG(
                       JSON_BUILD_OBJECT('item_id',sli.item_id,'head_name',sli.head_name,'amount',sli.amount,'note',sli.note)
                       ORDER BY sli.item_id
                   ) FILTER (WHERE sli.item_id IS NOT NULL), '[]') AS line_items
            FROM monthly_fee_slips mfs
            JOIN students s ON mfs.student_id = s.student_id
            LEFT JOIN classes c ON mfs.class_id = c.class_id
            LEFT JOIN slip_line_items sli ON mfs.slip_id = sli.slip_id
            WHERE mfs.month = $1 AND mfs.year = $2
            GROUP BY mfs.slip_id, mfs.student_id, mfs.family_id, mfs.class_id,
                     mfs.total_amount, mfs.paid_amount, mfs.status, mfs.due_date, mfs.issue_date,
                     mfs.is_printed, mfs.printed_at, mfs.is_family_slip,
                     s.first_name, s.last_name, s.admission_no, s.monthly_fee, s.father_name, s.family_id,
                     c.class_name, c.class_id
            ORDER BY s.family_id NULLS LAST, c.class_id DESC NULLS LAST, s.first_name
        `, [month, year]);

        const allSlips = result.rows;

        // Group by family_id
        const familyMap = {};
        const soloSlips = [];
        for (const slip of allSlips) {
            // Use is_family_slip flag — a student can have family_id but still get an individual slip
            // if they were the only active family member at generation time
            if (!slip.is_family_slip) {
                soloSlips.push(slip);
            } else {
                if (!familyMap[slip.family_id]) familyMap[slip.family_id] = [];
                familyMap[slip.family_id].push(slip);
            }
        }

        const vouchers = [];

        // Individual vouchers
        for (const slip of soloSlips) {
            vouchers.push({
                voucher_type: 'individual',
                primary: slip,
                siblings: [],
                family_id: slip.family_id || null,
                total_family_amount: parseFloat(slip.total_amount),
                total_paid: parseFloat(slip.paid_amount),
                is_printed: !!slip.is_printed,
                slip_ids: [slip.slip_id]
            });
        }

        // Family vouchers — primary = student in highest class (max class_id)
        for (const [fid, slips] of Object.entries(familyMap)) {
            slips.sort((a, b) => (b.c_class_id || 0) - (a.c_class_id || 0) || a.first_name.localeCompare(b.first_name));
            const primary = slips[0];
            const siblings = slips.slice(1);
            vouchers.push({
                voucher_type: 'family',
                family_id: fid,
                primary,
                siblings,
                total_family_amount: slips.reduce((s, x) => s + parseFloat(x.total_amount), 0),
                total_paid: slips.reduce((s, x) => s + parseFloat(x.paid_amount), 0),
                is_printed: slips.every(s => s.is_printed),
                partial_printed: slips.some(s => s.is_printed) && !slips.every(s => s.is_printed),
                slip_ids: slips.map(s => s.slip_id)
            });
        }

        // Fetch all active family members for family vouchers so the print shows all students
        const familyIds = vouchers.filter(v => v.voucher_type === 'family').map(v => v.family_id);
        if (familyIds.length > 0) {
            const membersResult = await pool.query(
                `SELECT s.student_id, s.first_name, s.last_name, s.father_name, s.family_id,
                        c.class_name, c.class_id
                 FROM students s
                 LEFT JOIN classes c ON s.class_id = c.class_id
                 WHERE s.family_id = ANY($1) AND s.status = 'Active'
                 ORDER BY c.class_id DESC NULLS LAST, s.first_name`,
                [familyIds]
            );
            const membersMap = {};
            for (const m of membersResult.rows) {
                if (!membersMap[m.family_id]) membersMap[m.family_id] = [];
                membersMap[m.family_id].push(m);
            }
            for (const v of vouchers) {
                if (v.voucher_type === 'family') {
                    v.family_members = membersMap[v.family_id] || [];
                }
            }
        }

        // If class_id filter: show vouchers where primary OR any family member is in this class
        // Track students in this class whose primary is in a DIFFERENT class (cross-class family)
        let filteredVouchers = vouchers;
        let coveredStudents = [];
        if (class_id) {
            filteredVouchers = vouchers.filter(v => {
                if (v.voucher_type === 'family') {
                    // Show family voucher in ANY class that has a member
                    return v.family_members?.some(
                        m => m.class_id?.toString() === class_id.toString()
                    ) || v.primary.class_id?.toString() === class_id.toString();
                }
                return v.primary.class_id?.toString() === class_id.toString();
            });
            // Covered students: family members in this class whose PRIMARY is in a different class
            for (const v of vouchers) {
                if (v.voucher_type === 'family' && v.primary.class_id?.toString() !== class_id.toString()) {
                    const inThisClass = (v.family_members || []).filter(
                        m => m.class_id?.toString() === class_id.toString()
                    );
                    for (const m of inThisClass) {
                        coveredStudents.push({ ...m, covered_by: v.primary });
                    }
                }
            }
        }

        // Sort: pending first, then by name
        filteredVouchers.sort((a, b) => {
            if (!a.is_printed && b.is_printed) return -1;
            if (a.is_printed && !b.is_printed) return 1;
            return (a.primary.first_name || '').localeCompare(b.primary.first_name || '');
        });

        res.json({
            vouchers: filteredVouchers,
            covered_students: coveredStudents,
            stats: {
                total_vouchers: filteredVouchers.length,
                printed: filteredVouchers.filter(v => v.is_printed).length,
                pending: filteredVouchers.filter(v => !v.is_printed).length,
                family_vouchers: filteredVouchers.filter(v => v.voucher_type === 'family').length,
            }
        });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// POST /fee-slips/mark-printed
router.post('/mark-printed', async (req, res) => {
    try {
        const { slip_ids } = req.body;
        if (!slip_ids || slip_ids.length === 0) return res.status(400).json({ error: 'slip_ids required' });
        await pool.query(
            `UPDATE monthly_fee_slips SET is_printed = TRUE, printed_at = NOW() WHERE slip_id = ANY($1)`,
            [slip_ids]
        );
        res.json({ message: `${slip_ids.length} slip(s) marked as printed` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// MONTHLY SLIP DETAIL & PAYMENT — after /admission-fees
// ============================================================

// GET /fee-slips/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const slip = await pool.query(`
            SELECT mfs.*, s.first_name, s.last_name, s.admission_no, c.class_name
            FROM monthly_fee_slips mfs
            JOIN students s ON mfs.student_id = s.student_id
            LEFT JOIN classes c ON mfs.class_id = c.class_id
            WHERE mfs.slip_id = $1`, [id]);
        if (slip.rows.length === 0) return res.status(404).json({ error: 'Slip not found' });
        const items = await pool.query('SELECT * FROM slip_line_items WHERE slip_id=$1 ORDER BY item_id', [id]);
        const payments = await pool.query('SELECT * FROM fee_payments WHERE slip_id=$1 ORDER BY payment_date DESC', [id]);
        res.json({ ...slip.rows[0], line_items: items.rows, payments: payments.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /fee-slips/:id/pay
router.post('/:id/pay', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { amount_paid, payment_method, received_by, reference_no, notes, payment_date } = req.body;
        await client.query('BEGIN');
        const slip = await client.query('SELECT * FROM monthly_fee_slips WHERE slip_id=$1 FOR UPDATE', [id]);
        if (slip.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Slip not found' }); }
        const cur = slip.rows[0];
        const prevPaid   = parseFloat(cur.paid_amount);
        const paidNow    = parseFloat(amount_paid);
        const newPaid    = prevPaid + paidNow;
        const total      = parseFloat(cur.total_amount);
        const newStatus  = newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

        // Record the payment itself
        await client.query(
            `INSERT INTO fee_payments (slip_id,amount_paid,payment_date,payment_method,received_by,reference_no,notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [id, paidNow, payment_date || new Date(), payment_method || 'cash', received_by, reference_no, notes]
        );
        const updated = await client.query(
            `UPDATE monthly_fee_slips SET paid_amount=$1, status=$2 WHERE slip_id=$3 RETURNING *`,
            [newPaid, newStatus, id]
        );

        // ── Previous Balance Waterfall ─────────────────────────────────────────
        // When prev_balance line is paid: 1) settle OPB first, 2) then oldest slips
        const pbItems = await client.query(
            `SELECT sli.amount, mfs.family_id
             FROM slip_line_items sli
             JOIN monthly_fee_slips mfs ON mfs.slip_id = sli.slip_id
             LEFT JOIN fee_heads fh ON fh.head_id = sli.head_id
             WHERE sli.slip_id = $1 AND (
                 fh.head_type = 'prev_balance'
                 OR sli.head_name ILIKE '%previous balance%'
                 OR sli.head_name ILIKE '%opening balance%'
             )`,
            [id]
        );
        if (pbItems.rows.length > 0 && pbItems.rows[0].family_id) {
            const pbAmount   = pbItems.rows.reduce((s, r) => s + parseFloat(r.amount), 0);
            const familyId   = pbItems.rows[0].family_id;
            const nonPbTotal = total - pbAmount;

            // How much of THIS payment went toward the prev_balance portion?
            const prevPbCollected = Math.max(0, prevPaid - nonPbTotal);
            const newPbCollected  = Math.max(0, Math.min(newPaid - nonPbTotal, pbAmount));
            let   pbThisPayment   = parseFloat((newPbCollected - prevPbCollected).toFixed(2));

            if (pbThisPayment > 0) {
                // ── Step 1: Settle OPB first (oldest debt, pre-system dues) ──────
                const fam = await client.query(
                    `SELECT opening_balance, opening_balance_paid FROM families WHERE family_id = $1 FOR UPDATE`,
                    [familyId]
                );
                if (fam.rows.length > 0) {
                    const opbTotal  = parseFloat(fam.rows[0].opening_balance) || 0;
                    const opbPaid   = parseFloat(fam.rows[0].opening_balance_paid) || 0;
                    const opbRemain = Math.max(0, opbTotal - opbPaid);
                    const opbSettle = parseFloat(Math.min(pbThisPayment, opbRemain).toFixed(2));
                    if (opbSettle > 0) {
                        await client.query(
                            `UPDATE families SET opening_balance_paid = opening_balance_paid + $1 WHERE family_id = $2`,
                            [opbSettle, familyId]
                        );
                        await client.query(
                            `INSERT INTO family_opb_payments
                                (family_id, amount, payment_date, payment_method, received_by, reference_no, notes)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [familyId, opbSettle, payment_date || new Date(),
                             payment_method || 'cash', received_by || null,
                             reference_no || null, `Auto via fee slip #${id}`]
                        );
                        pbThisPayment = parseFloat((pbThisPayment - opbSettle).toFixed(2));
                    }
                }

                // ── Step 2: Settle oldest unpaid previous slips (waterfall) ────
                // Exclude prev_balance + admission fee line items from each old slip's
                // total so we only settle actual fee amounts (no double-counting)
                if (pbThisPayment > 0) {
                    const oldSlips = await client.query(
                        `SELECT mfs.slip_id, mfs.total_amount, mfs.paid_amount,
                                COALESCE(excl.excl_sum, 0) AS excl_sum
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
                         WHERE mfs.family_id = $1
                           AND mfs.slip_id  != $2
                           AND mfs.status   != 'paid'
                           AND (mfs.year < $3 OR (mfs.year = $3 AND mfs.month < $4))
                         ORDER BY mfs.year ASC, mfs.month ASC`,
                        [familyId, id, cur.year, cur.month]
                    );
                    for (const old of oldSlips.rows) {
                        if (pbThisPayment <= 0) break;
                        const oldTotal = parseFloat(old.total_amount);
                        const oldPaid  = parseFloat(old.paid_amount);
                        const oldExcl  = parseFloat(old.excl_sum);
                        // Net fees owed = total minus prev_balance/admission lines, minus what's paid
                        const baseOwed = Math.max(0, (oldTotal - oldExcl) - oldPaid);
                        if (baseOwed > 0) {
                            const settle      = parseFloat(Math.min(pbThisPayment, baseOwed).toFixed(2));
                            const newOldPaid  = parseFloat((oldPaid + settle).toFixed(2));
                            const newOldStat  = newOldPaid >= oldTotal ? 'paid' : 'partial';
                            await client.query(
                                `UPDATE monthly_fee_slips SET paid_amount=$1, status=$2 WHERE slip_id=$3`,
                                [newOldPaid, newOldStat, old.slip_id]
                            );
                            pbThisPayment = parseFloat((pbThisPayment - settle).toFixed(2));
                        }
                    }
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        await client.query('COMMIT');
        res.json({ message: 'Payment recorded', slip: updated.rows[0] });
    } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ error: err.message }); }
    finally { client.release(); }
});

// DELETE /fee-slips/payments/:payment_id  — reverse / delete a single payment
router.delete('/payments/:payment_id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { payment_id } = req.params;
        await client.query('BEGIN');

        // Fetch the payment record
        const payment = await client.query('SELECT * FROM fee_payments WHERE payment_id=$1 FOR UPDATE', [payment_id]);
        if (payment.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found' });
        }
        const p = payment.rows[0];

        // Fetch full slip details (need family_id, month, year for OPB reversal)
        const slipRes = await client.query('SELECT * FROM monthly_fee_slips WHERE slip_id=$1', [p.slip_id]);
        if (slipRes.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Slip not found' }); }
        const slipData = slipRes.rows[0];

        // Delete the payment record
        await client.query('DELETE FROM fee_payments WHERE payment_id=$1', [payment_id]);

        // Recalculate paid_amount from remaining payments for this slip
        const remaining = await client.query(
            'SELECT COALESCE(SUM(amount_paid),0) AS total FROM fee_payments WHERE slip_id=$1',
            [p.slip_id]
        );
        const newPaid   = parseFloat(remaining.rows[0].total);
        const slipTotal = parseFloat(slipData.total_amount);
        const newStatus = newPaid >= slipTotal ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

        const updated = await client.query(
            'UPDATE monthly_fee_slips SET paid_amount=$1, status=$2 WHERE slip_id=$3 RETURNING *',
            [newPaid, newStatus, p.slip_id]
        );

        // ── Reverse OPB Waterfall ─────────────────────────────────────────────
        // When a payment was recorded, the waterfall may have:
        //   1. Updated families.opening_balance_paid  (inserted into family_opb_payments)
        //   2. Directly updated older slips' paid_amount/status (NO payment record created)
        // Both must be reversed/recomputed here so OPB page stays accurate.
        if (slipData.family_id) {
            // Check whether this slip has a prev_balance / opening-balance line item
            const pbAmtRes = await client.query(
                `SELECT COALESCE(SUM(sli.amount), 0) AS pb_total
                 FROM slip_line_items sli
                 LEFT JOIN fee_heads fh ON fh.head_id = sli.head_id
                 WHERE sli.slip_id = $1 AND (
                     fh.head_type = 'prev_balance'
                     OR sli.head_name ILIKE '%previous balance%'
                     OR sli.head_name ILIKE '%opening balance%'
                 )`, [p.slip_id]
            );
            const pbAmount = parseFloat(pbAmtRes.rows[0].pb_total) || 0;

            if (pbAmount > 0) {
                // ── Step 1: Remove all auto-OPB records created by any payment on this slip ──
                await client.query(
                    `DELETE FROM family_opb_payments
                     WHERE family_id = $1 AND notes LIKE $2`,
                    [slipData.family_id, `%Auto via fee slip #${p.slip_id}%`]
                );

                // ── Step 2: Reset opening_balance_paid to match only remaining records ──────
                // (other manual payments, other slips — NOT this slip any more)
                const opbSumRes = await client.query(
                    `SELECT COALESCE(SUM(amount), 0) AS total
                     FROM family_opb_payments WHERE family_id = $1`,
                    [slipData.family_id]
                );
                const opbFromOtherSources = parseFloat(opbSumRes.rows[0].total);
                await client.query(
                    `UPDATE families SET opening_balance_paid = $1 WHERE family_id = $2`,
                    [opbFromOtherSources, slipData.family_id]
                );

                // ── Step 3: Recompute what OPB this slip covers with REMAINING payments ──
                // nonPbTotal = what covers tuition + other heads (before PB portion starts)
                const nonPbTotal  = slipTotal - pbAmount;
                const opbContrib  = parseFloat(Math.max(0, Math.min(newPaid - nonPbTotal, pbAmount)).toFixed(2));

                if (opbContrib > 0) {
                    // How much OPB (opening_balance) is still outstanding after other sources?
                    const famRes = await client.query(
                        `SELECT COALESCE(opening_balance, 0) AS opb_total FROM families WHERE family_id = $1`,
                        [slipData.family_id]
                    );
                    if (famRes.rows.length > 0) {
                        const opbTotal  = parseFloat(famRes.rows[0].opb_total);
                        const opbRemain = Math.max(0, opbTotal - opbFromOtherSources);
                        const opbSettle = parseFloat(Math.min(opbContrib, opbRemain).toFixed(2));

                        if (opbSettle > 0) {
                            await client.query(
                                `INSERT INTO family_opb_payments
                                    (family_id, amount, payment_date, payment_method, received_by, reference_no, notes)
                                 VALUES ($1,$2,NOW(),'cash',NULL,NULL,$3)`,
                                [slipData.family_id, opbSettle, `Auto via fee slip #${p.slip_id}`]
                            );
                            await client.query(
                                `UPDATE families SET opening_balance_paid = opening_balance_paid + $1 WHERE family_id = $2`,
                                [opbSettle, slipData.family_id]
                            );
                        }
                    }
                }
                // If opbContrib = 0 (remaining payments don't reach PB portion): done.

                // ── Step 4: Reset older slips that waterfall may have marked paid/partial ───
                // The waterfall updates old slips' paid_amount directly (no fee_payments row).
                // Correct value = only what is in actual fee_payments for each old slip.
                const oldSlips = await client.query(
                    `SELECT slip_id, total_amount FROM monthly_fee_slips
                     WHERE family_id = $1
                       AND slip_id  != $2
                       AND (year < $3 OR (year = $3 AND month < $4))`,
                    [slipData.family_id, p.slip_id, slipData.year, slipData.month]
                );
                for (const old of oldSlips.rows) {
                    const actualRes = await client.query(
                        `SELECT COALESCE(SUM(amount_paid), 0) AS total FROM fee_payments WHERE slip_id = $1`,
                        [old.slip_id]
                    );
                    const correctPaid   = parseFloat(actualRes.rows[0].total);
                    const oldTotal      = parseFloat(old.total_amount);
                    const correctStatus = correctPaid >= oldTotal ? 'paid'
                                       : correctPaid > 0         ? 'partial' : 'unpaid';
                    await client.query(
                        `UPDATE monthly_fee_slips SET paid_amount=$1, status=$2 WHERE slip_id=$3`,
                        [correctPaid, correctStatus, old.slip_id]
                    );
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        await client.query('COMMIT');
        res.json({ message: 'Payment reversed successfully', slip: updated.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// DELETE /fee-slips/class/:class_id/month/:month/year/:year
router.delete('/class/:class_id/month/:month/year/:year', async (req, res) => {
    const client = await pool.connect();
    try {
        const { class_id, month, year } = req.params;
        await client.query('BEGIN');

        // Fetch all slips for this class+month+year
        const all = await client.query(
            `SELECT slip_id, status FROM monthly_fee_slips
             WHERE class_id = $1 AND month = $2 AND year = $3`,
            [class_id, month, year]
        );

        const paidSlips    = all.rows.filter(r => r.status === 'paid');
        const deleteable   = all.rows.filter(r => r.status !== 'paid');

        if (deleteable.length === 0) {
            await client.query('ROLLBACK');
            return res.json({
                deleted: 0,
                blocked_paid: paidSlips.length,
                message: paidSlips.length > 0
                    ? `Cannot undo: all ${paidSlips.length} slip(s) are already paid.`
                    : 'No slips found for this class/month/year.'
            });
        }

        const deleteIds = deleteable.map(r => r.slip_id);

        // Delete payments for partial slips first
        await client.query(
            `DELETE FROM fee_payments WHERE slip_id = ANY($1)`, [deleteIds]
        );
        // Delete line items
        await client.query(
            `DELETE FROM slip_line_items WHERE slip_id = ANY($1)`, [deleteIds]
        );
        // Delete the slips
        await client.query(
            `DELETE FROM monthly_fee_slips WHERE slip_id = ANY($1)`, [deleteIds]
        );

        await client.query('COMMIT');
        res.json({
            deleted: deleteIds.length,
            blocked_paid: paidSlips.length,
            message: paidSlips.length > 0
                ? `${deleteIds.length} slip(s) deleted. ${paidSlips.length} paid slip(s) were kept.`
                : `${deleteIds.length} slip(s) deleted successfully.`
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// PUT /fee-slips/:id  — edit slip line items and due date
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { line_items, due_date } = req.body;
        if (!line_items || line_items.length === 0) return res.status(400).json({ error: 'line_items required' });
        await client.query('BEGIN');
        const slip = await client.query('SELECT * FROM monthly_fee_slips WHERE slip_id=$1', [id]);
        if (slip.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Slip not found' }); }
        if (slip.rows[0].status === 'paid') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cannot edit a paid slip' }); }
        const newTotal = line_items.reduce((s, h) => s + (parseFloat(h.amount) || 0), 0);
        await client.query('DELETE FROM slip_line_items WHERE slip_id=$1', [id]);
        for (const item of line_items) {
            await client.query(
                `INSERT INTO slip_line_items (slip_id, head_id, head_name, amount, note) VALUES ($1,$2,$3,$4,$5)`,
                [id, item.head_id || null, item.head_name, parseFloat(item.amount) || 0, item.note || null]
            );
        }
        const updated = await client.query(
            `UPDATE monthly_fee_slips SET total_amount=$1, due_date=$2 WHERE slip_id=$3 RETURNING *`,
            [newTotal, due_date || null, id]
        );
        await client.query('COMMIT');
        res.json({ message: 'Slip updated', slip: updated.rows[0] });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
    finally { client.release(); }
});

module.exports = router;
