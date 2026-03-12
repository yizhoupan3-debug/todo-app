/**
 * ICS Import — handles file upload, preview, and import confirmation.
 */
const ICSImport = {
    parsedTasks: [],

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const overlay = document.getElementById('ics-modal-overlay');
        const closeBtn = document.getElementById('ics-modal-close');
        const uploadArea = document.getElementById('ics-upload-area');
        const fileInput = document.getElementById('ics-file-input');
        const cancelBtn = document.getElementById('ics-cancel');
        const confirmBtn = document.getElementById('ics-confirm');

        closeBtn.addEventListener('click', () => this.close());
        overlay.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.close();
        });

        uploadArea.addEventListener('click', () => fileInput.click());

        // Drag & drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFile(file);
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFile(file);
        });

        cancelBtn.addEventListener('click', () => this.resetUpload());
        confirmBtn.addEventListener('click', () => this.confirmImport());
    },

    open() {
        this.resetUpload();
        document.getElementById('ics-modal-overlay').classList.remove('hidden');
    },

    close() {
        document.getElementById('ics-modal-overlay').classList.add('hidden');
        this.parsedTasks = [];
    },

    resetUpload() {
        document.getElementById('ics-upload-area').classList.remove('hidden');
        document.getElementById('ics-preview').classList.add('hidden');
        document.getElementById('ics-file-input').value = '';
        this.parsedTasks = [];
    },

    async handleFile(file) {
        if (!file.name.match(/\.(ics|ical)$/i)) {
            App.showToast('请选择 .ics 文件', 'error');
            return;
        }

        try {
            const result = await API.uploadICS(file);
            this.parsedTasks = result.tasks;

            if (this.parsedTasks.length === 0) {
                App.showToast('文件中没有找到任务/事件', 'error');
                return;
            }

            this.showPreview();
        } catch (err) {
            App.showToast('解析 ICS 失败: ' + err.message, 'error');
        }
    },

    showPreview() {
        document.getElementById('ics-upload-area').classList.add('hidden');
        document.getElementById('ics-preview').classList.remove('hidden');
        document.getElementById('ics-count').textContent = this.parsedTasks.length;

        const list = document.getElementById('ics-task-list');
        list.innerHTML = this.parsedTasks.map(task => {
            let meta = '';
            if (task.due_date) meta += `📅 ${task.due_date}`;
            if (task.due_time) meta += ` 🕐 ${task.due_time}`;
            if (task.is_recurring) meta += ` 🔄 重复(${task.recurring_type})`;

            return `
        <div class="ics-task-item">
          <div class="title">${this.escapeHtml(task.title)}</div>
          ${meta ? `<div class="meta">${meta}</div>` : ''}
        </div>
      `;
        }).join('');
    },

    async confirmImport() {
        const assignee = document.getElementById('ics-assignee').value;

        try {
            const result = await API.confirmICSImport(this.parsedTasks, assignee);
            App.socket.emit('task:imported', { count: result.count });
            App.showToast(`📥 成功导入 ${result.count} 个任务`, 'success');
            this.close();
            App.refreshCurrentView();
        } catch (err) {
            App.showToast('导入失败: ' + err.message, 'error');
        }
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return Utils.escapeHtml(str);
    }
};
