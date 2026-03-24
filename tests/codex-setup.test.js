/* eslint-disable no-console */
/**
 * Codex setup integration tests.
 *
 * Verifies shared skills auto-creation plus Codex/Antigravity dual-link setup.
 *
 * Run: node tests/codex-setup.test.js
 */

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'panpu-codex-setup-'));
const tempInstallHome = fs.mkdtempSync(path.join(os.tmpdir(), 'panpu-codex-install-'));
const port = 39000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const sharedSkillsPath = path.join(tempHome, 'Documents', '指示词宝库', 'skills');
const antigravitySkillsPath = path.join(tempHome, '.antigravity', 'skills');
const aggregatorRoot = path.join(tempHome, 'Documents', '指示词宝库', 'codex-aggregator');
const aggregatorDbPath = path.join(aggregatorRoot, 'app', 'data', 'aggregator.db');
const aggregatorConfigPath = path.join(aggregatorRoot, 'cpa-instances', 'instance-1', 'config.yaml');
const fakeCliProxyApiPath = path.join(tempHome, 'bin', 'cliproxyapi');

fs.mkdirSync(antigravitySkillsPath, { recursive: true });
fs.mkdirSync(path.dirname(fakeCliProxyApiPath), { recursive: true });
fs.writeFileSync(path.join(antigravitySkillsPath, 'legacy.txt'), 'legacy');
fs.mkdirSync(path.dirname(aggregatorDbPath), { recursive: true });
fs.mkdirSync(path.dirname(aggregatorConfigPath), { recursive: true });
fs.mkdirSync(path.join(aggregatorRoot, 'cpa-instances', 'instance-1', 'auths'), { recursive: true });

fs.writeFileSync(fakeCliProxyApiPath, `#!/bin/bash
set -euo pipefail

LOG_PATH="\${CPA_DEVICE_LOG:-\${CPA_OAUTH_LOG:-}}"
INSTANCE_DIR="$(cd "$(dirname "$LOG_PATH")/.." && pwd)"
mkdir -p "$INSTANCE_DIR/auths"

if printf '%s\\n' "$@" | grep -q -- '-codex-device-login'; then
  echo "Codex device URL: https://chat.openai.com/device"
  echo "Codex device code: TEST-CODE-1234"
  cat > "$INSTANCE_DIR/auths/codex-device@example.com-plus.json" <<'JSON'
{"access_token":"test-access-token","refresh_token":"test-refresh-token","id_token":"test-id-token","email":"device@example.com","expired":"2030-01-01T00:00:00+08:00","type":"codex"}
JSON
  exit 0
fi

if printf '%s\\n' "$@" | grep -q -- '-codex-login'; then
  echo "Visit the following URL to continue authentication: https://auth.example.com/oauth"
  exit 0
fi

echo "Unsupported fake CLIProxyAPI invocation: $*" >&2
exit 1
`, { mode: 0o755 });

const aggregatorDb = new Database(aggregatorDbPath);
aggregatorDb.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY,
    nickname TEXT,
    email TEXT,
    instance_num INTEGER,
    status TEXT,
    token_expires_at TEXT,
    rate_mult REAL
  );
`);
aggregatorDb.prepare(`
  INSERT INTO accounts (id, nickname, email, instance_num, status, token_expires_at, rate_mult)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(1, 'Account-A', 'alpha@example.com', 1, 'active', '2030-01-01T00:00:00Z', 1);
aggregatorDb.close();

fs.writeFileSync(aggregatorConfigPath, [
  'api-keys:',
  '  - test-key-123',
].join('\n'));

