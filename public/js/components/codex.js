/* ────────────────────────────────────
   CodexManager — Codex 多账号管理 v2
   ──────────────────────────────────── */
const CodexManager = {
  _overlay: null,
  _accounts: [],

  // ── Open modal ──
  open() {
    if (this._overlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'codex-overlay';
    overlay.innerHTML = `
      <div class="codex-modal">
        <div class="codex-header">
          <h3>Codex 账号</h3>
          <div class="codex-header-actions">
            <button class="codex-btn-refresh" title="刷新额度">
              <i data-lucide="refresh-cw"></i>
            </button>
            <button class="codex-btn-add" title="添加账号">
              <i data-lucide="plus"></i>
            </button>
            <button class="codex-btn-close" title="关闭">
              <i data-lucide="x"></i>
            </button>
          </div>
        </div>
        <div class="codex-body" id="codex-body">
          <div class="codex-loading">
            <div class="codex-shimmer"></div>
            <div class="codex-shimmer"></div>
            <div class="codex-shimmer"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._overlay = overlay;

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      this._initIcons(overlay);
    });

    // Events
    overlay.querySelector('.codex-btn-close').addEventListener('click', () => this.close());
    overlay.querySelector('.codex-btn-add').addEventListener('click', () => this.showForm());
    overlay.querySelector('.codex-btn-refresh').addEventListener('click', () => this.loadList(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });

    this.loadList();
  },

  close() {
    if (!this._overlay) return;
    this._overlay.classList.remove('active');
    setTimeout(() => {
      this._overlay?.remove();
      this._overlay = null;
    }, 250);
  },

  // ── Load + render list ──
  async loadList(forceRefresh = false) {
    const body = document.getElementById('codex-body');
    if (!body) return;

    // Spin refresh icon
    const refreshBtn = this._overlay?.querySelector('.codex-btn-refresh');
    if (refreshBtn) refreshBtn.classList.add('codex-spinning');

    if (!forceRefresh) {
      body.innerHTML = `
        <div class="codex-loading">
          <div class="codex-shimmer"></div>
          <div class="codex-shimmer"></div>
        </div>
      `;
    }

    try {
      const url = forceRefresh ? '/codex?refresh=1' : '/codex';
      this._accounts = await API.request(url);
      this.renderList();
    } catch (e) {
      body.innerHTML = `<div class="codex-empty">加载失败，请重试</div>`;
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('codex-spinning');
    }
  },

  renderList() {
    const body = document.getElementById('codex-body');
    if (!body) return;

    if (!this._accounts.length) {
      body.innerHTML = `
        <div class="codex-empty">
          <div class="codex-empty-icon">🔑</div>
          <p>还没有 Codex 账号</p>
          <button class="codex-empty-btn" onclick="CodexManager.showForm()">添加第一个账号</button>
        </div>
      `;
      return;
    }

    body.innerHTML = this._accounts.map(acc => {
      const q = acc.quota;
      let quotaHtml = '';

      if (!acc.has_token) {
        quotaHtml = '<div class="codex-quota-badge codex-badge-notoken">🔒 未认证</div>';
      } else if (!q || q.error) {
        const errMap = {
          expired: '⚠️ Token 已过期',
          timeout: '⏱ 请求超时',
          network_error: '🌐 网络错误',
          fetch_failed: '❌ 获取失败',
        };
        const errMsg = errMap[q?.error] || '❌ 获取失败';
        quotaHtml = `<div class="codex-quota-badge codex-badge-error">${errMsg}</div>`;
      } else {
        // Determine 7-day and 5-hour quotas
        const has7d = q.secondary_used != null;
        const has5h = q.primary_used != null && has7d; // primary is 5h only when secondary exists
        const used7d = has7d ? q.secondary_used : (q.primary_used ?? 0);
        const remaining7d = Math.max(0, 100 - used7d);
        const status7d = this._statusClass(used7d);
        const planLabel = (q.plan_type || 'unknown').toUpperCase();
        const resetInfo = this._formatReset(has7d ? q.secondary_reset : q.primary_reset);

        quotaHtml = `
          <div class="codex-quota-info">
            <div class="codex-quota-top">
              <span class="codex-plan-badge">${planLabel}</span>
              <span class="codex-quota-pct">${remaining7d.toFixed(0)}% 剩余</span>
            </div>
            <div class="codex-progress-track">
              <div class="codex-progress-bar codex-progress-${status7d}" style="width:${used7d}%"></div>
            </div>
            ${has5h ? `
              <div class="codex-sub-quota">
                <span class="codex-sub-label">5h</span>
                <div class="codex-sub-track">
                  <div class="codex-progress-bar codex-progress-${this._statusClass(q.primary_used)}" style="width:${q.primary_used}%"></div>
                </div>
                <span class="codex-sub-pct">${Math.max(0, 100 - q.primary_used).toFixed(0)}%</span>
              </div>
            ` : ''}
            ${resetInfo ? `<div class="codex-reset-info">${resetInfo}</div>` : ''}
          </div>
        `;
      }

      return `
        <div class="codex-card" data-id="${acc.id}">
          <div class="codex-card-main">
            <div class="codex-card-name">${this._esc(acc.name)}</div>
            <div class="codex-card-account">${this._esc(acc.account)}</div>
            ${quotaHtml}
          </div>
          <div class="codex-card-arrow"><i data-lucide="chevron-right"></i></div>
        </div>
      `;
    }).join('');

    body.querySelectorAll('.codex-card').forEach(card => {
      card.addEventListener('click', () => this.showDetail(card.dataset.id));
    });

    this._initIcons(body);
  },

  // ── Detail view ──
  async showDetail(id) {
    const body = document.getElementById('codex-body');
    if (!body) return;

    body.innerHTML = `<div class="codex-loading"><div class="codex-shimmer"></div></div>`;

    try {
      const acc = await API.getCodexAccount(id);
      // Find quota from cached list
      const listItem = this._accounts.find(a => a.id == id);
      const q = listItem?.quota;

      let quotaSection = '';
      if (listItem?.has_token && q && !q.error) {
        const has7d = q.secondary_used != null;
        const has5h = q.primary_used != null && has7d;
        const used7d = has7d ? q.secondary_used : (q.primary_used ?? 0);
        const remaining7d = Math.max(0, 100 - used7d);
        const planLabel = (q.plan_type || 'unknown').toUpperCase();
        const resetInfo = this._formatReset(has7d ? q.secondary_reset : q.primary_reset);

        quotaSection = `
          <div class="codex-detail-quota">
            <div class="codex-quota-top">
              <span class="codex-plan-badge">${planLabel}</span>
              <span class="codex-quota-pct">${remaining7d.toFixed(0)}% 剩余 (7天)</span>
            </div>
            <div class="codex-progress-track codex-progress-lg">
              <div class="codex-progress-bar codex-progress-${this._statusClass(used7d)}" style="width:${used7d}%"></div>
            </div>
            ${has5h ? `
              <div class="codex-sub-quota">
                <span class="codex-sub-label">5h 窗口</span>
                <div class="codex-sub-track">
                  <div class="codex-progress-bar codex-progress-${this._statusClass(q.primary_used)}" style="width:${q.primary_used}%"></div>
                </div>
                <span class="codex-sub-pct">${Math.max(0, 100 - q.primary_used).toFixed(0)}%</span>
              </div>
            ` : ''}
            ${resetInfo ? `<div class="codex-reset-info">${resetInfo}</div>` : ''}
          </div>
        `;
      } else if (listItem?.has_token && q?.error) {
        const errMap = { expired: '⚠️ Token 已过期', timeout: '⏱ 请求超时', network_error: '🌐 网络错误', fetch_failed: '❌ 获取失败' };
        quotaSection = `<div class="codex-detail-quota"><div class="codex-quota-badge codex-badge-error">${errMap[q.error] || '❌ 获取失败'}</div></div>`;
      }

      body.innerHTML = `
        <div class="codex-detail">
          <button class="codex-back" onclick="CodexManager.loadList()">
            <i data-lucide="arrow-left"></i> 返回
          </button>

          <div class="codex-detail-title">${this._esc(acc.name)}</div>
          ${quotaSection}

          ${this._fieldRow('账号', acc.account, false)}
          ${this._fieldRow('密码', acc.password, true)}
          ${acc.email ? this._fieldRow('邮箱', acc.email, false) : ''}
          ${acc.email_password ? this._fieldRow('邮箱密码', acc.email_password, true) : ''}

          <div class="codex-field-group">
            <label>Access Token</label>
            <div class="codex-field-value">
              <span class="codex-token-preview">${acc.access_token ? (acc.access_token.substring(0, 20) + '...') : '未设置'}</span>
            </div>
          </div>

          <div class="codex-detail-actions">
            <button class="codex-action-btn codex-edit-btn" onclick="CodexManager.showForm(${acc.id})">
              <i data-lucide="pencil"></i> 编辑
            </button>
            <button class="codex-action-btn codex-delete-btn" onclick="CodexManager.deleteAccount(${acc.id})">
              <i data-lucide="trash-2"></i> 删除
            </button>
          </div>
        </div>
      `;

      this._bindDetailEvents(body);
      this._initIcons(body);
    } catch (e) {
      body.innerHTML = `<div class="codex-empty">加载失败</div>`;
    }
  },

  // Generate a field row (safe against XSS in attributes)
  _fieldRow(label, value, masked) {
    const safe = this._esc(value);
    if (masked) {
      return `
        <div class="codex-field-group">
          <label>${label}</label>
          <div class="codex-field-value">
            <span class="codex-masked" data-secret>••••••••</span>
            <button class="codex-eye-btn" title="显示"><i data-lucide="eye"></i></button>
            <button class="codex-copy-btn" data-masked-copy title="复制"><i data-lucide="copy"></i></button>
          </div>
          <input type="hidden" class="codex-secret-store" value="${safe}">
        </div>
      `;
    }
    return `
      <div class="codex-field-group">
        <label>${label}</label>
        <div class="codex-field-value">
          <span>${safe}</span>
          <button class="codex-copy-btn" data-masked-copy title="复制"><i data-lucide="copy"></i></button>
        </div>
        <input type="hidden" class="codex-secret-store" value="${safe}">
      </div>
    `;
  },

  _bindDetailEvents(body) {
    // Eye toggle — read secret from hidden input (XSS safe)
    body.querySelectorAll('.codex-eye-btn').forEach(btn => {
      let hideTimer = null;
      btn.addEventListener('click', () => {
        const group = btn.closest('.codex-field-group');
        const span = group?.querySelector('.codex-masked');
        const store = group?.querySelector('.codex-secret-store');
        if (!span || !store) return;

        clearTimeout(hideTimer);
        if (span.textContent === '••••••••') {
          span.textContent = store.value;
          btn.querySelector('i')?.setAttribute('data-lucide', 'eye-off');
          hideTimer = setTimeout(() => {
            span.textContent = '••••••••';
            btn.querySelector('i')?.setAttribute('data-lucide', 'eye');
            this._initIcons(btn);
          }, 3000);
        } else {
          span.textContent = '••••••••';
          btn.querySelector('i')?.setAttribute('data-lucide', 'eye');
        }
        this._initIcons(btn);
      });
    });

    // Copy buttons — read from hidden input (XSS safe)
    body.querySelectorAll('.codex-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = btn.closest('.codex-field-group');
        const store = group?.querySelector('.codex-secret-store');
        if (!store) return;

        navigator.clipboard.writeText(store.value).then(() => {
          // Flash checkmark
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
  },

  // ── Form (add/edit) ──
  async showForm(editId) {
    const body = document.getElementById('codex-body');
    if (!body) return;

    let existing = null;
    if (editId) {
      try { existing = await API.getCodexAccount(editId); } catch (_) {}
    }

    body.innerHTML = `
      <div class="codex-form">
        <button class="codex-back" onclick="CodexManager.loadList()">
          <i data-lucide="arrow-left"></i> 返回
        </button>
        <h4>${existing ? '编辑账号' : '添加账号'}</h4>

        <div class="codex-form-field">
          <label>名称 *</label>
          <input type="text" id="codex-f-name" value="${this._esc(existing?.name || '')}" placeholder="如: 主力号" autocomplete="off">
        </div>
        <div class="codex-form-field">
          <label>账号 *</label>
          <input type="text" id="codex-f-account" value="${this._esc(existing?.account || '')}" placeholder="登录邮箱/用户名" autocomplete="off">
        </div>
        <div class="codex-form-field">
          <label>密码 *</label>
          <input type="password" id="codex-f-password" value="${this._esc(existing?.password || '')}" placeholder="账号密码" autocomplete="off">
        </div>
        <div class="codex-form-field">
          <label>邮箱</label>
          <input type="text" id="codex-f-email" value="${this._esc(existing?.email || '')}" placeholder="可选" autocomplete="off">
        </div>
        <div class="codex-form-field">
          <label>邮箱密码</label>
          <input type="password" id="codex-f-email-pw" value="${this._esc(existing?.email_password || '')}" placeholder="可选" autocomplete="off">
        </div>

        <div class="codex-form-field codex-token-field">
          <label>Access Token</label>
          <textarea id="codex-f-token" rows="2" placeholder="用于动态获取额度（可选）">${this._esc(existing?.access_token || '')}</textarea>
          <div class="codex-token-actions">
            <button class="codex-token-btn" id="codex-read-local">
              🔑 从本地读取
            </button>
            <a class="codex-token-btn codex-token-link" href="https://chatgpt.com" target="_blank" rel="noopener">
              🌐 前往登录
            </a>
          </div>
        </div>

        <div class="codex-form-actions">
          <button class="codex-save-btn" id="codex-save-btn">
            ${existing ? '保存修改' : '添加'}
          </button>
        </div>
      </div>
    `;

    // Read local token
    body.querySelector('#codex-read-local').addEventListener('click', async () => {
      const btn = body.querySelector('#codex-read-local');
      btn.textContent = '读取中...';
      btn.disabled = true;
      try {
        const result = await API.getCodexLocalToken();
        if (result.token) {
          body.querySelector('#codex-f-token').value = result.token;
          this._toast('Token 已读取');
        } else {
          this._toast(result.error || '未找到 Token', 'error');
        }
      } catch (e) {
        this._toast('读取失败', 'error');
      } finally {
        btn.textContent = '🔑 从本地读取';
        btn.disabled = false;
      }
    });

    // Save handler
    const doSave = async () => {
      const data = {
        name: body.querySelector('#codex-f-name').value.trim(),
        account: body.querySelector('#codex-f-account').value.trim(),
        password: body.querySelector('#codex-f-password').value,
        email: body.querySelector('#codex-f-email').value.trim(),
        email_password: body.querySelector('#codex-f-email-pw').value,
        access_token: body.querySelector('#codex-f-token').value.trim(),
      };

      if (!data.name || !data.account || !data.password) {
        this._toast('名称、账号、密码为必填', 'error');
        return;
      }

      const btn = body.querySelector('#codex-save-btn');
      btn.disabled = true;
      btn.textContent = '保存中...';

      try {
        if (existing) {
          await API.updateCodexAccount(editId, data);
        } else {
          await API.createCodexAccount(data);
        }
        this._toast(existing ? '已更新' : '已添加');
        this.loadList();
      } catch (e) {
        this._toast('保存失败: ' + (e.message || ''), 'error');
        btn.disabled = false;
        btn.textContent = existing ? '保存修改' : '添加';
      }
    };

    body.querySelector('#codex-save-btn').addEventListener('click', doSave);

    // Enter key to submit (except in textarea)
    body.querySelectorAll('#codex-f-name, #codex-f-account, #codex-f-password, #codex-f-email, #codex-f-email-pw').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); doSave(); }
      });
    });

    this._initIcons(body);
  },

  // ── Delete ──
  async deleteAccount(id) {
    if (!confirm('确定删除此账号？')) return;
    try {
      await API.deleteCodexAccount(id);
      this._toast('已删除');
      this.loadList();
    } catch (e) {
      this._toast('删除失败', 'error');
    }
  },

  // ── Helpers ──
  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
    const now = new Date();
    const diffMs = reset - now;
    if (diffMs <= 0) return '已重置';
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    if (days > 0) return `${days}天${remainHours}小时后重置`;
    if (hours > 0) return `${hours}小时后重置`;
    const mins = Math.ceil(diffMs / 60000);
    return `${mins}分钟后重置`;
  },
};
