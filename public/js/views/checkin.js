/**
 * Checkin View — Water tracking with glass visualization.
 */
const CheckinView = {
    currentAssignee: '潘潘',
    todayTotal: 0,
    dailyGoal: 2000, // ml
    records: [],

    init() {
        // Person toggle
        document.querySelectorAll('.checkin-person-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentAssignee = btn.dataset.assignee;
                document.querySelectorAll('.checkin-person-btn').forEach(b =>
                    b.classList.toggle('active', b.dataset.assignee === this.currentAssignee));
                this.load();
            });
        });

        // Quick-add buttons
        document.querySelectorAll('.water-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount);
                this.addWater(amount);
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
    },

    open() {
        // Show checkin view, hide others
        document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
        document.getElementById('view-checkin').classList.remove('hidden');

        // Update header
        document.getElementById('header-title').textContent = '打卡';
        document.getElementById('date-nav').style.display = 'none';

        // Update nav active states
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('nav-checkin').classList.add('active');
        document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));

        App.currentView = 'checkin';
        this.load();
    },

    async load() {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        try {
            const data = await API.getCheckin({
                date: dateStr,
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
        // Update glass fill
        const percent = Math.min((this.todayTotal / this.dailyGoal) * 100, 100);
        document.getElementById('glass-water').style.height = percent + '%';

        // Update count text
        document.getElementById('water-amount-text').textContent = this.todayTotal;
        document.getElementById('water-goal-text').textContent = this.dailyGoal;

        // Color based on progress
        const water = document.getElementById('glass-water');
        if (percent >= 100) {
            water.style.background = 'linear-gradient(180deg, #22c55e, #16a34a)';
        } else if (percent >= 50) {
            water.style.background = 'linear-gradient(180deg, #60a5fa, #3b82f6)';
        } else {
            water.style.background = 'linear-gradient(180deg, #93c5fd, #60a5fa)';
        }

        // Progress text
        const progressEl = document.getElementById('water-progress-label');
        if (percent >= 100) {
            progressEl.textContent = '🎉 目标达成！';
            progressEl.style.color = '#22c55e';
        } else {
            progressEl.textContent = `还差 ${this.dailyGoal - this.todayTotal}ml`;
            progressEl.style.color = '';
        }

        // Render records log
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

            // Bind undo buttons
            log.querySelectorAll('.water-log-undo').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        const result = await API.deleteCheckin(btn.dataset.id);
                        this.todayTotal = result.total;
                        this.load();
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
            this.load();

            // Animate glass
            const glass = document.getElementById('glass-container');
            glass.classList.add('glass-pulse');
            setTimeout(() => glass.classList.remove('glass-pulse'), 600);

            App.showToast(`💧 +${amount}ml`, 'success');
        } catch (err) {
            App.showToast('记录失败', 'error');
        }
    }
};
