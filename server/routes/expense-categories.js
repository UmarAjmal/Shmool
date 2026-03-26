const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all expense categories
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM expense_categories ORDER BY category_name ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get active categories only
router.get('/active', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM expense_categories WHERE is_active = true ORDER BY category_name ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single category by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM expense_categories WHERE category_id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new category
router.post('/', async (req, res) => {
    try {
        const { category_name, description, is_active } = req.body;
        
        if (!category_name) {
            return res.status(400).json({ error: 'Category name is required' });
        }
        
        const result = await pool.query(
            `INSERT INTO expense_categories (category_name, description, is_active)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [category_name, description || null, is_active !== undefined ? is_active : true]
        );
        
        res.status(201).json({ 
            message: 'Category created successfully', 
            category: result.rows[0] 
        });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'Category name already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name, description, is_active } = req.body;
        
        const result = await pool.query(
            `UPDATE expense_categories 
             SET category_name = $1, 
                 description = $2, 
                 is_active = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE category_id = $4
             RETURNING *`,
            [category_name, description, is_active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json({ 
            message: 'Category updated successfully', 
            category: result.rows[0] 
        });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Category name already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete category
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if category has expenses
        const expenseCheck = await pool.query(
            'SELECT COUNT(*) FROM expenses WHERE category_id = $1',
            [id]
        );
        
        if (parseInt(expenseCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete category with existing expenses. Mark as inactive instead.' 
            });
        }
        
        const result = await pool.query(
            'DELETE FROM expense_categories WHERE category_id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
