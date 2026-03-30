const express = require('express');
const router = express.Router();
const db = require('../db');

const MOOD_REWARD = 10;

// GET /api/mood?date=YYYY-MM-DD
    router.get('/', (req, res) => {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'Date is required' });

        try {
            const records = db.prepare('SELECT * FROM mood_records WHERE date = ?').all(date);
            res.json(records);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/mood
    router.post('/', (req, res) => {
        const { date, assignee, mood, note } = req.body;
        if (!date || !assignee || !mood) return res.status(400).json({ error: 'Missing required fields' });

        try {
            const existing = db.prepare('SELECT * FROM mood_records WHERE date = ? AND assignee = ?').get(date, assignee);
            let result;
            let coinsEarned = 0;

            if (existing) {
                result = db.prepare('UPDATE mood_records SET mood = ?, note = ? WHERE date = ? AND assignee = ?')
                           .run(mood, note || null, date, assignee);
            } else {
                result = db.prepare('INSERT INTO mood_records (date, assignee, mood, note, revealed) VALUES (?, ?, ?, ?, 0)')
                           .run(date, assignee, mood, note || null);
                
                // Award coins for the first check-in of the day
                try {
                    db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                        .run(MOOD_REWARD, assignee);
                    db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                        .run(assignee, MOOD_REWARD, 'mood_checkin', date);
                    coinsEarned = MOOD_REWARD;
                } catch (e) { console.error('Coin reward error:', e); }
            }

            const saved = db.prepare('SELECT * FROM mood_records WHERE date = ? AND assignee = ?').get(date, assignee);
            res.json({ ...saved, coinsEarned });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/mood/reveal
    router.post('/reveal', (req, res) => {
        const { date, assignee } = req.body;
        if (!date || !assignee) return res.status(400).json({ error: 'Date and assignee are required' });

        try {
            const result = db.prepare('UPDATE mood_records SET revealed = 1 WHERE date = ? AND assignee = ?')
                             .run(date, assignee);
            res.json({ success: true, changes: result.changes });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

module.exports = router;
