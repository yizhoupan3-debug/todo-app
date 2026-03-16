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

// ── Routes ──
// IMPORTANT: /local-token MUST come before /:id to avoid route collision

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

// GET /api/codex — list all accounts with live quota
router.get('/', async (req, res) => {
  try {
    const accounts = listAccounts.all();
    const forceRefresh = req.query.refresh === '1';

    // Fetch quota for each account in parallel
    const results = await Promise.allSettled(
      accounts.map(async (acc) => {
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

    const list = results.map(r => {
      if (r.status === 'fulfilled') return r.value;
      // Promise rejected — should not happen but handle gracefully
      return { id: 0, name: '?', account: '?', has_token: false, quota: { error: 'internal' } };
    });

    res.json(list);
  } catch (e) {
    console.error('Codex list error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/codex/:id — full account detail (includes passwords)
router.get('/:id', (req, res) => {
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
