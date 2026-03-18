/**
 * Task Modal — handles create and edit of tasks.
 * Includes DateNLP integration for smart Chinese date/time recognition.
 */
const TaskModal = {
    isOpen: false,
    editingTask: null,
    categories: [],
    _nlpResult: null,     // current NLP parse result
    _nlpDismissed: false, // user dismissed the pill
    _debounceTimer: null, // input debounce

    init() {
        this._injectPillContainer();
        this.bindEvents();
    },

    /** Inject the NLP pill container right after the task-title input */
    _injectPillContainer() {
        const titleGroup = document.getElementById('task-title').closest('.form-group');
        if (titleGroup && !document.getElementById('nlp-pill-container')) {
            const container = document.createElement('div');
            container.id = 'nlp-pill-container';
            container.className = 'nlp-pill-container';
            titleGroup.after(container);
        }
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

        // Show/hide auto-complete checkbox based on time input
        document.getElementById('task-time').addEventListener('input', (e) => {
            const hasTime = !!e.target.value;
            document.getElementById('auto-complete-group').classList.toggle('hidden', !hasTime);
            const endTimeEl = document.getElementById('task-end-time');
            if (hasTime) {
                // Auto-fill end time = start + 1h when end is empty or end < start
                if (!endTimeEl.value || endTimeEl.value <= e.target.value) {
                    endTimeEl.value = this._addHour(e.target.value);
                }
            } else {
                // Clear end time when start is cleared
                endTimeEl.value = '';
            }
        });

        document.getElementById('task-end-time').addEventListener('input', (e) => {
            const startTime = document.getElementById('task-time').value;
            const hasTime = !!e.target.value || !!startTime;
            document.getElementById('auto-complete-group').classList.toggle('hidden', !hasTime);
            // If end time is before start time, auto-correct to start + 1h
            if (e.target.value && startTime && e.target.value <= startTime) {
                e.target.value = this._addHour(startTime);
            }
        });

        // ── NLP: listen to title input ──
        document.getElementById('task-title').addEventListener('input', (e) => {
            const val = e.target.value;
            // Reset dismiss state if user clears the input
            if (!val.trim()) {
                this._nlpDismissed = false;
            }

            if (this._nlpDismissed) return;
            
            clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(() => this._runNLP(e.target.value), 200);
        });
    },

    // ── NLP Methods ──

    _runNLP(text) {
        if (!text || typeof DateNLP === 'undefined') {
            this._hideNLPPill();
            return;
        }
        const result = DateNLP.parse(text);
        if (!result) {
            this._hideNLPPill();
            return;
        }
        this._nlpResult = result;
        this._showNLPPill(result);
    },

    _showNLPPill(result) {
        const container = document.getElementById('nlp-pill-container');
        if (!container) return;

        let pillText = '📅 ';
        if (result.friendlyDate) pillText += result.friendlyDate;
        if (result.friendlyTime) pillText += '  ' + result.friendlyTime;

        container.innerHTML = `
            <div class="nlp-pill nlp-pill-actionable" title="点击应用日期时间">
                <span class="nlp-pill-text">${pillText}</span>
                <button class="nlp-pill-dismiss" title="取消识别" type="button">✕</button>
            </div>
        `;
        container.classList.add('visible');

        // Click pill to apply date/time
        container.querySelector('.nlp-pill').addEventListener('click', (e) => {
            if (e.target.closest('.nlp-pill-dismiss')) return;
            this._applyNLPResult();
        });

        // Dismiss button
        container.querySelector('.nlp-pill-dismiss').addEventListener('click', (e) => {
            e.stopPropagation();
            this._nlpDismissed = true;
            this._nlpResult = null;
            this._hideNLPPill();
        });
    },

    /** Apply NLP result: fill date/time, clean title, show confirmed pill */
    _applyNLPResult() {
        const r = this._nlpResult;
        if (!r) return;

        // Fill date field
        if (r.date) {
            document.getElementById('task-date').value = r.date;
        }
        // Fill time field
        if (r.time) {
            document.getElementById('task-time').value = r.time;
            document.getElementById('auto-complete-group').classList.remove('hidden');
            // Auto-fill end time if empty
            if (!document.getElementById('task-end-time').value) {
                document.getElementById('task-end-time').value = this._addHour(r.time);
            }
        }
        // Clean title
        if (r.cleaned) {
            document.getElementById('task-title').value = r.cleaned;
        }

        // Show confirmed pill state
        const container = document.getElementById('nlp-pill-container');
        if (container) {
            let confirmText = '✅ ';
            if (r.friendlyDate) confirmText += r.friendlyDate;
            if (r.friendlyTime) confirmText += '  ' + r.friendlyTime;
            container.innerHTML = `
                <div class="nlp-pill nlp-pill-confirmed">
                    <span class="nlp-pill-text">${confirmText}</span>
                </div>
            `;
            // Auto-hide after 1.5s
            setTimeout(() => {
                container.classList.remove('visible');
            }, 1500);
        }

    },

    _hideNLPPill() {
        const container = document.getElementById('nlp-pill-container');
        if (!container) return;
        container.classList.remove('visible');
        this._nlpResult = null;
    },

    _resetNLPState() {
        this._nlpResult = null;
        this._nlpDismissed = false;
        clearTimeout(this._debounceTimer);
        this._hideNLPPill();
    },

    async loadCategories() {
        try {
            this.categories = await API.getCategories();
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
        this._populateCategorySelect();
    },

    /** Rebuild the category <option> list from cached data */
    _populateCategorySelect(selectedId) {
        const select = document.getElementById('task-category');
        if (!select) return;
        // Always rebuild from scratch in case form.reset() wiped the options
        select.innerHTML = '<option value="">无分类</option>';
        for (const cat of this.categories) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.icon || ''} ${cat.name}`;
            select.appendChild(opt);
        }
        if (selectedId !== undefined) {
            select.value = selectedId || '';
        }
    },

    openCreate() {
        this.editingTask = null;
        this._resetNLPState();
        document.getElementById('modal-title').textContent = '新建任务';
        document.getElementById('btn-delete').classList.add('hidden');

        // Reset form FIRST — this clears everything including <select> options
        document.getElementById('task-form').reset();
        document.getElementById('task-id').value = '';
        document.getElementById('task-end-time').value = '';
        document.getElementById('recurring-options').classList.add('hidden');
        document.getElementById('auto-complete-group').classList.add('hidden');
        document.getElementById('task-auto-complete').checked = true;

        // Set default date to current view date
        if (App.currentView === 'daily') {
            document.getElementById('task-date').value = DailyView.formatDate(DailyView.currentDate);
        } else {
            document.getElementById('task-date').value = MonthlyView.selectedDate || DailyView.formatDate(new Date());
        }

        // Set default assignee based on current filter
        const assigneeSel = document.getElementById('task-assignee');
        if (App.currentAssignee === 'all') {
            assigneeSel.value = '全部';
        } else {
            assigneeSel.value = App.currentAssignee;
        }

        // Load categories AFTER form.reset() so options don't get wiped
        this.loadCategories().then(() => this.show());
    },

    openEdit(task) {
        this.editingTask = task;
        this._resetNLPState();
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
        document.getElementById('task-end-time').value = task.end_time || '';

        // Auto-complete checkbox
        const hasTime = !!task.due_time || !!task.end_time;
        document.getElementById('auto-complete-group').classList.toggle('hidden', !hasTime);
        document.getElementById('task-auto-complete').checked = task.auto_complete !== 0;

        const isRecurring = task.is_recurring && !task.recurring_parent_id;
        document.getElementById('task-recurring').checked = isRecurring;
        document.getElementById('recurring-options').classList.toggle('hidden', !isRecurring);

        if (isRecurring) {
            document.getElementById('task-recurring-type').value = task.recurring_type || 'daily';
            document.getElementById('task-recurring-interval').value = task.recurring_interval || 1;
            document.getElementById('task-recurring-end').value = task.recurring_end_date || '';
        }

        // Load categories and set the correct one selected
        this.loadCategories().then(() => {
            this._populateCategorySelect(task.category_id);
            this.show();
        });
    },

    show() {
        document.getElementById('modal-overlay').classList.remove('hidden');
        this.isOpen = true;
        if (typeof lucide !== 'undefined') {
            const scope = document.getElementById('modal-overlay');
            if (scope) lucide.createIcons({ attrs: {}, node: scope });
        }
        setTimeout(() => {
            document.getElementById('task-title').focus();
        }, 100);
    },

    close() {
        const overlay = document.getElementById('modal-overlay');
        if (!overlay || overlay.classList.contains('hidden')) return;

        Utils.closeModalAnimated(overlay);

        this.isOpen = false;
        this.editingTask = null;
        this._resetNLPState();
    },

    /** Add 1 hour to a HH:MM string, capping at 23:59 */
    _addHour(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        if (h >= 23) return '23:59';
        return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },

    async save() {
        let title = document.getElementById('task-title').value.trim();
        let dateVal = document.getElementById('task-date').value || null;
        let timeVal = document.getElementById('task-time').value || null;
        let endTimeVal = document.getElementById('task-end-time').value || null;

        // ── Apply NLP result if active ──
        if (this._nlpResult && !this._nlpDismissed) {
            const r = this._nlpResult;
            if (r.date) dateVal = r.date;
            if (r.time) timeVal = r.time;
            if (r.cleaned) title = r.cleaned;
        }

        const data = {
            title: title,
            description: document.getElementById('task-description').value.trim(),
            assignee: document.getElementById('task-assignee').value,
            category_id: document.getElementById('task-category').value || null,  // '' → null for DB
            priority: parseInt(document.getElementById('task-priority').value),
            due_date: dateVal,
            due_time: timeVal,
            end_time: endTimeVal,
            is_recurring: document.getElementById('task-recurring').checked,
            recurring_type: document.getElementById('task-recurring-type').value,
            recurring_interval: parseInt(document.getElementById('task-recurring-interval').value) || 1,
            recurring_end_date: document.getElementById('task-recurring-end').value || null,
            auto_complete: document.getElementById('task-auto-complete').checked ? 1 : 0,
        };


        if (!data.title) {
            App.showToast('请输入任务标题', 'error');
            return;
        }

        try {
            let result;
            if (this.editingTask) {
                // Editing always targets one specific task
                if (data.assignee === '全部') data.assignee = this.editingTask.assignee;
                result = await API.updateTask(this.editingTask.id, data);
                App.socket.emit('task:updated', result);
                App.showToast('✏️ 任务已更新', 'success');
            } else if (data.assignee === '全部') {
                // Create a task for each person
                for (const person of ['潘潘', '蒲蒲']) {
                    result = await API.createTask({ ...data, assignee: person });
                    App.socket.emit('task:created', result);
                }
                App.showToast('✅ 已为全部成员创建任务', 'success');
            } else {
                result = await API.createTask(data);
                App.socket.emit('task:created', result);
                // Show smart toast with NLP info
                if (this._nlpResult && !this._nlpDismissed) {
                    const r = this._nlpResult;
                    let nlpInfo = '✅ 任务已创建';
                    if (r.friendlyDate || r.friendlyTime) {
                        nlpInfo += ` · 📅 ${r.friendlyDate || ''}`;
                        if (r.friendlyTime) nlpInfo += ` ${r.friendlyTime}`;
                    }
                    App.showToast(nlpInfo, 'success');
                } else {
                    App.showToast('✅ 任务已创建', 'success');
                }
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
