const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const { resolveAggregatorPath } = require('../codex-aggregator');

// ── Quota cache (in-memory, 2-min TTL for success, 30s for errors) ──
const quotaCache = new Map();
const CACHE_TTL_OK = 2 * 60 * 1000;
const CACHE_TTL_ERR = 30 * 1000;
const DEVICE_SIGNAL_TIMEOUT_MS = Number(process.env.CODEX_AUTH_SIGNAL_TIMEOUT_MS || 8000);
const OAUTH_CALLBACK_PORT = Number(process.env.CODEX_OAUTH_CALLBACK_PORT || 1455);
const SKILL_EXPORT_IGNORED_NAMES = new Set(['dist', 'node_modules', '.git', '.DS_Store']);

function getCachedQuota(accountId) {
  const entry = quotaCache.get(accountId);
  if (!entry) return null;
  const ttl = entry.data.error ? CACHE_TTL_ERR : CACHE_TTL_OK;
  if (Date.now() - entry.ts > ttl) {
    quotaCache.delete(accountId);
    return null;
  }
  return entry.data;
}

function setCachedQuota(accountId, data) {
  quotaCache.set(accountId, { data, ts: Date.now() });
}

// ── Fetch quota from ChatGPT API ──
const PRIMARY_URL = 'https://chatgpt.com/backend-api/wham/usage';
const FALLBACK_URL = 'https://chatgpt.com/api/codex/usage';

async function fetchQuota(accessToken) {
  if (!accessToken) return { error: 'no_token' };

  const doFetch = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'PanpuTodo/1.0',
        },
      });
      clearTimeout(timeout);
      return res;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  };

  try {
    let res = await doFetch(PRIMARY_URL);

    // Fallback on 404
    if (res.status === 404) {
      try { res = await doFetch(FALLBACK_URL); } catch (_) { /* use original */ }
    }

    if (res.status === 401 || res.status === 403) {
      return { error: 'expired' };
    }
    if (!res.ok) {
      return { error: 'fetch_failed', status: res.status };
    }

    const data = await res.json();
    return {
      plan_type: data.plan_type || 'unknown',
      primary_used: data.rate_limit?.primary_window?.used_percent ?? null,
      primary_reset: data.rate_limit?.primary_window?.reset_at ?? null,
      primary_window_secs: data.rate_limit?.primary_window?.limit_window_seconds ?? null,
      secondary_used: data.rate_limit?.secondary_window?.used_percent ?? null,
      secondary_reset: data.rate_limit?.secondary_window?.reset_at ?? null,
      secondary_window_secs: data.rate_limit?.secondary_window?.limit_window_seconds ?? null,
      credits_balance: data.credits?.balance ?? null,
    };
  } catch (e) {
    if (e.name === 'AbortError') return { error: 'timeout' };
    return { error: 'network_error', message: e.message };
  }
}

