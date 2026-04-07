const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server', 'routes', 'fee-slips.js');
let code = fs.readFileSync(file, 'utf-8');

const newRoute = \
// GET /fee-slips/family-summary/:student_id
router.get('/family-summary/:student_id', async (req, res) => {
    try {
        const { student_id } = req.params;
        const famRes = await pool.query('SELECT family_id FROM students WHERE student_id = ', [student_id]);
        if (famRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        
        const family_id = famRes.rows[0].family_id;
        if (!family_id) return res.json({ slips: [] });

        const query = \\\
            SELECT 
                mfs.slip_id, mfs.month, mfs.year, mfs.total_amount, mfs.paid_amount, mfs.status,
                s.first_name, s.last_name, s.admission_no,
                (
                    SELECT json_agg(json_build_object('head_name', sli.head_name, 'amount', sli.amount))
                    FROM slip_line_items sli WHERE sli.slip_id = mfs.slip_id
                ) as heads
            FROM monthly_fee_slips mfs
            JOIN students s ON mfs.student_id = s.student_id
            WHERE mfs.family_id = 
            ORDER BY mfs.year DESC, mfs.month DESC, s.admission_no ASC
        \\\;
        const result = await pool.query(query, [family_id]);
        
        // Let's structure it by month+year
        const summary = {};
        result.rows.forEach(row => {
            const myKey = \\\\\\-\\\\\\;
            if (!summary[myKey]) {
                summary[myKey] = {
                    month: row.month,
                    year: row.year,
                    family_total_billed: 0,
                    family_total_paid: 0,
                    status: 'unpaid',
                    students: []
                };
            }
            summary[myKey].family_total_billed += Number(row.total_amount);
            summary[myKey].family_total_paid += Number(row.paid_amount);
            summary[myKey].students.push({
                name: row.first_name + ' ' + row.last_name,
                admission_no: row.admission_no,
                billed: Number(row.total_amount),
                paid: Number(row.paid_amount),
                status: row.status,
                heads: row.heads || []
            });
        });

        // Determine overall status for each month
        Object.values(summary).forEach(m => {
            if (m.family_total_paid === 0) m.status = 'unpaid';
            else if (m.family_total_paid >= m.family_total_billed) m.status = 'paid';
            else m.status = 'partial';
        });

        // Convert dictionary to array
        const slips = Object.values(summary).sort((a,b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
        });

        res.json({ slips });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
\;

code = code.replace('module.exports = router;', newRoute);
fs.writeFileSync(file, code);
console.log('Added family-summary endpoint');
