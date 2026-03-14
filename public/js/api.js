/**
 * API client — wraps all fetch calls to the backend.
 */
const API = {
    backendOriginKey: 'panpu-backend-origin',
    backendModeKey: 'panpu-backend-mode',

    getDefaultBackendOrigin() {
        if (typeof window === 'undefined') return '';
        return this.normalizeOrigin(window.__PANPU_DEFAULT_BACKEND_ORIGIN__ || '');
    },

    normalizeOrigin(origin) {
        const value = String(origin || '').trim();
        if (!value) return '';
        const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
        return withProtocol.replace(/\/+$/, '');
    },

    getBackendOrigin() {
        try {
            const mode = localStorage.getItem(this.backendModeKey) || 'auto';
            if (mode === 'local') return '';
            const raw = localStorage.getItem(this.backendOriginKey);
            const normalized = mode === 'custom'
                ? this.normalizeOrigin(raw)
                : this.getDefaultBackendOrigin();
            if (!normalized) return '';
            if (normalized === window.location.origin) return '';
            return normalized;
        } catch (e) {
            return '';
        }
    },

    setBackendOrigin(origin, { forceLocal = false } = {}) {
        const defaultOrigin = this.getDefaultBackendOrigin();
        const normalized = this.normalizeOrigin(origin);
        try {
            if (forceLocal) {
                localStorage.setItem(this.backendModeKey, 'local');
                localStorage.removeItem(this.backendOriginKey);
                return '';
            }
            if (!normalized || normalized === window.location.origin) {
                if (defaultOrigin) {
                    localStorage.setItem(this.backendModeKey, 'auto');
                } else {
                    localStorage.removeItem(this.backendModeKey);
                }
                localStorage.removeItem(this.backendOriginKey);
                return '';
            }
            localStorage.setItem(this.backendModeKey, 'custom');
            localStorage.setItem(this.backendOriginKey, normalized);
            return normalized;
        } catch (e) {
            return normalized;
        }
    },

    getBaseURL() {
        const origin = this.getBackendOrigin();
        return origin ? `${origin}/api` : '/api';
    },

    getSocketURL() {
        return this.getBackendOrigin() || undefined;
    },

    resolveURL(path) {
        return this.getBaseURL() + path;
    },

    async fetch(path, options = {}) {
        const url = this.resolveURL(path);
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
        return fetch(url, config);
    },

    async request(path, options = {}) {
        const res = await this.fetch(path, options);
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

    getPlots(assignee) {
        return this.request(`/garden/plots/${encodeURIComponent(assignee)}`);
    },

    clearPlot(data) {
        return this.request('/garden/plots/clear', { method: 'POST', body: data });
    },

    harvestTree(data) {
        return this.request('/garden/harvest', { method: 'POST', body: data });
    },
};
