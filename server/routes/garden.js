const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Server-side plant price catalog (source of truth) ──
const PLANT_CATALOG = {
    sprout: 0, rice: 5, strawberry: 8, sunflower: 10, corn: 12,
    mushroom: 15, tulip: 20, daisy: 22, hibiscus: 25, sakura: 30,
    chrysanthemum: 35, true_lavender: 38, pumpkin: 42, bamboo: 45,
    pine: 50, oak: 50, peach: 55, mint: 60, orange_tree: 65,
    lotus: 70, palm: 80, christmas: 80, maple: 95,
    cactus: 100, rose: 100, peony: 110, grape: 120,
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

// ── Harvest Coins from Mature Plants ("收菜") ──
const PLANT_TIERS = {
    // tier 1: cheap plants → 1 coin
    sprout: 1, rice: 1, strawberry: 1, sunflower: 1, corn: 1, mushroom: 1,
    // tier 2: mid plants → 1~2 coins
    tulip: 2, daisy: 2, hibiscus: 2, sakura: 2, chrysanthemum: 2, true_lavender: 2,
    pumpkin: 2, bamboo: 2,
    // tier 3: expensive plants → 1~3 coins
    pine: 3, oak: 3, peach: 3, mint: 3, orange_tree: 3, lotus: 3,
    palm: 3, christmas: 3, maple: 3, cactus: 3, rose: 3, peony: 3,
    grape: 3, clover: 3, lavender: 3,
};

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

            // Determine reward based on plant tier
            const maxReward = PLANT_TIERS[tree.tree_type] || 1;
            const reward = Math.floor(Math.random() * maxReward) + 1; // 1 to maxReward

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

// ═══════════════════════════════════════════
// ══ Multi-island Exploration System ════════
// ═══════════════════════════════════════════

const BOAT_CATALOG = {
    raft: { name: '小木筏', cost: 200, icon: '🛶', duration: 60 },
    sailboat: { name: '帆船', cost: 500, icon: '⛵', duration: 300 },
    galleon: { name: '大帆船', cost: 1000, icon: '🚢', duration: 720 },
};

const CHARACTER_MAP = { '潘潘': '小八', '蒲蒲': '乌撒奇' };

const ISLAND_NAMES = [
    '骷髅礁', '翡翠湾', '珊瑚岛', '月牙岬', '雷霆岩',
    '迷雾港', '黄金沙洲', '幽灵岛', '椰风岛', '火山口',
    '星落湾', '藏宝阁', '深海礁', '鲸歌岬', '龙脊岛',
    '碧波屿', '暴风角', '日落湾', '潮汐岩', '神秘群礁',
];

function randomIslandName(assignee) {
    const existing = db.prepare('SELECT name FROM islands WHERE assignee = ?').all(assignee).map(r => r.name);
    const available = ISLAND_NAMES.filter(n => !existing.includes(n));
    if (available.length === 0) return '未知岛 #' + (existing.length + 1);
    return available[Math.floor(Math.random() * available.length)];
}

// ── Get All Islands ──
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

// ── Get Boats ──
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

// ── Buy a Boat ──
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

// ── Start Expedition ──
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

            // Find an undiscovered island or create a new one
            let targetIsland = db.prepare(
                'SELECT * FROM islands WHERE assignee = ? AND discovered = 0 ORDER BY RANDOM() LIMIT 1'
            ).get(assignee);

            if (!targetIsland) {
                // Generate a new undiscovered island at a random position
                const name = randomIslandName(assignee);
                const gw = boat.boat_type === 'galleon' ? 6 + Math.floor(Math.random() * 3) :
                    boat.boat_type === 'sailboat' ? 5 + Math.floor(Math.random() * 2) :
                        4 + Math.floor(Math.random() * 2);
                const gh = boat.boat_type === 'galleon' ? 4 + Math.floor(Math.random() * 2) :
                    3 + Math.floor(Math.random() * 2);
                const angle = Math.random() * Math.PI * 2;
                const dist = 1 + Math.random();
                const px = Math.round(Math.cos(angle) * dist * 10) / 10;
                const py = Math.round(Math.sin(angle) * dist * 10) / 10;

                const ins = db.prepare(
                    'INSERT INTO islands (assignee, name, island_type, grid_w, grid_h, discovered, position_x, position_y) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
                ).run(assignee, name, 'normal', gw, gh, px, py);
                targetIsland = db.prepare('SELECT * FROM islands WHERE id = ?').get(ins.lastInsertRowid);
            }

            // Mark boat as sailing
            db.prepare("UPDATE boats SET status = 'sailing' WHERE id = ?").run(boat.id);

            // Create expedition record
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

// ── Check Expedition Status ──
router.get('/expeditions/:assignee', (req, res) => {
    try {
        const expeditions = db.prepare(
            'SELECT * FROM expeditions WHERE assignee = ? ORDER BY started_at DESC LIMIT 10'
        ).all(req.params.assignee);

        // Auto-complete any expired sailing expeditions
        const now = new Date();
        for (const exp of expeditions) {
            if (exp.status === 'sailing') {
                const startTime = new Date(exp.started_at.replace(' ', 'T') + '+08:00');
                const elapsed = (now - startTime) / 60000; // minutes
                if (elapsed >= exp.duration_min) {
                    // Expedition complete!
                    db.prepare("UPDATE expeditions SET status = 'completed', completed_at = datetime('now','localtime') WHERE id = ?")
                        .run(exp.id);
                    // Discover the island
                    db.prepare('UPDATE islands SET discovered = 1 WHERE id = ?')
                        .run(exp.to_island_id);
                    // Dock the boat
                    db.prepare("UPDATE boats SET status = 'docked' WHERE id = ?")
                        .run(exp.boat_id);
                    // Generate plots for the new island
                    const island = db.prepare('SELECT * FROM islands WHERE id = ?').get(exp.to_island_id);
                    const plotExists = db.prepare('SELECT COUNT(*) as c FROM garden_plots WHERE island_id = ?').get(island.id);
                    if (plotExists.c === 0) {
                        const obstacles = ['rock', 'weed', 'wild_tree'];
                        const insertPlot = db.prepare(
                            'INSERT INTO garden_plots (assignee, x, y, status, obstacle_type, island_id) VALUES (?, ?, ?, ?, ?, ?)'
                        );
                        for (let y = 0; y < island.grid_h; y++) {
                            for (let x = 0; x < island.grid_w; x++) {
                                const obs = obstacles[Math.floor(Math.random() * obstacles.length)];
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

// ── Get Plots for a specific island ──
router.get('/plots/:assignee/:islandId', (req, res) => {
    try {
        const plots = db.prepare(
            `SELECT gp.*, t.tree_type, t.growth_minutes, t.status as tree_status, t.planted_at
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

module.exports = router;
