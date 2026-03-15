const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'todo.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read/write
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT NOT NULL DEFAULT '📋',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘', '蒲蒲')),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 2 CHECK(priority IN (1, 2, 3)),
    due_date TEXT,
    due_time TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurring_type TEXT CHECK(recurring_type IN ('daily', 'weekly', 'monthly', 'custom')),
    recurring_interval INTEGER DEFAULT 1,
    recurring_end_date TEXT,
    recurring_parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_recurring_parent ON tasks(recurring_parent_id);

  CREATE TABLE IF NOT EXISTS checkin_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'water',
    amount INTEGER NOT NULL,
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘', '蒲蒲')),
    date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_checkin_date ON checkin_records(date);
  CREATE INDEX IF NOT EXISTS idx_checkin_assignee ON checkin_records(assignee);

  CREATE TABLE IF NOT EXISTS checkin_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'water',
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘', '蒲蒲')),
    goal INTEGER NOT NULL DEFAULT 2000,
    UNIQUE(type, assignee)
  );

  CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘', '蒲蒲')),
    focus_minutes INTEGER NOT NULL,
    rounds INTEGER NOT NULL DEFAULT 1,
    task_title TEXT,
    date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_pomodoro_date ON pomodoro_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_pomodoro_assignee ON pomodoro_sessions(assignee);

  CREATE TABLE IF NOT EXISTS coin_accounts (
    assignee TEXT PRIMARY KEY CHECK(assignee IN ('潘潘','蒲蒲')),
    balance INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS coin_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘','蒲蒲')),
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_coin_tx_assignee ON coin_transactions(assignee);

  CREATE TABLE IF NOT EXISTS trees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘','蒲蒲')),
    tree_type TEXT NOT NULL,
    planted_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    status TEXT NOT NULL DEFAULT 'growing' CHECK(status IN ('growing','grown')),
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_trees_assignee ON trees(assignee);

  CREATE TABLE IF NOT EXISTS garden_plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘','蒲蒲')),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'wasteland' CHECK(status IN ('wasteland','cleared','planted')),
    obstacle_type TEXT DEFAULT NULL,
    tree_id INTEGER DEFAULT NULL,
    island_id INTEGER DEFAULT NULL,
    UNIQUE(assignee, x, y, island_id)
  );
  CREATE INDEX IF NOT EXISTS idx_plots_assignee ON garden_plots(assignee);

  -- ═══ Multi-island exploration system ═══
  CREATE TABLE IF NOT EXISTS islands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘','蒲蒲')),
    name TEXT NOT NULL DEFAULT '起始岛',
    island_type TEXT NOT NULL DEFAULT 'starter',
    grid_w INTEGER NOT NULL DEFAULT 8,
    grid_h INTEGER NOT NULL DEFAULT 6,
    discovered INTEGER NOT NULL DEFAULT 1,
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_islands_assignee ON islands(assignee);

  CREATE TABLE IF NOT EXISTS boats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘','蒲蒲')),
    boat_type TEXT NOT NULL DEFAULT 'raft',
    name TEXT NOT NULL DEFAULT '小木筏',
    status TEXT NOT NULL DEFAULT 'docked',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_boats_assignee ON boats(assignee);

  CREATE TABLE IF NOT EXISTS expeditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘','蒲蒲')),
    boat_id INTEGER NOT NULL,
    from_island_id INTEGER NOT NULL,
    to_island_id INTEGER,
    character TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sailing',
    started_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    duration_min INTEGER NOT NULL DEFAULT 30,
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_expeditions_assignee ON expeditions(assignee);

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

// Seed default categories if empty
// Migrate: add auto_complete column if missing (using pragma for reliability)
{
  const cols = db.pragma('table_info(tasks)').map(c => c.name);
  if (!cols.includes('auto_complete')) {
    db.exec("ALTER TABLE tasks ADD COLUMN auto_complete INTEGER NOT NULL DEFAULT 1");
  }
}

