/**
 * API client — wraps all fetch calls to the backend.
 */
const API = {
    backendOriginKey: 'panpu-backend-origin',
    backendModeKey: 'panpu-backend-mode',

    isLocalHost() {
        if (typeof window === 'undefined') return false;
        const host = String(window.location.hostname || '').trim();
        return host === 'localhost' || host === '127.0.0.1' || host === '::1';
    },

    getDefaultBackendOrigin() {
        if (typeof window === 'undefined') return '';
        if (this.isLocalHost()) return '';
        return this.normalizeOrigin(window.__PANPU_DEFAULT_BACKEND_ORIGIN__ || '');
    },

    normalizeOrigin(origin) {
        const value = String(origin || '').trim();
        if (!value) return '';
        const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
        return withProtocol
            .replace(/\/+$/, '')
            .replace(/\/api$/i, '');
    },

    getStoredCustomBackendOrigin() {
        try {
            return this.normalizeOrigin(localStorage.getItem(this.backendOriginKey));
        } catch (e) {
            return '';
        }
    },

    getBackendMode() {
        try {
            const storedMode = localStorage.getItem(this.backendModeKey);
            if (storedMode === 'local') return 'local';
            if (storedMode === 'custom') {
                return this.getStoredCustomBackendOrigin() ? 'custom' : 'local';
            }
            return this.getStoredCustomBackendOrigin() ? 'custom' : 'local';
        } catch (e) {
            return 'local';
        }
    },

    getBackendOrigin() {
        const mode = this.getBackendMode();
        if (mode !== 'custom') return '';
        const normalized = this.getStoredCustomBackendOrigin();
        if (!normalized) return '';
        if (typeof window !== 'undefined' && normalized === window.location.origin) return '';
        return normalized;
    },

    setBackendOrigin(origin, { forceLocal = false } = {}) {
        const normalized = this.normalizeOrigin(origin);
        try {
            if (forceLocal) {
                localStorage.setItem(this.backendModeKey, 'local');
                localStorage.removeItem(this.backendOriginKey);
                return '';
            }
            if (!normalized || normalized === window.location.origin) {
                localStorage.setItem(this.backendModeKey, 'local');
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

    /**
     * Resolve one API path to an absolute browser-usable URL.
     * @param {string} path API path suffix beginning with '/'.
     * @returns {string} Absolute URL string.
     */
    getAbsoluteURL(path) {
        if (typeof window === 'undefined') return this.resolveURL(path);
        return new URL(this.resolveURL(path), window.location.origin).toString();
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

    undoCoinTransaction(id) {
        return this.request(`/garden/coins/undo/${id}`, { method: 'DELETE' });
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

    // Journal (手帐 canvas)
    getJournal(date) {
        return this.request(`/journal?date=${encodeURIComponent(date)}`);
    },

    getRecentJournals(limit = 30) {
        return this.request(`/journal/recent?limit=${limit}`);
    },

    addElement(formData) {
        return this.request('/journal/element', { method: 'POST', body: formData });
    },

    updateElement(id, data) {
        return this.request(`/journal/element/${id}`, { method: 'PUT', body: data });
    },

    deleteElement(id) {
        return this.request(`/journal/element/${id}`, { method: 'DELETE' });
    },

    // ── Codex accounts ──
    getCodexAccounts() {
        return this.request('/codex');
    },
    getCodexAccount(id) {
        return this.request(`/codex/${id}`);
    },
    createCodexAccount(data) {
        return this.request('/codex', { method: 'POST', body: data });
    },
    updateCodexAccount(id, data) {
        return this.request(`/codex/${id}`, { method: 'PUT', body: data });
    },
    deleteCodexAccount(id) {
        return this.request(`/codex/${id}`, { method: 'DELETE' });
    },
    getCodexLocalToken() {
        return this.request('/codex/local-token');
    },

    // ── Codex aggregator integration ──
    getCodexProxyAccounts() {
        return this.request('/codex/proxy-accounts');
    },
    getCodexSkillHealth() {
        return this.request('/codex/skill-health');
    },
    getCodexInstalledSkills() {
        return this.request('/codex/installed-skills');
    },
    getCodexAggregatorConfig() {
        return this.request('/codex/aggregator-config');
    },
    postCodexAuthInstance(instanceNum, authMode = 'device', provider = 'codex') {
        return this.request('/codex/auth-instance', {
            method: 'POST',
            body: { instanceNum, authMode, provider },
        });
    },

    // ── Codex one-click setup ──
    getCodexSetupStatus() {
        return this.request('/codex/setup-status');
    },
    postCodexApplyApiConfig(data) {
        return this.request('/codex/apply-api-config', { method: 'POST', body: data });
    },
    postCodexApplySkills(data = {}) {
        return this.request('/codex/apply-skills', { method: 'POST', body: data });
    },
};
