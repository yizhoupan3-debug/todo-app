/**
 * Monthly View — calendar grid showing task titles directly in cells.
 * Person filter pills + status filter (全部/未完成/已完成).
 * Clicking a date navigates to daily view for that date with the same person filter.
 */
const MonthlyView = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    monthTasks: [],
    localAssignee: 'all',
    statusFilter: 'all', // 'all' | 'todo' | 'done'

    init() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.bindToolbar();
        this.bindScrollNav();
    },

    bindScrollNav() {
        const grid = document.getElementById('calendar-grid');
        let scrollTimer = null;
        grid.addEventListener('scroll', () => {
            if (scrollTimer) return;
            const threshold = 30;
            // Scrolled to bottom → next month
            if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - threshold) {
                scrollTimer = setTimeout(() => { scrollTimer = null; }, 600);
                this.nextMonth();
            }
            // Scrolled to top → prev month
            else if (grid.scrollTop <= threshold) {
                scrollTimer = setTimeout(() => { scrollTimer = null; }, 600);
                this.prevMonth();
                // Scroll to bottom of previous month so user can keep scrolling up
                setTimeout(() => { grid.scrollTop = grid.scrollHeight - grid.clientHeight - 1; }, 150);
            }
        });
    },

    bindToolbar() {
        // Person filter pills
        document.querySelectorAll('.monthly-person-filter .filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const assignee = btn.dataset.assignee;
                this.localAssignee = assignee;
                document.querySelectorAll('.monthly-person-filter .filter-pill').forEach(b =>
                    b.classList.toggle('active', b.dataset.assignee === assignee));
                this.loadMonth();
            });
        });

        // Status filter pills
        document.querySelectorAll('.monthly-status-filter .filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                this.statusFilter = status;
                document.querySelectorAll('.monthly-status-filter .filter-pill').forEach(b =>
                    b.classList.toggle('active', b.dataset.status === status));
                this.renderCalendar();
            });
        });
    },

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
        document.querySelectorAll('.monthly-person-filter .filter-pill').forEach(b =>
            b.classList.toggle('active', b.dataset.assignee === this.localAssignee));
    },

    async loadMonth() {
        const monthStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
        try {
            const params = { month: monthStr };
            if (this.localAssignee !== 'all') params.assignee = this.localAssignee;
            this.monthTasks = await API.getTasks(params);
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

        // Apply status filter to tasks
        let filteredTasks = this.monthTasks;
        if (this.statusFilter === 'todo') {
            filteredTasks = this.monthTasks.filter(t => t.status !== 'done');
        } else if (this.statusFilter === 'done') {
            filteredTasks = this.monthTasks.filter(t => t.status === 'done');
        }

        // Group tasks by date
        const dayTasks = {};
        for (const task of filteredTasks) {
            if (!task.due_date) continue;
            if (!dayTasks[task.due_date]) dayTasks[task.due_date] = [];
            dayTasks[task.due_date].push(task);
        }
        // Sort: todo first, done last
        for (const date in dayTasks) {
            dayTasks[date].sort((a, b) => {
                if (a.status === 'done' && b.status !== 'done') return 1;
                if (a.status !== 'done' && b.status === 'done') return -1;
                return a.priority - b.priority;
            });
        }

        // Calendar layout
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        let headerHtml = '<div class="calendar-header-row">';
        for (const wd of weekdays) {
            headerHtml += `<div class="calendar-header-cell">${wd}</div>`;
        }
        headerHtml += '</div>';

        const cells = [];
        const prevMonth = new Date(this.currentYear, this.currentMonth, 0);
        for (let i = startDow - 1; i >= 0; i--) {
            const day = prevMonth.getDate() - i;
            cells.push(`<div class="calendar-cell other-month"><div class="calendar-day-num">${day}</div></div>`);
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const tasks = dayTasks[dateStr] || [];

            let classes = 'calendar-cell';
            if (isToday) classes += ' today-gold';

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

        const totalCells = startDow + lastDay.getDate();
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            cells.push(`<div class="calendar-cell other-month"><div class="calendar-day-num">${i}</div></div>`);
        }

        // Build body
        let bodyHtml = '<div class="calendar-body">';
        bodyHtml += cells.join('');
        bodyHtml += '</div>';

        grid.innerHTML = headerHtml + bodyHtml;

        // Click a date → navigate to daily view with same person filter
        grid.querySelectorAll('.calendar-cell:not(.other-month)').forEach(cell => {
            cell.addEventListener('click', () => {
                const date = cell.dataset.date;
                if (date) {
                    const [y, m, d] = date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    // Pass monthly person filter to daily view
                    App.currentAssignee = this.localAssignee;
                    App.switchView('daily');
                    DailyView.syncPersonPills();
                    DailyView.setDate(dateObj);
                }
            });
        });

        // Auto-scroll to today's row
        const todayCell = grid.querySelector('.today-gold');
        if (todayCell) {
            setTimeout(() => todayCell.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
        }
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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
