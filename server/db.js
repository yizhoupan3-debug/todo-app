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
    grid_w INTEGER NOT NULL DEFAULT 6,
    grid_h INTEGER NOT NULL DEFAULT 4,
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
// Migrate: add auto_complete column if missing
try {
  db.prepare("SELECT auto_complete FROM tasks LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE tasks ADD COLUMN auto_complete INTEGER NOT NULL DEFAULT 1");
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
try {
  db.prepare("SELECT growth_minutes FROM trees LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE trees ADD COLUMN growth_minutes INTEGER NOT NULL DEFAULT 0");
}

// Migrate: add island_id column to garden_plots if missing
try {
  db.prepare("SELECT island_id FROM garden_plots LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE garden_plots ADD COLUMN island_id INTEGER DEFAULT NULL");
}

// Seed starter islands if empty
const islandCount = db.prepare('SELECT COUNT(*) as count FROM islands').get();
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
        "INSERT INTO islands (assignee, name, island_type, grid_w, grid_h, discovered, position_x, position_y) VALUES (?, '起始岛', 'starter', 6, 4, 1, 0, 0)"
      ).run(user);

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
        // Random grid size: 4-8 wide, 3-5 tall
        const gw = 4 + Math.floor(Math.random() * 5); // 4~8
        const gh = 3 + Math.floor(Math.random() * 3); // 3~5
        db.prepare(
          'INSERT INTO islands (assignee, name, island_type, grid_w, grid_h, discovered, position_x, position_y) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
        ).run(user, name, 'normal', gw, gh, d.dx, d.dy);
      }
    }
  });
  seedIslands();
}

// Seed garden plots if empty (6x4 = 24 plots per user)
const plotCount = db.prepare('SELECT COUNT(*) as count FROM garden_plots').get();
if (plotCount.count === 0) {
  const obstacles = ['rock', 'weed', 'wild_tree'];
  // Get starter island IDs
  const starterIslands = db.prepare("SELECT id, assignee FROM islands WHERE island_type = 'starter'").all();
  const insertPlot = db.prepare(
    'INSERT INTO garden_plots (assignee, x, y, status, obstacle_type, island_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const seedPlots = db.transaction(() => {
    for (const island of starterIslands) {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 6; x++) {
          const isCenter = (x === 2 || x === 3) && (y === 1 || y === 2);
          if (isCenter) {
            insertPlot.run(island.assignee, x, y, 'cleared', null, island.id);
          } else {
            const obs = y < 2 ? 'wild_tree' : obstacles[Math.floor(Math.random() * obstacles.length)];
            insertPlot.run(island.assignee, x, y, 'wasteland', obs, island.id);
          }
        }
      }
    }
  });
  seedPlots();
}

module.exports = db;

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
try {
  db.prepare("SELECT last_harvested FROM trees LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE trees ADD COLUMN last_harvested TEXT DEFAULT NULL");
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