// Migrate: add end_time column if missing
{
  const cols = db.pragma('table_info(tasks)').map(c => c.name);
  if (!cols.includes('end_time')) {
    db.exec("ALTER TABLE tasks ADD COLUMN end_time TEXT DEFAULT NULL");
  }
}
const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (catCount.count === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name, color, icon, sort_order) VALUES (?, ?, ?, ?)');
  const defaultCategories = [
    ['工作', '#ef4444', '💼', 1],
    ['生活', '#22c55e', '🏠', 2],
    ['学习', '#3b82f6', '📚', 3],
    ['健康', '#f97316', '💪', 4],
    ['其他', '#8b5cf6', '📌', 5],
  ];
  const insertMany = db.transaction((cats) => {
    for (const cat of cats) {
      insertCat.run(...cat);
    }
  });
  insertMany(defaultCategories);
}

// Seed coin accounts if empty
const coinCount = db.prepare('SELECT COUNT(*) as count FROM coin_accounts').get();
if (coinCount.count === 0) {
  db.prepare("INSERT INTO coin_accounts (assignee, balance) VALUES ('潘潘', 5)").run();
  db.prepare("INSERT INTO coin_accounts (assignee, balance) VALUES ('蒲蒲', 5)").run();
}

// Migrate: add growth_minutes column to trees if missing
{
  const cols = db.pragma('table_info(trees)').map(c => c.name);
  if (!cols.includes('growth_minutes')) {
    db.exec("ALTER TABLE trees ADD COLUMN growth_minutes INTEGER NOT NULL DEFAULT 0");
  }
}

// Migrate: add island_id column to garden_plots if missing
{
  const cols = db.pragma('table_info(garden_plots)').map(c => c.name);
  if (!cols.includes('island_id')) {
    db.exec("ALTER TABLE garden_plots ADD COLUMN island_id INTEGER DEFAULT NULL");
  }
}

// Seed starter islands if empty
const islandCount = db.prepare('SELECT COUNT(*) as count FROM islands').get();
const STARTER_GRID_W = 8;
const STARTER_GRID_H = 6;

function isForestPlot(x, y, gridW, gridH) {
  const forestRows = Math.max(3, Math.floor(gridH * 0.5));
  return y < forestRows || (y === forestRows && x > 0 && x < gridW - 1);
}

function isStarterInitialClearedPlot(x, y, gridW, gridH) {
  const unlockedRow = Math.min(gridH - 2, Math.max(1, Math.floor(gridH * 0.58)));
  const startX = Math.max(0, Math.floor((gridW - 3) / 2));
  return y === unlockedRow && x >= startX && x < Math.min(gridW, startX + 3);
}

function pickObstacleForPlot(x, y, gridW, gridH) {
  if (isForestPlot(x, y, gridW, gridH)) return 'wild_tree';
  const frontierPool = x <= 1 || x >= gridW - 2 || y >= gridH - 1
    ? ['weed', 'rock', 'weed', 'rock', 'weed']
    : ['weed', 'rock', 'weed'];
  return frontierPool[Math.floor(Math.random() * frontierPool.length)];
}

function getPlotSeedState(islandType, x, y, gridW, gridH) {
  if (islandType === 'starter' && isStarterInitialClearedPlot(x, y, gridW, gridH)) {
    return { status: 'cleared', obstacle: null };
  }
  return {
    status: 'wasteland',
    obstacle: pickObstacleForPlot(x, y, gridW, gridH),
  };
}

