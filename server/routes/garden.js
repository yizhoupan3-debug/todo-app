const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Coin Balance ──
router.get('/coins/:assignee', (req, res) => {
    try {
        const row = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
            .get(req.params.assignee);
        res.json({ balance: row ? row.balance : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Earn Coins ──
router.post('/coins/earn', (req, res) => {
    try {
        const { assignee, amount, reason, detail } = req.body;
        if (!assignee || !amount || !reason) {
            return res.status(400).json({ error: 'assignee, amount, reason required' });
        }

        const earn = db.transaction(() => {
            db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                .run(amount, assignee);
            db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                .run(assignee, amount, reason, detail || null);
            const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                .get(assignee);
            return balance;
        });

        const balance = earn();
        res.json({ balance, earned: amount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Coin Transaction History ──
router.get('/coins/history/:assignee', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const rows = db.prepare(
            'SELECT * FROM coin_transactions WHERE assignee = ? ORDER BY created_at DESC LIMIT ?'
        ).all(req.params.assignee, limit);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Tree Shop (catalog is frontend-defined, return user's owned tree types) ──
router.get('/shop/:assignee', (req, res) => {
    try {
        const owned = db.prepare(
            'SELECT tree_type, COUNT(*) as count FROM trees WHERE assignee = ? GROUP BY tree_type'
        ).all(req.params.assignee);
        const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
            .get(req.params.assignee) || { balance: 0 };
        res.json({ balance, owned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Plant a Tree (purchase) ──
router.post('/plant', (req, res) => {
    try {
        const { assignee, tree_type, cost, position_x, position_y } = req.body;
        if (!assignee || !tree_type || cost === undefined) {
            return res.status(400).json({ error: 'assignee, tree_type, cost required' });
        }

        const plant = db.transaction(() => {
            // Check balance
            const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                .get(assignee);
            if (balance < cost) {
                throw new Error('INSUFFICIENT');
            }
            // Deduct coins
            db.prepare('UPDATE coin_accounts SET balance = balance - ? WHERE assignee = ?')
                .run(cost, assignee);
            db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                .run(assignee, -cost, 'purchase', tree_type);
            // Plant tree
            const result = db.prepare(
                'INSERT INTO trees (assignee, tree_type, position_x, position_y) VALUES (?, ?, ?, ?)'
            ).run(assignee, tree_type, position_x || Math.random() * 80 + 10, position_y || Math.random() * 60 + 20);
            const tree = db.prepare('SELECT * FROM trees WHERE id = ?').get(result.lastInsertRowid);
            const newBalance = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                .get(assignee).balance;
            return { tree, balance: newBalance };
        });

        const result = plant();
        res.json(result);
    } catch (err) {
        if (err.message === 'INSUFFICIENT') {
            return res.status(400).json({ error: '喵喵币不足 😿' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ── Get Garden Trees ──
router.get('/trees/:assignee', (req, res) => {
    try {
        const trees = db.prepare(
            'SELECT * FROM trees WHERE assignee = ? ORDER BY planted_at DESC'
        ).all(req.params.assignee);
        res.json(trees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Grow a Tree (accumulate focus minutes) ──
router.post('/trees/grow', (req, res) => {
    try {
        const { assignee, minutes } = req.body;
        if (!assignee || !minutes) {
            return res.status(400).json({ error: 'assignee, minutes required' });
        }

        const grow = db.transaction(() => {
            // Find the latest growing tree for this user
            let tree = db.prepare(
                "SELECT * FROM trees WHERE assignee = ? AND status = 'growing' ORDER BY planted_at DESC LIMIT 1"
            ).get(assignee);

            if (!tree) {
                // If no growing tree, try the latest tree regardless
                tree = db.prepare(
                    "SELECT * FROM trees WHERE assignee = ? ORDER BY planted_at DESC LIMIT 1"
                ).get(assignee);
            }

            if (!tree) return null;

            const newMinutes = (tree.growth_minutes || 0) + minutes;
            const newStatus = newMinutes >= 150 ? 'grown' : 'growing';

            db.prepare('UPDATE trees SET growth_minutes = ?, status = ? WHERE id = ?')
                .run(newMinutes, newStatus, tree.id);

            return db.prepare('SELECT * FROM trees WHERE id = ?').get(tree.id);
        });

        const tree = grow();
        res.json({ tree });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
