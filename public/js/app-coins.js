if (typeof App === 'undefined') {
    console.warn('App boot incomplete; skipping app-coins extension.');
} else Object.assign(App, {
    _coinCacheStorageKey: 'panpu-coin-balance-cache',

    refreshCurrentView() {
        switch (this.currentView) {
            case 'daily': DailyView?.refresh?.(); break;
            case 'monthly': MonthlyView?.refresh?.(); break;
            case 'stats': StatsView?.load?.(); break;
            case 'checkin': CheckinView?._reloadCurrentPage?.(); break;
            case 'garden': GardenView?.refreshData?.(); break;
            case 'shop': GardenView?.refreshShopData?.(); break;
        }
        this.syncHeaderCoins();
    },

    _normalizeCoinBalance(balance) {
        return Math.round((Number(balance) || 0) * 10) / 10;
    },

    _readCoinCache() {
        try {
            const raw = localStorage.getItem(this._coinCacheStorageKey);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    },

    _writeCoinCache(cache) {
        try {
            localStorage.setItem(this._coinCacheStorageKey, JSON.stringify(cache));
        } catch (e) { /* ignore cache write errors */ }
    },

    _setCachedCoinBalance(assignee, balance) {
        if (!assignee) return;
        const cache = this._readCoinCache();
        cache[assignee] = this._normalizeCoinBalance(balance);
        this._writeCoinCache(cache);
    },

    _getCachedCoinBalance(assignee) {
        if (!assignee) return 0;
        const cache = this._readCoinCache();
        if (!(assignee in cache)) return 0;
        return this._normalizeCoinBalance(cache[assignee]);
    },

    _getHeaderCoinUser() {
        if (this.currentView === 'garden' && typeof GardenView !== 'undefined') {
            return GardenView.assignee;
        }
        if (this.currentView === 'shop' && typeof GardenView !== 'undefined') {
            return GardenView.shopAssignee;
        }
        if (this.currentView === 'checkin' && typeof CheckinView !== 'undefined') {
            return CheckinView.currentAssignee;
        }
        if (this.currentView === 'stats' && typeof StatsView !== 'undefined') {
            return StatsView.currentAssignee;
        }
        if (this.currentAssignee) {
            return this.currentAssignee;
        }
        return '潘潘';
    },

    _syncCoinCaches({ assignee, balance = null, delta = 0 }) {
        if (typeof GardenView === 'undefined' || !assignee) return;
        const nextBalance = (current) => (
            balance == null
                ? this._normalizeCoinBalance((Number(current) || 0) + delta)
                : this._normalizeCoinBalance(balance)
        );

        if (GardenView.assignee === assignee) {
            GardenView.balance = nextBalance(GardenView.balance);
            const el = document.querySelector('.island-hud .garden-balance strong');
            if (el) el.textContent = Utils.formatCoinBalance(GardenView.balance);
        }

        if (GardenView.shopAssignee === assignee) {
            GardenView.shopBalance = nextBalance(GardenView.shopBalance);
            const el = document.querySelector('#view-shop .garden-balance strong');
            if (el) el.textContent = Utils.formatCoinBalance(GardenView.shopBalance);
        }
    },

    syncCoins({ assignee, balance = null, delta = 0, animate = delta > 0 } = {}) {
        if (!assignee) return;

        const normalizedDelta = this._normalizeCoinBalance(delta);
        this._syncCoinCaches({ assignee, balance, delta: normalizedDelta });

        if (assignee !== this._getHeaderCoinUser()) return;

        const nextBalance = balance == null
            ? this._normalizeCoinBalance(this._headerCoinBalance + normalizedDelta)
            : this._normalizeCoinBalance(balance);

        this._renderHeaderCoins(nextBalance);
        this._setCachedCoinBalance(assignee, nextBalance);

        if (animate && normalizedDelta > 0) {
            this._animateHeaderCoinGain(normalizedDelta);
        }

        if (balance == null) {
            clearTimeout(this._headerCoinSyncTimer);
            this._headerCoinSyncTimer = setTimeout(() => this._refreshHeaderCoins(), 180);
        }
    },

    _refreshHeaderCoins() {
        const coinUser = this._getHeaderCoinUser();
        API.getCoins(coinUser).then(d => {
            const balance = this._normalizeCoinBalance(d.balance);
            this._setCachedCoinBalance(coinUser, balance);
            this._renderHeaderCoins(balance);
        }).catch(e => { console.warn('Header coin sync failed:', e); });
    },

    _renderHeaderCoins(balance = 0) {
        const btn = document.getElementById('header-coin-btn');
        if (!btn) return;
        this._headerCoinBalance = this._normalizeCoinBalance(balance);
        btn.innerHTML = Utils.headerCoinMarkup(this._headerCoinBalance);
    },

    syncHeaderCoins(balance = null) {
        if (balance == null) {
            this._refreshHeaderCoins();
            return;
        }
        this._renderHeaderCoins(balance);
    },

    _animateHeaderCoinGain(delta) {
        const btn = document.getElementById('header-coin-btn');
        if (!btn || btn.style.display === 'none') return;

        btn.classList.remove('coin-gain');
        void btn.offsetWidth;
        btn.classList.add('coin-gain');

        clearTimeout(this._headerCoinGainTimer);
        this._headerCoinGainTimer = setTimeout(() => {
            btn.classList.remove('coin-gain');
        }, 700);

        btn.querySelectorAll('.header-coin-float').forEach(el => el.remove());
        const float = document.createElement('span');
        float.className = 'header-coin-float';
        float.textContent = `+${Utils.formatCoinBalance(delta)}`;
        btn.appendChild(float);
        float.addEventListener('animationend', () => float.remove(), { once: true });
    },

    _showCoinRules() {
        const overlay = document.createElement('div');
        overlay.className = 'coin-rules-overlay';
        overlay.innerHTML = `
            <div class="coin-rules-modal">
                <div class="coin-rules-hero">
                    ${Utils.coinSvg('cat-coin-icon coin-rules-hero-coin')}
                    <h3>喵喵币攻略</h3>
                    <p>完成任务、打卡、专注 — 轻松获取喵喵币</p>
                    <button class="coin-rules-close">✕</button>
                </div>
                <div class="coin-rules-body">
                    <div class="coin-rule-card">
                        <div class="coin-rule-badge">1</div>
                        <div class="coin-rule-icon">✅</div>
                        <div class="coin-rule-text">
                            <strong>完成任务</strong>
                            <span>每完成一个任务获得 <b>1.5</b> 喵喵币</span>
                        </div>
                    </div>
                    <div class="coin-rule-card">
                        <div class="coin-rule-badge">2</div>
                        <div class="coin-rule-icon">📅</div>
                        <div class="coin-rule-text">
                            <strong>每日打卡</strong>
                            <span>每项达标 <b>2</b> 币，连续3天 <b>+3</b>，7天 <b>+10</b></span>
                        </div>
                    </div>
                    <div class="coin-rule-card">
                        <div class="coin-rule-badge">3</div>
                        <div class="coin-rule-icon">🍅</div>
                        <div class="coin-rule-text">
                            <strong>番茄钟</strong>
                            <span>15分 <b>0.5</b> · 25分 <b>1</b> · 45分 <b>2</b> · 60分 <b>3</b><br>评分倍率 ×50%~150%</span>
                        </div>
                    </div>
                    <div class="coin-rule-card">
                        <div class="coin-rule-badge">4</div>
                        <div class="coin-rule-icon">🌳</div>
                        <div class="coin-rule-text">
                            <strong>植物成长</strong>
                            <span>专注种树时随机掉落喵喵币</span>
                        </div>
                    </div>
                </div>
                <div class="coin-rules-footer">
                    <button class="coin-rules-goto-garden">🌴 跳转花园</button>
                    <button class="coin-rules-goto-history">📊 查看明细</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));
        const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 250); };
        overlay.querySelector('.coin-rules-close').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };
        overlay.querySelector('.coin-rules-goto-garden').onclick = () => { close(); this.switchView('garden'); };
        overlay.querySelector('.coin-rules-goto-history').onclick = () => { close(); this._showCoinHistory(); };
    },

    _coinReasonIcon(reason) {
        const map = {
            task_done: '✅', pomodoro: '🍅',
            checkin_daily: '📅', checkin_streak_3: '🔥', checkin_streak_7: '🔥',
            purchase: '🛒', plant_drop: '🌳', harvest: '🌾',
            speedup: '⏩', clear_obstacle: '⛏️',
        };
        return map[reason] || (reason?.startsWith('checkin') ? '📅' : '📝');
    },

    _coinTimeAgo(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr.replace(' ', 'T'));
        const now = new Date();
        const days = Math.floor((now - d) / 86400000);
        if (days === 0) return '今天';
        if (days === 1) return '昨天';
        if (days < 30) return `${days}天前`;
        return `${d.getMonth() + 1}/${d.getDate()}`;
    },

    async _showCoinHistory() {
        const assignee = this._getHeaderCoinUser();
        try {
            const history = await API.getCoinHistory(assignee, 30);
            const html = history.map(h => `
                <div class="coin-history-row" data-tx-id="${h.id}" data-amount="${h.amount}" data-detail="${(h.detail || h.reason || '').replace(/"/g, '&quot;')}">
                    <span class="coin-history-icon">${this._coinReasonIcon(h.reason)}</span>
                    <span class="coin-history-detail">
                        <span class="coin-history-label">${h.detail || h.reason}</span>
                        <span class="coin-history-time">${this._coinTimeAgo(h.created_at)}</span>
                    </span>
                    <span class="coin-history-amount ${h.amount > 0 ? 'positive' : 'negative'}">${h.amount > 0 ? '+' : ''}${h.amount}</span>
                    ${h.amount > 0 ? '<button class="coin-undo-btn" title="撤销此记录">↩</button>' : '<span class="coin-history-spacer"></span>'}
                </div>
            `).join('') || '<div class="coin-history-empty">暂无记录</div>';

            const overlay = document.createElement('div');
            overlay.className = 'history-modal-overlay';
            overlay.innerHTML = `<div class="modal-box history-modal-box">
                <div class="history-modal-header">
                    <h3 class="history-modal-title">📊 喵喵币明细 - ${assignee}</h3>
                    <button class="history-modal-close" aria-label="关闭">✕</button>
                </div>
                <div class="history-modal-body">${html}</div>
            </div>`;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('active'));

            const close = () => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 250);
            };
            overlay.querySelector('.history-modal-close').addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

            // Undo button handlers
            overlay.querySelectorAll('.coin-undo-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const row = btn.closest('.coin-history-row');
                    const txId = row?.dataset.txId;
                    const detail = row?.dataset.detail || '';
                    const amount = row?.dataset.amount || '';
                    if (!txId || !confirm(`撤销「${detail}」(+${amount} 喵喵币)？`)) return;
                    btn.disabled = true;
                    btn.textContent = '…';
                    try {
                        const result = await API.undoCoinTransaction(txId);
                        row.style.transition = 'opacity 0.25s, max-height 0.3s 0.1s, padding 0.3s 0.1s, margin 0.3s 0.1s';
                        row.style.opacity = '0';
                        row.style.maxHeight = '0';
                        row.style.padding = '0 16px';
                        row.style.overflow = 'hidden';
                        setTimeout(() => row.remove(), 350);
                        this.syncCoins({ assignee: result.assignee, balance: result.balance });
                        this.showToast(`已撤销 -${result.undone} 喵喵币`, 'success');
                    } catch (e) {
                        this.showToast(e.message || '撤销失败', 'error');
                        btn.disabled = false;
                        btn.textContent = '↩';
                    }
                });
            });
        } catch (e) {
            this.showToast('加载记录失败', 'error');
        }
    },

    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        // Limit max visible toasts
        while (container.children.length > 3) {
            container.firstChild.remove();
        }

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },
});
