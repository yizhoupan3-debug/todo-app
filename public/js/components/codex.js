/* ────────────────────────────────────
   CodexView — Codex Quota Card View v2
   Optimized: auto-refresh, live countdown,
   sorting, per-card refresh, credits display
   ──────────────────────────────────── */

const CodexView = {
  _accounts: [],
  _expandedId: null,
  _detailCache: {},
  _formOverlay: null,
  _autoRefreshTimer: null,
  _countdownTimer: null,
  _visible: false,

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
      this._initIcons(container);
    }

    this.loadList();
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
      if (this._visible) this.loadList(false);
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
    }, 30000); // update every 30s
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
            <i data-lucide="key-round"></i> Codex 账号
          </div>
          <div class="codex-view-actions">
            <span class="codex-last-refresh" id="codex-last-refresh"></span>
            <button class="codex-icon-btn" id="codex-refresh-btn" title="刷新额度">
              <i data-lucide="refresh-cw"></i>
            </button>
            <button class="codex-icon-btn" id="codex-add-btn" title="添加账号">
              <i data-lucide="plus"></i>
            </button>
          </div>
        </div>
        <div class="codex-grid" id="codex-grid">
          ${this._shimmerCards(3)}
        </div>
      </div>
    `;
  },

  _bindHeaderEvents(container) {
    container.querySelector('#codex-refresh-btn')
      ?.addEventListener('click', () => this.loadList(true));
    container.querySelector('#codex-add-btn')
      ?.addEventListener('click', () => this.openForm());
  },

  // ── Load account list ──
  async loadList(forceRefresh = false) {
    const grid = document.getElementById('codex-grid');
    if (!grid) return;

    const refreshBtn = document.getElementById('codex-refresh-btn');
    if (refreshBtn) refreshBtn.classList.add('spinning');

    if (!forceRefresh && !this._accounts.length) {
      grid.innerHTML = this._shimmerCards(3);
    }

    try {
      const url = forceRefresh ? '/codex?refresh=1' : '/codex';
      this._accounts = await API.request(url);
      this._sortAccounts();
      this._renderCards();
      this._updateRefreshTime();
    } catch (e) {
      grid.innerHTML = `<div class="codex-empty-state"><p>加载失败，请重试</p></div>`;
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
  },

  /** Refresh a single account's quota. */
  async refreshSingle(id) {
    const card = document.querySelector(`.codex-quota-card[data-id="${id}"]`);
    const refreshIcon = card?.querySelector('.codex-card-refresh');
    if (refreshIcon) refreshIcon.classList.add('spinning');

    try {
      const result = await API.request(`/codex/${id}/refresh`);
      // Update in-memory
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

  /** Sort accounts: quota-having first, then by most used. */
  _sortAccounts() {
    this._accounts.sort((a, b) => {
      // Has token > no token
      if (a.has_token !== b.has_token) return b.has_token ? 1 : -1;
      // Has quota > no quota
      const aQ = a.quota && !a.quota.error;
      const bQ = b.quota && !b.quota.error;
      if (aQ !== bQ) return bQ ? 1 : -1;
      // Most used first (for easy identification of near-limit accounts)
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

  // ── Render card grid ──
  _renderCards() {
    const grid = document.getElementById('codex-grid');
    if (!grid) return;

    if (!this._accounts.length) {
      grid.innerHTML = `
        <div class="codex-empty-state">
          <div class="codex-empty-icon">🔑</div>
          <p>还没有 Codex 账号</p>
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

    // Bind card clicks
    grid.querySelectorAll('.codex-quota-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.codex-detail-actions') ||
            e.target.closest('.codex-mini-btn') ||
            e.target.closest('.codex-card-refresh')) return;
        this._toggleDetail(card.dataset.id);
      });
    });

    // Bind per-card refresh buttons
    grid.querySelectorAll('.codex-card-refresh').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.refreshSingle(btn.dataset.id);
      });
    });

    this._initIcons(grid);

    // Re-expand previously expanded card
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
    const has7d = q.secondary_used != null;
    const has5h = q.primary_used != null && has7d;
    const used7d = has7d ? q.secondary_used : (q.primary_used ?? 0);
    const remaining7d = Math.max(0, 100 - used7d).toFixed(0);
    const status7d = this._statusClass(used7d);

    let html = `<div class="codex-quota-section">`;

    // 7d bar
    html += `
      <div class="codex-quota-row">
        <span class="codex-quota-label">7d</span>
        <div class="codex-quota-track large">
          <div class="codex-quota-fill codex-fill-${status7d}" style="width:${used7d}%"></div>
        </div>
        <span class="codex-quota-pct codex-pct-${status7d}">${remaining7d}%</span>
      </div>
    `;

    // 5h bar  
    if (has5h) {
      const remaining5h = Math.max(0, 100 - q.primary_used).toFixed(0);
      const status5h = this._statusClass(q.primary_used);
      html += `
        <div class="codex-quota-row">
          <span class="codex-quota-label">5h</span>
          <div class="codex-quota-track">
            <div class="codex-quota-fill codex-fill-${status5h}" style="width:${q.primary_used}%"></div>
          </div>
          <span class="codex-quota-pct codex-pct-${status5h}">${remaining5h}%</span>
        </div>
      `;
    }

    // Credits balance
    if (q.credits_balance != null && q.credits_balance > 0) {
      html += `
        <div class="codex-credits-row">
          <i data-lucide="wallet"></i>
          <span>余额: $${q.credits_balance.toFixed(2)}</span>
        </div>
      `;
    }

    // Reset countdown (live-updating)
    const resetUnix = has7d ? q.secondary_reset : q.primary_reset;
    const resetText = this._formatReset(resetUnix);
    if (resetText) {
      html += `<div class="codex-reset-text codex-countdown" data-reset="${resetUnix || ''}">${resetText}</div>`;
    }

    html += `</div>`;
    return html;
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
    // Eye toggle
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

    // Copy buttons
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

    // Edit
    slot.querySelector('[data-edit]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openForm(acc.id);
    });

    // Delete
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

    // Close on backdrop or Escape
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeForm();
    });
    const escHandler = (e) => {
      if (e.key === 'Escape') { this._closeForm(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    // Read local token
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

    // Save
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
        this.loadList(true); // force refresh to fetch new quota
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

    // Auto-focus first empty required field
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

  /** Mask email for card display (show first 3 chars + domain). */
  _maskEmail(str) {
    if (!str) return '';
    const safe = this._esc(str);
    if (!str.includes('@')) return safe;
    const [local, domain] = str.split('@');
    const masked = local.substring(0, 3) + '***';
    return this._esc(masked + '@' + domain);
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

// Backward compat — old mobile panel references CodexManager
const CodexManager = {
  open() {
    if (typeof App !== 'undefined') App.switchView('codex');
  },
};
