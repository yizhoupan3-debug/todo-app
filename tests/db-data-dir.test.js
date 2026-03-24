/* eslint-disable no-console */
/**
 * Verify database path honors TODO_APP_DATA_DIR.
 *
 * Run: /usr/local/bin/node tests/db-data-dir.test.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-db-dir-'));
const customDataDir = path.join(tempRoot, 'persistent-data');

process.env.TODO_APP_DATA_DIR = customDataDir;

const db = require('../server/db');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  assert(db.dataDir === customDataDir, `Expected dataDir=${customDataDir}, got ${db.dataDir}`);
  assert(db.dbPath === path.join(customDataDir, 'todo.db'), `Expected dbPath inside custom data dir, got ${db.dbPath}`);
  assert(fs.existsSync(customDataDir), 'Expected custom data directory to be created');
  assert(fs.existsSync(db.dbPath), 'Expected todo.db to be created in custom data dir');
  console.log('✅ TODO_APP_DATA_DIR is honored by server/db.js');
} finally {
  db.close();
}
