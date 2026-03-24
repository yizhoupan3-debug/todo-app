/**
 * Pure utility functions for garden plot generation.
 * Shared between db.js (bootstrap seeding) and routes/garden-shared.js (runtime).
 * These functions have NO database dependency — they are purely computational.
 */

/**
 * Determine whether a plot coordinate falls in the forest zone.
 * @param {number} x - column index
 * @param {number} y - row index
 * @param {number} gridW - island grid width
 * @param {number} gridH - island grid height
 * @returns {boolean}
 */
function isForestPlot(x, y, gridW, gridH) {
  const forestRows = Math.max(3, Math.floor(gridH * 0.5));
  return y < forestRows || (y === forestRows && x > 0 && x < gridW - 1);
}

/**
 * Determine whether a starter island plot should start as cleared.
 * @param {number} x - column index
 * @param {number} y - row index
 * @param {number} gridW - island grid width
 * @param {number} gridH - island grid height
 * @returns {boolean}
 */
function isStarterInitialClearedPlot(x, y, gridW, gridH) {
  const unlockedRow = Math.min(gridH - 2, Math.max(1, Math.floor(gridH * 0.58)));
  const startX = Math.max(0, Math.floor((gridW - 3) / 2));
  return y === unlockedRow && x >= startX && x < Math.min(gridW, startX + 3);
}

/**
 * Pick an obstacle type for a wasteland plot based on position.
 * @param {number} x - column index
 * @param {number} y - row index
 * @param {number} gridW - island grid width
 * @param {number} gridH - island grid height
 * @returns {string} obstacle type ('wild_tree' | 'weed' | 'rock')
 */
function pickObstacleForPlot(x, y, gridW, gridH) {
  if (isForestPlot(x, y, gridW, gridH)) return 'wild_tree';
  const frontierPool = x <= 1 || x >= gridW - 2 || y >= gridH - 1
    ? ['weed', 'rock', 'weed', 'rock', 'weed']
    : ['weed', 'rock', 'weed'];
  return frontierPool[Math.floor(Math.random() * frontierPool.length)];
}

/**
 * Get the initial state for a plot when an island is first created.
 * @param {string} islandType - 'starter' or 'normal'
 * @param {number} x - column index
 * @param {number} y - row index
 * @param {number} gridW - island grid width
 * @param {number} gridH - island grid height
 * @returns {{ status: string, obstacle: string|null }}
 */
function getPlotSeedState(islandType, x, y, gridW, gridH) {
  if (islandType === 'starter' && isStarterInitialClearedPlot(x, y, gridW, gridH)) {
    return { status: 'cleared', obstacle: null };
  }
  return {
    status: 'wasteland',
    obstacle: pickObstacleForPlot(x, y, gridW, gridH),
  };
}

module.exports = {
  isForestPlot,
  isStarterInitialClearedPlot,
  pickObstacleForPlot,
  getPlotSeedState,
};
