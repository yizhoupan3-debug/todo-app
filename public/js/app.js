/**
 * App — main application controller.
 */
const App = {
    currentView: 'daily', // 'daily' | 'monthly' | 'checkin' | 'stats' | 'garden' | 'shop'
    currentAssignee: 'all', // 'all' | '潘潘' | '蒲蒲'
    socket: null,
    _refreshTimer: null, // Socket debounce timer

    init() {
        // Init Socket.io with debounced refresh
        this.socket = io();
        const debouncedRefresh = () => {
            clearTimeout(this._refreshTimer);
            this._refreshTimer = setTimeout(() => this.refreshCurrentView(), 300);
        };
        this.socket.on('task:created', debouncedRefresh);
        this.socket.on('task:updated', debouncedRefresh);
        this.socket.on('task:deleted', debouncedRefresh);
        this.socket.on('task:imported', (data) => {
            this.showToast(`📥 另一设备导入了 ${data.count} 个任务`, 'info');
            debouncedRefresh();
        });

        // Init modules
        DailyView.init();
        MonthlyView.init();
        CheckinView.init();
        StatsView.init();
        GardenView.init();
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

        // Garden from sidebar
        document.getElementById('nav-garden').addEventListener('click', () => this.switchView('garden'));

        // Shop from sidebar
        document.getElementById('nav-shop').addEventListener('click', () => this.switchView('shop'));

        // Header coin button
        document.getElementById('header-coin-btn')?.addEventListener('click', () => this.switchView('garden'));

        // Load initial coin balance
        API.getCoins('潘潘').then(d => {
            document.getElementById('header-coins').textContent = d.balance;
        }).catch(() => { });

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

    // ===== Theme =====
    themes: ['light', 'dark', 'sakura', 'ocean', 'forest', 'sunset'],
    themeLabels: { light: '☀️ 亮色', dark: '🌙 暗色', sakura: '🌸 樱花', ocean: '🌊 深海', forest: '🌿 森林', sunset: '🌅 日落' },

    initTheme() {
        const saved = localStorage.getItem('panpu-theme') || 'light';
        this.applyTheme(saved);

        // Settings panel toggle
        const settingsBtn = document.getElementById('btn-settings');
        const settingsPanel = document.getElementById('settings-panel');
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle('hidden');
        });
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
                settingsPanel.classList.add('hidden');
            }
        });

        // Theme swatch clicks
        document.querySelectorAll('.theme-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                this.applyTheme(swatch.dataset.theme);
            });
        });

        // Platform auto-detect + toggle
        const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
        const platformBtns = document.querySelectorAll('.platform-btn');
        if (!isMac) {
            document.getElementById('platform-mac').classList.remove('active');
            document.getElementById('platform-win').classList.add('active');
        }
        platformBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                platformBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Mobile: cycle through themes
        const mobileTheme = document.getElementById('mobile-theme-toggle');
        if (mobileTheme) {
            mobileTheme.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const idx = this.themes.indexOf(current);
                const next = this.themes[(idx + 1) % this.themes.length];
                this.applyTheme(next);
            });
        }
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('panpu-theme', theme);
        this.updateThemeUI(theme);
    },

    updateThemeUI(theme) {
        const themeLabel = document.getElementById('theme-label');
        if (themeLabel) themeLabel.textContent = this.themeLabels[theme] || '主题';
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

        // Update desktop nav active states
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
        // Stats/checkin sidebar buttons
        document.getElementById('nav-stats')?.classList.toggle('active', view === 'stats');
        document.getElementById('nav-checkin')?.classList.toggle('active', view === 'checkin');
        // Mobile bottom nav
        document.querySelectorAll('.bottom-nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
        const mobileStats = document.getElementById('mobile-stats');
        if (mobileStats) mobileStats.classList.toggle('active', view === 'stats');
        const mobileCheckin = document.getElementById('mobile-checkin');
        if (mobileCheckin) mobileCheckin.classList.toggle('active', view === 'checkin');

        // Show/hide view containers
        document.getElementById('view-daily').classList.toggle('hidden', view !== 'daily');
        document.getElementById('view-monthly').classList.toggle('hidden', view !== 'monthly');
        document.getElementById('view-checkin').classList.toggle('hidden', view !== 'checkin');
        document.getElementById('view-stats').classList.toggle('hidden', view !== 'stats');
        document.getElementById('view-garden').classList.toggle('hidden', view !== 'garden');
        document.getElementById('view-shop').classList.toggle('hidden', view !== 'shop');

        // Show/hide date navigation (only for daily/monthly)
        const showDateNav = (view === 'daily' || view === 'monthly');
        document.getElementById('date-nav').style.display = showDateNav ? '' : 'none';

        // Update header title
        const titles = {
            daily: '今日任务', monthly: '月度总览',
            checkin: '打卡', stats: '统计',
            garden: '花园', shop: '商城'
        };
        document.getElementById('header-title').textContent = titles[view] || '峡谷讨伐日记';

        // Close sidebar on mobile after switching
        this.closeSidebar();

        // Refresh header coin balance
        this._refreshHeaderCoins();

        // Load view data
        switch (view) {
            case 'daily':
                DailyView.setDate(DailyView.currentDate);
                break;
            case 'monthly':
                MonthlyView.syncLocalAssignee();
                MonthlyView.setMonth(MonthlyView.currentYear, MonthlyView.currentMonth);
                break;
            case 'checkin':
                CheckinView.showLanding();
                break;
            case 'stats':
                StatsView.load();
                break;
            case 'garden':
                GardenView.open();
                break;
            case 'shop':
                GardenView.openShop();
                break;
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

        // Touch swipe for mobile (horizontal only, skip on stats/checkin)
        let touchStartX = 0;
        let touchStartY = 0;
        const mainContent = document.getElementById('main-content');
        mainContent.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        mainContent.addEventListener('touchend', (e) => {
            if (this.currentView !== 'daily' && this.currentView !== 'monthly') return;
            const diffX = e.changedTouches[0].clientX - touchStartX;
            const diffY = e.changedTouches[0].clientY - touchStartY;
            // Only trigger if horizontal swipe is dominant (not vertical scrolling)
            if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
                if (this.currentView === 'daily') {
                    diffX > 0 ? DailyView.prevDay() : DailyView.nextDay();
                } else {
                    diffX > 0 ? MonthlyView.prevMonth() : MonthlyView.nextMonth();
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
        switch (this.currentView) {
            case 'daily': DailyView.refresh(); break;
            case 'monthly': MonthlyView.refresh(); break;
            case 'stats': StatsView.load(); break;
            case 'checkin': CheckinView._reloadCurrentPage(); break;
            case 'garden': GardenView.open(); break;
            case 'shop': GardenView.openShop(); break;
        }
        // Also refresh header coins
        this._refreshHeaderCoins();
    },

    _refreshHeaderCoins() {
        API.getCoins('潘潘').then(d => {
            const el = document.getElementById('header-coins');
            if (el) el.textContent = d.balance;
        }).catch(() => { });
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

// Widget installer — shows instruction modal with copyable command
function installWidget(widgetType) {
    const platform = document.querySelector('.platform-btn.active')?.dataset.platform || 'mac';
    const baseUrl = location.origin;
    const widgetUrl = `${baseUrl}/widget/${widgetType}.html`;

    const widgetMeta = {
        todo: { name: '今日待办', icon: '📋', desc: '紧凑任务列表 · 独立窗口运行' },
        calendar: { name: '月历视图', icon: '📅', desc: '日历 + 任务详情 · 宽屏视图' }
    };
    const sizes = { todo: '360,520', calendar: '920,640' };
    const meta = widgetMeta[widgetType] || { name: widgetType, icon: '🖥️', desc: '桌面小组件' };
    const size = sizes[widgetType] || '600,500';

    let cmd, step1Text, tipText, termTitle, prompt;

    if (platform === 'mac') {
        step1Text = '打开「终端」(按 ⌘+空格 搜索 Terminal)';
        cmd = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --app="${widgetUrl}" --window-size=${size}`;
        tipText = '✨ 用 Chrome App 模式打开，无地址栏，像原生小组件一样';
        termTitle = 'Terminal';
        prompt = '$';
    } else {
        step1Text = '打开「命令提示符」(按 Win+R 输入 cmd)';
        cmd = `start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --app="${widgetUrl}" --window-size=${size}`;
        tipText = '✨ 用 Chrome App 模式打开，无地址栏，像原生小组件一样';
        termTitle = 'CMD';
        prompt = '>';
    }

    // Populate modal hero
    document.getElementById('widget-hero-icon').textContent = meta.icon;
    document.getElementById('widget-modal-title').textContent = `安装「${meta.name}」小组件`;
    document.getElementById('widget-hero-sub').textContent = meta.desc;

    // Populate terminal
    document.getElementById('widget-step1-text').textContent = step1Text;
    document.getElementById('widget-cmd-code').textContent = cmd;
    document.getElementById('widget-terminal-title').textContent = termTitle;
    document.getElementById('widget-terminal-prompt').textContent = prompt;
    document.getElementById('widget-tip').textContent = tipText;
    document.getElementById('widget-tab-cmd-icon').textContent = platform === 'mac' ? '⌨️' : '💻';

    // Populate URL
    document.getElementById('widget-url-code').textContent = widgetUrl;

    // Show modal
    const overlay = document.getElementById('widget-modal-overlay');
    overlay.classList.remove('hidden');

    // --- Method tab switching ---
    const tabCmd = document.getElementById('widget-tab-cmd');
    const tabBrowser = document.getElementById('widget-tab-browser');
    const panelCmd = document.getElementById('widget-panel-cmd');
    const panelBrowser = document.getElementById('widget-panel-browser');

    tabCmd.className = 'widget-method-tab active';
    tabBrowser.className = 'widget-method-tab';
    panelCmd.classList.remove('hidden');
    panelBrowser.classList.add('hidden');

    tabCmd.onclick = () => {
        tabCmd.classList.add('active'); tabBrowser.classList.remove('active');
        panelCmd.classList.remove('hidden'); panelBrowser.classList.add('hidden');
    };
    tabBrowser.onclick = () => {
        tabBrowser.classList.add('active'); tabCmd.classList.remove('active');
        panelBrowser.classList.remove('hidden'); panelCmd.classList.add('hidden');
    };

    // --- Copy button ---
    const copyBtn = document.getElementById('widget-copy-btn');
    copyBtn.innerHTML = '<span class="widget-action-icon">📋</span> 复制命令';
    copyBtn.classList.remove('copied');
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(cmd).then(() => {
            copyBtn.innerHTML = '<span class="widget-action-icon">✅</span> 已复制!';
            copyBtn.classList.add('copied');
            App.showToast('命令已复制到剪贴板 ✨', 'success');
            setTimeout(() => {
                copyBtn.innerHTML = '<span class="widget-action-icon">📋</span> 复制命令';
                copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = cmd; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
            copyBtn.innerHTML = '<span class="widget-action-icon">✅</span> 已复制!';
            copyBtn.classList.add('copied');
            App.showToast('命令已复制到剪贴板 ✨', 'success');
            setTimeout(() => {
                copyBtn.innerHTML = '<span class="widget-action-icon">📋</span> 复制命令';
                copyBtn.classList.remove('copied');
            }, 2000);
        });
    };

    // --- Direct open button ---
    document.getElementById('widget-open-btn').onclick = () => {
        window.open(widgetUrl, '_blank');
        App.showToast(`已在新标签页打开「${meta.name}」✨`, 'success');
    };

    // --- Close ---
    document.getElementById('widget-modal-close').onclick = () => overlay.classList.add('hidden');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.add('hidden'); };
}

