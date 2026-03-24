/* ────────────────────────────────────
   CodexView — Codex Quota Card View v3
   Tabbed: Proxy Accounts + Skill Health
   ──────────────────────────────────── */

const CodexView = {
  _accounts: [],
  _proxyData: null,
  _skillData: null,
  _expandedId: null,
  _detailCache: {},
  _formOverlay: null,
  _autoRefreshTimer: null,
  _countdownTimer: null,
  _visible: false,
  _activeTab: 'accounts', // 'accounts' | 'skills'
  _skillSearch: '',

  AUTO_REFRESH_MS: 2 * 60 * 1000, // 2 minutes

  /** Initialize the view (called from App._initModules). */
  init() {
    // Nothing eager — rendering happens on show()
  },

  /** Show the view (called from App.switchView). */
  show() {
    this._visible = true;
    const container = document.getElementById('view-codex');
    if (!container) return;

    // Render skeleton if first load
    if (!container.querySelector('.codex-view')) {
      container.innerHTML = this._shell();
      this._bindHeaderEvents(container);
      this._bindTabEvents(container);
      this._initIcons(container);
    }

    this._switchTab(this._activeTab);
    this._startAutoRefresh();
    this._startCountdown();
  },

  /** Hide the view. */
  hide() {
    this._visible = false;
    this._stopAutoRefresh();
    this._stopCountdown();
  },

  // ── Auto refresh ──
  _startAutoRefresh() {
    this._stopAutoRefresh();
    this._autoRefreshTimer = setInterval(() => {
      if (this._visible) {
        if (this._activeTab === 'accounts') this._loadProxyAccounts();
        else this._loadSkillHealth();
      }
    }, this.AUTO_REFRESH_MS);
  },

  _stopAutoRefresh() {
    if (this._autoRefreshTimer) {
      clearInterval(this._autoRefreshTimer);
      this._autoRefreshTimer = null;
    }
  },

  // ── Live countdown ──
  _startCountdown() {
    this._stopCountdown();
    this._countdownTimer = setInterval(() => {
      document.querySelectorAll('.codex-countdown[data-reset]').forEach(el => {
        const unix = Number(el.dataset.reset);
        el.textContent = this._formatReset(unix);
      });
    }, 30000);
  },

  _stopCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  },

  // ── Shell ──
  _shell() {
    return `
      <div class="codex-view">
        <div class="codex-view-header">
          <div class="codex-view-title">
            <i data-lucide="key-round"></i> Codex
          </div>
          <div class="codex-view-actions">
            <span class="codex-last-refresh" id="codex-last-refresh"></span>
            <button class="codex-icon-btn" id="codex-refresh-btn" title="刷新">
              <i data-lucide="refresh-cw"></i>
            </button>
            <button class="codex-icon-btn" id="codex-add-btn" title="添加账号">
              <i data-lucide="plus"></i>
            </button>
          </div>
        </div>
        <div class="codex-tabs">
          <button class="codex-tab active" data-tab="accounts">
            <i data-lucide="users"></i> 账号
          </button>
          <button class="codex-tab" data-tab="skills">
            <i data-lucide="activity"></i> Skill 健康
          </button>
          <button class="codex-tab" data-tab="setup">
            <i data-lucide="settings-2"></i> 一键配置
          </button>
        </div>
        <div class="codex-tab-content" id="codex-tab-content">
          ${this._shimmerCards(3)}
        </div>
      </div>
    `;
  },

  _bindHeaderEvents(container) {
    container.querySelector('#codex-refresh-btn')
      ?.addEventListener('click', () => {
        if (this._activeTab === 'accounts') this._loadProxyAccounts(true);
        else this._loadSkillHealth();
      });
    // hide add button — local accounts not used
    container.querySelector('#codex-add-btn')?.remove();
  },

  _bindTabEvents(container) {
    container.querySelectorAll('.codex-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._switchTab(tab.dataset.tab);
      });
    });
  },

  _switchTab(tabName) {
    this._activeTab = tabName;
    const container = document.getElementById('view-codex');
    if (!container) return;

    container.querySelectorAll('.codex-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Toggle add button visibility
    const addBtn = container.querySelector('#codex-add-btn');
    if (addBtn) addBtn.style.display = tabName === 'accounts' ? '' : 'none';

    const content = document.getElementById('codex-tab-content');
    if (!content) return;
    content.innerHTML = this._shimmerCards(3);

    if (tabName === 'accounts') {
      this._loadProxyAccounts();
    } else if (tabName === 'skills') {
      this._loadSkillHealth();
    } else if (tabName === 'setup') {
      this._loadSetup();
    }
  },

  // ── Proxy Accounts Tab ──
  async _loadProxyAccounts(force = false) {
    const content = document.getElementById('codex-tab-content');
    if (!content || this._activeTab !== 'accounts') return;

    const refreshBtn = document.getElementById('codex-refresh-btn');
    if (refreshBtn) refreshBtn.classList.add('spinning');

    try {
      // Fetch accounts + aggregator config in parallel
      const [proxyData, aggConfig] = await Promise.allSettled([
        API.getCodexProxyAccounts(),
        API.getCodexAggregatorConfig(),
      ]);
      this._proxyData = proxyData.status === 'fulfilled' ? proxyData.value : null;
      this._aggConfig = aggConfig.status === 'fulfilled' ? aggConfig.value : null;
      this._renderAccountsTab(content);
      this._updateRefreshTime();
    } catch (e) {
      content.innerHTML = `<div class="codex-empty-state"><p>加载反代账号失败</p></div>`;
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
  },

  _renderAccountsTab(content) {
    const data = this._proxyData;
    const cfg = this._aggConfig;
    if (!data) {
      content.innerHTML = `<div class="codex-empty-state"><p>加载失败</p></div>`;
      return;
    }

    const { stats, accounts } = data;

    // ── Aggregator main API card ──
    const endpoint = cfg?.endpoint || 'http://127.0.0.1:20128/v1';
    const apiKey = cfg?.apiKey || '(loading...)';
    const maskedKey = apiKey.length > 20
      ? apiKey.slice(0, 14) + '···' + apiKey.slice(-6)
      : apiKey;
    const mainApiHtml = `
      <div class="codex-main-api-card">
        <div class="codex-main-api-head">
          <div>
            <div class="codex-main-api-label">聚合反代 API</div>
            <div class="codex-main-api-endpoint">${endpoint}</div>
          </div>
          <span class="codex-dot-green codex-card-dot" style="flex-shrink:0"></span>
        </div>
        <div class="codex-main-api-key-row">
          <span class="codex-key-label">API Key</span>
          <code class="codex-key-value" id="agg-key-display">${maskedKey}</code>
          <button class="codex-mini-btn codex-copy-key-btn" title="复制 Key" data-key="${this._esc(apiKey)}">
            <i data-lucide="copy"></i>
          </button>
          <button class="codex-mini-btn codex-toggle-key-btn" title="显示/隐藏" data-full="${this._esc(apiKey)}" data-masked="${maskedKey}" data-shown="0">
            <i data-lucide="eye"></i>
          </button>
        </div>
      </div>`;

    // ── Stats summary ──
    const statsHtml = stats ? `
      <div class="codex-api-summary">
        <div class="codex-summary-stat">
          <span class="codex-stat-num">${stats.totalAccounts}</span>
          <span class="codex-stat-label">总账号</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num codex-stat-active">${stats.activeCount}</span>
          <span class="codex-stat-label">活跃</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num" style="color:var(--accent,#6366f1)">${stats.configuredCount}</span>
          <span class="codex-stat-label">已登录</span>
        </div>
      </div>` : '';

    // ── Sub-account proxy cards ──
    let proxyHtml = '';
    if (accounts && accounts.length) {
      proxyHtml = `
        <div class="codex-section-title">反代子账号</div>
        <div class="codex-proxy-grid">
          ${accounts.map(acc => this._proxyCardHTML(acc)).join('')}
        </div>`;
    }

    content.innerHTML = mainApiHtml + statsHtml + proxyHtml;
    this._initIcons(content);

    // Bind copy / toggle
    content.querySelectorAll('.codex-copy-key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard?.writeText(btn.dataset.key || '');
        btn.innerHTML = '<i data-lucide="check"></i>';
        lucide?.createIcons({ nodes: [btn] });
        setTimeout(() => { btn.innerHTML = '<i data-lucide="copy"></i>'; lucide?.createIcons({ nodes: [btn] }); }, 1500);
      });
    });
    content.querySelectorAll('.codex-toggle-key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const shown = btn.dataset.shown === '1';
        const display = content.querySelector('#agg-key-display');
        if (display) display.textContent = shown ? btn.dataset.masked : btn.dataset.full;
        btn.dataset.shown = shown ? '0' : '1';
        btn.innerHTML = shown ? '<i data-lucide="eye"></i>' : '<i data-lucide="eye-off"></i>';
        lucide?.createIcons({ nodes: [btn] });
      });
    });

    // Bind auth buttons
    content.querySelectorAll('.codex-auth-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const instanceNum = Number(btn.dataset.instance);
        btn.disabled = true;
        btn.textContent = '登录中...';
        try {
          const result = await API.postCodexAuthInstance(instanceNum, 'device', 'codex');
          if (result.verificationUri) {
            window.open(result.verificationUri, '_blank');
            btn.textContent = `已开启登录页, 码: ${result.userCode}`;
          } else if (result.error) {
            btn.textContent = `失败: ${result.error.slice(0,40)}`;
          } else {
            btn.textContent = result.message || '请稍候片刻后刷新';
          }
        } catch (e) {
          btn.textContent = `无法连接 Dashboard (port 3000)`;
        }
        btn.disabled = false;
      });
    });
  },

  _proxyCardHTML(acc) {
    const q = acc.quota;
    const statusClass = acc.status === 'active' ? 'codex-dot-green'
      : acc.status === 'unconfigured' ? 'codex-dot-gray' : 'codex-dot-yellow';

    // Format subscription expiry
    let expiryText = '';
    if (acc.subscriptionActiveUntil) {
      const d = new Date(acc.subscriptionActiveUntil);
      const diff = d - new Date();
      const days = Math.ceil(diff / 86400000);
      if (days > 0) {
        expiryText = `${d.getMonth()+1}/${d.getDate()} (${days}天)`;
      } else {
        expiryText = '<span class="codex-expired">已过期</span>';
      }
    } else {
      expiryText = '<span class="codex-no-data">--</span>';
    }

    const emailDisplay = acc.email ? this._maskEmail(acc.email) : `Instance-${acc.instanceNum || acc.id}`;
    const plan = acc.planType || (q && !q.error ? q.plan_type : null);

    // Build quota section
    let quotaSection = '';
    if (!acc.hasToken || acc.status === 'unconfigured') {
      quotaSection = `
        <div style="margin:8px 0; display:flex; align-items:center; gap:8px;">
          <div class="codex-status-badge notoken">🔒 未登录</div>
          <button class="codex-auth-btn" data-instance="${acc.instanceNum}"
            style="padding:5px 12px;border:none;border-radius:8px;background:var(--accent,#6366f1);color:#fff;font-size:0.75rem;font-weight:600;cursor:pointer;">
            授权登录
          </button>
        </div>`;

    } else if (!q || q.error) {
      const errMap = {
        expired: '⚠️ Token 已过期', timeout: '⏱ 请求超时',
        network_error: '🌐 网络错误', fetch_failed: '❌ 获取失败',
      };
      quotaSection = `<div class="codex-status-badge error" style="margin:8px 0">${errMap[q?.error] || '❌ 获取失败'}</div>`;
    } else {
      quotaSection = this._quotaBarsHTML(q);
    }

    return `
      <div class="codex-proxy-card">
        <div class="codex-proxy-head">
          <div class="codex-proxy-head-left">
            <span class="codex-card-dot ${statusClass}"></span>
            <div>
              <div class="codex-proxy-name">${this._esc(acc.nickname || `#${acc.instanceNum}`)}</div>
              <div class="codex-proxy-email">${emailDisplay}</div>
            </div>
          </div>
          <div class="codex-proxy-head-right">
            ${plan ? `<span class="codex-card-plan">${plan.toUpperCase()}</span>` : ''}
          </div>
        </div>
        ${quotaSection}
        <div class="codex-proxy-footer">
          <span class="codex-proxy-expiry">
            <i data-lucide="calendar-clock"></i>
            Plus 到期: ${expiryText}
          </span>
        </div>
      </div>
    `;
  },


  // ── Skill Health Tab ──
  async _loadSkillHealth(force = false) {
    const content = document.getElementById('codex-tab-content');
    if (!content || this._activeTab !== 'skills') return;

    const refreshBtn = document.getElementById('codex-refresh-btn');
    if (refreshBtn) refreshBtn.classList.add('spinning');

    try {
      this._skillData = await API.getCodexSkillHealth();
      this._renderSkillsTab(content);
      this._updateRefreshTime();
    } catch (e) {
      content.innerHTML = `<div class="codex-empty-state"><p>加载 Skill 健康数据失败</p></div>`;
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
  },

  _renderSkillsTab(content) {
    const data = this._skillData;
    if (!data || !data.skills) {
      content.innerHTML = `<div class="codex-empty-state"><p>无 Skill 健康数据</p></div>`;
      return;
    }

    const summary = data.summary || {};
    const skillEntries = Object.entries(data.skills);

    // Count statuses
    let healthyCount = 0, stableCount = 0, criticalCount = 0;
    for (const [, s] of skillEntries) {
      if (s.health_status === 'Healthy') healthyCount++;
      else if (s.health_status === 'Stable') stableCount++;
      else criticalCount++;
    }

    let html = `
      <div class="codex-skill-summary">
        <div class="codex-summary-stat">
          <span class="codex-stat-num">${summary.total_skills || skillEntries.length}</span>
          <span class="codex-stat-label">总 Skill</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num codex-stat-active">${(summary.avg_health || 0).toFixed(1)}</span>
          <span class="codex-stat-label">平均分</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num" style="color:#22c55e">${healthyCount}</span>
          <span class="codex-stat-label">Healthy</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num" style="color:#f59e0b">${stableCount}</span>
          <span class="codex-stat-label">Stable</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num" style="color:#ef4444">${criticalCount}</span>
          <span class="codex-stat-label">Critical</span>
        </div>
      </div>
      <div class="codex-skill-toolbar">
        <div class="codex-skill-search-wrap">
          <i data-lucide="search"></i>
          <input type="text" class="codex-skill-search" id="codex-skill-search"
            placeholder="搜索 skill..." value="${this._esc(this._skillSearch)}">
        </div>
        <div class="codex-skill-filters">
          <button class="codex-filter-btn active" data-filter="all">全部</button>
          <button class="codex-filter-btn" data-filter="Healthy">Healthy</button>
          <button class="codex-filter-btn" data-filter="Stable">Stable</button>
          <button class="codex-filter-btn" data-filter="Critical">Critical</button>
        </div>
      </div>
      <div class="codex-skill-grid" id="codex-skill-grid">
    `;

    // Sort: critical first, then by score ascending
    const sorted = [...skillEntries].sort((a, b) => {
      const order = { 'Critical': 0, 'Stable': 1, 'Healthy': 2 };
      const aO = order[a[1].health_status] ?? 1;
      const bO = order[b[1].health_status] ?? 1;
      if (aO !== bO) return aO - bO;
      return (a[1].dynamic_score || 0) - (b[1].dynamic_score || 0);
    });

    for (const [name, skill] of sorted) {
      html += this._skillChipHTML(name, skill);
    }

    html += `</div>`;
    content.innerHTML = html;
    this._initIcons(content);
    this._bindSkillEvents(content);
  },

  _skillChipHTML(name, skill) {
    const score = skill.dynamic_score || 0;
    const statusClass = skill.health_status === 'Healthy' ? 'chip-healthy'
      : skill.health_status === 'Stable' ? 'chip-stable' : 'chip-critical';

    return `
      <div class="codex-skill-chip ${statusClass}" data-skill-name="${this._esc(name)}" data-skill-status="${skill.health_status}">
        <div class="codex-skill-chip-name">${this._esc(name)}</div>
        <div class="codex-skill-chip-score">${score.toFixed(1)}</div>
        ${skill.usage_30d > 0 ? `<div class="codex-skill-chip-usage">${skill.usage_30d}次</div>` : ''}
      </div>
    `;
  },

  _bindSkillEvents(container) {
    // Search
    const searchInput = container.querySelector('#codex-skill-search');
    let debounce = null;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this._skillSearch = e.target.value;
        this._filterSkills();
      }, 200);
    });

    // Filter buttons
    container.querySelectorAll('.codex-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.codex-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._filterSkills(btn.dataset.filter);
      });
    });
  },

  _filterSkills(statusFilter) {
    const grid = document.getElementById('codex-skill-grid');
    if (!grid) return;
    const search = this._skillSearch.toLowerCase();
    const activeFilter = statusFilter || document.querySelector('.codex-filter-btn.active')?.dataset?.filter || 'all';

    grid.querySelectorAll('.codex-skill-chip').forEach(chip => {
      const name = chip.dataset.skillName.toLowerCase();
      const status = chip.dataset.skillStatus;
      const matchSearch = !search || name.includes(search);
      const matchFilter = activeFilter === 'all' || status === activeFilter;
      chip.style.display = (matchSearch && matchFilter) ? '' : 'none';
    });
  },

  // ── Load local account list (original functionality) ──
  async loadList(forceRefresh = false) {
    const grid = document.getElementById('codex-grid');
    if (!grid) return;

    try {
      const path = forceRefresh ? '/codex?refresh=1' : '/codex';
      this._accounts = await API.request(path);
      this._sortAccounts();
      this._renderCards();
      this._updateRefreshTime();
    } catch (e) {
      grid.innerHTML = `<div class="codex-empty-state"><p>加载失败，请重试</p></div>`;
    }
  },

  /** Refresh a single account's quota. */
  async refreshSingle(id) {
    const card = document.querySelector(`.codex-quota-card[data-id="${id}"]`);
    const refreshIcon = card?.querySelector('.codex-card-refresh');
    if (refreshIcon) refreshIcon.classList.add('spinning');

    try {
      const result = await API.request(`/codex/${id}/refresh`);
      const idx = this._accounts.findIndex(a => a.id == id);
      if (idx !== -1 && result.quota) {
        this._accounts[idx].quota = result.quota;
        this._accounts[idx].has_token = result.has_token ?? this._accounts[idx].has_token;
      }
      this._sortAccounts();
      this._renderCards();
    } catch (e) {
      this._toast('刷新失败', 'error');
    }
  },

  _sortAccounts() {
    this._accounts.sort((a, b) => {
      if (a.has_token !== b.has_token) return b.has_token ? 1 : -1;
      const aQ = a.quota && !a.quota.error;
      const bQ = b.quota && !b.quota.error;
      if (aQ !== bQ) return bQ ? 1 : -1;
      if (aQ && bQ) {
        const aUsed = a.quota.secondary_used ?? a.quota.primary_used ?? 0;
        const bUsed = b.quota.secondary_used ?? b.quota.primary_used ?? 0;
        return bUsed - aUsed;
      }
      return 0;
    });
  },

  _updateRefreshTime() {
    const el = document.getElementById('codex-last-refresh');
    if (!el) return;
    const now = new Date();
    el.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} 更新`;
  },

  // ── Render local account card grid ──
  _renderCards() {
    const grid = document.getElementById('codex-grid');
    if (!grid) return;

    if (!this._accounts.length) {
      grid.innerHTML = `
        <div class="codex-empty-state">
          <div class="codex-empty-icon">🔑</div>
          <p>还没有本地 Codex 账号</p>
          <button class="codex-empty-add-btn" id="codex-empty-add">
            <i data-lucide="plus"></i> 添加第一个账号
          </button>
        </div>
      `;
      grid.querySelector('#codex-empty-add')
        ?.addEventListener('click', () => this.openForm());
      this._initIcons(grid);
      return;
    }

    grid.innerHTML = this._accounts.map(acc => this._cardHTML(acc)).join('');

    grid.querySelectorAll('.codex-quota-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.codex-detail-actions') ||
            e.target.closest('.codex-mini-btn') ||
            e.target.closest('.codex-card-refresh')) return;
        this._toggleDetail(card.dataset.id);
      });
    });

    grid.querySelectorAll('.codex-card-refresh').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.refreshSingle(btn.dataset.id);
      });
    });

    this._initIcons(grid);

    if (this._expandedId) {
      const card = grid.querySelector(`.codex-quota-card[data-id="${this._expandedId}"]`);
      if (card) this._showDetailInCard(card, this._expandedId);
    }
  },

  _cardHTML(acc) {
    const q = acc.quota;
    let quotaHTML = '';
    let statusIndicator = '';

    if (!acc.has_token) {
      quotaHTML = '<div class="codex-status-badge notoken">🔒 未认证</div>';
      statusIndicator = '<span class="codex-card-dot codex-dot-gray"></span>';
    } else if (!q || q.error) {
      const errMap = {
        expired: '⚠️ Token 已过期',
        timeout: '⏱ 请求超时',
        network_error: '🌐 网络错误',
        fetch_failed: '❌ 获取失败',
      };
      quotaHTML = `<div class="codex-status-badge error">${errMap[q?.error] || '❌ 获取失败'}</div>`;
      statusIndicator = '<span class="codex-card-dot codex-dot-red"></span>';
    } else {
      quotaHTML = this._quotaBarsHTML(q);
      const used7d = q.secondary_used ?? q.primary_used ?? 0;
      const dotClass = used7d >= 80 ? 'codex-dot-red' : used7d >= 50 ? 'codex-dot-yellow' : 'codex-dot-green';
      statusIndicator = `<span class="codex-card-dot ${dotClass}"></span>`;
    }

    const refreshBtn = acc.has_token
      ? `<button class="codex-card-refresh" data-id="${acc.id}" title="刷新此账号"><i data-lucide="refresh-cw"></i></button>`
      : '';

    return `
      <div class="codex-quota-card" data-id="${acc.id}">
        <div class="codex-card-head">
          <div class="codex-card-head-left">
            ${statusIndicator}
            <div>
              <div class="codex-card-name">${this._esc(acc.name)}</div>
              <div class="codex-card-account-label">${this._maskEmail(acc.account)}</div>
            </div>
          </div>
          <div class="codex-card-head-right">
            ${refreshBtn}
            ${(q && !q.error && acc.has_token)
              ? `<span class="codex-card-plan">${(q.plan_type || 'UNKNOWN').toUpperCase()}</span>`
              : ''}
          </div>
        </div>
        ${quotaHTML}
        <div class="codex-detail-slot"></div>
      </div>
    `;
  },

  _quotaBarsHTML(q) {
    // secondary_window = 7-day rolling; primary_window = short window (typically 3~5h)
    const has7d = q.secondary_used != null;
    const has5h = q.primary_used != null; // independent of 7d

    // Use secondary (7d) as the main bar; fall back to primary if only primary exists
    const mainUsed = has7d ? q.secondary_used : (q.primary_used ?? 0);
    const mainRemaining = Math.max(0, 100 - mainUsed).toFixed(0);
    const mainStatus = this._statusClass(mainUsed);

    // Compute dynamic label for secondary window
    const secondaryLabel = q.secondary_window_secs
      ? this._windowLabel(q.secondary_window_secs)
      : (has7d ? '7d' : null);
    // Compute dynamic label for primary window
    const primaryLabel = q.primary_window_secs
      ? this._windowLabel(q.primary_window_secs)
      : (has5h ? '5h' : null);

    let html = `<div class="codex-quota-section">`;

    html += `
      <div class="codex-quota-row">
        <span class="codex-quota-label">${secondaryLabel || primaryLabel || '配额'}</span>
        <div class="codex-quota-track large">
          <div class="codex-quota-fill codex-fill-${mainStatus}" style="width:${mainUsed}%"></div>
        </div>
        <span class="codex-quota-pct codex-pct-${mainStatus}">${mainRemaining}%</span>
      </div>
    `;

    // Show short-window bar only when both windows are present
    if (has7d && has5h) {
      const remaining5h = Math.max(0, 100 - q.primary_used).toFixed(0);
      const status5h = this._statusClass(q.primary_used);
      html += `
        <div class="codex-quota-row">
          <span class="codex-quota-label">${primaryLabel || '5h'}</span>
          <div class="codex-quota-track">
            <div class="codex-quota-fill codex-fill-${status5h}" style="width:${q.primary_used}%"></div>
          </div>
          <span class="codex-quota-pct codex-pct-${status5h}">${remaining5h}%</span>
        </div>
      `;
    }

    if (q.credits_balance != null && q.credits_balance > 0) {
      html += `
        <div class="codex-credits-row">
          <i data-lucide="wallet"></i>
          <span>余额: $${q.credits_balance.toFixed(2)}</span>
        </div>
      `;
    }

    const resetUnix = has7d ? q.secondary_reset : q.primary_reset;
    const resetText = this._formatReset(resetUnix);
    if (resetText) {
      html += `<div class="codex-reset-text codex-countdown" data-reset="${resetUnix || ''}">${resetText}</div>`;
    }

    html += `</div>`;
    return html;
  },

  /**
   * Convert seconds to a human-readable window label.
   * @param {number} secs Window duration in seconds.
   * @returns {string} e.g. "7d", "5h", "3h".
   */
  _windowLabel(secs) {
    if (!secs || secs <= 0) return '';
    const hours = Math.round(secs / 3600);
    if (hours >= 24) return `${Math.round(hours / 24)}d`;
    return `${hours}h`;
  },

  // ── Toggle detail panel inside card ──
  async _toggleDetail(id) {
    const grid = document.getElementById('codex-grid');
    if (!grid) return;

    const card = grid.querySelector(`.codex-quota-card[data-id="${id}"]`);
    if (!card) return;

    if (card.classList.contains('expanded')) {
      card.classList.remove('expanded');
      card.querySelector('.codex-detail-slot').innerHTML = '';
      this._expandedId = null;
      return;
    }

    grid.querySelectorAll('.codex-quota-card.expanded').forEach(c => {
      c.classList.remove('expanded');
      c.querySelector('.codex-detail-slot').innerHTML = '';
    });

    this._expandedId = id;
    await this._showDetailInCard(card, id);
  },

  async _showDetailInCard(card, id) {
    const slot = card.querySelector('.codex-detail-slot');
    if (!slot) return;

    card.classList.add('expanded');
    slot.innerHTML = '<div class="codex-shimmer-line" style="width:70%;margin-top:16px"></div>';

    try {
      let acc = this._detailCache[id];
      if (!acc) {
        acc = await API.getCodexAccount(id);
        this._detailCache[id] = acc;
      }

      slot.innerHTML = `
        <div class="codex-detail-panel">
          ${this._detailField('账号', acc.account, false)}
          ${this._detailField('密码', acc.password, true)}
          ${acc.email ? this._detailField('邮箱', acc.email, false) : ''}
          ${acc.email_password ? this._detailField('邮箱密码', acc.email_password, true) : ''}
          ${acc.access_token ? this._detailField('Token', acc.access_token.substring(0, 20) + '...', false) : ''}
          <div class="codex-detail-actions">
            <button class="codex-btn-edit" data-edit="${acc.id}">
              <i data-lucide="pencil"></i> 编辑
            </button>
            <button class="codex-btn-delete" data-del="${acc.id}">
              <i data-lucide="trash-2"></i> 删除
            </button>
          </div>
        </div>
      `;

      this._bindDetailEvents(slot, acc);
      this._initIcons(slot);
    } catch (e) {
      slot.innerHTML = '<div style="padding:16px;color:#ef4444;">加载详情失败</div>';
    }
  },

  _detailField(label, value, masked) {
    const safe = this._esc(value || '');
    if (masked) {
      return `
        <div class="codex-detail-field">
          <span class="codex-detail-label">${label}</span>
          <div class="codex-detail-value">
            <span class="masked" data-secret>••••••••</span>
            <button class="codex-mini-btn codex-eye-toggle" title="显示">
              <i data-lucide="eye"></i>
            </button>
            <button class="codex-mini-btn codex-copy-trigger" title="复制">
              <i data-lucide="copy"></i>
            </button>
          </div>
          <input type="hidden" class="codex-secret-val" value="${safe}">
        </div>
      `;
    }
    return `
      <div class="codex-detail-field">
        <span class="codex-detail-label">${label}</span>
        <div class="codex-detail-value">
          <span>${safe}</span>
          <button class="codex-mini-btn codex-copy-trigger" title="复制">
            <i data-lucide="copy"></i>
          </button>
        </div>
        <input type="hidden" class="codex-secret-val" value="${safe}">
      </div>
    `;
  },

  _bindDetailEvents(slot, acc) {
    slot.querySelectorAll('.codex-eye-toggle').forEach(btn => {
      let timer = null;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const field = btn.closest('.codex-detail-field');
        const span = field?.querySelector('.masked');
        const store = field?.querySelector('.codex-secret-val');
        if (!span || !store) return;

        clearTimeout(timer);
        if (span.textContent === '••••••••') {
          span.textContent = store.value;
          span.classList.remove('masked');
          btn.querySelector('i')?.setAttribute('data-lucide', 'eye-off');
          timer = setTimeout(() => {
            span.textContent = '••••••••';
            span.classList.add('masked');
            btn.querySelector('i')?.setAttribute('data-lucide', 'eye');
            this._initIcons(btn);
          }, 5000);
        } else {
          span.textContent = '••••••••';
          span.classList.add('masked');
          btn.querySelector('i')?.setAttribute('data-lucide', 'eye');
        }
        this._initIcons(btn);
      });
    });

    slot.querySelectorAll('.codex-copy-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const field = btn.closest('.codex-detail-field');
        const store = field?.querySelector('.codex-secret-val');
        if (!store) return;

        navigator.clipboard.writeText(store.value).then(() => {
          const icon = btn.querySelector('i');
          if (icon) {
            icon.setAttribute('data-lucide', 'check');
            this._initIcons(btn);
            setTimeout(() => {
              icon.setAttribute('data-lucide', 'copy');
              this._initIcons(btn);
            }, 1200);
          }
          this._toast('已复制');
        }).catch(() => {});
      });
    });

    slot.querySelector('[data-edit]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openForm(acc.id);
    });

    slot.querySelector('[data-del]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteAccount(acc.id);
    });
  },

  // ── Form (add / edit) ──
  async openForm(editId) {
    let existing = null;
    if (editId) {
      try { existing = await API.getCodexAccount(editId); } catch (_) {}
    }

    const overlay = document.createElement('div');
    overlay.className = 'codex-form-overlay';
    overlay.innerHTML = `
      <div class="codex-form-panel">
        <div class="codex-form-title">${existing ? '编辑账号' : '添加账号'}</div>
        <div class="codex-form-group">
          <label>名称 *</label>
          <input type="text" id="cx-f-name" value="${this._esc(existing?.name || '')}" placeholder="如: 主力号" autocomplete="off">
        </div>
        <div class="codex-form-group">
          <label>账号 *</label>
          <input type="text" id="cx-f-account" value="${this._esc(existing?.account || '')}" placeholder="登录邮箱/用户名" autocomplete="off">
        </div>
        <div class="codex-form-group">
          <label>密码 *</label>
          <input type="password" id="cx-f-password" value="${this._esc(existing?.password || '')}" placeholder="账号密码" autocomplete="off">
        </div>
        <div class="codex-form-group">
          <label>邮箱</label>
          <input type="text" id="cx-f-email" value="${this._esc(existing?.email || '')}" placeholder="可选" autocomplete="off">
        </div>
        <div class="codex-form-group">
          <label>邮箱密码</label>
          <input type="password" id="cx-f-email-pw" value="${this._esc(existing?.email_password || '')}" placeholder="可选" autocomplete="off">
        </div>
        <div class="codex-form-group">
          <label>Access Token</label>
          <textarea id="cx-f-token" rows="2" placeholder="用于动态获取额度（可选）">${this._esc(existing?.access_token || '')}</textarea>
          <div class="codex-token-btns">
            <button id="cx-read-local">🔑 从本地读取</button>
            <a href="https://chatgpt.com" target="_blank" rel="noopener">🌐 前往登录</a>
          </div>
        </div>
        <button class="codex-form-submit" id="cx-save">
          ${existing ? '保存修改' : '添加'}
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    this._formOverlay = overlay;
    requestAnimationFrame(() => overlay.classList.add('active'));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeForm();
    });
    const escHandler = (e) => {
      if (e.key === 'Escape') { this._closeForm(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    overlay.querySelector('#cx-read-local').addEventListener('click', async () => {
      const btn = overlay.querySelector('#cx-read-local');
      btn.textContent = '读取中...';
      btn.disabled = true;
      try {
        const result = await API.getCodexLocalToken();
        if (result.token) {
          overlay.querySelector('#cx-f-token').value = result.token;
          this._toast('Token 已读取');
        } else {
          this._toast(result.error || '未找到 Token', 'error');
        }
      } catch (_) {
        this._toast('读取失败', 'error');
      } finally {
        btn.textContent = '🔑 从本地读取';
        btn.disabled = false;
      }
    });

    const doSave = async () => {
      const data = {
        name: overlay.querySelector('#cx-f-name').value.trim(),
        account: overlay.querySelector('#cx-f-account').value.trim(),
        password: overlay.querySelector('#cx-f-password').value,
        email: overlay.querySelector('#cx-f-email').value.trim(),
        email_password: overlay.querySelector('#cx-f-email-pw').value,
        access_token: overlay.querySelector('#cx-f-token').value.trim(),
      };

      if (!data.name || !data.account || !data.password) {
        this._toast('名称、账号、密码为必填', 'error');
        return;
      }

      const btn = overlay.querySelector('#cx-save');
      btn.disabled = true;
      btn.textContent = '保存中...';

      try {
        if (existing) {
          await API.updateCodexAccount(editId, data);
        } else {
          await API.createCodexAccount(data);
        }
        this._toast(existing ? '已更新' : '已添加');
        this._detailCache = {};
        this._closeForm();
        this.loadList(true);
      } catch (e) {
        this._toast('保存失败: ' + (e.message || ''), 'error');
        btn.disabled = false;
        btn.textContent = existing ? '保存修改' : '添加';
      }
    };

    overlay.querySelector('#cx-save').addEventListener('click', doSave);
    overlay.querySelectorAll('#cx-f-name, #cx-f-account, #cx-f-password, #cx-f-email, #cx-f-email-pw')
      .forEach(input => input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); doSave(); }
      }));

    requestAnimationFrame(() => {
      const firstEmpty = overlay.querySelector('#cx-f-name:placeholder-shown') ||
                         overlay.querySelector('#cx-f-account:placeholder-shown') ||
                         overlay.querySelector('#cx-f-name');
      firstEmpty?.focus();
    });
  },

  _closeForm() {
    if (!this._formOverlay) return;
    this._formOverlay.classList.remove('active');
    setTimeout(() => {
      this._formOverlay?.remove();
      this._formOverlay = null;
    }, 250);
  },

  // ── Delete ──
  async deleteAccount(id) {
    if (!confirm('确定删除此账号？')) return;
    try {
      await API.deleteCodexAccount(id);
      this._toast('已删除');
      this._expandedId = null;
      delete this._detailCache[id];
      this.loadList();
    } catch (e) {
      this._toast('删除失败', 'error');
    }
  },

  // ── Helpers ──
  _shimmerCards(n) {
    return Array(n).fill(`
      <div class="codex-shimmer-card">
        <div class="codex-shimmer-line"></div>
        <div class="codex-shimmer-line"></div>
        <div class="codex-shimmer-line"></div>
      </div>
    `).join('');
  },

  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  _maskEmail(str) {
    if (!str) return '';
    const safe = this._esc(str);
    if (!str.includes('@')) return safe;
    const [local, domain] = str.split('@');
    const masked = local.substring(0, 3) + '***';
    return this._esc(masked + '@' + domain);
  },


  // ── One-Click Setup Tab ──

  /** Load and render the one-click setup tab. */
  async _loadSetup() {
    const content = document.getElementById('codex-tab-content');
    if (!content || this._activeTab !== 'setup') return;

    content.innerHTML = `
      <div class="codex-setup-loading">
        <div class="codex-shimmer-card" style="height:140px"></div>
        <div class="codex-shimmer-card" style="height:160px;margin-top:12px"></div>
      </div>`;

    try {
      const data = await API.getCodexSetupStatus();
      this._renderSetupTab(content, data);
    } catch (e) {
      content.innerHTML = `<div class="codex-empty-state"><p>加载配置状态失败: ${this._esc(e.message)}</p></div>`;
    }
  },

  /**
   * Render the setup tab with API config card and skills install card.
   * @param {HTMLElement} content Container element.
   * @param {object} data Response from GET /api/codex/setup-status.
   */
  _renderSetupTab(content, data) {
    const {
      platform, configPath, configExists,
      currentBaseUrl, targetEndpoint, targetApiKey,
      skillsLinkPath, skillsStatus, skillsLinkTarget, skillsCount,
      skillsSourcePath,
    } = data;

    const isWin = platform === 'win32';

    // ── API Config Card ──
    const apiNeedsUpdate = !currentBaseUrl || currentBaseUrl !== targetEndpoint;
    const apiStatusClass = !currentBaseUrl ? 'setup-badge-missing'
      : apiNeedsUpdate ? 'setup-badge-warn' : 'setup-badge-ok';
    const apiStatusText = !currentBaseUrl ? '未配置' : apiNeedsUpdate ? '需更新' : '已配置 ✓';

    const maskedKey = targetApiKey && targetApiKey.length > 20
      ? targetApiKey.slice(0, 10) + '···' + targetApiKey.slice(-6)
      : (targetApiKey || '--');

    const apiCardHtml = `
      <div class="codex-setup-card" id="setup-api-card">
        <div class="codex-setup-card-head">
          <div class="codex-setup-card-title">
            <i data-lucide="plug-zap"></i> Codex API 配置
          </div>
          <span class="codex-setup-badge ${apiStatusClass}">${apiStatusText}</span>
        </div>
        <div class="codex-setup-info-grid">
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">配置文件</span>
            <code class="codex-setup-info-val codex-setup-path">${this._esc(configPath)}</code>
          </div>
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">当前 Endpoint</span>
            <code class="codex-setup-info-val ${!currentBaseUrl ? 'codex-setup-empty' : ''}">${this._esc(currentBaseUrl || '(未设置)')}</code>
          </div>
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">目标 Endpoint</span>
            <code class="codex-setup-info-val codex-setup-target">${this._esc(targetEndpoint || '--')}</code>
          </div>
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">目标 API Key</span>
            <code class="codex-setup-info-val">${this._esc(maskedKey)}</code>
          </div>
        </div>
        <button class="codex-setup-apply-btn" id="setup-apply-api"
          ${!targetEndpoint ? 'disabled title="未找到聚合反代配置"' : ''}>
          <i data-lucide="zap"></i>
          ${apiNeedsUpdate ? '一键写入 API 配置' : '重新写入 API 配置'}
        </button>
        <div class="codex-setup-note">写入后请重启 Codex app 以生效；原文件将自动备份。</div>
      </div>`;

    // ── Skills Install Card ──
    const skillsOk = skillsStatus === 'symlink' || skillsStatus === 'directory';
    const skillsStatusClass = skillsStatus === 'symlink' ? 'setup-badge-ok'
      : skillsStatus === 'directory' ? 'setup-badge-warn' : 'setup-badge-missing';
    const skillsStatusText = skillsStatus === 'symlink' ? `已链接 (${skillsCount} skills) ✓`
      : skillsStatus === 'directory' ? `本地目录 (${skillsCount} skills)`
      : '未安装';

    const linkMethodLabel = isWin ? 'mklink /J (目录联接)' : 'symlink (软链接)';
    const linkTargetRow = skillsLinkTarget
      ? `<div class="codex-setup-info-row">
           <span class="codex-setup-info-label">链接目标</span>
           <code class="codex-setup-info-val codex-setup-path">${this._esc(skillsLinkTarget)}</code>
         </div>` : '';

    const skillsCardHtml = `
      <div class="codex-setup-card" id="setup-skills-card">
        <div class="codex-setup-card-head">
          <div class="codex-setup-card-title">
            <i data-lucide="library"></i> Skills 安装
          </div>
          <span class="codex-setup-badge ${skillsStatusClass}">${skillsStatusText}</span>
        </div>
        <div class="codex-setup-info-grid">
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">链接路径</span>
            <code class="codex-setup-info-val codex-setup-path">${this._esc(skillsLinkPath)}</code>
          </div>
          ${linkTargetRow}
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">源目录</span>
            <code class="codex-setup-info-val ${!skillsSourcePath ? 'codex-setup-empty' : 'codex-setup-target'}">${this._esc(skillsSourcePath || '(未找到)')}</code>
          </div>
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">方式</span>
            <code class="codex-setup-info-val">${linkMethodLabel}</code>
          </div>
        </div>
        <button class="codex-setup-apply-btn codex-setup-apply-skills" id="setup-apply-skills"
          ${!skillsSourcePath ? 'disabled title="未找到 skills 源目录"' : ''}>
          <i data-lucide="link"></i>
          ${skillsOk ? '重新链接 Skills（更新）' : '一键安装 Skills'}
        </button>
        <div class="codex-setup-note">迁移电脑后点击即可将最新 Skill 库链接到新 Codex 实例。</div>
      </div>`;

    content.innerHTML = `<div class="codex-setup-container">${apiCardHtml}${skillsCardHtml}</div>`;
    this._initIcons(content);

    // ── Bind API apply button ──
    content.querySelector('#setup-apply-api')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2"></i> 写入中...';
      this._initIcons(btn);
      try {
        await API.postCodexApplyApiConfig({
          endpoint: targetEndpoint,
          apiKey: targetApiKey,
        });
        this._toast('✅ API 配置已写入 config.toml，重启 Codex 后生效', 'success');
        await this._loadSetup();
      } catch (err) {
        this._toast(`❌ 写入失败: ${err.message}`, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="zap"></i> 重试';
        this._initIcons(btn);
      }
    });

    // ── Bind Skills apply button ──
    content.querySelector('#setup-apply-skills')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2"></i> 安装中...';
      this._initIcons(btn);
      try {
        const result = await API.postCodexApplySkills({ sourcePath: skillsSourcePath });
        this._toast(`✅ Skills 已链接！共 ${result.skillsCount} 个 skill`, 'success');
        await this._loadSetup();
      } catch (err) {
        this._toast(`❌ 安装失败: ${err.message}`, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="link"></i> 重试';
        this._initIcons(btn);
      }
    });
  },

  _toast(msg, type = 'info') {
    if (typeof App !== 'undefined' && App.showToast) App.showToast(msg, type);
  },

  _initIcons(el) {
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [el] });
  },

  _statusClass(used) {
    if (used >= 95) return 'critical';
    if (used >= 80) return 'danger';
    if (used >= 50) return 'warning';
    return 'healthy';
  },

  _formatReset(unix) {
    if (!unix) return '';
    const reset = new Date(unix * 1000);
    const diffMs = reset - new Date();
    if (diffMs <= 0) return '已重置';
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (days > 0) return `${days}天${remainHours}小时后重置`;
    if (hours > 0) return `${hours}小时${mins}分后重置`;
    return `${Math.ceil(diffMs / 60000)}分钟后重置`;
  },
};

// Backward compat
const CodexManager = {
  open() {
    if (typeof App !== 'undefined') App.switchView('codex');
  },
};
