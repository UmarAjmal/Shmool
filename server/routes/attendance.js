const express = require('express');
const router = express.Router();
const pool = require('../db');

// ═══════════════════════════════════════════════
//  STUDENT ATTENDANCE
// ═══════════════════════════════════════════════

// GET /attendance/students/daily?class_id=&date=
// Returns all students in a class with their attendance status for the given date
router.get('/students/daily', async (req, res) => {
    try {
        const { class_id, date } = req.query;
        if (!class_id || !date) return res.status(400).json({ error: 'class_id and date required' });

        const result = await pool.query(
            `SELECT s.student_id, s.first_name, s.last_name, s.admission_no, s.roll_no,
                    c.class_name, c.class_id,
                    sa.attendance_id, sa.status, sa.remarks, sa.attendance_date
             FROM students s
             LEFT JOIN classes c ON s.class_id = c.class_id
             LEFT JOIN student_attendance sa ON sa.student_id = s.student_id AND sa.attendance_date = $2
             WHERE s.class_id = $1 AND s.status = 'Active'
             ORDER BY s.roll_no NULLS LAST, s.first_name`,
            [class_id, date]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /attendance/students/daily   — upsert bulk attendance
// body: { class_id, date, records: [{student_id, status, remarks}] }
router.post('/students/daily', async (req, res) => {
    const client = await pool.connect();
    try {
        const { class_id, date, records } = req.body;
        if (!date || !records || !Array.isArray(records) || records.length === 0)
            return res.status(400).json({ error: 'date and records[] required' });

        await client.query('BEGIN');
        let saved = 0;
        for (const r of records) {
            await client.query(
                `INSERT INTO student_attendance (student_id, class_id, attendance_date, status, remarks)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (student_id, attendance_date)
                 DO UPDATE SET status=$4, remarks=$5, class_id=$2`,
                [r.student_id, class_id, date, r.status, r.remarks || null]
            );
            saved++;
        }
        await client.query('COMMIT');
        res.json({ message: `${saved} attendance record(s) saved`, saved });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// GET /attendance/students/history?class_id=&month=&year=
// Returns attendance for entire class for a month
router.get('/students/history', async (req, res) => {
    try {
        const { class_id, month, year } = req.query;
        if (!class_id || !month || !year) return res.status(400).json({ error: 'class_id, month, year required' });

        // All active students in class
        const students = await pool.query(
            `SELECT s.student_id, s.first_name, s.last_name, s.roll_no, s.admission_no
             FROM students s WHERE s.class_id = $1 AND s.status = 'Active'
             ORDER BY s.roll_no NULLS LAST, s.first_name`,
            [class_id]
        );

        // All attendance records for this class in this month
        const attendance = await pool.query(
            `SELECT sa.student_id, sa.attendance_date, sa.status, sa.remarks
             FROM student_attendance sa
             WHERE sa.class_id = $1
               AND EXTRACT(MONTH FROM sa.attendance_date) = $2
               AND EXTRACT(YEAR FROM sa.attendance_date) = $3
             ORDER BY sa.attendance_date`,
            [class_id, month, year]
        );

        // Working days in that month (distinct dates that had any record)
        const datesResult = await pool.query(
            `SELECT DISTINCT attendance_date FROM student_attendance
             WHERE class_id = $1
               AND EXTRACT(MONTH FROM attendance_date) = $2
               AND EXTRACT(YEAR FROM attendance_date) = $3
             ORDER BY attendance_date`,
            [class_id, month, year]
        );
        const workingDates = datesResult.rows.map(r => r.attendance_date.toISOString().split('T')[0]);

        // Build per-student map
        const attMap = {};
        for (const a of attendance.rows) {
            const sid = a.student_id;
            const d = a.attendance_date.toISOString().split('T')[0];
            if (!attMap[sid]) attMap[sid] = {};
            attMap[sid][d] = a.status;
        }

        const rows = students.rows.map(s => {
            const rec = attMap[s.student_id] || {};
            const present = Object.values(rec).filter(v => v === 'Present').length;
            const late    = Object.values(rec).filter(v => v === 'Late').length;
            const absent  = Object.values(rec).filter(v => v === 'Absent').length;
            const leave   = Object.values(rec).filter(v => v === 'Leave').length;
            return { ...s, daily: rec, present, late, absent, leave, total_days: workingDates.length };
        });

        res.json({ students: rows, working_dates: workingDates });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /attendance/students/:student_id/history?month=&year=
// Individual student history (for profile page)
router.get('/students/:student_id/history', async (req, res) => {
    try {
        const { student_id } = req.params;
        const { month, year } = req.query;

        let whereExtra = '';
        const params = [student_id];
        if (month && year) {
            params.push(month, year);
            whereExtra = `AND EXTRACT(MONTH FROM sa.attendance_date) = $2 AND EXTRACT(YEAR FROM sa.attendance_date) = $3`;
        }

        const result = await pool.query(
            `SELECT sa.attendance_id, sa.attendance_date, sa.status, sa.remarks,
                    c.class_name
             FROM student_attendance sa
             LEFT JOIN classes c ON sa.class_id = c.class_id
             WHERE sa.student_id = $1 ${whereExtra}
             ORDER BY sa.attendance_date DESC`,
            params
        );

        const records = result.rows;
        const stats = {
            present: records.filter(r => r.status === 'Present').length,
            absent:  records.filter(r => r.status === 'Absent').length,
            late:    records.filter(r => r.status === 'Late').length,
            leave:   records.filter(r => r.status === 'Leave').length,
            total:   records.length,
        };
        res.json({ records, stats });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
//  STAFF ATTENDANCE
// ═══════════════════════════════════════════════

// GET /attendance/staff/daily?date=&department_id=
router.get('/staff/daily', async (req, res) => {
    try {
        const { date, department_id } = req.query;
        if (!date) return res.status(400).json({ error: 'date required' });

        let whereClause = 'WHERE e.status = $2';
        const params = [date, 'Active'];
        if (department_id) { params.push(department_id); whereClause += ` AND e.department_id = $${params.length}`; }

        const result = await pool.query(
            `SELECT e.employee_id, e.first_name, e.last_name, e.designation,
                    d.department_name,
                    sa.attendance_id, sa.status, sa.check_in_time, sa.check_out_time, sa.remarks, sa.attendance_date
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.department_id
             LEFT JOIN staff_attendance sa ON sa.employee_id = e.employee_id AND sa.attendance_date = $1
             ${whereClause}
             ORDER BY d.department_name NULLS LAST, e.first_name`,
            params
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /attendance/staff/daily
// body: { date, records: [{employee_id, status, check_in_time, check_out_time, remarks}] }
router.post('/staff/daily', async (req, res) => {
    const client = await pool.connect();
    try {
        const { date, records } = req.body;
        if (!date || !records || !Array.isArray(records) || records.length === 0)
            return res.status(400).json({ error: 'date and records[] required' });

        await client.query('BEGIN');
        let saved = 0;
        for (const r of records) {
            await client.query(
                `INSERT INTO staff_attendance (employee_id, attendance_date, status, check_in_time, check_out_time, remarks)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (employee_id, attendance_date)
                 DO UPDATE SET status=$3, check_in_time=$4, check_out_time=$5, remarks=$6`,
                [r.employee_id, date, r.status, r.check_in_time || null, r.check_out_time || null, r.remarks || null]
            );
            saved++;
        }
        await client.query('COMMIT');
        res.json({ message: `${saved} staff attendance record(s) saved`, saved });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// GET /attendance/staff/history?month=&year=&department_id=
router.get('/staff/history', async (req, res) => {
    try {
        const { month, year, department_id } = req.query;
        if (!month || !year) return res.status(400).json({ error: 'month and year required' });

        let empWhere = `WHERE e.status = 'Active'`;
        const empParams = [];
        if (department_id) { empParams.push(department_id); empWhere += ` AND e.department_id = $1`; }

        const employees = await pool.query(
            `SELECT e.employee_id, e.first_name, e.last_name, e.designation,
                    d.department_name
             FROM employees e LEFT JOIN departments d ON e.department_id = d.department_id
             ${empWhere}
             ORDER BY d.department_name NULLS LAST, e.first_name`,
            empParams
        );

        const attParams = [month, year];
        let attWhere = '';
        if (department_id) { attParams.push(department_id); attWhere = ` AND e.department_id = $3`; }

        const attendance = await pool.query(
            `SELECT sa.employee_id, sa.attendance_date, sa.status
             FROM staff_attendance sa
             JOIN employees e ON sa.employee_id = e.employee_id
             WHERE EXTRACT(MONTH FROM sa.attendance_date) = $1
               AND EXTRACT(YEAR FROM sa.attendance_date) = $2
               ${attWhere}
             ORDER BY sa.attendance_date`,
            attParams
        );

        const datesResult = await pool.query(
            `SELECT DISTINCT sa.attendance_date FROM staff_attendance sa
             JOIN employees e ON sa.employee_id = e.employee_id
             WHERE EXTRACT(MONTH FROM sa.attendance_date) = $1 AND EXTRACT(YEAR FROM sa.attendance_date) = $2
             ORDER BY sa.attendance_date`,
            [month, year]
        );
        const workingDates = datesResult.rows.map(r => r.attendance_date.toISOString().split('T')[0]);

        const attMap = {};
        for (const a of attendance.rows) {
            const eid = a.employee_id;
            const d = a.attendance_date.toISOString().split('T')[0];
            if (!attMap[eid]) attMap[eid] = {};
            attMap[eid][d] = a.status;
        }

        const rows = employees.rows.map(e => {
            const rec = attMap[e.employee_id] || {};
            const present = Object.values(rec).filter(v => v === 'Present').length;
            const late    = Object.values(rec).filter(v => v === 'Late').length;
            const absent  = Object.values(rec).filter(v => v === 'Absent').length;
            const leave   = Object.values(rec).filter(v => v === 'Leave').length;
            return { ...e, daily: rec, present, late, absent, leave, total_days: workingDates.length };
        });

        res.json({ staff: rows, working_dates: workingDates });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /attendance/staff/:employee_id/history?month=&year=
router.get('/staff/:employee_id/history', async (req, res) => {
    try {
        const { employee_id } = req.params;
        const { month, year } = req.query;

        let whereExtra = '';
        const params = [employee_id];
        if (month && year) {
            params.push(month, year);
            whereExtra = `AND EXTRACT(MONTH FROM sa.attendance_date) = $2 AND EXTRACT(YEAR FROM sa.attendance_date) = $3`;
        }

        const result = await pool.query(
            `SELECT sa.attendance_id, sa.attendance_date, sa.status,
                    sa.check_in_time, sa.check_out_time, sa.remarks
             FROM staff_attendance sa
             WHERE sa.employee_id = $1 ${whereExtra}
             ORDER BY sa.attendance_date DESC`,
            params
        );

        const records = result.rows;
        const stats = {
            present: records.filter(r => r.status === 'Present').length,
            absent:  records.filter(r => r.status === 'Absent').length,
            late:    records.filter(r => r.status === 'Late').length,
            leave:   records.filter(r => r.status === 'Leave').length,
            total:   records.length,
        };
        res.json({ records, stats });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /attendance/departments  — helper for filter dropdown
router.get('/departments', async (req, res) => {
    try {
        const result = await pool.query('SELECT department_id, department_name FROM departments ORDER BY department_name');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
