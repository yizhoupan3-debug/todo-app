const bootState = (() => {
    if (typeof window === 'undefined') return {};
    return window.__PANPU_BOOT_STATE__ || {};
})();

const App = {
    currentView: 'daily',
    currentAssignee: bootState.persona || '潘潘',
    activePersona: bootState.persona || '潘潘',
    lastPersona: bootState.lastPersona || '潘潘',
    scopedPersona: bootState.scopedPersona || (bootState.persona || '潘潘'),
    socket: null,
    _initialized: false,
    _socketEventsBound: false,
    _headerCoinBalance: 0,
    _viewSwitchedOnce: false,
    _prevView: 'daily',

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this._initModules();
        this._initPersona?.();
        this.bindNavigation?.();
        this.bindDateNav?.();
        this._bindShellEvents();
        this.initTheme?.();
        this.initLoveCounter?.();
        this.initSocket();

        if (typeof lucide !== 'undefined') {
            // Render critical shell icons immediately
            const shellNodes = [
                document.getElementById('sidebar'),
                document.getElementById('main-header'),
                document.getElementById('bottom-nav'),
                document.getElementById('view-' + this.currentView)
            ].filter(Boolean);
            if (shellNodes.length > 0) {
                lucide.createIcons({ attrs: {}, nodes: shellNodes });
            }
            
            // Defer the rest to unblock main thread
            const deferInit = () => lucide.createIcons({ attrs: {} });
            if ('requestIdleCallback' in window) requestIdleCallback(deferInit);
            else setTimeout(deferInit, 300);
        }

        this.switchView('daily');
        this.syncHeaderCoins();

        if (typeof window.__PANPU_MARK_BOOT_READY__ === 'function') {
            requestAnimationFrame(() => window.__PANPU_MARK_BOOT_READY__());
        }
    },

    _initModules() {
        const initTargets = [
            DailyView,
            MonthlyView,
            CheckinView,
            StatsView,
            GardenView,
            JournalView,
            TaskModal,
            ICSImport,
            Pomodoro,
        ];

        for (const target of initTargets) {
            if (!target || typeof target.init !== 'function') continue;
            try {
                target.init();
            } catch (error) {
                console.error('Module init failed:', error);
            }
        }
        
        if (typeof window.MoodView !== 'undefined') {
            window.MoodViewInstance = new window.MoodView(this);
            window.MoodViewInstance.init();
        }
    },

    _bindShellEvents() {
        document.getElementById('btn-add-task')?.addEventListener('click', () => TaskModal?.openCreate?.());
        document.getElementById('fab-add')?.addEventListener('click', () => TaskModal?.openCreate?.());

        document.getElementById('btn-menu')?.addEventListener('click', () => this.openSidebar());
        document.getElementById('mobile-checkin')?.addEventListener('click', () => this.switchView('checkin'));
        document.getElementById('nav-checkin')?.addEventListener('click', () => this.switchView('checkin'));
        document.getElementById('nav-stats')?.addEventListener('click', () => this.switchView('stats'));
        document.getElementById('nav-pomodoro')?.addEventListener('click', () => Pomodoro?.open?.());
        document.getElementById('btn-import-ics')?.addEventListener('click', () => ICSImport?.open?.());
        document.getElementById('header-coin-btn')?.addEventListener('click', () => this._showCoinRules?.());
        document.getElementById('persona-toggle')?.addEventListener('click', () => this.cyclePersona());

        this._bindAmbientPanel();

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            this.closeSidebar?.();
            this.closeMorePanel?.();
            this._closeAmbientPanel();
        });
    },

    _bindAmbientPanel() {
        const ambientBtn = document.getElementById('btn-ambient');
        const ambientPanel = document.getElementById('ambient-panel');
        const ambientClose = document.getElementById('ambient-close');
        if (!ambientBtn || !ambientPanel) return;

        const openPanel = () => {
            ambientPanel.classList.remove('hidden');
            if (typeof AmbientSound !== 'undefined') {
                AmbientSound.buildSoundGrid('ambient-grid');
                AmbientSound.updateUI?.();
            }
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ attrs: {}, node: ambientPanel });
            }
        };

        ambientBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (ambientPanel.classList.contains('hidden')) {
                openPanel();
            } else {
                this._closeAmbientPanel();
            }
        });

        ambientClose?.addEventListener('click', () => this._closeAmbientPanel());

        document.addEventListener('click', (event) => {
            if (ambientPanel.classList.contains('hidden')) return;
            if (ambientPanel.contains(event.target) || ambientBtn.contains(event.target)) return;
            this._closeAmbientPanel();
        });
    },

    _closeAmbientPanel() {
        document.getElementById('ambient-panel')?.classList.add('hidden');
    },

    openSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || window.innerWidth > 768) return;
        if (sidebar.classList.contains('open')) return;

        sidebar.classList.add('open');
        let backdrop = document.getElementById('sidebar-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'sidebar-backdrop';
            backdrop.id = 'sidebar-backdrop';
            backdrop.addEventListener('click', () => this.closeSidebar?.());
            document.body.appendChild(backdrop);
        }
    },

    cyclePersona() {
        const order = ['潘潘', '蒲蒲'];
        const current = this.activePersona || this.scopedPersona || this.lastPersona || '潘潘';
        const index = Math.max(0, order.indexOf(current));
        const nextPersona = order[(index + 1) % order.length];

        if (typeof this.setPersona === 'function') {
            this.setPersona(nextPersona);
            return;
        }

        this.activePersona = nextPersona;
        this.lastPersona = nextPersona;
        this.scopedPersona = nextPersona;
        this.currentAssignee = nextPersona;
    },

    initSocket() {
        if (typeof io !== 'function') {
            console.warn('Socket client is unavailable; real-time sync disabled.');
            return;
        }

        try {
            const socketURL = typeof API !== 'undefined' && typeof API.getSocketURL === 'function'
                ? API.getSocketURL()
                : undefined;
            this.socket = io(socketURL, {
                transports: ['websocket', 'polling'],
            });
        } catch (error) {
            console.warn('Socket init failed:', error);
            return;
        }

        if (this._socketEventsBound) return;
        this._socketEventsBound = true;

        this.socket.on('connect', () => {
            this.socket.emit('join:assignee', this.activePersona || this.currentAssignee || '潘潘');
        });

        this.socket.on('connect_error', (error) => {
            console.warn('Socket connect error:', error?.message || error);
        });

        const refreshTaskViews = () => {
            if (this.currentView === 'daily') {
                DailyView?.refresh?.();
                return;
            }
            if (this.currentView === 'monthly') {
                MonthlyView?.refresh?.();
                return;
            }
            if (this.currentView === 'stats') {
                StatsView?.load?.();
                return;
            }
            if (this.currentView === 'garden') {
                GardenView?.refreshData?.();
                return;
            }
            if (this.currentView === 'shop') {
                GardenView?.refreshShopData?.();
            }
        };

        this.socket.on('task:created', refreshTaskViews);
        this.socket.on('task:updated', refreshTaskViews);
        this.socket.on('task:deleted', refreshTaskViews);
        this.socket.on('task:imported', refreshTaskViews);
        this.socket.on('journal:updated', () => {
            if (this.currentView === 'journal') {
                JournalView?.refresh?.();
            }
        });
    },

    getUIContext() {
        return {
            currentView: this.currentView,
            currentAssignee: this.currentAssignee,
            activePersona: this.activePersona,
            lastPersona: this.lastPersona,
            scopedPersona: this.scopedPersona || this.activePersona,
        };
    },

    syncHeaderCoins(balance = null) {
        if (balance == null) {
            if (typeof this._refreshHeaderCoins === 'function') {
                this._refreshHeaderCoins();
            }
            return;
        }

        if (typeof this._renderHeaderCoins === 'function') {
            this._renderHeaderCoins(balance);
            return;
        }

        const button = document.getElementById('header-coin-btn');
        if (!button || typeof Utils === 'undefined') return;
        this._headerCoinBalance = Utils.roundCoin(balance);
        button.innerHTML = Utils.headerCoinMarkup(this._headerCoinBalance);
    },

    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        while (container.children.length > 3) {
            container.firstChild.remove();
        }
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },

    _ensureViewReady() {
        // Views are eagerly initialized during boot. Keep this hook for compatibility.
    },
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
    try {
        App.init();
    } catch (error) {
        console.error('App boot failed:', error);
        if (typeof window.__PANPU_MARK_BOOT_READY__ === 'function') {
            window.__PANPU_MARK_BOOT_READY__();
        }
    }
});
