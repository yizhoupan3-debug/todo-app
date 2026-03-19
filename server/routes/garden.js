const express = require('express');
const router = express.Router();
const db = require('../db');
const shared = require('./garden-shared');

require('./garden-coins')(router, { db, ...shared });
require('./garden-plots')(router, { db, ...shared });
require('./garden-expeditions')(router, { db, ...shared });

const { resolveCompletedExpeditions } = shared;

/* ── POST: explicitly resolve completed expeditions ── */
router.post('/resolve-expeditions', (req, res) => {
    try {
        const { assignee } = req.body;
        if (!assignee) return res.status(400).json({ error: 'assignee required' });

        const expeditions = db.prepare(
            'SELECT * FROM expeditions WHERE assignee = ? ORDER BY started_at DESC LIMIT 10'
        ).all(assignee);

        resolveCompletedExpeditions(db, expeditions);

        res.json({ expeditions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

        // 4) Plots for target island
        let plots = [];
        if (targetIsland) {
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

        // 6) Expeditions — resolve any completed ones via shared helper
        const expeditions = db.prepare(
            'SELECT * FROM expeditions WHERE assignee = ? ORDER BY started_at DESC LIMIT 10'
        ).all(assignee);

        resolveCompletedExpeditions(db, expeditions);

        res.json({ balance, islands, plots, boats, expeditions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