// ── Prepared statements ──
const listAccounts = db.prepare('SELECT id, name, account, email, access_token, created_at FROM codex_accounts ORDER BY created_at DESC');
const getAccount = db.prepare('SELECT * FROM codex_accounts WHERE id = ?');
const insertAccount = db.prepare(`
  INSERT INTO codex_accounts (name, account, password, email, email_password, access_token)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const updateAccount = db.prepare(`
  UPDATE codex_accounts SET name=?, account=?, password=?, email=?, email_password=?, access_token=?, updated_at=datetime('now','localtime')
  WHERE id = ?
`);
const deleteAccountStmt = db.prepare('DELETE FROM codex_accounts WHERE id = ?');

/**
 * Simple origin guard — block direct browser navigation to sensitive endpoints.
 * Only allows requests with a matching Origin/Referer header (same-origin AJAX)
 * or non-browser clients (curl, scripts).
 */
function requireSameOrigin(req, res, next) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  // If neither header is present, this is likely a server/script call → allow
  if (!origin && !referer) return next();
  // If Origin matches the host, allow
  const host = req.headers.host;
  if (origin && new URL(origin).host === host) return next();
  if (referer) {
    try {
      if (new URL(referer).host === host) return next();
    } catch (_) { /* malformed referer */ }
  }
  // Block cross-origin requests to sensitive data
  return res.status(403).json({ error: '禁止跨域访问敏感数据' });
}

// ── Routes ──
// IMPORTANT: Named routes MUST come before /:id to avoid route collision

// GET /api/codex/local-token — read token from ~/.codex/auth.json
router.get('/local-token', (req, res) => {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const authFile = path.join(codexHome, 'auth.json');

  try {
    if (!fs.existsSync(authFile)) {
      return res.json({ token: null, error: `文件不存在: ${authFile}` });
    }
    const raw = fs.readFileSync(authFile, 'utf-8');
    const data = JSON.parse(raw);
    const token = data?.tokens?.access_token || data?.access_token || null;
    if (!token) {
      return res.json({ token: null, error: '文件中未找到 access_token' });
    }
    res.json({ token });
  } catch (e) {
    res.json({ token: null, error: `读取失败: ${e.message}` });
  }
});

// ────────────────────────────────────────────
//  Codex-Aggregator Integration (read-only)
// ────────────────────────────────────────────
const { aggregatorDb } = require('../db');

/**
 * Build a stable fallback nickname for a fixed CPA instance.
 * @param {number} instanceNum Instance number (1-based).
 * @returns {string} Human-readable account nickname.
 */
function getDefaultAggregatorNickname(instanceNum) {
  return `Account-${String.fromCharCode(64 + Number(instanceNum || 0)) || '?'}`;
}

/**
 * Resolve filesystem paths required by one CPA auth flow.
 * @param {number} instanceNum Instance number (1-based).
 * @returns {{ instanceDir: string, configPath: string, authDir: string, deviceLogPath: string, oauthLogPath: string, root: string, exists: boolean }} Resolved auth paths.
 */
function resolveInstanceAuthPaths(instanceNum) {
  const instanceMeta = resolveAggregatorPath('cpa-instances', `instance-${instanceNum}`);
  const instanceDir = instanceMeta.path;

  return {
    instanceDir,
    configPath: path.join(instanceDir, 'config.yaml'),
    authDir: path.join(instanceDir, 'auths'),
    deviceLogPath: path.join(instanceDir, 'logs', 'oauth-device.log'),
    oauthLogPath: path.join(instanceDir, 'logs', 'oauth-browser.log'),
    root: instanceMeta.root,
    exists: instanceMeta.exists,
  };
}

/**
 * Return the CLIProxyAPI executable used to start auth flows.
 * @returns {string} Executable path or shell command name.
 */
function getCliProxyApiBin() {
  return String(process.env.CLIPROXYAPI_BIN || 'cliproxyapi').trim() || 'cliproxyapi';
}

/**
 * Parse device-login signal lines from a CLIProxyAPI log.
 * @param {string} text Raw device-login log text.
 * @returns {{ verificationUri: string|null, userCode: string|null, error: string|null }} Parsed device-login state.
 */
function parseDeviceSignal(text) {
  const verificationUri = text.match(/Codex device URL:\s*(\S+)/)?.[1] ?? null;
  const userCode = text.match(/Codex device code:\s*([A-Z0-9-]+)/)?.[1] ?? null;
  const errorLine = text.match(/Codex device authentication failed:\s*(.+)/)?.[1]
    ?? text.match(/\bfailed:\s*(.+)/i)?.[1]
    ?? null;

  return { verificationUri, userCode, error: errorLine };
}

/**
 * Parse browser OAuth signal lines from a CLIProxyAPI log.
 * @param {string} text Raw OAuth log text.
 * @returns {{ authorizationUrl: string|null, error: string|null }} Parsed OAuth launch state.
 */
function parseOauthSignal(text) {
  const authorizationUrl = text.match(/Visit the following URL to continue authentication:\s*(https:\/\/\S+)/)?.[1]
    ?? null;
  const errorLine = text.match(/authentication failed:\s*(.+)/i)?.[1]
    ?? text.match(/\bfailed:\s*(.+)/i)?.[1]
    ?? null;

  return { authorizationUrl, error: errorLine };
}

/**
 * Normalize raw provider errors into concise user-facing text.
 * @param {string} rawError Upstream auth error text.
 * @returns {string} Actionable user-facing error message.
 */
function normalizeAuthError(rawError) {
  const safeError = String(rawError || '').trim();

  if (/status 429/i.test(safeError) && /just a moment|cloudflare/i.test(safeError)) {
    return 'OpenAI 登录请求被风控或限流，请稍后重试。';
  }

  if (/required port is already in use/i.test(safeError)) {
    return '本机 OAuth 回调端口被旧登录进程占用，系统已清理残留监听，请再试一次。';
  }

  return safeError || '授权失败';
}

/**
 * Wait until a device-login log exposes a user code or terminal error.
 * @param {string} logPath Absolute device-login log path.
 * @param {number} timeoutMs Maximum wait time in milliseconds.
 * @returns {Promise<{ verificationUri: string|null, userCode: string|null, error: string|null }>} Parsed device-login state.
 */
async function waitForDeviceSignal(logPath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const text = await fsp.readFile(logPath, 'utf-8');
      const signal = parseDeviceSignal(text);
      if (signal.error || (signal.verificationUri && signal.userCode)) {
        return signal;
      }
    } catch {
      // Ignore read races while the log is still being created.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return { verificationUri: null, userCode: null, error: null };
}

/**
 * Wait until an OAuth log exposes a launch URL or terminal error.
 * @param {string} logPath Absolute OAuth log path.
 * @param {number} timeoutMs Maximum wait time in milliseconds.
 * @returns {Promise<{ authorizationUrl: string|null, error: string|null }>} Parsed OAuth launch state.
 */
async function waitForOauthSignal(logPath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const text = await fsp.readFile(logPath, 'utf-8');
      const signal = parseOauthSignal(text);
      if (signal.error || signal.authorizationUrl) {
        return signal;
      }
    } catch {
      // Ignore read races while the log is still being created.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return { authorizationUrl: null, error: null };
}

/**
 * Start a detached CLIProxyAPI auth command inside one CPA instance.
 * @param {object} options Detached command options.
 * @param {string} options.cwd Working directory for the child process.
 * @param {string} options.command Shell command to execute.
 * @param {object} options.env Extra environment variables for the child process.
 * @returns {Promise<void>} Resolves once the child process has been spawned.
 */
async function spawnDetachedAuthCommand({ cwd, command, env }) {
  const child = spawn('bash', ['-lc', command], {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      ...env,
    },
  });

  child.unref();
}

/**
 * Kill stale CLIProxyAPI OAuth callback listeners before starting a new OAuth flow.
 * @returns {Promise<void>} Resolves once stale listeners have been terminated.
 */
async function cleanupStaleOauthListeners() {
  const execFileP = promisify(execFile);
  const { stdout } = await execFileP('bash', [
    '-lc',
    `lsof -t -iTCP:${OAUTH_CALLBACK_PORT} -sTCP:LISTEN -c cliproxya || true`,
  ]);

  const pids = stdout
    .split(/\s+/)
    .map((item) => Number(item.trim()))
    .filter((pid) => Number.isFinite(pid) && pid > 0);

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Ignore stale PID termination failures.
    }
  }

  if (pids.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/**
 * Build fallback rows when aggregator.db is missing but the UI still needs instance cards.
 * @returns {Array<object>} Synthesized account rows for six fixed CPA instances.
 */
function buildFallbackAggregatorRows() {
  return Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    nickname: getDefaultAggregatorNickname(index + 1),
    email: null,
    instance_num: index + 1,
    status: 'unconfigured',
    token_expires_at: null,
    rate_mult: null,
  }));
}

/**
 * Decode JWT payload without verification — extracts email, plan type, subscription dates.
 * @param {string} token Raw JWT string.
 * @returns {object|null} Decoded payload or null.
 */
function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const [, payload = ''] = token.split('.');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(normalized + padding, 'base64').toString('utf-8'));
  } catch { return null; }
}

/**
 * Read auth state for a CPA instance from its auths/ directory.
 * @param {number} instanceNum Instance number (1–6).
 * @returns {{ email, planType, subscriptionActiveUntil, tokenExpiresAt }} Auth metadata.
 */
function readInstanceAuth(instanceNum) {
  const authDirMeta = resolveAggregatorPath('cpa-instances', `instance-${instanceNum}`, 'auths');
  const authDir = authDirMeta.path;
  const result = { email: null, planType: null, subscriptionActiveUntil: null, tokenExpiresAt: null, _accessToken: null };
  try {
    if (!authDirMeta.exists) return result;
    const files = fs.readdirSync(authDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ file: f, mtime: fs.statSync(path.join(authDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files.length) return result;

    const raw = fs.readFileSync(path.join(authDir, files[0].file), 'utf-8');
    const data = JSON.parse(raw);

    // Extract access_token for API calls
    result._accessToken = data.access_token || null;

    // Extract email from file payload or JWT
    result.email = data.email || null;
    result.tokenExpiresAt = data.expired || data.expiresAt || data.expires_at || null;

    // Parse id_token JWT for plan/subscription
    const idPayload = decodeJwtPayload(data.id_token);
    if (idPayload) {
      const email = idPayload.email;
      if (email) result.email = email;
      const authClaims = idPayload['https://api.openai.com/auth'];
      if (authClaims) {
        result.planType = authClaims.chatgpt_plan_type || null;
        result.subscriptionActiveUntil = authClaims.chatgpt_subscription_active_until || null;
      }
    }

    // Also try access_token profile
    if (!result.email) {
      const accPayload = decodeJwtPayload(data.access_token);
      if (accPayload) {
        const profile = accPayload['https://api.openai.com/profile'];
        if (profile && profile.email) result.email = profile.email;
      }
    }
  } catch { /* ignore read errors */ }
  return result;
}


// GET /api/codex/proxy-accounts — aggregator sub-account overview with real quota
router.get('/proxy-accounts', async (req, res) => {
  try {
    // ── Main API (local ~/.codex/auth.json) ──
    let mainApiQuota = null;
    let mainApiEmail = null;
    let mainApiPlan = null;
    try {
      const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
      const authFile = path.join(codexHome, 'auth.json');
      if (fs.existsSync(authFile)) {
        const raw = fs.readFileSync(authFile, 'utf-8');
        const data = JSON.parse(raw);
        const token = data?.tokens?.access_token || data?.access_token || null;
        if (token) {
          mainApiQuota = await fetchQuota(token);
          // Parse email from JWT access_token
          const payload = decodeJwtPayload(token);
          const profile = payload?.['https://api.openai.com/profile'];
          mainApiEmail = profile?.email || data.email || null;
          mainApiPlan = mainApiQuota?.plan_type || null;
        }
      }
    } catch (_) { /* non-critical */ }

    const rows = aggregatorDb
      ? aggregatorDb.prepare('SELECT id, nickname, email, instance_num, status, token_expires_at, rate_mult FROM accounts ORDER BY instance_num').all()
      : buildFallbackAggregatorRows();

    // Fetch real quota for each account in parallel (max 3 concurrent)
    const CONCURRENCY = 3;
    const accountResults = [];

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(batch.map(async (row) => {
        const auth = readInstanceAuth(row.instance_num);
        const hasToken = !!(auth._accessToken);
        let quota = null;

        if (hasToken) {
          quota = await fetchQuota(auth._accessToken);
        }

        return {
          id: row.id,
          nickname: row.nickname,
          email: auth.email || row.email || null,
          instanceNum: row.instance_num,
          status: hasToken ? row.status : 'unconfigured',
          planType: auth.planType || quota?.plan_type || null,
          hasToken,
          quota,
          subscriptionActiveUntil: auth.subscriptionActiveUntil || null,
          tokenExpiresAt: auth.tokenExpiresAt || row.token_expires_at || null,
          rateMult: row.rate_mult,
        };
      }));
      accountResults.push(...batchResults);
    }

    const accounts = accountResults.map(r =>
      r.status === 'fulfilled' ? r.value : { id: 0, nickname: '?', hasToken: false, quota: { error: 'internal' } }
    );

    const configuredCount = accounts.filter(a => a.hasToken).length;
    const activeCount = rows.filter(r => r.status === 'active').length;

    res.json({
      mainApi: {
        hasToken: !!(mainApiQuota && !mainApiQuota.error),
        quota: mainApiQuota,
        email: mainApiEmail,
        planType: mainApiPlan,
      },
      stats: { totalAccounts: rows.length, activeCount, configuredCount },
      accounts,
    });
  } catch (e) {
    console.error('proxy-accounts error:', e);
    res.status(500).json({ error: e.message });
  }
});


// GET /api/codex/aggregator-config — omniroute endpoint + api-key from instance-1 config
router.get('/aggregator-config', (req, res) => {
  try {
    const configMeta = resolveAggregatorPath('cpa-instances', 'instance-1', 'config.yaml');
    if (!configMeta.exists) {
      return res.json({ endpoint: null, apiKey: null, port: 20128 });
    }
    const raw = fs.readFileSync(configMeta.path, 'utf-8');
    // Parse api-keys list from yaml (simple line-based parsing)
    const keyMatch = raw.match(/api-keys:\s*\n(?:\s*-\s*"?([^"\n]+)"?\s*\n?)+/);
    const keys = [];
    const keyLines = raw.match(/^\s+-\s+"?([^"\n]+)"?\s*$/gm) || [];
    for (const line of keyLines) {
      const m = line.match(/^\s+-\s+"?([^"\n]+?)"?\s*$/);
      if (m) keys.push(m[1].trim());
    }
    const apiKey = keys[0] || null;
    res.json({
      endpoint: 'http://10.33.67.74:20128/v1',
      endpointLocal: 'http://127.0.0.1:20128/v1',
      apiKey,
      port: 20128,
      instancePorts: [8317, 8318, 8319, 8320, 8321, 8322],
    });
  } catch (e) {
    console.error('aggregator-config error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/codex/auth-instance — start CPA auth directly without a separate Dashboard
// Body: { instanceNum, authMode: 'device'|'oauth', provider?: 'codex'|'antigravity' }
router.post('/auth-instance', requireSameOrigin, async (req, res) => {
  const instanceNum = Number(req.body?.instanceNum);
  const provider = req.body?.provider || 'codex';
  const authMode = req.body?.authMode || 'device';

  if (!instanceNum || instanceNum < 1 || instanceNum > 6) {
    return res.status(400).json({ error: 'instanceNum 必须在 1-6 之间' });
  }

  if (authMode === 'device' && provider !== 'codex') {
    return res.status(400).json({ error: '当前仅 Codex 提供 device code 登录模式' });
  }

  const paths = resolveInstanceAuthPaths(instanceNum);
  if (!paths.exists) {
    return res.status(404).json({ error: `未找到实例目录: instance-${instanceNum}` });
  }

  if (!fs.existsSync(paths.configPath)) {
    return res.status(404).json({ error: `未找到实例配置: ${paths.configPath}` });
  }

  try {
    if (authMode === 'device') {
      await fsp.mkdir(path.dirname(paths.deviceLogPath), { recursive: true });
      await fsp.mkdir(paths.authDir, { recursive: true });
      await fsp.writeFile(paths.deviceLogPath, '', 'utf-8');

      await spawnDetachedAuthCommand({
        cwd: paths.instanceDir,
        command: '"$CLIPROXYAPI_BIN" -config "$CPA_CONFIG" -codex-device-login >> "$CPA_DEVICE_LOG" 2>&1',
        env: {
          CLIPROXYAPI_BIN: getCliProxyApiBin(),
          CPA_CONFIG: paths.configPath,
          CPA_DEVICE_LOG: paths.deviceLogPath,
        },
      });

      const signal = await waitForDeviceSignal(paths.deviceLogPath, DEVICE_SIGNAL_TIMEOUT_MS);
      if (signal.error) {
        return res.status(500).json({ error: normalizeAuthError(signal.error) });
      }

      if (signal.verificationUri && signal.userCode) {
        return res.json({
          ok: true,
          authMode: 'device',
          verificationUri: signal.verificationUri,
          userCode: signal.userCode,
          message: `CPA-${instanceNum} 已生成 device code，请在任意设备完成授权。`,
        });
      }

      return res.json({
        ok: true,
        authMode: 'device',
        message: `CPA-${instanceNum} device code 正在生成，请稍后自动刷新。`,
      });
    }

    const loginFlag = provider === 'antigravity' ? '-antigravity-login' : '-codex-login';
    await fsp.mkdir(path.dirname(paths.oauthLogPath), { recursive: true });
    await fsp.mkdir(paths.authDir, { recursive: true });
    await fsp.writeFile(paths.oauthLogPath, '', 'utf-8');
    await cleanupStaleOauthListeners();

    await spawnDetachedAuthCommand({
      cwd: paths.instanceDir,
      command: 'env -i HOME="$CPA_HOME" PATH="$CPA_PATH" LANG="en_US.UTF-8" "$CLIPROXYAPI_BIN" -config "$CPA_CONFIG" "$CPA_LOGIN_FLAG" -no-browser >> "$CPA_OAUTH_LOG" 2>&1',
      env: {
        CLIPROXYAPI_BIN: getCliProxyApiBin(),
        CPA_HOME: process.env.HOME || '',
        CPA_PATH: process.env.PATH || '',
        CPA_CONFIG: paths.configPath,
        CPA_LOGIN_FLAG: loginFlag,
        CPA_OAUTH_LOG: paths.oauthLogPath,
      },
    });

    const signal = await waitForOauthSignal(paths.oauthLogPath, DEVICE_SIGNAL_TIMEOUT_MS);
    if (signal.error) {
      return res.status(500).json({ error: normalizeAuthError(signal.error) });
    }

    return res.json({
      ok: true,
      authMode: 'oauth',
      authorizationUrl: signal.authorizationUrl,
      message: signal.authorizationUrl
        ? `CPA-${instanceNum} 已生成可点击的 OAuth 授权链接。`
        : `CPA-${instanceNum} OAuth 链接正在生成，请稍后自动刷新。`,
    });
  } catch (e) {
    const message = e?.code === 'ENOENT' && String(e?.path || '').includes(getCliProxyApiBin())
      ? `未找到 CLIProxyAPI 可执行文件: ${getCliProxyApiBin()}`
      : (e?.message || '授权启动失败');
    return res.status(500).json({ error: message });
  }
});

// GET /api/codex/skill-health — skill health manifest

router.get('/skill-health', (req, res) => {
  try {
    const sourceMeta = resolveSkillsSourcePath(null, { createIfMissing: false });
    const data = readSkillHealthManifest(sourceMeta.sourcePath);
    res.json(data);
  } catch (e) {
    console.error('skill-health error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/codex/installed-skills — real installed skill library with health overlay
router.get('/installed-skills', (req, res) => {
  try {
    const sourceMeta = resolveSkillsSourcePath(null, { createIfMissing: false });
    const sourcePath = sourceMeta.sourcePath;
    const exists = !!(sourcePath && fs.existsSync(sourcePath) && fs.statSync(sourcePath).isDirectory());
    const manifest = readSkillHealthManifest(sourcePath);
    const manifestSkills = manifest.skills || {};
    const installedSkills = listInstalledSkills(sourcePath);
    const installedNames = new Set(installedSkills.map((skill) => skill.name));
    const missingFromManifest = [];
    const skills = installedSkills.map((skill) => {
      const health = manifestSkills[skill.name] || null;
      if (!health) missingFromManifest.push(skill.name);
      return { ...skill, health };
    });
    const manifestOnly = Object.keys(manifestSkills)
      .filter((name) => !installedNames.has(name))
      .sort((a, b) => a.localeCompare(b));

    res.json({
      sourcePath,
      exists,
      count: skills.length,
      userCount: skills.filter((skill) => skill.category === 'user').length,
      systemCount: skills.filter((skill) => skill.category === 'system').length,
      matchedHealthCount: skills.length - missingFromManifest.length,
      missingHealthCount: missingFromManifest.length,
      manifestOnlyCount: manifestOnly.length,
      manifestOnly,
      platforms: {
        codex: inspectSkillsLink(path.join(getCodexHomeDir(), 'skills')),
        antigravity: inspectSkillsLink(path.join(getAntigravityHomeDir(), 'skills')),
      },
      skills,
    });
  } catch (e) {
    console.error('installed-skills error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ──────────────────────────────────────────────────────
//  One-Click Setup Endpoints
// ──────────────────────────────────────────────────────

/**
 * Resolve the platform-aware Codex home directory.
 * Mac: ~/.codex  |  Win: %USERPROFILE%\.codex
 * @returns {string} Absolute path to the codex home folder.
 */
function getCodexHomeDir() {
  const home = process.env.CODEX_HOME
    || (process.platform === 'win32'
      ? path.join(process.env.USERPROFILE || os.homedir(), '.codex')
      : path.join(os.homedir(), '.codex'));
  return home;
}

/**
 * Resolve the platform-aware Antigravity home directory.
 * Mac: ~/.antigravity | Win: %USERPROFILE%\.antigravity
 * @returns {string} Absolute path to the Antigravity home folder.
 */
function getAntigravityHomeDir() {
  const home = process.env.ANTIGRAVITY_HOME
    || (process.platform === 'win32'
      ? path.join(process.env.USERPROFILE || os.homedir(), '.antigravity')
      : path.join(os.homedir(), '.antigravity'));
  return home;
}

/**
 * Return the preferred shared skills directory for the local machine.
 * @returns {string} Absolute path to the preferred shared skills source.
 */
function getPreferredSkillsSourcePath() {
  return path.join(os.homedir(), 'Documents', '指示词宝库', 'skills');
}

/**
 * Resolve real directory targets from existing tool skill links.
 * @returns {string[]} Existing real directory targets discovered from local tools.
 */
function getInstalledSkillsTargets() {
  const targets = [
    path.join(getCodexHomeDir(), 'skills'),
    path.join(getAntigravityHomeDir(), 'skills'),
  ];
  const discovered = [];

  for (const linkPath of targets) {
    try {
      if (!fs.existsSync(linkPath)) continue;
      if (!fs.lstatSync(linkPath).isSymbolicLink()) continue;
      const realPath = fs.realpathSync(linkPath);
      if (fs.statSync(realPath).isDirectory()) discovered.push(realPath);
    } catch (_) { /* ignore broken or unreadable targets */ }
  }

  return [...new Set(discovered)];
}

/**
 * Scan common candidate paths for an existing shared skills directory.
 * Returns the first real directory found, or null.
 * @returns {string|null} Absolute path to skills source, or null.
 */
function findSkillsSourcePath() {
  const home = os.homedir();
  const candidates = [
    ...getInstalledSkillsTargets(),
    getPreferredSkillsSourcePath(),
    path.join(home, 'Documents', '指示词宝库', 'skills'),
    path.join(home, 'Documents', 'skills'),
    path.join(home, '指示词宝库', 'skills'),
    path.join(home, 'Desktop', '指示词宝库', 'skills'),
    // Windows typical paths
    path.join(home, 'OneDrive', '指示词宝库', 'skills'),
    path.join(home, 'OneDrive - Personal', '指示词宝库', 'skills'),
  ];
  for (const p of [...new Set(candidates)]) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch (_) { /* skip */ }
  }
  return null;
}

/**
 * Count discoverable skills inside a shared skills root.
 * Counts direct skill folders plus entries under `.system`, excluding `dist`.
 * @param {string} skillsRoot Absolute path to the shared skills root.
 * @returns {number} Total discoverable skill directories.
 */
function countSkillDirectories(skillsRoot) {
  if (!skillsRoot || !fs.existsSync(skillsRoot)) return 0;

  let total = 0;
  const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'dist') continue;

    const entryPath = path.join(skillsRoot, entry.name);
    if (entry.name === '.system') {
      const systemEntries = fs.readdirSync(entryPath, { withFileTypes: true });
      total += systemEntries.filter((child) =>
        child.isDirectory() && fs.existsSync(path.join(entryPath, child.name, 'SKILL.md'))
      ).length;
      continue;
    }

    if (fs.existsSync(path.join(entryPath, 'SKILL.md'))) total += 1;
  }

  return total;
}

/**
 * Read the skill health manifest from the shared skills root.
 * @param {string|null} skillsRoot Absolute path to the shared skills root.
 * @returns {{ summary: object, skills: Record<string, object>, ts?: string|null }}
 * Parsed health manifest payload or an empty default.
 */
function readSkillHealthManifest(skillsRoot) {
  const manifestPath = skillsRoot
    ? path.join(skillsRoot, 'SKILL_HEALTH_MANIFEST.json')
    : null;

  try {
    if (!manifestPath || !fs.existsSync(manifestPath)) {
      return { summary: { total_skills: 0, critical_skills: 0, avg_health: 0 }, skills: {}, ts: null };
    }

    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      summary: parsed?.summary || { total_skills: 0, critical_skills: 0, avg_health: 0 },
      skills: parsed?.skills || {},
      ts: parsed?.ts || null,
    };
  } catch (_) {
    return { summary: { total_skills: 0, critical_skills: 0, avg_health: 0 }, skills: {}, ts: null };
  }
}

/**
 * List real installed skills from disk.
 * @param {string|null} skillsRoot Absolute path to the shared skills root.
 * @returns {Array<{name: string, category: string, relativePath: string, absolutePath: string}>}
 * Installed skill entries discovered from the current shared library.
 */
function listInstalledSkills(skillsRoot) {
  if (!skillsRoot || !fs.existsSync(skillsRoot)) return [];

  const results = [];
  const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'dist') continue;

    const entryPath = path.join(skillsRoot, entry.name);
    if (entry.name === '.system') {
      const systemEntries = fs.readdirSync(entryPath, { withFileTypes: true });
      for (const child of systemEntries) {
        if (!child.isDirectory()) continue;
        const childPath = path.join(entryPath, child.name);
        if (!fs.existsSync(path.join(childPath, 'SKILL.md'))) continue;
        results.push({
          name: child.name,
          category: 'system',
          relativePath: path.join('.system', child.name),
          absolutePath: childPath,
        });
      }
      continue;
    }

    if (!fs.existsSync(path.join(entryPath, 'SKILL.md'))) continue;
    results.push({
      name: entry.name,
      category: 'user',
      relativePath: entry.name,
      absolutePath: entryPath,
    });
  }

  return results.sort((a, b) => {
    if (a.category !== b.category) return a.category === 'user' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Inspect a tool-local skills path and describe its current linkage state.
 * @param {string} linkPath Absolute path to the tool-local skills directory or link.
 * @returns {{linkPath: string, status: string, linkTarget: string|null, realPath: string|null, skillsCount: number}}
 * Current link state with a normalized skill count.
 */
function inspectSkillsLink(linkPath) {
  const info = {
    linkPath,
    status: 'missing',
    linkTarget: null,
    realPath: null,
    skillsCount: 0,
  };

  try {
    if (!fs.existsSync(linkPath)) return info;

    const lstat = fs.lstatSync(linkPath);
    if (lstat.isSymbolicLink()) {
      info.status = 'symlink';
      info.linkTarget = fs.readlinkSync(linkPath);
    } else if (lstat.isDirectory()) {
      info.status = 'directory';
    }

    info.realPath = fs.realpathSync(linkPath);
    info.skillsCount = countSkillDirectories(info.realPath);
  } catch (_) { /* ignore inspection failures */ }

  return info;
}

/**
 * Return whether one entry should be ignored during skill export.
 * @param {string} entryName File or directory name.
 * @returns {boolean} True when the entry must be skipped.
 */
function shouldIgnoreSkillExportEntry(entryName) {
  return SKILL_EXPORT_IGNORED_NAMES.has(entryName)
    || entryName.endsWith('.bak')
    || entryName.endsWith('.tmp');
}

/**
 * Recursively collect files that belong to the current skill library.
 * @param {string} skillsRoot Absolute path to the shared skills root.
 * @param {string} currentDir Relative directory being traversed.
 * @returns {Array<{relativePath: string, absolutePath: string, mode: number}>} Exportable files.
 */
function collectSkillExportFiles(skillsRoot, currentDir = '') {
  const absoluteDir = currentDir ? path.join(skillsRoot, currentDir) : skillsRoot;
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (shouldIgnoreSkillExportEntry(entry.name)) continue;

    const relativePath = currentDir
      ? path.posix.join(currentDir.split(path.sep).join(path.posix.sep), entry.name)
      : entry.name;
    const absolutePath = path.join(absoluteDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectSkillExportFiles(skillsRoot, relativePath));
      continue;
    }

    if (!entry.isFile()) continue;
    files.push({
      relativePath,
      absolutePath,
      mode: fs.statSync(absolutePath).mode & 0o777,
    });
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Build a portable install manifest for the current skill library.
 * @param {string} skillsRoot Absolute path to the shared skills root.
 * @returns {{sourcePath: string, skillsCount: number, generatedAt: string, files: Array<object>}} Install manifest payload.
 */
function buildSkillInstallManifest(skillsRoot) {
  const exportFiles = collectSkillExportFiles(skillsRoot);
  return {
    sourcePath: skillsRoot,
    skillsCount: countSkillDirectories(skillsRoot),
    generatedAt: new Date().toISOString(),
    files: exportFiles.map((file) => ({
      path: file.relativePath,
      mode: file.mode,
      contentBase64: fs.readFileSync(file.absolutePath).toString('base64'),
    })),
  };
}

/**
 * Resolve the public request origin for download/install URLs.
 * @param {import('express').Request} req Express request.
 * @returns {string} Absolute origin string.
 */
function getRequestOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host') || 'localhost';
  return `${protocol}://${host}`;
}