if (islandCount.count === 0) {
  const ISLAND_NAMES = [
    '骷髅礁', '翡翠湾', '珊瑚岛', '月牙岬', '雷霆岩',
    '迷雾港', '黄金沙洲', '幽灵岛', '椰风岛', '火山口',
    '星落湾', '藏宝阁', '深海礁', '鲸歌岬', '龙脊岛',
  ];
  const seedIslands = db.transaction(() => {
    for (const user of ['潘潘', '蒲蒲']) {
      // Create starter island (center position)
      const starter = db.prepare(
        "INSERT INTO islands (assignee, name, island_type, grid_w, grid_h, discovered, position_x, position_y) VALUES (?, '起始岛', 'starter', ?, ?, 1, 0, 0)"
      ).run(user, STARTER_GRID_W, STARTER_GRID_H);

      // Link existing plots to this starter island
      db.prepare('UPDATE garden_plots SET island_id = ? WHERE assignee = ? AND island_id IS NULL')
        .run(starter.lastInsertRowid, user);

      // Create 4 undiscovered foggy neighbor islands
      const dirs = [
        { dx: 0, dy: -1 },  // North
        { dx: 1, dy: 0 },   // East
        { dx: 0, dy: 1 },   // South
        { dx: -1, dy: 0 },  // West
      ];
      for (const d of dirs) {
        const name = ISLAND_NAMES[Math.floor(Math.random() * ISLAND_NAMES.length)];
        const gw = STARTER_GRID_W + Math.floor(Math.random() * 3); // 8~10
        const gh = STARTER_GRID_H + Math.floor(Math.random() * 2); // 6~7
        db.prepare(
          'INSERT INTO islands (assignee, name, island_type, grid_w, grid_h, discovered, position_x, position_y) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
        ).run(user, name, 'normal', gw, gh, d.dx, d.dy);
      }
    }
  });
  seedIslands();
}

// Seed garden plots if empty (starter island uses 8x6 = 48 plots per user)
const plotCount = db.prepare('SELECT COUNT(*) as count FROM garden_plots').get();
if (plotCount.count === 0) {
  // Get starter island IDs
  const starterIslands = db.prepare("SELECT id, assignee, island_type, grid_w, grid_h FROM islands WHERE island_type = 'starter'").all();
  const insertPlot = db.prepare(
    'INSERT INTO garden_plots (assignee, x, y, status, obstacle_type, island_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const seedPlots = db.transaction(() => {
    for (const island of starterIslands) {
      const gridW = Math.max(STARTER_GRID_W, Number(island.grid_w) || STARTER_GRID_W);
      const gridH = Math.max(STARTER_GRID_H, Number(island.grid_h) || STARTER_GRID_H);
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          const seedState = getPlotSeedState(island.island_type, x, y, gridW, gridH);
          insertPlot.run(
            island.assignee,
            x,
            y,
            seedState.status,
            seedState.obstacle,
            island.id
          );
        }
      }
    }
  });
  seedPlots();
}


// ── Coin earning system migrations ──

// Migrate: checkin_streaks table for tracking consecutive days
db.exec(`
  CREATE TABLE IF NOT EXISTS checkin_streaks (
    assignee TEXT NOT NULL CHECK(assignee IN ('潘潘','蒲蒲')),
    type TEXT NOT NULL DEFAULT 'water',
    current_streak INTEGER NOT NULL DEFAULT 0,
    last_date TEXT,
    reward_3_claimed TEXT,
    reward_7_claimed TEXT,
    UNIQUE(assignee, type)
  );
`);

// Migrate: add last_harvested column to trees if missing
{
  const cols = db.pragma('table_info(trees)').map(c => c.name);
  if (!cols.includes('last_harvested')) {
    db.exec("ALTER TABLE trees ADD COLUMN last_harvested TEXT DEFAULT NULL");
  }
}

// Migrate: coin_accounts.balance from INTEGER to REAL for decimal support
try {
  // Check current type — if INTEGER, migrate
  const info = db.pragma('table_info(coin_accounts)');
  const balCol = info.find(c => c.name === 'balance');
  if (balCol && balCol.type === 'INTEGER') {
    db.exec(`
      CREATE TABLE IF NOT EXISTS coin_accounts_new (
        assignee TEXT PRIMARY KEY CHECK(assignee IN ('潘潘','蒲蒲')),
        balance REAL NOT NULL DEFAULT 0
      );
      INSERT OR REPLACE INTO coin_accounts_new SELECT assignee, CAST(balance AS REAL) FROM coin_accounts;
      DROP TABLE coin_accounts;
      ALTER TABLE coin_accounts_new RENAME TO coin_accounts;
    `);
  }
} catch (e) { /* already migrated or fresh */ }

