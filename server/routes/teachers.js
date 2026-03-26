const router = require('express').Router();
const pool = require('../db');

// ==========================================
// TEACHERS API (Filtered Employees View)
// ==========================================

// Get All Teachers
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                e.*,
                d.department_name,
                u.username as system_username,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'subject_id', s.subject_id,
                            'subject_name', s.subject_name,
                            'assignment_id', tsa.assignment_id
                        )
                    ) FILTER (WHERE s.subject_id IS NOT NULL), 
                    '[]'
                ) as assigned_subjects,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'class_id', c.class_id,
                            'class_name', c.class_name,
                            'section_id', sec.section_id,
                            'section_name', sec.section_name,
                            'is_class_teacher', tca.is_class_teacher,
                            'assignment_id', tca.assignment_id
                        )
                    ) FILTER (WHERE c.class_id IS NOT NULL),
                    '[]'
                ) as assigned_classes
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN app_users u ON e.app_user_id = u.id
            LEFT JOIN teacher_subject_assignment tsa ON e.employee_id = tsa.employee_id
            LEFT JOIN subjects s ON tsa.subject_id = s.subject_id
            LEFT JOIN teacher_class_assignment tca ON e.employee_id = tca.employee_id
            LEFT JOIN classes c ON tca.class_id = c.class_id
            LEFT JOIN sections sec ON tca.section_id = sec.section_id
            WHERE 
                e.designation ILIKE '%teacher%' 
                OR d.department_name = 'Teaching Staff'
            GROUP BY e.employee_id, d.department_name, u.username
            ORDER BY e.first_name ASC
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching teachers:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// Get Single Teacher with Full Details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                e.*,
                d.department_name,
                u.username as system_username,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'subject_id', s.subject_id,
                            'subject_name', s.subject_name,
                            'assignment_id', tsa.assignment_id
                        )
                    ) FILTER (WHERE s.subject_id IS NOT NULL),
                    '[]'
                ) as assigned_subjects,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'class_id', c.class_id,
                            'class_name', c.class_name,
                            'section_id', sec.section_id,
                            'section_name', sec.section_name,
                            'is_class_teacher', tca.is_class_teacher,
                            'assignment_id', tca.assignment_id
                        )
                    ) FILTER (WHERE c.class_id IS NOT NULL),
                    '[]'
                ) as assigned_classes
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN app_users u ON e.app_user_id = u.id
            LEFT JOIN teacher_subject_assignment tsa ON e.employee_id = tsa.employee_id
            LEFT JOIN subjects s ON tsa.subject_id = s.subject_id
            LEFT JOIN teacher_class_assignment tca ON e.employee_id = tca.employee_id
            LEFT JOIN classes c ON tca.class_id = c.class_id
            LEFT JOIN sections sec ON tca.section_id = sec.section_id
            WHERE e.employee_id = $1
            GROUP BY e.employee_id, d.department_name, u.username
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Teacher not found" });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching teacher:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// Assign Subject to Teacher
router.post('/:id/subjects', async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_id, academic_year } = req.body;
        
        const year = academic_year || new Date().getFullYear().toString();
        
        const result = await pool.query(
            `INSERT INTO teacher_subject_assignment (employee_id, subject_id, academic_year) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (employee_id, subject_id, academic_year) DO NOTHING
             RETURNING *`,
            [id, subject_id, year]
        );
        
        res.json(result.rows[0] || { message: "Already assigned" });
    } catch (err) {
        console.error("Error assigning subject:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// Remove Subject Assignment
router.delete('/:id/subjects/:assignmentId', async (req, res) => {
    try {
        const { assignmentId } = req.params;
        
        await pool.query(
            "DELETE FROM teacher_subject_assignment WHERE assignment_id = $1",
            [assignmentId]
        );
        
        res.json({ message: "Subject assignment removed" });
    } catch (err) {
        console.error("Error removing subject:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// Assign Class/Section to Teacher
router.post('/:id/classes', async (req, res) => {
    try {
        const { id } = req.params;
        const { class_id, section_id, is_class_teacher, academic_year } = req.body;
        
        const year = academic_year || new Date().getFullYear().toString();
        
        // If setting as class teacher, remove other class teachers for this class-section
        if (is_class_teacher) {
            await pool.query(
                `UPDATE teacher_class_assignment 
                 SET is_class_teacher = FALSE 
                 WHERE class_id = $1 AND section_id = $2 AND academic_year = $3`,
                [class_id, section_id || null, year]
            );
        }
        
        const result = await pool.query(
            `INSERT INTO teacher_class_assignment 
             (employee_id, class_id, section_id, is_class_teacher, academic_year) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (employee_id, class_id, section_id, academic_year) 
             DO UPDATE SET is_class_teacher = $4
             RETURNING *`,
            [id, class_id, section_id || null, is_class_teacher || false, year]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error assigning class:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// Remove Class Assignment
router.delete('/:id/classes/:assignmentId', async (req, res) => {
    try {
        const { assignmentId } = req.params;
        
        await pool.query(
            "DELETE FROM teacher_class_assignment WHERE assignment_id = $1",
            [assignmentId]
        );
        
        res.json({ message: "Class assignment removed" });
    } catch (err) {
        console.error("Error removing class:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// Update Teacher-Specific Info
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_specialization, qualification, teaching_experience } = req.body;
        
        const result = await pool.query(
            `UPDATE employees 
             SET subject_specialization = $1, 
                 qualification = $2, 
                 teaching_experience = $3
             WHERE employee_id = $4
             RETURNING *`,
            [subject_specialization, qualification, teaching_experience, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Teacher not found" });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating teacher:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;
