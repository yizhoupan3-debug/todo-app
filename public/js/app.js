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
            this.socket = io();
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

    // ===== Theme =====
    themes: ['indigo', 'sakura', 'ocean', 'forest', 'sunset', 'lavender', 'mocha', 'rosegold'],

    initTheme() {
        // Load saved mode and accent theme
        const savedMode = localStorage.getItem('panpu-mode') || 'light';
        const savedTheme = localStorage.getItem('panpu-theme') || 'indigo';
        this.applyMode(savedMode);
        this.applyTheme(savedTheme);

        // Settings panel toggle
        const settingsBtn = document.getElementById('btn-settings');
        const settingsPanel = document.getElementById('settings-panel');
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle('hidden');
            // Refresh Lucide icons for settings panel only
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ attrs: {}, node: settingsPanel });
            }
        });
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
                settingsPanel.classList.add('hidden');
            }
        });

        // Mode toggle (light/dark)
        document.getElementById('mode-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-mode');
            this.applyMode(current === 'dark' ? 'light' : 'dark');
        });

        // Accent theme swatch clicks
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

        // Mobile: tap toggles mode, long press cycles accent
        const mobileTheme = document.getElementById('mobile-theme-toggle');
        if (mobileTheme) {
            mobileTheme.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-mode');
                this.applyMode(current === 'dark' ? 'light' : 'dark');
            });
        }
    },

    applyMode(mode) {
        document.documentElement.setAttribute('data-mode', mode);
        localStorage.setItem('panpu-mode', mode);
        // Update mode toggle UI
        const label = document.getElementById('mode-label');
        const toggleBtn = document.getElementById('mode-toggle');
        if (label) label.textContent = mode === 'dark' ? '暗色模式' : '亮色模式';
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', mode === 'dark' ? 'moon' : 'sun');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ attrs: {}, node: toggleBtn });
            }
        }
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('panpu-theme', theme);
        document.querySelectorAll('.theme-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.theme === theme));
    },

    // ===== Global Persona Toggle =====
    _initPersona() {
        const saved = localStorage.getItem('panpu-persona');
        const savedLast = localStorage.getItem('panpu-last-persona');
        if (savedLast && ['潘潘', '蒲蒲'].includes(savedLast)) {
            this.lastPersona = savedLast;
        }
        if (saved && ['潘潘', '蒲蒲', 'all'].includes(saved)) {
            this.activePersona = saved;
            if (saved !== 'all') this.lastPersona = saved;
        } else {
            this.activePersona = '潘潘';
        }
        // Silently sync all views without triggering reloads
        this._applyPersonaToViews(this.activePersona);
        this._updatePersonaToggleUI();
    },

    _viewSupportsAllAssignee(view = this.currentView) {
        return view === 'daily' || view === 'monthly';
    },

    setPersona(persona, { refresh = true } = {}) {
        const nextPersona = (!this._viewSupportsAllAssignee() && persona === 'all')
            ? this.lastPersona
            : persona;
        this.activePersona = nextPersona;
        if (nextPersona !== 'all') this.lastPersona = nextPersona;
        localStorage.setItem('panpu-persona', this.activePersona);
        localStorage.setItem('panpu-last-persona', this.lastPersona);

        // Sync all views
        this._applyPersonaToViews(this.activePersona);
        this._updatePersonaToggleUI();

        // Refresh current view
        if (refresh) this.refreshCurrentView();

        // Re-sync filter pills in daily/monthly views
        if (typeof DailyView !== 'undefined') DailyView.syncPersonPills();
        if (typeof MonthlyView !== 'undefined') MonthlyView.syncLocalAssignee?.();
        if (typeof CheckinView !== 'undefined') {
            document.querySelectorAll('.checkin-person-btn').forEach(b =>
                b.classList.toggle('active', b.dataset.assignee === CheckinView.currentAssignee));
        }
        if (typeof StatsView !== 'undefined') {
            document.querySelectorAll('.stats-person-filter .filter-pill').forEach(b =>
                b.classList.toggle('active', b.dataset.assignee === StatsView.currentAssignee));
        }
        if (typeof GardenView !== 'undefined' && document.querySelector('.backpack-overlay')) {
            const backpackAssignee = this.currentView === 'shop' ? GardenView.shopAssignee : GardenView.assignee;
            GardenView.showBackpack(backpackAssignee);
        }

        // Refresh coin display
        this._refreshHeaderCoins();
    },

    _applyPersonaToViews(persona) {
        const scopedPersona = persona === 'all' ? this.lastPersona : persona;
        // For daily/monthly: set currentAssignee to persona (潘潘, 蒲蒲, or 'all')
        this.currentAssignee = persona === 'all' ? 'all' : persona;

        // For checkin: no 'all' mode, default to 潘潘 or 蒲蒲
        if (typeof CheckinView !== 'undefined') {
            CheckinView.currentAssignee = scopedPersona;
        }

        if (typeof StatsView !== 'undefined') {
            StatsView.currentAssignee = scopedPersona;
        }

        // For garden: no 'all' mode
        if (typeof GardenView !== 'undefined') {
            GardenView.assignee = scopedPersona;
            GardenView.shopAssignee = scopedPersona;
        }

        // Show/hide header coin button
        const coinBtn = document.getElementById('header-coin-btn');
        if (coinBtn) {
            const hideViews = ['daily', 'monthly'];
            const shouldHide = hideViews.includes(this.currentView) && persona === 'all';
            coinBtn.style.display = shouldHide ? 'none' : '';
        }
    },

    _updatePersonaToggleUI() {
        const img = document.getElementById('persona-toggle-img');
        const name = document.getElementById('persona-toggle-name');
        const btn = document.getElementById('persona-toggle');
        if (!img || !name || !btn) return;

        const map = {
            '潘潘': { src: '/img/panpan.png', label: '潘潘', cls: 'persona-panpan' },
            '蒲蒲': { src: '/img/pupu.png', label: '蒲蒲', cls: 'persona-pupu' },
            'all':  { src: '/img/all.png',   label: '全部', cls: 'persona-all' },
        };
        const p = map[this.activePersona] || map['潘潘'];
        img.src = p.src;
        name.textContent = p.label;
        btn.className = 'persona-toggle ' + p.cls;
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

    _runViewTransition(work) {
        const canTransition = typeof document !== 'undefined'
            && typeof document.startViewTransition === 'function'
            && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!canTransition) {
            work();
            return null;
        }
        try {
            return document.startViewTransition(() => {
                work();
            });
        } catch (e) {
            work();
            return null;
        }
    },

    switchView(view) {
        if (!this._viewSupportsAllAssignee(view) && this.activePersona === 'all') {
            this.setPersona(this.lastPersona, { refresh: false });
        }
        this._runViewTransition(() => {
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

            // Show/hide view containers + trigger transition animation
            const viewIds = ['view-daily', 'view-monthly', 'view-checkin', 'view-stats', 'view-garden', 'view-shop'];
            const viewMap = { daily: 'view-daily', monthly: 'view-monthly', checkin: 'view-checkin', stats: 'view-stats', garden: 'view-garden', shop: 'view-shop' };
            for (const vid of viewIds) {
                const el = document.getElementById(vid);
                const isTarget = vid === viewMap[view];
                el.classList.toggle('hidden', !isTarget);
                if (isTarget) {
                    el.style.animation = 'none';
                    el.offsetHeight;
                    el.style.animation = 'viewFadeIn 0.25s ease-out';
                }
            }

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

            // Show/hide header coin button (hide in daily/monthly when assignee='all')
            const coinBtn = document.getElementById('header-coin-btn');
            if (coinBtn) {
                const hideViews = ['daily', 'monthly'];
                const shouldHide = hideViews.includes(view) && this.currentAssignee === 'all';
                coinBtn.style.display = shouldHide ? 'none' : '';
            }

            // Refresh header coin balance
            this._refreshHeaderCoins();
        });

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
            case 'garden': GardenView.refreshData(); break;
            case 'shop': GardenView.refreshShopData(); break;
        }
        // Also refresh header coins
        this._refreshHeaderCoins();
    },

    _normalizeCoinBalance(balance) {
        return Math.round((Number(balance) || 0) * 10) / 10;
    },

    _getHeaderCoinUser() {
        if (this.currentView === 'garden' && typeof GardenView !== 'undefined') {
            return GardenView.assignee;
        }
        if (this.currentView === 'shop' && typeof GardenView !== 'undefined') {
            return GardenView.shopAssignee;
        }
        if (this.currentView === 'checkin' && typeof CheckinView !== 'undefined') {
            return CheckinView.currentAssignee;
        }
        if (this.currentView === 'stats' && typeof StatsView !== 'undefined') {
            return StatsView.currentAssignee;
        }
        if (this.currentAssignee && this.currentAssignee !== 'all') {
            return this.currentAssignee;
        }
        return '潘潘';
    },

    _syncCoinCaches({ assignee, balance = null, delta = 0 }) {
        if (typeof GardenView === 'undefined' || !assignee) return;
        const nextBalance = (current) => (
            balance == null
                ? this._normalizeCoinBalance((Number(current) || 0) + delta)
                : this._normalizeCoinBalance(balance)
        );

        if (GardenView.assignee === assignee) {
            GardenView.balance = nextBalance(GardenView.balance);
            const el = document.querySelector('.island-hud .garden-balance strong');
            if (el) el.textContent = Utils.formatCoinBalance(GardenView.balance);
        }

        if (GardenView.shopAssignee === assignee) {
            GardenView.shopBalance = nextBalance(GardenView.shopBalance);
            const el = document.querySelector('#view-shop .garden-balance strong');
            if (el) el.textContent = Utils.formatCoinBalance(GardenView.shopBalance);
        }
    },

    syncCoins({ assignee, balance = null, delta = 0, animate = delta > 0 } = {}) {
        if (!assignee) return;

        const normalizedDelta = this._normalizeCoinBalance(delta);
        this._syncCoinCaches({ assignee, balance, delta: normalizedDelta });

        if (assignee !== this._getHeaderCoinUser()) return;

        const nextBalance = balance == null
            ? this._normalizeCoinBalance(this._headerCoinBalance + normalizedDelta)
            : this._normalizeCoinBalance(balance);

        this._renderHeaderCoins(nextBalance);

        if (animate && normalizedDelta > 0) {
            this._animateHeaderCoinGain(normalizedDelta);
        }

        if (balance == null) {
            clearTimeout(this._headerCoinSyncTimer);
            this._headerCoinSyncTimer = setTimeout(() => this._refreshHeaderCoins(), 180);
        }
    },

    _refreshHeaderCoins() {
        const coinUser = this._getHeaderCoinUser();
        API.getCoins(coinUser).then(d => {
            this._renderHeaderCoins(this._normalizeCoinBalance(d.balance));
        }).catch(() => { });
    },

    _renderHeaderCoins(balance = 0) {
        const btn = document.getElementById('header-coin-btn');
        if (!btn) return;
        this._headerCoinBalance = this._normalizeCoinBalance(balance);
        btn.innerHTML = Utils.headerCoinMarkup(this._headerCoinBalance);
    },

    _animateHeaderCoinGain(delta) {
        const btn = document.getElementById('header-coin-btn');
        if (!btn || btn.style.display === 'none') return;

        btn.classList.remove('coin-gain');
        void btn.offsetWidth;
        btn.classList.add('coin-gain');

        clearTimeout(this._headerCoinGainTimer);
        this._headerCoinGainTimer = setTimeout(() => {
            btn.classList.remove('coin-gain');
        }, 700);

        btn.querySelectorAll('.header-coin-float').forEach(el => el.remove());
        const float = document.createElement('span');
        float.className = 'header-coin-float';
        float.textContent = `+${Utils.formatCoinBalance(delta)}`;
        btn.appendChild(float);
        float.addEventListener('animationend', () => float.remove(), { once: true });
    },

    _showCoinRules() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'coin-rules-overlay';
        overlay.innerHTML = `
            <div class="coin-rules-modal">
                <div class="coin-rules-header">
                ${Utils.coinSvg('cat-coin-icon large')}
                    <h3>喵喵币获取规则</h3>
                    <button class="coin-rules-close">✕</button>
                </div>
                <div class="coin-rules-body">
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">✅</span>
                    <div><strong>完成任务</strong><br>每完成一个任务获得 <b>1.5</b> 喵喵币</div>
                </div>
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">📅</span>
                    <div><strong>每日打卡</strong><br>每项达标 <b>0.5</b> 币，连续3天 <b>+2</b>，连续7天 <b>+5</b>（然后重置）</div>
                </div>
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">🍅</span>
                    <div><strong>番茄钟</strong><br>15分钟 <b>0.5</b> · 25分 <b>1</b> · 45分 <b>2</b> · 60分 <b>3</b> 币<br>专注结束后评分结算：时间奖励 × <b>50%</b> · <b>75%</b> · <b>100%</b> · <b>125%</b> · <b>150%</b></div>
                </div>
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">🌳</span>
                    <div><strong>植物成长</strong><br>专注种树，植物成长时随机掉落喵喵币</div>
                </div>
                <div class="coin-rule-item">
                    <span class="coin-rule-icon">🛒</span>
                    <div><strong>商城消费</strong><br>在商城中购买植物、装饰等</div>
                </div>
            </div>
                <div class="coin-rules-footer">
                    <button class="coin-rules-goto-garden">🌴 去花园</button>
                    <button class="coin-rules-goto-shop">🛒 去商城</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        // Close handlers
        overlay.querySelector('.coin-rules-close').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.querySelector('.coin-rules-goto-garden').onclick = () => { overlay.remove(); this.switchView('garden'); };
        overlay.querySelector('.coin-rules-goto-shop').onclick = () => { overlay.remove(); this.switchView('shop'); };
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
