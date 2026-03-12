/**
 * Checkin View — Two-level: Landing (item cards) → Detail (water / wakeup).
 */
const CheckinView = {
    currentAssignee: '潘潘',
    todayTotal: 0,
    dailyGoal: 2000,
    records: [],
    currentPage: 'landing', // 'landing' | 'water' | 'wakeup'

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

        // Water card click → open water detail
        document.getElementById('card-water').addEventListener('click', () => {
            this.showDetail('water');
        });

        // Wakeup card click → open wakeup detail
        document.getElementById('card-wakeup').addEventListener('click', () => {
            this.showDetail('wakeup');
        });

        // Back buttons
        document.getElementById('checkin-back').addEventListener('click', () => this.showLanding());
        document.getElementById('checkin-back-wakeup').addEventListener('click', () => this.showLanding());

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

        // Goal edit
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
    },

    open() {
        document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
        document.getElementById('view-checkin').classList.remove('hidden');

        document.getElementById('header-title').textContent = '打卡';
        document.getElementById('date-nav').style.display = 'none';

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('nav-checkin').classList.add('active');
        document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));

        App.currentView = 'checkin';
        this.showLanding();
    },

    showLanding() {
        this.currentPage = 'landing';
        document.getElementById('checkin-landing').classList.remove('hidden');
        document.getElementById('checkin-detail-water').classList.add('hidden');
        document.getElementById('checkin-detail-wakeup').classList.add('hidden');
        document.getElementById('water-goal-editor').classList.add('hidden');
        document.getElementById('water-goal-display').classList.remove('hidden');
        this._loadLanding();
    },

    showDetail(type) {
        this.currentPage = type;
        document.getElementById('checkin-landing').classList.add('hidden');
        document.getElementById('checkin-detail-water').classList.toggle('hidden', type !== 'water');
        document.getElementById('checkin-detail-wakeup').classList.toggle('hidden', type !== 'wakeup');

        if (type === 'water') {
            this.loadGoal().then(() => this.loadWaterData());
        } else if (type === 'wakeup') {
            this.loadWakeupData();
        }
    },

    _reloadCurrentPage() {
        if (this.currentPage === 'landing') this._loadLanding();
        else if (this.currentPage === 'water') this.loadGoal().then(() => this.loadWaterData());
        else if (this.currentPage === 'wakeup') this.loadWakeupData();
    },

    async _loadLanding() {
        // Load water stats for card
        await this.loadGoal();
        await this.loadWaterData();
        // Load wakeup stats for card
        await this.loadWakeupCard();
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
            const glass = document.getElementById('glass-container');
            glass.classList.add('glass-pulse');
            setTimeout(() => glass.classList.remove('glass-pulse'), 600);
            App.showToast(`💧 +${amount}ml`, 'success');
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
            // Load today's wakeup
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

            // Load 7-day history
            this.loadWakeupHistory();
        } catch (err) {
            App.showToast('加载起床数据失败', 'error');
        }
    },

    async loadWakeupHistory() {
        const logEl = document.getElementById('wakeup-log');
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }

        let html = '';
        for (const date of days) {
            try {
                const data = await API.getCheckin({
                    date, assignee: this.currentAssignee, type: 'wakeup'
                });
                const weekday = ['日', '一', '二', '三', '四', '五', '六'];
                const d = new Date(date);
                const dayLabel = `${date.slice(5)} 周${weekday[d.getDay()]}`;
                if (data.records.length > 0) {
                    const time = data.records[0].created_at?.split(' ')[1]?.slice(0, 5) || '';
                    html += `<div class="wakeup-log-item">
                        <span class="wakeup-log-date">${dayLabel}</span>
                        <span class="wakeup-log-time checked">⏰ ${time}</span>
                    </div>`;
                } else {
                    html += `<div class="wakeup-log-item">
                        <span class="wakeup-log-date">${dayLabel}</span>
                        <span class="wakeup-log-time missed">未打卡</span>
                    </div>`;
                }
            } catch (err) { /* skip */ }
        }
        logEl.innerHTML = html || '<div class="water-log-empty">暂无记录</div>';
    },

    async stampWakeup() {
        try {
            await API.addCheckin({
                type: 'wakeup',
                amount: 1,
                assignee: this.currentAssignee
            });
            App.showToast('⏰ 起床打卡成功！', 'success');
            this.loadWakeupData();
            this.loadWakeupCard();
        } catch (err) {
            App.showToast('打卡失败', 'error');
        }
    }
};
