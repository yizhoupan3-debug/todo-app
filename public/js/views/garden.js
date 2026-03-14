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

    _staticRendered: false,
    _backpackSort: { by: 'price', order: 'asc' },
    _plotMenuCleanup: null,
    _forestHintShown: false,

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
                this.plots = await fetch(`/api/garden/plots/${encodeURIComponent(this.assignee)}/${this.currentIsland.id}`).then(r => r.json());
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

    getIslandPlotPositions() {
        return [
            [20, 66], [34, 62], [49, 61], [64, 63],
            [18, 73], [32, 69], [47, 68], [62, 69], [77, 72],
            [26, 79], [41, 76], [56, 75], [71, 78],
        ];
    },

    getForestButtonLayout() {
        return [
            { left: 10, top: 40, cost: 120, img: '/img/trees/pine.svg', width: 80, tilt: -3 },
            { left: 20, top: 37, cost: 110, img: '/img/trees/oak.svg', width: 76, tilt: 2 },
            { left: 31, top: 39, cost: 105, img: '/img/trees/pine.svg', width: 70, tilt: -1 },
            { left: 43, top: 36, cost: 120, img: '/img/trees/sakura.svg', width: 74, tilt: 2 },
            { left: 55, top: 37, cost: 100, img: '/img/trees/oak.svg', width: 72, tilt: -2 },
            { left: 67, top: 39, cost: 90, img: '/img/trees/maple.svg', width: 62, tilt: 3 },
            { left: 79, top: 41, cost: 90, img: '/img/trees/bamboo.svg', width: 52, tilt: -2 },
            { left: 8, top: 48, cost: 75, img: '/img/trees/bamboo.svg', width: 58, tilt: -4 },
            { left: 19, top: 50, cost: 65, img: '/img/trees/orange_tree.svg', width: 56, tilt: 2 },
            { left: 31, top: 47, cost: 70, img: '/img/trees/christmas.svg', width: 60, tilt: -3 },
            { left: 43, top: 49, cost: 60, img: '/img/trees/peach.svg', width: 56, tilt: 1 },
            { left: 55, top: 46, cost: 70, img: '/img/trees/pine.svg', width: 62, tilt: -2 },
            { left: 67, top: 48, cost: 60, img: '/img/trees/oak.svg', width: 58, tilt: 4 },
            { left: 79, top: 49, cost: 45, img: '/img/trees/bamboo.svg', width: 50, tilt: -2 },
            { left: 13, top: 56, cost: 25, img: '/img/trees/obstacle_wild_tree.svg', width: 48, tilt: -2 },
            { left: 26, top: 58, cost: 18, img: '/img/trees/mushroom.svg', width: 42, tilt: 3 },
            { left: 39, top: 55, cost: 35, img: '/img/trees/oak.svg', width: 52, tilt: -1 },
            { left: 52, top: 56, cost: 20, img: '/img/trees/palm.svg', width: 52, tilt: 2 },
            { left: 65, top: 54, cost: 20, img: '/img/trees/bamboo.svg', width: 48, tilt: -3 },
            { left: 77, top: 53, cost: 20, img: '/img/trees/maple.svg', width: 46, tilt: 2 },
        ];
    },

    renderForestButtons() {
        return this.getForestButtonLayout().map(tree => `
            <div class="forest-tree-btn" style="left:${tree.left}%;top:${tree.top}%;--tree-tilt:${tree.tilt || 0}deg" data-cost="${tree.cost}" title="🪓 砍伐 ${tree.cost} 喵喵币">
                <img src="${tree.img}" alt="" style="width:${tree.width}px">
            </div>
        `).join('');
    },

    getPlotLayout(plot, index = 0) {
        const island = this.currentIsland || {};
        const gridW = Math.max(1, Number(island.grid_w) || 6);
        const gridH = Math.max(1, Number(island.grid_h) || 4);
        const x = Math.max(0, Number(plot?.x) || 0);
        const y = Math.max(0, Number(plot?.y) || 0);
        const xRatio = gridW === 1 ? 0.5 : x / Math.max(1, gridW - 1);
        const yRatio = gridH === 1 ? 0.5 : y / Math.max(1, gridH - 1);

        const rowTemplates = [
            { top: 44, left: 12, right: 72, curve: 2.8, scale: 0.84 },
            { top: 54, left: 8, right: 74, curve: 2.1, scale: 0.9 },
            { top: 67, left: 18, right: 67, curve: 1.1, scale: 0.96 },
            { top: 79, left: 26, right: 63, curve: 0.4, scale: 1.02 },
            { top: 86, left: 32, right: 60, curve: -0.2, scale: 1.04 },
        ];

        const rowPos = yRatio * (rowTemplates.length - 1);
        const lowerIndex = Math.floor(rowPos);
        const upperIndex = Math.min(rowTemplates.length - 1, lowerIndex + 1);
        const mix = rowPos - lowerIndex;
        const lerp = (a, b) => a + (b - a) * mix;
        const lower = rowTemplates[lowerIndex];
        const upper = rowTemplates[upperIndex];
        const row = {
            top: lerp(lower.top, upper.top),
            left: lerp(lower.left, upper.left),
            right: lerp(lower.right, upper.right),
            curve: lerp(lower.curve, upper.curve),
            scale: lerp(lower.scale, upper.scale),
        };

        const left = row.left + (row.right - row.left) * xRatio;
        const top = row.top + Math.sin(xRatio * Math.PI) * row.curve + ((x + index) % 2 === 0 ? -0.45 : 0.45);
        const zone = yRatio <= 0.38 ? 'forest' : yRatio >= 0.78 ? 'front' : 'field';

        return {
            left,
            top,
            scale: row.scale,
            zone,
            zIndex: Math.round(7 + yRatio * 12),
        };
    },

    _getViewportBounds(world) {
        if (!world) return { left: 0, right: 0, top: 0, bottom: 0 };
        const land = document.getElementById('island-land');
        if (land) {
            const left = land.offsetLeft;
            const top = land.offsetTop;
            const width = land.offsetWidth;
            const height = land.offsetHeight;
            return {
                left: left + width * 0.035,
                right: left + width * 0.965,
                top: top + height * 0.055,
                bottom: top + height * 0.905,
            };
        }
        const width = world.offsetWidth || 0;
        const height = world.offsetHeight || 0;
        return {
            left: width * 0.07,
            right: width * 0.93,
            top: height * 0.08,
            bottom: height * 0.86,
        };
    },

    _clampViewport(vp, world) {
        if (!vp || !world) return;
        const bounds = this._getViewportBounds(world);
        const visibleWidth = vp.clientWidth / this._zoom;
        const visibleHeight = vp.clientHeight / this._zoom;
        const minLeft = bounds.left;
        const maxLeft = Math.max(minLeft, bounds.right - visibleWidth);
        const minTop = bounds.top;
        const maxTop = Math.max(minTop, bounds.bottom - visibleHeight);
        vp.scrollLeft = Math.min(maxLeft, Math.max(minLeft, vp.scrollLeft));
        vp.scrollTop = Math.min(maxTop, Math.max(minTop, vp.scrollTop));
    },

    _centerViewport(vp, world) {
        if (!vp || !world) return;
        const bounds = this._getViewportBounds(world);
        const visibleWidth = vp.clientWidth / this._zoom;
        const visibleHeight = vp.clientHeight / this._zoom;
        vp.scrollLeft = bounds.left + Math.max(0, (bounds.right - bounds.left - visibleWidth) / 2);
        vp.scrollTop = bounds.top + Math.max(0, (bounds.bottom - bounds.top - visibleHeight) * 0.46);
        this._clampViewport(vp, world);
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
            this.render();
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
            land.querySelectorAll('.iplot').forEach(plotEl => {
                plotEl.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const plotId = parseInt(plotEl.dataset.plotId);
                    const plot = this.plots.find(p => p.id === plotId);
                    if (!plot) return;
                    if (this._movingPlotId && plot.status === 'cleared') {
                        await this.executeMoveToPlot(plotId); return;
                    }
                    if (plot.status === 'wasteland') await this.clearPlot(plotId, plot.obstacle_type);
                    else if (plot.status === 'cleared' && this.selectedTree) await this.plantOnPlot(plotId);
                    else if (plot.status === 'planted') this.showPlotMenu(plotId, plotEl);
                });
            });
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

    getGrowthStage(minutes) {
        if (minutes >= 150) return 'mature';
        if (minutes >= 75) return 'growing';
        if (minutes >= 25) return 'sprout';
        return 'seed';
    },

    getGrowthLabel(minutes) {
        if (minutes >= 150) return '成熟';
        if (minutes >= 75) return '成长中';
        if (minutes >= 25) return '发芽';
        return '种子';
    },

    /* ═══════════════════════════════
       GARDEN VIEW (rectangular island layout)
       ═══════════════════════════════ */
    async open() {
        const el = document.getElementById('view-garden');
        if (!el) return;

        // Load balance
        try {
            const { balance } = await API.getCoins(this.assignee);
            this.balance = balance;
        } catch (e) {
            App.showToast('获取余额失败', 'error');
        }

        // Load islands
        try {
            this.islands = await fetch(`/api/garden/islands/${encodeURIComponent(this.assignee)}`).then(r => r.json());
            if (!this.currentIsland) {
                this.currentIsland = this.islands.find(i => i.island_type === 'starter') || this.islands[0];
            }
        } catch (e) {
            this.islands = [];
        }

        // Load plots for current island
        try {
            if (this.currentIsland) {
                this.plots = await fetch(`/api/garden/plots/${encodeURIComponent(this.assignee)}/${this.currentIsland.id}`).then(r => r.json());
            } else {
                this.plots = await API.getPlots(this.assignee);
            }
        } catch (e) {
            this.plots = [];
        }

        // Load boats & expeditions
        try {
            const boatData = await fetch(`/api/garden/boats/${encodeURIComponent(this.assignee)}`).then(r => r.json());
            this.boats = boatData.boats || [];
        } catch (e) { this.boats = []; }
        try {
            this.expeditions = await fetch(`/api/garden/expeditions/${encodeURIComponent(this.assignee)}`).then(r => r.json());
        } catch (e) { this.expeditions = []; }

        this.render();
        this.updateHeaderCoins();
    },

    render() {
        const el = document.getElementById('view-garden');
        if (!el) return;

        if (this._staticRendered) {
            this._updateDynamicContent();
            return;
        }

        const clearedCount = this.plots.filter(p => p.status !== 'wasteland').length;
        const plantedCount = this.plots.filter(p => p.status === 'planted').length;
        const typesCollected = new Set(this.plots.filter(p => p.tree_type).map(p => p.tree_type)).size;

        const islandName = this.currentIsland ? this.currentIsland.name : '起始岛';
        const discoveredCount = this.islands.filter(i => i.discovered).length;
        const totalCount = this.islands.length;
        const activeExp = this.expeditions.find(e => e.status === 'sailing');

        el.innerHTML = `
            <div class="island-hud">
                <div class="island-hud-left">
                    <div class="garden-balance">
                        ${Utils.coinSvg()}
                        <strong>${Utils.formatCoinBalance(this.balance)}</strong> 喵喵币
                    </div>
                </div>
                <div class="island-hud-center">
                    <span style="color:#fff;font-size:12px;font-weight:700;opacity:0.72">\u{1F3DD}\uFE0F ${islandName}</span>
                    <div style="display:flex;gap:6px;margin-top:4px">
                        <button class="filter-pill ${this.assignee === '潘潘' ? 'active' : ''}" data-person="潘潘">
                            <img src="/img/panpan.png" alt="" style="width:16px;height:16px;border-radius:50%"> 潘潘
                        </button>
                        <button class="filter-pill ${this.assignee === '蒲蒲' ? 'active' : ''}" data-person="蒲蒲">
                            <img src="/img/pupu.png" alt="" style="width:16px;height:16px;border-radius:50%"> 蒲蒲
                        </button>
                    </div>
                </div>
                <div class="island-hud-right">
                    <button class="hud-btn" id="garden-backpack-btn" title="背包" style="font-size:14px">\u{1F392}</button>
                    <button class="hud-btn" id="world-map-btn" title="世界地图" style="font-size:14px">\u{1F5FA}\uFE0F ${discoveredCount}/${totalCount}</button>
                    <button class="hud-btn" id="garden-history-btn" title="记录">\u{1F4CA}</button>
                </div>
            </div>

            <div class="island-viewport" id="island-viewport">
                <div class="island-world" id="island-world">
                    <div class="ocean-shimmer"></div>
                    <svg class="island-shape" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <defs>
                            <filter id="ishadow"><feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="rgba(0,0,0,0.38)"/></filter>
                            <radialGradient id="reefG" cx="50%" cy="50%"><stop offset="0%" stop-color="#5ed7e0"/><stop offset="45%" stop-color="#3bb6cf"/><stop offset="100%" stop-color="#14809b"/></radialGradient>
                            <radialGradient id="shallowsG" cx="50%" cy="48%"><stop offset="0%" stop-color="rgba(140,255,245,0.5)"/><stop offset="60%" stop-color="rgba(109,212,219,0.2)"/><stop offset="100%" stop-color="rgba(20,128,155,0)"/></radialGradient>
                            <linearGradient id="sandG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f7edd0"/><stop offset="45%" stop-color="#e7cf91"/><stop offset="100%" stop-color="#cda56b"/></linearGradient>
                            <linearGradient id="grassG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#74d952"/><stop offset="50%" stop-color="#55ae35"/><stop offset="100%" stop-color="#3f7c28"/></linearGradient>
                            <linearGradient id="forestG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#173d1b"/><stop offset="50%" stop-color="#235423"/><stop offset="100%" stop-color="#356d2a"/></linearGradient>
                            <linearGradient id="cliffG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8e7755"/><stop offset="50%" stop-color="#715b3e"/><stop offset="100%" stop-color="#56442d"/></linearGradient>
                            <linearGradient id="cliffFaceG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a18562"/><stop offset="50%" stop-color="#7c6445"/><stop offset="100%" stop-color="#5d482f"/></linearGradient>
                            <radialGradient id="dirtG" cx="50%" cy="45%"><stop offset="0%" stop-color="#8c6a47"/><stop offset="60%" stop-color="#785737"/><stop offset="100%" stop-color="#5d422a"/></radialGradient>
                            <linearGradient id="yardG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b8d889"/><stop offset="55%" stop-color="#8dba59"/><stop offset="100%" stop-color="#69953e"/></linearGradient>
                            <radialGradient id="fogG" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(208,224,235,0.75)"/><stop offset="70%" stop-color="rgba(181,199,215,0.28)"/><stop offset="100%" stop-color="rgba(181,199,215,0)"/></radialGradient>
                        </defs>
                        <g filter="url(#ishadow)">
                            <path d="M40,658 Q22,516 70,286 L124,138 Q170,38 354,30 L944,46 Q1092,64 1148,236 L1160,692 Q1150,852 978,882 L180,886 Q58,874 40,658 Z" fill="url(#reefG)" opacity="0.92"/>
                            <ellipse cx="182" cy="742" rx="318" ry="234" fill="url(#shallowsG)" opacity="0.92"/>
                            <ellipse cx="1000" cy="686" rx="286" ry="182" fill="url(#shallowsG)" opacity="0.78"/>
                            <ellipse cx="1098" cy="418" rx="126" ry="96" fill="url(#shallowsG)" opacity="0.48"/>

                            <path d="M106,642 Q84,524 120,338 L160,190 Q204,96 348,90 L908,92 Q1020,98 1068,244 L1096,628 Q1094,776 946,840 L214,850 Q128,840 106,642 Z" fill="url(#sandG)"/>
                            <path d="M250,596 Q230,496 250,360 L276,248 Q304,176 398,168 L840,170 Q934,178 980,286 L994,610 Q998,714 904,772 L346,784 Q268,778 250,596 Z" fill="url(#grassG)"/>
                            <path d="M108,642 Q118,790 228,842 L164,848 Q124,840 106,642 Z" fill="#f9efce" opacity="0.96"/>
                            <path d="M902,722 Q986,730 1060,666 L1072,748 Q1016,822 930,838 L854,832 Q900,790 902,722 Z" fill="#efd59c" opacity="0.88"/>
                            <path d="M110,664 Q170,786 334,832" stroke="rgba(255,255,255,0.32)" stroke-width="12" fill="none" stroke-linecap="round"/>
                            <path d="M874,814 Q1028,780 1092,682" stroke="rgba(255,255,255,0.3)" stroke-width="10" fill="none" stroke-linecap="round"/>

                            <path d="M264,324 L276,248 Q304,176 398,168 L840,170 Q934,178 980,286 L990,330 Q928,310 840,320 Q744,294 646,324 Q546,298 448,330 Q346,300 264,324 Z" fill="url(#cliffG)"/>
                            <path d="M258,336 Q372,284 492,296 Q612,272 714,302 Q828,278 956,326 L966,364 Q842,336 720,356 Q596,330 472,360 Q354,334 252,362 Z" fill="url(#cliffFaceG)" opacity="0.58"/>
                            <path d="M118,432 L140,246 L236,86 L322,182 L304,348 L248,434 Z" fill="#8c7250"/>
                            <path d="M212,306 L320,154 L440,76 L512,200 L454,336 Z" fill="#7b6546"/>
                            <path d="M442,310 L566,72 L700,216 L648,344 Z" fill="#6b563a"/>
                            <path d="M684,316 L812,102 L944,226 L884,350 Z" fill="#7a6647"/>
                            <path d="M914,416 L956,222 L1046,164 L1098,312 L1062,458 Z" fill="#6d583c"/>
                            <polygon points="560,90 566,72 578,92" fill="rgba(255,255,255,0.58)"/>
                            <polygon points="804,118 812,102 826,120" fill="rgba(255,255,255,0.44)"/>
                            <rect x="168" y="164" width="18" height="168" rx="9" fill="rgba(172,235,255,0.66)"/>
                            <rect x="194" y="156" width="12" height="182" rx="7" fill="rgba(122,220,255,0.56)"/>
                            <g opacity="0.26">
                                <ellipse cx="282" cy="310" rx="166" ry="30" fill="rgba(210,220,230,0.2)"/>
                                <ellipse cx="836" cy="300" rx="206" ry="34" fill="rgba(210,220,230,0.18)"/>
                            </g>

                            <path d="M210,438 Q286,350 394,342 L762,348 Q896,356 978,434 L968,518 Q892,554 806,548 Q716,566 620,560 Q518,576 408,560 Q302,576 220,536 Z" fill="url(#forestG)"/>
                            <g opacity="0.98">
                                <circle cx="228" cy="392" r="56" fill="#153518"/>
                                <circle cx="320" cy="378" r="64" fill="#173a19"/>
                                <circle cx="424" cy="368" r="72" fill="#123416"/>
                                <circle cx="544" cy="362" r="80" fill="#173819"/>
                                <circle cx="670" cy="366" r="76" fill="#193b1d"/>
                                <circle cx="796" cy="378" r="70" fill="#163718"/>
                                <circle cx="904" cy="396" r="62" fill="#173819"/>
                            </g>
                            <g opacity="0.9">
                                <circle cx="190" cy="448" r="44" fill="#244d25"/>
                                <circle cx="286" cy="442" r="52" fill="#2a5827"/>
                                <circle cx="398" cy="436" r="54" fill="#31642c"/>
                                <circle cx="522" cy="434" r="56" fill="#285727"/>
                                <circle cx="648" cy="438" r="54" fill="#356b2e"/>
                                <circle cx="770" cy="444" r="50" fill="#2d5d29"/>
                                <circle cx="886" cy="456" r="46" fill="#356b2e"/>
                            </g>
                            <g opacity="0.78">
                                <circle cx="228" cy="504" r="36" fill="#4c9c37"/>
                                <circle cx="352" cy="502" r="40" fill="#53a93a"/>
                                <circle cx="492" cy="500" r="40" fill="#62b442"/>
                                <circle cx="634" cy="500" r="42" fill="#5ca53d"/>
                                <circle cx="776" cy="506" r="38" fill="#4f9635"/>
                                <circle cx="900" cy="518" r="34" fill="#5ca53d"/>
                            </g>

                            <ellipse cx="824" cy="548" rx="168" ry="108" fill="url(#yardG)" opacity="0.94"/>
                            <ellipse cx="824" cy="548" rx="136" ry="76" fill="rgba(255,244,217,0.16)"/>
                            <ellipse cx="612" cy="600" rx="334" ry="140" fill="rgba(255,255,255,0.07)"/>

                            <path d="M300,618 Q284,560 312,520 Q380,474 460,480 L580,486 Q648,492 688,530 Q698,584 674,644 Q640,724 590,762 L398,772 Q344,766 316,720 Q290,676 300,618 Z" fill="url(#dirtG)" opacity="0.92"/>
                            <path d="M324,580 Q404,548 492,552 Q570,556 646,584" stroke="rgba(104,66,34,0.24)" stroke-width="8" fill="none" stroke-linecap="round"/>
                            <path d="M318,628 Q412,598 508,602 Q592,606 654,632" stroke="rgba(104,66,34,0.2)" stroke-width="7" fill="none" stroke-linecap="round"/>
                            <path d="M334,678 Q420,654 516,658 Q586,662 636,686" stroke="rgba(104,66,34,0.16)" stroke-width="6" fill="none" stroke-linecap="round"/>

                            <path d="M830,588 Q904,632 974,708" stroke="rgba(139,105,68,0.34)" stroke-width="28" fill="none" stroke-linecap="round"/>
                            <path d="M970,706 Q1036,724 1108,688" stroke="rgba(139,105,68,0.3)" stroke-width="18" fill="none" stroke-linecap="round"/>
                            <rect x="972" y="704" width="142" height="18" rx="6" fill="#8a6849"/>
                            <rect x="1006" y="720" width="14" height="58" rx="4" fill="#6d5037"/>
                            <rect x="1062" y="720" width="14" height="58" rx="4" fill="#6d5037"/>

                            <ellipse cx="200" cy="476" rx="70" ry="56" fill="rgba(68,92,76,0.54)"/>
                            <ellipse cx="998" cy="622" rx="34" ry="28" fill="rgba(112,132,144,0.52)"/>
                            <ellipse cx="1068" cy="352" rx="24" ry="18" fill="rgba(126,102,72,0.62)"/>
                            <path d="M118,680 Q164,782 258,826" stroke="rgba(255,255,255,0.22)" stroke-width="6" fill="none" stroke-linecap="round"/>
                        </g>
                        <ellipse cx="600" cy="852" rx="560" ry="92" fill="url(#fogG)" opacity="0.78"/>
                        <ellipse cx="108" cy="472" rx="110" ry="270" fill="rgba(176,198,214,0.28)"/>
                        <ellipse cx="1090" cy="458" rx="126" ry="254" fill="rgba(176,198,214,0.24)"/>
                        <ellipse cx="600" cy="92" rx="492" ry="78" fill="rgba(176,198,214,0.18)"/>
                    </svg>

                    <div class="island-land" id="island-land">
                        <div class="boom-house" style="left:80%;top:54%">
                            <svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
                                <rect x="20" y="190" width="200" height="16" rx="3" fill="#8B7355"/>
                                <rect x="30" y="88" width="180" height="108" rx="4" fill="#E8D8B0"/>
                                <rect x="30" y="88" width="90" height="108" fill="#F0E0C0" opacity="0.3"/>
                                <g stroke="#C4B090" stroke-width="0.8" opacity="0.3">
                                    <line x1="30" y1="108" x2="210" y2="108"/>
                                    <line x1="30" y1="128" x2="210" y2="128"/>
                                    <line x1="30" y1="148" x2="210" y2="148"/>
                                    <line x1="30" y1="168" x2="210" y2="168"/>
                                    <line x1="120" y1="88" x2="120" y2="196"/>
                                </g>
                                <polygon points="10,88 120,25 230,88" fill="#C0392B"/>
                                <polygon points="10,88 120,25 120,88" fill="#E74C3C" opacity="0.4"/>
                                <polygon points="120,25 230,88 120,88" fill="#962D22" opacity="0.3"/>
                                <line x1="10" y1="88" x2="230" y2="88" stroke="#7A2018" stroke-width="4"/>
                                <line x1="120" y1="25" x2="120" y2="88" stroke="#7A2018" stroke-width="1.5" opacity="0.3"/>
                                <rect x="170" y="30" width="18" height="45" rx="2" fill="#8B6914"/>
                                <rect x="168" y="26" width="22" height="8" rx="2" fill="#A07018"/>
                                <circle cx="179" cy="20" r="5" fill="rgba(200,200,200,0.5)"><animate attributeName="cy" values="20;5;-10" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.3;0" dur="3s" repeatCount="indefinite"/></circle>
                                <circle cx="184" cy="15" r="4" fill="rgba(200,200,200,0.4)"><animate attributeName="cy" values="15;0;-15" dur="3.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.2;0" dur="3.5s" repeatCount="indefinite"/></circle>
                                <rect x="48" y="105" width="32" height="32" rx="3" fill="#87CEEB" stroke="#8B6914" stroke-width="2.5"/>
                                <line x1="64" y1="105" x2="64" y2="137" stroke="#8B6914" stroke-width="2"/>
                                <line x1="48" y1="121" x2="80" y2="121" stroke="#8B6914" stroke-width="2"/>
                                <rect x="160" y="105" width="32" height="32" rx="3" fill="#87CEEB" stroke="#8B6914" stroke-width="2.5"/>
                                <line x1="176" y1="105" x2="176" y2="137" stroke="#8B6914" stroke-width="2"/>
                                <line x1="160" y1="121" x2="192" y2="121" stroke="#8B6914" stroke-width="2"/>
                                <rect x="95" y="140" width="50" height="56" rx="4" fill="#6B4410"/>
                                <rect x="98" y="143" width="44" height="50" rx="3" fill="#8B5E14"/>
                                <path d="M95,140 Q120,125 145,140" fill="#5A3A0C" opacity="0.4"/>
                                <circle cx="133" cy="170" r="3.5" fill="#DAA520"/><circle cx="133" cy="170" r="2" fill="#FFD700"/>
                                <rect x="48" y="138" width="32" height="6" rx="1" fill="#6B4410"/>
                                <circle cx="54" cy="136" r="4" fill="#FF6B8A"/><circle cx="64" cy="135" r="3.5" fill="#FFD700"/><circle cx="74" cy="136" r="4" fill="#FF8FAA"/>
                                <rect x="160" y="138" width="32" height="6" rx="1" fill="#6B4410"/>
                                <circle cx="166" cy="136" r="4" fill="#FFD700"/><circle cx="176" cy="135" r="3.5" fill="#FF6B8A"/><circle cx="186" cy="136" r="4" fill="#FFD700"/>
                                <rect x="86" y="145" width="6" height="12" rx="1" fill="#DAA520"/>
                                <circle cx="89" cy="142" r="4" fill="rgba(255,200,50,0.6)"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/></circle>
                            </svg>
                            <div class="hut-label">\u{1F3E0} 小屋</div>
                        </div>

                        <div class="boom-harbor" id="harbor-building" style="left:92%;top:79%" title="港口 — 点击管理">
                            <span class="harbor-icon">\u26F5</span>
                            <div class="hut-label">\u2693 港口</div>
                        </div>

                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:11%;top:84%;width:72px;opacity:0.92">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:24%;top:87%;width:48px;opacity:0.76">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:89%;top:82%;width:56px;opacity:0.86">
                        <img class="deco-rock" src="/img/trees/obstacle_rock.svg" alt="" style="left:18%;top:82%;width:72px;opacity:0.76">
                        <img class="deco-rock" src="/img/trees/obstacle_rock.svg" alt="" style="left:83%;top:58%;width:56px;opacity:0.56">
                        <img class="deco-rock" src="/img/trees/obstacle_rock.svg" alt="" style="left:68%;top:24%;width:44px;opacity:0.42">

                        <div class="ambient-particle p1" style="font-size:11px">\u{1F54A}\uFE0F</div>
                        <div class="ambient-particle p3" style="font-size:10px">\u{1F54A}\uFE0F</div>
                        <div class="ambient-particle p2">\u{1F343}</div>
                        <div class="ambient-particle p4">\u{1F98B}</div>

                        ${this.plots.map((plot, i) => this.renderIslandPlot(plot, this.getPlotLayout(plot, i))).join('')}
                    </div>

                </div>
                ${activeExp ? '<div class="expedition-float">' + (this.assignee === '潘潘' ? '\u{1F431}' : '\u{1F430}') + ' 探索中... \u26F5</div>' : ''}
                <div class="zoom-controls">
                    <button id="zoom-in-btn" class="zoom-btn">+</button>
                    <span id="zoom-level-text">100%</span>
                    <button id="zoom-out-btn" class="zoom-btn">\u2212</button>
                    <button id="zoom-reset-btn" class="zoom-btn" style="font-size:10px">\u27f2</button>
                </div>
            </div>

            ${this.selectedTree ? this.renderPlantingToolbar() : ''}

            <div class="island-stats-bar">
                <span>\u{1F331} ${plantedCount} 种植</span>
                <span>\u{1F4E6} ${typesCollected} 种类</span>
                <span>\u26CF\uFE0F ${clearedCount} 开垦</span>
            </div>
        `;

        this.bindGardenEvents();
        this.initDrag();
        this._staticRendered = true;
    },

    renderIslandPlot(plot, layout) {
        const { left, top, zone, scale, zIndex } = layout || {};
        const style = `left:${left ?? 50}%;top:${top ?? 60}%;--plot-scale:${scale ?? 1};z-index:${zIndex ?? 8}`;
        const zoneClass = zone ? `zone-${zone}` : '';
        if (plot.status === 'wasteland') {
            const obs = this.obstacleMap[plot.obstacle_type] || this.obstacleMap.rock;
            return `<div class="iplot wasteland ${zoneClass}" data-zone="${zone || ''}" data-plot-id="${plot.id}" style="${style}" title="${obs.name} · 开荒 ${obs.cost} 喵喵币">
                <img src="${obs.img}" alt="${obs.name}" class="iplot-img"><span class="iplot-cost">⛏️${obs.cost}</span></div>`;
        }
        if (plot.status === 'cleared') {
            const sel = this.selectedTree;
            return `<div class="iplot cleared ${zoneClass} ${sel ? 'plantable' : ''}" data-zone="${zone || ''}" data-plot-id="${plot.id}" style="${style}" title="空地">
                <div class="iplot-empty">${sel ? '🌱' : ''}</div></div>`;
        }
        const catItem = this.catalog.find(c => c.type === plot.tree_type);
        const gm = plot.growth_minutes || 0;
        const stage = this.getGrowthStage(gm);
        const pct = Math.min(100, Math.round(gm / 150 * 100));
        let imgSrc = catItem?.stages?.[stage] || '/img/trees/seed.svg';
        return `<div class="iplot planted ${zoneClass} stage-${stage}" data-zone="${zone || ''}" data-plot-id="${plot.id}" style="${style}" title="${catItem?.name || plot.tree_type} · ${this.getGrowthLabel(gm)}">
            <img src="${imgSrc}" alt="" class="iplot-img"><div class="iplot-bar"><div class="iplot-bar-fill" style="width:${pct}%"></div></div></div>`;
    },

    _zoom: 1,
    _minZoom: 0.85,
    _maxZoom: 2.6,

    initDrag() {
        const vp = document.getElementById('island-viewport');
        const world = document.getElementById('island-world');
        if (!vp || !world) return;
        if (!this._dragState) {
            this._dragState = { active: false, sx: 0, sy: 0, sl: 0, st: 0 };
        }
        const dragState = this._dragState;

        // Apply 3D isometric perspective
        this._applyTransform(world);

        // Center island
        requestAnimationFrame(() => {
            this._centerViewport(vp, world);
        });

        vp.addEventListener('scroll', () => {
            this._clampViewport(vp, world);
        }, { passive: true });

        // ─── Mouse drag ───
        vp.addEventListener('mousedown', e => {
            if (e.target.closest('.iplot,.boom-house,.boom-harbor,.zoom-controls,.forest-tree-btn,.plot-menu')) return;
            this.closePlotMenu();
            dragState.active = true;
            dragState.sx = e.pageX;
            dragState.sy = e.pageY;
            dragState.sl = vp.scrollLeft;
            dragState.st = vp.scrollTop;
            vp.style.cursor = 'grabbing';
        });

        // Only bind document-level listeners once to prevent leak
        if (!this._dragInitialized) {
            this._dragInitialized = true;
            document.addEventListener('mousemove', e => {
                if (!this._dragState?.active) return;
                e.preventDefault();
                const vpEl = document.getElementById('island-viewport');
                const worldEl = document.getElementById('island-world');
                if (!vpEl) return;
                vpEl.scrollLeft = this._dragState.sl - (e.pageX - this._dragState.sx);
                vpEl.scrollTop = this._dragState.st - (e.pageY - this._dragState.sy);
                this._clampViewport(vpEl, worldEl);
            });
            document.addEventListener('mouseup', () => {
                if (this._dragState) this._dragState.active = false;
                const vpEl = document.getElementById('island-viewport');
                if (vpEl) vpEl.style.cursor = 'grab';
            });
        }

        // ─── Scroll-wheel zoom ───
        vp.addEventListener('wheel', e => {
            e.preventDefault();
            this.closePlotMenu();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, this._zoom + delta));
            this._applyTransform(world);
            this._updateZoomDisplay();
            requestAnimationFrame(() => this._clampViewport(vp, world));
        }, { passive: false });

        // ─── Touch: drag + pinch-to-zoom ───
        let lastPinchDist = 0;
        let pinching = false;

        vp.addEventListener('touchstart', e => {
            if (e.touches.length === 2) {
                // Pinch start
                this.closePlotMenu();
                pinching = true;
                dragState.active = false;
                lastPinchDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            } else if (e.touches.length === 1 && !pinching) {
                if (e.target.closest('.iplot,.boom-house,.boom-harbor,.zoom-controls,.forest-tree-btn,.plot-menu')) return;
                this.closePlotMenu();
                dragState.active = true;
                dragState.sx = e.touches[0].pageX;
                dragState.sy = e.touches[0].pageY;
                dragState.sl = vp.scrollLeft;
                dragState.st = vp.scrollTop;
            }
        }, { passive: true });

        vp.addEventListener('touchmove', e => {
            if (pinching && e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                const pinchDelta = (dist - lastPinchDist) * 0.005;
                this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, this._zoom + pinchDelta));
                this._applyTransform(world);
                this._updateZoomDisplay();
                lastPinchDist = dist;
            } else if (dragState.active && e.touches.length === 1) {
                vp.scrollLeft = dragState.sl - (e.touches[0].pageX - dragState.sx);
                vp.scrollTop = dragState.st - (e.touches[0].pageY - dragState.sy);
                this._clampViewport(vp, world);
            }
        }, { passive: true });

        vp.addEventListener('touchend', e => {
            if (e.touches.length < 2) pinching = false;
            if (e.touches.length === 0) dragState.active = false;
        });

        // ─── Zoom button events ───
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this._zoom = Math.min(this._maxZoom, this._zoom + 0.15);
            this._applyTransform(world);
            this._updateZoomDisplay();
            requestAnimationFrame(() => this._clampViewport(vp, world));
        });
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this._zoom = Math.max(this._minZoom, this._zoom - 0.15);
            this._applyTransform(world);
            this._updateZoomDisplay();
            requestAnimationFrame(() => this._clampViewport(vp, world));
        });
        document.getElementById('zoom-reset-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this._zoom = 1;
            this._applyTransform(world);
            this._updateZoomDisplay();
            // Re-center
            requestAnimationFrame(() => {
                this._centerViewport(vp, world);
            });
        });
    },

    _applyTransform(world) {
        if (!world) world = document.getElementById('island-world');
        if (!world) return;
        world.style.transform = `perspective(1600px) rotateX(14deg) scale(${this._zoom})`;
        world.style.transformOrigin = 'center 42.5%';
    },

    _updateZoomDisplay() {
        const el = document.getElementById('zoom-level-text');
        if (el) el.textContent = Math.round(this._zoom * 100) + '%';
    },

    renderPlantingToolbar() {
        const item = this.catalog.find(c => c.type === this.selectedTree);
        if (!item) return '';
        return `
            <div class="planting-toolbar">
                <img src="${item.stages.mature}" alt="" style="width:32px;height:40px">
                <span>正在种植: <strong>${item.name}</strong></span>
                <button class="btn-cancel-plant" id="cancel-plant-btn">✕ 取消</button>
            </div>
        `;
    },

    bindGardenEvents() {
        // Person filter
        document.querySelectorAll('#view-garden .filter-pill').forEach(btn => {
            btn.addEventListener('click', async () => {
                this.assignee = btn.dataset.person;
                this.currentIsland = null;
                this._staticRendered = false;
                await this.open();
            });
        });

        // Backpack button (garden)
        document.getElementById('garden-backpack-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this.showBackpack(this.assignee);
        });

        // History button
        document.getElementById('garden-history-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this.showHistory();
        });

        // World map button
        document.getElementById('world-map-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this.showWorldMap();
        });

        // Harbor building click
        document.getElementById('harbor-building')?.addEventListener('click', () => {
            this.closePlotMenu();
            this.showHarborPanel();
        });

        // Cancel planting
        document.getElementById('cancel-plant-btn')?.addEventListener('click', () => {
            this.selectedTree = null;
            this.render();
        });

        // Plot clicks
        document.querySelectorAll('.iplot').forEach(plotEl => {
            plotEl.addEventListener('click', async (e) => {
                e.stopPropagation();
                const plotId = parseInt(plotEl.dataset.plotId);
                const plot = this.plots.find(p => p.id === plotId);
                if (!plot) return;

                // Moving mode — select target
                if (this._movingPlotId && plot.status === 'cleared') {
                    await this.executeMoveToPlot(plotId);
                    return;
                }

                if (plot.status === 'wasteland') {
                    await this.clearPlot(plotId, plot.obstacle_type);
                } else if (plot.status === 'cleared' && this.selectedTree) {
                    await this.plantOnPlot(plotId);
                } else if (plot.status === 'planted') {
                    this.showPlotMenu(plotId, plotEl);
                }
            });
        });

        document.querySelectorAll('.forest-tree-btn').forEach(treeEl => {
            treeEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closePlotMenu();
                if (!this._forestHintShown) {
                    this._forestHintShown = true;
                    App.showToast('🌲 深林层目前是地形层，开垦和种植请点前方荒地地块', 'info');
                }
            });
        });

        // Close menu when clicking outside
        document.getElementById('island-viewport')?.addEventListener('click', (e) => {
            if (!e.target.closest('.plot-menu') && !e.target.closest('.iplot')) {
                this.closePlotMenu();
            }
        });
    },

    // ═══ Plant Interaction Menu ═══
    _movingPlotId: null,

    showPlotMenu(plotId, plotEl) {
        this.closePlotMenu();
        const plot = this.plots.find(p => p.id === plotId);
        if (!plot) return;

        const catItem = this.catalog.find(c => c.type === plot.tree_type);
        const gm = plot.growth_minutes || 0;
        const isMature = gm >= 150;

        const menu = document.createElement('div');
        menu.className = 'plot-menu';
        menu.innerHTML = `
            <div class="plot-menu-header">
                <span>${catItem?.icon || '🌱'}</span>
                <strong>${catItem?.name || plot.tree_type}</strong>
                <small>${this.getGrowthLabel(gm)}</small>
            </div>
            <div class="plot-menu-actions">
                <button class="pm-btn pm-collect ${isMature ? '' : 'disabled'}" data-action="collect" title="收取金币">
                    💰
                    <span>收取</span>
                </button>
                <button class="pm-btn pm-speedup ${isMature ? 'disabled' : ''}" data-action="speedup" title="花费 5 喵喵币加速">
                    ⏩
                    <span>加速<br><small>5币</small></span>
                </button>
                <button class="pm-btn pm-move" data-action="move" title="移动到空地">
                    🔄
                    <span>移动</span>
                </button>
                <button class="pm-btn pm-remove" data-action="remove" title="铲除植物">
                    🗑️
                    <span>铲除</span>
                </button>
                <button class="pm-btn pm-items disabled" data-action="items" title="道具（即将上线）">
                    🧪
                    <span>道具</span>
                </button>
            </div>
        `;

        // Position near the plot in screen space so scroll/zoom doesn't desync the menu.
        const rect = plotEl.getBoundingClientRect();
        const showBelow = rect.top < 180;
        if (showBelow) menu.classList.add('plot-menu-below');
        menu.style.position = 'fixed';
        menu.style.left = `${rect.left + rect.width / 2}px`;
        menu.style.top = `${showBelow ? rect.bottom + 10 : rect.top - 10}px`;

        document.body.appendChild(menu);

        const outsideHandler = (e) => {
            if (e.target.closest('.plot-menu')) return;
            if (e.target.closest(`.iplot[data-plot-id="${plotId}"]`)) return;
            this.closePlotMenu();
        };
        const viewportChangeHandler = () => this.closePlotMenu();
        const viewport = document.getElementById('island-viewport');
        document.addEventListener('mousedown', outsideHandler, true);
        window.addEventListener('resize', viewportChangeHandler);
        viewport?.addEventListener('scroll', viewportChangeHandler, { passive: true });
        this._plotMenuCleanup = () => {
            document.removeEventListener('mousedown', outsideHandler, true);
            window.removeEventListener('resize', viewportChangeHandler);
            viewport?.removeEventListener('scroll', viewportChangeHandler);
            this._plotMenuCleanup = null;
        };

        // Bind actions
        menu.querySelectorAll('.pm-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'collect') await this.collectPlot(plotId);
                else if (action === 'remove') await this.removePlot(plotId);
                else if (action === 'move') this.startMovePlot(plotId);
                else if (action === 'speedup') await this.speedupPlot(plotId);
                else if (action === 'items') Utils.toast('🧪 道具功能即将上线！');
            });
        });
    },

    closePlotMenu() {
        this._plotMenuCleanup?.();
        document.querySelectorAll('.plot-menu').forEach(m => m.remove());
        this._movingPlotId = null;
        document.querySelectorAll('.iplot.move-target').forEach(el => el.classList.remove('move-target'));
    },

    async collectPlot(plotId) {
        this.closePlotMenu();
        const plot = this.plots.find(p => p.id === plotId);
        if (!plot || !plot.tree_id) return;
        try {
            const res = await fetch('/api/garden/harvest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignee: this.assignee, tree_id: plot.tree_id })
            });
            const data = await res.json();
            if (!res.ok) { Utils.toast(data.error || '收取失败'); return; }
            App.syncCoins({ assignee: this.assignee, balance: data.balance, delta: data.reward, animate: data.reward > 0 });
            Utils.toast(`💰 收获 ${data.reward} 喵喵币！`, 'success');
            await this.refreshData();
        } catch (e) { Utils.toast('网络错误'); }
    },

    async removePlot(plotId) {
        this.closePlotMenu();
        const plot = this.plots.find(p => p.id === plotId);
        const catItem = this.catalog.find(c => c.type === plot?.tree_type);
        if (!confirm(`确定要铲除 ${catItem?.name || '这株植物'} 吗？\n（不会返还喵喵币）`)) return;
        try {
            const res = await fetch('/api/garden/plots/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignee: this.assignee, plot_id: plotId })
            });
            const data = await res.json();
            if (!res.ok) { Utils.toast(data.error || '铲除失败'); return; }
            Utils.toast('🗑️ 已铲除', 'success');
            this._staticRendered = false;
            await this.open();
        } catch (e) { Utils.toast('网络错误'); }
    },

    startMovePlot(plotId) {
        this.closePlotMenu();
        this._movingPlotId = plotId;
        // Highlight cleared plots as targets
        document.querySelectorAll('.iplot.cleared').forEach(el => {
            el.classList.add('move-target');
        });
        Utils.toast('🔄 点击一个空地块来移动植物', 'info');
    },

    async executeMoveToPlot(targetPlotId) {
        if (!this._movingPlotId) return;
        try {
            const res = await fetch('/api/garden/plots/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignee: this.assignee,
                    from_plot_id: this._movingPlotId,
                    to_plot_id: targetPlotId
                })
            });
            const data = await res.json();
            if (!res.ok) { Utils.toast(data.error || '移动失败'); return; }
            Utils.toast('🔄 移动成功！', 'success');
            this._movingPlotId = null;
            this._staticRendered = false;
            await this.open();
        } catch (e) { Utils.toast('网络错误'); }
    },

    async speedupPlot(plotId) {
        this.closePlotMenu();
        try {
            const res = await fetch('/api/garden/plots/speedup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignee: this.assignee, plot_id: plotId })
            });
            const data = await res.json();
            if (!res.ok) { Utils.toast(data.error || '加速失败'); return; }
            App.syncCoins({ assignee: this.assignee, balance: data.balance });
            Utils.toast(`⏩ 加速成功！花费 ${data.cost} 喵喵币`, 'success');
            this._staticRendered = false;
            await this.open();
        } catch (e) { Utils.toast('网络错误'); }
    },

    // ═══ World Map Overlay ═══
    showWorldMap() {
        document.querySelector('.world-map-overlay')?.remove();
        const discovered = this.islands.filter(i => i.discovered);
        const overlay = document.createElement('div');
        overlay.className = 'world-map-overlay';
        overlay.innerHTML = `
            <div class="world-map-title">🗺️ 世界地图 — ${discovered.length} 已发现 / ${this.islands.length} 总计</div>
            <div class="world-map-container">
                <button class="world-map-close" id="world-map-close">✕</button>
                ${this.islands.map(island => {
            const cx = 250 + island.position_x * 90;
            const cy = 200 + island.position_y * 90;
            const cls = island.island_type === 'starter' ? 'starter' : island.discovered ? 'discovered' : 'foggy';
            const icon = island.island_type === 'starter' ? '🏠' : island.discovered ? '🏝️' : '❓';
            return `<div class="island-node ${cls}" data-island-id="${island.id}" style="left:${cx}px;top:${cy}px" title="${island.discovered ? island.name + ' (' + island.grid_w + '×' + island.grid_h + ')' : '未探索'}">
                        <div class="island-node-icon">${icon}</div>
                        <div class="island-node-name">${island.discovered ? island.name : '???'}</div>
                    </div>`;
        }).join('')}
                <div style="position:absolute;bottom:10px;right:14px;font-size:10px;color:rgba(255,255,255,0.3)">🧭 N↑</div>
            </div>`;
        document.body.appendChild(overlay);
        document.getElementById('world-map-close')?.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelectorAll('.island-node.discovered, .island-node.starter').forEach(node => {
            node.addEventListener('click', async () => {
                const id = parseInt(node.dataset.islandId);
                const island = this.islands.find(i => i.id === id);
                if (island && island.discovered) {
                    this.currentIsland = island;
                    overlay.remove();
                    await this.open();
                }
            });
        });
    },

    // ═══ Harbor Panel ═══
    async showHarborPanel() {
        try {
            const bd = await fetch(`/api/garden/boats/${encodeURIComponent(this.assignee)}`).then(r => r.json());
            this.boats = bd.boats || [];
        } catch (e) { /* keep */ }
        try {
            this.expeditions = await fetch(`/api/garden/expeditions/${encodeURIComponent(this.assignee)}`).then(r => r.json());
        } catch (e) { /* keep */ }

        document.querySelector('.harbor-panel')?.remove();
        const CAT = { raft: { name: '小木筏', cost: 200, icon: '🛶', dur: 60, label: '1小时' }, sailboat: { name: '帆船', cost: 500, icon: '⛵', dur: 300, label: '5小时' }, galleon: { name: '大帆船', cost: 1000, icon: '🚢', dur: 720, label: '12小时' } };
        const charName = this.assignee === '潘潘' ? '小八 🐱' : '乌撒奇 🐰';
        const activeExp = this.expeditions.find(e => e.status === 'sailing');

        let expHtml = '';
        if (activeExp) {
            const start = new Date(activeExp.started_at.replace(' ', 'T'));
            const elapsed = Math.floor((Date.now() - start.getTime()) / 60000);
            const pct = Math.min(100, Math.round(elapsed / activeExp.duration_min * 100));
            const rem = Math.max(0, activeExp.duration_min - elapsed);
            const remLabel = rem >= 60 ? `${Math.floor(rem / 60)}小时${rem % 60 ? rem % 60 + '分' : ''}` : `${rem}分钟`;
            expHtml = `<div class="expedition-active"><div class="expedition-header"><div class="expedition-char">${this.assignee === '潘潘' ? '🐱' : '🐰'}</div><div class="expedition-info"><div class="expedition-dest">${activeExp.character} 正在探索未知海域...</div><div class="expedition-time">剩余约 ${remLabel}</div></div></div><div class="expedition-bar"><div class="expedition-bar-fill" style="width:${pct}%"></div></div></div>`;
        }

        const myBoats = this.boats.length ? this.boats.map(b => {
            const s = CAT[b.boat_type] || CAT.raft;
            return `<div class="boat-card ${b.status === 'sailing' ? 'sailing' : ''}" data-boat-id="${b.id}"><div class="boat-card-icon">${s.icon}</div><div class="boat-card-info"><div class="boat-card-name">${s.name}</div><div class="boat-card-status">${b.status === 'sailing' ? '⛵ 航行中' : '停泊中'} · ${s.label}</div></div>${b.status === 'docked' && !activeExp ? `<button class="boat-card-action explore" data-sail="${b.id}">🧭 探索</button>` : ''}</div>`;
        }).join('') : '<div style="color:rgba(255,255,255,0.3);font-size:13px;padding:8px">还没有船只，先买一艘吧！</div>';

        const shop = Object.entries(CAT).map(([t, s]) => `<div class="boat-card"><div class="boat-card-icon">${s.icon}</div><div class="boat-card-info"><div class="boat-card-name">${s.name}</div><div class="boat-card-status">${s.cost} 喵喵币 · ${s.label}</div></div><button class="boat-card-action buy" data-buy="${t}">购买</button></div>`).join('');

        const p = document.createElement('div');
        p.className = 'harbor-panel';
        p.innerHTML = `<div class="harbor-content"><div class="harbor-title">⚓ 港口 — ${charName}</div>${expHtml}<div class="harbor-section"><div class="harbor-section-title">🚢 我的船只</div>${myBoats}</div><div class="harbor-section"><div class="harbor-section-title">🛒 船只商店</div>${shop}</div><button class="harbor-close" id="hp-close">关闭</button></div>`;
        document.body.appendChild(p);

        document.getElementById('hp-close')?.addEventListener('click', () => p.remove());
        p.addEventListener('click', e => { if (e.target === p) p.remove(); });
        p.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', async () => { await this.buyBoat(b.dataset.buy); p.remove(); }));
        p.querySelectorAll('[data-sail]').forEach(b => b.addEventListener('click', async () => { await this.startExpedition(parseInt(b.dataset.sail)); p.remove(); }));
    },

    async buyBoat(type) {
        try {
            const r = await fetch('/api/garden/boats/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignee: this.assignee, boat_type: type }) }).then(r => { if (!r.ok) throw r; return r.json(); });
            App.syncCoins({ assignee: this.assignee, balance: r.balance });
            App.showToast(`🚢 购买成功！${r.boat.name}`, 'success');
            await this.open();
        } catch (e) {
            const err = e.json ? await e.json() : { error: '购买失败' };
            App.showToast(err.error || '购买失败', 'error');
        }
    },

    async startExpedition(boatId) {
        try {
            const r = await fetch('/api/garden/expeditions/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignee: this.assignee, boat_id: boatId }) }).then(r => { if (!r.ok) throw r; return r.json(); });
            App.showToast(`⛵ ${r.character} 出发探索 ${r.targetIsland.name}！`, 'success');
            await this.open();
        } catch (e) {
            const err = e.json ? await e.json() : { error: '出发失败' };
            App.showToast(err.error || '出发失败', 'error');
        }
    },

    async clearPlot(plotId, obstacleType) {
        const obs = this.obstacleMap[obstacleType] || this.obstacleMap.rock;
        if (this.balance < obs.cost) {
            App.showToast(`喵喵币不足！需要 ${obs.cost} 喵喵币`, 'error');
            return;
        }
        if (!confirm(`开荒: 清除${obs.name}，花费 ${obs.cost} 喵喵币？`)) return;

        try {
            const result = await API.clearPlot({ assignee: this.assignee, plot_id: plotId });
            App.syncCoins({ assignee: this.assignee, balance: result.balance });
            App.showToast(`⛏️ 开荒成功！-${result.cost} 喵喵币`, 'success');
            await this.open();
        } catch (e) {
            App.showToast(e.message || '开荒失败', 'error');
        }
    },

    async plantOnPlot(plotId) {
        const item = this.catalog.find(c => c.type === this.selectedTree);
        if (!item) return;
        if (this.balance < item.cost) {
            App.showToast(`喵喵币不足！需要 ${item.cost} 喵喵币`, 'error');
            return;
        }

        try {
            const result = await API.plantTree({
                assignee: this.assignee,
                tree_type: item.type,
                plot_id: plotId,
            });
            App.syncCoins({ assignee: this.assignee, balance: result.balance });
            this.selectedTree = null;
            App.showToast(`🌱 种下了${item.name}！`, 'success');
            await this.open();
        } catch (e) {
            App.showToast(e.message || '种植失败', 'error');
        }
    },

    async showHistory() {
        try {
            const history = await API.getCoinHistory(this.assignee, 30);
            const html = history.map(h => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                    <span>${h.reason === 'pomodoro' ? '🍅' : h.reason === 'checkin' ? '✅' : h.reason === 'purchase' ? '🛒' : '⛏️'} ${h.detail || h.reason}</span>
                    <span style="color:${h.amount > 0 ? '#4CAF50' : '#ef5350'};font-weight:600">${h.amount > 0 ? '+' : ''}${h.amount}</span>
                </div>
            `).join('') || '<p style="text-align:center;opacity:0.5">暂无记录</p>';

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `<div class="modal-box" style="max-width:400px">
                <h3>📊 喵喵币记录</h3>
                <div style="max-height:300px;overflow-y:auto">${html}</div>
                <button class="modal-close-btn" style="margin-top:12px;width:100%">关闭</button>
            </div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        } catch (e) {
            App.showToast('加载记录失败', 'error');
        }
    },

    /* ═══════════════════════════════
       SHOP VIEW (standalone)
       ═══════════════════════════════ */
    async openShop() {
        try {
            const { balance } = await API.getCoins(this.shopAssignee);
            this.shopBalance = balance;
        } catch (e) {
            App.showToast('加载商城失败', 'error');
        }
        this.renderShop();
        this.updateHeaderCoins();
    },

    renderShop() {
        const el = document.getElementById('view-shop');
        if (!el) return;

        el.innerHTML = `
            <div class="shop-view-header">
                <div class="garden-balance">
                    ${Utils.coinSvg()}
                    <strong>${Utils.formatCoinBalance(this.shopBalance)}</strong> 喵喵币
                </div>
                <button class="hud-btn backpack-btn-shop" id="shop-backpack-btn" title="背包">\u{1F392}</button>
                <div class="filter-pills">
                    <button class="filter-pill ${this.shopAssignee === '潘潘' ? 'active' : ''}" data-person="潘潘">
                        <img src="/img/panpan.png" alt="" style="width:18px;height:18px;border-radius:50%"> 潘潘
                    </button>
                    <button class="filter-pill ${this.shopAssignee === '蒲蒲' ? 'active' : ''}" data-person="蒲蒲">
                        <img src="/img/pupu.png" alt="" style="width:18px;height:18px;border-radius:50%"> 蒲蒲
                    </button>
                </div>
            </div>
            <div class="shop-full-grid">
                ${this.catalog.map(item => `
                    <div class="shop-card ${this.shopBalance >= item.cost ? '' : 'locked'}" data-type="${item.type}" data-cost="${item.cost}">
                        <img class="shop-card-img" src="${item.stages.mature}" alt="${item.name}">
                        <div class="shop-card-name">${item.name}</div>
                        <div class="shop-card-price">${item.cost === 0 ? '免费' : `${Utils.coinSvg('cat-coin-icon', 'width:16px;height:16px')} ${item.cost}`}</div>
                    </div>
                `).join('')}
            </div>
        `;

        this.bindShopEvents();
    },

    showTreeDetail(treeType) {
        const item = this.catalog.find(c => c.type === treeType);
        if (!item) return;
        const canBuy = this.shopBalance >= item.cost;
        const stageLabels = ['种子', '发芽', '成长', '成熟'];
        const stageKeys = ['seed', 'sprout', 'growing', 'mature'];
        const stageTimes = ['0分钟', '25分钟', '75分钟', '150分钟'];

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box tree-detail-modal">
                <button class="modal-x-btn" id="tree-detail-close">✕</button>
                <div class="tree-detail-hero">
                    <img class="tree-detail-img" src="${item.stages.mature}" alt="${item.name}">
                    <h3 class="tree-detail-name">${item.name}</h3>
                    <p class="tree-detail-desc">${item.desc}</p>
                </div>
                <div class="tree-detail-stages">
                    <h4>🌱 成长阶段</h4>
                    <div class="tree-stages-timeline">
                        ${stageKeys.map((key, i) => `
                            <div class="stage-item">
                                <img src="${item.stages[key]}" alt="${stageLabels[i]}">
                                <span class="stage-label">${stageLabels[i]}</span>
                                <span class="stage-time">${stageTimes[i]}</span>
                            </div>
                            ${i < 3 ? '<div class="stage-connector"><div class="stage-line"></div><span>▸</span></div>' : ''}
                        `).join('')}
                    </div>
                </div>
                <div class="tree-detail-footer">
                    <div class="tree-detail-cost">${item.cost === 0 ? '免费' : `${Utils.coinSvg('cat-coin-icon', 'width:20px;height:20px')} ${item.cost} 喵喵币`}</div>
                    <button class="shop-buy-btn ${canBuy ? '' : 'disabled'}" id="tree-detail-buy" ${canBuy ? '' : 'disabled'}>
                        ${item.cost === 0 ? '🌱 去种植' : canBuy ? '🛒 购买并种植' : '🔒 喵喵币不足'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        overlay.querySelector('#tree-detail-close').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 200);
        });
        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 200);
            }
        });
        const buyBtn = overlay.querySelector('#tree-detail-buy');
        if (buyBtn && !buyBtn.disabled) {
            buyBtn.addEventListener('click', () => {
                overlay.remove();
                this.selectedTree = treeType;
                this.assignee = this.shopAssignee;
                App.switchView('garden');
                App.showToast('👆 点击空地种植', 'info');
            });
        }
    },

    bindShopEvents() {
        // Person filter
        document.querySelectorAll('#view-shop .filter-pill').forEach(btn => {
            btn.addEventListener('click', async () => {
                this.shopAssignee = btn.dataset.person;
                await this.openShop();
            });
        });

        // Backpack button (shop)
        document.getElementById('shop-backpack-btn')?.addEventListener('click', () => {
            this.showBackpack(this.shopAssignee);
        });

        // Clicking card opens detail modal
        document.querySelectorAll('#view-shop .shop-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showTreeDetail(card.dataset.type);
            });
        });
    },

    // ═══ Backpack Overlay ═══
    _backpackSearch: '',

    _getPlantRarity(price) {
        if (price >= 100) return { tier: 'SSR', cls: 'rarity-ssr', label: '传说' };
        if (price >= 50)  return { tier: 'SR',  cls: 'rarity-sr',  label: '稀有' };
        if (price >= 20)  return { tier: 'R',   cls: 'rarity-r',   label: '精良' };
        return { tier: 'N', cls: 'rarity-n', label: '普通' };
    },

    _formatPlantedDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr.replace(' ', 'T'));
        const m = d.getMonth() + 1;
        const day = d.getDate();
        return `${m}月${day}日`;
    },

    _getFilteredPlants() {
        let plants = this._backpackPlants || [];
        if (this._backpackSearch) {
            const q = this._backpackSearch.toLowerCase();
            plants = plants.filter(p => {
                const catItem = this.catalog.find(c => c.type === p.tree_type);
                const name = (catItem?.name || p.tree_type).toLowerCase();
                return name.includes(q);
            });
        }
        return plants;
    },

    async showBackpack(assignee) {
        document.querySelector('.backpack-overlay')?.remove();

        let plants = [];
        try {
            const data = await fetch(`/api/garden/backpack/${encodeURIComponent(assignee)}`).then(r => r.json());
            plants = data.plants || [];
        } catch (e) {
            App.showToast('加载背包失败', 'error');
            return;
        }

        this._backpackPlants = plants;
        this._backpackSort = { by: 'price', order: 'asc' };
        this._backpackSearch = '';

        // Compute summary stats
        const totalValue = plants.reduce((s, p) => s + p.price, 0);
        const matureCount = plants.filter(p => p.growth_minutes >= 150).length;
        const maturePct = plants.length ? Math.round(matureCount / plants.length * 100) : 0;
        const typesCount = new Set(plants.map(p => p.tree_type)).size;

        const overlay = document.createElement('div');
        overlay.className = 'backpack-overlay';
        overlay.innerHTML = `
            <div class="backpack-modal">
                <div class="backpack-header">
                    <h3>\u{1F392} 背包</h3>
                    <button class="backpack-close" id="backpack-close">✕</button>
                </div>
                <div class="backpack-summary">
                    <div class="backpack-stat">
                        <span class="backpack-stat-num">${plants.length}</span>
                        <span class="backpack-stat-label">植物</span>
                    </div>
                    <div class="backpack-stat">
                        <span class="backpack-stat-num">${typesCount}</span>
                        <span class="backpack-stat-label">种类</span>
                    </div>
                    <div class="backpack-stat">
                        <span class="backpack-stat-num">${totalValue}</span>
                        <span class="backpack-stat-label">总价值</span>
                    </div>
                    <div class="backpack-stat">
                        <span class="backpack-stat-num">${maturePct}%</span>
                        <span class="backpack-stat-label">成熟率</span>
                    </div>
                </div>
                <div class="backpack-tabs">
                    <button class="backpack-tab active" data-tab="plants">\u{1F331} 植物 <span class="backpack-tab-count">${plants.length}</span></button>
                </div>
                <div class="backpack-toolbar">
                    <div class="backpack-search">
                        <span class="backpack-search-icon">\u{1F50D}</span>
                        <input type="text" class="backpack-search-input" id="backpack-search" placeholder="搜索植物..." autocomplete="off">
                    </div>
                    <div class="backpack-sort-bar">
                        <button class="backpack-sort-btn active" data-sort="price">价格 <span class="sort-arrow">▲</span></button>
                        <button class="backpack-sort-btn" data-sort="maturity">成熟度 <span class="sort-arrow">▲</span></button>
                    </div>
                </div>
                <div class="backpack-content" id="backpack-content">
                    ${this._renderBackpackPlants(plants, 'price', 'asc')}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        // Close
        const closeOverlay = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 200);
        };
        document.getElementById('backpack-close')?.addEventListener('click', closeOverlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });

        // Search input
        const searchInput = document.getElementById('backpack-search');
        searchInput?.addEventListener('input', () => {
            this._backpackSearch = searchInput.value.trim();
            const content = document.getElementById('backpack-content');
            if (content) {
                const filtered = this._getFilteredPlants();
                content.innerHTML = this._renderBackpackPlants(
                    filtered, this._backpackSort.by, this._backpackSort.order
                );
            }
        });

        // Sort buttons
        overlay.querySelectorAll('.backpack-sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sortBy = btn.dataset.sort;
                if (this._backpackSort.by === sortBy) {
                    this._backpackSort.order = this._backpackSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    this._backpackSort.by = sortBy;
                    this._backpackSort.order = 'asc';
                }
                overlay.querySelectorAll('.backpack-sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                overlay.querySelectorAll('.backpack-sort-btn').forEach(b => {
                    const arrow = b.querySelector('.sort-arrow');
                    if (b === btn) {
                        arrow.textContent = this._backpackSort.order === 'asc' ? '▲' : '▼';
                    } else {
                        arrow.textContent = '▲';
                    }
                });
                const content = document.getElementById('backpack-content');
                if (content) {
                    const filtered = this._getFilteredPlants();
                    content.innerHTML = this._renderBackpackPlants(
                        filtered, this._backpackSort.by, this._backpackSort.order
                    );
                }
            });
        });

        // Go-to-shop button in empty state
        overlay.addEventListener('click', e => {
            if (e.target.closest('.backpack-goto-shop')) {
                closeOverlay();
                App.switchView('shop');
            }
        });
    },

    _renderBackpackPlants(plants, sortBy, sortOrder) {
        if (!plants.length) {
            const isSearch = this._backpackSearch;
            if (isSearch) {
                return `<div class="backpack-empty">
                    <div class="backpack-empty-icon">\u{1F50D}</div>
                    <div class="backpack-empty-text">没有找到 "${this._backpackSearch}" 相关的植物</div>
                </div>`;
            }
            return `<div class="backpack-empty">
                <div class="backpack-empty-icon">\u{1F33F}</div>
                <div class="backpack-empty-text">背包空空如也~</div>
                <div class="backpack-empty-sub">去商城购买植物，种在花园里吧！</div>
                <button class="backpack-goto-shop">\u{1F6D2} 前往商城</button>
            </div>`;
        }

        const sorted = [...plants].sort((a, b) => {
            let va, vb;
            if (sortBy === 'price') {
                va = a.price; vb = b.price;
            } else {
                va = a.growth_minutes; vb = b.growth_minutes;
            }
            return sortOrder === 'asc' ? va - vb : vb - va;
        });

        return '<div class="backpack-grid">' + sorted.map((plant, idx) => {
            const catItem = this.catalog.find(c => c.type === plant.tree_type);
            const gm = plant.growth_minutes || 0;
            const stage = this.getGrowthStage(gm);
            const stageLabel = this.getGrowthLabel(gm);
            const pct = Math.min(100, Math.round(gm / 150 * 100));
            const imgSrc = catItem?.stages?.[stage] || '/img/trees/seed.svg';
            const name = catItem?.name || plant.tree_type;
            const icon = catItem?.icon || '\u{1F331}';
            const rarity = this._getPlantRarity(plant.price);
            const plantedDate = this._formatPlantedDate(plant.planted_at);
            const delay = Math.min(idx * 40, 400); // stagger up to 400ms

            return `<div class="backpack-plant-card ${rarity.cls}" style="animation-delay:${delay}ms">
                <div class="backpack-plant-img-wrap">
                    <img src="${imgSrc}" alt="${name}" class="backpack-plant-img">
                    <span class="backpack-rarity-badge ${rarity.cls}">${rarity.tier}</span>
                </div>
                <div class="backpack-plant-info">
                    <div class="backpack-plant-name">${icon} ${name}</div>
                    <div class="backpack-plant-meta">
                        <span class="backpack-plant-price">${Utils.coinSvg('cat-coin-icon','width:14px;height:14px')} ${plant.price}</span>
                        <span class="backpack-plant-stage stage-${stage}">${stageLabel}</span>
                    </div>
                    <div class="backpack-plant-bar"><div class="backpack-plant-bar-fill stage-bar-${stage}" style="width:${pct}%"></div></div>
                    <div class="backpack-plant-bottom">
                        <span class="backpack-plant-location">\u{1F3DD}\uFE0F ${plant.island_name}</span>
                        ${plantedDate ? `<span class="backpack-plant-date">\u{1F4C5} ${plantedDate}</span>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('') + '</div>';
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

    async earnFromCheckin(assignee, type) {
        const amount = 5;
        try {
            const result = await API.earnCoins({
                assignee,
                amount,
                reason: 'checkin',
                detail: type,
            });
            App.syncCoins({ assignee, balance: result.balance, delta: amount, animate: true });
            App.showToast(`+${amount} 喵喵币！`, 'success');
        } catch (e) {
            App.showToast('打卡奖励获取失败', 'error');
        }
    },
};
