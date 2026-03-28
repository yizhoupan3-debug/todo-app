/**
 * Daily View — shows tasks for a single day in three columns.
 */
const DailyView = {
    currentDate: new Date(),
    tasks: [],
    _loadId: 0, // Race condition guard

    init() {
        this.currentDate = new Date();
        this.updateDateDisplay();
        this.syncPersonPills();

        // Person filter pills in daily toolbar
        document.querySelectorAll('.daily-person-filter .filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const assignee = btn.dataset.assignee;
                App.setPersona(assignee, { refresh: false });
                this.loadTasks();
            });
        });

        // Clear done button
        document.getElementById('btn-clear-done').addEventListener('click', async () => {
            const doneCount = this.tasks.filter(t => t.status === 'done').length;
            if (doneCount === 0) {
                App.showToast('没有已完成的任务', 'info');
                return;
            }
            const scope = `（${App.currentAssignee}的）`;
            if (!confirm(`确定要清除 ${doneCount} 个${scope}已完成的任务吗？`)) return;
            try {
                const dateStr = this.formatDate(this.currentDate);
                const result = await API.clearDoneTasks(dateStr, App.currentAssignee);
                App.socket.emit('task:deleted', {});
                this.loadTasks();
                App.showToast(`已清除 ${result.deleted} 个任务`, 'success');
            } catch (err) {
                App.showToast('清除失败: ' + err.message, 'error');
            }
        });

        // Date swipe gesture (mobile: swipe left/right to switch days)
        this._initDateSwipe();

        // Pull-to-refresh (mobile)
        const mainContent = document.getElementById('main-content');
        Utils.initPullToRefresh(mainContent, () => this.loadTasks());
    },

    _initDateSwipe() {
        if (!('ontouchstart' in window)) return;
        const view = document.getElementById('view-daily');
        if (!view) return;

        let startX = 0, startY = 0, isHoriz = null;
        const THRESHOLD = 60;

        view.addEventListener('touchstart', (e) => {
            // Don't capture swipe from task cards (they have their own swipe)
            if (e.target.closest('.task-card')) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isHoriz = null;
        }, { passive: true });

        view.addEventListener('touchmove', (e) => {
            if (e.target.closest('.task-card')) return;
            if (isHoriz !== null) return; // already determined
            const dx = Math.abs(e.touches[0].clientX - startX);
            const dy = Math.abs(e.touches[0].clientY - startY);
            if (dx + dy > 10) { // enough movement to determine direction
                isHoriz = dx > dy * 1.2;
            }
        }, { passive: true });

        view.addEventListener('touchend', (e) => {
            if (e.target.closest('.task-card')) return;
            if (isHoriz === false) return; // was vertical scroll

            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;

            // Only trigger if mostly horizontal and passes threshold
            if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;

            const columns = view.querySelector('.task-columns');
            const direction = dx > 0 ? 'right' : 'left';

            if (columns) {
                // Slide out animation
                columns.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
                columns.style.transform = `translateX(${direction === 'right' ? '30px' : '-30px'})`;
                columns.style.opacity = '0.3';

                setTimeout(() => {
                    // Change date
                    if (direction === 'right') this.prevDay();
                    else this.nextDay();

                    // Slide in from opposite side
                    columns.style.transition = 'none';
                    columns.style.transform = `translateX(${direction === 'right' ? '-30px' : '30px'})`;
                    columns.style.opacity = '0.3';

                    requestAnimationFrame(() => {
                        columns.style.transition = 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease';
                        columns.style.transform = '';
                        columns.style.opacity = '';
                    });
                }, 200);
            } else {
                if (direction === 'right') this.prevDay();
                else this.nextDay();
            }
        }, { passive: true });
    },

    syncPersonPills() {
        document.querySelectorAll('.daily-person-filter .filter-pill').forEach(b =>
            b.classList.toggle('active', b.dataset.assignee === App.currentAssignee));
    },

    setDate(date) {
        this.currentDate = date;
        this.updateDateDisplay();
        this.loadTasks();
    },

    updateDateDisplay() {
        const d = this.currentDate;
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();

        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const dateStr = `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;

        document.getElementById('date-display').textContent = dateStr;
        document.getElementById('header-title').textContent = isToday ? '今日任务' : '任务';
    },

    async loadTasks() {
        const dateStr = this.formatDate(this.currentDate);
        const loadId = ++this._loadId;

        // Show loading progress bar
        Utils.showLoading();

        // Show skeleton loading state (only if lists are empty or first load)
        const todoList = document.getElementById('list-todo');
        const doneList = document.getElementById('list-done');
        if (todoList && !todoList.querySelector('.task-card')) {
            const skeletonHTML = `<div class="skeleton-task-list">
                <div class="skeleton skeleton-card-rich"><div class="skeleton skeleton-check"></div><div class="skeleton-text"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-meta"></div></div></div>
                <div class="skeleton skeleton-card-rich"><div class="skeleton skeleton-check"></div><div class="skeleton-text"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-meta"></div></div></div>
                <div class="skeleton skeleton-card-rich"><div class="skeleton skeleton-check"></div><div class="skeleton-text"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-meta"></div></div></div>
            </div>`;
            todoList.innerHTML = skeletonHTML;
        }

        try {
            const assignee = App.currentAssignee;
            const params = { date: dateStr };
            if (assignee) params.assignee = assignee;

            const tasks = await API.getTasks(params);
            // Discard stale response if another load was triggered
            if (loadId !== this._loadId) return;
            this.tasks = tasks;
            this.render();
        } catch (err) {
            if (loadId !== this._loadId) return;
            App.showToast('加载失败: ' + err.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    render() {
        const groups = {
            todo: this.tasks.filter(t => t.status === 'todo' || t.status === 'in_progress'),
            done: this.tasks.filter(t => t.status === 'done'),
        };

        // Update counts with bounce animation
        this._updateCount('count-todo', groups.todo.length);
        this._updateCount('count-done', groups.done.length);

        // Update progress bar
        this._updateProgressBar(groups.todo.length, groups.done.length);

        this.renderColumn('list-todo', groups.todo, 'todo');
        this.renderColumn('list-done', groups.done, 'done');

        // Refresh Lucide icons only within rendered task cards
        if (typeof lucide !== 'undefined') {
            const scope = document.getElementById('view-daily');
            if (scope) lucide.createIcons({ attrs: {}, node: scope });
        }

        // Bind swipe gestures (mobile only)
        if (typeof SwipeGesture !== 'undefined') {
            const todoContainer = document.getElementById('list-todo');
            const doneContainer = document.getElementById('list-done');
            const swipeHandlers = {
                onComplete: (taskId) => {
                    const task = this.tasks.find(t => t.id === taskId);
                    if (!task) return;
                    const nextStatus = task.status === 'done' ? 'todo' : 'done';
                    task.status = nextStatus;
                    API.updateTask(taskId, { status: nextStatus }).then(updated => {
                        App.socket.emit('task:updated', updated);
                        if (nextStatus === 'done' && updated.coinsEarned > 0) {
                            App.syncCoins({ assignee: task.assignee, delta: updated.coinsEarned, animate: true });
                            App.showToast(`任务完成！+${updated.coinsEarned} 喵喵币`, 'success');
                        } else if (nextStatus === 'done') {
                            App.showToast('任务完成！', 'success');
                        }
                        this.loadTasks();
                    }).catch(() => {
                        task.status = nextStatus === 'done' ? 'todo' : 'done';
                        this.render();
                        App.showToast('更新失败', 'error');
                    });
                },
                onDelete: async (taskId) => {
                    const task = this.tasks.find(t => t.id === taskId);
                    if (!task) return;
                    if (!confirm(`确定要删除「${task.title}」吗？`)) {
                        this.render();
                        return;
                    }
                    // Animate card out
                    const card = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
                    if (card) card.classList.add('deleting');
                    try {
                        await API.deleteTask(taskId);
                        App.socket.emit('task:deleted', { id: taskId });
                        // Wait for delete animation to complete
                        await new Promise(r => setTimeout(r, 400));
                        this.loadTasks();
                        App.showToast('已删除', 'success');
                    } catch (err) {
                        if (card) card.classList.remove('deleting');
                        App.showToast('删除失败', 'error');
                    }
                }
            };
            SwipeGesture.bind(todoContainer, swipeHandlers);
            SwipeGesture.bind(doneContainer, swipeHandlers);
        }
    },

    renderColumn(containerId, tasks, status) {
        const container = document.getElementById(containerId);
        if (tasks.length === 0) {
            const emptyConfigs = {
                todo: { icon: '🐱', text: '暂无待办任务', hint: '点击右上角 + 添加任务' },
                done: { icon: '⭐', text: '还没有完成的任务', hint: '完成任务后会出现在这里' },
            };
            const cfg = emptyConfigs[status];
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${cfg.icon}</div>
          <div class="empty-state-text">${cfg.text}</div>
          <div class="empty-state-hint">${cfg.hint}</div>
        </div>
      `;
            return;
        }
        container.innerHTML = tasks.map(task => this.renderTaskCard(task)).join('');

        // Bind events via event delegation (avoids per-card rebinding on each render)
        this._bindContainerEvents(container, status);

        container.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.addEventListener('click', async (e) => {
                e.stopPropagation();
                const card = cb.closest('.task-card');
                const taskId = parseInt(card.dataset.taskId);
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                const nextStatus = task.status === 'done' ? 'todo' : 'done';
                const isCompleting = nextStatus === 'done';
                // Count remaining todos BEFORE the optimistic flip for accurate confetti check
                const todosBefore = this.tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length;

                // Optimistic UI: instantly update visual state
                task.status = nextStatus;
                card.classList.toggle('done', isCompleting);
                cb.classList.toggle('checked', isCompleting);

                if (isCompleting) {
                    // Completion animation: glow + check pop → card shrinks gently → holds → re-renders
                    card.classList.add('completing-glow');
                    cb.style.animation = 'none';
                    void cb.offsetWidth;
                    cb.style.animation = '';
                    card.style.transition = 'opacity 0.35s var(--transition-spring), transform 0.35s var(--transition-spring)';
                    card.style.opacity = '0.55';
                    card.style.transform = 'scale(0.96) translateX(6px)';
                    Utils.haptic('light');
                } else {
                    card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                    card.style.opacity = '0.7';
                    card.style.transform = 'scale(0.98)';
                }

                try {
                    const updated = await API.updateTask(taskId, { status: nextStatus });
                    App.socket.emit('task:updated', updated);
                    if (isCompleting && updated.coinsEarned > 0) {
                        App.syncCoins({ assignee: task.assignee, delta: updated.coinsEarned, animate: true });
                        // Coin float particle from checkbox position
                        const rect = cb.getBoundingClientRect();
                        const particle = document.createElement('span');
                        particle.className = 'coin-float-particle';
                        particle.textContent = `🪙 +${updated.coinsEarned}`;
                        particle.style.top = `${rect.top + rect.height / 2}px`;
                        particle.style.left = `${rect.right + 8}px`;
                        document.body.appendChild(particle);
                        particle.addEventListener('animationend', () => particle.remove(), { once: true });
                    }
                    // Hold briefly so animation completes before re-render
                    await new Promise(r => setTimeout(r, isCompleting ? 500 : 250));
                    this.loadTasks();
                    if (isCompleting) {
                        const rewardMsg = updated.coinsEarned > 0 ? ` +${updated.coinsEarned} 喵喵币` : '';
                        // This was the last remaining todo → confetti!
                        if (todosBefore === 1) {
                            Utils.haptic('success');
                            Utils.confetti();
                            App.showToast(`全部完成！太棒了！${rewardMsg}`, 'success');
                        } else {
                            App.showToast(`任务完成！${rewardMsg}`, 'success');
                        }
                    }
                } catch (err) {
                    // Rollback optimistic update
                    task.status = nextStatus === 'done' ? 'todo' : 'done';
                    this.render();
                    App.showToast('更新失败', 'error');
                }
            });
        });
    },

    renderTaskCard(task) {
        const isDone = task.status === 'done';

        let metaTags = '';
        if (task.category_name) {
            metaTags += `<span class="task-tag category" style="background:${task.category_color}22;color:${task.category_color}">${task.category_icon || ''} ${task.category_name}</span>`;
        }
        if (task.due_time) {
            let timeDisplay = task.due_time;
            if (task.end_time) timeDisplay += ` - ${task.end_time}`;
            metaTags += `<span class="task-tag time"><i data-lucide="clock-3" class="lucide-inline tag-icon"></i> ${timeDisplay}</span>`;
        }
        if (task.recurring_parent_id || task.is_recurring) {
            metaTags += `<span class="task-tag recurring"><i data-lucide="repeat" class="lucide-inline tag-icon"></i> 重复</span>`;
        }

        return `
      <div class="task-card ${isDone ? 'done' : ''}" data-task-id="${task.id}" data-priority="${task.priority}">
        <div class="task-card-header">
          <div class="task-checkbox ${isDone ? 'checked' : ''}"></div>
          <div class="task-card-title">${this.escapeHtml(task.title)}</div>
          ${!isDone ? '<button class="task-pomodoro-btn" title="番茄钟"><i data-lucide="timer" class="pomodoro-icon"></i></button>' : ''}
        </div>
        ${metaTags ? `<div class="task-card-meta">${metaTags}</div>` : ''}
      </div>
    `;
    },

    prevDay() {
        const d = new Date(this.currentDate);
        d.setDate(d.getDate() - 1);
        this.setDate(d);
    },

    nextDay() {
        const d = new Date(this.currentDate);
        d.setDate(d.getDate() + 1);
        this.setDate(d);
    },

    goToday() {
        this.setDate(new Date());
    },

    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    escapeHtml(str) {
        return Utils.escapeHtml(str);
    },

    /** Update a count badge with bounce animation when value changes */
    _updateCount(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        const oldVal = el.textContent;
        el.textContent = value;
        if (oldVal !== String(value)) {
            el.classList.add('section-count', 'bounce');
            el.addEventListener('animationend', () => el.classList.remove('bounce'), { once: true });
        }
    },

    /** Render or update a progress bar above the task columns */
    _updateProgressBar(todoCount, doneCount) {
        const total = todoCount + doneCount;
        const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
        let wrap = document.getElementById('daily-progress');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'daily-progress';
            wrap.className = 'daily-progress-wrap';
            const columns = document.querySelector('#view-daily .task-columns');
            if (columns) columns.parentNode.insertBefore(wrap, columns);
        }
        if (total === 0) {
            wrap.innerHTML = '';
            return;
        }
        const isComplete = pct >= 100;
        wrap.innerHTML = `
            <div class="daily-progress-bar">
                <div class="daily-progress-fill${isComplete ? ' complete' : ''}" style="width:${pct}%"></div>
            </div>
            <div class="daily-progress-label">
                <span>已完成 ${doneCount}/${total}</span>
                <span class="progress-pct">${pct}%${isComplete ? ' ✓' : ''}</span>
            </div>
        `;
    },

    refresh() {
        this.loadTasks();
    },

    /**
     * Bind a single delegated click handler on a task list container.
     * Avoids re-binding per card on every render call.
     */
    _bindContainerEvents(container) {
        if (container._delegated) return;
        container._delegated = true;
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.task-card');
            if (!card) return;
            const taskId = parseInt(card.dataset.taskId);

            // Pomodoro button
            if (e.target.closest('.task-pomodoro-btn')) {
                e.stopPropagation();
                const task = this.tasks.find(t => t.id === taskId);
                if (task) Pomodoro.openForTask(task);
                return;
            }

            // Checkbox handled separately (has its own listener)
            if (e.target.closest('.task-checkbox')) return;

            // Card click → open edit
            const task = this.tasks.find(t => t.id === taskId);
            if (task) TaskModal.openEdit(task);
        });
    }
};