/**
 * Return the absolute manifest URL used by local install scripts.
 * @param {import('express').Request} req Express request.
 * @returns {string} Absolute manifest endpoint URL.
 */
function getSkillInstallManifestUrl(req) {
  return `${getRequestOrigin(req)}${req.baseUrl}/install-manifest`;
}

/**
 * Build the Unix install script for local Codex and Antigravity imports.
 * @param {string} manifestUrl Absolute manifest URL.
 * @returns {string} Executable shell script.
 */
function buildUnixInstallScript(manifestUrl) {
  return `#!/usr/bin/env bash
set -euo pipefail

MANIFEST_URL=${JSON.stringify(manifestUrl)}
TMP_JSON="$(mktemp)"

cleanup() {
  rm -f "$TMP_JSON"
}

trap cleanup EXIT

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required." >&2
  exit 1
fi

curl -fsSL "$MANIFEST_URL" -o "$TMP_JSON"

python3 - "$TMP_JSON" <<'PY'
import base64
import datetime
import json
import os
import pathlib
import sys

manifest_path = pathlib.Path(sys.argv[1])
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
home = pathlib.Path.home()
targets = [
    pathlib.Path(os.environ.get('CODEX_HOME', home / '.codex')) / 'skills',
    pathlib.Path(os.environ.get('ANTIGRAVITY_HOME', home / '.antigravity')) / 'skills',
]
results = []

for target in targets:
    target.parent.mkdir(parents=True, exist_ok=True)
    backup_path = None

    if target.is_symlink():
        target.unlink()
    elif target.exists():
        backup_path = target.parent / f"{target.name}.bak-install-{timestamp}"
        target.rename(backup_path)

    target.mkdir(parents=True, exist_ok=True)

    for file in manifest.get('files', []):
        rel_path = pathlib.PurePosixPath(file['path'])
        if rel_path.is_absolute() or '..' in rel_path.parts:
            raise SystemExit(f"Unsafe path in manifest: {file['path']}")

        destination = target.joinpath(*rel_path.parts)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(base64.b64decode(file['contentBase64']))
        try:
            os.chmod(destination, int(file.get('mode', 0o644)))
        except OSError:
            pass

    results.append({
        'target': str(target),
        'backup': str(backup_path) if backup_path else None,
    })

print(json.dumps({
    'installed': results,
    'skillsCount': manifest.get('skillsCount', 0),
    'sourcePath': manifest.get('sourcePath'),
}, ensure_ascii=False, indent=2))
PY
`;
}