const server = spawn(process.execPath, ['server/server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    HOME: tempHome,
    PORT: String(port),
    CODEX_HOME: path.join(tempHome, '.codex'),
    ANTIGRAVITY_HOME: path.join(tempHome, '.antigravity'),
    CODEX_AGGREGATOR_HOME: aggregatorRoot,
    CLIPROXYAPI_BIN: fakeCliProxyApiPath,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.on('data', (chunk) => process.stdout.write(chunk));
server.stderr.on('data', (chunk) => process.stderr.write(chunk));

function request(method, routePath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const url = new URL(baseUrl + routePath);
    const req = http.request({
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (_) { /* keep raw text */ }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    try {
      const result = await request('GET', '/api/codex/setup-status');
      if (result.status === 200) return;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Server did not become ready in time.');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  await waitForServer();

  console.log('\n🔍 Codex setup integration tests\n');

  const initial = await request('GET', '/api/codex/setup-status');
  assert(initial.status === 200, `Expected 200 from setup-status, got ${initial.status}`);
  assert(initial.body.sharedSkillsSourcePath === sharedSkillsPath, 'Expected preferred shared skills path to be suggested');
  assert(initial.body.sharedSkillsExists === false, 'Expected shared skills directory to be missing initially');
  assert(initial.body.platforms.codex.status === 'missing', 'Expected Codex skills link to be missing initially');
  assert(initial.body.platforms.antigravity.status === 'directory', 'Expected Antigravity skills path to start as a plain directory');

  const applied = await request('POST', '/api/codex/apply-skills', {
    createIfMissing: true,
    platforms: ['codex', 'antigravity'],
  });
  assert(applied.status === 200, `Expected 200 from apply-skills, got ${applied.status}: ${JSON.stringify(applied.body)}`);
  assert(applied.body.success === true, 'Expected apply-skills success=true');
  assert(applied.body.sourceCreated === true, 'Expected shared skills directory to be auto-created');
  assert(applied.body.results.codex.status === 'symlink', 'Expected Codex to be linked after apply-skills');
  assert(applied.body.results.antigravity.status === 'symlink', 'Expected Antigravity to be linked after apply-skills');
  assert(applied.body.results.antigravity.backupPath, 'Expected Antigravity directory backup path to be returned');
  assert(fs.existsSync(applied.body.results.antigravity.backupPath), 'Expected Antigravity backup directory to exist');

  fs.mkdirSync(path.join(sharedSkillsPath, 'alpha'), { recursive: true });
  fs.writeFileSync(path.join(sharedSkillsPath, 'alpha', 'SKILL.md'), '# alpha\n');
  fs.mkdirSync(path.join(sharedSkillsPath, '.system', 'internal'), { recursive: true });
  fs.writeFileSync(path.join(sharedSkillsPath, '.system', 'internal', 'SKILL.md'), '# internal\n');
  fs.mkdirSync(path.join(sharedSkillsPath, 'dist', 'ignored'), { recursive: true });
  fs.writeFileSync(path.join(sharedSkillsPath, 'dist', 'ignored', 'SKILL.md'), '# ignored\n');

  const after = await request('GET', '/api/codex/setup-status');
  const installed = await request('GET', '/api/codex/installed-skills');
  const installManifest = await request('GET', '/api/codex/install-manifest');
  const unixInstallScript = await request('GET', '/api/codex/install-script');
  const proxyAccounts = await request('GET', '/api/codex/proxy-accounts');
  const aggregatorConfig = await request('GET', '/api/codex/aggregator-config');
  const authTriggered = await request('POST', '/api/codex/auth-instance', {
    instanceNum: 1,
    authMode: 'device',
    provider: 'codex',
  });
  const proxyAccountsAfterAuth = await request('GET', '/api/codex/proxy-accounts');
  const sharedRealPath = fs.realpathSync(sharedSkillsPath);
  assert(after.status === 200, `Expected 200 from setup-status after apply, got ${after.status}`);
  assert(after.body.sharedSkillsExists === true, 'Expected shared skills directory to exist after apply');
  assert(after.body.sharedSkillsCount === 2, `Expected shared skills count=2, got ${after.body.sharedSkillsCount}`);
  assert(after.body.platforms.codex.skillsCount === 2, `Expected Codex linked skills count=2, got ${after.body.platforms.codex.skillsCount}`);
  assert(after.body.platforms.antigravity.skillsCount === 2, `Expected Antigravity linked skills count=2, got ${after.body.platforms.antigravity.skillsCount}`);
  assert(fs.realpathSync(path.join(tempHome, '.codex', 'skills')) === sharedRealPath, 'Expected Codex skills realpath to match shared source');
  assert(fs.realpathSync(path.join(tempHome, '.antigravity', 'skills')) === sharedRealPath, 'Expected Antigravity skills realpath to match shared source');
  assert(installed.status === 200, `Expected 200 from installed-skills, got ${installed.status}`);
  assert(installed.body.count === 2, `Expected installed skills count=2, got ${installed.body.count}`);
  assert(installed.body.userCount === 1, `Expected user skills count=1, got ${installed.body.userCount}`);
  assert(installed.body.systemCount === 1, `Expected system skills count=1, got ${installed.body.systemCount}`);
  assert(installed.body.skills.some((skill) => skill.name === 'alpha' && skill.category === 'user'), 'Expected alpha user skill in installed-skills response');
  assert(installed.body.skills.some((skill) => skill.name === 'internal' && skill.category === 'system'), 'Expected internal system skill in installed-skills response');
  assert(installManifest.status === 200, `Expected 200 from install-manifest, got ${installManifest.status}`);
  assert(installManifest.body.skillsCount === 2, `Expected install-manifest skillsCount=2, got ${installManifest.body.skillsCount}`);
  assert(Array.isArray(installManifest.body.files) && installManifest.body.files.some((file) => file.path === 'alpha/SKILL.md'), 'Expected alpha/SKILL.md in install manifest');
  assert(installManifest.body.files.some((file) => file.path === '.system/internal/SKILL.md'), 'Expected .system/internal/SKILL.md in install manifest');
  assert(unixInstallScript.status === 200, `Expected 200 from install-script, got ${unixInstallScript.status}`);
  assert(typeof unixInstallScript.body === 'string' && unixInstallScript.body.includes('/api/codex/install-manifest'), 'Expected unix install script to point to install-manifest');
  assert(proxyAccounts.status === 200, `Expected 200 from proxy-accounts, got ${proxyAccounts.status}`);
  assert(proxyAccounts.body.accounts.length === 1, `Expected one proxy account, got ${proxyAccounts.body.accounts.length}`);
  assert(proxyAccounts.body.accounts[0].nickname === 'Account-A', 'Expected proxy account nickname from aggregator db');
  assert(proxyAccounts.body.accounts[0].instanceNum === 1, 'Expected proxy account instance number from aggregator db');
  assert(aggregatorConfig.status === 200, `Expected 200 from aggregator-config, got ${aggregatorConfig.status}`);
  assert(aggregatorConfig.body.apiKey === 'test-key-123', `Expected aggregator api key from config.yaml, got ${aggregatorConfig.body.apiKey}`);
  assert(authTriggered.status === 200, `Expected 200 from auth-instance, got ${authTriggered.status}: ${JSON.stringify(authTriggered.body)}`);
  assert(authTriggered.body.verificationUri === 'https://chat.openai.com/device', `Expected device verification URL, got ${authTriggered.body.verificationUri}`);
  assert(authTriggered.body.userCode === 'TEST-CODE-1234', `Expected device user code, got ${authTriggered.body.userCode}`);
  assert(proxyAccountsAfterAuth.status === 200, `Expected 200 from proxy-accounts after auth, got ${proxyAccountsAfterAuth.status}`);
  assert(proxyAccountsAfterAuth.body.accounts[0].hasToken === true, 'Expected proxy account to become authorized after direct auth');
  assert(proxyAccountsAfterAuth.body.accounts[0].email === 'device@example.com', `Expected proxy account email from auth file, got ${proxyAccountsAfterAuth.body.accounts[0].email}`);

  const codexInstallTarget = path.join(tempInstallHome, '.codex', 'skills');
  const antigravityInstallTarget = path.join(tempInstallHome, '.antigravity', 'skills');
  fs.mkdirSync(codexInstallTarget, { recursive: true });
  fs.mkdirSync(antigravityInstallTarget, { recursive: true });
  fs.writeFileSync(path.join(codexInstallTarget, 'legacy.txt'), 'legacy');
  fs.writeFileSync(path.join(antigravityInstallTarget, 'legacy.txt'), 'legacy');

  const installScriptPath = path.join(tempInstallHome, 'install-skills.sh');
  fs.writeFileSync(installScriptPath, unixInstallScript.body, { mode: 0o755 });
  await new Promise((resolve, reject) => {
    const installer = spawn('bash', [installScriptPath], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        HOME: tempInstallHome,
        CODEX_HOME: path.join(tempInstallHome, '.codex'),
        ANTIGRAVITY_HOME: path.join(tempInstallHome, '.antigravity'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    installer.stdout.on('data', (chunk) => process.stdout.write(chunk));
    installer.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    installer.on('error', reject);
    installer.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Install script failed with code ${code}: ${stderr}`));
    });
  });

  assert(fs.existsSync(path.join(codexInstallTarget, 'alpha', 'SKILL.md')), 'Expected alpha skill to be copied into local ~/.codex/skills');
  assert(fs.existsSync(path.join(codexInstallTarget, '.system', 'internal', 'SKILL.md')), 'Expected system skill to be copied into local ~/.codex/skills');
  assert(fs.existsSync(path.join(antigravityInstallTarget, 'alpha', 'SKILL.md')), 'Expected alpha skill to be copied into local ~/.antigravity/skills');
  assert(fs.existsSync(path.join(antigravityInstallTarget, '.system', 'internal', 'SKILL.md')), 'Expected system skill to be copied into local ~/.antigravity/skills');
  const codexBackupName = fs.readdirSync(path.join(tempInstallHome, '.codex')).find((name) => name.startsWith('skills.bak-install-'));
  const antigravityBackupName = fs.readdirSync(path.join(tempInstallHome, '.antigravity')).find((name) => name.startsWith('skills.bak-install-'));
  assert(!!codexBackupName, 'Expected ~/.codex/skills backup to be created before real import');
  assert(!!antigravityBackupName, 'Expected ~/.antigravity/skills backup to be created before real import');
  assert(fs.existsSync(path.join(tempInstallHome, '.codex', codexBackupName)), 'Expected ~/.codex backup directory to exist');
  assert(fs.existsSync(path.join(tempInstallHome, '.antigravity', antigravityBackupName)), 'Expected ~/.antigravity backup directory to exist');
  assert(fs.lstatSync(codexInstallTarget).isSymbolicLink() === false, 'Expected ~/.codex/skills to become a real directory after local import');
  assert(fs.lstatSync(antigravityInstallTarget).isSymbolicLink() === false, 'Expected ~/.antigravity/skills to become a real directory after local import');

  console.log('  ✅ auto-create shared skills source');
  console.log('  ✅ relink Codex + Antigravity to one shared library');
  console.log('  ✅ count regular + .system skills and ignore dist');
  console.log('  ✅ generate portable local install manifest + script');
  console.log('  ✅ install real files into local ~/.codex/skills and ~/.antigravity/skills');
  console.log('  ✅ expose real installed skill library');
  console.log('  ✅ resolve Codex aggregator data from HOME/Documents');
  console.log('  ✅ start device auth directly without relying on a separate dashboard');
  console.log('\n🎉 Codex setup integration tests passed\n');
}

run()
  .catch((error) => {
    console.error(`\n❌ ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill('SIGTERM');
  });