// Migrate: coin_transactions.amount from INTEGER to REAL
try {
  const info = db.pragma('table_info(coin_transactions)');
  const amtCol = info.find(c => c.name === 'amount');
  if (amtCol && amtCol.type === 'INTEGER') {
    db.exec(`
      CREATE TABLE IF NOT EXISTS coin_transactions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignee TEXT NOT NULL CHECK(assignee IN ('潘潘','蒲蒲')),
        amount REAL NOT NULL,
        reason TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      INSERT INTO coin_transactions_new SELECT * FROM coin_transactions;
      DROP TABLE coin_transactions;
      ALTER TABLE coin_transactions_new RENAME TO coin_transactions;
      CREATE INDEX IF NOT EXISTS idx_coin_tx_assignee ON coin_transactions(assignee);
    `);
  }
} catch (e) { /* already migrated or fresh */ }

// One-time migration: ensure both users start with 5 coins on existing databases
try {
  const grantKey = 'initial_coin_grant_v1';
  const alreadyGranted = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(grantKey);
  if (!alreadyGranted) {
    const ensureInitialCoins = db.transaction(() => {
      const users = ['潘潘', '蒲蒲'];
      for (const user of users) {
        const account = db.prepare('SELECT balance FROM coin_accounts WHERE assignee = ?').get(user);
        if (!account) {
          db.prepare('INSERT INTO coin_accounts (assignee, balance) VALUES (?, 5)').run(user);
          continue;
        }
        if (account.balance === 0) {
          db.prepare('UPDATE coin_accounts SET balance = 5 WHERE assignee = ?').run(user);
        }
      }
      db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run(grantKey, '1');
    });
    ensureInitialCoins();
  }
} catch (e) { /* ignore migration failures */ }

// One-time migration: convert island upper rows into forest wasteland so the forest layer is truly cuttable.
try {
  const migrationKey = 'forest_plot_obstacles_v1';
  const alreadyDone = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(migrationKey);
  if (!alreadyDone) {
    const islands = db.prepare('SELECT id, grid_h FROM islands').all();
    const updateForestPlots = db.prepare(`
      UPDATE garden_plots
      SET obstacle_type = 'wild_tree'
      WHERE island_id = ?
        AND status = 'wasteland'
        AND y < ?
    `);
    const migrateForestPlots = db.transaction(() => {
      for (const island of islands) {
        const forestRows = Math.max(1, Math.ceil((Number(island.grid_h) || 4) * 0.5));
        updateForestPlots.run(island.id, forestRows);
      }
      db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run(migrationKey, '1');
    });
    migrateForestPlots();
  }
} catch (e) { /* ignore migration failures */ }

