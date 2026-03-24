const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Quota cache (in-memory, 2-min TTL for success, 30s for errors) ──
const quotaCache = new Map();
const CACHE_TTL_OK = 2 * 60 * 1000;
const CACHE_TTL_ERR = 30 * 1000;

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
  const authDir = path.join(os.homedir(), 'Documents', '指示词宝库', 'codex-aggregator', 'cpa-instances', `instance-${instanceNum}`, 'auths');
  const result = { email: null, planType: null, subscriptionActiveUntil: null, tokenExpiresAt: null, _accessToken: null };
  try {
    if (!fs.existsSync(authDir)) return result;
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

    if (!aggregatorDb) {
      return res.json({
        mainApi: { hasToken: !!(mainApiQuota && !mainApiQuota.error), quota: mainApiQuota, email: mainApiEmail, planType: mainApiPlan },
        accounts: [],
      });
    }

    const rows = aggregatorDb.prepare('SELECT id, nickname, email, instance_num, status, token_expires_at, rate_mult FROM accounts ORDER BY instance_num').all();

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
    const configPath = path.join(os.homedir(), 'Documents', '指示词宝库', 'codex-aggregator', 'cpa-instances', 'instance-1', 'config.yaml');
    if (!fs.existsSync(configPath)) {
      return res.json({ endpoint: null, apiKey: null, port: 20128 });
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
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

// POST /api/codex/auth-instance — proxy to aggregator NextJS auth API
// Body: { instanceNum, authMode: 'device'|'oauth', provider?: 'codex'|'antigravity' }
router.post('/auth-instance', async (req, res) => {
  const AGGREGATOR_APP_URL = 'http://localhost:3000';
  try {
    const response = await fetch(`${AGGREGATOR_APP_URL}/api/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return res.status(504).json({ error: 'aggregator 响应超时，请确认反代 Dashboard 正在运行（port 3000）' });
    }
    res.status(502).json({ error: `无法连接到反代 Dashboard: ${e.message}` });
  }
});

// GET /api/codex/skill-health — skill health manifest

router.get('/skill-health', (req, res) => {
  const manifestPath = path.join(os.homedir(), 'Documents', '指示词宝库', 'skills', 'SKILL_HEALTH_MANIFEST.json');
  try {
    if (!fs.existsSync(manifestPath)) {
      return res.json({ summary: { total_skills: 0, critical_skills: 0, avg_health: 0 }, skills: {} });
    }
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (e) {
    console.error('skill-health error:', e);
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
 * Scan common candidate paths for an existing skills directory.
 * Returns the first real directory found, or null.
 * @returns {string|null} Absolute path to skills source, or null.
 */
function findSkillsSourcePath() {
  const home = os.homedir();
  const candidates = [
    path.join(home, 'Documents', '指示词宝库', 'skills'),
    path.join(home, 'Documents', 'skills'),
    path.join(home, '指示词宝库', 'skills'),
    path.join(home, 'Desktop', '指示词宝库', 'skills'),
    // Windows typical paths
    path.join(home, 'OneDrive', '指示词宝库', 'skills'),
    path.join(home, 'OneDrive - Personal', '指示词宝库', 'skills'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch (_) { /* skip */ }
  }
  return null;
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
    const configPath = path.join(codexHome, 'config.toml');
    const skillsLinkPath = path.join(codexHome, 'skills');

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
      const aggConfigPath = path.join(os.homedir(), 'Documents', '指示词宝库', 'codex-aggregator', 'cpa-instances', 'instance-1', 'config.yaml');
      if (fs.existsSync(aggConfigPath)) {
        const raw = fs.readFileSync(aggConfigPath, 'utf-8');
        const keyLines = raw.match(/^\s+-\s+"?([^"\n]+)"?\s*$/gm) || [];
        for (const line of keyLines) {
          const m = line.match(/^\s+-\s+"?([^"\n]+?)"?\s*$/);
          if (m) { targetApiKey = m[1].trim(); break; }
        }
      }
      // Use fixed omniroute endpoint (matches aggregator-config route)
      targetEndpoint = 'http://10.33.67.74:20128/v1';
    } catch (_) { /* non-critical */ }

    // ── Skills link detection ──
    let skillsStatus = 'missing'; // 'symlink' | 'directory' | 'missing'
    let skillsLinkTarget = null;
    let skillsCount = 0;
    try {
      if (fs.existsSync(skillsLinkPath)) {
        const lstat = fs.lstatSync(skillsLinkPath);
        if (lstat.isSymbolicLink()) {
          skillsStatus = 'symlink';
          skillsLinkTarget = fs.readlinkSync(skillsLinkPath);
        } else if (lstat.isDirectory()) {
          skillsStatus = 'directory';
        }
        // Count skill folders (each skill is a dir containing SKILL.md)
        const entries = fs.readdirSync(skillsLinkPath, { withFileTypes: true });
        skillsCount = entries.filter(e => e.isDirectory()).length;
      }
    } catch (_) { /* non-critical */ }

    const skillsSourcePath = findSkillsSourcePath();

    res.json({
      platform: process.platform,
      codexHome,
      configPath,
      configExists,
      currentBaseUrl,
      currentEnvKey,
      currentWireApi,
      targetEndpoint,
      targetApiKey,
      skillsLinkPath,
      skillsStatus,
      skillsLinkTarget,
      skillsCount,
      skillsSourcePath,
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

// POST /api/codex/apply-skills — create skills symlink/junction
router.post('/apply-skills', async (req, res) => {
  try {
    const codexHome = getCodexHomeDir();
    const skillsLinkPath = path.join(codexHome, 'skills');

    // Auto-discover source
    let sourcePath = req.body?.sourcePath || findSkillsSourcePath();
    if (!sourcePath) {
      return res.status(400).json({ error: '未找到 skills 源目录，请确认指示词宝库已下载到 ~/Documents/指示词宝库/skills' });
    }

    // Ensure codex home exists
    if (!fs.existsSync(codexHome)) fs.mkdirSync(codexHome, { recursive: true });

    // Remove existing link/dir if present
    if (fs.existsSync(skillsLinkPath)) {
      const lstat = fs.lstatSync(skillsLinkPath);
      if (lstat.isSymbolicLink()) {
        fs.unlinkSync(skillsLinkPath);
      } else {
        // Rename existing directory as backup rather than delete
        fs.renameSync(skillsLinkPath, skillsLinkPath + `.bak-${Date.now()}`);
      }
    }

    let method;
    if (process.platform === 'win32') {
      // Windows: directory junction (works without admin rights)
      const { execSync } = require('child_process');
      execSync(`cmd /c mklink /J "${skillsLinkPath}" "${sourcePath}"`);
      method = 'junction';
    } else {
      // Mac/Linux: symbolic link
      fs.symlinkSync(sourcePath, skillsLinkPath, 'dir');
      method = 'symlink';
    }

    // Count skills
    let skillsCount = 0;
    try {
      const entries = fs.readdirSync(skillsLinkPath, { withFileTypes: true });
      skillsCount = entries.filter(e => e.isDirectory()).length;
    } catch (_) { /* ignore */ }

    res.json({ success: true, linkPath: skillsLinkPath, sourcePath, method, skillsCount });
  } catch (e) {
    console.error('apply-skills error:', e);
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
