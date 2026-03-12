/**
 * Monthly View — calendar grid with task dots, person filter,
 * display‐mode toggle (full / float), gold‐bordered today,
 * and day‐detail modal.
 */
const MonthlyView = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-indexed
    selectedDate: null,
    monthData: [],
    displayMode: 'full', // 'full' | 'float'
    localAssignee: 'all', // independent of App.currentAssignee

    init() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.bindToolbar();
        this.bindDayDetailModal();
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

    /* ===== Day Detail Modal ===== */
    bindDayDetailModal() {
        const overlay = document.getElementById('day-detail-overlay');
        const closeBtn = document.getElementById('day-detail-close');

        closeBtn.addEventListener('click', () => this.closeDayDetail());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeDayDetail();
        });
    },

    openDayDetail() {
        document.getElementById('day-detail-overlay').classList.remove('hidden');
    },

    closeDayDetail() {
        document.getElementById('day-detail-overlay').classList.add('hidden');
    },

    /* ===== Month navigation ===== */
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

    syncLocalAssignee() {
        // Sync filter pills with global assignee when switching to monthly view
        this.localAssignee = App.currentAssignee;
        document.querySelectorAll('.filter-pill').forEach(b =>
            b.classList.toggle('active', b.dataset.assignee === this.localAssignee));
    },

    /* ===== Data loading ===== */
    async loadMonth() {
        const monthStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
        try {
            const assignee = this.localAssignee;
            this.monthData = await API.getMonthSummary(monthStr, assignee !== 'all' ? assignee : undefined);
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

        // Header row
        let headerHtml = '<div class="calendar-header-row">';
        for (const wd of weekdays) {
            headerHtml += `<div class="calendar-header-cell">${wd}</div>`;
        }
        headerHtml += '</div>';

        // Build all cells into a flat array
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
            const isSelected = dateStr === this.selectedDate;
            const data = dayMap[dateStr];

            let classes = 'calendar-cell';
            if (isToday) classes += ' today-gold';
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

            // Progress bar for days with tasks
            let progressHtml = '';
            if (data && data.total > 0) {
                const pct = Math.round((data.done / data.total) * 100);
                progressHtml = `<div class="calendar-progress"><div class="calendar-progress-bar" style="width:${pct}%"></div></div>`;
            }

            cells.push(`
        <div class="${classes}" data-date="${dateStr}">
          <div class="calendar-day-num">${d}</div>
          ${dotsHtml}
          ${progressHtml}
        </div>
      `);
        }

        // Next month padding
        const totalCells = startDow + lastDay.getDate();
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            cells.push(`<div class="calendar-cell other-month"><div class="calendar-day-num">${i}</div></div>`);
        }

        // Split cells into weeks (rows of 7)
        const weeks = [];
        for (let i = 0; i < cells.length; i += 7) {
            weeks.push(cells.slice(i, i + 7));
        }

        // Apply display mode
        let orderedWeeks = weeks;
        if (this.displayMode === 'float') {
            // Find which week row contains today
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

        // Build body HTML
        let bodyHtml = '<div class="calendar-body">';
        orderedWeeks.forEach((week, weekIdx) => {
            const isCurrentWeek = this.displayMode === 'float' && weekIdx === 0;
            week.forEach(cellHtml => {
                if (isCurrentWeek) {
                    // Add current-week class to cells
                    bodyHtml += cellHtml.replace('class="calendar-cell', 'class="calendar-cell current-week');
                } else {
                    bodyHtml += cellHtml;
                }
            });
        });
        bodyHtml += '</div>';

        grid.innerHTML = headerHtml + bodyHtml;

        // Bind click events
        grid.querySelectorAll('.calendar-cell:not(.other-month)').forEach(cell => {
            cell.addEventListener('click', () => {
                const date = cell.dataset.date;
                if (date) this.selectDate(date);
            });
        });
    },

    /* ===== Date selection ===== */
    selectDate(dateStr) {
        this.selectedDate = dateStr;
        // Update selected class
        document.querySelectorAll('.calendar-cell.selected').forEach(c => c.classList.remove('selected'));
        const cell = document.querySelector(`.calendar-cell[data-date="${dateStr}"]`);
        if (cell) cell.classList.add('selected');

        this.loadDayDetail(dateStr);
    },

    /* ===== Day detail (modal) ===== */
    async loadDayDetail(dateStr) {
        const [y, m, d] = dateStr.split('-');
        document.getElementById('day-detail-title').textContent = `${parseInt(m)}月${parseInt(d)}日 任务`;

        // Show modal immediately with loading state
        const list = document.getElementById('day-detail-list');
        list.innerHTML = '<div class="empty-state"><div class="empty-state-text">加载中...</div></div>';
        this.openDayDetail();

        try {
            const params = { date: dateStr };
            const assignee = this.localAssignee;
            if (assignee !== 'all') params.assignee = assignee;

            const tasks = await API.getTasks(params);

            if (tasks.length === 0) {
                list.innerHTML = '<div class="empty-state"><div class="empty-state-text">📭 这天没有任务</div></div>';
                return;
            }

            list.innerHTML = tasks.map(task => DailyView.renderTaskCard(task)).join('');

            // Bind card click → open edit modal
            list.querySelectorAll('.task-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.task-checkbox')) return;
                    const taskId = parseInt(card.dataset.taskId);
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                        this.closeDayDetail();
                        TaskModal.openEdit(task);
                    }
                });
            });

            // Bind checkbox toggle
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
                        this.loadDayDetail(dateStr); // Refresh the modal
                    } catch (err) {
                        App.showToast('更新失败', 'error');
                    }
                });
            });
        } catch (err) {
            App.showToast('加载日详情失败', 'error');
        }
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
