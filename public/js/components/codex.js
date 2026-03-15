/* ────────────────────────────────────
   CodexManager — Codex 多账号管理
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
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [overlay] });
    });

    // Events
    overlay.querySelector('.codex-btn-close').addEventListener('click', () => this.close());
    overlay.querySelector('.codex-btn-add').addEventListener('click', () => this.showForm());
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
  async loadList() {
    const body = document.getElementById('codex-body');
    if (!body) return;

    body.innerHTML = `
      <div class="codex-loading">
        <div class="codex-shimmer"></div>
        <div class="codex-shimmer"></div>
      </div>
    `;

    try {
      this._accounts = await API.getCodexAccounts();
      this.renderList();
    } catch (e) {
      body.innerHTML = `<div class="codex-empty">加载失败，请重试</div>`;
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
        const used7d = q.secondary_used ?? q.primary_used ?? 0;
        const remaining = Math.max(0, 100 - used7d);
        const statusClass = used7d >= 95 ? 'critical' : used7d >= 80 ? 'danger' : used7d >= 50 ? 'warning' : 'healthy';
        const planLabel = (q.plan_type || 'unknown').toUpperCase();
        const resetInfo = this._formatReset(q.secondary_reset || q.primary_reset);

        quotaHtml = `
          <div class="codex-quota-info">
            <div class="codex-quota-top">
              <span class="codex-plan-badge">${planLabel}</span>
              <span class="codex-quota-pct">${remaining.toFixed(0)}% 剩余</span>
            </div>
            <div class="codex-progress-track">
              <div class="codex-progress-bar codex-progress-${statusClass}" style="width:${used7d}%"></div>
            </div>
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

    // Card click → detail
    body.querySelectorAll('.codex-card').forEach(card => {
      card.addEventListener('click', () => this.showDetail(card.dataset.id));
    });

    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [body] });
  },

  // ── Detail view ──
  async showDetail(id) {
    const body = document.getElementById('codex-body');
    if (!body) return;

    body.innerHTML = `<div class="codex-loading"><div class="codex-shimmer"></div></div>`;

    try {
      const acc = await API.getCodexAccount(id);
      body.innerHTML = `
        <div class="codex-detail">
          <button class="codex-back" onclick="CodexManager.loadList()">
            <i data-lucide="arrow-left"></i> 返回
          </button>

          <div class="codex-detail-title">${this._esc(acc.name)}</div>

          <div class="codex-field-group">
            <label>账号</label>
            <div class="codex-field-value">
              <span>${this._esc(acc.account)}</span>
              <button class="codex-copy-btn" data-copy="${this._esc(acc.account)}" title="复制">
                <i data-lucide="copy"></i>
              </button>
            </div>
          </div>

          <div class="codex-field-group">
            <label>密码</label>
            <div class="codex-field-value">
              <span class="codex-masked" data-secret="${this._esc(acc.password)}">••••••••</span>
              <button class="codex-eye-btn" title="显示">
                <i data-lucide="eye"></i>
              </button>
              <button class="codex-copy-btn" data-copy="${this._esc(acc.password)}" title="复制">
                <i data-lucide="copy"></i>
              </button>
            </div>
          </div>

          ${acc.email ? `
          <div class="codex-field-group">
            <label>邮箱</label>
            <div class="codex-field-value">
              <span>${this._esc(acc.email)}</span>
              <button class="codex-copy-btn" data-copy="${this._esc(acc.email)}" title="复制">
                <i data-lucide="copy"></i>
              </button>
            </div>
          </div>` : ''}

          ${acc.email_password ? `
          <div class="codex-field-group">
            <label>邮箱密码</label>
            <div class="codex-field-value">
              <span class="codex-masked" data-secret="${this._esc(acc.email_password)}">••••••••</span>
              <button class="codex-eye-btn" title="显示">
                <i data-lucide="eye"></i>
              </button>
              <button class="codex-copy-btn" data-copy="${this._esc(acc.email_password)}" title="复制">
                <i data-lucide="copy"></i>
              </button>
            </div>
          </div>` : ''}

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

      // Eye toggle
      body.querySelectorAll('.codex-eye-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const span = btn.closest('.codex-field-value').querySelector('.codex-masked');
          if (!span) return;
          const secret = span.dataset.secret;
          if (span.textContent === '••••••••') {
            span.textContent = secret;
            btn.querySelector('i')?.setAttribute('data-lucide', 'eye-off');
            // Auto-hide after 3s
            setTimeout(() => {
              span.textContent = '••••••••';
              btn.querySelector('i')?.setAttribute('data-lucide', 'eye');
              if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
            }, 3000);
          } else {
            span.textContent = '••••••••';
            btn.querySelector('i')?.setAttribute('data-lucide', 'eye');
          }
          if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
        });
      });

      // Copy buttons
      body.querySelectorAll('.codex-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const text = btn.dataset.copy;
          navigator.clipboard.writeText(text).then(() => {
            if (typeof App !== 'undefined' && App.showToast) App.showToast('已复制', 'info');
          }).catch(() => {});
        });
      });

      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [body] });
    } catch (e) {
      body.innerHTML = `<div class="codex-empty">加载失败</div>`;
    }
  },

  // ── Form (add/edit) ──
  async showForm(editId) {
    const body = document.getElementById('codex-body');
    if (!body) return;

    let existing = null;
    if (editId) {
      try {
        existing = await API.getCodexAccount(editId);
      } catch (_) {}
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
          if (typeof App !== 'undefined' && App.showToast) App.showToast('Token 已读取', 'info');
        } else {
          if (typeof App !== 'undefined' && App.showToast) App.showToast(result.error || '未找到 Token', 'error');
        }
      } catch (e) {
        if (typeof App !== 'undefined' && App.showToast) App.showToast('读取失败', 'error');
      } finally {
        btn.textContent = '🔑 从本地读取';
        btn.disabled = false;
      }
    });

    // Save
    body.querySelector('#codex-save-btn').addEventListener('click', async () => {
      const data = {
        name: body.querySelector('#codex-f-name').value.trim(),
        account: body.querySelector('#codex-f-account').value.trim(),
        password: body.querySelector('#codex-f-password').value,
        email: body.querySelector('#codex-f-email').value.trim(),
        email_password: body.querySelector('#codex-f-email-pw').value,
        access_token: body.querySelector('#codex-f-token').value.trim(),
      };

      if (!data.name || !data.account || !data.password) {
        if (typeof App !== 'undefined' && App.showToast) App.showToast('名称、账号、密码为必填', 'error');
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
        if (typeof App !== 'undefined' && App.showToast) App.showToast(existing ? '已更新' : '已添加', 'info');
        this.loadList();
      } catch (e) {
        if (typeof App !== 'undefined' && App.showToast) App.showToast('保存失败: ' + (e.message || ''), 'error');
        btn.disabled = false;
        btn.textContent = existing ? '保存修改' : '添加';
      }
    });

    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [body] });
  },

  // ── Delete ──
  async deleteAccount(id) {
    if (!confirm('确定删除此账号？')) return;
    try {
      await API.deleteCodexAccount(id);
      if (typeof App !== 'undefined' && App.showToast) App.showToast('已删除', 'info');
      this.loadList();
    } catch (e) {
      if (typeof App !== 'undefined' && App.showToast) App.showToast('删除失败', 'error');
    }
  },

  // ── Helpers ──
  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
    return `${hours}小时后重置`;
  },
};
