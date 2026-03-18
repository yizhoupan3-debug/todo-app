/**
 * App — main application controller.
 */
const App = {
    currentView: 'daily', // 'daily' | 'monthly' | 'checkin' | 'stats' | 'garden' | 'shop' | 'journal'
    currentAssignee: 'all', // 'all' | '潘潘' | '蒲蒲'
    activePersona: '潘潘', // '潘潘' | '蒲蒲' — the global persona toggle (no 'all')
    lastPersona: '潘潘',
    socket: null,
    _initializedModules: new Set(),
    _refreshTimer: null, // Socket debounce timer
    _headerCoinBalance: 0,
    _headerCoinSyncTimer: null,
    _headerCoinGainTimer: null,

    _safeInit(label, work) {
        try {
            return work();
        } catch (e) {
            console.error(`[App.init] ${label} failed`, e);
            return null;
        }
    },

    _ensureModule(name, initFn) {
        if (this._initializedModules.has(name)) return true;
        const result = this._safeInit(`module:${name}`, initFn);
        if (result !== null) this._initializedModules.add(name);
        return this._initializedModules.has(name);
    },

    _deferInit(label, work, timeout = 800) {
        const run = () => this._safeInit(label, work);
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(run, { timeout });
            return;
        }
        window.setTimeout(run, 0);
    },

    _initSocket() {
        this.socket = io(API.getSocketURL(), {
            transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
            this.socket.emit('join:assignee', this.activePersona || '潘潘');
        });

        const debouncedRefresh = () => {
            clearTimeout(this._refreshTimer);
            this._refreshTimer = setTimeout(() => this.refreshCurrentView(), 150);
        };

        this.socket.on('task:created', debouncedRefresh);
        this.socket.on('task:updated', debouncedRefresh);
        this.socket.on('task:deleted', debouncedRefresh);
        this.socket.on('task:imported', (data) => {
            this.showToast(`📥 另一设备导入了 ${data.count} 个任务`, 'info');
            debouncedRefresh();
        });
        this.socket.on('journal:updated', () => {
            if (this.currentView === 'journal' && typeof JournalView.refresh === 'function') {
                JournalView.refresh();
            }
        });
    },

    _ensureViewReady(view) {
        const viewModules = {
            daily: () => DailyView.init(),
            monthly: () => MonthlyView.init(),
            checkin: () => CheckinView.init(),
            stats: () => StatsView.init(),
            garden: () => GardenView.init(),
            shop: () => GardenView.init(),
            journal: () => JournalView.init(),
        };

        const initFn = viewModules[view];
        if (initFn) this._ensureModule(view === 'shop' ? 'garden' : view, initFn);
    },

    _bindGlobalUI() {
        document.getElementById('btn-add-task').addEventListener('click', () => TaskModal.openCreate());
        document.getElementById('fab-add').addEventListener('click', () => TaskModal.openCreate());
        document.getElementById('btn-import-ics').addEventListener('click', () => ICSImport.open());

        const ambientBtn = document.getElementById('btn-ambient');
        const ambientPanel = document.getElementById('ambient-panel');
        ambientBtn.addEventListener('click', () => {
            ambientPanel.classList.toggle('hidden');
            if (!ambientPanel.classList.contains('hidden')) {
                AmbientSound.buildSoundGrid('ambient-grid');
            }
        });
        document.getElementById('ambient-close').addEventListener('click', () => {
            ambientPanel.classList.add('hidden');
        });

        document.getElementById('nav-pomodoro').addEventListener('click', () => Pomodoro.open());
        document.getElementById('nav-checkin').addEventListener('click', () => this.switchView('checkin'));
        document.getElementById('nav-stats').addEventListener('click', () => this.switchView('stats'));

        document.getElementById('header-coin-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._showCoinRules();
        });

        document.getElementById('persona-toggle')?.addEventListener('click', () => {
            const order = this._viewSupportsAllAssignee() ? ['潘潘', '蒲蒲', 'all'] : ['潘潘', '蒲蒲'];
            const idx = order.indexOf(this.activePersona);
            this.setPersona(order[(idx + 1) % order.length]);
        });

        const mobilePomodoro = document.getElementById('mobile-pomodoro');
        if (mobilePomodoro) mobilePomodoro.addEventListener('click', () => Pomodoro.open());

        const mobileCheckin = document.getElementById('mobile-checkin');
        if (mobileCheckin) mobileCheckin.addEventListener('click', () => this.switchView('checkin'));

        const mobileStats = document.getElementById('mobile-stats');
        if (mobileStats) mobileStats.addEventListener('click', () => this.switchView('stats'));

        const mobileJournal = document.getElementById('mobile-journal');
        if (mobileJournal) mobileJournal.addEventListener('click', () => this.switchView('journal'));

        document.getElementById('btn-menu').addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar.classList.contains('open')) {
                this.closeSidebar();
            } else {
                sidebar.classList.add('open');
                const backdrop = document.createElement('div');
                backdrop.className = 'sidebar-backdrop';
                backdrop.id = 'sidebar-backdrop';
                backdrop.addEventListener('click', () => this.closeSidebar());
                document.body.appendChild(backdrop);
            }
        });

        document.addEventListener('keydown', (e) => {
            const isFocusedInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
            if (e.key === 'Escape') {
                if (TaskModal.isOpen) TaskModal.close();
                document.getElementById('ics-modal-overlay').classList.add('hidden');
                document.getElementById('widget-modal-overlay').classList.add('hidden');
                this.closeSidebar();
            }
            if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !TaskModal.isOpen && !isFocusedInput) {
                e.preventDefault();
                TaskModal.openCreate();
            }
            // Arrow keys for date navigation (daily/monthly view)
            if (!isFocusedInput && !TaskModal.isOpen) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    if (this.currentView === 'daily') DailyView.prevDay();
                    else if (this.currentView === 'monthly') MonthlyView.prevMonth();
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (this.currentView === 'daily') DailyView.nextDay();
                    else if (this.currentView === 'monthly') MonthlyView.nextMonth();
                }
                // 't' to jump to today
                if (e.key === 't') {
                    e.preventDefault();
                    if (this.currentView === 'daily') DailyView.goToday();
                    else if (this.currentView === 'monthly') MonthlyView.goToday();
                }
            }
        });

        document.querySelectorAll('.view-container').forEach(vc => {
            vc.addEventListener('scroll', () => {
                const header = document.getElementById('main-header');
                header.classList.toggle('scrolled', vc.scrollTop > 8);
                // Scroll-to-top button
                const btn = document.getElementById('scroll-top-btn');
                if (btn) btn.classList.toggle('visible', vc.scrollTop > 200);
            });
        });

        // Create scroll-to-top button
        const scrollBtn = document.createElement('button');
        scrollBtn.id = 'scroll-top-btn';
        scrollBtn.className = 'scroll-top-btn';
        scrollBtn.innerHTML = '↑';
        scrollBtn.title = '回到顶部';
        scrollBtn.addEventListener('click', () => {
            const activeView = document.querySelector('.view-container:not(.hidden)');
            if (activeView) activeView.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.body.appendChild(scrollBtn);
    },

    _renderShellIcons() {
        if (typeof lucide === 'undefined') return;
        const nodes = [
            document.getElementById('sidebar'),
            document.getElementById('main-header'),
            document.querySelector('.bottom-nav'),
        ].filter(Boolean);
        if (nodes.length) lucide.createIcons({ attrs: {}, nodes });
    },

    init() {
        // Keep startup small: core shell first, non-critical views later.
        this._ensureModule('daily', () => DailyView.init());
        this._ensureModule('monthly', () => MonthlyView.init());
        this._ensureModule('checkin', () => CheckinView.init());
        this._ensureModule('task-modal', () => TaskModal.init());
        this._ensureModule('ics-import', () => ICSImport.init());
        this._ensureModule('pomodoro', () => Pomodoro.init());

        this._safeInit('icons', () => this._renderShellIcons());
        this._safeInit('persona', () => this._initPersona());
        this._safeInit('theme', () => this.initTheme());
        this._safeInit('header-coins-render', () => {
            const coinUser = this._getHeaderCoinUser?.();
            const initialBalance = this._getCachedCoinBalance?.(coinUser) ?? 0;
            this._renderHeaderCoins(initialBalance);
        });
        this._safeInit('navigation', () => this.bindNavigation());
        this._safeInit('date-nav', () => this.bindDateNav());
        this._safeInit('love-counter', () => this.initLoveCounter());
        this._safeInit('global-ui', () => this._bindGlobalUI());

        this.switchView('daily');
        this._safeInit('boot-ready', () => window.__PANPU_MARK_BOOT_READY__?.());

        this._deferInit('socket', () => this._initSocket());
        this._deferInit('stats', () => this._ensureModule('stats', () => StatsView.init()));
        this._deferInit('garden', () => this._ensureModule('garden', () => GardenView.init()));
        this._deferInit('journal', () => this._ensureModule('journal', () => JournalView.init()));
        this._deferInit('header-coins-refresh', () => this._refreshHeaderCoins());
        this._deferInit('notification-guide', () => this._showNotificationGuide(), 3000);
    },

    /** Show a friendly notification permission card (once, non-intrusive) */
    _showNotificationGuide() {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'default') return;
        if (localStorage.getItem('panpu-notif-asked')) return;

        const card = document.createElement('div');
        card.className = 'notif-guide-card';
        card.innerHTML = `
            <div class="notif-guide-icon">🔔</div>
            <div class="notif-guide-body">
                <div class="notif-guide-title">开启通知提醒</div>
                <div class="notif-guide-desc">番茄钟结束时收到提醒，不错过每次专注</div>
            </div>
            <div class="notif-guide-actions">
                <button class="notif-guide-btn primary" id="notif-enable">开启</button>
                <button class="notif-guide-btn" id="notif-dismiss">稍后</button>
            </div>
        `;
        document.body.appendChild(card);
        // Slide in after paint
        requestAnimationFrame(() => {
            requestAnimationFrame(() => card.classList.add('visible'));
        });

        const dismiss = () => {
            localStorage.setItem('panpu-notif-asked', '1');
            card.classList.remove('visible');
            setTimeout(() => card.remove(), 400);
        };

        card.querySelector('#notif-enable').addEventListener('click', async () => {
            try { await Notification.requestPermission(); } catch (_) {}
            dismiss();
        });
        card.querySelector('#notif-dismiss').addEventListener('click', dismiss);
    },
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
