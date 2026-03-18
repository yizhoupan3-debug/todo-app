/* ── Garden & Shop View ── */
/* ── White-background removal — images are pre-processed, this is a no-op ── */
function removeWhiteBg(_container) { /* no-op: PNGs already have transparent bg */ }

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
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/sprout_growing.png', mature: '/img/trees/sprout.png' }
        },
        {
            type: 'rice', icon: '🌾', name: '稻穗', cost: 5, desc: '粒粒皆辛苦',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/rice_growing.png', mature: '/img/trees/rice.png' }
        },
        {
            type: 'strawberry', icon: '🍓', name: '草莓', cost: 8, desc: '甜蜜小确幸',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/strawberry_growing.png', mature: '/img/trees/strawberry.png' }
        },
        {
            type: 'sunflower', icon: '🌻', name: '向日葵', cost: 10, desc: '追逐阳光',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/sunflower_growing.png', mature: '/img/trees/sunflower.png' }
        },
        {
            type: 'corn', icon: '🌽', name: '玉米', cost: 12, desc: '金色丰收',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/corn_growing.png', mature: '/img/trees/corn.png' }
        },
        {
            type: 'mushroom', icon: '🍄', name: '蘑菇', cost: 15, desc: '雨后精灵',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/mushroom_growing.png', mature: '/img/trees/mushroom.png' }
        },
        {
            type: 'tulip', icon: '🌷', name: '郁金香', cost: 20, desc: '优雅绽放',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/tulip_growing.png', mature: '/img/trees/tulip.png' }
        },
        {
            type: 'daisy', icon: '🌼', name: '雏菊', cost: 22, desc: '天真烂漫',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/daisy_growing.png', mature: '/img/trees/daisy.png' }
        },
        {
            type: 'hibiscus', icon: '🌺', name: '芙蓉花', cost: 25, desc: '热情似火',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/hibiscus_growing.png', mature: '/img/trees/hibiscus.png' }
        },
        {
            type: 'sakura', icon: '🌸', name: '樱花树', cost: 30, desc: '浪漫满开',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/sakura_growing.png', mature: '/img/trees/sakura.png' }
        },
        {
            type: 'chrysanthemum', icon: '💐', name: '菊花', cost: 35, desc: '傲霜斗雪',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/chrysanthemum_growing.png', mature: '/img/trees/chrysanthemum.png' }
        },
        {
            type: 'true_lavender', icon: '💜', name: '薰衣草', cost: 38, desc: '普罗旺斯之梦',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/true_lavender_growing.png', mature: '/img/trees/true_lavender.png' }
        },
        {
            type: 'pumpkin', icon: '🎃', name: '南瓜', cost: 42, desc: '万圣精灵',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/pumpkin_growing.png', mature: '/img/trees/pumpkin.png' }
        },
        {
            type: 'bamboo', icon: '🎋', name: '竹子', cost: 45, desc: '节节高升',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/bamboo_growing.png', mature: '/img/trees/bamboo.png' }
        },
        {
            type: 'pine', icon: '🌲', name: '松树', cost: 50, desc: '四季常青',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/pine_growing.png', mature: '/img/trees/pine.png' }
        },
        {
            type: 'oak', icon: '🌳', name: '落叶树', cost: 50, desc: '枝繁叶茂',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/oak_growing.png', mature: '/img/trees/oak.png' }
        },
        {
            type: 'peach', icon: '🍑', name: '桃树', cost: 55, desc: '人面桃花',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/peach_growing.png', mature: '/img/trees/peach.png' }
        },
        {
            type: 'mint', icon: '🌿', name: '薄荷', cost: 60, desc: '清凉一夏',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/mint_growing.png', mature: '/img/trees/mint.png' }
        },
        {
            type: 'orange_tree', icon: '🍊', name: '橘子树', cost: 65, desc: '大吉大利',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/orange_tree_growing.png', mature: '/img/trees/orange_tree.png' }
        },
        {
            type: 'lotus', icon: '🪷', name: '莲花', cost: 70, desc: '出淤泥不染',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/lotus_growing.png', mature: '/img/trees/lotus.png' }
        },
        {
            type: 'palm', icon: '🌴', name: '棕榈树', cost: 80, desc: '热带风情',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/palm_growing.png', mature: '/img/trees/palm.png' }
        },
        {
            type: 'christmas', icon: '🎄', name: '圣诞树', cost: 80, desc: '节日快乐',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/christmas_growing.png', mature: '/img/trees/christmas.png' }
        },
        {
            type: 'maple', icon: '🍁', name: '枫树', cost: 95, desc: '霜叶红于花',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/maple_growing.png', mature: '/img/trees/maple.png' }
        },
        {
            type: 'cactus', icon: '🌵', name: '仙人掌', cost: 100, desc: '沙漠之花',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/cactus_growing.png', mature: '/img/trees/cactus.png' }
        },
        {
            type: 'rose', icon: '🌹', name: '玫瑰', cost: 100, desc: '爱的承诺',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/rose_growing.png', mature: '/img/trees/rose.png' }
        },
        {
            type: 'peony', icon: '🏵️', name: '牡丹', cost: 110, desc: '国色天香',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/peony_growing.png', mature: '/img/trees/peony.png' }
        },
        {
            type: 'grape', icon: '🍇', name: '葡萄藤', cost: 120, desc: '硕果累累',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/grape_growing.png', mature: '/img/trees/grape.png' }
        },
        {
            type: 'clover', icon: '🍀', name: '四叶草', cost: 150, desc: '幸运降临',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/clover_growing.png', mature: '/img/trees/clover.png' }
        },
        {
            type: 'lavender', icon: '🪻', name: '彩虹花', cost: 200, desc: '传说之花',
            stages: { seed: '/img/trees/seed.png', sprout: '/img/trees/sprout_stage.png', growing: '/img/trees/lavender_growing.png', mature: '/img/trees/lavender.png' }
        },
    ],

    obstacleMap: {
        rock: { name: '石头堆', cost: 10 },
        weed: { name: '杂草堆', cost: 5 },
        wild_tree: { name: '野树', cost: 15 },
    },
    rockVariants: ['/img/garden/rock_pile_1.png?v=3', '/img/garden/rock_pile_2.png?v=3'],
    weedVariants: ['/img/garden/weed_pile_1.png?v=3', '/img/garden/weed_pile_2.png?v=3'],
    wildTreeVariants: ['/img/garden/wild_tree_1.png?v=3', '/img/garden/wild_tree_2.png?v=3', '/img/garden/wild_tree_3.png?v=3'],

    SCENE_GRID_W: 8,
    SCENE_GRID_H: 6,
    FOREST_LAYOUTS: [
        // y=0 top=25
        { left: 10, top: 25, scale: 0.95 }, { left: 20, top: 25, scale: 0.95 }, { left: 30, top: 25, scale: 0.95 },
        { left: 40, top: 25, scale: 0.95 }, { left: 50, top: 25, scale: 0.95 }, { left: 60, top: 25, scale: 0.95 },
        { left: 70, top: 25, scale: 0.95 }, { left: 80, top: 25, scale: 0.95 },
        // y=1 top=34
        { left: 15, top: 34, scale: 1.0 }, { left: 25, top: 34, scale: 1.0 }, { left: 35, top: 34, scale: 1.0 },
        { left: 45, top: 34, scale: 1.0 }, { left: 55, top: 34, scale: 1.0 }, { left: 65, top: 34, scale: 1.0 },
        { left: 75, top: 34, scale: 1.0 }, { left: 85, top: 34, scale: 1.0 },
        // y=2 top=43
        { left: 10, top: 43, scale: 1.05 }, { left: 20, top: 43, scale: 1.05 }, { left: 30, top: 43, scale: 1.05 },
        { left: 40, top: 43, scale: 1.05 }, { left: 50, top: 43, scale: 1.05 }, { left: 60, top: 43, scale: 1.05 },
        { left: 70, top: 43, scale: 1.05 }, { left: 80, top: 43, scale: 1.05 },
        // y=3 (x=1..6) top=52
        { left: 25, top: 52, scale: 1.1 }, { left: 35, top: 52, scale: 1.1 }, { left: 45, top: 52, scale: 1.1 },
        { left: 55, top: 52, scale: 1.1 }, { left: 65, top: 52, scale: 1.1 }, { left: 75, top: 52, scale: 1.1 },
    ],
    FRONTIER_LAYOUTS: [
        // y=3 (x=0, 7) top=52
        { left: 15, top: 52, scale: 1.1 }, { left: 85, top: 52, scale: 1.1 },
        // y=4 top=61
        { left: 10, top: 61, scale: 1.15 }, { left: 20, top: 61, scale: 1.15 }, { left: 30, top: 61, scale: 1.15 },
        { left: 40, top: 61, scale: 1.15 }, { left: 50, top: 61, scale: 1.15 }, { left: 60, top: 61, scale: 1.15 },
        { left: 70, top: 61, scale: 1.15 }, { left: 80, top: 61, scale: 1.15 },
        // y=5 top=70
        { left: 15, top: 70, scale: 1.2 }, { left: 25, top: 70, scale: 1.2 }, { left: 35, top: 70, scale: 1.2 },
        { left: 45, top: 70, scale: 1.2 }, { left: 55, top: 70, scale: 1.2 }, { left: 65, top: 70, scale: 1.2 },
        { left: 75, top: 70, scale: 1.2 }, { left: 85, top: 70, scale: 1.2 }
    ],

    _staticRendered: false,
    _backpackSort: { by: 'price', order: 'asc' },
    _plotMenuCleanup: null,
    _backpackRenderQueued: false,
    _backpackOverlayEl: null,
    _backpackContentEl: null,
    _backpackSearchInputEl: null,
    _activePlotMenu: null,
    _selectedPlotId: null,

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
            this._syncCurrentIslandGridFromPlots();
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

    _syncCurrentIslandGridFromPlots() {
        if (!this.currentIsland || !Array.isArray(this.plots) || !this.plots.length) return;
        const maxX = this.plots.reduce((max, plot) => Math.max(max, Number(plot.x) || 0), 0) + 1;
        const maxY = this.plots.reduce((max, plot) => Math.max(max, Number(plot.y) || 0), 0) + 1;
        this.currentIsland.grid_w = Math.max(Number(this.currentIsland.grid_w) || 0, maxX);
        this.currentIsland.grid_h = Math.max(Number(this.currentIsland.grid_h) || 0, maxY);
    },

    getPlotZone(plot) {
        const island = this.currentIsland || {};
        const gridH = Math.max(1, Number(island.grid_h) || this.SCENE_GRID_H);
        const y = Math.max(0, Math.min(gridH - 1, Number(plot?.y) || 0));
        if (y <= 1) return 'back';
        if (y >= gridH - 2) return 'shore';
        return 'field';
    },

    _plotNoise(plot, salt = 0) {
        const islandId = Number(this.currentIsland?.id) || 1;
        const x = Number(plot?.x) || 0;
        const y = Number(plot?.y) || 0;
        const n = Math.sin((x + 1) * 127.1 + (y + 1) * 311.7 + islandId * 53.3 + salt * 19.7) * 43758.5453;
        return n - Math.floor(n);
    },

    getObstacleVisual(plot) {
        const obstacle = this.obstacleMap[plot?.obstacle_type] || this.obstacleMap.rock;
        const x = Number(plot?.x) || 0;
        const y = Number(plot?.y) || 0;
        const hash = (x * 3 + y * 5);
        let variants;
        if (plot?.obstacle_type === 'wild_tree') variants = this.wildTreeVariants;
        else if (plot?.obstacle_type === 'weed') variants = this.weedVariants;
        else variants = this.rockVariants;
        const img = variants[hash % variants.length];
        return { ...obstacle, img };
    },

    _getForestLayoutIndex(x, y) {
        if (y < 3) return y * this.SCENE_GRID_W + x;
        return 24 + Math.max(0, x - 1);
    },

    _getFrontierLayoutIndex(x, y) {
        if (y === 3) return x === 0 ? 0 : 1;
        if (y === 4) return 2 + x;
        return 10 + x;
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
        const colStart = 2;
        const colSpan = 96;
        const rowStart = 6;
        const rowSpan = 80;
        /* Deterministic jitter so plots don't sit on a rigid grid */
        const jitterX = (n3 - 0.5) * 5;    /* ±2.5% horizontal */
        const jitterY = (n4 - 0.5) * 4;    /* ±2% vertical */
        const left = colStart + xRatio * colSpan + jitterX;
        const top = rowStart + yRatio * rowSpan + jitterY;
        const scaleJitter = (n1 - 0.5) * 0.14; /* ±7% size variation */
        const scale = 0.94 + yRatio * 0.12 + scaleJitter;
        let tilt = plot?.status === 'wasteland' ? (n1 - 0.5) * 20 : 0; /* ±10° variety */
        /* Cleared plots also get rotation for tilled_land variety */
        if (plot?.status === 'cleared') tilt = (n1 - 0.5) * 30; /* ±15° */
        const obstacleScaleNoise = (n2 - 0.5) * 0.28; /* ±14% size variety */
        let spriteScale = plot?.status === 'wasteland'
            ? 1.05 + yRatio * 0.15 + obstacleScaleNoise
            : 0.88 + yRatio * 0.14;
        let sway = plot?.obstacle_type === 'wild_tree' ? 0.94 + n2 * 0.12 : 1;
        const depth = top / 10;

        return {
            left,
            top,
            scale,
            tilt,
            sway,
            spriteScale,
            depth,
            zone,
            zIndex: Math.round(10 + top),
        };
    },

    /* ── CSS-transform based pan / zoom ── */
    _panX: 0,
    _panY: 0,
    _fitZoom: 0.72,
    _defaultZoom: 1.1,
    _viewportPadding: 400,
    _cameraBounds: null,

    _recalculateZoomBounds(vp, world) {
        if (!vp || !world) return;
        const fitX = vp.clientWidth / world.offsetWidth;
        const fitY = vp.clientHeight / world.offsetHeight;
        this._fitZoom = Math.max(Math.min(fitX, fitY), 0.38);
        this._minZoom = this._fitZoom;
        this._defaultZoom = Math.max(this._minZoom, Math.min(1.15, this._fitZoom * 1.45));
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
        const vpW = vp.clientWidth;
        const vpH = vp.clientHeight;
        
        // Real-time scaled dimensions
        const viewW = world.offsetWidth * this._zoom;
        const viewH = world.offsetHeight * this._zoom;
        
        // Smart screen-relative elasticity (30% of viewport) to guarantee edge visibility
        const padX = Math.min(300, vpW * 0.35);
        const padY = Math.min(300, vpH * 0.35);

        // Calculate absolute mathematical pan limits
        const minX = vpW - viewW - padX;
        const maxX = padX;
        const minY = vpH - viewH - padY;
        const maxY = padY;

        if (viewW <= vpW) {
            this._panX = (vpW - viewW) / 2;
        } else {
            this._panX = Math.max(minX, Math.min(maxX, this._panX));
        }

        if (viewH <= vpH) {
            this._panY = (vpH - viewH) / 2;
        } else {
            this._panY = Math.max(minY, Math.min(maxY, this._panY));
        }
    },

    _centerViewport(vp, world) {
        if (!vp || !world) return;
        const vpW = vp.clientWidth;
        const vpH = vp.clientHeight;
        const viewW = world.offsetWidth * this._fitZoom;
        const viewH = world.offsetHeight * this._fitZoom;

        this._panX = (vpW - viewW) / 2;
        this._panY = (vpH - viewH) / 2;
        this._zoom = this._fitZoom;
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
                const actionBtn = e.target.closest('.iplot-action');
                if (actionBtn) {
                    const action = actionBtn.dataset.action;
                    if (action === 'clear' && plot.status === 'wasteland') await this.clearPlot(plotId, plot.obstacle_type);
                    else if (action === 'plant' && plot.status === 'cleared' && this.selectedTree) await this.plantOnPlot(plotId);
                    else if (action === 'menu' && plot.status === 'planted') this.showPlotMenu(plotId, plotEl);
                    return;
                }
                if (this._movingPlotId && plot.status === 'cleared') {
                    await this.executeMoveToPlot(plotId);
                    return;
                }
                if (this._selectedPlotId === plotId) {
                    this._selectedPlotId = null;
                    this._updateDynamicContent();
                    return;
                }
                this._selectedPlotId = plotId;
                this._updateDynamicContent();
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
            removeWhiteBg(this._backpackContentEl);
        });
    },

    /* Update only the dynamic parts of the garden view (plots, HUD, stats bar) */
    _updateDynamicContent() {
        this.closePlotMenu();

        // Differential plot update: only rebuild plots whose state changed
        const land = document.getElementById('island-land');
        if (land) {
            const existingPlots = land.querySelectorAll('.iplot[data-plot-id]');
            const existingMap = new Map();
            existingPlots.forEach(el => existingMap.set(el.dataset.plotId, el));

            const currentIds = new Set();
            this.plots.forEach((plot, i) => {
                currentIds.add(String(plot.id));
                const layout = this.getPlotLayout(plot, i);
                // Build a signature to detect changes
                const sig = `${plot.status}|${plot.tree_type || ''}|${plot.growth_minutes || 0}|${plot.obstacle_type || ''}|${this._selectedPlotId === plot.id ? '1' : '0'}`;
                const existing = existingMap.get(String(plot.id));
                if (existing && existing.dataset.sig === sig) return; // unchanged
                // Replace or insert
                const html = this.renderIslandPlot(plot, layout);
                const temp = document.createElement('div');
                temp.innerHTML = html;
                const newEl = temp.firstElementChild;
                newEl.dataset.sig = sig;
                if (existing) {
                    existing.replaceWith(newEl);
                } else {
                    land.insertAdjacentHTML('beforeend', html);
                }
            });

            // Remove plots that no longer exist
            existingPlots.forEach(el => {
                if (!currentIds.has(el.dataset.plotId)) el.remove();
            });

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
