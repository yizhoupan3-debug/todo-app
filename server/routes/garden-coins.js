module.exports = function registerGardenCoinRoutes(router, { db }) {
    router.get('/coins/:assignee', (req, res) => {
        try {
            const row = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                .get(req.params.assignee);
            res.json({ balance: row ? row.balance : 0 });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/coins/earn', (req, res) => {
        try {
            const { assignee, amount, reason, detail } = req.body;
            if (!assignee || !amount || !reason) {
                return res.status(400).json({ error: 'assignee, amount, reason required' });
            }

            // Only allow legitimate server-side earn reasons to prevent arbitrary coin injection
            const ALLOWED_EARN_REASONS = ['pomodoro', 'task_done', 'checkin_daily', 'checkin_streak_3', 'checkin_streak_7', 'plant_drop', 'harvest'];
            if (!ALLOWED_EARN_REASONS.includes(reason)) {
                return res.status(403).json({ error: '非法的获取途径' });
            }

            // Sanity-check: cap single earn to prevent abuse (max 50 coins per call)
            const safeAmount = Math.min(Math.max(0, Number(amount) || 0), 50);
            if (safeAmount <= 0) {
                return res.status(400).json({ error: 'amount must be positive' });
            }

            const earn = db.transaction(() => {
                db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                    .run(safeAmount, assignee);
                db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                    .run(assignee, safeAmount, reason, detail || null);
                const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                    .get(assignee);
                return balance;
            });

            const balance = earn();
            res.json({ balance, earned: safeAmount });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/coins/undo/:id', (req, res) => {
        try {
            const txId = parseInt(req.params.id, 10);
            if (!txId) return res.status(400).json({ error: 'invalid id' });

            const tx = db.prepare('SELECT * FROM coin_transactions WHERE id = ?').get(txId);
            if (!tx) return res.status(404).json({ error: '记录不存在' });
            if (tx.amount <= 0) return res.status(400).json({ error: '只能撤销收入记录' });

            const undo = db.transaction(() => {
                db.prepare('UPDATE coin_accounts SET balance = MAX(balance - ?, 0) WHERE assignee = ?')
                    .run(tx.amount, tx.assignee);
                db.prepare('DELETE FROM coin_transactions WHERE id = ?').run(txId);
                const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                    .get(tx.assignee);
                return balance;
            });

            const balance = undo();
            res.json({ balance, undone: tx.amount, assignee: tx.assignee });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/coins/history/:assignee', (req, res) => {
        try {
            const limit = parseInt(req.query.limit, 10) || 20;
            const rows = db.prepare(
                'SELECT * FROM coin_transactions WHERE assignee = ? ORDER BY created_at DESC LIMIT ?'
            ).all(req.params.assignee, limit);
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

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
};
