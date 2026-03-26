const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all fee plans (with classes)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT fp.*,
                fp.applies_to_all,
                (
                    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('class_id', c.class_id, 'class_name', c.class_name) ORDER BY c.class_name), '[]')
                    FROM fee_plan_classes fpc
                    JOIN classes c ON fpc.class_id = c.class_id
                    WHERE fpc.plan_id = fp.plan_id
                ) AS classes,
                (
                    SELECT COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', fph.id,
                                'head_id', fph.head_id,
                                'head_name', fh.head_name,
                                'head_type', fh.head_type,
                                'frequency', fh.frequency,
                                'amount', fph.amount
                            ) ORDER BY fh.head_name
                        ),
                        '[]'
                    )
                    FROM fee_plan_heads fph
                    JOIN fee_heads fh ON fph.head_id = fh.head_id
                    WHERE fph.plan_id = fp.plan_id
                ) AS heads
            FROM fee_plans fp
            ORDER BY fp.academic_year DESC, fp.plan_name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single fee plan
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await pool.query(`
            SELECT fp.*,
                fp.applies_to_all,
                (
                    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('class_id', c.class_id, 'class_name', c.class_name) ORDER BY c.class_name), '[]')
                    FROM fee_plan_classes fpc
                    JOIN classes c ON fpc.class_id = c.class_id
                    WHERE fpc.plan_id = fp.plan_id
                ) AS classes
            FROM fee_plans fp
            WHERE fp.plan_id = $1
        `, [id]);
        if (plan.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const heads = await pool.query(`
            SELECT fph.*, fh.head_name, fh.head_type, fh.frequency
            FROM fee_plan_heads fph
            JOIN fee_heads fh ON fph.head_id = fh.head_id
            WHERE fph.plan_id = $1
        `, [id]);

        res.json({ ...plan.rows[0], heads: heads.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE fee plan
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { plan_name, class_ids, applies_to_all, academic_year, description, heads } = req.body;
        if (!plan_name) return res.status(400).json({ error: 'Plan name is required' });
        if (!applies_to_all && (!class_ids || class_ids.length === 0)) {
            return res.status(400).json({ error: 'Please select at least one class or choose All Classes' });
        }

        await client.query('BEGIN');

        const plan = await client.query(
            `INSERT INTO fee_plans (plan_name, academic_year, description, applies_to_all)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [plan_name, academic_year || '2026', description || null, !!applies_to_all]
        );
        const planId = plan.rows[0].plan_id;

        // Insert class associations (only if not applies_to_all)
        if (!applies_to_all && class_ids && class_ids.length > 0) {
            for (const cid of class_ids) {
                await client.query(
                    'INSERT INTO fee_plan_classes (plan_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [planId, cid]
                );
            }
        }

        // Insert fee heads
        if (heads && heads.length > 0) {
            for (const head of heads) {
                await client.query(
                    'INSERT INTO fee_plan_heads (plan_id, head_id, amount) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                    [planId, head.head_id, head.amount]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ ...plan.rows[0], message: 'Fee plan created successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// UPDATE fee plan
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { plan_name, class_ids, applies_to_all, academic_year, description, is_active, heads } = req.body;

        await client.query('BEGIN');

        const plan = await client.query(
            `UPDATE fee_plans SET plan_name=$1, academic_year=$2, description=$3,
             is_active=$4, applies_to_all=$5 WHERE plan_id=$6 RETURNING *`,
            [plan_name, academic_year, description, is_active, !!applies_to_all, id]
        );

        if (plan.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not found' });
        }

        // Replace class associations
        await client.query('DELETE FROM fee_plan_classes WHERE plan_id = $1', [id]);
        if (!applies_to_all && class_ids && class_ids.length > 0) {
            for (const cid of class_ids) {
                await client.query(
                    'INSERT INTO fee_plan_classes (plan_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [id, cid]
                );
            }
        }

        // Replace heads
        await client.query('DELETE FROM fee_plan_heads WHERE plan_id = $1', [id]);
        if (heads && heads.length > 0) {
            for (const head of heads) {
                await client.query(
                    'INSERT INTO fee_plan_heads (plan_id, head_id, amount) VALUES ($1, $2, $3)',
                    [id, head.head_id, head.amount]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ ...plan.rows[0], message: 'Updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// DELETE fee plan
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM fee_plans WHERE plan_id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
