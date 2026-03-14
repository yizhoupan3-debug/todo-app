/* ── Garden & Shop View ── */
const GardenView = {
    plots: [],
    trees: [],
    balance: 0,
    shopBalance: 0,
    assignee: '潘潘',
    shopAssignee: '潘潘',
    selectedTree: null, // for planting
    islands: [],
    boats: [],
    expeditions: [],
    currentIsland: null, // active island being viewed

    // Tree catalog with 4 stage images
    catalog: [
        {
            type: 'sprout', icon: '🌱', name: '小草', cost: 0, desc: '万物起始',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/sprout_growing.svg', mature: '/img/trees/sprout.svg' }
        },
        {
            type: 'rice', icon: '🌾', name: '稻穗', cost: 5, desc: '粒粒皆辛苦',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/rice_growing.svg', mature: '/img/trees/rice.svg' }
        },
        {
            type: 'strawberry', icon: '🍓', name: '草莓', cost: 8, desc: '甜蜜小确幸',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/strawberry_growing.svg', mature: '/img/trees/strawberry.svg' }
        },
        {
            type: 'sunflower', icon: '🌻', name: '向日葵', cost: 10, desc: '追逐阳光',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/sunflower_growing.svg', mature: '/img/trees/sunflower.svg' }
        },
        {
            type: 'corn', icon: '🌽', name: '玉米', cost: 12, desc: '金色丰收',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/corn_growing.svg', mature: '/img/trees/corn.svg' }
        },
        {
            type: 'mushroom', icon: '🍄', name: '蘑菇', cost: 15, desc: '雨后精灵',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/mushroom_growing.svg', mature: '/img/trees/mushroom.svg' }
        },
        {
            type: 'tulip', icon: '🌷', name: '郁金香', cost: 20, desc: '优雅绽放',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/tulip_growing.svg', mature: '/img/trees/tulip.svg' }
        },
        {
            type: 'daisy', icon: '🌼', name: '雏菊', cost: 22, desc: '天真烂漫',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/daisy_growing.svg', mature: '/img/trees/daisy.svg' }
        },
        {
            type: 'hibiscus', icon: '🌺', name: '芙蓉花', cost: 25, desc: '热情似火',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/hibiscus_growing.svg', mature: '/img/trees/hibiscus.svg' }
        },
        {
            type: 'sakura', icon: '🌸', name: '樱花树', cost: 30, desc: '浪漫满开',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/sakura_growing.svg', mature: '/img/trees/sakura.svg' }
        },
        {
            type: 'chrysanthemum', icon: '💐', name: '菊花', cost: 35, desc: '傲霜斗雪',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/chrysanthemum_growing.svg', mature: '/img/trees/chrysanthemum.svg' }
        },
        {
            type: 'true_lavender', icon: '💜', name: '薰衣草', cost: 38, desc: '普罗旺斯之梦',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/true_lavender_growing.svg', mature: '/img/trees/true_lavender.svg' }
        },
        {
            type: 'pumpkin', icon: '🎃', name: '南瓜', cost: 42, desc: '万圣精灵',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/pumpkin_growing.svg', mature: '/img/trees/pumpkin.svg' }
        },
        {
            type: 'bamboo', icon: '🎋', name: '竹子', cost: 45, desc: '节节高升',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/bamboo_growing.svg', mature: '/img/trees/bamboo.svg' }
        },
        {
            type: 'pine', icon: '🌲', name: '松树', cost: 50, desc: '四季常青',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/pine_growing.svg', mature: '/img/trees/pine.svg' }
        },
        {
            type: 'oak', icon: '🌳', name: '落叶树', cost: 50, desc: '枝繁叶茂',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/oak_growing.svg', mature: '/img/trees/oak.svg' }
        },
        {
            type: 'peach', icon: '🍑', name: '桃树', cost: 55, desc: '人面桃花',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/peach_growing.svg', mature: '/img/trees/peach.svg' }
        },
        {
            type: 'mint', icon: '🌿', name: '薄荷', cost: 60, desc: '清凉一夏',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/mint_growing.svg', mature: '/img/trees/mint.svg' }
        },
        {
            type: 'orange_tree', icon: '🍊', name: '橘子树', cost: 65, desc: '大吉大利',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/orange_tree_growing.svg', mature: '/img/trees/orange_tree.svg' }
        },
        {
            type: 'lotus', icon: '🪷', name: '莲花', cost: 70, desc: '出淤泥不染',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/lotus_growing.svg', mature: '/img/trees/lotus.svg' }
        },
        {
            type: 'palm', icon: '🌴', name: '棕榈树', cost: 80, desc: '热带风情',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/palm_growing.svg', mature: '/img/trees/palm.svg' }
        },
        {
            type: 'christmas', icon: '🎄', name: '圣诞树', cost: 80, desc: '节日快乐',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/christmas_growing.svg', mature: '/img/trees/christmas.svg' }
        },
        {
            type: 'maple', icon: '🍁', name: '枫树', cost: 95, desc: '霜叶红于花',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/maple_growing.svg', mature: '/img/trees/maple.svg' }
        },
        {
            type: 'cactus', icon: '🌵', name: '仙人掌', cost: 100, desc: '沙漠之花',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/cactus_growing.svg', mature: '/img/trees/cactus.svg' }
        },
        {
            type: 'rose', icon: '🌹', name: '玫瑰', cost: 100, desc: '爱的承诺',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/rose_growing.svg', mature: '/img/trees/rose.svg' }
        },
        {
            type: 'peony', icon: '🏵️', name: '牡丹', cost: 110, desc: '国色天香',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/peony_growing.svg', mature: '/img/trees/peony.svg' }
        },
        {
            type: 'grape', icon: '🍇', name: '葡萄藤', cost: 120, desc: '硕果累累',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/grape_growing.svg', mature: '/img/trees/grape.svg' }
        },
        {
            type: 'clover', icon: '🍀', name: '四叶草', cost: 150, desc: '幸运降临',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/clover_growing.svg', mature: '/img/trees/clover.svg' }
        },
        {
            type: 'lavender', icon: '🪻', name: '彩虹花', cost: 200, desc: '传说之花',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/lavender_growing.svg', mature: '/img/trees/lavender.svg' }
        },
    ],

    obstacleMap: {
        rock: { img: '/img/trees/obstacle_rock.svg', name: '石头', cost: 10 },
        weed: { img: '/img/trees/obstacle_weed.svg', name: '杂草', cost: 5 },
        wild_tree: { img: '/img/trees/obstacle_wild_tree.svg', name: '野树', cost: 15 },
    },

    SCENE_GRID_W: 8,
    SCENE_GRID_H: 6,

    _staticRendered: false,
    _backpackSort: { by: 'price', order: 'asc' },
    _plotMenuCleanup: null,
    _backpackRenderQueued: false,
    _backpackOverlayEl: null,
    _backpackContentEl: null,
    _backpackSearchInputEl: null,
    _activePlotMenu: null,

    init() { },

    _getHeaderCoinContext() {
        if (App.currentView === 'garden') {
            return { assignee: this.assignee, balance: this.balance };
        }
        if (App.currentView === 'shop') {
            return { assignee: this.shopAssignee, balance: this.shopBalance };
        }
        if (App.currentAssignee && App.currentAssignee !== 'all') {
            if (App.currentAssignee === this.assignee) {
                return { assignee: this.assignee, balance: this.balance };
            }
            if (App.currentAssignee === this.shopAssignee) {
                return { assignee: this.shopAssignee, balance: this.shopBalance };
            }
            return { assignee: App.currentAssignee, balance: null };
        }
        return { assignee: '潘潘', balance: null };
    },

    /* Lightweight refresh: re-fetch data + update dynamic DOM only (no full re-render) */
    async refreshData() {
        const el = document.getElementById('view-garden');
        if (!el) return;

        // If never rendered, do full open
        if (!this._staticRendered) { await this.open(); return; }

        // Re-fetch data silently
        try {
            const { balance } = await API.getCoins(this.assignee);
            this.balance = balance;
        } catch (e) { /* keep old */ }

        try {
            if (this.currentIsland) {
                this.plots = await API.fetch(`/garden/plots/${encodeURIComponent(this.assignee)}/${this.currentIsland.id}`).then(r => r.json());
            } else {
                this.plots = await API.getPlots(this.assignee);
            }
        } catch (e) { /* keep old */ }

        // Update only dynamic parts
        this._updateDynamicContent();
        this.updateHeaderCoins();
    },

    async refreshShopData() {
        const el = document.getElementById('view-shop');
        if (!el || !el.innerHTML.trim()) { await this.openShop(); return; }
        try {
            const { balance } = await API.getCoins(this.shopAssignee);
            this.shopBalance = balance;
        } catch (e) { /* keep old */ }
        // Update balance display only
        const balEl = el.querySelector('.garden-balance strong');
        if (balEl) balEl.textContent = Utils.formatCoinBalance(this.shopBalance);
        this.updateHeaderCoins();
    },

    getPlotZone(plot) {
        const island = this.currentIsland || {};
        const gridW = Math.max(1, Number(island.grid_w) || this.SCENE_GRID_W);
        const gridH = Math.max(1, Number(island.grid_h) || this.SCENE_GRID_H);
        const x = Math.max(0, Math.min(gridW - 1, Number(plot?.x) || 0));
        const y = Math.max(0, Math.min(gridH - 1, Number(plot?.y) || 0));
        const forestRows = Math.max(3, Math.floor(gridH * 0.5));
        const forestBand = y < forestRows || (y === forestRows && x > 0 && x < gridW - 1);

        if (forestBand) return 'forest';
        if (y >= gridH - 2) return x <= 1 || x >= gridW - 2 ? 'shore' : 'field';
        return 'field';
    },

    _plotNoise(plot, salt = 0) {
        const islandId = Number(this.currentIsland?.id) || 1;
        const x = Number(plot?.x) || 0;
        const y = Number(plot?.y) || 0;
        const n = Math.sin((x + 1) * 127.1 + (y + 1) * 311.7 + islandId * 53.3 + salt * 19.7) * 43758.5453;
        return n - Math.floor(n);
    },

    getPlotLayout(plot) {
        const island = this.currentIsland || {};
        const gridW = Math.max(1, Number(island.grid_w) || this.SCENE_GRID_W);
        const gridH = Math.max(1, Number(island.grid_h) || this.SCENE_GRID_H);
        const x = Math.max(0, Math.min(gridW - 1, Number(plot?.x) || 0));
        const y = Math.max(0, Math.min(gridH - 1, Number(plot?.y) || 0));
        const xRatio = gridW === 1 ? 0.5 : x / Math.max(1, gridW - 1);
        const yRatio = gridH === 1 ? 0.5 : y / Math.max(1, gridH - 1);
        const zone = this.getPlotZone(plot);
        const n1 = this._plotNoise(plot, 1);
        const n2 = this._plotNoise(plot, 2);
        const n3 = this._plotNoise(plot, 3);
        const n4 = this._plotNoise(plot, 4);

        let left;
        let top;
        let scale;

        if (zone === 'forest') {
            const forestDepth = y <= 2 ? y : 2.45;
            left = 14 + xRatio * 71 + Math.sin((x + 1) * 0.78 + y * 0.4) * 2.8 + (n1 - 0.5) * 6.2;
            top = 18 + forestDepth * 8.7 + Math.cos((x + 2) * 0.72 + y * 0.65) * 2.3 + (n2 - 0.5) * 3.6;
            scale = 0.84 + forestDepth * 0.055 + (n3 - 0.5) * 0.08;
        } else {
            const fieldRow = Math.max(0, y - Math.max(3, Math.floor(gridH * 0.5)));
            left = 15 + xRatio * 70 + Math.sin((x + 3) * 0.95 + y * 0.36) * 4.9 + (n1 - 0.5) * 8;
            top = 56 + fieldRow * 11.7 + Math.cos((x + 1) * 0.64 + y * 0.58) * 2.5 + (n2 - 0.5) * 4.4;
            scale = 0.94 + fieldRow * 0.05 + (n3 - 0.5) * 0.08;
            if (zone === 'shore') {
                top += 1.4 + n4 * 2.4;
                left += x <= 1 ? -2.8 : 2.8;
                scale += 0.04;
            }
        }

        return {
            left,
            top,
            scale,
            zone,
            zIndex: Math.round(10 + top),
        };
    },

    /* ── CSS-transform based pan / zoom ── */
    _panX: 0,
    _panY: 0,
    _fitZoom: 0.72,
    _defaultZoom: 0.9,
    _viewportPadding: 44,

    _recalculateZoomBounds(vp, world) {
        if (!vp || !world) return;
        const fitX = vp.clientWidth / world.offsetWidth;
        const fitY = vp.clientHeight / world.offsetHeight;
        this._fitZoom = Math.max(Math.min(fitX, fitY), 0.56);
        this._minZoom = Math.max(0.72, this._fitZoom);
        this._defaultZoom = Math.max(this._minZoom, Math.min(1.05, this._fitZoom * 1.16));
    },

    _zoomAtPoint(vp, world, nextZoom, clientX, clientY) {
        if (!vp || !world) return;
        this._recalculateZoomBounds(vp, world);
        const rect = vp.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;
        const worldX = (offsetX - this._panX) / this._zoom;
        const worldY = (offsetY - this._panY) / this._zoom;

        this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, nextZoom));
        this._panX = offsetX - worldX * this._zoom;
        this._panY = offsetY - worldY * this._zoom;
        this._clampPan(vp, world);
        this._applyWorldTransform(world);
    },

    _clampPan(vp, world) {
        if (!vp || !world) return;
        this._recalculateZoomBounds(vp, world);
        const vpW = vp.clientWidth;
        const vpH = vp.clientHeight;
        const wW = world.offsetWidth * this._zoom;
        const wH = world.offsetHeight * this._zoom;
        const edge = this._viewportPadding;
        const minX = vpW - wW - edge;
        const maxX = edge;
        const minY = vpH - wH - edge;
        const maxY = edge;
        if (wW <= vpW) {
            this._panX = (vpW - wW) / 2;
        } else {
            this._panX = Math.max(minX, Math.min(maxX, this._panX));
        }
        if (wH <= vpH) {
            this._panY = (vpH - wH) / 2;
        } else {
            this._panY = Math.max(minY, Math.min(maxY, this._panY));
        }
    },

    _centerViewport(vp, world) {
        if (!vp || !world) return;
        this._recalculateZoomBounds(vp, world);
        this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, this._defaultZoom));
        const vpW = vp.clientWidth;
        const vpH = vp.clientHeight;
        const wW = world.offsetWidth * this._zoom;
        const wH = world.offsetHeight * this._zoom;
        this._panX = (vpW - wW) / 2;
        this._panY = (vpH - wH) / 2;
        this._clampPan(vp, world);
        this._applyWorldTransform(world);
    },

    _applyWorldTransform(world) {
        if (!world) world = document.getElementById('island-world');
        if (!world) return;
        world.style.transform = `translate3d(${this._panX}px, ${this._panY}px, 0) scale(${this._zoom})`;
        world.style.transformOrigin = '0 0';
    },

    _syncPlantingToolbar() {
        const view = document.getElementById('view-garden');
        if (!view) return;
        const current = view.querySelector('.planting-toolbar');
        if (!this.selectedTree) {
            current?.remove();
            return;
        }

        const toolbarHtml = this.renderPlantingToolbar();
        if (!toolbarHtml) {
            current?.remove();
            return;
        }

        if (current) {
            current.outerHTML = toolbarHtml;
        } else {
            view.querySelector('.island-stats-bar')?.insertAdjacentHTML('beforebegin', toolbarHtml);
        }

        document.getElementById('cancel-plant-btn')?.addEventListener('click', () => {
            this.selectedTree = null;
            this._updateDynamicContent();
        });
    },

    _bindPlotInteractions(scope = document) {
        scope.querySelectorAll('.iplot').forEach(plotEl => {
            plotEl.onclick = async (e) => {
                e.stopPropagation();
                const plotId = parseInt(plotEl.dataset.plotId, 10);
                const plot = this.plots.find(p => p.id === plotId);
                if (!plot) return;
                if (this._movingPlotId && plot.status === 'cleared') {
                    await this.executeMoveToPlot(plotId);
                    return;
                }
                if (plot.status === 'wasteland') await this.clearPlot(plotId, plot.obstacle_type);
                else if (plot.status === 'cleared' && this.selectedTree) await this.plantOnPlot(plotId);
                else if (plot.status === 'planted') this.showPlotMenu(plotId, plotEl);
            };
        });
    },

    _patchPlot(plotId, patch) {
        this.plots = this.plots.map(plot => {
            if (plot.id !== plotId) return plot;
            const nextPatch = typeof patch === 'function' ? patch(plot) : patch;
            return nextPatch ? { ...plot, ...nextPatch } : plot;
        });
    },

    _flashPlot(plotId, className) {
        const plotEl = document.querySelector(`.iplot[data-plot-id="${plotId}"]`);
        if (!plotEl) return;
        plotEl.classList.remove(className);
        void plotEl.offsetWidth;
        plotEl.classList.add(className);
        setTimeout(() => plotEl.classList.remove(className), 900);
    },

    _todayString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },

    _positionPlotMenu(menuEl, plotEl) {
        if (!menuEl || !plotEl) return;
        const rect = plotEl.getBoundingClientRect();
        const menuRect = menuEl.getBoundingClientRect();
        const showBelow = rect.top < 180;
        const viewportPadding = 12;
        const left = Math.min(
            window.innerWidth - menuRect.width / 2 - viewportPadding,
            Math.max(menuRect.width / 2 + viewportPadding, rect.left + rect.width / 2)
        );
        menuEl.classList.toggle('plot-menu-below', showBelow);
        menuEl.style.left = `${left}px`;
        menuEl.style.top = `${showBelow ? rect.bottom + 10 : rect.top - 10}px`;
    },

    _queueBackpackRender() {
        if (this._backpackRenderQueued) return;
        this._backpackRenderQueued = true;
        requestAnimationFrame(() => {
            this._backpackRenderQueued = false;
            if (!this._backpackContentEl) return;
            const filtered = this._getFilteredPlants();
            this._backpackContentEl.innerHTML = this._renderBackpackPlants(
                filtered,
                this._backpackSort.by,
                this._backpackSort.order
            );
        });
    },

    /* Update only the dynamic parts of the garden view (plots, HUD, stats bar) */
    _updateDynamicContent() {
        this.closePlotMenu();

        // Update plots
        const land = document.getElementById('island-land');
        if (land) {
            land.querySelectorAll('.iplot').forEach(p => p.remove());
            const plotsHtml = this.plots.map((plot, i) => {
                return this.renderIslandPlot(plot, this.getPlotLayout(plot, i));
            }).join('');
            land.insertAdjacentHTML('beforeend', plotsHtml);
            this._bindPlotInteractions(land);
        }

        // Update HUD balance
        const balEl = document.querySelector('.island-hud .garden-balance strong');
        if (balEl) balEl.textContent = Utils.formatCoinBalance(this.balance);

        // Update stats bar
        const clearedCount = this.plots.filter(p => p.status !== 'wasteland').length;
        const plantedCount = this.plots.filter(p => p.status === 'planted').length;
        const typesCollected = new Set(this.plots.filter(p => p.tree_type).map(p => p.tree_type)).size;
        const statsBar = document.querySelector('.island-stats-bar');
        if (statsBar) {
            statsBar.innerHTML = `<span>🌱 ${plantedCount} 种植</span><span>📦 ${typesCollected} 种类</span><span>⛏️ ${clearedCount} 开垦</span>`;
        }

        this._syncPlantingToolbar();
    },

    TREE_MATURE_MINUTES: 150,

    getGrowthStage(minutes) {
        const m = this.TREE_MATURE_MINUTES;
        if (minutes >= m) return 'mature';
        if (minutes >= m / 2) return 'growing';
        if (minutes >= m / 6) return 'sprout';
        return 'seed';
    },

    getGrowthLabel(minutes) {
        const m = this.TREE_MATURE_MINUTES;
        if (minutes >= m) return '成熟';
        if (minutes >= m / 2) return '成长中';
        if (minutes >= m / 6) return '发芽';
        return '种子';
    },

    updateHeaderCoins() {
        const { balance } = this._getHeaderCoinContext();
        if (balance == null) {
            App._refreshHeaderCoins();
            return;
        }
        App._renderHeaderCoins(balance);
    },

    async earnFromPomodoro(assignee, focusMinutes, factor = null) {
        const baseAmount = Utils.getPomodoroBaseReward(focusMinutes);
        const amount = factor == null ? 0 : Utils.roundCoin(baseAmount * factor / 100);
        try {
            if (amount > 0) {
                const result = await API.earnCoins({
                    assignee,
                    amount,
                    reason: 'pomodoro',
                    detail: `${focusMinutes}分钟专注 · ${factor}%`,
                });
                App.syncCoins({ assignee, balance: result.balance, delta: amount, animate: true });
            }

            try {
                const growResult = await API.growTree({ assignee, minutes: focusMinutes });
                if (growResult.coinDrop > 0) {
                    App.syncCoins({ assignee, delta: growResult.coinDrop, animate: true });
                }

                let msg = '';
                if (amount > 0) {
                    msg = `+${Utils.formatCoinBalance(amount)} 喵喵币 · ${focusMinutes}分钟 × ${factor}%`;
                } else {
                    msg = '跳过评分，本轮番茄钟不结算喵喵币';
                }

                if (growResult.tree) {
                    const catItem = this.catalog.find(c => c.type === growResult.tree.tree_type);
                    const name = catItem ? catItem.name : '植物';
                    const label = this.getGrowthLabel(growResult.tree.growth_minutes);
                    msg += ` · ${name} 成长了！(${label})`;
                    if (growResult.coinDrop > 0) {
                        msg += ` · 🍃 掉落 +${Utils.formatCoinBalance(growResult.coinDrop)} 币！`;
                    }
                    App.showToast(msg, amount > 0 || growResult.coinDrop > 0 ? 'success' : 'info');
                } else {
                    App.showToast(msg, amount > 0 ? 'success' : 'info');
                }
            } catch (e) {
                if (amount > 0) {
                    App.showToast(`+${Utils.formatCoinBalance(amount)} 喵喵币 · ${focusMinutes}分钟 × ${factor}%`, 'success');
                } else {
                    App.showToast('跳过评分，本轮番茄钟不结算喵喵币', 'info');
                }
            }
        } catch (e) {
            App.showToast('获取币失败', 'error');
        }
    },

};
