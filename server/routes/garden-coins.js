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
