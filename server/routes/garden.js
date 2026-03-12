const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Server-side plant price catalog (source of truth) ──
const PLANT_CATALOG = {
    sprout: 0, rice: 5, sunflower: 10, mushroom: 15, tulip: 20,
    hibiscus: 25, sakura: 30, chrysanthemum: 35, bamboo: 45,
    pine: 50, oak: 50, mint: 60, lotus: 70, palm: 80,
    christmas: 80, cactus: 100, rose: 100, grape: 120,
    clover: 150, lavender: 200,
};

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

// ── Get Garden Plots (6x4 grid) ──
router.get('/plots/:assignee', (req, res) => {
    try {
        const plots = db.prepare(
            `SELECT gp.*, t.tree_type, t.growth_minutes, t.status as tree_status, t.planted_at
             FROM garden_plots gp
             LEFT JOIN trees t ON gp.tree_id = t.id
             WHERE gp.assignee = ?
             ORDER BY gp.y, gp.x`
        ).all(req.params.assignee);
        res.json(plots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Clear a Plot (remove obstacle, costs coins) ──
router.post('/plots/clear', (req, res) => {
    try {
        const { assignee, plot_id } = req.body;
        if (!assignee || !plot_id) {
            return res.status(400).json({ error: 'assignee, plot_id required' });
        }

        const costMap = { rock: 10, weed: 5, wild_tree: 15 };

        const clear = db.transaction(() => {
            const plot = db.prepare('SELECT * FROM garden_plots WHERE id = ? AND assignee = ?')
                .get(plot_id, assignee);
            if (!plot) throw new Error('NOT_FOUND');
            if (plot.status !== 'wasteland') throw new Error('ALREADY_CLEARED');

            const cost = costMap[plot.obstacle_type] || 10;
            const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                .get(assignee);
            if (balance < cost) throw new Error('INSUFFICIENT');

            db.prepare('UPDATE coin_accounts SET balance = balance - ? WHERE assignee = ?')
                .run(cost, assignee);
            db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                .run(assignee, -cost, 'clear_land', plot.obstacle_type);
            db.prepare('UPDATE garden_plots SET status = ?, obstacle_type = NULL WHERE id = ?')
                .run('cleared', plot_id);

            const newBalance = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                .get(assignee).balance;
            return { balance: newBalance, cost };
        });

        const result = clear();
        res.json(result);
    } catch (err) {
        if (err.message === 'INSUFFICIENT') return res.status(400).json({ error: '喵喵币不足 😿' });
        if (err.message === 'ALREADY_CLEARED') return res.status(400).json({ error: '已经开垦过了' });
        if (err.message === 'NOT_FOUND') return res.status(404).json({ error: '地块不存在' });
        res.status(500).json({ error: err.message });
    }
});

// ── Tree Shop ──
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

// ── Plant a Tree on a Plot ──
router.post('/plant', (req, res) => {
    try {
        const { assignee, tree_type, plot_id } = req.body;
        if (!assignee || !tree_type || !plot_id) {
            return res.status(400).json({ error: 'assignee, tree_type, plot_id required' });
        }

        // Use server-side price, ignore client-sent cost
        const cost = PLANT_CATALOG[tree_type];
        if (cost === undefined) {
            return res.status(400).json({ error: '未知植物类型' });
        }

        const plant = db.transaction(() => {
            const plot = db.prepare('SELECT * FROM garden_plots WHERE id = ? AND assignee = ?')
                .get(plot_id, assignee);
            if (!plot) throw new Error('NOT_FOUND');
            if (plot.status !== 'cleared') throw new Error('NOT_CLEARED');

            const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                .get(assignee);
            if (balance < cost) throw new Error('INSUFFICIENT');

            if (cost > 0) {
                db.prepare('UPDATE coin_accounts SET balance = balance - ? WHERE assignee = ?')
                    .run(cost, assignee);
                db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                    .run(assignee, -cost, 'purchase', tree_type);
            }

            const result = db.prepare(
                'INSERT INTO trees (assignee, tree_type, position_x, position_y) VALUES (?, ?, ?, ?)'
            ).run(assignee, tree_type, plot.x, plot.y);

            db.prepare('UPDATE garden_plots SET status = ?, tree_id = ? WHERE id = ?')
                .run('planted', result.lastInsertRowid, plot_id);

            const tree = db.prepare('SELECT * FROM trees WHERE id = ?').get(result.lastInsertRowid);
            const newBalance = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                .get(assignee).balance;
            return { tree, balance: newBalance };
        });

        const result = plant();
        res.json(result);
    } catch (err) {
        if (err.message === 'INSUFFICIENT') return res.status(400).json({ error: '喵喵币不足 😿' });
        if (err.message === 'NOT_CLEARED') return res.status(400).json({ error: '需要先开荒' });
        if (err.message === 'NOT_FOUND') return res.status(404).json({ error: '地块不存在' });
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
            let tree = db.prepare(
                "SELECT * FROM trees WHERE assignee = ? AND status = 'growing' ORDER BY planted_at DESC LIMIT 1"
            ).get(assignee);
            if (!tree) {
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
