Object.assign(App, {
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

        this._applyPersonaToViews(this.activePersona);
        this._updatePersonaToggleUI();

        if (refresh) this.refreshCurrentView();

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

        this._refreshHeaderCoins();

        // Re-join socket room for the new persona
        if (this.socket?.connected) {
            this.socket.emit('join:assignee', this.activePersona);
        }
    },

    _applyPersonaToViews(persona) {
        const scopedPersona = persona === 'all' ? this.lastPersona : persona;
        this.currentAssignee = persona === 'all' ? 'all' : persona;

        if (typeof CheckinView !== 'undefined') {
            CheckinView.currentAssignee = scopedPersona;
        }

        if (typeof StatsView !== 'undefined') {
            StatsView.currentAssignee = scopedPersona;
        }

        if (typeof GardenView !== 'undefined') {
            GardenView.assignee = scopedPersona;
            GardenView.shopAssignee = scopedPersona;
        }

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
            'all': { src: '/img/all.png', label: '全部', cls: 'persona-all' },
        };
        const p = map[this.activePersona] || map['潘潘'];
        img.src = p.src;
        name.textContent = p.label;
        btn.className = 'persona-toggle ' + p.cls;
    },

    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (view) this.switchView(view);
            });
        });

        document.querySelectorAll('.bottom-nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });

        // --- More Panel ---
        const moreBtn = document.getElementById('mobile-more');
        const morePanelOverlay = document.getElementById('more-panel-overlay');
        if (moreBtn && morePanelOverlay) {
            moreBtn.addEventListener('click', () => {
                this.toggleMorePanel();
            });

            // Close on overlay click
            morePanelOverlay.addEventListener('click', (e) => {
                if (e.target === morePanelOverlay) {
                    this.closeMorePanel();
                }
            });

            // Handle more panel items
            morePanelOverlay.querySelectorAll('.more-panel-item').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.dataset.action;
                    this.closeMorePanel();

                    switch (action) {
                        case 'shop':
                            this.switchView('shop');
                            break;
                        case 'stats':
                            this.switchView('stats');
                            break;
                        case 'journal':
                            this.switchView('journal');
                            break;
                        case 'pomodoro':
                            document.getElementById('nav-pomodoro')?.click();
                            break;
                        case 'coins':
                            document.getElementById('header-coin-btn')?.click();
                            break;
                        case 'settings':
                            // Open sidebar settings on mobile
                            const sidebar = document.getElementById('sidebar');
                            if (sidebar) {
                                sidebar.classList.add('open');
                                const backdrop = document.createElement('div');
                                backdrop.className = 'sidebar-backdrop';
                                backdrop.id = 'sidebar-backdrop';
                                backdrop.addEventListener('click', () => this.closeSidebar());
                                document.body.appendChild(backdrop);
                            }
                            break;
                    }
                });
            });
        }
    },

    toggleMorePanel() {
        const overlay = document.getElementById('more-panel-overlay');
        if (!overlay) return;
        const isHidden = overlay.classList.contains('hidden');
        if (isHidden) {
            overlay.classList.remove('hidden');
            // Re-render lucide icons inside the panel
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [overlay] });
        } else {
            this.closeMorePanel();
        }
    },

    closeMorePanel() {
        const overlay = document.getElementById('more-panel-overlay');
        if (overlay) overlay.classList.add('hidden');
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
        // Skip redundant same-view switches (unless it's initial load)
        if (this.currentView === view && this._viewSwitchedOnce) return;
        this._viewSwitchedOnce = true;

        if (!this._viewSupportsAllAssignee(view) && this.activePersona === 'all') {
            this.setPersona(this.lastPersona, { refresh: false });
        }

        const transition = this._runViewTransition(() => {
            this.currentView = view;

            document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
            document.getElementById('nav-stats')?.classList.toggle('active', view === 'stats');
            document.getElementById('nav-checkin')?.classList.toggle('active', view === 'checkin');

            // Mobile bottom nav: "home" button covers daily + monthly
            document.querySelectorAll('.bottom-nav-btn[data-view]').forEach(b => {
                const bView = b.dataset.view;
                const isHomeBtn = b.id === 'mobile-home';
                const isActive = isHomeBtn
                    ? (view === 'daily' || view === 'monthly')
                    : bView === view;
                b.classList.toggle('active', isActive);
            });
            const mobileCheckin = document.getElementById('mobile-checkin');
            if (mobileCheckin) mobileCheckin.classList.toggle('active', view === 'checkin');
            // Close more panel if open
            this.closeMorePanel();

            const viewIds = ['view-daily', 'view-monthly', 'view-checkin', 'view-stats', 'view-garden', 'view-shop', 'view-journal'];
            const viewMap = { daily: 'view-daily', monthly: 'view-monthly', checkin: 'view-checkin', stats: 'view-stats', garden: 'view-garden', shop: 'view-shop', journal: 'view-journal' };
            for (const vid of viewIds) {
                const el = document.getElementById(vid);
                const isTarget = vid === viewMap[view];
                el.classList.toggle('hidden', !isTarget);
                if (isTarget) {
                    // Use CSS class for animation (auto-cleaned after animation ends)
                    el.classList.remove('view-animating');
                    void el.offsetHeight; // force reflow to restart animation
                    el.classList.add('view-animating');
                    el.addEventListener('animationend', () => {
                        el.classList.remove('view-animating');
                    }, { once: true });
                }
            }

            const showDateNav = view === 'daily' || view === 'monthly';
            document.getElementById('date-nav').style.display = showDateNav ? '' : 'none';

            const titles = {
                daily: '今日任务', monthly: '月度总览',
                checkin: '打卡', stats: '统计',
                garden: '花园', shop: '商城',
                journal: '共同日记'
            };
            document.getElementById('header-title').textContent = titles[view] || '峡谷讨伐日记';

            this.closeSidebar();

            const coinBtn = document.getElementById('header-coin-btn');
            if (coinBtn) {
                const hideViews = ['daily', 'monthly'];
                const shouldHide = hideViews.includes(view) && this.currentAssignee === 'all';
                coinBtn.style.display = shouldHide ? 'none' : '';
            }

            this._refreshHeaderCoins();
        });

        // Defer heavy view data loading so the transition animation isn't blocked
        const loadViewData = () => {
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
                case 'journal':
                    JournalView.open();
                    break;
            }
        };

        // If transition API is active, wait for it; otherwise use rAF
        if (transition && transition.finished) {
            transition.finished.then(loadViewData).catch(loadViewData);
        } else {
            requestAnimationFrame(loadViewData);
        }
    },

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
            if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
                if (this.currentView === 'daily') {
                    diffX > 0 ? DailyView.prevDay() : DailyView.nextDay();
                } else {
                    diffX > 0 ? MonthlyView.prevMonth() : MonthlyView.nextMonth();
                }
            }
        }, { passive: true });
    },

    initLoveCounter() {
        const startDate = new Date(2024, 3, 1);
        const update = () => {
            const now = new Date();
            const diff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
            document.getElementById('love-days').textContent = diff;
        };
        update();
        setInterval(update, 60000);
    },

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) backdrop.remove();
    },
});
