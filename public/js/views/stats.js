/**
 * StatsView — Statistics & Analytics dashboard.
 */
const StatsView = {
    currentRange: 'week', // 'week' | 'month'
    currentAssignee: '潘潘',
    data: null,

    init() {
        // Range toggles
        document.querySelectorAll('.stats-range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.stats-range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentRange = btn.dataset.range;
                this.load();
            });
        });

        // Person filter
        document.querySelectorAll('.stats-person-filter .filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.stats-person-filter .filter-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentAssignee = btn.dataset.assignee;
                this.load();
            });
        });

        // Card click → scroll to section
        document.querySelectorAll('.stats-card.overview').forEach(card => {
            card.addEventListener('click', () => {
                const target = card.dataset.section;
                if (target) {
                    const el = document.getElementById(target);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    },

    open() {
        // Delegate to unified switchView to ensure consistent state
        if (App.currentView !== 'stats') {
            App.switchView('stats');
            return;
        }
        this.load();
    },

    async load() {
        try {
            this.data = await API.getStats({
                range: this.currentRange,
                assignee: this.currentAssignee
            });
            this.render();
        } catch (err) {
            App.showToast('加载统计数据失败', 'error');
        }
    },

    render() {
        if (!this.data) return;
        this.renderOverview();
        this.renderTaskChart();
        this.renderWaterChart();
        this.renderWakeupHeatmap();
        this.renderPomodoroCard();
    },

    // ===== Overview summary cards =====
    renderOverview() {
        const d = this.data;
        const totalTasks = d.tasks.reduce((a, b) => a + b, 0);
        const totalWater = d.water.reduce((a, b) => a + b, 0);
        const wakeupDays = d.wakeup.filter(w => w !== null).length;
        const totalPomoMinutes = d.pomodoro.reduce((a, b) => a + b.minutes, 0);
        const totalPomoRounds = d.pomodoro.reduce((a, b) => a + b.rounds, 0);
        const rangeDays = d.dates.length;

        document.getElementById('stat-total-tasks').textContent = totalTasks;
        document.getElementById('stat-avg-tasks').textContent = (totalTasks / rangeDays).toFixed(1);
        document.getElementById('stat-total-water').textContent = (totalWater / 1000).toFixed(1) + 'L';
        document.getElementById('stat-avg-water').textContent = Math.round(totalWater / rangeDays) + 'ml';
        document.getElementById('stat-wakeup-days').textContent = `${wakeupDays}/${rangeDays}`;
        document.getElementById('stat-pomo-minutes').textContent = totalPomoMinutes;
        document.getElementById('stat-pomo-rounds').textContent = totalPomoRounds;
    },

    // ===== Task completion bar chart =====
    renderTaskChart() {
        const container = document.getElementById('stats-task-chart');
        const d = this.data;
        const max = Math.max(...d.tasks, 1);

        container.innerHTML = d.dates.map((date, i) => {
            const count = d.tasks[i];
            const h = Math.round((count / max) * 100);
            const label = date.slice(5); // MM-DD
            const isToday = date === this._getToday();
            return `<div class="chart-bar-wrapper${isToday ? ' today' : ''}">
                <div class="chart-bar-value">${count || ''}</div>
                <div class="chart-bar" style="height:${h}%"
                     title="${date}: ${count} 个任务完成"></div>
                <div class="chart-bar-label">${label}</div>
            </div>`;
        }).join('');
    },

    // ===== Water intake bar chart with goal line =====
    renderWaterChart() {
        const container = document.getElementById('stats-water-chart');
        const d = this.data;
        const goalLine = d.waterGoal;
        const max = Math.max(...d.water, goalLine, 1);

        const goalPercent = Math.round((goalLine / max) * 100);

        container.innerHTML = `
            <div class="chart-goal-line" style="bottom:${goalPercent}%">
                <span class="chart-goal-label">${goalLine}ml</span>
            </div>
            ${d.dates.map((date, i) => {
            const amount = d.water[i];
            const h = Math.round((amount / max) * 100);
            const label = date.slice(5);
            const reached = amount >= goalLine;
            const isToday = date === this._getToday();
            return `<div class="chart-bar-wrapper${isToday ? ' today' : ''}">
                    <div class="chart-bar-value">${amount > 0 ? (amount >= 1000 ? (amount / 1000).toFixed(1) + 'L' : amount + 'ml') : ''}</div>
                    <div class="chart-bar water${reached ? ' reached' : ''}" style="height:${h}%"
                         title="${date}: ${amount}ml"></div>
                    <div class="chart-bar-label">${label}</div>
                </div>`;
        }).join('')}
        `;
    },

    // ===== Wakeup heatmap grid =====
    renderWakeupHeatmap() {
        const container = document.getElementById('stats-wakeup-grid');
        const d = this.data;
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

        container.innerHTML = d.dates.map((date, i) => {
            const checked = d.wakeup[i] !== null;
            const dayOfWeek = new Date(date).getDay();
            const label = date.slice(5);
            const isToday = date === this._getToday();
            let timeLabel = '';
            if (checked && d.wakeup[i]) {
                const t = d.wakeup[i].split(' ')[1];
                if (t) timeLabel = t.slice(0, 5);
            }
            return `<div class="heatmap-cell${checked ? ' checked' : ''}${isToday ? ' today' : ''}"
                        title="${date} ${checked ? '✅ ' + timeLabel : '未打卡'}">
                <div class="heatmap-day">${weekdays[dayOfWeek]}</div>
                <div class="heatmap-icon">${checked ? '✅' : '⬜'}</div>
                <div class="heatmap-date">${label}</div>
            </div>`;
        }).join('');
    },

    // ===== Pomodoro summary card =====
    renderPomodoroCard() {
        const d = this.data;
        const totalMinutes = d.pomodoro.reduce((a, b) => a + b.minutes, 0);
        const totalRounds = d.pomodoro.reduce((a, b) => a + b.rounds, 0);
        const activeDays = d.pomodoro.filter(p => p.minutes > 0).length;

        // Ring progress: based on a rough goal (e.g., 25 min/day * range days)
        const goalMinutes = d.dates.length * 25;
        const ringPercent = Math.min((totalMinutes / goalMinutes) * 100, 100);
        const circumference = 2 * Math.PI * 54;
        const offset = circumference * (1 - ringPercent / 100);

        const ring = document.getElementById('stats-pomo-ring-progress');
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = offset;

        document.getElementById('stats-pomo-ring-text').textContent = `${totalMinutes}min`;
        document.getElementById('stats-pomo-active-days').textContent = activeDays;

        // Per-day mini bars
        const container = document.getElementById('stats-pomo-bars');
        const max = Math.max(...d.pomodoro.map(p => p.minutes), 1);
        container.innerHTML = d.dates.map((date, i) => {
            const m = d.pomodoro[i].minutes;
            const h = Math.round((m / max) * 100);
            const isToday = date === this._getToday();
            return `<div class="pomo-mini-bar${isToday ? ' today' : ''}" style="height:${h}%" title="${date}: ${m}分钟"></div>`;
        }).join('');
    },

    _getToday() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
};