/**
 * Build the PowerShell install script for local Codex and Antigravity imports.
 * @param {string} manifestUrl Absolute manifest URL.
 * @returns {string} Executable PowerShell script.
 */
function buildWindowsInstallScript(manifestUrl) {
  return `$ErrorActionPreference = 'Stop'

$manifestUrl = ${JSON.stringify(manifestUrl)}
$manifest = Invoke-RestMethod -Uri $manifestUrl -Method Get
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$homeDir = [Environment]::GetFolderPath('UserProfile')
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $homeDir '.codex' }
$antigravityHome = if ($env:ANTIGRAVITY_HOME) { $env:ANTIGRAVITY_HOME } else { Join-Path $homeDir '.antigravity' }
$targets = @(
  (Join-Path $codexHome 'skills'),
  (Join-Path $antigravityHome 'skills')
)
$results = @()

foreach ($target in $targets) {
  $parent = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  $backupPath = $null
  if (Test-Path -LiteralPath $target) {
    $backupPath = "$target.bak-install-$timestamp"
    Move-Item -LiteralPath $target -Destination $backupPath -Force
  }

  New-Item -ItemType Directory -Path $target -Force | Out-Null

  foreach ($file in $manifest.files) {
    $normalized = ($file.path -replace '/', [IO.Path]::DirectorySeparatorChar)
    $destination = Join-Path $target $normalized
    $directory = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $directory)) {
      New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    $bytes = [Convert]::FromBase64String($file.contentBase64)
    [IO.File]::WriteAllBytes($destination, $bytes)
  }

  $results += [pscustomobject]@{
    target = $target
    backup = $backupPath
  }
}

[pscustomobject]@{
  installed = $results
  skillsCount = $manifest.skillsCount
  sourcePath = $manifest.sourcePath
} | ConvertTo-Json -Depth 4
`;
}

