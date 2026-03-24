const db = require('../db');
const {
    isForestPlot,
    isStarterInitialClearedPlot,
    pickObstacleForPlot,
    getPlotSeedState,
} = require('../garden-utils');

/**
 * Ensure a coin_accounts row exists for the given assignee.
 * Prevents undefined balance on first interaction.
 * @param {string} assignee
 */
function ensureAccount(assignee) {
    db.prepare('INSERT OR IGNORE INTO coin_accounts (assignee, balance) VALUES (?, 0)').run(assignee);
}

const PLANT_CATALOG = {
    sprout: 0, rice: 5, strawberry: 8, sunflower: 10, corn: 12,
    mushroom: 15, tulip: 20, daisy: 22, hibiscus: 25, sakura: 30,
    chrysanthemum: 35, true_lavender: 38, pumpkin: 42, bamboo: 45,
    pine: 50, oak: 50, peach: 55, mint: 60, orange_tree: 65,
    lotus: 70, palm: 80, christmas: 80, maple: 95,
    cactus: 100, rose: 100, peony: 110, grape: 120,
    clover: 150, lavender: 200,
};

const PLANT_TIERS = {
    sprout: 1, rice: 1, strawberry: 1, sunflower: 1, corn: 1, mushroom: 1,
    tulip: 2, daisy: 2, hibiscus: 2, sakura: 2, chrysanthemum: 2, true_lavender: 2,
    pumpkin: 2, bamboo: 2,
    pine: 3, oak: 3, peach: 3, mint: 3, orange_tree: 3, lotus: 3,
    palm: 3, christmas: 3, maple: 3, cactus: 3, rose: 3, peony: 3,
    grape: 3, clover: 3, lavender: 3,
};

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

// ── Grid constants ──
const BASE_GRID_W = 4;
const BASE_GRID_H = 4;

// ── Game balance constants ──
const TREE_MATURE_MINUTES = 150;
const SPEEDUP_COST = 5;
const SPEEDUP_MINUTES = 50;
const TASK_REWARD = 1.5;
const CHECKIN_DAILY_REWARD = 2;
const CHECKIN_STREAK_3_BONUS = 3;
const CHECKIN_STREAK_7_BONUS = 10;

// ── Shared plot helper functions ──

/**
 * Initialize garden_plots for a newly discovered island.
 * @param {object} db - database instance
 * @param {object} island - island row with id, assignee, island_type, grid_w, grid_h
 */
function initIslandPlots(db, island) {
    const existing = db.prepare('SELECT COUNT(*) as c FROM garden_plots WHERE island_id = ?').get(island.id);
    if (existing.c > 0) return;
    const insertPlot = db.prepare(
        'INSERT INTO garden_plots (assignee, x, y, status, obstacle_type, island_id) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (let y = 0; y < island.grid_h; y++) {
        for (let x = 0; x < island.grid_w; x++) {
            const seed = getPlotSeedState(island.island_type, x, y, island.grid_w, island.grid_h);
            insertPlot.run(island.assignee, x, y, seed.status, seed.obstacle, island.id);
        }
    }
}

/**
 * Resolve completed expeditions in-place: update DB status for any
 * sailing expedition whose duration has elapsed.
 * @param {object} db - database instance
 * @param {Array} expeditions - expedition rows (mutated in place)
 */
function resolveCompletedExpeditions(db, expeditions) {
    const now = new Date();
    for (const exp of expeditions) {
        if (exp.status !== 'sailing') continue;
        const startTime = new Date(exp.started_at.replace(' ', 'T') + '+08:00');
        const elapsed = (now - startTime) / 60000;
        if (elapsed >= exp.duration_min) {
            db.prepare("UPDATE expeditions SET status = 'completed', completed_at = datetime('now','localtime') WHERE id = ?").run(exp.id);
            db.prepare('UPDATE islands SET discovered = 1 WHERE id = ?').run(exp.to_island_id);
            db.prepare("UPDATE boats SET status = 'docked' WHERE id = ?").run(exp.boat_id);
            const newIsland = db.prepare('SELECT * FROM islands WHERE id = ?').get(exp.to_island_id);
            if (newIsland) initIslandPlots(db, newIsland);
            exp.status = 'completed';
        }
    }
}

module.exports = {
    PLANT_CATALOG,
    PLANT_TIERS,
    BOAT_CATALOG,
    CHARACTER_MAP,
    randomIslandName,
    ensureAccount,
    BASE_GRID_W,
    BASE_GRID_H,
    TREE_MATURE_MINUTES,
    SPEEDUP_COST,
    SPEEDUP_MINUTES,
    TASK_REWARD,
    CHECKIN_DAILY_REWARD,
    CHECKIN_STREAK_3_BONUS,
    CHECKIN_STREAK_7_BONUS,
    isForestPlot,
    isStarterInitialClearedPlot,
    pickObstacleForPlot,
    getPlotSeedState,
    initIslandPlots,
    resolveCompletedExpeditions,
};
