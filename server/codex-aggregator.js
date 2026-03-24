const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Return the preferred Codex aggregator root path for the current machine.
 * @returns {string} Preferred absolute aggregator root path.
 */
function getPreferredAggregatorRoot() {
  return process.env.CODEX_AGGREGATOR_HOME
    || process.env.CODEX_AGGREGATOR_ROOT
    || path.join(os.homedir(), 'Documents', '指示词宝库', 'codex-aggregator');
}

/**
 * Return ordered candidate root paths for the Codex aggregator workspace.
 * @returns {string[]} Deduplicated absolute candidate root paths.
 */
function getAggregatorRootCandidates() {
  const preferredRoot = getPreferredAggregatorRoot();
  const candidates = [
    preferredRoot,
    path.join(__dirname, '..', '..', '指示词宝库', 'codex-aggregator'),
    path.join('/opt', '指示词宝库', 'codex-aggregator'),
  ].filter(Boolean);

  return [...new Set(candidates)];
}

/**
 * Resolve a path inside the Codex aggregator workspace.
 * @param {...string} relativeSegments Relative path segments inside the aggregator root.
 * @returns {{ root: string, path: string, exists: boolean, candidates: string[] }} Resolved path metadata.
 */
function resolveAggregatorPath(...relativeSegments) {
  const candidates = getAggregatorRootCandidates();
  for (const root of candidates) {
    const candidatePath = path.join(root, ...relativeSegments);
    if (fs.existsSync(candidatePath)) {
      return {
        root,
        path: candidatePath,
        exists: true,
        candidates,
      };
    }
  }

  const fallbackRoot = candidates[0] || getPreferredAggregatorRoot();
  return {
    root: fallbackRoot,
    path: path.join(fallbackRoot, ...relativeSegments),
    exists: false,
    candidates,
  };
}

module.exports = {
  getPreferredAggregatorRoot,
  getAggregatorRootCandidates,
  resolveAggregatorPath,
};
