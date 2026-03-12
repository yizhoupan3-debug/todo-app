/**
 * Monthly View — Continuous scrollable calendar.
 * Renders 3 months at a time with smooth scroll and IntersectionObserver
 * header tracking. Scrolling near edges loads more months.
 */
const MonthlyView = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    monthTasks: {},        // keyed by 'YYYY-MM'
    localAssignee: 'all',
    statusFilter: 'all',
    visibleYear: null,
    visibleMonth: null,
    observer: null,
    loadingMore: false,
    _loadId: 0,            // Race condition guard
    renderedMonths: [],    // ['2026-02', '2026-03', '2026-04']

    init() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.bindToolbar();
        this.bindScrollEdge();
    },

    bindToolbar() {
        document.querySelectorAll('.monthly-person-filter .filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const assignee = btn.dataset.assignee;
                this.localAssignee = assignee;
                document.querySelectorAll('.monthly-person-filter .filter-pill').forEach(b =>
                    b.classList.toggle('active', b.dataset.assignee === assignee));
                this.fullReload();
            });
        });

        document.querySelectorAll('.monthly-status-filter .filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                this.statusFilter = status;
                document.querySelectorAll('.monthly-status-filter .filter-pill').forEach(b =>
                    b.classList.toggle('active', b.dataset.status === status));
                this.fullReload();
            });
        });
    },

    bindScrollEdge() {
        const grid = document.getElementById('calendar-grid');
        let debounce = null;
        grid.addEventListener('scroll', () => {
            if (this.loadingMore) return;
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                const threshold = 50;
                // Near bottom → append next month
                if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - threshold) {
                    this.appendMonth();
                }
                // Near top → prepend previous month
                if (grid.scrollTop <= threshold) {
                    this.prependMonth();
                }
            }, 80);
        });
    },

    setMonth(year, month) {
        this.currentYear = year;
        this.currentMonth = month;
        this.visibleYear = year;
        this.visibleMonth = month;
        this.updateDateDisplay();
        this.fullReload();
    },

    updateDateDisplay() {
        const y = this.visibleYear || this.currentYear;
        const m = this.visibleMonth != null ? this.visibleMonth : this.currentMonth;
        const months = ['一月', '二月', '三月', '四月', '五月', '六月',
            '七月', '八月', '九月', '十月', '十一月', '十二月'];
        document.getElementById('date-display').textContent = `${y}年 ${months[m]}`;
        document.getElementById('header-title').textContent = '月度总览';
    },

    syncLocalAssignee() {
        this.localAssignee = App.currentAssignee;
        document.querySelectorAll('.monthly-person-filter .filter-pill').forEach(b =>
            b.classList.toggle('active', b.dataset.assignee === this.localAssignee));
    },

    _monthKey(y, m) {
        return `${y}-${String(m + 1).padStart(2, '0')}`;
    },

    async _loadMonthTasks(y, m) {
        const key = this._monthKey(y, m);
        const params = { month: key };
        if (this.localAssignee !== 'all') params.assignee = this.localAssignee;
        try {
            this.monthTasks[key] = await API.getTasks(params);
        } catch (err) {
            this.monthTasks[key] = [];
        }
    },

    async fullReload() {
        const grid = document.getElementById('calendar-grid');
        const loadId = ++this._loadId;
        this.renderedMonths = [];
        this.monthTasks = {};
        grid.innerHTML = '';

        // Setup observer for month headers
        this._setupObserver();

        // Load and render 3 months: prev, current, next
        const months = this._getSurroundingMonths(this.currentYear, this.currentMonth);
        await Promise.all(months.map(([y, m]) => this._loadMonthTasks(y, m)));

        // Discard stale response
        if (loadId !== this._loadId) return;

        // Render sticky weekday header
        const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
        let headerHtml = '<div class="calendar-header-row sticky-header">';
        for (const wd of weekdays) {
            headerHtml += `<div class="calendar-header-cell">${wd}</div>`;
        }
        headerHtml += '</div>';
        grid.innerHTML = headerHtml;

        for (const [y, m] of months) {
            this._renderMonth(y, m, grid);
        }

        // Scroll to current month
        const currentMarker = grid.querySelector(`[data-month-key="${this._monthKey(this.currentYear, this.currentMonth)}"]`);
        if (currentMarker) {
            setTimeout(() => currentMarker.scrollIntoView({ block: 'start' }), 50);
        }
    },

    _getSurroundingMonths(y, m) {
        const result = [];
        // Previous month
        let pm = m - 1, py = y;
        if (pm < 0) { pm = 11; py--; }
        result.push([py, pm]);
        // Current month
        result.push([y, m]);
        // Next month
        let nm = m + 1, ny = y;
        if (nm > 11) { nm = 0; ny++; }
        result.push([ny, nm]);
        return result;
    },

    _setupObserver() {
        if (this.observer) this.observer.disconnect();
        const grid = document.getElementById('calendar-grid');
        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const key = entry.target.dataset.monthKey;
                    if (key) {
                        const [y, m] = key.split('-').map(Number);
                        this.visibleYear = y;
                        this.visibleMonth = m - 1;
                        this.updateDateDisplay();
                        // Also update nav arrows context
                        this.currentYear = y;
                        this.currentMonth = m - 1;
                    }
                }
            }
        }, {
            root: grid,
            rootMargin: '-40% 0px -55% 0px', // trigger when label is near top
            threshold: 0
        });
    },

    _renderMonth(y, m, grid) {
        const key = this._monthKey(y, m);
        if (this.renderedMonths.includes(key)) return;
        this.renderedMonths.push(key);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const months = ['一月', '二月', '三月', '四月', '五月', '六月',
            '七月', '八月', '九月', '十月', '十一月', '十二月'];

        // Month separator label
        const label = document.createElement('div');
        label.className = 'calendar-month-label';
        label.dataset.monthKey = key;
        label.textContent = `${y}年 ${months[m]}`;
        grid.appendChild(label);

        // Observe this label for header tracking
        this.observer.observe(label);

        // Filter tasks
        let tasks = this.monthTasks[key] || [];
        if (this.statusFilter === 'todo') tasks = tasks.filter(t => t.status !== 'done');
        else if (this.statusFilter === 'done') tasks = tasks.filter(t => t.status === 'done');

        // Group by date
        const dayTasks = {};
        for (const task of tasks) {
            if (!task.due_date) continue;
            if (!dayTasks[task.due_date]) dayTasks[task.due_date] = [];
            dayTasks[task.due_date].push(task);
        }
        for (const date in dayTasks) {
            dayTasks[date].sort((a, b) => {
                if (a.status === 'done' && b.status !== 'done') return 1;
                if (a.status !== 'done' && b.status === 'done') return -1;
                return a.priority - b.priority;
            });
        }

        // Calendar cells
        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0);
        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        const body = document.createElement('div');
        body.className = 'calendar-body';

        // Leading blanks
        for (let i = 0; i < startDow; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            body.appendChild(cell);
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dTasks = dayTasks[dateStr] || [];

            const cell = document.createElement('div');
            cell.className = 'calendar-cell' + (isToday ? ' today-gold' : '');
            cell.dataset.date = dateStr;

            // Day number
            const numEl = document.createElement('div');
            numEl.className = 'calendar-day-num';
            numEl.textContent = d;
            cell.appendChild(numEl);

            // Tasks
            if (dTasks.length > 0) {
                const tasksEl = document.createElement('div');
                tasksEl.className = 'calendar-tasks';
                const maxShow = 3;
                for (let ti = 0; ti < Math.min(dTasks.length, maxShow); ti++) {
                    const task = dTasks[ti];
                    const item = document.createElement('div');
                    item.className = 'calendar-task-item' + (task.status === 'done' ? ' done' : '');
                    item.style.setProperty('--cat-color', task.category_color || '#6366f1');
                    item.textContent = task.title;
                    tasksEl.appendChild(item);
                }
                if (dTasks.length > maxShow) {
                    const more = document.createElement('div');
                    more.className = 'calendar-task-more';
                    more.textContent = `+${dTasks.length - maxShow} 更多`;
                    tasksEl.appendChild(more);
                }
                cell.appendChild(tasksEl);
            }

            // Click → daily view
            cell.addEventListener('click', () => {
                const [cy, cm, cd] = dateStr.split('-').map(Number);
                App.currentAssignee = this.localAssignee;
                App.switchView('daily');
                DailyView.syncPersonPills();
                DailyView.setDate(new Date(cy, cm - 1, cd));
            });

            body.appendChild(cell);
        }

        // Trailing blanks
        const totalCells = startDow + lastDay.getDate();
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < remaining; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            body.appendChild(cell);
        }

        grid.appendChild(body);
    },

    async appendMonth() {
        if (this.loadingMore || this.renderedMonths.length === 0) return;
        this.loadingMore = true;

        const lastKey = this.renderedMonths[this.renderedMonths.length - 1];
        const [ly, lm] = lastKey.split('-').map(Number);
        let ny = ly, nm = lm; // lm is 1-based
        nm++;
        if (nm > 12) { nm = 1; ny++; }

        await this._loadMonthTasks(ny, nm - 1);
        this._renderMonth(ny, nm - 1, document.getElementById('calendar-grid'));

        this.loadingMore = false;
    },

    async prependMonth() {
        if (this.loadingMore || this.renderedMonths.length === 0) return;
        this.loadingMore = true;

        const firstKey = this.renderedMonths[0];
        const [fy, fm] = firstKey.split('-').map(Number);
        let py = fy, pm = fm; // fm is 1-based
        pm--;
        if (pm < 1) { pm = 12; py--; }

        const grid = document.getElementById('calendar-grid');
        const scrollBefore = grid.scrollHeight;

        await this._loadMonthTasks(py, pm - 1);

        // We need to insert before the first month label
        const firstLabel = grid.querySelector('.calendar-month-label');
        if (firstLabel) {
            // Create temp container, render, then insert before first label
            const tempGrid = document.createElement('div');
            this._renderMonthToFragment(py, pm - 1, tempGrid);
            // Insert children before first label
            while (tempGrid.firstChild) {
                grid.insertBefore(tempGrid.firstChild, firstLabel);
            }
            this.renderedMonths.unshift(this._monthKey(py, pm - 1));
        }

        // Maintain scroll position
        const scrollAfter = grid.scrollHeight;
        grid.scrollTop += (scrollAfter - scrollBefore);

        this.loadingMore = false;
    },

    _renderMonthToFragment(y, m, container) {
        // Same as _renderMonth but into a container element
        const key = this._monthKey(y, m);
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
            '七月', '八月', '九月', '十月', '十一月', '十二月'];

        const label = document.createElement('div');
        label.className = 'calendar-month-label';
        label.dataset.monthKey = key;
        label.textContent = `${y}年 ${monthNames[m]}`;
        container.appendChild(label);
        this.observer.observe(label);

        let tasks = this.monthTasks[key] || [];
        if (this.statusFilter === 'todo') tasks = tasks.filter(t => t.status !== 'done');
        else if (this.statusFilter === 'done') tasks = tasks.filter(t => t.status === 'done');

        const dayTasks = {};
        for (const task of tasks) {
            if (!task.due_date) continue;
            if (!dayTasks[task.due_date]) dayTasks[task.due_date] = [];
            dayTasks[task.due_date].push(task);
        }
        for (const date in dayTasks) {
            dayTasks[date].sort((a, b) => {
                if (a.status === 'done' && b.status !== 'done') return 1;
                if (a.status !== 'done' && b.status === 'done') return -1;
                return a.priority - b.priority;
            });
        }

        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0);
        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        const body = document.createElement('div');
        body.className = 'calendar-body';

        for (let i = 0; i < startDow; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            body.appendChild(cell);
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dTasks = dayTasks[dateStr] || [];

            const cell = document.createElement('div');
            cell.className = 'calendar-cell' + (isToday ? ' today-gold' : '');
            cell.dataset.date = dateStr;

            const numEl = document.createElement('div');
            numEl.className = 'calendar-day-num';
            numEl.textContent = d;
            cell.appendChild(numEl);

            if (dTasks.length > 0) {
                const tasksEl = document.createElement('div');
                tasksEl.className = 'calendar-tasks';
                const maxShow = 3;
                for (let ti = 0; ti < Math.min(dTasks.length, maxShow); ti++) {
                    const task = dTasks[ti];
                    const item = document.createElement('div');
                    item.className = 'calendar-task-item' + (task.status === 'done' ? ' done' : '');
                    item.style.setProperty('--cat-color', task.category_color || '#6366f1');
                    item.textContent = task.title;
                    tasksEl.appendChild(item);
                }
                if (dTasks.length > maxShow) {
                    const more = document.createElement('div');
                    more.className = 'calendar-task-more';
                    more.textContent = `+${dTasks.length - maxShow} 更多`;
                    tasksEl.appendChild(more);
                }
                cell.appendChild(tasksEl);
            }

            cell.addEventListener('click', () => {
                const [cy, cm, cd] = dateStr.split('-').map(Number);
                App.currentAssignee = this.localAssignee;
                App.switchView('daily');
                DailyView.syncPersonPills();
                DailyView.setDate(new Date(cy, cm - 1, cd));
            });

            body.appendChild(cell);
        }

        const totalCells = startDow + lastDay.getDate();
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < remaining; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            body.appendChild(cell);
        }

        container.appendChild(body);
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

    // Alias for compatibility
    loadMonth() { this.fullReload(); },
    renderCalendar() { this.fullReload(); },

    refresh() {
        this.fullReload();
    }
};
