module.exports = function registerGardenExpeditionRoutes(router, {
    db,
    BOAT_CATALOG,
    CHARACTER_MAP,
    randomIslandName,
    BASE_GRID_W,
    BASE_GRID_H,
    ensureAccount,
    resolveCompletedExpeditions,
}) {


    router.get('/islands/:assignee', (req, res) => {
        try {
            const islands = db.prepare(
                'SELECT * FROM islands WHERE assignee = ? ORDER BY id'
            ).all(req.params.assignee);
            res.json(islands);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/boats/:assignee', (req, res) => {
        try {
            const boats = db.prepare(
                'SELECT * FROM boats WHERE assignee = ? ORDER BY id'
            ).all(req.params.assignee);
            res.json({ boats, catalog: BOAT_CATALOG });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/boats/buy', (req, res) => {
        try {
            const { assignee, boat_type } = req.body;
            if (!assignee || !boat_type) {
                return res.status(400).json({ error: 'assignee, boat_type required' });
            }
            const spec = BOAT_CATALOG[boat_type];
            if (!spec) return res.status(400).json({ error: '未知船只类型' });

            const buy = db.transaction(() => {
                ensureAccount(assignee);
                const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                    .get(assignee);
                if (balance < spec.cost) throw new Error('INSUFFICIENT');

                db.prepare('UPDATE coin_accounts SET balance = balance - ? WHERE assignee = ?')
                    .run(spec.cost, assignee);
                db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                    .run(assignee, -spec.cost, 'buy_boat', spec.name);

                const result = db.prepare(
                    'INSERT INTO boats (assignee, boat_type, name) VALUES (?, ?, ?)'
                ).run(assignee, boat_type, spec.name);

                const boat = db.prepare('SELECT * FROM boats WHERE id = ?').get(result.lastInsertRowid);
                const newBalance = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                    .get(assignee).balance;
                return { boat, balance: newBalance };
            });

            const result = buy();
            res.json(result);
        } catch (err) {
            if (err.message === 'INSUFFICIENT') return res.status(400).json({ error: '喵喵币不足 😿' });
            res.status(500).json({ error: err.message });
        }
    });


    /**
     * POST /expeditions/start — Launch a boat expedition to an undiscovered island.
     * Body: { assignee: string, boat_id: number }
     * Returns: { expedition: object, targetIsland: object, character: string }
     * Errors: 404 BOAT_NOT_FOUND | 400 BOAT_BUSY | 400 EXPEDITION_ACTIVE
     */
    router.post('/expeditions/start', (req, res) => {
        try {
            const { assignee, boat_id } = req.body;
            if (!assignee || !boat_id) {
                return res.status(400).json({ error: 'assignee, boat_id required' });
            }

            const character = CHARACTER_MAP[assignee];
            if (!character) return res.status(400).json({ error: '未知角色' });

            const start = db.transaction(() => {
                const boat = db.prepare('SELECT * FROM boats WHERE id = ? AND assignee = ?')
                    .get(boat_id, assignee);
                if (!boat) throw new Error('BOAT_NOT_FOUND');
                if (boat.status !== 'docked') throw new Error('BOAT_BUSY');

                // Idempotency: prevent a second active expedition for the same user
                const activeExp = db.prepare(
                    "SELECT id FROM expeditions WHERE assignee = ? AND status = 'sailing' LIMIT 1"
                ).get(assignee);
                if (activeExp) throw new Error('EXPEDITION_ACTIVE');

                const spec = BOAT_CATALOG[boat.boat_type] || BOAT_CATALOG.raft;
                const fromIsland = db.prepare(
                    "SELECT * FROM islands WHERE assignee = ? AND island_type = 'starter' LIMIT 1"
                ).get(assignee);
                if (!fromIsland) throw new Error('NO_HOME_ISLAND');

                let targetIsland = db.prepare(
                    'SELECT * FROM islands WHERE assignee = ? AND discovered = 0 ORDER BY RANDOM() LIMIT 1'
                ).get(assignee);

                if (!targetIsland) {
                    const name = randomIslandName(assignee);
                    const gw = boat.boat_type === 'galleon' ? BASE_GRID_W + 2 + Math.floor(Math.random() * 2)
                        : boat.boat_type === 'sailboat' ? BASE_GRID_W + 1 + Math.floor(Math.random() * 2)
                            : BASE_GRID_W + Math.floor(Math.random() * 2);
                    const gh = boat.boat_type === 'galleon' ? BASE_GRID_H + 1 + Math.floor(Math.random() * 2)
                        : boat.boat_type === 'sailboat' ? BASE_GRID_H + Math.floor(Math.random() * 2)
                            : BASE_GRID_H;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 1 + Math.random();
                    const px = Math.round(Math.cos(angle) * dist * 10) / 10;
                    const py = Math.round(Math.sin(angle) * dist * 10) / 10;

                    const ins = db.prepare(
                        'INSERT INTO islands (assignee, name, island_type, grid_w, grid_h, discovered, position_x, position_y) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
                    ).run(assignee, name, 'normal', gw, gh, px, py);
                    targetIsland = db.prepare('SELECT * FROM islands WHERE id = ?').get(ins.lastInsertRowid);
                }

                db.prepare("UPDATE boats SET status = 'sailing' WHERE id = ?").run(boat.id);

                const exp = db.prepare(
                    'INSERT INTO expeditions (assignee, boat_id, from_island_id, to_island_id, character, duration_min) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(assignee, boat.id, fromIsland.id, targetIsland.id, character, spec.duration);

                const expedition = db.prepare('SELECT * FROM expeditions WHERE id = ?').get(exp.lastInsertRowid);
                return { expedition, targetIsland, character };
            });

            const result = start();
            res.json(result);
        } catch (err) {
            if (err.message === 'BOAT_NOT_FOUND') return res.status(404).json({ error: '船只不存在' });
            if (err.message === 'BOAT_BUSY') return res.status(400).json({ error: '船只正在航行中' });
            if (err.message === 'EXPEDITION_ACTIVE') return res.status(400).json({ error: '已有远征进行中，请等待回航' });
            if (err.message === 'NO_HOME_ISLAND') return res.status(404).json({ error: '未找到起始岛屿，请联系管理员' });
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/expeditions/:assignee', (req, res) => {
        try {
            const expeditions = db.prepare(
                'SELECT * FROM expeditions WHERE assignee = ? ORDER BY started_at DESC LIMIT 10'
            ).all(req.params.assignee);

            resolveCompletedExpeditions(db, expeditions);

            res.json(expeditions);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
};
