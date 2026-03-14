Object.assign(App, {
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
            this._renderHeaderCoins(this._normalizeCoinBalance(d.balance));
        }).catch(() => { });
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
                <div class="coin-rules-header">
                ${Utils.coinSvg('cat-coin-icon large')}
                    <h3>喵喵币获取规则</h3>
                    <button class="coin-rules-close">✕</button>
                </div>
                <div class="coin-rules-body">
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">✅</span>
                    <div><strong>完成任务</strong><br>每完成一个任务获得 <b>1.5</b> 喵喵币</div>
                </div>
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">📅</span>
                    <div><strong>每日打卡</strong><br>每项达标 <b>0.5</b> 币，连续3天 <b>+2</b>，连续7天 <b>+5</b>（然后重置）</div>
                </div>
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">🍅</span>
                    <div><strong>番茄钟</strong><br>15分钟 <b>0.5</b> · 25分 <b>1</b> · 45分 <b>2</b> · 60分 <b>3</b> 币<br>专注结束后评分结算：时间奖励 × <b>50%</b> · <b>75%</b> · <b>100%</b> · <b>125%</b> · <b>150%</b></div>
                </div>
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">🌳</span>
                    <div><strong>植物成长</strong><br>专注种树，植物成长时随机掉落喵喵币</div>
                </div>
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">🛒</span>
                    <div><strong>商城消费</strong><br>在商城中购买植物、装饰等</div>
                </div>
            </div>
                <div class="coin-rules-footer">
                    <button class="coin-rules-goto-garden">🌴 去花园</button>
                    <button class="coin-rules-goto-shop">🛒 去商城</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.coin-rules-close').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.querySelector('.coin-rules-goto-garden').onclick = () => { overlay.remove(); this.switchView('garden'); };
        overlay.querySelector('.coin-rules-goto-shop').onclick = () => { overlay.remove(); this.switchView('shop'); };
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
