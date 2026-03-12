/**
 * Task Modal — handles create and edit of tasks.
 */
const TaskModal = {
    isOpen: false,
    editingTask: null,
    categories: [],

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('modal-close').addEventListener('click', () => this.close());
        document.getElementById('btn-cancel').addEventListener('click', () => this.close());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.close();
        });

        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.save();
        });

        document.getElementById('task-recurring').addEventListener('change', (e) => {
            document.getElementById('recurring-options').classList.toggle('hidden', !e.target.checked);
        });

        document.getElementById('btn-delete').addEventListener('click', () => this.delete());
    },

    async loadCategories() {
        try {
            this.categories = await API.getCategories();
            const select = document.getElementById('task-category');
            select.innerHTML = '<option value="">无分类</option>';
            for (const cat of this.categories) {
                select.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
            }
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    },

    openCreate() {
        this.editingTask = null;
        document.getElementById('modal-title').textContent = '新建任务';
        document.getElementById('btn-delete').classList.add('hidden');

        // Reset form
        document.getElementById('task-form').reset();
        document.getElementById('task-id').value = '';
        document.getElementById('recurring-options').classList.add('hidden');

        // Set default date to current view date
        if (App.currentView === 'daily') {
            document.getElementById('task-date').value = DailyView.formatDate(DailyView.currentDate);
        } else {
            document.getElementById('task-date').value = MonthlyView.selectedDate || DailyView.formatDate(new Date());
        }

        // Set default assignee based on current filter
        if (App.currentAssignee !== 'all') {
            document.getElementById('task-assignee').value = App.currentAssignee;
        }

        this.loadCategories().then(() => this.show());
    },

    openEdit(task) {
        this.editingTask = task;
        document.getElementById('modal-title').textContent = '编辑任务';
        document.getElementById('btn-delete').classList.remove('hidden');

        // Fill form
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-assignee').value = task.assignee;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-date').value = task.due_date || '';
        document.getElementById('task-time').value = task.due_time || '';

        const isRecurring = task.is_recurring && !task.recurring_parent_id;
        document.getElementById('task-recurring').checked = isRecurring;
        document.getElementById('recurring-options').classList.toggle('hidden', !isRecurring);

        if (isRecurring) {
            document.getElementById('task-recurring-type').value = task.recurring_type || 'daily';
            document.getElementById('task-recurring-interval').value = task.recurring_interval || 1;
            document.getElementById('task-recurring-end').value = task.recurring_end_date || '';
        }

        this.loadCategories().then(() => {
            document.getElementById('task-category').value = task.category_id || '';
            this.show();
        });
    },

    show() {
        document.getElementById('modal-overlay').classList.remove('hidden');
        this.isOpen = true;
        setTimeout(() => {
            document.getElementById('task-title').focus();
        }, 100);
    },

    close() {
        document.getElementById('modal-overlay').classList.add('hidden');
        this.isOpen = false;
        this.editingTask = null;
    },

    async save() {
        const data = {
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            assignee: document.getElementById('task-assignee').value,
            category_id: document.getElementById('task-category').value || null,
            priority: parseInt(document.getElementById('task-priority').value),
            due_date: document.getElementById('task-date').value || null,
            due_time: document.getElementById('task-time').value || null,
            is_recurring: document.getElementById('task-recurring').checked,
            recurring_type: document.getElementById('task-recurring-type').value,
            recurring_interval: parseInt(document.getElementById('task-recurring-interval').value) || 1,
            recurring_end_date: document.getElementById('task-recurring-end').value || null,
        };

        if (!data.title) {
            App.showToast('请输入任务标题', 'error');
            return;
        }

        try {
            let result;
            if (this.editingTask) {
                result = await API.updateTask(this.editingTask.id, data);
                App.socket.emit('task:updated', result);
                App.showToast('✏️ 任务已更新', 'success');
            } else {
                result = await API.createTask(data);
                App.socket.emit('task:created', result);
                App.showToast('✅ 任务已创建', 'success');
            }
            this.close();
            App.refreshCurrentView();
        } catch (err) {
            App.showToast('保存失败: ' + err.message, 'error');
        }
    },

    async delete() {
        if (!this.editingTask) return;

        const isRecurring = this.editingTask.is_recurring || this.editingTask.recurring_parent_id;
        let deleteSeries = false;

        if (isRecurring) {
            deleteSeries = confirm('删除整个重复系列吗？\n\n确定 = 删除所有重复实例\n取消 = 仅删除此条');
        } else {
            if (!confirm('确定删除此任务？')) return;
        }

        try {
            await API.deleteTask(this.editingTask.id, deleteSeries);
            App.socket.emit('task:deleted', { id: this.editingTask.id, deleteSeries });
            this.close();
            App.showToast('🗑️ 任务已删除', 'success');
            App.refreshCurrentView();
        } catch (err) {
            App.showToast('删除失败: ' + err.message, 'error');
        }
    }
};