/**
 * Ensure a shared skills source directory exists.
 * @param {string|null} sourcePath Desired source path or null for auto-discovery.
 * @param {{ createIfMissing?: boolean }} options Directory creation behavior.
 * @returns {{sourcePath: string|null, created: boolean}} Resolved shared source state.
 */
function resolveSkillsSourcePath(sourcePath, { createIfMissing = false } = {}) {
  const requestedPath = sourcePath || findSkillsSourcePath() || getPreferredSkillsSourcePath();
  if (!requestedPath) return { sourcePath: null, created: false };

  try {
    if (fs.existsSync(requestedPath)) {
      if (fs.statSync(requestedPath).isDirectory()) {
        return { sourcePath: requestedPath, created: false };
      }
      return { sourcePath: null, created: false };
    }

    if (!createIfMissing) {
      return { sourcePath: requestedPath, created: false };
    }

    fs.mkdirSync(requestedPath, { recursive: true });
    return { sourcePath: requestedPath, created: true };
  } catch (_) {
    return { sourcePath: null, created: false };
  }
}

/**
 * Link one tool-local skills path to the shared skills source.
 * Existing non-link directories are preserved as timestamped backups.
 * @param {string} linkPath Tool-local skills path.
 * @param {string} sourcePath Shared skills root path.
 * @returns {{linkPath: string, method: string, backupPath: string|null}} Link operation result.
 */
