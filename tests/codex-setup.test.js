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

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'panpu-codex-setup-'));
const port = 39000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const sharedSkillsPath = path.join(tempHome, 'Documents', '指示词宝库', 'skills');
const antigravitySkillsPath = path.join(tempHome, '.antigravity', 'skills');

fs.mkdirSync(antigravitySkillsPath, { recursive: true });
fs.writeFileSync(path.join(antigravitySkillsPath, 'legacy.txt'), 'legacy');

const server = spawn(process.execPath, ['server/server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    HOME: tempHome,
    PORT: String(port),
    CODEX_HOME: path.join(tempHome, '.codex'),
    ANTIGRAVITY_HOME: path.join(tempHome, '.antigravity'),
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

  console.log('  ✅ auto-create shared skills source');
  console.log('  ✅ relink Codex + Antigravity to one shared library');
  console.log('  ✅ count regular + .system skills and ignore dist');
  console.log('  ✅ expose real installed skill library');
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
