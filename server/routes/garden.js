const express = require('express');
const router = express.Router();
const db = require('../db');
const shared = require('./garden-shared');

require('./garden-coins')(router, { db, ...shared });
require('./garden-plots')(router, { db, ...shared });
require('./garden-expeditions')(router, { db, ...shared });

/* ── Consolidated endpoint: one round-trip for garden open() ── */
router.get('/all/:assignee', (req, res) => {
    try {
        const assignee = req.params.assignee;
        const islandId = req.query.island; // optional: ?island=<id>

        // 1) Balance
        const balRow = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?').get(assignee);
        const balance = balRow ? balRow.balance : 0;

        // 2) Islands
        const islands = db.prepare('SELECT * FROM islands WHERE assignee = ? ORDER BY id').all(assignee);

        // 3) Determine which island to load plots for
        let targetIsland = islandId
            ? islands.find(i => String(i.id) === String(islandId))
            : islands.find(i => i.island_type === 'starter') || islands[0];

        // 4) Plots for target island (reuses ensureIslandSceneGrid via the plots route logic)
        let plots = [];
        if (targetIsland) {
            // Inline ensureIslandSceneGrid logic
            const BASE_GRID_W = 8, BASE_GRID_H = 6;
            const gridW = Math.max(BASE_GRID_W, Number(targetIsland.grid_w) || BASE_GRID_W);
            const gridH = Math.max(BASE_GRID_H, Number(targetIsland.grid_h) || BASE_GRID_H);

            plots = db.prepare(
                `SELECT gp.*, t.tree_type, t.growth_minutes, t.status as tree_status, t.planted_at, t.last_harvested
                 FROM garden_plots gp
                 LEFT JOIN trees t ON gp.tree_id = t.id
                 WHERE gp.assignee = ? AND gp.island_id = ?
                 ORDER BY gp.y, gp.x`
            ).all(assignee, targetIsland.id);
        }

        // 5) Boats
        const boats = db.prepare('SELECT * FROM boats WHERE assignee = ? ORDER BY id').all(assignee);

        // 6) Expeditions (with completion side-effects)
        const expeditions = db.prepare(
            'SELECT * FROM expeditions WHERE assignee = ? ORDER BY started_at DESC LIMIT 10'
        ).all(assignee);

        const now = new Date();
        for (const exp of expeditions) {
            if (exp.status === 'sailing') {
                const startTime = new Date(exp.started_at.replace(' ', 'T') + '+08:00');
                const elapsed = (now - startTime) / 60000;
                if (elapsed >= exp.duration_min) {
                    db.prepare("UPDATE expeditions SET status = 'completed', completed_at = datetime('now','localtime') WHERE id = ?").run(exp.id);
                    db.prepare('UPDATE islands SET discovered = 1 WHERE id = ?').run(exp.to_island_id);
                    db.prepare("UPDATE boats SET status = 'docked' WHERE id = ?").run(exp.boat_id);
                    exp.status = 'completed';
                }
            }
        }

        res.json({ balance, islands, plots, boats, expeditions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

