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
            const scope = App.currentAssignee === 'all' ? '（潘潘和蒲蒲的所有）' : `（${App.currentAssignee}的）`;
            if (!confirm(`确定要清除 ${doneCount} 个${scope}已完成的任务吗？`)) return;
            try {
                const dateStr = this.formatDate(this.currentDate);
                const result = await API.clearDoneTasks(dateStr, App.currentAssignee);
                App.socket.emit('task:deleted', {});
                this.loadTasks();
                App.showToast(`🗑️ 已清除 ${result.deleted} 个任务`, 'success');
            } catch (err) {
                App.showToast('清除失败: ' + err.message, 'error');
            }
        });
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
        try {
            const assignee = App.currentAssignee;
            const params = { date: dateStr };
            if (assignee !== 'all') params.assignee = assignee;

            const tasks = await API.getTasks(params);
            // Discard stale response if another load was triggered
            if (loadId !== this._loadId) return;
            this.tasks = tasks;
            this.render();
        } catch (err) {
            if (loadId !== this._loadId) return;
            App.showToast('加载失败: ' + err.message, 'error');
        }
    },

    render() {
        const groups = {
            todo: this.tasks.filter(t => t.status === 'todo' || t.status === 'in_progress'),
            done: this.tasks.filter(t => t.status === 'done'),
        };

        document.getElementById('count-todo').textContent = groups.todo.length;
        document.getElementById('count-done').textContent = groups.done.length;

        this.renderColumn('list-todo', groups.todo, 'todo');
        this.renderColumn('list-done', groups.done, 'done');

        // Refresh Lucide icons only within rendered task cards
        if (typeof lucide !== 'undefined') {
            const scope = document.getElementById('view-daily');
            if (scope) lucide.createIcons({ attrs: {}, node: scope });
        }
    },

    renderColumn(containerId, tasks, status) {
        const container = document.getElementById(containerId);
        if (tasks.length === 0) {
            const emptyTexts = {
                todo: '🎉 没有待办任务',
                done: '📭 还没有完成的任务',
            };
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-text">${emptyTexts[status]}</div>
        </div>
      `;
            return;
        }
        container.innerHTML = tasks.map(task => this.renderTaskCard(task)).join('');

        // Bind events
        container.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.task-checkbox')) return;
                if (e.target.closest('.task-pomodoro-btn')) return;
                const taskId = parseInt(card.dataset.taskId);
                const task = this.tasks.find(t => t.id === taskId);
                if (task) TaskModal.openEdit(task);
            });
        });

        // Pomodoro buttons
        container.querySelectorAll('.task-pomodoro-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = parseInt(btn.closest('.task-card').dataset.taskId);
                const task = this.tasks.find(t => t.id === taskId);
                if (task) Pomodoro.openForTask(task);
            });
        });

        container.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.addEventListener('click', async (e) => {
                e.stopPropagation();
                const card = cb.closest('.task-card');
                const taskId = parseInt(card.dataset.taskId);
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                const nextStatus = task.status === 'done' ? 'todo' : 'done';

                // Optimistic UI: instantly update visual state
                task.status = nextStatus;
                card.classList.toggle('done', nextStatus === 'done');
                cb.classList.toggle('checked', nextStatus === 'done');
                card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                card.style.opacity = '0.6';
                card.style.transform = 'scale(0.97)';

                try {
                    const updated = await API.updateTask(taskId, { status: nextStatus });
                    App.socket.emit('task:updated', updated);
                    if (nextStatus === 'done' && updated.coinsEarned > 0) {
                        App.syncCoins({ assignee: task.assignee, delta: updated.coinsEarned, animate: true });
                    }
                    // Full re-render to move card to correct column
                    this.loadTasks();
                    if (nextStatus === 'done') {
                        const rewardMsg = updated.coinsEarned > 0 ? ` +${updated.coinsEarned} 喵喵币` : '';
                        App.showToast(`✅ 任务完成！${rewardMsg}`, 'success');
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
        const assigneeImg = task.assignee === '潘潘' ? '<img class="tag-avatar" src="/img/panpan.png" alt="">' : '<img class="tag-avatar" src="/img/pupu.png" alt="">';

        let metaTags = '';
        if (task.category_name) {
            metaTags += `<span class="task-tag category" style="background:${task.category_color}22;color:${task.category_color}">${task.category_icon || ''} ${task.category_name}</span>`;
        }
        if (task.due_time) {
            metaTags += `<span class="task-tag time">🕐 ${task.due_time}</span>`;
        }
        if (App.currentAssignee === 'all') {
            metaTags += `<span class="task-tag assignee">${assigneeImg} ${task.assignee}</span>`;
        }
        if (task.recurring_parent_id || task.is_recurring) {
            metaTags += `<span class="task-tag recurring">🔄 重复</span>`;
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

    refresh() {
        this.loadTasks();
    }
};
