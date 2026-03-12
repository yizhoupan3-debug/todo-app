/**
 * API client — wraps all fetch calls to the backend.
 */
const API = {
    baseURL: '/api',

    async request(path, options = {}) {
        const url = this.baseURL + path;
        const config = {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        };
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }
        if (config.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        const res = await fetch(url, config);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Request failed');
        }
        return res.json();
    },

    // Tasks
    getTasks(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request('/tasks' + (qs ? '?' + qs : ''));
    },

    getMonthSummary(month, assignee) {
        const params = { month };
        if (assignee) params.assignee = assignee;
        const qs = new URLSearchParams(params).toString();
        return this.request('/tasks/month-summary?' + qs);
    },

    createTask(data) {
        return this.request('/tasks', { method: 'POST', body: data });
    },

    updateTask(id, data) {
        return this.request(`/tasks/${id}`, { method: 'PUT', body: data });
    },

    deleteTask(id, deleteSeries = false) {
        return this.request(`/tasks/${id}?delete_series=${deleteSeries}`, { method: 'DELETE' });
    },

    // Categories
    getCategories() {
        return this.request('/categories');
    },

    createCategory(data) {
        return this.request('/categories', { method: 'POST', body: data });
    },

    // ICS Import
    uploadICS(file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request('/import/ics', { method: 'POST', body: formData });
    },

    confirmICSImport(tasks, assignee) {
        return this.request('/import/ics/confirm', {
            method: 'POST',
            body: { tasks, assignee },
        });
    },

    clearDoneTasks(date, assignee) {
        const params = { date };
        if (assignee && assignee !== 'all') params.assignee = assignee;
        const qs = new URLSearchParams(params).toString();
        return this.request('/tasks/clear-done?' + qs, { method: 'DELETE' });
    },

    // Check-in
    getCheckin(params) {
        const qs = new URLSearchParams(params).toString();
        return this.request('/checkin?' + qs);
    },

    addCheckin(data) {
        return this.request('/checkin', { method: 'POST', body: data });
    },

    deleteCheckin(id) {
        return this.request('/checkin/' + id, { method: 'DELETE' });
    },

    getGoal(params) {
        const qs = new URLSearchParams(params).toString();
        return this.request('/checkin/goal?' + qs);
    },

    setGoal(data) {
        return this.request('/checkin/goal', { method: 'PUT', body: data });
    },

    // Stats
    getStats(params) {
        const qs = new URLSearchParams(params).toString();
        return this.request('/stats?' + qs);
    },

    addPomodoroSession(data) {
        return this.request('/stats/pomodoro', { method: 'POST', body: data });
    },

    // Garden & Coins
    getCoins(assignee) {
        return this.request(`/garden/coins/${encodeURIComponent(assignee)}`);
    },

    earnCoins(data) {
        return this.request('/garden/coins/earn', { method: 'POST', body: data });
    },

    getCoinHistory(assignee, limit = 20) {
        return this.request(`/garden/coins/history/${encodeURIComponent(assignee)}?limit=${limit}`);
    },

    getShop(assignee) {
        return this.request(`/garden/shop/${encodeURIComponent(assignee)}`);
    },

    plantTree(data) {
        return this.request('/garden/plant', { method: 'POST', body: data });
    },

    getGardenTrees(assignee) {
        return this.request(`/garden/trees/${encodeURIComponent(assignee)}`);
    },

    growTree(data) {
        return this.request('/garden/trees/grow', { method: 'POST', body: data });
    },
};
