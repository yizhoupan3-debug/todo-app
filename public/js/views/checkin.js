/**
 * Checkin View — Two-level: Landing (item cards) → Detail (water / wakeup / skincare / steps).
 */
const CheckinView = {
    currentAssignee: '潘潘',
    todayTotal: 0,
    dailyGoal: 2000,
    stepsTotal: 0,
    stepsGoal: 10000,
    records: [],
    stepsRecords: [],
    currentPage: 'landing', // 'landing' | 'water' | 'wakeup' | 'skincare' | 'steps'

    init() {
        // Person toggle
        document.querySelectorAll('.checkin-person-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentAssignee = btn.dataset.assignee;
                document.querySelectorAll('.checkin-person-btn').forEach(b =>
                    b.classList.toggle('active', b.dataset.assignee === this.currentAssignee));
                this._reloadCurrentPage();
            });
        });

        // Card clicks → open detail
        document.getElementById('card-water').addEventListener('click', () => this.showDetail('water'));
        document.getElementById('card-wakeup').addEventListener('click', () => this.showDetail('wakeup'));
        document.getElementById('card-skincare').addEventListener('click', () => this.showDetail('skincare'));
        document.getElementById('card-steps').addEventListener('click', () => this.showDetail('steps'));

        // Back buttons
        document.getElementById('checkin-back').addEventListener('click', () => this.showLanding());
        document.getElementById('checkin-back-wakeup').addEventListener('click', () => this.showLanding());
        document.getElementById('checkin-back-skincare').addEventListener('click', () => this.showLanding());
        document.getElementById('checkin-back-steps').addEventListener('click', () => this.showLanding());

        // ===== Water controls =====
        document.querySelectorAll('.water-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addWater(parseInt(btn.dataset.amount));
            });
        });

        document.getElementById('water-custom-add').addEventListener('click', () => {
            const input = document.getElementById('water-custom-input');
            const amount = parseInt(input.value);
            if (amount > 0 && amount <= 5000) {
                this.addWater(amount);
                input.value = '';
            } else {
                App.showToast('请输入 1-5000ml', 'error');
            }
        });

        // Water goal edit
        document.getElementById('goal-edit-btn').addEventListener('click', () => {
            document.getElementById('goal-input').value = this.dailyGoal;
            document.getElementById('water-goal-editor').classList.remove('hidden');
            document.getElementById('water-goal-display').classList.add('hidden');
        });

        document.getElementById('goal-save-btn').addEventListener('click', async () => {
            const newGoal = parseInt(document.getElementById('goal-input').value);
            if (newGoal >= 500 && newGoal <= 10000) {
                try {
                    await API.setGoal({ type: 'water', assignee: this.currentAssignee, goal: newGoal });
                    this.dailyGoal = newGoal;
                    document.getElementById('water-goal-editor').classList.add('hidden');
                    document.getElementById('water-goal-display').classList.remove('hidden');
                    this.renderWater();
                    App.showToast('目标已更新', 'success');
                } catch (err) {
                    App.showToast('保存失败', 'error');
                }
            } else {
                App.showToast('目标范围：500-10000ml', 'error');
            }
        });

        // ===== Wakeup stamp =====
        document.getElementById('wakeup-stamp-btn').addEventListener('click', () => this.stampWakeup());

        // ===== Skincare stamp =====
        document.getElementById('skincare-stamp-btn').addEventListener('click', () => this.stampSkincare());

        // ===== Steps controls =====
        document.querySelectorAll('.steps-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addSteps(parseInt(btn.dataset.amount));
            });
        });

        document.getElementById('steps-custom-add').addEventListener('click', () => {
            const input = document.getElementById('steps-custom-input');
            const amount = parseInt(input.value);
            if (amount > 0 && amount <= 100000) {
                this.addSteps(amount);
                input.value = '';
            } else {
                App.showToast('请输入 1-100000 步', 'error');
            }
        });

        // Steps goal edit
        document.getElementById('steps-goal-edit-btn').addEventListener('click', () => {
            document.getElementById('steps-goal-input').value = this.stepsGoal;
            document.getElementById('steps-goal-editor').classList.remove('hidden');
            document.getElementById('steps-goal-display').classList.add('hidden');
        });

        document.getElementById('steps-goal-save-btn').addEventListener('click', async () => {
            const newGoal = parseInt(document.getElementById('steps-goal-input').value);
            if (newGoal >= 1000 && newGoal <= 50000) {
                try {
                    await API.setGoal({ type: 'steps', assignee: this.currentAssignee, goal: newGoal });
                    this.stepsGoal = newGoal;
                    document.getElementById('steps-goal-editor').classList.add('hidden');
                    document.getElementById('steps-goal-display').classList.remove('hidden');
                    this.renderSteps();
                    App.showToast('目标已更新', 'success');
                } catch (err) {
                    App.showToast('保存失败', 'error');
                }
            } else {
                App.showToast('目标范围：1000-50000步', 'error');
            }
        });
    },

    open() {
        // Delegate to unified switchView to ensure consistent state
        if (App.currentView !== 'checkin') {
            App.switchView('checkin');
            return;
        }
        this.showLanding();
    },

    showLanding() {
        this.currentPage = 'landing';
        document.getElementById('checkin-landing').classList.remove('hidden');
        ['water', 'wakeup', 'skincare', 'steps'].forEach(t =>
            document.getElementById(`checkin-detail-${t}`).classList.add('hidden'));
        document.getElementById('water-goal-editor').classList.add('hidden');
        document.getElementById('water-goal-display').classList.remove('hidden');
        this._loadLanding();
    },

    showDetail(type) {
        this.currentPage = type;
        document.getElementById('checkin-landing').classList.add('hidden');
        ['water', 'wakeup', 'skincare', 'steps'].forEach(t =>
            document.getElementById(`checkin-detail-${t}`).classList.toggle('hidden', t !== type));

        if (type === 'water') {
            this.loadGoal().then(() => this.loadWaterData());
        } else if (type === 'wakeup') {
            this.loadWakeupData();
        } else if (type === 'skincare') {
            this.loadSkincareData();
        } else if (type === 'steps') {
            this.loadStepsGoal().then(() => this.loadStepsData());
        }
    },

    _reloadCurrentPage() {
        if (this.currentPage === 'landing') this._loadLanding();
        else if (this.currentPage === 'water') this.loadGoal().then(() => this.loadWaterData());
        else if (this.currentPage === 'wakeup') this.loadWakeupData();
        else if (this.currentPage === 'skincare') this.loadSkincareData();
        else if (this.currentPage === 'steps') this.loadStepsGoal().then(() => this.loadStepsData());
    },

    async _loadLanding() {
        // Load water stats for card
        await this.loadGoal();
        await this.loadWaterData();
        // Load wakeup stats for card
        await this.loadWakeupCard();
        // Load skincare stats for card
        await this.loadSkincareCard();
        // Load steps stats for card
        await this.loadStepsGoal();
        await this.loadStepsCard();
    },

    // ===== Water =====
    async loadGoal() {
        try {
            const data = await API.getGoal({ type: 'water', assignee: this.currentAssignee });
            this.dailyGoal = data.goal;
        } catch (err) { /* default */ }
    },

    _getToday() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },

    async loadWaterData() {
        try {
            const data = await API.getCheckin({
                date: this._getToday(),
                assignee: this.currentAssignee,
                type: 'water'
            });
            this.todayTotal = data.total;
            this.records = data.records;
            this.renderWater();
        } catch (err) {
            App.showToast('加载喝水数据失败', 'error');
        }
    },

    renderWater() {
        const percent = Math.min((this.todayTotal / this.dailyGoal) * 100, 100);

        // Landing card
        document.getElementById('card-water-bar').style.width = percent + '%';
        document.getElementById('card-water-stats').textContent = `${this.todayTotal} / ${this.dailyGoal}ml`;
        document.getElementById('card-water-bar').style.background = percent >= 100
            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
            : 'linear-gradient(90deg, #60a5fa, #3b82f6)';

        // Detail glass
        document.getElementById('glass-water').style.height = percent + '%';
        document.getElementById('water-amount-text').textContent = this.todayTotal;
        document.getElementById('water-goal-text').textContent = this.dailyGoal;

        const water = document.getElementById('glass-water');
        if (percent >= 100) water.style.background = 'linear-gradient(180deg, #22c55e, #16a34a)';
        else if (percent >= 50) water.style.background = 'linear-gradient(180deg, #60a5fa, #3b82f6)';
        else water.style.background = 'linear-gradient(180deg, #93c5fd, #60a5fa)';

        const progressEl = document.getElementById('water-progress-label');
        if (percent >= 100) {
            progressEl.textContent = '🎉 目标达成！';
            progressEl.style.color = '#22c55e';
        } else {
            progressEl.textContent = `还差 ${this.dailyGoal - this.todayTotal}ml`;
            progressEl.style.color = '';
        }

        // Log
        const log = document.getElementById('water-log');
        if (this.records.length === 0) {
            log.innerHTML = '<div class="water-log-empty">今天还没有喝水记录 💧</div>';
        } else {
            log.innerHTML = this.records.map(r => {
                const time = r.created_at ? r.created_at.split(' ')[1]?.slice(0, 5) : '';
                return `<div class="water-log-item">
                    <span class="water-log-time">${time}</span>
                    <span class="water-log-amount">+${r.amount}ml</span>
                    <button class="water-log-undo" data-id="${r.id}" title="撤销">✕</button>
                </div>`;
            }).join('');
            log.querySelectorAll('.water-log-undo').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await API.deleteCheckin(btn.dataset.id);
                        this.loadWaterData();
                        App.showToast('已撤销', 'info');
                    } catch (err) { App.showToast('撤销失败', 'error'); }
                });
            });
        }
    },

    async addWater(amount) {
        try {
            const result = await API.addCheckin({
                type: 'water', amount, assignee: this.currentAssignee
            });
            this.todayTotal = result.total;
            this.loadWaterData();
            if (result.coinsEarned > 0) {
                App.syncCoins({ assignee: this.currentAssignee, delta: result.coinsEarned, animate: true });
            }
            const glass = document.getElementById('glass-container');
            glass.classList.add('glass-pulse');
            setTimeout(() => glass.classList.remove('glass-pulse'), 600);
            const coinMsg = result.coinsEarned > 0 ? ` · +${result.coinsEarned} 喵喵币` : '';
            App.showToast(`💧 +${amount}ml${coinMsg}`, 'success');
        } catch (err) {
            App.showToast('记录失败', 'error');
        }
    },

    // ===== Wakeup =====
    async loadWakeupCard() {
        try {
            const data = await API.getCheckin({
                date: this._getToday(),
                assignee: this.currentAssignee,
                type: 'wakeup'
            });
            const statsEl = document.getElementById('card-wakeup-stats');
            if (data.records.length > 0) {
                const time = data.records[0].created_at?.split(' ')[1]?.slice(0, 5) || '';
                statsEl.textContent = `✅ ${time} 已打卡`;
                statsEl.style.color = '#22c55e';
            } else {
                statsEl.textContent = '今日未打卡';
                statsEl.style.color = '';
            }
        } catch (err) { /* ignore */ }
    },

    async loadWakeupData() {
        try {
            const todayData = await API.getCheckin({
                date: this._getToday(),
                assignee: this.currentAssignee,
                type: 'wakeup'
            });

            const statusEl = document.getElementById('wakeup-status');
            const timeEl = document.getElementById('wakeup-time');
            const stampBtn = document.getElementById('wakeup-stamp-btn');

            if (todayData.records.length > 0) {
                const time = todayData.records[0].created_at?.split(' ')[1]?.slice(0, 5) || '';
                statusEl.textContent = '✅ 今日已打卡';
                statusEl.style.color = '#22c55e';
                timeEl.textContent = time;
                stampBtn.disabled = true;
                stampBtn.classList.add('stamped');
            } else {
                statusEl.textContent = '今日未打卡';
                statusEl.style.color = '';
                timeEl.textContent = '';
                stampBtn.disabled = false;
                stampBtn.classList.remove('stamped');
            }

            this.loadHistory('wakeup', 'wakeup-log');
        } catch (err) {
            App.showToast('加载起床数据失败', 'error');
        }
    },

    async loadHistory(type, logElId) {
        const logEl = document.getElementById(logElId);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }

        const results = await Promise.allSettled(
            days.map(date => API.getCheckin({
                date, assignee: this.currentAssignee, type
            }).then(data => ({ date, data })))
        );

        const weekday = ['日', '一', '二', '三', '四', '五', '六'];
        const iconMap = { wakeup: '⏰', skincare: '🧴' };
        const icon = iconMap[type] || '✅';
        let html = '';
        for (const result of results) {
            if (result.status !== 'fulfilled') continue;
            const { date, data } = result.value;
            const d = new Date(date);
            const dayLabel = `${date.slice(5)} 周${weekday[d.getDay()]}`;
            if (data.records.length > 0) {
                const time = data.records[0].created_at?.split(' ')[1]?.slice(0, 5) || '';
                html += `<div class="wakeup-log-item">
                    <span class="wakeup-log-date">${dayLabel}</span>
                    <span class="wakeup-log-time checked">${icon} ${time}</span>
                </div>`;
            } else {
                html += `<div class="wakeup-log-item">
                    <span class="wakeup-log-date">${dayLabel}</span>
                    <span class="wakeup-log-time missed">未打卡</span>
                </div>`;
            }
        }
        logEl.innerHTML = html || '<div class="water-log-empty">暂无记录</div>';
    },

    async stampWakeup() {
        try {
            const result = await API.addCheckin({
                type: 'wakeup',
                amount: 1,
                assignee: this.currentAssignee
            });
            if (result.coinsEarned > 0) {
                App.syncCoins({ assignee: this.currentAssignee, delta: result.coinsEarned, animate: true });
            }
            const coinMsg = result.coinsEarned > 0 ? ` · +${result.coinsEarned} 喵喵币` : '';
            App.showToast(`⏰ 起床打卡成功！${coinMsg}`, 'success');
            this.loadWakeupData();
            this.loadWakeupCard();
        } catch (err) {
            App.showToast('打卡失败', 'error');
        }
    },

    // ===== Skincare =====
    async loadSkincareCard() {
        try {
            const data = await API.getCheckin({
                date: this._getToday(),
                assignee: this.currentAssignee,
                type: 'skincare'
            });
            const statsEl = document.getElementById('card-skincare-stats');
            if (data.records.length > 0) {
                const time = data.records[0].created_at?.split(' ')[1]?.slice(0, 5) || '';
                statsEl.textContent = `✅ ${time} 已打卡`;
                statsEl.style.color = '#22c55e';
            } else {
                statsEl.textContent = '今日未打卡';
                statsEl.style.color = '';
            }
        } catch (err) { /* ignore */ }
    },

    async loadSkincareData() {
        try {
            const todayData = await API.getCheckin({
                date: this._getToday(),
                assignee: this.currentAssignee,
                type: 'skincare'
            });

            const statusEl = document.getElementById('skincare-status');
            const stampBtn = document.getElementById('skincare-stamp-btn');

            if (todayData.records.length > 0) {
                const time = todayData.records[0].created_at?.split(' ')[1]?.slice(0, 5) || '';
                statusEl.textContent = `✅ 今日已打卡 ${time}`;
                statusEl.style.color = '#22c55e';
                stampBtn.disabled = true;
                stampBtn.classList.add('stamped');
            } else {
                statusEl.textContent = '今日未打卡';
                statusEl.style.color = '';
                stampBtn.disabled = false;
                stampBtn.classList.remove('stamped');
            }

            this.loadHistory('skincare', 'skincare-log');
        } catch (err) {
            App.showToast('加载护肤数据失败', 'error');
        }
    },

    async stampSkincare() {
        try {
            const result = await API.addCheckin({
                type: 'skincare',
                amount: 1,
                assignee: this.currentAssignee
            });
            if (result.coinsEarned > 0) {
                App.syncCoins({ assignee: this.currentAssignee, delta: result.coinsEarned, animate: true });
            }
            const coinMsg = result.coinsEarned > 0 ? ` · +${result.coinsEarned} 喵喵币` : '';
            App.showToast(`🧴 护肤打卡成功！${coinMsg}`, 'success');
            this.loadSkincareData();
            this.loadSkincareCard();
        } catch (err) {
            App.showToast('打卡失败', 'error');
        }
    },

    // ===== Steps =====
    async loadStepsGoal() {
        try {
            const data = await API.getGoal({ type: 'steps', assignee: this.currentAssignee });
            this.stepsGoal = data.goal || 10000;
        } catch (err) { /* default */ }
    },

    async loadStepsCard() {
        try {
            const data = await API.getCheckin({
                date: this._getToday(),
                assignee: this.currentAssignee,
                type: 'steps'
            });
            const total = data.total || 0;
            const percent = Math.min((total / this.stepsGoal) * 100, 100);
            document.getElementById('card-steps-bar').style.width = percent + '%';
            document.getElementById('card-steps-stats').textContent = `${total} / ${this.stepsGoal}步`;
            document.getElementById('card-steps-bar').style.background = percent >= 100
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #f59e0b, #d97706)';
        } catch (err) { /* ignore */ }
    },

    async loadStepsData() {
        try {
            const data = await API.getCheckin({
                date: this._getToday(),
                assignee: this.currentAssignee,
                type: 'steps'
            });
            this.stepsTotal = data.total || 0;
            this.stepsRecords = data.records || [];
            this.renderSteps();
        } catch (err) {
            App.showToast('加载步数数据失败', 'error');
        }
    },

    renderSteps() {
        const percent = Math.min((this.stepsTotal / this.stepsGoal) * 100, 100);

        // Landing card is updated via loadStepsCard

        // Detail
        document.getElementById('steps-amount-text').textContent = this.stepsTotal;
        document.getElementById('steps-goal-text').textContent = this.stepsGoal;

        const progressEl = document.getElementById('steps-progress-label');
        if (percent >= 100) {
            progressEl.textContent = '🎉 目标达成！';
            progressEl.style.color = '#22c55e';
        } else {
            progressEl.textContent = `还差 ${this.stepsGoal - this.stepsTotal} 步`;
            progressEl.style.color = '';
        }

        // Log
        const log = document.getElementById('steps-log');
        if (this.stepsRecords.length === 0) {
            log.innerHTML = '<div class="water-log-empty">今天还没有步数记录 🚶</div>';
        } else {
            log.innerHTML = this.stepsRecords.map(r => {
                const time = r.created_at ? r.created_at.split(' ')[1]?.slice(0, 5) : '';
                return `<div class="water-log-item">
                    <span class="water-log-time">${time}</span>
                    <span class="water-log-amount">+${r.amount}步</span>
                    <button class="water-log-undo" data-id="${r.id}" title="撤销">✕</button>
                </div>`;
            }).join('');
            log.querySelectorAll('.water-log-undo').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await API.deleteCheckin(btn.dataset.id);
                        this.loadStepsData();
                        this.loadStepsCard();
                        App.showToast('已撤销', 'info');
                    } catch (err) { App.showToast('撤销失败', 'error'); }
                });
            });
        }
    },

    async addSteps(amount) {
        try {
            const result = await API.addCheckin({
                type: 'steps', amount, assignee: this.currentAssignee
            });
            this.stepsTotal = result.total;
            this.loadStepsData();
            this.loadStepsCard();
            if (result.coinsEarned > 0) {
                App.syncCoins({ assignee: this.currentAssignee, delta: result.coinsEarned, animate: true });
            }
            const coinMsg = result.coinsEarned > 0 ? ` · +${result.coinsEarned} 喵喵币` : '';
            App.showToast(`🚶 +${amount}步${coinMsg}`, 'success');
        } catch (err) {
            App.showToast('记录失败', 'error');
        }
    },
};