// One-time migration: expand starter/default islands to 8x6 and backfill missing scene plots.
try {
  const migrationKey = 'garden_scene_grid_v2';
  const alreadyDone = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(migrationKey);
  if (!alreadyDone) {
    const islands = db.prepare('SELECT id, assignee, island_type, grid_w, grid_h FROM islands').all();
    const updateIslandGrid = db.prepare('UPDATE islands SET grid_w = ?, grid_h = ? WHERE id = ?');
    const getIslandPlots = db.prepare('SELECT id, x, y, status FROM garden_plots WHERE island_id = ?');
    const insertPlot = db.prepare(
      'INSERT INTO garden_plots (assignee, x, y, status, obstacle_type, island_id) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const updateObstacle = db.prepare(
      'UPDATE garden_plots SET obstacle_type = ? WHERE id = ? AND status = ?'
    );

    const migrateSceneGrid = db.transaction(() => {
      for (const island of islands) {
        const gridW = Math.max(STARTER_GRID_W, Number(island.grid_w) || STARTER_GRID_W);
        const gridH = Math.max(STARTER_GRID_H, Number(island.grid_h) || STARTER_GRID_H);
        if (gridW !== island.grid_w || gridH !== island.grid_h) {
          updateIslandGrid.run(gridW, gridH, island.id);
        }

        const existingPlots = getIslandPlots.all(island.id);
        const plotMap = new Map(existingPlots.map(plot => [`${plot.x},${plot.y}`, plot]));

        for (let y = 0; y < gridH; y++) {
          for (let x = 0; x < gridW; x++) {
            const existing = plotMap.get(`${x},${y}`);
            const seedState = getPlotSeedState(island.island_type, x, y, gridW, gridH);
            if (!existing) {
              insertPlot.run(island.assignee, x, y, seedState.status, seedState.obstacle, island.id);
              continue;
            }
            if (existing.status === 'wasteland' && seedState.obstacle) {
              updateObstacle.run(seedState.obstacle, existing.id, 'wasteland');
            }
          }
        }
      }
      db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run(migrationKey, '1');
    });

    migrateSceneGrid();
  }
} catch (e) { /* ignore migration failures */ }

// One-time migration: unlock the starter island's first 3 farm plots for accounts that still have no progress.
try {
  const migrationKey = 'starter_initial_plots_v1';
  const alreadyDone = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(migrationKey);
  if (!alreadyDone) {
    const starterIslands = db.prepare(
      "SELECT id, grid_w, grid_h FROM islands WHERE island_type = 'starter'"
    ).all();
    const getUnlockedCount = db.prepare(
      "SELECT COUNT(*) as count FROM garden_plots WHERE island_id = ? AND status <> 'wasteland'"
    );
    const unlockStarterPlot = db.prepare(
      "UPDATE garden_plots SET status = 'cleared', obstacle_type = NULL WHERE island_id = ? AND x = ? AND y = ? AND status = 'wasteland'"
    );

    const migrateStarterUnlocks = db.transaction(() => {
      for (const island of starterIslands) {
        if (getUnlockedCount.get(island.id).count > 0) continue;
        const gridW = Math.max(STARTER_GRID_W, Number(island.grid_w) || STARTER_GRID_W);
        const gridH = Math.max(STARTER_GRID_H, Number(island.grid_h) || STARTER_GRID_H);
        for (let y = 0; y < gridH; y++) {
          for (let x = 0; x < gridW; x++) {
            if (!isStarterInitialClearedPlot(x, y, gridW, gridH)) continue;
            unlockStarterPlot.run(island.id, x, y);
          }
        }
      }
      db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run(migrationKey, '1');
    });

    migrateStarterUnlocks();
  }
} catch (e) { /* ignore migration failures */ }

// ── Journal / Diary tables (手帐 canvas) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS journal_elements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    author TEXT NOT NULL CHECK(author IN ('潘潘','蒲蒲')),
    element_type TEXT NOT NULL DEFAULT 'text' CHECK(element_type IN ('text','photo')),
    content TEXT DEFAULT '',
    photo_path TEXT DEFAULT NULL,
    pos_x REAL NOT NULL DEFAULT 50,
    pos_y REAL NOT NULL DEFAULT 50,
    width REAL NOT NULL DEFAULT 200,
    height REAL NOT NULL DEFAULT 150,
    rotation REAL NOT NULL DEFAULT 0,
    z_index INTEGER NOT NULL DEFAULT 0,
    crop_data TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_elements_entry ON journal_elements(entry_id);
`);

// Migrate: add style_data column to journal_elements if missing
{
  const cols = db.pragma('table_info(journal_elements)').map(c => c.name);
  if (!cols.includes('style_data')) {
    db.exec("ALTER TABLE journal_elements ADD COLUMN style_data TEXT DEFAULT NULL");
  }
}

module.exports = db;
