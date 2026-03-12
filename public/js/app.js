/**
 * App — main application controller.
 */
const App = {
    currentView: 'daily', // 'daily' | 'monthly'
    currentAssignee: 'all', // 'all' | '潘潘' | '蒲蒲'
    socket: null,

    init() {
        // Init Socket.io
        this.socket = io();
        this.socket.on('task:created', () => this.refreshCurrentView());
        this.socket.on('task:updated', () => this.refreshCurrentView());
        this.socket.on('task:deleted', () => this.refreshCurrentView());
        this.socket.on('task:imported', (data) => {
            this.showToast(`📥 另一设备导入了 ${data.count} 个任务`, 'info');
            this.refreshCurrentView();
        });

        // Init modules
        DailyView.init();
        MonthlyView.init();
        CheckinView.init();
        StatsView.init();
        TaskModal.init();
        ICSImport.init();
        Pomodoro.init();

        // Theme
        this.initTheme();

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

        // Pomodoro from sidebar
        document.getElementById('nav-pomodoro').addEventListener('click', () => Pomodoro.open());

        // Checkin from sidebar
        document.getElementById('nav-checkin').addEventListener('click', () => CheckinView.open());

        // Mobile pomodoro
        const mobilePomodoro = document.getElementById('mobile-pomodoro');
        if (mobilePomodoro) mobilePomodoro.addEventListener('click', () => Pomodoro.open());

        // Mobile checkin
        const mobileCheckin = document.getElementById('mobile-checkin');
        if (mobileCheckin) mobileCheckin.addEventListener('click', () => CheckinView.open());

        // Stats from sidebar
        document.getElementById('nav-stats').addEventListener('click', () => StatsView.open());

        // Mobile stats
        const mobileStats = document.getElementById('mobile-stats');
        if (mobileStats) mobileStats.addEventListener('click', () => StatsView.open());

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
    },

    // ===== Theme =====
    themes: ['light', 'dark', 'sakura', 'ocean', 'forest', 'sunset'],
    themeLabels: { light: '☀️ 亮色', dark: '🌙 暗色', sakura: '🌸 樱花', ocean: '🌊 深海', forest: '🌿 森林', sunset: '🌅 日落' },

    initTheme() {
        const saved = localStorage.getItem('panpu-theme') || 'light';
        this.applyTheme(saved);

        // Desktop: toggle picker panel
        document.getElementById('btn-toggle-theme').addEventListener('click', () => {
            document.getElementById('theme-picker').classList.toggle('open');
        });

        // Swatch clicks
        document.querySelectorAll('.theme-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                this.applyTheme(swatch.dataset.theme);
            });
        });

        // Mobile: cycle through themes
        document.getElementById('mobile-theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const idx = this.themes.indexOf(current);
            const next = this.themes[(idx + 1) % this.themes.length];
            this.applyTheme(next);
        });
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('panpu-theme', theme);
        this.updateThemeUI(theme);
    },

    updateThemeUI(theme) {
        document.getElementById('theme-label').textContent = this.themeLabels[theme] || '主题';
        document.querySelectorAll('.theme-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.theme === theme));
    },

    // ===== Navigation =====
    bindNavigation() {
        // Desktop nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (view) this.switchView(view);
            });
        });

        // Mobile bottom nav
        document.querySelectorAll('.bottom-nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
    },

    switchView(view) {
        this.currentView = view;

        // Update nav active states
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
        document.querySelectorAll('.bottom-nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));

        // Show/hide views
        document.getElementById('view-daily').classList.toggle('hidden', view !== 'daily');
        document.getElementById('view-monthly').classList.toggle('hidden', view !== 'monthly');
        document.getElementById('view-checkin').classList.toggle('hidden', view !== 'checkin');
        document.getElementById('view-stats').classList.toggle('hidden', view !== 'stats');

        // Show/hide today button
        document.getElementById('btn-today').classList.toggle('hidden', false);

        // Load view
        if (view === 'daily') {
            DailyView.setDate(DailyView.currentDate);
        } else if (view === 'stats') {
            StatsView.load();
        } else {
            MonthlyView.syncLocalAssignee();
            MonthlyView.setMonth(MonthlyView.currentYear, MonthlyView.currentMonth);
        }
    },



    // ===== Date Navigation =====
    bindDateNav() {
        document.getElementById('btn-prev').addEventListener('click', () => {
            if (this.currentView === 'daily') {
                DailyView.prevDay();
            } else {
                MonthlyView.prevMonth();
            }
        });

        document.getElementById('btn-next').addEventListener('click', () => {
            if (this.currentView === 'daily') {
                DailyView.nextDay();
            } else {
                MonthlyView.nextMonth();
            }
        });

        document.getElementById('btn-today').addEventListener('click', () => {
            if (this.currentView === 'daily') {
                DailyView.goToday();
            } else {
                MonthlyView.goToday();
            }
        });

        // Touch swipe for mobile
        let touchStartX = 0;
        const mainContent = document.getElementById('main-content');
        mainContent.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        mainContent.addEventListener('touchend', (e) => {
            const diff = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(diff) > 80) {
                if (this.currentView === 'daily') {
                    diff > 0 ? DailyView.prevDay() : DailyView.nextDay();
                } else {
                    diff > 0 ? MonthlyView.prevMonth() : MonthlyView.nextMonth();
                }
            }
        }, { passive: true });
    },

    // ===== Utilities =====
    initLoveCounter() {
        const startDate = new Date(2024, 3, 1); // 2024年4月1日 (月份从0开始)
        const update = () => {
            const now = new Date();
            const diff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
            document.getElementById('love-days').textContent = diff;
        };
        update();
        setInterval(update, 60000); // 每分钟更新
    },

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) backdrop.remove();
    },

    refreshCurrentView() {
        if (this.currentView === 'daily') {
            DailyView.refresh();
        } else {
            MonthlyView.refresh();
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
