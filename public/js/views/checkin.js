/**
 * Checkin View — Two-level: Landing (item cards) → Detail (water tracker).
 */
const CheckinView = {
    currentAssignee: '潘潘',
    todayTotal: 0,
    dailyGoal: 2000,
    records: [],
    currentPage: 'landing', // 'landing' or 'water'

    init() {
        // Person toggle
        document.querySelectorAll('.checkin-person-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentAssignee = btn.dataset.assignee;
                document.querySelectorAll('.checkin-person-btn').forEach(b =>
                    b.classList.toggle('active', b.dataset.assignee === this.currentAssignee));
                this.loadGoal().then(() => this.loadData());
            });
        });

        // Water card click → open detail
        document.getElementById('card-water').addEventListener('click', () => {
            this.showDetail();
        });

        // Back button
        document.getElementById('checkin-back').addEventListener('click', () => {
            this.showLanding();
        });

        // Quick-add buttons
        document.querySelectorAll('.water-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addWater(parseInt(btn.dataset.amount));
            });
        });

        // Custom amount
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
            const editor = document.getElementById('water-goal-editor');
            const display = document.getElementById('water-goal-display');
            document.getElementById('goal-input').value = this.dailyGoal;
            editor.classList.remove('hidden');
            display.classList.add('hidden');
        });

        document.getElementById('goal-save-btn').addEventListener('click', async () => {
            const input = document.getElementById('goal-input');
            const newGoal = parseInt(input.value);
            if (newGoal >= 500 && newGoal <= 10000) {
                try {
                    await API.setGoal({
                        type: 'water',
                        assignee: this.currentAssignee,
                        goal: newGoal
                    });
                    this.dailyGoal = newGoal;
                    document.getElementById('water-goal-editor').classList.add('hidden');
                    document.getElementById('water-goal-display').classList.remove('hidden');
                    this.render();
                    App.showToast('目标已更新', 'success');
                } catch (err) {
                    App.showToast('保存失败', 'error');
                }
            } else {
                App.showToast('目标范围：500-10000ml', 'error');
            }
        });
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
        // Close goal editor if open
        document.getElementById('water-goal-editor').classList.add('hidden');
        document.getElementById('water-goal-display').classList.remove('hidden');
        this.loadGoal().then(() => this.loadData());
    },

    showDetail() {
        this.currentPage = 'water';
        document.getElementById('checkin-landing').classList.add('hidden');
        document.getElementById('checkin-detail-water').classList.remove('hidden');
        this.loadGoal().then(() => this.loadData());
    },

    async loadGoal() {
        try {
            const data = await API.getGoal({
                type: 'water',
                assignee: this.currentAssignee
            });
            this.dailyGoal = data.goal;
        } catch (err) { /* use default */ }
    },

    _getToday() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },

    async loadData() {
        try {
            const data = await API.getCheckin({
                date: this._getToday(),
                assignee: this.currentAssignee,
                type: 'water'
            });
            this.todayTotal = data.total;
            this.records = data.records;
            this.render();
        } catch (err) {
            App.showToast('加载打卡数据失败', 'error');
        }
    },

    render() {
        const percent = Math.min((this.todayTotal / this.dailyGoal) * 100, 100);

        // Landing card
        document.getElementById('card-water-bar').style.width = percent + '%';
        document.getElementById('card-water-stats').textContent = `${this.todayTotal} / ${this.dailyGoal}ml`;
        const bar = document.getElementById('card-water-bar');
        bar.style.background = percent >= 100
            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
            : 'linear-gradient(90deg, #60a5fa, #3b82f6)';

        // Detail glass
        document.getElementById('glass-water').style.height = percent + '%';
        document.getElementById('water-amount-text').textContent = this.todayTotal;
        document.getElementById('water-goal-text').textContent = this.dailyGoal;

        const water = document.getElementById('glass-water');
        if (percent >= 100) {
            water.style.background = 'linear-gradient(180deg, #22c55e, #16a34a)';
        } else if (percent >= 50) {
            water.style.background = 'linear-gradient(180deg, #60a5fa, #3b82f6)';
        } else {
            water.style.background = 'linear-gradient(180deg, #93c5fd, #60a5fa)';
        }

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
                return `
                    <div class="water-log-item">
                        <span class="water-log-time">${time}</span>
                        <span class="water-log-amount">+${r.amount}ml</span>
                        <button class="water-log-undo" data-id="${r.id}" title="撤销">✕</button>
                    </div>
                `;
            }).join('');

            log.querySelectorAll('.water-log-undo').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await API.deleteCheckin(btn.dataset.id);
                        this.loadData();
                        App.showToast('已撤销', 'info');
                    } catch (err) {
                        App.showToast('撤销失败', 'error');
                    }
                });
            });
        }
    },

    async addWater(amount) {
        try {
            const result = await API.addCheckin({
                type: 'water',
                amount: amount,
                assignee: this.currentAssignee
            });
            this.todayTotal = result.total;
            this.loadData();

            const glass = document.getElementById('glass-container');
            glass.classList.add('glass-pulse');
            setTimeout(() => glass.classList.remove('glass-pulse'), 600);

            App.showToast(`💧 +${amount}ml`, 'success');
        } catch (err) {
            App.showToast('记录失败', 'error');
        }
    }
};
