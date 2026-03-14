/**
 * App — main application controller.
 */
const App = {
    currentView: 'daily', // 'daily' | 'monthly' | 'checkin' | 'stats' | 'garden' | 'shop'
    currentAssignee: 'all', // 'all' | '潘潘' | '蒲蒲'
    activePersona: '潘潘', // '潘潘' | '蒲蒲' — the global persona toggle (no 'all')
    lastPersona: '潘潘',
    socket: null,
    _refreshTimer: null, // Socket debounce timer
    _headerCoinBalance: 0,
    _headerCoinSyncTimer: null,
    _headerCoinGainTimer: null,

    init() {
        // Init Socket.io with debounced refresh (safe — won't crash if server is down)
        try {
            this.socket = io(API.getSocketURL(), {
                transports: ['websocket', 'polling'],
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
        } catch (e) {
            console.warn('Socket.io unavailable — real-time updates disabled.', e);
        }

        // Init modules
        DailyView.init();
        MonthlyView.init();
        CheckinView.init();
        StatsView.init();
        GardenView.init();
        TaskModal.init();
        ICSImport.init();
        Pomodoro.init();

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Restore global persona from localStorage
        this._initPersona();

        // Theme
        this.initTheme();

        // Render header coin button dynamically so icon and amount always share one source of truth.
        this._renderHeaderCoins(0);

        // View switching
        this.bindNavigation();

        // Date navigation
        this.bindDateNav();

        // Love counter (在一起天数)
        this.initLoveCounter();

        // Add task buttons
        document.getElementById('btn-add-task').addEventListener('click', () => TaskModal.openCreate());
        document.getElementById('fab-add').addEventListener('click', () => TaskModal.openCreate());

        document.getElementById('btn-import-ics').addEventListener('click', () => ICSImport.open());

        // Ambient sound panel
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
        // Also build grid in pomodoro setup
        AmbientSound.buildSoundGrid('pomodoro-sounds');

        // Pomodoro from sidebar
        document.getElementById('nav-pomodoro').addEventListener('click', () => Pomodoro.open());

        // Checkin from sidebar
        document.getElementById('nav-checkin').addEventListener('click', () => this.switchView('checkin'));

        // Garden and Shop: handled by bindNavigation() via data-view attributes

        // Header coin button — show rules popup
        document.getElementById('header-coin-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._showCoinRules();
        });

        // Persona toggle click — cycle 潘潘→蒲蒲→全部
        document.getElementById('persona-toggle')?.addEventListener('click', () => {
            const order = this._viewSupportsAllAssignee() ? ['潘潘', '蒲蒲', 'all'] : ['潘潘', '蒲蒲'];
            const idx = order.indexOf(this.activePersona);
            this.setPersona(order[(idx + 1) % order.length]);
        });

        // Load initial coin balance
        this._refreshHeaderCoins();

        // Mobile pomodoro
        const mobilePomodoro = document.getElementById('mobile-pomodoro');
        if (mobilePomodoro) mobilePomodoro.addEventListener('click', () => Pomodoro.open());

        // Mobile checkin
        const mobileCheckin = document.getElementById('mobile-checkin');
        if (mobileCheckin) mobileCheckin.addEventListener('click', () => this.switchView('checkin'));

        // Stats from sidebar
        document.getElementById('nav-stats').addEventListener('click', () => this.switchView('stats'));

        // Mobile stats
        const mobileStats = document.getElementById('mobile-stats');
        if (mobileStats) mobileStats.addEventListener('click', () => this.switchView('stats'));

        // Mobile menu with backdrop
        document.getElementById('btn-menu').addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar.classList.contains('open')) {
                this.closeSidebar();
            } else {
                sidebar.classList.add('open');
                // Create backdrop
                const backdrop = document.createElement('div');
                backdrop.className = 'sidebar-backdrop';
                backdrop.id = 'sidebar-backdrop';
                backdrop.addEventListener('click', () => this.closeSidebar());
                document.body.appendChild(backdrop);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (TaskModal.isOpen) TaskModal.close();
                document.getElementById('ics-modal-overlay').classList.add('hidden');
                document.getElementById('widget-modal-overlay').classList.add('hidden');
                this.closeSidebar();
            }
            if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !TaskModal.isOpen &&
                document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                TaskModal.openCreate();
            }
        });

        // Show daily view by default
        this.switchView('daily');

        // Header scroll shadow
        document.querySelectorAll('.view-container').forEach(vc => {
            vc.addEventListener('scroll', () => {
                const header = document.getElementById('main-header');
                header.classList.toggle('scrolled', vc.scrollTop > 8);
            });
        });
    },
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
