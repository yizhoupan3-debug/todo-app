module.exports = function registerGardenExpeditionRoutes(router, {
    db,
    BOAT_CATALOG,
    CHARACTER_MAP,
    randomIslandName,
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

                const spec = BOAT_CATALOG[boat.boat_type] || BOAT_CATALOG.raft;
                const fromIsland = db.prepare(
                    "SELECT * FROM islands WHERE assignee = ? AND island_type = 'starter' LIMIT 1"
                ).get(assignee);

                let targetIsland = db.prepare(
                    'SELECT * FROM islands WHERE assignee = ? AND discovered = 0 ORDER BY RANDOM() LIMIT 1'
                ).get(assignee);

                if (!targetIsland) {
                    const name = randomIslandName(assignee);
                    const gw = boat.boat_type === 'galleon' ? 6 + Math.floor(Math.random() * 3)
                        : boat.boat_type === 'sailboat' ? 5 + Math.floor(Math.random() * 2)
                            : 4 + Math.floor(Math.random() * 2);
                    const gh = boat.boat_type === 'galleon' ? 4 + Math.floor(Math.random() * 2)
                        : 3 + Math.floor(Math.random() * 2);
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
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/expeditions/:assignee', (req, res) => {
        try {
            const expeditions = db.prepare(
                'SELECT * FROM expeditions WHERE assignee = ? ORDER BY started_at DESC LIMIT 10'
            ).all(req.params.assignee);

            const now = new Date();
            for (const exp of expeditions) {
                if (exp.status === 'sailing') {
                    const startTime = new Date(exp.started_at.replace(' ', 'T') + '+08:00');
                    const elapsed = (now - startTime) / 60000;
                    if (elapsed >= exp.duration_min) {
                        db.prepare("UPDATE expeditions SET status = 'completed', completed_at = datetime('now','localtime') WHERE id = ?")
                            .run(exp.id);
                        db.prepare('UPDATE islands SET discovered = 1 WHERE id = ?')
                            .run(exp.to_island_id);
                        db.prepare("UPDATE boats SET status = 'docked' WHERE id = ?")
                            .run(exp.boat_id);
                        const island = db.prepare('SELECT * FROM islands WHERE id = ?').get(exp.to_island_id);
                        const plotExists = db.prepare('SELECT COUNT(*) as c FROM garden_plots WHERE island_id = ?').get(island.id);
                        if (plotExists.c === 0) {
                            const obstacles = ['rock', 'weed', 'wild_tree'];
                            const insertPlot = db.prepare(
                                'INSERT INTO garden_plots (assignee, x, y, status, obstacle_type, island_id) VALUES (?, ?, ?, ?, ?, ?)'
                            );
                            const forestRows = Math.max(1, Math.ceil((Number(island.grid_h) || 4) * 0.5));
                            for (let y = 0; y < island.grid_h; y++) {
                                for (let x = 0; x < island.grid_w; x++) {
                                    const obs = y < forestRows
                                        ? 'wild_tree'
                                        : obstacles[Math.floor(Math.random() * obstacles.length)];
                                    insertPlot.run(exp.assignee, x, y, 'wasteland', obs, island.id);
                                }
                            }
                        }
                        exp.status = 'completed';
                    }
                }
            }

            res.json(expeditions);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
};
