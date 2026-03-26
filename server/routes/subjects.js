const router = require('express').Router();
const pool = require('../db');

// ==========================================
// SUBJECTS API
// ==========================================

// List All Subjects
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                sub.subject_id, sub.subject_name, sub.subject_code, sub.section_id,
                s.section_name, 
                s.class_id,
                c.class_name
            FROM subjects sub
            JOIN sections s ON sub.section_id = s.section_id
            JOIN classes c ON s.class_id = c.class_id
            ORDER BY c.class_name, s.section_name, sub.subject_name
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error: " + err.message });
    }
});

// Create Subject (Supports Multiple Sections)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { subject_name, subject_code, section_ids } = req.body; 
        
        if (!section_ids || !Array.isArray(section_ids) || section_ids.length === 0) {
            return res.status(400).json({ error: "Please select at least one section" });
        }

        await client.query('BEGIN');

        const insertedSubjects = [];

        for (const section_id of section_ids) {
            const text = `
                INSERT INTO subjects (subject_name, subject_code, section_id) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (section_id, subject_name) DO NOTHING
                RETURNING *
            `;
            const dbRes = await client.query(text, [subject_name, subject_code, section_id]);
            if (dbRes.rows[0]) insertedSubjects.push(dbRes.rows[0]);
        }

        await client.query('COMMIT');
        
        res.json({ message: "Subjects processed", count: insertedSubjects.length, data: insertedSubjects });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: "Server Error: " + err.message });
    } finally {
        client.release();
    }
});

// Update Subject
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_name, subject_code, section_id } = req.body;
        
        await pool.query(
            `UPDATE subjects 
             SET subject_name = $1, subject_code = $2, section_id = $3 
             WHERE subject_id = $4`,
            [subject_name, subject_code, section_id, id]
        );
        
        res.json("Subject updated");
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Subject Name already exists in this section" });
        }
        console.error(err.message);
        res.status(500).json({ error: "Server Error: " + err.message });
    }
});

// Delete Subject
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM subjects WHERE subject_id = $1", [id]);
        res.json("Subject deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error: " + err.message });
    }
});

module.exports = router;
