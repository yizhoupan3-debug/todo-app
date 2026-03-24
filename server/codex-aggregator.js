const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Return whether a directory looks like a valid Codex aggregator root.
 * @param {string} candidateRoot Absolute directory path.
 * @returns {boolean} True when the directory contains aggregator markers.
 */
function isAggregatorRoot(candidateRoot) {
  if (!candidateRoot || !fs.existsSync(candidateRoot)) return false;

  return fs.existsSync(path.join(candidateRoot, 'cpa-instances'))
    && fs.existsSync(path.join(candidateRoot, 'app'));
}

/**
 * Return the explicit aggregator root override from environment variables.
 * @returns {string} Explicit override path or empty string.
 */
function getExplicitAggregatorRoot() {
  return String(
    process.env.CODEX_AGGREGATOR_HOME
    || process.env.CODEX_AGGREGATOR_ROOT
    || '',
  ).trim();
}

/**
 * Build possible aggregator roots from one base directory.
 * @param {string} baseDir Absolute base directory.
 * @returns {string[]} Candidate aggregator roots.
 */
function buildRootsFromBase(baseDir) {
  if (!baseDir) return [];

  const normalized = path.resolve(baseDir);
  return [
    path.join(normalized, 'Documents', '指示词宝库', 'codex-aggregator'),
    path.join(normalized, '指示词宝库', 'codex-aggregator'),
    path.join(normalized, 'Desktop', '指示词宝库', 'codex-aggregator'),
    path.join(normalized, 'codex-aggregator'),
  ];
}

/**
 * Return candidate home directories that may own the aggregator workspace.
 * @returns {string[]} Candidate home directories.
 */
function getHomeDirCandidates() {
  const candidates = [
    os.homedir(),
    process.env.HOME,
    process.env.USERPROFILE,
  ].filter(Boolean);

  const sudoUser = String(process.env.SUDO_USER || '').trim();
  if (sudoUser) {
    candidates.push(path.join('/home', sudoUser));
    candidates.push(path.join('/Users', sudoUser));
  }

  return [...new Set(candidates.map((item) => path.resolve(item)))];
}

/**
 * Return workspace-relative directories that may contain a sibling aggregator repo.
 * @returns {string[]} Candidate workspace-relative base directories.
 */
function getWorkspaceBaseCandidates() {
  const repoRoot = path.resolve(__dirname, '..');
  const cwd = process.cwd();

  return [
    cwd,
    path.resolve(cwd, '..'),
    path.resolve(cwd, '..', '..'),
    repoRoot,
    path.resolve(repoRoot, '..'),
    path.resolve(repoRoot, '..', '..'),
  ].filter(Boolean);
}

/**
 * Return the preferred Codex aggregator root path for the current machine.
 * @returns {string} Preferred absolute aggregator root path.
 */
function getPreferredAggregatorRoot() {
  const explicitRoot = getExplicitAggregatorRoot();
  if (explicitRoot) return explicitRoot;

  const preferredHome = getHomeDirCandidates()[0] || os.homedir();
  return path.join(preferredHome, 'Documents', '指示词宝库', 'codex-aggregator');
}

/**
 * Return ordered candidate root paths for the Codex aggregator workspace.
 * @returns {string[]} Deduplicated absolute candidate root paths.
 */
function getAggregatorRootCandidates() {
  const explicitRoot = getExplicitAggregatorRoot();
  const preferredRoot = getPreferredAggregatorRoot();
  const candidates = [
    explicitRoot,
    preferredRoot,
    ...getHomeDirCandidates().flatMap(buildRootsFromBase),
    ...getWorkspaceBaseCandidates().flatMap(buildRootsFromBase),
    path.join('/opt', '指示词宝库', 'codex-aggregator'),
    path.join('/opt', 'codex-aggregator'),
    path.join('/srv', 'codex-aggregator'),
  ].filter(Boolean);

  const deduped = [...new Set(candidates.map((item) => path.resolve(item)))];
  const existing = deduped.filter(isAggregatorRoot);
  const missing = deduped.filter((item) => !existing.includes(item));
  return [...existing, ...missing];
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
