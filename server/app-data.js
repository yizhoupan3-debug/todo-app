const fs = require('fs');
const path = require('path');

/**
 * Resolve the writable application data directory.
 * @returns {string} Absolute path to the active data directory.
 */
function getAppDataDir() {
  return process.env.TODO_APP_DATA_DIR || path.join(__dirname, '..', 'data');
}

/**
 * Ensure a directory exists before use.
 * @param {string} dirPath Absolute or relative directory path.
 * @returns {string} The same directory path after creation.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Resolve the SQLite database file path for the current runtime.
 * @returns {string} Absolute path to todo.db.
 */
function getAppDbPath() {
  return path.join(getAppDataDir(), 'todo.db');
}

/**
 * Resolve the journal upload directory for the current runtime.
 * @returns {string} Absolute path to the journal upload directory.
 */
function getJournalUploadDir() {
  return path.join(getAppDataDir(), 'journal');
}

module.exports = {
  ensureDir,
  getAppDataDir,
  getAppDbPath,
  getJournalUploadDir,
};
