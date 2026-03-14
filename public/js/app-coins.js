Object.assign(App, {
    _coinCacheStorageKey: 'panpu-coin-balance-cache',

    refreshCurrentView() {
        switch (this.currentView) {
            case 'daily': DailyView.refresh(); break;
            case 'monthly': MonthlyView.refresh(); break;
            case 'stats': StatsView.load(); break;
            case 'checkin': CheckinView._reloadCurrentPage(); break;
            case 'garden': GardenView.refreshData(); break;
            case 'shop': GardenView.refreshShopData(); break;
        }
        this._refreshHeaderCoins();
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
        if (this.currentAssignee && this.currentAssignee !== 'all') {
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
                            <span>每项达标 <b>0.5</b> 币，连续3天 <b>+2</b>，7天 <b>+5</b></span>
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
                    <button class="coin-rules-goto-garden">🌴 去花园种树</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));
        const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 250); };
        overlay.querySelector('.coin-rules-close').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };
        overlay.querySelector('.coin-rules-goto-garden').onclick = () => { close(); this.switchView('garden'); };
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
});
