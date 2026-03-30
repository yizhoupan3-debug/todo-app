/* eslint-disable no-console */
/**
 * Legacy garden DB migration regression test.
 *
 * Verifies that an old database with:
 * - garden_plots UNIQUE(assignee, x, y)
 * - starter island still at 6x4
 * can be upgraded in-place by server/db.js without runtime 500s.
 *
 * Run: node tests/db-garden-migration.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-garden-migration-'));
const customDataDir = path.join(tempRoot, 'data');
fs.mkdirSync(customDataDir, { recursive: true });

process.env.TODO_APP_DATA_DIR = customDataDir;
process.env.PORT = '0';

const legacyDbPath = path.join(customDataDir, 'todo.db');
const legacyDb = new Database(legacyDbPath);

function seedLegacyGardenDb() {
    legacyDb.exec(`
      CREATE TABLE islands (
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

      CREATE TABLE garden_plots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignee TEXT NOT NULL CHECK(assignee IN ('潘潘','蒲蒲')),
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'wasteland' CHECK(status IN ('wasteland','cleared','planted')),
        obstacle_type TEXT DEFAULT NULL,
        tree_id INTEGER DEFAULT NULL,
        island_id INTEGER DEFAULT NULL,
        UNIQUE(assignee, x, y)
      );

      CREATE TABLE app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);

    const insertIsland = legacyDb.prepare(`
      INSERT INTO islands (assignee, name, island_type, grid_w, grid_h, discovered, position_x, position_y)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const puStarter = insertIsland.run('蒲蒲', '起始岛', 'starter', 6, 4, 1, 0, 0).lastInsertRowid;
    const puNormal = insertIsland.run('蒲蒲', '迷雾港', 'normal', 5, 4, 0, 1, 0).lastInsertRowid;
    const panStarter = insertIsland.run('潘潘', '起始岛', 'starter', 6, 4, 1, 0, 0).lastInsertRowid;

    const insertPlot = legacyDb.prepare(`
      INSERT INTO garden_plots (assignee, x, y, status, obstacle_type, island_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const [assignee, islandId] of [['蒲蒲', puStarter], ['潘潘', panStarter]]) {
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 6; x++) {
                insertPlot.run(assignee, x, y, (x === 0 && y === 0) ? 'cleared' : 'wasteland', 'wild_tree', islandId);
            }
        }
    }

    return { puStarter, puNormal, panStarter };
}

async function main() {
    const ids = seedLegacyGardenDb();
    legacyDb.close();

    const db = require('../server/db');
    const { startServer, stopServer } = require('../server/server');

    try {
        const gardenPlotsSql = db.prepare(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'garden_plots'"
        ).get().sql;
        assert.ok(
            gardenPlotsSql.includes('UNIQUE(assignee, x, y, island_id)'),
            `garden_plots unique constraint not migrated: ${gardenPlotsSql}`
        );

        const migrationKey = db.prepare(
            "SELECT value FROM app_meta WHERE key = 'garden_scene_grid_v2'"
        ).get();
        assert.ok(migrationKey, 'garden_scene_grid_v2 not recorded in app_meta');

        const starter = db.prepare('SELECT grid_w, grid_h FROM islands WHERE id = ?').get(ids.puStarter);
        assert.deepStrictEqual(starter, { grid_w: 8, grid_h: 6 }, 'starter island not expanded to 8x6');

        const starterPlotCount = db.prepare(
            'SELECT COUNT(*) AS count FROM garden_plots WHERE island_id = ?'
        ).get(ids.puStarter).count;
        assert.strictEqual(starterPlotCount, 48, `expected 48 starter plots, got ${starterPlotCount}`);

        const normalPlotCount = db.prepare(
            'SELECT COUNT(*) AS count FROM garden_plots WHERE island_id = ?'
        ).get(ids.puNormal).count;
        assert.strictEqual(normalPlotCount, 48, `expected 48 normal-island plots, got ${normalPlotCount}`);

        const duplicateInsert = db.prepare(`
          INSERT INTO garden_plots (assignee, x, y, status, obstacle_type, island_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        duplicateInsert.run('蒲蒲', 0, 0, 'wasteland', 'wild_tree', 999);

        const srv = await startServer({ port: 0, host: '127.0.0.1' });
        const port = srv.address().port;
        const res = await fetch(`http://127.0.0.1:${port}/api/garden/plots/${encodeURIComponent('蒲蒲')}`);
        const text = await res.text();
        assert.strictEqual(res.status, 200, `expected /api/garden/plots to return 200, got ${res.status}: ${text}`);
        const plots = JSON.parse(text);
        assert.ok(Array.isArray(plots), 'garden plots response should be an array');
        assert.ok(plots.length >= 96, `expected >= 96 plots after migration, got ${plots.length}`);

        console.log('✅ legacy garden DB migration works');
    } finally {
        try {
            await stopServer();
        } catch (_) {
            // ignore
        }
        db.close();
    }
}

main().catch((err) => {
    console.error('❌ db-garden-migration test failed');
    console.error(err);
    process.exit(1);
});
