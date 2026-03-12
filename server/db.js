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

module.exports = db;
