module.exports = function registerGardenPlotRoutes(router, {
    db, PLANT_CATALOG, PLANT_TIERS, TREE_MATURE_MINUTES, SPEEDUP_COST, SPEEDUP_MINUTES,
    BASE_GRID_W, BASE_GRID_H, isForestPlot, isStarterInitialClearedPlot,
    pickObstacleForPlot, getPlotSeedState,
}) {


    function ensureIslandSceneGrid(islandId, assignee = null) {
        const island = assignee
            ? db.prepare('SELECT * FROM islands WHERE id = ? AND assignee = ?').get(islandId, assignee)
            : db.prepare('SELECT * FROM islands WHERE id = ?').get(islandId);
        if (!island) return null;

        const gridW = Math.max(BASE_GRID_W, Number(island.grid_w) || BASE_GRID_W);
        const gridH = Math.max(BASE_GRID_H, Number(island.grid_h) || BASE_GRID_H);
        const updateIsland = db.prepare('UPDATE islands SET grid_w = ?, grid_h = ? WHERE id = ?');
        const existingPlots = db.prepare('SELECT id, x, y, status FROM garden_plots WHERE island_id = ?').all(island.id);
        const insertPlot = db.prepare(
            'INSERT INTO garden_plots (assignee, x, y, status, obstacle_type, island_id) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const updateObstacle = db.prepare(
            'UPDATE garden_plots SET obstacle_type = ? WHERE id = ? AND status = ?'
        );
        const unlockStarterPlot = db.prepare(
            "UPDATE garden_plots SET status = 'cleared', obstacle_type = NULL WHERE id = ? AND status = 'wasteland'"
        );

        const ensure = db.transaction(() => {
            if (gridW !== island.grid_w || gridH !== island.grid_h) {
                updateIsland.run(gridW, gridH, island.id);
            }

            const plotMap = new Map(existingPlots.map(plot => [`${plot.x},${plot.y}`, plot]));
            const hasUnlockedPlots = existingPlots.some(plot => plot.status !== 'wasteland');
            for (let y = 0; y < gridH; y++) {
                for (let x = 0; x < gridW; x++) {
                    const seedState = getPlotSeedState(island.island_type, x, y, gridW, gridH);
                    const existing = plotMap.get(`${x},${y}`);
                    if (!existing) {
                        insertPlot.run(island.assignee, x, y, seedState.status, seedState.obstacle, island.id);
                        continue;
                    }
                    if (existing.status === 'wasteland') {
                        if (!hasUnlockedPlots && seedState.status === 'cleared') {
                            unlockStarterPlot.run(existing.id);
                            continue;
                        }
                        if (seedState.obstacle) {
                            updateObstacle.run(seedState.obstacle, existing.id, 'wasteland');
                        }
                    }
                }
            }
        });

        ensure();
        return { ...island, grid_w: gridW, grid_h: gridH };
    }

    router.get('/plots/:assignee', (req, res) => {
        try {
            const islands = db.prepare('SELECT id FROM islands WHERE assignee = ?').all(req.params.assignee);
            islands.forEach(island => ensureIslandSceneGrid(island.id, req.params.assignee));
            const plots = db.prepare(
                `SELECT gp.*, t.tree_type, t.growth_minutes, t.status as tree_status, t.planted_at, t.last_harvested
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

    router.post('/plant', (req, res) => {
        try {
            const { assignee, tree_type, plot_id } = req.body;
            if (!assignee || !tree_type || !plot_id) {
                return res.status(400).json({ error: 'assignee, tree_type, plot_id required' });
            }

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
                if (!tree) return { tree: null, coinDrop: 0 };

                const newMinutes = (tree.growth_minutes || 0) + minutes;
                const newStatus = newMinutes >= TREE_MATURE_MINUTES ? 'grown' : 'growing';

                db.prepare('UPDATE trees SET growth_minutes = ?, status = ? WHERE id = ?')
                    .run(newMinutes, newStatus, tree.id);

                let coinDrop = 0;
                const price = PLANT_CATALOG[tree.tree_type] || 0;
                let dropChance;
                let minDrop;
                let maxDrop;

                if (price >= 80) {
                    dropChance = 0.50; minDrop = 0.5; maxDrop = 2.0;
                } else if (price >= 30) {
                    dropChance = 0.35; minDrop = 0.3; maxDrop = 1.0;
                } else if (price >= 10) {
                    dropChance = 0.20; minDrop = 0.2; maxDrop = 0.5;
                } else {
                    dropChance = 0.10; minDrop = 0.1; maxDrop = 0.2;
                }

                if (Math.random() < dropChance) {
                    coinDrop = Math.round((minDrop + Math.random() * (maxDrop - minDrop)) * 10) / 10;
                    db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                        .run(coinDrop, assignee);
                    db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                        .run(assignee, coinDrop, 'plant_drop', `${tree.tree_type} 掉落`);
                }

                const updatedTree = db.prepare('SELECT * FROM trees WHERE id = ?').get(tree.id);
                return { tree: updatedTree, coinDrop };
            });

            const result = grow();
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/harvest', (req, res) => {
        try {
            const { assignee, tree_id } = req.body;
            if (!assignee || !tree_id) {
                return res.status(400).json({ error: 'assignee, tree_id required' });
            }

            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const harvest = db.transaction(() => {
                const tree = db.prepare('SELECT * FROM trees WHERE id = ? AND assignee = ?')
                    .get(tree_id, assignee);
                if (!tree) throw new Error('NOT_FOUND');
                if (tree.status !== 'grown') throw new Error('NOT_GROWN');
                if (tree.last_harvested === today) throw new Error('ALREADY_HARVESTED');

                const maxReward = PLANT_TIERS[tree.tree_type] || 1;
                const reward = Math.floor(Math.random() * maxReward) + 1;

                db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                    .run(reward, assignee);
                db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                    .run(assignee, reward, 'harvest', tree.tree_type);
                db.prepare('UPDATE trees SET last_harvested = ? WHERE id = ?')
                    .run(today, tree.id);

                const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                    .get(assignee);
                return { reward, balance, tree_type: tree.tree_type };
            });

            const result = harvest();
            res.json(result);
        } catch (err) {
            if (err.message === 'NOT_FOUND') return res.status(404).json({ error: '植物不存在' });
            if (err.message === 'NOT_GROWN') return res.status(400).json({ error: '植物还没成熟呢 🌱' });
            if (err.message === 'ALREADY_HARVESTED') return res.status(400).json({ error: '今天已经收过啦 😸' });
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/plots/:assignee/:islandId', (req, res) => {
        try {
            ensureIslandSceneGrid(req.params.islandId, req.params.assignee);
            const plots = db.prepare(
                `SELECT gp.*, t.tree_type, t.growth_minutes, t.status as tree_status, t.planted_at, t.last_harvested
                 FROM garden_plots gp
                 LEFT JOIN trees t ON gp.tree_id = t.id
                 WHERE gp.assignee = ? AND gp.island_id = ?
                 ORDER BY gp.y, gp.x`
            ).all(req.params.assignee, req.params.islandId);
            res.json(plots);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/plots/remove', (req, res) => {
        try {
            const { assignee, plot_id } = req.body;
            if (!assignee || !plot_id) return res.status(400).json({ error: 'assignee, plot_id required' });

            const remove = db.transaction(() => {
                const plot = db.prepare('SELECT * FROM garden_plots WHERE id = ? AND assignee = ?')
                    .get(plot_id, assignee);
                if (!plot) throw new Error('NOT_FOUND');
                if (plot.status !== 'planted') throw new Error('NOT_PLANTED');

                if (plot.tree_id) {
                    db.prepare('DELETE FROM trees WHERE id = ?').run(plot.tree_id);
                }
                db.prepare('UPDATE garden_plots SET status = ?, tree_id = NULL WHERE id = ?')
                    .run('cleared', plot_id);
                return { success: true };
            });

            remove();
            res.json({ success: true });
        } catch (err) {
            if (err.message === 'NOT_FOUND') return res.status(404).json({ error: '地块不存在' });
            if (err.message === 'NOT_PLANTED') return res.status(400).json({ error: '该地块没有植物' });
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/plots/move', (req, res) => {
        try {
            const { assignee, from_plot_id, to_plot_id } = req.body;
            if (!assignee || !from_plot_id || !to_plot_id) {
                return res.status(400).json({ error: 'assignee, from_plot_id, to_plot_id required' });
            }

            const move = db.transaction(() => {
                const fromPlot = db.prepare('SELECT * FROM garden_plots WHERE id = ? AND assignee = ?')
                    .get(from_plot_id, assignee);
                const toPlot = db.prepare('SELECT * FROM garden_plots WHERE id = ? AND assignee = ?')
                    .get(to_plot_id, assignee);

                if (!fromPlot || !toPlot) throw new Error('NOT_FOUND');
                if (fromPlot.status !== 'planted') throw new Error('NOT_PLANTED');
                if (toPlot.status !== 'cleared') throw new Error('TARGET_NOT_CLEARED');

                db.prepare('UPDATE garden_plots SET status = ?, tree_id = ? WHERE id = ?')
                    .run('planted', fromPlot.tree_id, to_plot_id);
                db.prepare('UPDATE garden_plots SET status = ?, tree_id = NULL WHERE id = ?')
                    .run('cleared', from_plot_id);

                if (fromPlot.tree_id) {
                    db.prepare('UPDATE trees SET position_x = ?, position_y = ? WHERE id = ?')
                        .run(toPlot.x, toPlot.y, fromPlot.tree_id);
                }

                return { success: true };
            });

            move();
            res.json({ success: true });
        } catch (err) {
            if (err.message === 'NOT_FOUND') return res.status(404).json({ error: '地块不存在' });
            if (err.message === 'NOT_PLANTED') return res.status(400).json({ error: '源地块没有植物' });
            if (err.message === 'TARGET_NOT_CLEARED') return res.status(400).json({ error: '目标地块不是空地' });
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/plots/speedup', (req, res) => {
        try {
            const { assignee, plot_id } = req.body;
            if (!assignee || !plot_id) return res.status(400).json({ error: 'assignee, plot_id required' });

            const speedup = db.transaction(() => {
                const plot = db.prepare('SELECT * FROM garden_plots WHERE id = ? AND assignee = ?')
                    .get(plot_id, assignee);
                if (!plot) throw new Error('NOT_FOUND');
                if (plot.status !== 'planted' || !plot.tree_id) throw new Error('NOT_PLANTED');

                const tree = db.prepare('SELECT * FROM trees WHERE id = ?').get(plot.tree_id);
                if (!tree) throw new Error('NOT_FOUND');
                if ((tree.growth_minutes || 0) >= TREE_MATURE_MINUTES) throw new Error('ALREADY_MATURE');

                const { balance } = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                    .get(assignee);
                if (balance < SPEEDUP_COST) throw new Error('INSUFFICIENT');

                db.prepare('UPDATE coin_accounts SET balance = balance - ? WHERE assignee = ?')
                    .run(SPEEDUP_COST, assignee);
                db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                    .run(assignee, -SPEEDUP_COST, 'speedup', tree.tree_type);

                const newMinutes = Math.min(TREE_MATURE_MINUTES, (tree.growth_minutes || 0) + SPEEDUP_MINUTES);
                const newStatus = newMinutes >= TREE_MATURE_MINUTES ? 'grown' : 'growing';
                db.prepare('UPDATE trees SET growth_minutes = ?, status = ? WHERE id = ?')
                    .run(newMinutes, newStatus, tree.id);

                const newBalance = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?')
                    .get(assignee).balance;
                const updatedTree = db.prepare('SELECT * FROM trees WHERE id = ?').get(tree.id);

                return { balance: newBalance, tree: updatedTree, cost: SPEEDUP_COST };
            });

            const result = speedup();
            res.json(result);
        } catch (err) {
            if (err.message === 'NOT_FOUND') return res.status(404).json({ error: '不存在' });
            if (err.message === 'NOT_PLANTED') return res.status(400).json({ error: '没有植物' });
            if (err.message === 'ALREADY_MATURE') return res.status(400).json({ error: '已经成熟了' });
            if (err.message === 'INSUFFICIENT') return res.status(400).json({ error: '喵喵币不足 😿' });
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/backpack/:assignee', (req, res) => {
        try {
            const plants = db.prepare(
                `SELECT t.id, t.tree_type, t.growth_minutes, t.status, t.planted_at,
                        gp.island_id, i.name as island_name
                 FROM trees t
                 LEFT JOIN garden_plots gp ON gp.tree_id = t.id
                 LEFT JOIN islands i ON gp.island_id = i.id
                 WHERE t.assignee = ?
                 ORDER BY t.planted_at DESC`
            ).all(req.params.assignee);

            const result = plants.map(p => ({
                id: p.id,
                tree_type: p.tree_type,
                growth_minutes: p.growth_minutes || 0,
                status: p.status,
                planted_at: p.planted_at,
                island_name: p.island_name || '未知',
                price: PLANT_CATALOG[p.tree_type] ?? 0,
            }));

            res.json({ plants: result });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
};
