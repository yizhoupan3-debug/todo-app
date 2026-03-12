const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/checkin — get records for a date + assignee
router.get('/', (req, res) => {
    const { date, assignee, type } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });

    let sql = 'SELECT * FROM checkin_records WHERE date = ?';
    const params = [date];

    if (assignee) {
        sql += ' AND assignee = ?';
        params.push(assignee);
    }
    if (type) {
        sql += ' AND type = ?';
        params.push(type);
    }

    sql += ' ORDER BY created_at DESC';

    try {
        const records = db.prepare(sql).all(...params);
        // Also return daily total
        let totalSql = 'SELECT COALESCE(SUM(amount), 0) as total FROM checkin_records WHERE date = ? AND type = ?';
        const totalParams = [date, type || 'water'];
        if (assignee) {
            totalSql += ' AND assignee = ?';
            totalParams.push(assignee);
        }
        const { total } = db.prepare(totalSql).get(...totalParams);
        res.json({ records, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/checkin — add a check-in record
router.post('/', (req, res) => {
    const { type, amount, assignee, date } = req.body;
    if (!assignee || !amount) {
        return res.status(400).json({ error: 'assignee and amount are required' });
    }

    const now = new Date();
    const today = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    try {
        const result = db.prepare(`
            INSERT INTO checkin_records (type, amount, assignee, date)
            VALUES (?, ?, ?, ?)
        `).run(type || 'water', amount, assignee, today);

        const record = db.prepare('SELECT * FROM checkin_records WHERE id = ?').get(result.lastInsertRowid);

        // Return updated total
        const { total } = db.prepare(
            'SELECT COALESCE(SUM(amount), 0) as total FROM checkin_records WHERE date = ? AND type = ? AND assignee = ?'
        ).get(today, type || 'water', assignee);

        res.json({ record, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/checkin/:id — undo a check-in
router.delete('/:id', (req, res) => {
    try {
        const record = db.prepare('SELECT * FROM checkin_records WHERE id = ?').get(req.params.id);
        if (!record) return res.status(404).json({ error: 'not found' });

        db.prepare('DELETE FROM checkin_records WHERE id = ?').run(req.params.id);

        const { total } = db.prepare(
            'SELECT COALESCE(SUM(amount), 0) as total FROM checkin_records WHERE date = ? AND type = ? AND assignee = ?'
        ).get(record.date, record.type, record.assignee);

        res.json({ success: true, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
