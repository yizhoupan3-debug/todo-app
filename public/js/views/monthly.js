/**
 * Monthly View — calendar grid showing task titles directly in cells.
 * Clicking a date navigates to daily view for that date.
 */
const MonthlyView = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-indexed
    monthTasks: [],
    displayMode: 'full', // 'full' | 'float'
    localAssignee: 'all',

    init() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.bindToolbar();
    },

    /* ===== Toolbar bindings ===== */
    bindToolbar() {
        // Person filter pills
        document.querySelectorAll('.filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const assignee = btn.dataset.assignee;
                this.localAssignee = assignee;
                document.querySelectorAll('.filter-pill').forEach(b =>
                    b.classList.toggle('active', b.dataset.assignee === assignee));
                this.loadMonth();
            });
        });

        // Display mode switch
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.displayMode = mode;
                document.querySelectorAll('.mode-btn').forEach(b =>
                    b.classList.toggle('active', b.dataset.mode === mode));
                this.renderCalendar();
            });
        });
    },

    /* ===== Month navigation ===== */
    setMonth(year, month) {
        this.currentYear = year;
        this.currentMonth = month;
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

    syncLocalAssignee() {
        this.localAssignee = App.currentAssignee;
        document.querySelectorAll('.filter-pill').forEach(b =>
            b.classList.toggle('active', b.dataset.assignee === this.localAssignee));
    },

    /* ===== Data loading — full tasks for the month ===== */
    async loadMonth() {
        const monthStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
        try {
            const params = { month: monthStr };
            const assignee = this.localAssignee;
            if (assignee !== 'all') params.assignee = assignee;
            this.monthTasks = await API.getTasks(params);
            this.renderCalendar();
        } catch (err) {
            App.showToast('加载月视图失败: ' + err.message, 'error');
        }
    },

    /* ===== Calendar rendering ===== */
    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

        // Group tasks by date, sort: undone first, done last
        const dayTasks = {};
        for (const task of this.monthTasks) {
            if (!task.due_date) continue;
            if (!dayTasks[task.due_date]) dayTasks[task.due_date] = [];
            dayTasks[task.due_date].push(task);
        }
        // Sort each day: todo first, done last
        for (const date in dayTasks) {
            dayTasks[date].sort((a, b) => {
                if (a.status === 'done' && b.status !== 'done') return 1;
                if (a.status !== 'done' && b.status === 'done') return -1;
                return a.priority - b.priority;
            });
        }

        // Calendar structure
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        // Header row
        let headerHtml = '<div class="calendar-header-row">';
        for (const wd of weekdays) {
            headerHtml += `<div class="calendar-header-cell">${wd}</div>`;
        }
        headerHtml += '</div>';

        // Build cells
        const cells = [];

        // Previous month padding
        const prevMonth = new Date(this.currentYear, this.currentMonth, 0);
        for (let i = startDow - 1; i >= 0; i--) {
            const day = prevMonth.getDate() - i;
            cells.push(`<div class="calendar-cell other-month"><div class="calendar-day-num">${day}</div></div>`);
        }

        // Current month days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const tasks = dayTasks[dateStr] || [];

            let classes = 'calendar-cell';
            if (isToday) classes += ' today-gold';

            // Render compact task titles
            let tasksHtml = '';
            if (tasks.length > 0) {
                tasksHtml = '<div class="calendar-tasks">';
                const maxShow = 4;
                const shown = tasks.slice(0, maxShow);
                for (const task of shown) {
                    const isDone = task.status === 'done';
                    const color = task.category_color || '#6366f1';
                    tasksHtml += `<div class="calendar-task-item${isDone ? ' done' : ''}" style="--cat-color:${color}">`;
                    tasksHtml += this.escapeHtml(task.title);
                    tasksHtml += '</div>';
                }
                if (tasks.length > maxShow) {
                    tasksHtml += `<div class="calendar-task-more">+${tasks.length - maxShow} 更多</div>`;
                }
                tasksHtml += '</div>';
            }

            cells.push(`
        <div class="${classes}" data-date="${dateStr}">
          <div class="calendar-day-num">${d}</div>
          ${tasksHtml}
        </div>
      `);
        }

        // Next month padding
        const totalCells = startDow + lastDay.getDate();
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            cells.push(`<div class="calendar-cell other-month"><div class="calendar-day-num">${i}</div></div>`);
        }

        // Split into weeks
        const weeks = [];
        for (let i = 0; i < cells.length; i += 7) {
            weeks.push(cells.slice(i, i + 7));
        }

        // Apply display mode (float = current week first)
        let orderedWeeks = weeks;
        if (this.displayMode === 'float') {
            const todayDate = today.getDate();
            const isCurrentMonth = today.getFullYear() === this.currentYear && today.getMonth() === this.currentMonth;
            if (isCurrentMonth && weeks.length > 0) {
                const todayWeekIndex = Math.floor((startDow + todayDate - 1) / 7);
                if (todayWeekIndex >= 0 && todayWeekIndex < weeks.length) {
                    orderedWeeks = [
                        weeks[todayWeekIndex],
                        ...weeks.slice(todayWeekIndex + 1),
                        ...weeks.slice(0, todayWeekIndex),
                    ];
                }
            }
        }

        // Build body
        let bodyHtml = '<div class="calendar-body">';
        orderedWeeks.forEach((week, weekIdx) => {
            const isCurrentWeek = this.displayMode === 'float' && weekIdx === 0;
            week.forEach(cellHtml => {
                if (isCurrentWeek) {
                    bodyHtml += cellHtml.replace('class="calendar-cell', 'class="calendar-cell current-week');
                } else {
                    bodyHtml += cellHtml;
                }
            });
        });
        bodyHtml += '</div>';

        grid.innerHTML = headerHtml + bodyHtml;

        // Bind click: navigate to daily view for that date
        grid.querySelectorAll('.calendar-cell:not(.other-month)').forEach(cell => {
            cell.addEventListener('click', () => {
                const date = cell.dataset.date;
                if (date) {
                    // Switch to daily view for this date
                    const [y, m, d] = date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    App.switchView('daily');
                    DailyView.setDate(dateObj);
                }
            });
        });
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /* ===== Navigation helpers ===== */
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
