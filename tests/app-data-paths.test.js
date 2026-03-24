/* eslint-disable no-console */
/**
 * Verify all runtime data paths are derived from TODO_APP_DATA_DIR.
 *
 * Run: /usr/local/bin/node tests/app-data-paths.test.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-app-data-'));
const customDataDir = path.join(tempRoot, 'persistent-data');

process.env.TODO_APP_DATA_DIR = customDataDir;

const { getAppDataDir, getAppDbPath, getJournalUploadDir } = require('../server/app-data');
const journalRouter = require('../server/routes/journal');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  assert(getAppDataDir() === customDataDir, `Expected app data dir=${customDataDir}, got ${getAppDataDir()}`);
  assert(getAppDbPath() === path.join(customDataDir, 'todo.db'), `Expected db path inside custom dir, got ${getAppDbPath()}`);
  assert(getJournalUploadDir() === path.join(customDataDir, 'journal'), `Expected journal dir inside custom dir, got ${getJournalUploadDir()}`);
  assert(journalRouter.uploadDir === getJournalUploadDir(), `Expected journal router upload dir=${getJournalUploadDir()}, got ${journalRouter.uploadDir}`);
  assert(fs.existsSync(journalRouter.uploadDir), 'Expected journal upload directory to be created');
  console.log('✅ App data paths are centralized under TODO_APP_DATA_DIR');
} finally {
  const db = require('../server/db');
  db.close();
}