function linkSkillsDirectory(linkPath, sourcePath) {
  const parentDir = path.dirname(linkPath);
  if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

  let backupPath = null;

  if (fs.existsSync(linkPath)) {
    const lstat = fs.lstatSync(linkPath);
    const sameTarget = (() => {
      try {
        return fs.realpathSync(linkPath) === fs.realpathSync(sourcePath);
      } catch (_) {
        return false;
      }
    })();

    if (sameTarget) {
      return { linkPath, method: lstat.isSymbolicLink() ? 'symlink' : 'directory', backupPath };
    }

    if (lstat.isSymbolicLink()) {
      fs.unlinkSync(linkPath);
    } else {
      backupPath = `${linkPath}.bak-${Date.now()}`;
      fs.renameSync(linkPath, backupPath);
    }
  }

  if (process.platform === 'win32') {
    const { execSync } = require('child_process');
    execSync(`cmd /c mklink /J "${linkPath}" "${sourcePath}"`);
    return { linkPath, method: 'junction', backupPath };
  }

  fs.symlinkSync(sourcePath, linkPath, 'dir');
  return { linkPath, method: 'symlink', backupPath };
}

/**
 * Parse a specific [section.key] value from a TOML string.
 * Very lightweight — only handles string values in the target section.
 * @param {string} toml Raw TOML content.
 * @param {string} sectionHeader e.g. '[model_providers.omniroute]'
 * @param {string} key e.g. 'base_url'
 * @returns {string|null}
 */
