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
        // Must match the PP in render() — % coords map to SVG viewBox
        const PP = [
            [22, 53], [38, 51], [54, 53], [70, 55],
            [18, 60], [34, 58], [50, 60], [66, 59], [80, 61],
            [26, 67], [42, 65], [58, 67], [74, 66],
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

        // Farmland positions — on grass below house, y=52-68% of island-land
        const PP = [
            [22, 53], [38, 51], [54, 53], [70, 55],
            [18, 60], [34, 58], [50, 60], [66, 59], [80, 61],
            [26, 67], [42, 65], [58, 67], [74, 66],
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
                    <button class="hud-btn" id="garden-backpack-btn" title="背包" style="font-size:14px">\u{1F392}</button>
                    <button class="hud-btn" id="world-map-btn" title="世界地图" style="font-size:14px">\u{1F5FA}\uFE0F ${discoveredCount}/${totalCount}</button>
                    <button class="hud-btn" id="garden-history-btn" title="记录">\u{1F4CA}</button>
                </div>
            </div>

            <!-- Isometric Island Viewport -->
            <div class="island-viewport" id="island-viewport">
                <div class="island-world" id="island-world">

                    <!-- ═══ TALL ISLAND SVG (viewBox 1000x2000) ═══ -->
                    <svg class="island-shape" viewBox="0 0 1000 2000" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <filter id="ishadow"><feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="rgba(0,0,0,0.4)"/></filter>
                            <radialGradient id="sandG" cx="50%" cy="55%"><stop offset="0%" stop-color="#F5E6B8"/><stop offset="60%" stop-color="#E8D48A"/><stop offset="100%" stop-color="#C4AE68"/></radialGradient>
                            <radialGradient id="grassG" cx="45%" cy="40%"><stop offset="0%" stop-color="#6BC84A"/><stop offset="40%" stop-color="#5AB838"/><stop offset="80%" stop-color="#4A9A2E"/><stop offset="100%" stop-color="#3A7A22"/></radialGradient>
                            <linearGradient id="forestG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1A4420"/><stop offset="40%" stop-color="#2A5A2C"/><stop offset="100%" stop-color="#3A7530"/></linearGradient>
                            <linearGradient id="cliffG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7A6548"/><stop offset="50%" stop-color="#6B583C"/><stop offset="100%" stop-color="#5A4A30"/></linearGradient>
                            <linearGradient id="fogG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(180,195,215,0)" /><stop offset="30%" stop-color="rgba(180,195,215,0.4)"/><stop offset="100%" stop-color="rgba(180,195,215,0.95)"/></linearGradient>
                        </defs>

                        <!-- ═══ ZONE 1: Rocky Mountains (y=0-350) ═══ -->
                        <rect x="0" y="0" width="1000" height="350" fill="#4A5568"/>
                        <!-- Mountain peaks -->
                        <polygon points="0,350 100,120 200,350" fill="#6B583C"/>
                        <polygon points="0,350 100,120 100,350" fill="#7A6F5A" opacity="0.5"/>
                        <polygon points="120,350 250,50 380,350" fill="#5A4A30"/>
                        <polygon points="120,350 250,50 250,350" fill="#7A6F5A" opacity="0.4"/>
                        <polygon points="300,350 420,80 540,350" fill="#6B583C"/>
                        <polygon points="300,350 420,80 420,350" fill="#8A7F6A" opacity="0.4"/>
                        <polygon points="460,350 580,30 700,350" fill="#5A4A30"/>
                        <polygon points="460,350 580,30 580,350" fill="#7A6F5A" opacity="0.5"/>
                        <polygon points="620,350 740,100 860,350" fill="#6B583C"/>
                        <polygon points="620,350 740,100 740,350" fill="#8A7F6A" opacity="0.3"/>
                        <polygon points="800,350 900,150 1000,350" fill="#5A4A30"/>
                        <polygon points="800,350 900,150 900,350" fill="#7A6F5A" opacity="0.4"/>
                        <!-- Snow caps -->
                        <polygon points="230,80 250,50 270,80" fill="rgba(255,255,255,0.6)"/>
                        <polygon points="560,55 580,30 600,55" fill="rgba(255,255,255,0.7)"/>
                        <polygon points="720,125 740,100 760,125" fill="rgba(255,255,255,0.5)"/>
                        <!-- Mountain mist -->
                        <rect x="0" y="280" width="1000" height="70" fill="url(#fogG)" opacity="0.4" transform="rotate(180 500 315)"/>

                        <!-- ═══ ZONE 2: Dense Forest (y=350-800) ═══ -->
                        <rect x="50" y="350" width="900" height="450" rx="30" fill="url(#forestG)"/>
                        <!-- Tree canopy mass — 6 dense layers for impenetrable forest -->
                        <!-- Layer 1: Deepest canopy (darkest) -->
                        <g opacity="0.95">
                            <circle cx="80" cy="370" r="38" fill="#0F2F12"/><circle cx="150" cy="365" r="42" fill="#122E15"/>
                            <circle cx="225" cy="360" r="40" fill="#0F2F12"/><circle cx="300" cy="358" r="44" fill="#152E18"/>
                            <circle cx="380" cy="355" r="46" fill="#0F2F12"/><circle cx="460" cy="352" r="48" fill="#122E15"/>
                            <circle cx="540" cy="355" r="44" fill="#152E18"/><circle cx="620" cy="358" r="46" fill="#0F2F12"/>
                            <circle cx="700" cy="362" r="42" fill="#122E15"/><circle cx="780" cy="368" r="40" fill="#152E18"/>
                            <circle cx="860" cy="374" r="38" fill="#0F2F12"/><circle cx="940" cy="380" r="35" fill="#122E15"/>
                        </g>
                        <!-- Layer 2 -->
                        <g opacity="0.92">
                            <circle cx="110" cy="410" r="36" fill="#1A3A1A"/><circle cx="185" cy="405" r="40" fill="#1E4420"/>
                            <circle cx="260" cy="400" r="38" fill="#1A3A1A"/><circle cx="340" cy="396" r="42" fill="#1E4420"/>
                            <circle cx="420" cy="393" r="44" fill="#1A3A1A"/><circle cx="500" cy="390" r="46" fill="#1E4420"/>
                            <circle cx="580" cy="393" r="42" fill="#225020"/><circle cx="660" cy="398" r="40" fill="#1A3A1A"/>
                            <circle cx="740" cy="403" r="44" fill="#1E4420"/><circle cx="820" cy="408" r="38" fill="#225020"/>
                            <circle cx="900" cy="415" r="36" fill="#1A3A1A"/>
                        </g>
                        <!-- Layer 3 — understory fill -->
                        <g opacity="0.88">
                            <circle cx="90" cy="450" r="34" fill="#1E4420"/><circle cx="165" cy="445" r="38" fill="#225020"/>
                            <circle cx="245" cy="440" r="36" fill="#1E4420"/><circle cx="325" cy="436" r="40" fill="#2A5528"/>
                            <circle cx="405" cy="433" r="42" fill="#225020"/><circle cx="485" cy="430" r="44" fill="#1E4420"/>
                            <circle cx="565" cy="433" r="40" fill="#2A5528"/><circle cx="645" cy="438" r="38" fill="#225020"/>
                            <circle cx="725" cy="442" r="42" fill="#1E4420"/><circle cx="805" cy="448" r="36" fill="#2A5528"/>
                            <circle cx="885" cy="454" r="34" fill="#225020"/>
                        </g>
                        <!-- Layer 4 -->
                        <g opacity="0.82">
                            <circle cx="120" cy="500" r="32" fill="#2A5528"/><circle cx="200" cy="492" r="36" fill="#2E6028"/>
                            <circle cx="280" cy="488" r="34" fill="#2A5528"/><circle cx="360" cy="484" r="38" fill="#306832"/>
                            <circle cx="440" cy="480" r="40" fill="#2A5528"/><circle cx="520" cy="478" r="42" fill="#2E6028"/>
                            <circle cx="600" cy="482" r="38" fill="#306832"/><circle cx="680" cy="486" r="36" fill="#2A5528"/>
                            <circle cx="760" cy="492" r="40" fill="#2E6028"/><circle cx="840" cy="498" r="34" fill="#306832"/>
                            <circle cx="920" cy="505" r="30" fill="#2A5528"/>
                        </g>
                        <!-- Layer 5 — transitional -->
                        <g opacity="0.78">
                            <circle cx="150" cy="560" r="30" fill="#3A7530"/><circle cx="240" cy="552" r="34" fill="#2E6028"/>
                            <circle cx="330" cy="546" r="32" fill="#3A7530"/><circle cx="420" cy="542" r="36" fill="#2E6028"/>
                            <circle cx="510" cy="540" r="38" fill="#3A7530"/><circle cx="600" cy="544" r="34" fill="#2E6028"/>
                            <circle cx="690" cy="548" r="32" fill="#3A7530"/><circle cx="780" cy="556" r="30" fill="#2E6028"/>
                            <circle cx="870" cy="562" r="28" fill="#3A7530"/>
                        </g>
                        <!-- Layer 6 — forest edge (lightest) -->
                        <g opacity="0.72">
                            <circle cx="180" cy="620" r="28" fill="#4A9A2E"/><circle cx="280" cy="612" r="32" fill="#3A7530"/>
                            <circle cx="380" cy="606" r="30" fill="#4A9A2E"/><circle cx="480" cy="602" r="34" fill="#459830"/>
                            <circle cx="580" cy="608" r="30" fill="#4A9A2E"/><circle cx="680" cy="614" r="32" fill="#3A7530"/>
                            <circle cx="780" cy="620" r="28" fill="#4A9A2E"/><circle cx="880" cy="628" r="26" fill="#3A7530"/>
                        </g>
                        <!-- Conifer silhouettes scattered in canopy -->
                        <g opacity="0.4" fill="#0A2210">
                            <polygon points="100,350 115,390 85,390"/><polygon points="300,345 318,395 282,395"/>
                            <polygon points="500,340 520,398 480,398"/><polygon points="700,348 717,392 683,392"/>
                            <polygon points="200,400 216,445 184,445"/><polygon points="600,395 618,448 582,448"/>
                            <polygon points="400,390 420,452 380,452"/><polygon points="850,405 864,445 836,445"/>
                        </g>
                        <!-- Forest edge (organic transition to grass) -->
                        <path d="M50,720 Q120,690 200,705 Q280,680 360,700 Q440,675 520,690 Q600,678 680,695 Q760,685 840,710 Q920,700 950,730 L950,800 L50,800Z" fill="#4A9A2E" opacity="0.5"/>
                        <path d="M50,740 Q180,710 300,725 Q420,700 540,715 Q660,705 780,720 Q900,712 950,745 L950,800 L50,800Z" fill="#5AB838" opacity="0.3"/>

                        <!-- ═══ ZONE 3: Grass Island (y=800-1350) ═══ -->
                        <rect x="30" y="800" width="940" height="550" rx="30" fill="url(#grassG)"/>
                        <!-- Subtle grass texture lines -->
                        <g opacity="0.08" stroke="#2A5528" stroke-width="1">
                            <line x1="80" y1="900" x2="920" y2="900"/>
                            <line x1="80" y1="1000" x2="920" y2="1000"/>
                            <line x1="80" y1="1100" x2="920" y2="1100"/>
                            <line x1="80" y1="1200" x2="920" y2="1200"/>
                        </g>
                        <!-- Path/road from house to harbor -->
                        <path d="M500,950 Q500,1200 500,1350" stroke="rgba(139,115,85,0.3)" stroke-width="20" fill="none" stroke-linecap="round"/>

                        <!-- ═══ ZONE 4: Beach + Harbor (y=1350-1600) ═══ -->
                        <rect x="20" y="1350" width="960" height="250" rx="20" fill="url(#sandG)"/>
                        <!-- Harbor dock -->
                        <rect x="420" y="1480" width="160" height="14" rx="3" fill="#8B7355"/>
                        <rect x="430" y="1494" width="12" height="40" rx="2" fill="#6B5535"/>
                        <rect x="558" y="1494" width="12" height="40" rx="2" fill="#6B5535"/>
                        <rect x="440" y="1530" width="120" height="8" rx="2" fill="#7A6548"/>
                        <!-- Beach details -->
                        <circle cx="100" cy="1420" r="3" fill="#C4AE68" opacity="0.3"/>
                        <circle cx="800" cy="1450" r="2.5" fill="#C4AE68" opacity="0.3"/>
                        <circle cx="300" cy="1500" r="2" fill="#C4AE68" opacity="0.25"/>

                        <!-- ═══ ZONE 5: Fog (y=1600-2000) ═══ -->
                        <rect x="0" y="1600" width="1000" height="400" fill="url(#fogG)"/>
                        <!-- Fog wisps -->
                        <ellipse cx="200" cy="1700" rx="150" ry="30" fill="rgba(180,195,215,0.3)"/>
                        <ellipse cx="600" cy="1750" rx="200" ry="40" fill="rgba(180,195,215,0.25)"/>
                        <ellipse cx="400" cy="1850" rx="250" ry="50" fill="rgba(180,195,215,0.4)"/>
                        <ellipse cx="800" cy="1900" rx="180" ry="35" fill="rgba(180,195,215,0.35)"/>
                    </svg>

                    <!-- ═══ Island Land (interactive layer) ═══ -->
                    <div class="island-land" id="island-land">

                        <!-- ═══ House (center of grass area y=43-48%) ═══ -->
                        <div class="boom-house" style="left:42%;top:44%">
                            <svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
                                <!-- Foundation -->
                                <rect x="20" y="190" width="200" height="16" rx="3" fill="#8B7355"/>
                                <!-- Walls — stone texture -->
                                <rect x="30" y="88" width="180" height="108" rx="4" fill="#E8D8B0"/>
                                <rect x="30" y="88" width="90" height="108" fill="#F0E0C0" opacity="0.3"/>
                                <!-- Stone brick lines -->
                                <g stroke="#C4B090" stroke-width="0.8" opacity="0.3">
                                    <line x1="30" y1="108" x2="210" y2="108"/>
                                    <line x1="30" y1="128" x2="210" y2="128"/>
                                    <line x1="30" y1="148" x2="210" y2="148"/>
                                    <line x1="30" y1="168" x2="210" y2="168"/>
                                    <line x1="120" y1="88" x2="120" y2="196"/>
                                </g>
                                <!-- Roof — layered red tiles -->
                                <polygon points="10,88 120,25 230,88" fill="#C0392B"/>
                                <polygon points="10,88 120,25 120,88" fill="#E74C3C" opacity="0.4"/>
                                <polygon points="120,25 230,88 120,88" fill="#962D22" opacity="0.3"/>
                                <line x1="10" y1="88" x2="230" y2="88" stroke="#7A2018" stroke-width="4"/>
                                <!-- Roof ridge line -->
                                <line x1="120" y1="25" x2="120" y2="88" stroke="#7A2018" stroke-width="1.5" opacity="0.3"/>
                                <!-- Chimney -->
                                <rect x="170" y="30" width="18" height="45" rx="2" fill="#8B6914"/>
                                <rect x="168" y="26" width="22" height="8" rx="2" fill="#A07018"/>
                                <!-- Smoke -->
                                <circle cx="179" cy="20" r="5" fill="rgba(200,200,200,0.5)"><animate attributeName="cy" values="20;5;-10" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.3;0" dur="3s" repeatCount="indefinite"/></circle>
                                <circle cx="184" cy="15" r="4" fill="rgba(200,200,200,0.4)"><animate attributeName="cy" values="15;0;-15" dur="3.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.2;0" dur="3.5s" repeatCount="indefinite"/></circle>
                                <!-- Left window -->
                                <rect x="48" y="105" width="32" height="32" rx="3" fill="#87CEEB" stroke="#8B6914" stroke-width="2.5"/>
                                <line x1="64" y1="105" x2="64" y2="137" stroke="#8B6914" stroke-width="2"/>
                                <line x1="48" y1="121" x2="80" y2="121" stroke="#8B6914" stroke-width="2"/>
                                <!-- Right window -->
                                <rect x="160" y="105" width="32" height="32" rx="3" fill="#87CEEB" stroke="#8B6914" stroke-width="2.5"/>
                                <line x1="176" y1="105" x2="176" y2="137" stroke="#8B6914" stroke-width="2"/>
                                <line x1="160" y1="121" x2="192" y2="121" stroke="#8B6914" stroke-width="2"/>
                                <!-- Door — arched -->
                                <rect x="95" y="140" width="50" height="56" rx="4" fill="#6B4410"/>
                                <rect x="98" y="143" width="44" height="50" rx="3" fill="#8B5E14"/>
                                <path d="M95,140 Q120,125 145,140" fill="#5A3A0C" opacity="0.4"/>
                                <!-- Door handle -->
                                <circle cx="133" cy="170" r="3.5" fill="#DAA520"/><circle cx="133" cy="170" r="2" fill="#FFD700"/>
                                <!-- Window boxes with flowers -->
                                <rect x="48" y="138" width="32" height="6" rx="1" fill="#6B4410"/>
                                <circle cx="54" cy="136" r="4" fill="#FF6B8A"/><circle cx="64" cy="135" r="3.5" fill="#FFD700"/><circle cx="74" cy="136" r="4" fill="#FF8FAA"/>
                                <rect x="160" y="138" width="32" height="6" rx="1" fill="#6B4410"/>
                                <circle cx="166" cy="136" r="4" fill="#FFD700"/><circle cx="176" cy="135" r="3.5" fill="#FF6B8A"/><circle cx="186" cy="136" r="4" fill="#FFD700"/>
                                <!-- Lantern by door -->
                                <rect x="86" y="145" width="6" height="12" rx="1" fill="#DAA520"/>
                                <circle cx="89" cy="142" r="4" fill="rgba(255,200,50,0.6)"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/></circle>
                            </svg>
                            <div class="hut-label">\u{1F3E0} 小屋</div>
                        </div>

                        <!-- ═══ Choppable Forest Trees (y=18-40%, 6 rows, 12 species, arrow→wide) ═══ -->
                        <!-- Row 1: Deepest (y≈18-20%, most expensive, narrowest) -->
                        <div class="forest-tree-btn" style="left:38%;top:18%" data-cost="100" title="\u{1FA93} 砍伐 100 喵喵币"><img src="/img/trees/pine.svg" style="width:58px"></div>
                        <div class="forest-tree-btn" style="left:50%;top:17%" data-cost="100" title="\u{1FA93} 砍伐 100 喵喵币"><img src="/img/trees/sakura.svg" style="width:56px"></div>
                        <div class="forest-tree-btn" style="left:62%;top:18%" data-cost="100" title="\u{1FA93} 砍伐 100 喵喵币"><img src="/img/trees/oak.svg" style="width:54px"></div>

                        <!-- Row 2 (y≈22-23%) -->
                        <div class="forest-tree-btn" style="left:28%;top:22%" data-cost="60" title="\u{1FA93} 砍伐 60 喵喵币"><img src="/img/trees/maple.svg" style="width:52px"></div>
                        <div class="forest-tree-btn" style="left:40%;top:21%" data-cost="60" title="\u{1FA93} 砍伐 60 喵喵币"><img src="/img/trees/bamboo.svg" style="width:50px"></div>
                        <div class="forest-tree-btn" style="left:52%;top:21%" data-cost="60" title="\u{1FA93} 砍伐 60 喵喵币"><img src="/img/trees/orange_tree.svg" style="width:48px"></div>
                        <div class="forest-tree-btn" style="left:64%;top:22%" data-cost="60" title="\u{1FA93} 砍伐 60 喵喵币"><img src="/img/trees/christmas.svg" style="width:50px"></div>
                        <div class="forest-tree-btn" style="left:76%;top:23%" data-cost="60" title="\u{1FA93} 砍伐 60 喵喵币"><img src="/img/trees/peach.svg" style="width:48px"></div>

                        <!-- Row 3 (y≈26-27%) -->
                        <div class="forest-tree-btn" style="left:18%;top:26%" data-cost="35" title="\u{1FA93} 砍伐 35 喵喵币"><img src="/img/trees/mushroom.svg" style="width:44px"></div>
                        <div class="forest-tree-btn" style="left:30%;top:25%" data-cost="35" title="\u{1FA93} 砍伐 35 喵喵币"><img src="/img/trees/oak.svg" style="width:48px"></div>
                        <div class="forest-tree-btn" style="left:42%;top:25%" data-cost="35" title="\u{1FA93} 砍伐 35 喵喵币"><img src="/img/trees/pine.svg" style="width:46px"></div>
                        <div class="forest-tree-btn" style="left:54%;top:25%" data-cost="35" title="\u{1FA93} 砍伐 35 喵喵币"><img src="/img/trees/sakura.svg" style="width:44px"></div>
                        <div class="forest-tree-btn" style="left:66%;top:26%" data-cost="35" title="\u{1FA93} 砍伐 35 喵喵币"><img src="/img/trees/bamboo.svg" style="width:46px"></div>
                        <div class="forest-tree-btn" style="left:78%;top:27%" data-cost="35" title="\u{1FA93} 砍伐 35 喵喵币"><img src="/img/trees/maple.svg" style="width:42px"></div>

                        <!-- Row 4 (y≈29-31%) -->
                        <div class="forest-tree-btn" style="left:10%;top:30%" data-cost="20" title="\u{1FA93} 砍伐 20 喵喵币"><img src="/img/trees/palm.svg" style="width:42px"></div>
                        <div class="forest-tree-btn" style="left:22%;top:29%" data-cost="20" title="\u{1FA93} 砍伐 20 喵喵币"><img src="/img/trees/peach.svg" style="width:40px"></div>
                        <div class="forest-tree-btn" style="left:34%;top:29%" data-cost="20" title="\u{1FA93} 砍伐 20 喵喵币"><img src="/img/trees/orange_tree.svg" style="width:42px"></div>
                        <div class="forest-tree-btn" style="left:46%;top:28%" data-cost="20" title="\u{1FA93} 砍伐 20 喵喵币"><img src="/img/trees/christmas.svg" style="width:44px"></div>
                        <div class="forest-tree-btn" style="left:58%;top:29%" data-cost="20" title="\u{1FA93} 砍伐 20 喵喵币"><img src="/img/trees/mushroom.svg" style="width:38px"></div>
                        <div class="forest-tree-btn" style="left:70%;top:30%" data-cost="20" title="\u{1FA93} 砍伐 20 喵喵币"><img src="/img/trees/pine.svg" style="width:42px"></div>
                        <div class="forest-tree-btn" style="left:82%;top:31%" data-cost="20" title="\u{1FA93} 砍伐 20 喵喵币"><img src="/img/trees/sakura.svg" style="width:40px"></div>

                        <!-- Row 5 (y≈33-35%) -->
                        <div class="forest-tree-btn" style="left:6%;top:34%" data-cost="10" title="\u{1FA93} 砍伐 10 喵喵币"><img src="/img/trees/obstacle_wild_tree.svg" style="width:38px"></div>
                        <div class="forest-tree-btn" style="left:16%;top:33%" data-cost="10" title="\u{1FA93} 砍伐 10 喵喵币"><img src="/img/trees/corn.svg" style="width:36px"></div>
                        <div class="forest-tree-btn" style="left:27%;top:33%" data-cost="10" title="\u{1FA93} 砍伐 10 喵喵币"><img src="/img/trees/oak.svg" style="width:38px"></div>
                        <div class="forest-tree-btn" style="left:38%;top:32%" data-cost="10" title="\u{1FA93} 砍伐 10 喵喵币"><img src="/img/trees/maple.svg" style="width:40px"></div>
                        <div class="forest-tree-btn" style="left:49%;top:32%" data-cost="10" title="\u{1FA93} 砍伐 10 喵喵币"><img src="/img/trees/bamboo.svg" style="width:36px"></div>
                        <div class="forest-tree-btn" style="left:60%;top:33%" data-cost="10" title="\u{1FA93} 砍伐 10 喵喵币"><img src="/img/trees/palm.svg" style="width:38px"></div>
                        <div class="forest-tree-btn" style="left:71%;top:34%" data-cost="10" title="\u{1FA93} 砍伐 10 喵喵币"><img src="/img/trees/peach.svg" style="width:36px"></div>
                        <div class="forest-tree-btn" style="left:82%;top:35%" data-cost="10" title="\u{1FA93} 砍伐 10 喵喵币"><img src="/img/trees/orange_tree.svg" style="width:34px"></div>
                        <div class="forest-tree-btn" style="left:92%;top:36%" data-cost="10" title="\u{1FA93} 砍伐 10 喵喵币"><img src="/img/trees/pine.svg" style="width:32px"></div>

                        <!-- Row 6: Forest edge (y≈37-40%, cheapest, scattered) -->
                        <div class="forest-tree-btn" style="left:8%;top:38%" data-cost="5" title="\u{1FA93} 砍伐 5 喵喵币"><img src="/img/trees/mushroom.svg" style="width:30px"></div>
                        <div class="forest-tree-btn" style="left:24%;top:37%" data-cost="5" title="\u{1FA93} 砍伐 5 喵喵币"><img src="/img/trees/corn.svg" style="width:32px"></div>
                        <div class="forest-tree-btn" style="left:44%;top:37%" data-cost="5" title="\u{1FA93} 砍伐 5 喵喵币"><img src="/img/trees/obstacle_wild_tree.svg" style="width:34px"></div>
                        <div class="forest-tree-btn" style="left:64%;top:38%" data-cost="5" title="\u{1FA93} 砍伐 5 喵喵币"><img src="/img/trees/bamboo.svg" style="width:30px"></div>
                        <div class="forest-tree-btn" style="left:84%;top:39%" data-cost="5" title="\u{1FA93} 砍伐 5 喵喵币"><img src="/img/trees/mushroom.svg" style="width:28px"></div>

                        <!-- ═══ Harbor (center of beach/dock area y=76%) ═══ -->
                        <div class="boom-harbor" id="harbor-building" style="left:48%;top:76%" title="港口 — 点击管理">
                            <span class="harbor-icon">\u26F5</span>
                            <div class="hut-label">\u2693 港口</div>
                        </div>

                        <!-- ═══ Beach palms (on sand y=70-75%) ═══ -->
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:8%;top:70%;width:50px;opacity:0.85">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:88%;top:71%;width:45px;opacity:0.8">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:25%;top:73%;width:40px;opacity:0.75">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:72%;top:72%;width:42px;opacity:0.7">

                        <!-- Ambient -->
                        <div class="ambient-particle p1" style="font-size:11px">\u{1F54A}\uFE0F</div>
                        <div class="ambient-particle p3" style="font-size:10px">\u{1F54A}\uFE0F</div>
                        <div class="ambient-particle p2">\u{1F343}</div>
                        <div class="ambient-particle p4">\u{1F98B}</div>

                        <!-- ═══ Interactive Farmland Plots ═══ -->
                        ${this.plots.map((plot, i) => {
            const p = PP[i] || [50, 60];
            return this.renderIslandPlot(plot, p[0], p[1]);
        }).join('')}
                    </div>

                    ${activeExp ? '<div class="expedition-float">' + (this.assignee === '潘潘' ? '\u{1F431}' : '\u{1F430}') + ' 探索中... \u26F5</div>' : ''}

                    <!-- Zoom controls -->
                    <div class="zoom-controls">
                        <button id="zoom-in-btn" class="zoom-btn">+</button>
                        <span id="zoom-level-text">100%</span>
                        <button id="zoom-out-btn" class="zoom-btn">\u2212</button>
                        <button id="zoom-reset-btn" class="zoom-btn" style="font-size:10px">\u27f2</button>
                    </div>
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

        // Backpack button (garden)
        document.getElementById('garden-backpack-btn')?.addEventListener('click', () => {
            this.showBackpack(this.assignee);
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
                if (assignee === this.assignee) this.balance = result.balance;
                if (assignee === this.shopAssignee) this.shopBalance = result.balance;
                this.updateHeaderCoins();
            }

            try {
                const growResult = await API.growTree({ assignee, minutes: focusMinutes });
                if (growResult.coinDrop > 0) {
                    if (assignee === this.assignee) this.balance = Utils.roundCoin(this.balance + growResult.coinDrop);
                    if (assignee === this.shopAssignee) this.shopBalance = Utils.roundCoin(this.shopBalance + growResult.coinDrop);
                    this.updateHeaderCoins();
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
            if (assignee === this.assignee) this.balance = result.balance;
            if (assignee === this.shopAssignee) this.shopBalance = result.balance;
            this.updateHeaderCoins();
            App.showToast(`+${amount} 喵喵币！`, 'success');
        } catch (e) {
            App.showToast('打卡奖励获取失败', 'error');
        }
    },
};
