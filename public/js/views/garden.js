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

    /* Update only the dynamic parts of the garden view (plots, HUD, stats bar) */
    _updateDynamicContent() {
        // Must match the PP in render()
        const PP = [
            [15, 10], [35, 8],  [55, 12], [75, 10],
            [10, 35], [30, 32], [50, 35], [70, 33], [88, 36],
            [15, 58], [35, 55], [55, 58], [75, 56],
        ];

        // Update plots
        const land = document.getElementById('island-land');
        if (land) {
            land.querySelectorAll('.iplot').forEach(p => p.remove());
            const plotsHtml = this.plots.map((plot, i) => {
                const p = PP[i] || [50, 50];
                return this.renderIslandPlot(plot, p[0], p[1]);
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
       GARDEN VIEW (6×4 Island Grid)
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

        this.selectedTree = null;
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

        // Farmland plot positions (% of island-land)
        const PP = [
            [15, 10], [35, 8],  [55, 12], [75, 10],
            [10, 35], [30, 32], [50, 35], [70, 33], [88, 36],
            [15, 58], [35, 55], [55, 58], [75, 56],
        ];

        el.innerHTML = `
            <!-- HUD -->
            <div class="island-hud">
                <div class="island-hud-left">
                    <div class="garden-balance">
                    ${Utils.coinSvg()}
                    <strong>${Utils.formatCoinBalance(this.balance)}</strong> 喵喵币
                </div>
                </div>
                <div class="island-hud-center">
                    <span style="color:#fff;font-size:12px;font-weight:700;opacity:0.7">\u{1F3DD}\uFE0F ${islandName}</span>
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
                    <button class="hud-btn" id="world-map-btn" title="世界地图" style="font-size:14px">\u{1F5FA}\uFE0F ${discoveredCount}/${totalCount}</button>
                    <button class="hud-btn" id="garden-history-btn" title="记录">\u{1F4CA}</button>
                </div>
            </div>

            <!-- Isometric Island Viewport -->
            <div class="island-viewport" id="island-viewport">
                <div class="island-world" id="island-world">

                    <!-- Ocean effects -->
                    <div class="ocean-shimmer"></div>

                    <!-- ═══ Island SVG Terrain ═══ -->
                    <svg class="island-shape" viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <filter id="ishadow"><feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="rgba(0,0,0,0.4)"/></filter>
                            <!-- Ocean shallow -->
                            <radialGradient id="shallowG" cx="50%" cy="50%"><stop offset="0%" stop-color="#40C8C8" stop-opacity="0.3"/><stop offset="100%" stop-color="#0B8C8A" stop-opacity="0"/></radialGradient>
                            <!-- Sand -->
                            <radialGradient id="sandG" cx="50%" cy="55%"><stop offset="0%" stop-color="#F5E6B8"/><stop offset="60%" stop-color="#E8D48A"/><stop offset="100%" stop-color="#C4AE68"/></radialGradient>
                            <!-- Grass -->
                            <radialGradient id="grassG" cx="45%" cy="40%"><stop offset="0%" stop-color="#6BC84A"/><stop offset="40%" stop-color="#5AB838"/><stop offset="80%" stop-color="#4A9A2E"/><stop offset="100%" stop-color="#3A7A22"/></radialGradient>
                            <!-- Forest (dark) -->
                            <linearGradient id="forestG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1A4420"/><stop offset="40%" stop-color="#2A5A2C"/><stop offset="100%" stop-color="#3A7530"/></linearGradient>
                            <!-- Cliff rock -->
                            <linearGradient id="cliffG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8B7355"/><stop offset="30%" stop-color="#7A6548"/><stop offset="60%" stop-color="#6B583C"/><stop offset="100%" stop-color="#5A4A30"/></linearGradient>
                            <!-- Cliff highlight -->
                            <linearGradient id="cliffHL" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,255,255,0.15)"/><stop offset="100%" stop-color="rgba(0,0,0,0.1)"/></linearGradient>
                        </defs>

                        <!-- Shallow water ring -->
                        <ellipse cx="500" cy="430" rx="480" ry="360" fill="url(#shallowG)"/>

                        <!-- Beach/sand layer -->
                        <path d="M100,320 C150,180 300,100 500,90 700,100 850,180 900,320 930,440 900,560 820,640 720,720 600,760 500,760 400,760 280,720 180,640 100,560 70,440 100,320Z"
                              fill="url(#sandG)" filter="url(#ishadow)"/>

                        <!-- Grass island -->
                        <path d="M140,310 C180,200 320,130 500,120 680,130 820,200 860,310 880,410 860,510 800,590 720,660 620,700 500,700 380,700 280,660 200,590 140,510 120,410 140,310Z"
                              fill="url(#grassG)"/>

                        <!-- ═══ Rocky Cliffs (back/top) — like Boom Beach mountains ═══ -->
                        <!-- Main cliff mass -->
                        <path d="M200,220 C220,140 340,80 420,70 480,65 520,62 560,68 640,78 750,130 780,200 790,240 770,270 740,285 680,300 600,310 500,315 400,312 300,295 240,275 210,255 200,220Z"
                              fill="url(#cliffG)"/>
                        <!-- Cliff face shadow (3D depth) -->
                        <path d="M210,250 C220,215 280,200 340,195 400,192 500,190 600,195 680,200 740,215 770,245 760,270 740,285 680,300 600,310 500,315 400,312 300,295 240,275 215,260 210,250Z"
                              fill="rgba(0,0,0,0.15)"/>
                        <!-- Cliff highlight (sunlit side) -->
                        <path d="M250,195 C280,145 380,100 460,90 520,85 560,88 600,95 660,108 720,140 740,180 730,200 700,210 660,215 580,220 500,222 420,218 350,210 290,200 260,195 250,195Z"
                              fill="url(#cliffHL)"/>
                        <!-- Small peak left -->
                        <path d="M230,200 L260,120 L290,190Z" fill="#7A6548"/>
                        <path d="M230,200 L260,120 L260,200Z" fill="rgba(255,255,255,0.08)"/>
                        <!-- Tall peak center -->
                        <path d="M460,95 L490,30 L530,90Z" fill="#6B583C"/>
                        <path d="M460,95 L490,30 L490,95Z" fill="rgba(255,255,255,0.1)"/>
                        <!-- Peak right -->
                        <path d="M700,160 L730,90 L760,155Z" fill="#7A6548"/>

                        <!-- ═══ Dense Forest (behind buildings) ═══ -->
                        <!-- Forest canopy mass -->
                        <path d="M180,300 C200,260 300,240 400,235 500,232 600,238 700,250 770,265 810,290 820,320 810,345 780,360 740,370 660,380 580,385 500,386 420,384 340,378 260,365 210,345 190,325 180,300Z"
                              fill="url(#forestG)"/>
                        <!-- Canopy texture (individual tree crowns) -->
                        <circle cx="220" cy="305" r="22" fill="#2A5528" opacity="0.8"/>
                        <circle cx="260" cy="290" r="26" fill="#1E4420" opacity="0.85"/>
                        <circle cx="300" cy="280" r="24" fill="#2A5528" opacity="0.8"/>
                        <circle cx="340" cy="272" r="28" fill="#225020" opacity="0.9"/>
                        <circle cx="380" cy="268" r="22" fill="#2A5528" opacity="0.8"/>
                        <circle cx="420" cy="262" r="26" fill="#1E4420" opacity="0.85"/>
                        <circle cx="460" cy="258" r="30" fill="#225020" opacity="0.9"/>
                        <circle cx="500" cy="260" r="24" fill="#2A5528" opacity="0.8"/>
                        <circle cx="540" cy="264" r="28" fill="#1E4420" opacity="0.85"/>
                        <circle cx="580" cy="270" r="22" fill="#2A5528" opacity="0.8"/>
                        <circle cx="620" cy="278" r="26" fill="#225020" opacity="0.9"/>
                        <circle cx="660" cy="288" r="24" fill="#2A5528" opacity="0.8"/>
                        <circle cx="700" cy="300" r="22" fill="#1E4420" opacity="0.85"/>
                        <circle cx="740" cy="315" r="20" fill="#225020" opacity="0.8"/>
                        <!-- Second row (deeper) -->
                        <circle cx="280" cy="260" r="20" fill="#1A3A1A" opacity="0.7"/>
                        <circle cx="360" cy="248" r="24" fill="#163516" opacity="0.75"/>
                        <circle cx="440" cy="242" r="22" fill="#1A3A1A" opacity="0.7"/>
                        <circle cx="520" cy="240" r="26" fill="#163516" opacity="0.75"/>
                        <circle cx="600" cy="248" r="20" fill="#1A3A1A" opacity="0.7"/>
                        <circle cx="680" cy="262" r="22" fill="#163516" opacity="0.75"/>
                        <!-- Forest edge highlight -->
                        <path d="M200,295 C220,275 320,255 420,250 520,248 620,255 720,275 760,285 780,300 785,310"
                              fill="none" stroke="rgba(120,200,80,0.2)" stroke-width="3"/>

                        <!-- Beach detail dots -->
                        <g opacity="0.25">
                            <circle cx="150" cy="600" r="2.5" fill="#A08850"/>
                            <circle cx="300" cy="700" r="2" fill="#B09850"/>
                            <circle cx="700" cy="700" r="2.5" fill="#A08850"/>
                            <circle cx="850" cy="550" r="2" fill="#B09850"/>
                            <circle cx="130" cy="450" r="1.5" fill="#C4AE68"/>
                            <circle cx="870" cy="420" r="1.5" fill="#A08850"/>
                        </g>

                        <!-- Dock/Harbor (right side) -->
                        <rect x="840" y="440" width="100" height="16" rx="2" fill="#8B7355" transform="rotate(-15 840 440)"/>
                        <rect x="850" y="420" width="8" height="30" rx="2" fill="#6B5535"/>
                        <rect x="920" y="415" width="8" height="30" rx="2" fill="#6B5535"/>
                        <rect x="865" y="410" width="50" height="6" rx="1" fill="#7A6548"/>
                    </svg>

                    <!-- ═══ Island Land (interactive layer) ═══ -->
                    <div class="island-land" id="island-land">

                        <!-- ═══ House (center of island) ═══ -->
                        <div class="boom-house" style="left:42%;top:18%">
                            <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
                                <rect x="145" y="18" width="16" height="40" rx="2" fill="#8B6914"/>
                                <rect x="143" y="14" width="20" height="8" rx="2" fill="#A07018"/>
                                <circle cx="153" cy="10" r="4" fill="rgba(200,200,200,0.5)"><animate attributeName="cy" values="10;-5;-20" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.3;0" dur="3s" repeatCount="indefinite"/></circle>
                                <circle cx="158" cy="6" r="3" fill="rgba(200,200,200,0.4)"><animate attributeName="cy" values="6;-8;-22" dur="3.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.2;0" dur="3.5s" repeatCount="indefinite"/></circle>
                                <polygon points="10,68 100,18 190,68" fill="#B83B2C"/>
                                <polygon points="10,68 100,18 100,68" fill="#C94435" opacity="0.6"/>
                                <polygon points="100,18 190,68 100,68" fill="#9E2E20" opacity="0.5"/>
                                <line x1="10" y1="68" x2="190" y2="68" stroke="#7A2018" stroke-width="3"/>
                                <rect x="20" y="68" width="160" height="90" rx="3" fill="#F5E0B0"/>
                                <rect x="20" y="68" width="80" height="90" fill="#FAECC8" opacity="0.4"/>
                                <line x1="20" y1="90" x2="180" y2="90" stroke="#D4C090" stroke-width="0.5" opacity="0.3"/>
                                <line x1="20" y1="112" x2="180" y2="112" stroke="#D4C090" stroke-width="0.5" opacity="0.3"/>
                                <rect x="35" y="82" width="28" height="28" rx="3" fill="#87CEEB" stroke="#8B6914" stroke-width="2"/>
                                <line x1="49" y1="82" x2="49" y2="110" stroke="#8B6914" stroke-width="1.5"/>
                                <line x1="35" y1="96" x2="63" y2="96" stroke="#8B6914" stroke-width="1.5"/>
                                <rect x="137" y="82" width="28" height="28" rx="3" fill="#87CEEB" stroke="#8B6914" stroke-width="2"/>
                                <line x1="151" y1="82" x2="151" y2="110" stroke="#8B6914" stroke-width="1.5"/>
                                <line x1="137" y1="96" x2="165" y2="96" stroke="#8B6914" stroke-width="1.5"/>
                                <rect x="80" y="108" width="40" height="50" rx="4" fill="#6B4410"/>
                                <rect x="82" y="110" width="36" height="46" rx="3" fill="#8B5E14"/>
                                <path d="M80,108 Q100,95 120,108" fill="#5A3A0C" opacity="0.4"/>
                                <circle cx="112" cy="134" r="3" fill="#DAA520"/><circle cx="112" cy="134" r="1.5" fill="#FFD700"/>
                                <rect x="15" y="155" width="170" height="12" rx="2" fill="#8B7355"/>
                                <rect x="35" y="111" width="28" height="5" rx="1" fill="#6B4410"/>
                                <circle cx="40" cy="110" r="3" fill="#FF6B8A"/><circle cx="49" cy="109" r="2.5" fill="#FFD700"/><circle cx="58" cy="110" r="3" fill="#FF8FAA"/>
                                <rect x="137" y="111" width="28" height="5" rx="1" fill="#6B4410"/>
                                <circle cx="142" cy="110" r="3" fill="#FFD700"/><circle cx="151" cy="109" r="2.5" fill="#FF6B8A"/><circle cx="160" cy="110" r="3" fill="#FFD700"/>
                            </svg>
                            <div class="hut-label">\u{1F3E0} 小屋</div>
                        </div>

                        <!-- ═══ Harbor (right side) ═══ -->
                        <div class="boom-harbor" id="harbor-building" style="left:82%;top:52%" title="港口 — 点击管理">
                            <span class="harbor-icon">\u26F5</span>
                            <div class="hut-label">\u2693 港口</div>
                        </div>

                        <!-- ═══ Forest trees (clickable, along the back) ═══ -->
                        <div class="forest-tree-btn" style="left:12%;top:-6%" data-cost="15" title="\u{1FA93} 砍伐 15 喵喵币"><img src="/img/trees/palm.svg" style="width:42px"></div>
                        <div class="forest-tree-btn" style="left:28%;top:-10%" data-cost="20" title="\u{1FA93} 砍伐 20 喵喵币"><img src="/img/trees/oak.svg" style="width:46px"></div>
                        <div class="forest-tree-btn" style="left:48%;top:-12%" data-cost="25" title="\u{1FA93} 砍伐 25 喵喵币"><img src="/img/trees/pine.svg" style="width:50px"></div>
                        <div class="forest-tree-btn" style="left:65%;top:-10%" data-cost="20" title="\u{1FA93} 砍伐 20 喵喵币"><img src="/img/trees/oak.svg" style="width:44px"></div>
                        <div class="forest-tree-btn" style="left:82%;top:-5%" data-cost="15" title="\u{1FA93} 砍伐 15 喵喵币"><img src="/img/trees/pine.svg" style="width:40px"></div>

                        <!-- ═══ Beach palms (decorative) ═══ -->
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:-5%;top:75%;width:55px;opacity:0.85">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:90%;top:70%;width:50px;opacity:0.8">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:30%;top:85%;width:45px;opacity:0.75">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:65%;top:88%;width:48px;opacity:0.7">

                        <!-- Ambient -->
                        <div class="ambient-particle p1" style="font-size:11px">\u{1F54A}\uFE0F</div>
                        <div class="ambient-particle p3" style="font-size:10px">\u{1F54A}\uFE0F</div>
                        <div class="ambient-particle p2">\u{1F343}</div>
                        <div class="ambient-particle p4">\u{1F98B}</div>

                        <!-- ═══ Interactive Farmland Plots ═══ -->
                        ${this.plots.map((plot, i) => {
            const p = PP[i] || [50, 50];
            return this.renderIslandPlot(plot, p[0], p[1]);
        }).join('')}
                    </div>

                    ${activeExp ? '<div class="expedition-float">' + (this.assignee === '潘潘' ? '\u{1F431}' : '\u{1F430}') + ' 探索中... \u26F5</div>' : ''}
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

    renderIslandPlot(plot, x, y) {
        if (plot.status === 'wasteland') {
            const obs = this.obstacleMap[plot.obstacle_type] || this.obstacleMap.rock;
            return `<div class="iplot wasteland" data-plot-id="${plot.id}" style="left:${x}%;top:${y}%" title="${obs.name} · 开荒 ${obs.cost} 喵喵币">
                <img src="${obs.img}" alt="${obs.name}" class="iplot-img"><span class="iplot-cost">⛏️${obs.cost}</span></div>`;
        }
        if (plot.status === 'cleared') {
            const sel = this.selectedTree;
            return `<div class="iplot cleared ${sel ? 'plantable' : ''}" data-plot-id="${plot.id}" style="left:${x}%;top:${y}%" title="空地">
                <div class="iplot-empty">${sel ? '🌱' : ''}</div></div>`;
        }
        const catItem = this.catalog.find(c => c.type === plot.tree_type);
        const gm = plot.growth_minutes || 0;
        const stage = this.getGrowthStage(gm);
        const pct = Math.min(100, Math.round(gm / 150 * 100));
        let imgSrc = catItem?.stages?.[stage] || '/img/trees/seed.svg';
        return `<div class="iplot planted stage-${stage}" data-plot-id="${plot.id}" style="left:${x}%;top:${y}%" title="${catItem?.name || plot.tree_type} · ${this.getGrowthLabel(gm)}">
            <img src="${imgSrc}" alt="" class="iplot-img"><div class="iplot-bar"><div class="iplot-bar-fill" style="width:${pct}%"></div></div></div>`;
    },

    _zoom: 1,
    _minZoom: 0.4,
    _maxZoom: 2.5,

    initDrag() {
        const vp = document.getElementById('island-viewport');
        const world = document.getElementById('island-world');
        if (!vp || !world) return;
        let drag = false, sx, sy, sl, st;

        // Apply 3D isometric perspective
        this._applyTransform(world);

        // Center island
        requestAnimationFrame(() => {
            vp.scrollLeft = (world.offsetWidth - vp.offsetWidth) / 2;
            vp.scrollTop = (world.offsetHeight - vp.offsetHeight) / 2.5;
        });

        // ─── Mouse drag ───
        vp.addEventListener('mousedown', e => {
            if (e.target.closest('.iplot,.island-hut,.zoom-controls')) return;
            drag = true; sx = e.pageX; sy = e.pageY; sl = vp.scrollLeft; st = vp.scrollTop;
            vp.style.cursor = 'grabbing';
        });

        // Only bind document-level listeners once to prevent leak
        if (!this._dragInitialized) {
            this._dragInitialized = true;
            document.addEventListener('mousemove', e => {
                if (!drag) return; e.preventDefault();
                const vpEl = document.getElementById('island-viewport');
                if (!vpEl) return;
                vpEl.scrollLeft = sl - (e.pageX - sx);
                vpEl.scrollTop = st - (e.pageY - sy);
            });
            document.addEventListener('mouseup', () => {
                drag = false;
                const vpEl = document.getElementById('island-viewport');
                if (vpEl) vpEl.style.cursor = 'grab';
            });
        }

        // ─── Scroll-wheel zoom ───
        vp.addEventListener('wheel', e => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, this._zoom + delta));
            this._applyTransform(world);
            this._updateZoomDisplay();
        }, { passive: false });

        // ─── Touch: drag + pinch-to-zoom ───
        let lastPinchDist = 0;
        let pinching = false;

        vp.addEventListener('touchstart', e => {
            if (e.touches.length === 2) {
                // Pinch start
                pinching = true;
                drag = false;
                lastPinchDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            } else if (e.touches.length === 1 && !pinching) {
                if (e.target.closest('.iplot,.island-hut,.zoom-controls')) return;
                drag = true;
                sx = e.touches[0].pageX; sy = e.touches[0].pageY;
                sl = vp.scrollLeft; st = vp.scrollTop;
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
            } else if (drag && e.touches.length === 1) {
                vp.scrollLeft = sl - (e.touches[0].pageX - sx);
                vp.scrollTop = st - (e.touches[0].pageY - sy);
            }
        }, { passive: true });

        vp.addEventListener('touchend', e => {
            if (e.touches.length < 2) pinching = false;
            if (e.touches.length === 0) drag = false;
        });

        // ─── Zoom button events ───
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
            this._zoom = Math.min(this._maxZoom, this._zoom + 0.15);
            this._applyTransform(world);
            this._updateZoomDisplay();
        });
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
            this._zoom = Math.max(this._minZoom, this._zoom - 0.15);
            this._applyTransform(world);
            this._updateZoomDisplay();
        });
        document.getElementById('zoom-reset-btn')?.addEventListener('click', () => {
            this._zoom = 1;
            this._applyTransform(world);
            this._updateZoomDisplay();
            // Re-center
            requestAnimationFrame(() => {
                vp.scrollLeft = (world.offsetWidth - vp.offsetWidth) / 2;
                vp.scrollTop = (world.offsetHeight - vp.offsetHeight) / 2.5;
            });
        });
    },

    _applyTransform(world) {
        if (!world) world = document.getElementById('island-world');
        if (!world) return;
        world.style.transform = `scale(${this._zoom}) perspective(1200px) rotateX(15deg)`;
        world.style.transformOrigin = 'center center';
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

        // History button
        document.getElementById('garden-history-btn')?.addEventListener('click', () => {
            this.showHistory();
        });

        // World map button
        document.getElementById('world-map-btn')?.addEventListener('click', () => {
            this.showWorldMap();
        });

        // Harbor building click
        document.getElementById('harbor-building')?.addEventListener('click', () => {
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
        const stage = this.getGrowthStage(gm);
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

        // Position near the plot
        const rect = plotEl.getBoundingClientRect();
        const vpRect = document.getElementById('island-viewport')?.getBoundingClientRect() || { left: 0, top: 0 };
        menu.style.left = `${rect.left - vpRect.left + rect.width / 2}px`;
        menu.style.top = `${rect.top - vpRect.top - 10}px`;

        document.getElementById('island-viewport')?.appendChild(menu);

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
            Utils.toast(`💰 收获 ${data.reward} 喵喵币！`, 'success');
            this.balance = data.balance;
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
            Utils.toast(`⏩ 加速成功！花费 ${data.cost} 喵喵币`, 'success');
            this.balance = data.balance;
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
            this.balance = r.balance;
            this.updateHeaderCoins();
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
            this.balance = result.balance;
            this.updateHeaderCoins();
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
            this.balance = result.balance;
            this.selectedTree = null;
            this.updateHeaderCoins();
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

        // Clicking card opens detail modal
        document.querySelectorAll('#view-shop .shop-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showTreeDetail(card.dataset.type);
            });
        });
    },

    updateHeaderCoins() {
        const el = document.getElementById('header-coins');
        if (!el) return;
        const { balance } = this._getHeaderCoinContext();
        if (balance == null) {
            App._refreshHeaderCoins();
            return;
        }
        el.textContent = Utils.formatCoinBalance(balance);
    },

    async earnFromPomodoro(assignee, focusMinutes) {
        let amount = 1;
        if (focusMinutes >= 60) amount = 6;
        else if (focusMinutes >= 45) amount = 4;
        else if (focusMinutes >= 25) amount = 2;
        try {
            const result = await API.earnCoins({
                assignee,
                amount,
                reason: 'pomodoro',
                detail: `${focusMinutes}分钟专注`,
            });
            if (assignee === this.assignee) this.balance = result.balance;
            if (assignee === this.shopAssignee) this.shopBalance = result.balance;
            this.updateHeaderCoins();

            try {
                const growResult = await API.growTree({ assignee, minutes: focusMinutes });
                if (growResult.tree) {
                    const catItem = this.catalog.find(c => c.type === growResult.tree.tree_type);
                    const name = catItem ? catItem.name : '植物';
                    const label = this.getGrowthLabel(growResult.tree.growth_minutes);
                    let msg = `+${amount} 喵喵币 · ${name} 成长了！(${label})`;
                    if (growResult.coinDrop > 0) {
                        msg += ` · 🍃 掉落 +${growResult.coinDrop} 币！`;
                        this.updateHeaderCoins();
                    }
                    App.showToast(msg, 'success');
                } else {
                    App.showToast(`+${amount} 喵喵币！`, 'success');
                }
            } catch (e) {
                App.showToast(`+${amount} 喵喵币！`, 'success');
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
            if (assignee === this.assignee) this.balance = result.balance;
            if (assignee === this.shopAssignee) this.shopBalance = result.balance;
            this.updateHeaderCoins();
            App.showToast(`+${amount} 喵喵币！`, 'success');
        } catch (e) {
            App.showToast('打卡奖励获取失败', 'error');
        }
    },
};
