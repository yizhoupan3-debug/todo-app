/**
 * Monthly View — calendar grid with task dots and day detail panel.
 */
const MonthlyView = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-indexed
    selectedDate: null,
    monthData: [],

    init() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
    },

    setMonth(year, month) {
        this.currentYear = year;
        this.currentMonth = month;
        this.selectedDate = null;
        this.updateDateDisplay();
        this.loadMonth();
    },

    updateDateDisplay() {
        const months = ['一月', '二月', '三月', '四月', '五月', '六月',
            '七月', '八月', '九月', '十月', '十一月', '十二月'];
        document.getElementById('date-display').textContent =
            `${this.currentYear}年 ${months[this.currentMonth]}`;
        document.getElementById('header-title').textContent = '月度总览';
    },

    async loadMonth() {
        const monthStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
        try {
            const assignee = App.currentAssignee;
            this.monthData = await API.getMonthSummary(monthStr, assignee !== 'all' ? assignee : undefined);
            this.renderCalendar();
        } catch (err) {
            App.showToast('加载月视图失败: ' + err.message, 'error');
        }
    },

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

        // Build day data map
        const dayMap = {};
        for (const row of this.monthData) {
            if (!dayMap[row.due_date]) {
                dayMap[row.due_date] = { total: 0, done: 0, colors: [] };
            }
            dayMap[row.due_date].total += row.count;
            if (row.status === 'done') dayMap[row.due_date].done += row.count;
            if (row.category_color && !dayMap[row.due_date].colors.includes(row.category_color)) {
                dayMap[row.due_date].colors.push(row.category_color);
            }
        }

        // Calendar structure
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        // Monday = 0 (ISO week format)
        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        let html = '<div class="calendar-header-row">';
        for (const wd of weekdays) {
            html += `<div class="calendar-header-cell">${wd}</div>`;
        }
        html += '</div><div class="calendar-body">';

        // Previous month padding
        const prevMonth = new Date(this.currentYear, this.currentMonth, 0);
        for (let i = startDow - 1; i >= 0; i--) {
            const day = prevMonth.getDate() - i;
            html += `<div class="calendar-cell other-month"><div class="calendar-day-num">${day}</div></div>`;
        }

        // Current month days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === this.selectedDate;
            const data = dayMap[dateStr];

            let classes = 'calendar-cell';
            if (isToday) classes += ' today';
            if (isSelected) classes += ' selected';

            let dotsHtml = '';
            if (data) {
                const colors = data.colors.length > 0 ? data.colors : ['#6366f1'];
                dotsHtml = '<div class="calendar-dots">';
                const dotCount = Math.min(data.total, 6);
                for (let i = 0; i < dotCount; i++) {
                    const color = colors[i % colors.length];
                    dotsHtml += `<div class="calendar-dot" style="background:${color}"></div>`;
                }
                if (data.total > 6) {
                    dotsHtml += `<span class="calendar-task-count">+${data.total - 6}</span>`;
                }
                dotsHtml += '</div>';
            }

            html += `
        <div class="${classes}" data-date="${dateStr}">
          <div class="calendar-day-num">${d}</div>
          ${dotsHtml}
        </div>
      `;
        }

        // Next month padding
        const totalCells = startDow + lastDay.getDate();
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="calendar-cell other-month"><div class="calendar-day-num">${i}</div></div>`;
        }

        html += '</div>';
        grid.innerHTML = html;

        // Bind click events
        grid.querySelectorAll('.calendar-cell:not(.other-month)').forEach(cell => {
            cell.addEventListener('click', () => {
                const date = cell.dataset.date;
                if (date) this.selectDate(date);
            });
        });

        // Show detail if selected
        if (this.selectedDate) {
            this.loadDayDetail(this.selectedDate);
        } else {
            document.getElementById('day-detail-title').textContent = '点击日期查看任务';
            document.getElementById('day-detail-list').innerHTML = '';
        }
    },

    selectDate(dateStr) {
        this.selectedDate = dateStr;
        // Update selected class
        document.querySelectorAll('.calendar-cell.selected').forEach(c => c.classList.remove('selected'));
        const cell = document.querySelector(`.calendar-cell[data-date="${dateStr}"]`);
        if (cell) cell.classList.add('selected');

        this.loadDayDetail(dateStr);
    },

    async loadDayDetail(dateStr) {
        const [y, m, d] = dateStr.split('-');
        document.getElementById('day-detail-title').textContent = `${parseInt(m)}月${parseInt(d)}日 任务`;

        try {
            const params = { date: dateStr };
            const assignee = App.currentAssignee;
            if (assignee !== 'all') params.assignee = assignee;

            const tasks = await API.getTasks(params);
            const list = document.getElementById('day-detail-list');

            if (tasks.length === 0) {
                list.innerHTML = '<div class="empty-state"><div class="empty-state-text">📭 这天没有任务</div></div>';
                return;
            }

            list.innerHTML = tasks.map(task => DailyView.renderTaskCard(task)).join('');

            // Bind events
            list.querySelectorAll('.task-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.task-checkbox')) return;
                    const taskId = parseInt(card.dataset.taskId);
                    const task = tasks.find(t => t.id === taskId);
                    if (task) TaskModal.openEdit(task);
                });
            });

            list.querySelectorAll('.task-checkbox').forEach(cb => {
                cb.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const taskId = parseInt(cb.closest('.task-card').dataset.taskId);
                    const task = tasks.find(t => t.id === taskId);
                    if (!task) return;
                    const nextStatus = task.status === 'done' ? 'todo' : 'done';
                    try {
                        const updated = await API.updateTask(taskId, { status: nextStatus });
                        App.socket.emit('task:updated', updated);
                        this.loadMonth();
                    } catch (err) {
                        App.showToast('更新失败', 'error');
                    }
                });
            });
        } catch (err) {
            App.showToast('加载日详情失败', 'error');
        }
    },

    prevMonth() {
        let m = this.currentMonth - 1;
        let y = this.currentYear;
        if (m < 0) { m = 11; y--; }
        this.setMonth(y, m);
    },

    nextMonth() {
        let m = this.currentMonth + 1;
        let y = this.currentYear;
        if (m > 11) { m = 0; y++; }
        this.setMonth(y, m);
    },

    goToday() {
        const now = new Date();
        this.setMonth(now.getFullYear(), now.getMonth());
    },

    refresh() {
        this.loadMonth();
    }
};
