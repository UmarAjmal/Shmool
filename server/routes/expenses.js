const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all expenses with filters and pagination
router.get('/', async (req, res) => {
    try {
        const { 
            category_id, 
            status, 
            from_date, 
            to_date, 
            payment_method,
            search,
            page = 1,
            limit = 50
        } = req.query;
        
        let query = `
            SELECT e.*, ec.category_name
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.category_id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;
        
        // Apply filters
        if (category_id) {
            paramCount++;
            query += ` AND e.category_id = $${paramCount}`;
            params.push(category_id);
        }
        
        if (status) {
            paramCount++;
            query += ` AND e.status = $${paramCount}`;
            params.push(status);
        }
        
        if (from_date) {
            paramCount++;
            query += ` AND e.expense_date >= $${paramCount}`;
            params.push(from_date);
        }
        
        if (to_date) {
            paramCount++;
            query += ` AND e.expense_date <= $${paramCount}`;
            params.push(to_date);
        }
        
        if (payment_method) {
            paramCount++;
            query += ` AND e.payment_method = $${paramCount}`;
            params.push(payment_method);
        }
        
        if (search) {
            paramCount++;
            query += ` AND (e.expense_title ILIKE $${paramCount} OR e.paid_to ILIKE $${paramCount} OR e.reference_no ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }
        
        query += ' ORDER BY e.expense_date DESC, e.created_at DESC';
        
        // Add pagination
        const offset = (page - 1) * limit;
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);
        
        const result = await pool.query(query, params);
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM expenses e WHERE 1=1';
        const countParams = [];
        let countParamCount = 0;
        
        if (category_id) {
            countParamCount++;
            countQuery += ` AND e.category_id = $${countParamCount}`;
            countParams.push(category_id);
        }
        
        if (status) {
            countParamCount++;
            countQuery += ` AND e.status = $${countParamCount}`;
            countParams.push(status);
        }
        
        if (from_date) {
            countParamCount++;
            countQuery += ` AND e.expense_date >= $${countParamCount}`;
            countParams.push(from_date);
        }
        
        if (to_date) {
            countParamCount++;
            countQuery += ` AND e.expense_date <= $${countParamCount}`;
            countParams.push(to_date);
        }
        
        if (payment_method) {
            countParamCount++;
            countQuery += ` AND e.payment_method = $${countParamCount}`;
            countParams.push(payment_method);
        }
        
        if (search) {
            countParamCount++;
            countQuery += ` AND (e.expense_title ILIKE $${countParamCount} OR e.paid_to ILIKE $${countParamCount} OR e.reference_no ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        
        res.json({
            expenses: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get expense statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const { from_date, to_date, category_id } = req.query;
        
        let query = `
            SELECT 
                COUNT(*) as total_expenses,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_amount,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
            FROM expenses
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;
        
        if (from_date) {
            paramCount++;
            query += ` AND expense_date >= $${paramCount}`;
            params.push(from_date);
        }
        
        if (to_date) {
            paramCount++;
            query += ` AND expense_date <= $${paramCount}`;
            params.push(to_date);
        }
        
        if (category_id) {
            paramCount++;
            query += ` AND category_id = $${paramCount}`;
            params.push(category_id);
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get expenses by category
router.get('/stats/by-category', async (req, res) => {
    try {
        const { from_date, to_date } = req.query;
        
        let query = `
            SELECT 
                ec.category_name,
                COUNT(e.expense_id) as expense_count,
                COALESCE(SUM(e.amount), 0) as total_amount
            FROM expense_categories ec
            LEFT JOIN expenses e ON ec.category_id = e.category_id
        `;
        const params = [];
        let paramCount = 0;
        
        if (from_date || to_date) {
            query += ' WHERE 1=1';
            
            if (from_date) {
                paramCount++;
                query += ` AND e.expense_date >= $${paramCount}`;
                params.push(from_date);
            }
            
            if (to_date) {
                paramCount++;
                query += ` AND e.expense_date <= $${paramCount}`;
                params.push(to_date);
            }
        }
        
        query += ' GROUP BY ec.category_name ORDER BY total_amount DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single expense
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT e.*, ec.category_name
             FROM expenses e
             LEFT JOIN expense_categories ec ON e.category_id = ec.category_id
             WHERE e.expense_id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new expense
router.post('/', async (req, res) => {
    try {
        const {
            category_id,
            expense_title,
            amount,
            expense_date,
            payment_method,
            reference_no,
            paid_to,
            description,
            status
        } = req.body;
        
        if (!category_id || !expense_title || !amount) {
            return res.status(400).json({ 
                error: 'Category, title, and amount are required' 
            });
        }
        
        const result = await pool.query(
            `INSERT INTO expenses (
                category_id, expense_title, amount, expense_date,
                payment_method, reference_no, paid_to, description, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                category_id,
                expense_title,
                amount,
                expense_date || new Date(),
                payment_method || null,
                reference_no || null,
                paid_to || null,
                description || null,
                status || 'pending'
            ]
        );
        
        res.status(201).json({
            message: 'Expense created successfully',
            expense: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update expense
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            category_id,
            expense_title,
            amount,
            expense_date,
            payment_method,
            reference_no,
            paid_to,
            description,
            status
        } = req.body;
        
        const result = await pool.query(
            `UPDATE expenses SET
                category_id = $1,
                expense_title = $2,
                amount = $3,
                expense_date = $4,
                payment_method = $5,
                reference_no = $6,
                paid_to = $7,
                description = $8,
                status = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE expense_id = $10
            RETURNING *`,
            [
                category_id,
                expense_title,
                amount,
                expense_date,
                payment_method,
                reference_no,
                paid_to,
                description,
                status,
                id
            ]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({
            message: 'Expense updated successfully',
            expense: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update expense status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const result = await pool.query(
            `UPDATE expenses SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE expense_id = $2
             RETURNING *`,
            [status, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({
            message: 'Status updated successfully',
            expense: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete expense
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM expenses WHERE expense_id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