function parseTomlSectionKey(toml, sectionHeader, key) {
  const escaped = sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `${escaped}[\\s\\S]*?^${key}\\s*=\\s*"([^"]*)"`,
    'm'
  );
  const m = toml.match(re);
  return m ? m[1] : null;
}

/**
 * Upsert (insert or replace) a [model_providers.omniroute] block in TOML content.
 * Preserves all other content.
 * @param {string} toml Existing TOML content.
 * @param {{ baseUrl: string, envKey: string, wireApi: string }} opts
 * @returns {string} Updated TOML content.
 */
function upsertOmnirouteBlock(toml, { baseUrl, envKey, wireApi }) {
  const newBlock = [
    `[model_providers.omniroute]`,
    `name = "Omniroute (Local)"`,
    `base_url = "${baseUrl}"`,
    `env_key = "${envKey}"`,
    `wire_api = "${wireApi}"`,
  ].join('\n');

  // Remove existing block (from header until next [section] or EOF)
  const sectionRe = /\[model_providers\.omniroute\][\s\S]*?(?=\n\[|\n#\s*──|$)/;
  if (sectionRe.test(toml)) {
    return toml.replace(sectionRe, newBlock);
  }
  // Append at end
  return toml.trimEnd() + '\n\n# ── Local Omniroute aggregator provider ──────────────────────────────────\n' + newBlock + '\n';
}

// GET /api/codex/setup-status — discover config paths and skills link status
router.get('/setup-status', (req, res) => {
  try {
    const codexHome = getCodexHomeDir();
    const antigravityHome = getAntigravityHomeDir();
    const configPath = path.join(codexHome, 'config.toml');

    // ── Read current config.toml ──
    let currentBaseUrl = null;
    let currentEnvKey = null;
    let currentWireApi = null;
    let configExists = false;
    try {
      if (fs.existsSync(configPath)) {
        configExists = true;
        const raw = fs.readFileSync(configPath, 'utf-8');
        currentBaseUrl = parseTomlSectionKey(raw, '[model_providers.omniroute]', 'base_url');
        currentEnvKey  = parseTomlSectionKey(raw, '[model_providers.omniroute]', 'env_key');
        currentWireApi = parseTomlSectionKey(raw, '[model_providers.omniroute]', 'wire_api');
      }
    } catch (_) { /* non-critical */ }

    // ── Target values from aggregator config ──
    let targetEndpoint = null;
    let targetApiKey = null;
    try {
      const aggConfigMeta = resolveAggregatorPath('cpa-instances', 'instance-1', 'config.yaml');
      if (aggConfigMeta.exists) {
        const raw = fs.readFileSync(aggConfigMeta.path, 'utf-8');
        const keyLines = raw.match(/^\s+-\s+"?([^"\n]+)"?\s*$/gm) || [];
        for (const line of keyLines) {
          const m = line.match(/^\s+-\s+"?([^"\n]+?)"?\s*$/);
          if (m) { targetApiKey = m[1].trim(); break; }
        }
      }
      // Use fixed omniroute endpoint (matches aggregator-config route)
      targetEndpoint = 'http://10.33.67.74:20128/v1';
    } catch (_) { /* non-critical */ }

    const resolvedSource = resolveSkillsSourcePath(null, { createIfMissing: false });
    const codexSkills = inspectSkillsLink(path.join(codexHome, 'skills'));
    const antigravitySkills = inspectSkillsLink(path.join(antigravityHome, 'skills'));
    const sharedSkillsSourcePath = resolvedSource.sourcePath;
    const sharedSkillsExists = !!(sharedSkillsSourcePath && fs.existsSync(sharedSkillsSourcePath));

    res.json({
      platform: process.platform,
      codexHome,
      antigravityHome,
      configPath,
      configExists,
      currentBaseUrl,
      currentEnvKey,
      currentWireApi,
      targetEndpoint,
      targetApiKey,
      sharedSkillsSourcePath,
      sharedSkillsExists,
      sharedSkillsCount: sharedSkillsExists ? countSkillDirectories(sharedSkillsSourcePath) : 0,
      platforms: {
        codex: codexSkills,
        antigravity: antigravitySkills,
      },
    });
  } catch (e) {
    console.error('setup-status error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/codex/apply-api-config — write omniroute provider to config.toml
router.post('/apply-api-config', (req, res) => {
  try {
    const { endpoint, apiKey, envKey = 'OMNIROUTE_API_KEY', wireApi = 'responses' } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint 必填' });

    const codexHome = getCodexHomeDir();
    const configPath = path.join(codexHome, 'config.toml');

    // Ensure codex home exists
    if (!fs.existsSync(codexHome)) fs.mkdirSync(codexHome, { recursive: true });

    let existing = '';
    if (fs.existsSync(configPath)) {
      existing = fs.readFileSync(configPath, 'utf-8');
      // Backup
      const backupPath = configPath + `.bak-setup-${Date.now()}`;
      fs.writeFileSync(backupPath, existing, 'utf-8');
    }

    const updated = upsertOmnirouteBlock(existing, {
      baseUrl: endpoint,
      envKey,
      wireApi,
    });

    fs.writeFileSync(configPath, updated, 'utf-8');

    res.json({ success: true, configPath });
  } catch (e) {
    console.error('apply-api-config error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * Create shared skill links for Codex and Antigravity.
 * Auto-creates the shared source directory when needed.
 * @route POST /api/codex/apply-skills
 * @param {string} [req.body.sourcePath] Optional shared skills source path.
 * @param {boolean} [req.body.createIfMissing=true] Whether to create the source directory.
 * @param {string[]} [req.body.platforms] Tool targets, defaults to ['codex', 'antigravity'].
 * @returns {{success: boolean, sourcePath: string, sourceCreated: boolean, skillsCount: number, results: object}}
 * Link results for each selected platform.
 */
router.post('/apply-skills', async (req, res) => {
  try {
    const requestedPlatforms = Array.isArray(req.body?.platforms) && req.body.platforms.length
      ? req.body.platforms
      : ['codex', 'antigravity'];
    const createIfMissing = req.body?.createIfMissing !== false;
    const sourceMeta = resolveSkillsSourcePath(req.body?.sourcePath || null, { createIfMissing });
    const sourcePath = sourceMeta.sourcePath;

    if (!sourcePath) {
      return res.status(400).json({ error: '无法确定共享 skills 目录，请手动提供 sourcePath' });
    }

    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
      return res.status(400).json({ error: 'skills 源目录不可用，且自动创建失败' });
    }

    const linkTargets = {
      codex: path.join(getCodexHomeDir(), 'skills'),
      antigravity: path.join(getAntigravityHomeDir(), 'skills'),
    };
    const unsupported = requestedPlatforms.filter((platform) => !linkTargets[platform]);
    if (unsupported.length) {
      return res.status(400).json({ error: `不支持的平台: ${unsupported.join(', ')}` });
    }

    const results = {};
    for (const platform of requestedPlatforms) {
      const linkResult = linkSkillsDirectory(linkTargets[platform], sourcePath);
      results[platform] = {
        ...linkResult,
        ...inspectSkillsLink(linkTargets[platform]),
      };
    }

    const skillsCount = countSkillDirectories(sourcePath);
    res.json({
      success: true,
      sourcePath,
      sourceCreated: sourceMeta.created,
      skillsCount,
      results,
    });
  } catch (e) {
    console.error('apply-skills error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/codex/install-manifest — export a portable skill manifest for local machine installs
router.get('/install-manifest', (req, res) => {
  try {
    const sourceMeta = resolveSkillsSourcePath(null, { createIfMissing: false });
    const sourcePath = sourceMeta.sourcePath;

    if (!sourcePath || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
      return res.status(404).json({ error: 'skills 源目录不存在，无法生成本机安装清单' });
    }

    const manifest = buildSkillInstallManifest(sourcePath);
    res.json(manifest);
  } catch (e) {
    console.error('install-manifest error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/codex/install-script — generate a local install script for Codex and Antigravity
router.get('/install-script', (req, res) => {
  try {
    const platform = String(req.query.platform || 'unix').toLowerCase();
    const sourceMeta = resolveSkillsSourcePath(null, { createIfMissing: false });
    const sourcePath = sourceMeta.sourcePath;

    if (!sourcePath || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
      return res.status(404).json({ error: 'skills 源目录不存在，无法生成安装脚本' });
    }

    const manifestUrl = getSkillInstallManifestUrl(req);
    if (platform === 'windows' || platform === 'powershell') {
      res.type('text/plain; charset=utf-8').send(buildWindowsInstallScript(manifestUrl));
      return;
    }

    res.type('text/plain; charset=utf-8').send(buildUnixInstallScript(manifestUrl));
  } catch (e) {
    console.error('install-script error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/codex/:id/refresh — refresh a single account's quota
router.post('/:id/refresh', async (req, res) => {
  try {
    const acc = getAccount.get(req.params.id);
    if (!acc) return res.status(404).json({ error: '账号不存在' });

    const hasToken = !!(acc.access_token && acc.access_token.trim());
    let quota = null;

    if (hasToken) {
      // Force refresh — bypass cache
      quotaCache.delete(Number(req.params.id));
      quota = await fetchQuota(acc.access_token);
      setCachedQuota(Number(req.params.id), quota);
    }

    res.json({
      id: acc.id,
      name: acc.name,
      account: acc.account,
      has_token: hasToken,
      quota,
    });
  } catch (e) {
    console.error('Codex single refresh error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/codex — list all accounts with live quota
router.get('/', async (req, res) => {
  try {
    const accounts = listAccounts.all();
    const forceRefresh = req.query.refresh === '1';

    // Fetch quota for each account in parallel (max 3 concurrent)
    const CONCURRENCY = 3;
    const results = [];

    for (let i = 0; i < accounts.length; i += CONCURRENCY) {
      const batch = accounts.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (acc) => {
          const hasToken = !!(acc.access_token && acc.access_token.trim());
          let quota = null;

          if (hasToken) {
            if (!forceRefresh) {
              quota = getCachedQuota(acc.id);
            }
            if (!quota) {
              quota = await fetchQuota(acc.access_token);
              setCachedQuota(acc.id, quota);
            }
          }

          return {
            id: acc.id,
            name: acc.name,
            account: acc.account,
            email: acc.email,
            has_token: hasToken,
            quota,
          };
        })
      );
      results.push(...batchResults);
    }

    const list = results.map(r => {
      if (r.status === 'fulfilled') return r.value;
      return { id: 0, name: '?', account: '?', has_token: false, quota: { error: 'internal' } };
    });

    res.json(list);
  } catch (e) {
    console.error('Codex list error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/codex/:id — full account detail (includes passwords)
// Protected: same-origin only to prevent direct URL access leaking credentials
router.get('/:id', requireSameOrigin, (req, res) => {
  try {
    const account = getAccount.get(req.params.id);
    if (!account) return res.status(404).json({ error: '账号不存在' });
    res.json(account);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/codex — create account
router.post('/', (req, res) => {
  try {
    const { name, account, password, email, email_password, access_token } = req.body;
    if (!name || !account || !password) {
      return res.status(400).json({ error: '名称、账号、密码为必填' });
    }
    const result = insertAccount.run(
      name, account, password,
      email || '', email_password || '', access_token || ''
    );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/codex/:id — update account
router.put('/:id', (req, res) => {
  try {
    const existing = getAccount.get(req.params.id);
    if (!existing) return res.status(404).json({ error: '账号不存在' });

    const { name, account, password, email, email_password, access_token } = req.body;
    updateAccount.run(
      name ?? existing.name,
      account ?? existing.account,
      password ?? existing.password,
      email ?? existing.email,
      email_password ?? existing.email_password,
      access_token ?? existing.access_token,
      req.params.id
    );

    // Clear quota cache for this account
    quotaCache.delete(Number(req.params.id));

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/codex/:id
router.delete('/:id', (req, res) => {
  try {
    const result = deleteAccountStmt.run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: '账号不存在' });
    quotaCache.delete(Number(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
