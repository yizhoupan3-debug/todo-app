/* eslint-disable no-console */
/**
 * Codex aggregator path resolution tests.
 *
 * Verifies that the resolver can find the aggregator repo from:
 * - explicit environment overrides
 * - non-Documents home layouts
 * - workspace sibling layouts
 *
 * Run: node tests/codex-aggregator-paths.test.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const modulePath = path.join(__dirname, '..', 'server', 'codex-aggregator.js');

/**
 * Create the minimum aggregator directory markers used by the resolver.
 * @param {string} root Aggregator root directory.
 * @returns {void}
 */
function createAggregatorRoot(root) {
  fs.mkdirSync(path.join(root, 'app', 'data'), { recursive: true });
  fs.mkdirSync(path.join(root, 'cpa-instances', 'instance-3'), { recursive: true });
  fs.writeFileSync(path.join(root, 'cpa-instances', 'instance-3', 'config.yaml'), 'api-keys:\n  - test-key\n');
}

/**
 * Load a fresh resolver module after environment or cwd changes.
 * @returns {{ resolveAggregatorPath: Function, getAggregatorRootCandidates: Function }} Fresh resolver exports.
 */
function loadResolver() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

/**
 * Assert a condition and throw when it fails.
 * @param {boolean} condition Condition to assert.
 * @param {string} message Error message.
 * @returns {void}
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Normalize a filesystem path for comparison.
 * @param {string} targetPath Filesystem path.
 * @returns {string} Real path when available, else absolute path.
 */
function normalizePath(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}

const originalEnv = {
  HOME: process.env.HOME,
  USERPROFILE: process.env.USERPROFILE,
  CODEX_AGGREGATOR_HOME: process.env.CODEX_AGGREGATOR_HOME,
  CODEX_AGGREGATOR_ROOT: process.env.CODEX_AGGREGATOR_ROOT,
  SUDO_USER: process.env.SUDO_USER,
};
const originalCwd = process.cwd();

try {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'panpu-codex-aggregator-paths-'));

  // Case 1: explicit env override.
  {
    const aggregatorRoot = path.join(tempRoot, 'explicit-root');
    createAggregatorRoot(aggregatorRoot);

    process.env.CODEX_AGGREGATOR_HOME = aggregatorRoot;
    process.env.CODEX_AGGREGATOR_ROOT = '';
    const { resolveAggregatorPath } = loadResolver();
    const resolved = resolveAggregatorPath('cpa-instances', 'instance-3', 'config.yaml');
    assert(resolved.exists, 'Expected explicit override path to resolve');
    assert(normalizePath(resolved.root) === normalizePath(aggregatorRoot), `Expected explicit root, got ${resolved.root}`);
  }

  // Case 2: home layout without Documents/.
  {
    const fakeHome = path.join(tempRoot, 'home-no-documents');
    const aggregatorRoot = path.join(fakeHome, '指示词宝库', 'codex-aggregator');
    createAggregatorRoot(aggregatorRoot);

    process.env.CODEX_AGGREGATOR_HOME = '';
    process.env.CODEX_AGGREGATOR_ROOT = '';
    process.env.HOME = fakeHome;
    process.env.USERPROFILE = fakeHome;
    const { resolveAggregatorPath } = loadResolver();
    const resolved = resolveAggregatorPath('cpa-instances', 'instance-3', 'config.yaml');
    assert(resolved.exists, 'Expected non-Documents home layout to resolve');
    assert(normalizePath(resolved.root) === normalizePath(aggregatorRoot), `Expected non-Documents home root, got ${resolved.root}`);
  }

  // Case 3: workspace sibling layout.
  {
    const workspaceParent = path.join(tempRoot, 'workspace-parent');
    const repoRoot = path.join(workspaceParent, 'todo_list_app');
    const aggregatorRoot = path.join(workspaceParent, '指示词宝库', 'codex-aggregator');
    createAggregatorRoot(aggregatorRoot);
    fs.mkdirSync(repoRoot, { recursive: true });

    process.env.CODEX_AGGREGATOR_HOME = '';
    process.env.CODEX_AGGREGATOR_ROOT = '';
    process.env.HOME = path.join(tempRoot, 'missing-home');
    process.env.USERPROFILE = path.join(tempRoot, 'missing-home');
    process.chdir(repoRoot);
    const { resolveAggregatorPath, getAggregatorRootCandidates } = loadResolver();
    const resolved = resolveAggregatorPath('cpa-instances', 'instance-3', 'config.yaml');
    assert(resolved.exists, 'Expected workspace sibling layout to resolve');
    assert(normalizePath(resolved.root) === normalizePath(aggregatorRoot), `Expected workspace sibling root, got ${resolved.root}`);
    assert(getAggregatorRootCandidates().map(normalizePath).includes(normalizePath(aggregatorRoot)), 'Expected workspace sibling root in candidate list');
  }

  console.log('✅ codex-aggregator path resolution tests passed');
} finally {
  process.chdir(originalCwd);
  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
}
