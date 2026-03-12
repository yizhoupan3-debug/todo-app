const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/categories
router.get('/', (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/categories
router.post('/', (req, res) => {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    try {
        const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM categories').get();
        const result = db.prepare(
            'INSERT INTO categories (name, color, icon, sort_order) VALUES (?, ?, ?, ?)'
        ).run(name, color || '#6366f1', icon || '📋', (maxOrder.max || 0) + 1);

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(category);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Category already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/categories/:id
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, color, icon } = req.body;

    try {
        const updates = [];
        const values = [];
        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (color !== undefined) { updates.push('color = ?'); values.push(color); }
        if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(id);
        db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    try {
        const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (!cat) return res.status(404).json({ error: 'Category not found' });

        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
