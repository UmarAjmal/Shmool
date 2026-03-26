const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─── 1. Student Report (class & section wise) ───────────────────────────────
router.get('/students', async (req, res) => {
    try {
        const { class_id, section_id } = req.query;

        let query = `
            SELECT
                s.student_id,
                s.admission_no,
                s.roll_no,
                CONCAT(s.first_name, ' ', s.last_name) AS student_name,
                s.gender,
                s.father_name,
                s.father_phone,
                LOWER(s.status) AS status,
                c.class_name,
                sec.section_name,
                s.admission_date,
                s.monthly_fee
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.class_id
            LEFT JOIN sections sec ON s.section_id = sec.section_id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (class_id) { query += ` AND s.class_id = $${idx++}`; params.push(class_id); }
        if (section_id) { query += ` AND s.section_id = $${idx++}`; params.push(section_id); }

        query += ` ORDER BY c.class_name, sec.section_name, s.first_name, s.last_name`;

        const result = await pool.query(query, params);

        // Summary counts
        const total = result.rows.length;
        const active = result.rows.filter(r => r.status === 'active').length;
        const inactive = total - active;

        res.json({ students: result.rows, summary: { total, active, inactive } });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── 2. Results Report (class & section wise) ────────────────────────────────
router.get('/results', async (req, res) => {
    try {
        const { class_id, section_id, academic_year_id, term_id } = req.query;

        if (!academic_year_id) {
            return res.status(400).json({ error: 'academic_year_id is required' });
        }

        const params = [academic_year_id];
        let idx = 2;

        // Build the JOIN condition for exam_marks
        let emJoinCondition = `em.academic_year_id = $1`;
        if (term_id) {
            emJoinCondition += ` AND em.term_id = $${idx}`;
            params.push(term_id);
            idx++;
        }

        let query = `
            SELECT
                s.student_id,
                s.admission_no,
                s.roll_no,
                CONCAT(s.first_name, ' ', s.last_name) AS student_name,
                c.class_name,
                sec.section_name,
                COALESCE(SUM(em.obtained_marks), 0) AS obtained_marks,
                COALESCE(SUM(em.total_marks), 0) AS total_marks,
                CASE
                    WHEN COALESCE(SUM(em.total_marks), 0) > 0
                    THEN ROUND((COALESCE(SUM(em.obtained_marks), 0) * 100.0 / COALESCE(SUM(em.total_marks), 0)), 2)
                    ELSE 0
                END AS percentage,
                CASE
                    WHEN COALESCE(SUM(em.total_marks), 0) = 0 THEN 'N/A'
                    WHEN ROUND((COALESCE(SUM(em.obtained_marks), 0) * 100.0 / COALESCE(SUM(em.total_marks), 0)), 2) >= 80 THEN 'A+'
                    WHEN ROUND((COALESCE(SUM(em.obtained_marks), 0) * 100.0 / COALESCE(SUM(em.total_marks), 0)), 2) >= 70 THEN 'A'
                    WHEN ROUND((COALESCE(SUM(em.obtained_marks), 0) * 100.0 / COALESCE(SUM(em.total_marks), 0)), 2) >= 60 THEN 'B'
                    WHEN ROUND((COALESCE(SUM(em.obtained_marks), 0) * 100.0 / COALESCE(SUM(em.total_marks), 0)), 2) >= 50 THEN 'C'
                    WHEN ROUND((COALESCE(SUM(em.obtained_marks), 0) * 100.0 / COALESCE(SUM(em.total_marks), 0)), 2) >= 40 THEN 'D'
                    ELSE 'F'
                END AS grade
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.class_id
            LEFT JOIN sections sec ON s.section_id = sec.section_id
            LEFT JOIN exam_marks em ON em.student_id = s.student_id AND ${emJoinCondition}
            WHERE LOWER(s.status) = 'active'
        `;

        if (class_id)   { query += ` AND s.class_id = $${idx++}`;   params.push(class_id); }
        if (section_id) { query += ` AND s.section_id = $${idx++}`; params.push(section_id); }

        query += ` GROUP BY s.student_id, s.admission_no, s.roll_no, s.first_name, s.last_name, c.class_name, sec.section_name`;
        query += ` ORDER BY c.class_name, sec.section_name, s.first_name`;

        const result = await pool.query(query, params);
        res.json({ results: result.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── 3. Expense Report ───────────────────────────────────────────────────────
router.get('/expenses', async (req, res) => {
    try {
        const { from_date, to_date, category_id } = req.query;

        let query = `
            SELECT
                e.expense_id,
                e.expense_title,
                e.amount,
                e.expense_date,
                e.payment_method,
                e.paid_to,
                e.status,
                ec.category_name
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.category_id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (from_date) { query += ` AND e.expense_date >= $${idx++}`; params.push(from_date); }
        if (to_date)   { query += ` AND e.expense_date <= $${idx++}`; params.push(to_date); }
        if (category_id) { query += ` AND e.category_id = $${idx++}`; params.push(category_id); }

        query += ` ORDER BY e.expense_date DESC`;

        const result = await pool.query(query, params);

        // Category-wise summary
        const summaryMap = {};
        let grandTotal = 0;
        result.rows.forEach(r => {
            const cat = r.category_name || 'Uncategorized';
            if (!summaryMap[cat]) summaryMap[cat] = 0;
            summaryMap[cat] += parseFloat(r.amount || 0);
            grandTotal += parseFloat(r.amount || 0);
        });

        const categorySummary = Object.entries(summaryMap).map(([category, total]) => ({ category, total }));

        res.json({ expenses: result.rows, categorySummary, grandTotal });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── 4. Fee Heads (for family-fee filter dropdown) ──────────────────────────
router.get('/fee-heads', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT head_id, head_name, head_type FROM fee_heads WHERE is_active = true ORDER BY head_name`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── 5. Expense Categories (for filter dropdown) ─────────────────────────────
router.get('/expense-categories', async (req, res) => {
    try {
        const result = await pool.query(`SELECT category_id, category_name FROM expense_categories WHERE is_active = true ORDER BY category_name`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── 6. Family Fee Report (monthly, head-wise & collective) ──────────────────
router.get('/family-fee', async (req, res) => {
    try {
        const { month, year, class_id, section_id, status, head_id } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: 'month and year are required' });
        }

        // Get slips with student/family info
        // If head_id filter applied, only return slips that have that fee head
        let slipQuery = `
            SELECT DISTINCT
                ms.slip_id,
                ms.student_id,
                ms.family_id,
                ms.month,
                ms.year,
                ms.total_amount,
                ms.paid_amount,
                ms.status,
                ms.due_date,
                CONCAT(s.first_name, ' ', s.last_name) AS student_name,
                s.admission_no,
                f.family_name,
                c.class_name,
                sec.section_name
            FROM monthly_fee_slips ms
            LEFT JOIN students s ON ms.student_id = s.student_id
            LEFT JOIN families f ON ms.family_id = f.family_id
            LEFT JOIN classes c ON s.class_id = c.class_id
            LEFT JOIN sections sec ON s.section_id = sec.section_id
            WHERE ms.month = $1 AND ms.year = $2
        `;
        const params = [month, year];
        let idx = 3;

        if (class_id)  { slipQuery += ` AND s.class_id = $${idx++}`;   params.push(class_id); }
        if (section_id){ slipQuery += ` AND s.section_id = $${idx++}`; params.push(section_id); }
        if (status)    { slipQuery += ` AND ms.status = $${idx++}`;    params.push(status); }
        if (head_id)   {
            slipQuery += ` AND EXISTS (
                SELECT 1 FROM slip_line_items sli2
                WHERE sli2.slip_id = ms.slip_id AND sli2.head_id = $${idx++}
            )`;
            params.push(head_id);
        }

        slipQuery += ` ORDER BY class_name, section_name, student_name`;

        const slipsResult = await pool.query(slipQuery, params);
        const slips = slipsResult.rows;

        if (slips.length === 0) {
            return res.json({ slips: [], headSummary: [], collective: { total_billed: 0, total_collected: 0, total_pending: 0 } });
        }

        // Get head-wise breakdown for matching slips
        const slipIds = slips.map(s => s.slip_id);
        const lineQuery = `
            SELECT
                sli.slip_id,
                sli.head_id,
                sli.head_name,
                sli.amount
            FROM slip_line_items sli
            WHERE sli.slip_id = ANY($1::int[])
        `;
        const lineResult = await pool.query(lineQuery, [slipIds]);

        // Attach line items to slips
        const lineMap = {};
        lineResult.rows.forEach(li => {
            if (!lineMap[li.slip_id]) lineMap[li.slip_id] = [];
            lineMap[li.slip_id].push(li);
        });
        slips.forEach(s => { s.line_items = lineMap[s.slip_id] || []; });

        // Head-wise summary
        const headMap = {};
        lineResult.rows.forEach(li => {
            if (!headMap[li.head_name]) headMap[li.head_name] = 0;
            headMap[li.head_name] += parseFloat(li.amount || 0);
        });
        const headSummary = Object.entries(headMap).map(([head_name, total]) => ({ head_name, total })).sort((a, b) => b.total - a.total);

        // Collective summary
        const total_billed    = slips.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
        const total_collected = slips.reduce((sum, s) => sum + parseFloat(s.paid_amount || 0), 0);
        const total_pending   = total_billed - total_collected;

        res.json({
            slips,
            headSummary,
            collective: { total_billed, total_collected, total_pending }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
