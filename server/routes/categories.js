const express = require('express');
const db = require('../db');
const { parseInteger } = require('../validation');

const router = express.Router();

/** Allowed fields for update — whitelist to prevent arbitrary column injection. */
const ALLOWED_FIELDS = ['name', 'color', 'icon'];

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
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const { color, icon } = req.body;
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
    const categoryId = parseInteger(id);
    if (categoryId === null || categoryId <= 0) {
        return res.status(400).json({ error: 'Category id must be a positive integer' });
    }

    try {
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(req.body)) {
            if (ALLOWED_FIELDS.includes(key) && value !== undefined) {
                if (key === 'name') {
                    const name = typeof value === 'string' ? value.trim() : '';
                    if (!name) return res.status(400).json({ error: 'name is required' });
                    updates.push(`${key} = ?`);
                    values.push(name);
                    continue;
                }
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(categoryId);
        db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json(category);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Category already exists' });
        }
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
