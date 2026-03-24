/* ────────────────────────────────────
   CodexView — Codex Quota Card View v3
   Tabbed: Proxy Accounts + Skill Health
   ──────────────────────────────────── */

const CodexView = {
  _accounts: [],
  _proxyData: null,
  _skillData: null,
  _installedSkillsData: null,
  _setupData: null,
  _localTokenData: null,
  _aggConfig: null,
  _expandedId: null,
  _detailCache: {},
  _formOverlay: null,
  _autoRefreshTimer: null,
  _authPollTimers: new Map(),
  _countdownTimer: null,
  _visible: false,
  _activeTab: 'accounts', // 'accounts' | 'skills'
  _skillSearch: '',
  _skillFilter: 'all',

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
    this._stopAllAuthPolling();
    this._stopCountdown();
  },

  // ── Auto refresh ──
  _startAutoRefresh() {
    this._stopAutoRefresh();
    this._autoRefreshTimer = setInterval(() => {
      if (this._visible) {
        if (this._activeTab === 'accounts') this._loadProxyAccounts();
        else if (this._activeTab === 'skills') this._loadSkillHealth();
        else this._loadSetup();
      }
    }, this.AUTO_REFRESH_MS);
  },

  _stopAutoRefresh() {
    if (this._autoRefreshTimer) {
      clearInterval(this._autoRefreshTimer);
      this._autoRefreshTimer = null;
    }
  },

  /**
   * Stop polling auth status for one CPA instance.
   * @param {number} instanceNum Target instance number.
   * @returns {void}
   */
  _stopAuthPolling(instanceNum) {
    const timer = this._authPollTimers.get(instanceNum);
    if (timer) {
      clearInterval(timer);
      this._authPollTimers.delete(instanceNum);
    }
  },

  /**
   * Stop all in-flight auth status polling timers.
   * @returns {void}
   */
  _stopAllAuthPolling() {
    this._authPollTimers.forEach((timer) => clearInterval(timer));
    this._authPollTimers.clear();
  },

  /**
   * Poll proxy-account status until one instance becomes authorized.
   * @param {number} instanceNum Target instance number.
   * @returns {void}
   */
  _startAuthPolling(instanceNum) {
    if (!instanceNum) return;

    this._stopAuthPolling(instanceNum);
    let remainingPolls = 24;

    const poll = async () => {
      if (!this._visible) {
        this._stopAuthPolling(instanceNum);
        return;
      }

      remainingPolls -= 1;

      try {
        const proxyData = await API.getCodexProxyAccounts();
        this._proxyData = proxyData;
        const account = (proxyData.accounts || []).find((item) => Number(item.instanceNum) === Number(instanceNum));

        if (account?.hasToken) {
          this._stopAuthPolling(instanceNum);
          if (this._activeTab === 'setup') {
            await this._loadSetup();
          }
          this._toast(`实例 ${instanceNum} 已授权成功`, 'success');
          return;
        }
      } catch (_) {
        // Keep polling until timeout.
      }

      if (remainingPolls <= 0) {
        this._stopAuthPolling(instanceNum);
      }
    };

    const timer = setInterval(poll, 5000);
    this._authPollTimers.set(instanceNum, timer);
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
        else if (this._activeTab === 'skills') this._loadSkillHealth(true);
        else this._loadSetup();
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
    this._bindAuthButtons(content);
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

  /**
   * Bind all account authorization buttons inside a container.
   * @param {HTMLElement} container Root element containing auth buttons.
   * @returns {void}
   */
  _bindAuthButtons(container) {
    container.querySelectorAll('.codex-auth-btn').forEach(btn => {
      btn.addEventListener('click', () => this._startInstanceAuth(btn));
    });
  },

  /**
   * Start device authorization for one aggregator instance.
   * @param {HTMLButtonElement} button Trigger button for the target instance.
   * @returns {Promise<void>}
   */
  async _startInstanceAuth(button) {
    const instanceNum = Number(button?.dataset?.instance);
    if (!instanceNum) return;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = '登录中...';

    try {
      const result = await API.postCodexAuthInstance(instanceNum, 'device', 'codex');
      if (result.verificationUri) {
        window.open(result.verificationUri, '_blank');
        button.textContent = result.userCode ? `已开启登录页 · ${result.userCode}` : '已开启登录页';
        this._startAuthPolling(instanceNum);
        this._toast(`实例 ${instanceNum} 已生成一次性登录码，完成授权后会自动刷新`, 'success');
      } else if (result.error) {
        button.textContent = `失败: ${String(result.error).slice(0, 24)}`;
        this._toast(`实例 ${instanceNum} 授权失败: ${result.error}`, 'error');
      } else {
        button.textContent = result.message || '请稍候片刻后刷新';
        this._startAuthPolling(instanceNum);
      }
    } catch (e) {
      button.textContent = '授权失败';
      this._toast(`实例 ${instanceNum} 授权失败: ${e.message || e}`, 'error');
    } finally {
      setTimeout(() => {
        button.disabled = false;
        if (button.isConnected && button.textContent === '登录中...') {
          button.textContent = originalText;
        }
      }, 600);
    }
  },


  // ── Skill Health Tab ──
  async _loadSkillHealth(force = false) {
    const content = document.getElementById('codex-tab-content');
    if (!content || this._activeTab !== 'skills') return;

    const refreshBtn = document.getElementById('codex-refresh-btn');
    if (refreshBtn) refreshBtn.classList.add('spinning');

    try {
      const [installedData, healthData] = await Promise.allSettled([
        API.getCodexInstalledSkills(),
        API.getCodexSkillHealth(),
      ]);
      this._installedSkillsData = installedData.status === 'fulfilled' ? installedData.value : null;
      this._skillData = healthData.status === 'fulfilled' ? healthData.value : null;
      this._renderSkillsTab(content);
      this._updateRefreshTime();
    } catch (e) {
      content.innerHTML = `<div class="codex-empty-state"><p>加载 Skills 数据失败</p></div>`;
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
  },

  _renderSkillsTab(content) {
    const library = this._installedSkillsData;
    const healthSummary = this._skillData?.summary || {};
    const skills = Array.isArray(library?.skills) ? library.skills.map((skill) => {
      const health = skill.health || this._skillData?.skills?.[skill.name] || null;
      return {
        ...skill,
        health_status: health?.health_status || 'Missing',
        dynamic_score: health?.dynamic_score ?? null,
        usage_30d: health?.usage_30d ?? 0,
      };
    }) : [];

    if (!skills.length) {
      content.innerHTML = `<div class="codex-empty-state"><p>未发现真实 Skills 目录</p></div>`;
      return;
    }

    const healthyCount = skills.filter((skill) => skill.health_status === 'Healthy').length;
    const stableCount = skills.filter((skill) => skill.health_status === 'Stable').length;
    const criticalCount = skills.filter((skill) => skill.health_status === 'Critical').length;
    const missingHealthCount = skills.filter((skill) => skill.health_status === 'Missing').length;
    const manifestOnlyCount = library?.manifestOnlyCount || 0;
    const sourcePath = library?.sourcePath || '(未知)';
    const avgHealth = Number(healthSummary.avg_health || 0);

    let html = `
      <div class="codex-skill-source">
        <div class="codex-skill-source-title">
          <i data-lucide="folder-tree"></i>
          真实 Skill 库
        </div>
        <div class="codex-skill-source-path">${this._esc(sourcePath)}</div>
        <div class="codex-skill-source-meta">
          <span>Codex：${this._setupPlatformLabel(library?.platforms?.codex || {})}</span>
          <span>Antigravity：${this._setupPlatformLabel(library?.platforms?.antigravity || {})}</span>
          <span>Manifest-only：${manifestOnlyCount}</span>
        </div>
      </div>
      <div class="codex-skill-summary">
        <div class="codex-summary-stat">
          <span class="codex-stat-num">${skills.length}</span>
          <span class="codex-stat-label">真实 Skills</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num">${library?.userCount || 0}</span>
          <span class="codex-stat-label">用户 Skill</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num">${library?.systemCount || 0}</span>
          <span class="codex-stat-label">.system</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num codex-stat-active">${avgHealth.toFixed(1)}</span>
          <span class="codex-stat-label">平均健康</span>
        </div>
        <div class="codex-summary-stat">
          <span class="codex-stat-num" style="color:#ef4444">${missingHealthCount}</span>
          <span class="codex-stat-label">缺健康数据</span>
        </div>
      </div>
      <div class="codex-skill-toolbar">
        <div class="codex-skill-search-wrap">
          <i data-lucide="search"></i>
          <input type="text" class="codex-skill-search" id="codex-skill-search"
            placeholder="搜索真实 skill..." value="${this._esc(this._skillSearch)}">
        </div>
        <div class="codex-skill-filters">
          <button class="codex-filter-btn ${this._skillFilter === 'all' ? 'active' : ''}" data-filter="all">全部</button>
          <button class="codex-filter-btn ${this._skillFilter === 'user' ? 'active' : ''}" data-filter="user">用户</button>
          <button class="codex-filter-btn ${this._skillFilter === 'system' ? 'active' : ''}" data-filter="system">.system</button>
          <button class="codex-filter-btn ${this._skillFilter === 'Missing' ? 'active' : ''}" data-filter="Missing">缺健康</button>
          <button class="codex-filter-btn ${this._skillFilter === 'Critical' ? 'active' : ''}" data-filter="Critical">Critical</button>
          <button class="codex-filter-btn ${this._skillFilter === 'Stable' ? 'active' : ''}" data-filter="Stable">Stable</button>
          <button class="codex-filter-btn ${this._skillFilter === 'Healthy' ? 'active' : ''}" data-filter="Healthy">Healthy</button>
        </div>
      </div>
      <div class="codex-skill-grid" id="codex-skill-grid">
    `;

    const sorted = [...skills].sort((a, b) => {
      const order = { Missing: 0, Critical: 1, Stable: 2, Healthy: 3 };
      const aO = order[a.health_status] ?? 4;
      const bO = order[b.health_status] ?? 4;
      if (aO !== bO) return aO - bO;
      if ((a.dynamic_score ?? 999) !== (b.dynamic_score ?? 999)) {
        return (a.dynamic_score ?? 999) - (b.dynamic_score ?? 999);
      }
      return a.name.localeCompare(b.name);
    });

    for (const skill of sorted) {
      html += this._skillChipHTML(skill);
    }

    html += `</div>`;
    content.innerHTML = html;
    this._initIcons(content);
    this._bindSkillEvents(content);
    this._filterSkills(this._skillFilter);
  },

  _skillChipHTML(skill) {
    const score = typeof skill.dynamic_score === 'number' ? skill.dynamic_score.toFixed(1) : '--';
    const statusClass = skill.health_status === 'Healthy' ? 'chip-healthy'
      : skill.health_status === 'Stable' ? 'chip-stable'
      : skill.health_status === 'Critical' ? 'chip-critical'
      : 'chip-missing';
    const categoryLabel = skill.category === 'system' ? '.system' : 'user';

    return `
      <div class="codex-skill-chip ${statusClass}"
        data-skill-name="${this._esc(skill.name)}"
        data-skill-status="${skill.health_status}"
        data-skill-category="${skill.category}"
        data-skill-health="${skill.health_status === 'Missing' ? '0' : '1'}">
        <div class="codex-skill-chip-top">
          <div class="codex-skill-chip-name">${this._esc(skill.name)}</div>
          <div class="codex-skill-chip-score">${score}</div>
        </div>
        <div class="codex-skill-chip-meta">
          <span class="codex-skill-chip-tag">${categoryLabel}</span>
          <span class="codex-skill-chip-tag">${skill.health_status}</span>
        </div>
        <div class="codex-skill-chip-path">${this._esc(skill.relativePath)}</div>
        ${skill.usage_30d > 0 ? `<div class="codex-skill-chip-usage">${skill.usage_30d} 次 / 30d</div>` : ''}
      </div>
    `;
  },

  _bindSkillEvents(container) {
    const searchInput = container.querySelector('#codex-skill-search');
    let debounce = null;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this._skillSearch = e.target.value;
        this._filterSkills();
      }, 200);
    });

    container.querySelectorAll('.codex-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.codex-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._skillFilter = btn.dataset.filter;
        this._filterSkills(btn.dataset.filter);
      });
    });
  },

  _filterSkills(statusFilter = this._skillFilter || 'all') {
    const grid = document.getElementById('codex-skill-grid');
    if (!grid) return;
    const search = this._skillSearch.toLowerCase();
    const activeFilter = statusFilter || 'all';

    grid.querySelectorAll('.codex-skill-chip').forEach(chip => {
      const name = chip.dataset.skillName.toLowerCase();
      const status = chip.dataset.skillStatus;
      const category = chip.dataset.skillCategory;
      const hasHealth = chip.dataset.skillHealth === '1';
      const matchSearch = !search || name.includes(search);
      const matchFilter = activeFilter === 'all'
        || (activeFilter === 'user' && category === 'user')
        || (activeFilter === 'system' && category === 'system')
        || (activeFilter === 'Missing' && !hasHealth)
        || status === activeFilter;
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

  /**
   * Create a short masked preview for an access token.
   * @param {string} token Raw token value.
   * @returns {string} Masked preview suitable for UI display.
   */
  _maskTokenPreview(token) {
    const safeToken = String(token || '').trim();
    if (!safeToken) return '--';
    if (safeToken.length <= 18) return safeToken;
    return `${safeToken.slice(0, 8)}···${safeToken.slice(-6)}`;
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
      const [setupData, proxyData, localTokenData, installedSkillsData] = await Promise.allSettled([
        API.getCodexSetupStatus(),
        API.getCodexProxyAccounts(),
        API.getCodexLocalToken(),
        API.getCodexInstalledSkills(),
      ]);

      this._setupData = setupData.status === 'fulfilled' ? setupData.value : null;
      this._proxyData = proxyData.status === 'fulfilled' ? proxyData.value : this._proxyData;
      this._localTokenData = localTokenData.status === 'fulfilled' ? localTokenData.value : null;
      this._installedSkillsData = installedSkillsData.status === 'fulfilled' ? installedSkillsData.value : this._installedSkillsData;

      if (!this._setupData) {
        throw new Error('无法读取 setup-status');
      }

      this._renderSetupTab(content, this._setupData);
      this._updateRefreshTime();
    } catch (e) {
      content.innerHTML = `<div class="codex-empty-state"><p>加载配置状态失败: ${this._esc(e.message)}</p></div>`;
    }
  },

  /**
   * Render the setup tab with API, auth, and skills setup cards.
   * @param {HTMLElement} content Container element.
   * @param {object} data Response from GET /api/codex/setup-status.
   */
  _renderSetupTab(content, data) {
    const {
      platform, configPath, codexHome, antigravityHome,
      currentBaseUrl, targetEndpoint, targetApiKey,
      sharedSkillsSourcePath, sharedSkillsExists, sharedSkillsCount,
      platforms,
    } = data;

    const proxyData = this._proxyData || {};
    const localTokenData = this._localTokenData || {};
    const installedSkillsData = this._installedSkillsData || {};
    const isWin = platform === 'win32';

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

    const authFilePath = `${data.codexHome || ''}/auth.json`;
    const localTokenExists = !!localTokenData.token;
    const accountStats = proxyData.stats || {};
    const authStatusClass = localTokenExists
      ? 'setup-badge-ok'
      : (accountStats.configuredCount > 0 ? 'setup-badge-warn' : 'setup-badge-missing');
    const authStatusText = localTokenExists
      ? '本机已授权 ✓'
      : `${accountStats.configuredCount || 0}/${accountStats.totalAccounts || 0} 子账号已接入`;
    const authRows = (proxyData.accounts || []).map((account) => {
      const badgeClass = account.hasToken ? 'setup-badge-ok' : 'setup-badge-missing';
      const badgeText = account.hasToken ? '已授权' : '未授权';
      const subtitle = account.email
        ? this._maskEmail(account.email)
        : `Instance-${account.instanceNum || account.id}`;
      const buttonText = account.hasToken ? '重新授权' : '立即授权';
      return `
        <div class="codex-setup-auth-item">
          <div class="codex-setup-auth-main">
            <div class="codex-setup-auth-name">${this._esc(account.nickname || `Account-${account.instanceNum || account.id}`)}</div>
            <div class="codex-setup-auth-sub">${subtitle}</div>
          </div>
          <div class="codex-setup-auth-side">
            <span class="codex-setup-platform-badge ${badgeClass}">${badgeText}</span>
            <button class="codex-inline-auth-btn codex-auth-btn" data-instance="${account.instanceNum}">
              ${buttonText}
            </button>
          </div>
        </div>
      `;
    }).join('');

    const authCardHtml = `
      <div class="codex-setup-card" id="setup-auth-card">
        <div class="codex-setup-card-head">
          <div class="codex-setup-card-title">
            <i data-lucide="badge-check"></i> 账号授权
          </div>
          <span class="codex-setup-badge ${authStatusClass}">${authStatusText}</span>
        </div>
        <div class="codex-setup-info-grid">
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">本机 Codex</span>
            <div class="codex-setup-platform-cell">
              <span class="codex-setup-platform-badge ${localTokenExists ? 'setup-badge-ok' : 'setup-badge-missing'}">
                ${localTokenExists ? '已检测 access_token' : '未检测到 token'}
              </span>
              <code class="codex-setup-info-val codex-setup-path">${this._esc(authFilePath)}</code>
              <code class="codex-setup-info-val ${localTokenExists ? '' : 'codex-setup-empty'}">${this._esc(localTokenExists ? this._maskTokenPreview(localTokenData.token) : (localTokenData.error || 'auth.json 不可用'))}</code>
            </div>
          </div>
        </div>
        <div class="codex-setup-auth-list">
          ${authRows || '<div class="codex-setup-empty-inline">未发现可授权的子账号</div>'}
        </div>
        <div class="codex-setup-note">点击“立即授权”会直接生成一次性 device code；无需单独启动 Dashboard，完成授权后此页会自动刷新。</div>
      </div>`;

    const codexLink = platforms?.codex || {};
    const antigravityLink = platforms?.antigravity || {};
    const linkMethodLabel = isWin ? 'mklink /J (目录联接)' : 'symlink (软链接)';
    const unixInstallCommand = this._buildLocalInstallCommand('unix');
    const windowsInstallCommand = this._buildLocalInstallCommand('windows');
    const fullyLinked = [codexLink, antigravityLink].every((item) => item?.status === 'symlink');
    const partiallyLinked = [codexLink, antigravityLink].some((item) => item?.status && item.status !== 'missing');
    const skillsStatusClass = fullyLinked ? 'setup-badge-ok'
      : partiallyLinked || sharedSkillsExists ? 'setup-badge-warn'
      : 'setup-badge-missing';
    const skillsStatusText = fullyLinked
      ? `双端已接入 (${sharedSkillsCount} skills) ✓`
      : partiallyLinked
        ? '部分已接入'
        : sharedSkillsExists
          ? '待接入'
          : '将自动创建';
    const skillPreview = Array.isArray(installedSkillsData.skills)
      ? installedSkillsData.skills.slice(0, 10).map((skill) => skill.name).join(' · ')
      : '';

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
            <span class="codex-setup-info-label">共享源目录</span>
            <code class="codex-setup-info-val ${sharedSkillsExists ? 'codex-setup-target' : 'codex-setup-empty'}">${this._esc(sharedSkillsSourcePath || '(无法确定)')}</code>
          </div>
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">共享状态</span>
            <code class="codex-setup-info-val">${sharedSkillsExists ? `已存在 · ${sharedSkillsCount} skills` : '不存在，安装时自动创建'}</code>
          </div>
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">真实 Skill</span>
            <code class="codex-setup-info-val">${installedSkillsData.count || 0} 个 · user ${installedSkillsData.userCount || 0} · .system ${installedSkillsData.systemCount || 0}</code>
          </div>
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">Codex</span>
            <div class="codex-setup-platform-cell">
              <span class="codex-setup-platform-badge ${this._setupPlatformBadgeClass(codexLink.status)}">${this._setupPlatformLabel(codexLink)}</span>
              <code class="codex-setup-info-val codex-setup-path">${this._esc(codexLink.linkPath || codexHome || '--')}</code>
            </div>
          </div>
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">Antigravity</span>
            <div class="codex-setup-platform-cell">
              <span class="codex-setup-platform-badge ${this._setupPlatformBadgeClass(antigravityLink.status)}">${this._setupPlatformLabel(antigravityLink)}</span>
              <code class="codex-setup-info-val codex-setup-path">${this._esc(antigravityLink.linkPath || antigravityHome || '--')}</code>
            </div>
          </div>
          <div class="codex-setup-info-row">
            <span class="codex-setup-info-label">方式</span>
            <code class="codex-setup-info-val">${linkMethodLabel}</code>
          </div>
        </div>
        <button class="codex-setup-apply-btn codex-setup-apply-skills" id="setup-apply-skills"
          ${!sharedSkillsSourcePath ? 'disabled title="无法确定 skills 目录"' : ''}>
          <i data-lucide="link"></i>
          ${fullyLinked ? '同步当前后端机器的 Codex + Antigravity' : '接入当前后端机器的 Codex + Antigravity'}
        </button>
        <div class="codex-setup-command-grid">
          <button class="codex-setup-ghost-btn" id="setup-copy-local-unix">
            <i data-lucide="terminal-square"></i> 复制 Mac/Linux 本机安装命令
          </button>
          <button class="codex-setup-ghost-btn" id="setup-copy-local-win">
            <i data-lucide="monitor-smartphone"></i> 复制 Windows 本机安装命令
          </button>
        </div>
        <div class="codex-setup-command-box">
          <div class="codex-setup-command-title">Mac / Linux</div>
          <code class="codex-setup-command-code">${this._esc(unixInstallCommand)}</code>
        </div>
        <div class="codex-setup-command-box">
          <div class="codex-setup-command-title">Windows PowerShell</div>
          <code class="codex-setup-command-code">${this._esc(windowsInstallCommand)}</code>
        </div>
        ${skillPreview ? `<div class="codex-setup-note">当前真实 Skill 样本：${this._esc(skillPreview)}${installedSkillsData.count > 10 ? ' …' : ''}</div>` : ''}
        <div class="codex-setup-note">上面的蓝色按钮只会操作当前后端所在机器；若要真实导入到最终用户电脑，请复制对应系统命令到用户本机终端执行。</div>
      </div>`;

    content.innerHTML = `<div class="codex-setup-container">${apiCardHtml}${authCardHtml}${skillsCardHtml}</div>`;
    this._initIcons(content);
    this._bindAuthButtons(content);

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

    content.querySelector('#setup-apply-skills')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2"></i> 安装中...';
      this._initIcons(btn);
      try {
        const result = await API.postCodexApplySkills({
          sourcePath: sharedSkillsSourcePath,
          createIfMissing: true,
          platforms: ['codex', 'antigravity'],
        });
        const createdText = result.sourceCreated ? '，已自动创建目录' : '';
        this._toast(`✅ Skills 已同步到 Codex + Antigravity（${result.skillsCount} 个）${createdText}`, 'success');
        await this._loadSetup();
      } catch (err) {
        this._toast(`❌ 安装失败: ${err.message}`, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="link"></i> 重试';
        this._initIcons(btn);
      }
    });

    content.querySelector('#setup-copy-local-unix')?.addEventListener('click', async () => {
      const copied = await this._copyText(unixInstallCommand);
      this._toast(copied ? '✅ 已复制 Mac/Linux 本机安装命令' : '❌ 复制失败，请手动复制', copied ? 'success' : 'error');
    });

    content.querySelector('#setup-copy-local-win')?.addEventListener('click', async () => {
      const copied = await this._copyText(windowsInstallCommand);
      this._toast(copied ? '✅ 已复制 Windows 本机安装命令' : '❌ 复制失败，请手动复制', copied ? 'success' : 'error');
    });
  },

  _toast(msg, type = 'info') {
    if (typeof App !== 'undefined' && App.showToast) App.showToast(msg, type);
  },

  /**
   * Copy a plain-text command to the clipboard.
   * @param {string} value Text to copy.
   * @returns {Promise<boolean>} Whether the copy operation succeeded.
   */
  async _copyText(value) {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      return true;
    } catch (_) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = String(value || '');
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
      } catch (_) {
        return false;
      }
    }
  },

  /**
   * Build the local install command for one target platform.
   * @param {'unix'|'windows'} platform Target platform family.
   * @returns {string} Copy-ready local install command.
   */
  _buildLocalInstallCommand(platform = 'unix') {
    const scriptUrl = API.getAbsoluteURL(`/codex/install-script${platform === 'windows' ? '?platform=windows' : ''}`);
    if (platform === 'windows') {
      return `powershell -ExecutionPolicy Bypass -Command "irm '${scriptUrl}' | iex"`;
    }
    return `curl -fsSL "${scriptUrl}" | bash`;
  },

  /**
   * Return the UI badge class for a setup platform state.
   * @param {string} status Link status returned by the backend.
   * @returns {string} CSS class name for the status badge.
   */
  _setupPlatformBadgeClass(status) {
    if (status === 'symlink') return 'setup-badge-ok';
    if (status === 'directory') return 'setup-badge-warn';
    return 'setup-badge-missing';
  },

  /**
   * Format a compact platform setup label.
   * @param {{ status?: string, skillsCount?: number }} platformState Backend platform state.
   * @returns {string} Human-readable platform summary.
   */
  _setupPlatformLabel(platformState = {}) {
    if (platformState.status === 'symlink') return `已链接 · ${platformState.skillsCount || 0}`;
    if (platformState.status === 'directory') return `目录 · ${platformState.skillsCount || 0}`;
    return '未接入';
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
