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

    init() { },

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
    },

    render() {
        const el = document.getElementById('view-garden');
        if (!el) return;

        const clearedCount = this.plots.filter(p => p.status !== 'wasteland').length;
        const plantedCount = this.plots.filter(p => p.status === 'planted').length;
        const typesCollected = new Set(this.plots.filter(p => p.tree_type).map(p => p.tree_type)).size;

        // Plot positions on island (% of island-land area)
        const PP = [
            [22, 18], [36, 14], [50, 12], [64, 16], [78, 20],
            [16, 32], [30, 28], [44, 26], [58, 28], [72, 32], [86, 34],
            [12, 46], [26, 42], [40, 40], [54, 42], [68, 44], [82, 48],
            [18, 58], [32, 56], [46, 54], [60, 56], [74, 60],
            [28, 70], [48, 68], [62, 72],
        ];

        const islandName = this.currentIsland ? this.currentIsland.name : '起始岛';
        const discoveredCount = this.islands.filter(i => i.discovered).length;
        const totalCount = this.islands.length;
        const activeExp = this.expeditions.find(e => e.status === 'sailing');

        el.innerHTML = `
            <!-- Floating HUD -->
            <div class="island-hud">
                <div class="island-hud-left">
                    <button class="world-map-btn" id="world-map-btn" title="世界地图">
                        🗺️ <span>${discoveredCount}/${totalCount}</span>
                    </button>
                    <div class="garden-balance">
                    <img src="/img/meow-coin.png" alt="喵喵币" class="cat-coin-icon">
                    <strong>${this.balance}</strong> 喵喵币
                </div>
                </div>
                <div class="island-hud-center">
                    <span style="color:#fff;font-size:12px;font-weight:700;opacity:0.7">🏝️ ${islandName}</span>
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
                    <div class="zoom-controls">
                        <button class="hud-btn zoom-btn" id="zoom-out-btn" title="缩小">−</button>
                        <span class="zoom-level" id="zoom-level-text">100%</span>
                        <button class="hud-btn zoom-btn" id="zoom-in-btn" title="放大">+</button>
                        <button class="hud-btn zoom-btn" id="zoom-reset-btn" title="重置" style="font-size:12px">↺</button>
                    </div>
                    <button class="hud-btn" id="garden-history-btn" title="记录">📊</button>
                </div>
            </div>

            <!-- Draggable island world -->
            <div class="island-viewport" id="island-viewport">
                <div class="island-world" id="island-world">
                    <!-- ═══ Fog of War Overlays ═══ -->
                    <div class="fog-overlay fog-top"><div class="fog-particle" style="left:10%;top:20%"></div><div class="fog-particle" style="left:50%;top:10%"></div><div class="fog-particle" style="left:80%;top:30%"></div></div>
                    <div class="fog-overlay fog-bottom"><div class="fog-particle" style="left:20%;top:40%"></div><div class="fog-particle" style="left:60%;top:20%"></div><div class="fog-particle" style="left:85%;top:50%"></div></div>
                    <div class="fog-overlay fog-left"><div class="fog-particle" style="left:20%;top:15%"></div><div class="fog-particle" style="left:30%;top:55%"></div><div class="fog-particle" style="left:10%;top:80%"></div></div>
                    <div class="fog-overlay fog-right"><div class="fog-particle" style="left:20%;top:25%"></div><div class="fog-particle" style="left:40%;top:60%"></div><div class="fog-particle" style="left:10%;top:85%"></div></div>

                    ${activeExp ? `<div style="position:absolute;z-index:30;top:10px;right:10px;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);border-radius:10px;padding:8px 14px;color:#fff;font-size:12px;display:flex;align-items:center;gap:6px">
                        <span style="font-size:18px">${this.assignee === '潘潘' ? '🐱' : '🐰'}</span>
                        <span>探索中... ⛵</span>
                    </div>` : ''}

                    <!-- Ocean effects -->
                    <div class="ocean-foam-ring"></div>
                    <div class="ocean-caustics"></div>
                    <div class="ocean-wave w1"></div>
                    <div class="ocean-wave w2"></div>
                    <div class="ocean-wave w3"></div>
                    <div class="ocean-wave w4"></div>
                    <div class="ocean-wave w5"></div>

                    <!-- Drifting clouds -->
                    <div class="cloud cloud-1">☁️</div>
                    <div class="cloud cloud-2">⛅</div>
                    <div class="cloud cloud-3">☁️</div>

                    <!-- Seabirds -->
                    <div class="ambient-particle p1" style="font-size:11px">🕊️</div>
                    <div class="ambient-particle p3" style="font-size:10px">🕊️</div>

                    <!-- Island SVG shape (detailed terrain) -->
                    <svg class="island-shape" viewBox="0 0 1000 750">
                        <defs>
                            <filter id="ishadow"><feDropShadow dx="0" dy="10" stdDeviation="22" flood-color="rgba(0,0,0,0.45)"/></filter>
                            <filter id="inner-glow"><feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur"/>
                                <feFlood flood-color="#7BC67E" flood-opacity="0.35" result="color"/>
                                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                                <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <!-- Richer sand gradient -->
                            <radialGradient id="sandG" cx="48%" cy="45%">
                                <stop offset="0%" stop-color="#F0E0A0"/>
                                <stop offset="35%" stop-color="#E8D48A"/>
                                <stop offset="65%" stop-color="#D4C07A"/>
                                <stop offset="85%" stop-color="#C4AE68"/>
                                <stop offset="100%" stop-color="#B09850"/>
                            </radialGradient>
                            <!-- Multi-tone grass for depth -->
                            <radialGradient id="grassG" cx="45%" cy="32%">
                                <stop offset="0%" stop-color="#78CC52"/>
                                <stop offset="25%" stop-color="#6DB845"/>
                                <stop offset="50%" stop-color="#5AA038"/>
                                <stop offset="75%" stop-color="#4A8830"/>
                                <stop offset="100%" stop-color="#3A7025"/>
                            </radialGradient>
                            <!-- Grass highlight for 3D contour -->
                            <radialGradient id="grassHighlight" cx="35%" cy="25%">
                                <stop offset="0%" stop-color="rgba(120,210,80,0.25)"/>
                                <stop offset="100%" stop-color="rgba(120,210,80,0)"/>
                            </radialGradient>
                            <!-- Grass shadow for depth -->
                            <radialGradient id="grassShadow" cx="65%" cy="70%">
                                <stop offset="0%" stop-color="rgba(30,60,15,0.15)"/>
                                <stop offset="100%" stop-color="rgba(30,60,15,0)"/>
                            </radialGradient>
                            <pattern id="grassTex" patternUnits="userSpaceOnUse" width="50" height="50">
                                <circle cx="12" cy="10" r="1.8" fill="#5EA03B" opacity="0.3"/>
                                <circle cx="35" cy="18" r="1.2" fill="#4A8830" opacity="0.25"/>
                                <circle cx="22" cy="35" r="1.5" fill="#6DB845" opacity="0.2"/>
                                <circle cx="6" cy="40" r="1" fill="#5EA03B" opacity="0.2"/>
                                <circle cx="42" cy="6" r="1.3" fill="#4A8830" opacity="0.15"/>
                                <circle cx="28" cy="24" r="0.8" fill="#78CC52" opacity="0.18"/>
                                <circle cx="48" cy="32" r="1" fill="#3D7228" opacity="0.15"/>
                            </pattern>
                            <!-- Sand texture pattern -->
                            <pattern id="sandTex" patternUnits="userSpaceOnUse" width="60" height="60">
                                <circle cx="15" cy="12" r="1" fill="#B09850" opacity="0.15"/>
                                <circle cx="45" cy="30" r="0.8" fill="#A08840" opacity="0.12"/>
                                <circle cx="30" cy="48" r="1.2" fill="#B09850" opacity="0.1"/>
                                <circle cx="8" cy="38" r="0.6" fill="#C4AE68" opacity="0.08"/>
                                <circle cx="52" cy="8" r="0.7" fill="#A08840" opacity="0.1"/>
                            </pattern>
                            <linearGradient id="waterEdge" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#8EC9D0" stop-opacity="0.5"/>
                                <stop offset="100%" stop-color="#0B6A8A" stop-opacity="0"/>
                            </linearGradient>
                            <!-- Shallow water near shore -->
                            <linearGradient id="shallowWater" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#20B2AA" stop-opacity="0.2"/>
                                <stop offset="100%" stop-color="#0B8C8A" stop-opacity="0"/>
                            </linearGradient>
                        </defs>

                        <!-- Shallow water zone -->
                        <path d="M60,65 C185,5 385,-15 615,-5 815,5 965,85 985,195 1005,355 995,515 935,615 855,715 665,755 515,745 315,735 105,695 35,595 -5,515 -15,365 5,225 15,135 35,85 60,65Z"
                              fill="url(#shallowWater)" opacity="0.6"/>

                        <!-- Water edge glow -->
                        <path d="M70,70 C190,10 390,-10 610,0 810,10 960,90 980,200 1000,360 990,510 930,610 850,710 660,750 510,740 310,730 110,690 40,590 0,510 -10,360 10,230 20,140 40,90 70,70Z"
                              fill="url(#waterEdge)" opacity="0.5"/>

                        <!-- Beach/sand -->
                        <path d="M80,80 C200,20 400,0 600,10 800,20 950,100 970,200 990,350 980,500 920,600 840,700 650,740 500,730 300,720 120,680 50,580 10,500 0,350 20,220 30,140 50,100 80,80Z"
                              fill="url(#sandG)" filter="url(#ishadow)"/>
                        <!-- Sand texture overlay -->
                        <path d="M80,80 C200,20 400,0 600,10 800,20 950,100 970,200 990,350 980,500 920,600 840,700 650,740 500,730 300,720 120,680 50,580 10,500 0,350 20,220 30,140 50,100 80,80Z"
                              fill="url(#sandTex)"/>

                        <!-- Beach detail dots -->
                        <g opacity="0.2">
                            <circle cx="150" cy="95" r="2" fill="#A08850"/><circle cx="850" cy="140" r="2.5" fill="#A08850"/>
                            <circle cx="100" cy="600" r="2" fill="#A08850"/><circle cx="800" cy="660" r="1.5" fill="#A08850"/>
                            <circle cx="400" cy="715" r="2" fill="#A08850"/><circle cx="950" cy="400" r="1.5" fill="#A08850"/>
                            <circle cx="250" cy="45" r="1.5" fill="#A08850"/><circle cx="700" cy="35" r="1.8" fill="#A08850"/>
                            <circle cx="550" cy="720" r="1.5" fill="#C4AE68"/><circle cx="920" cy="280" r="1.2" fill="#B09850"/>
                        </g>

                        <!-- Grass island - main layer -->
                        <path d="M120,120 C250,60 420,45 580,50 760,60 890,130 910,230 930,360 920,470 870,560 790,650 620,690 480,680 310,670 160,640 100,550 60,480 50,340 65,240 75,170 90,140 120,120Z"
                              fill="url(#grassG)" filter="url(#inner-glow)"/>
                        <!-- Grass texture overlay -->
                        <path d="M120,120 C250,60 420,45 580,50 760,60 890,130 910,230 930,360 920,470 870,560 790,650 620,690 480,680 310,670 160,640 100,550 60,480 50,340 65,240 75,170 90,140 120,120Z"
                              fill="url(#grassTex)"/>
                        <!-- Grass 3D highlight (upper-left = sunlit) -->
                        <path d="M120,120 C250,60 420,45 580,50 760,60 890,130 910,230 930,360 920,470 870,560 790,650 620,690 480,680 310,670 160,640 100,550 60,480 50,340 65,240 75,170 90,140 120,120Z"
                              fill="url(#grassHighlight)"/>
                        <!-- Grass 3D shadow (lower-right = shaded) -->
                        <path d="M120,120 C250,60 420,45 580,50 760,60 890,130 910,230 930,360 920,470 870,560 790,650 620,690 480,680 310,670 160,640 100,550 60,480 50,340 65,240 75,170 90,140 120,120Z"
                              fill="url(#grassShadow)"/>

                        <!-- Elevation contour lines — more layers -->
                        <path d="M180,180 C300,120 450,100 580,110 730,120 830,180 850,260 870,370 860,440 820,510 750,590 600,630 490,620 340,610 210,580 160,510 130,450 120,340 130,270 140,210 155,190 180,180Z"
                              fill="none" stroke="#5EA03B" stroke-width="1.5" opacity="0.18" stroke-dasharray="10,5"/>
                        <path d="M240,240 C340,190 460,175 570,180 690,190 770,230 790,290 810,380 800,430 770,480 720,540 600,570 500,560 380,555 270,530 230,480 200,430 190,360 195,300 200,260 215,245 240,240Z"
                              fill="none" stroke="#4A8830" stroke-width="1" opacity="0.12" stroke-dasharray="6,4"/>

                        <!-- Terrain patches — darker/lighter grass zones for depth -->
                        <ellipse cx="350" cy="350" rx="80" ry="50" fill="rgba(90,160,56,0.12)" transform="rotate(-15 350 350)"/>
                        <ellipse cx="650" cy="300" rx="70" ry="45" fill="rgba(60,120,30,0.1)" transform="rotate(10 650 300)"/>
                        <ellipse cx="500" cy="500" rx="90" ry="40" fill="rgba(90,160,56,0.08)" transform="rotate(-8 500 500)"/>
                        <ellipse cx="250" cy="450" rx="50" ry="35" fill="rgba(60,120,30,0.08)"/>

                        <!-- Dirt paths (clearer, wider) -->
                        <path d="M250,350 Q350,305 500,325 Q650,345 760,315" stroke="#8B7355" stroke-width="12" fill="none" opacity="0.18" stroke-linecap="round"/>
                        <path d="M490,170 Q515,290 505,395 Q495,520 515,625" stroke="#8B7355" stroke-width="9" fill="none" opacity="0.14" stroke-linecap="round"/>
                        <path d="M200,440 Q300,425 420,435" stroke="#8B7355" stroke-width="7" fill="none" opacity="0.1" stroke-linecap="round"/>
                        <path d="M600,420 Q700,400 780,430" stroke="#8B7355" stroke-width="6" fill="none" opacity="0.1" stroke-linecap="round"/>

                        <!-- Flowers on grass — clusters -->
                        <g class="island-flowers">
                            <circle cx="200" cy="195" r="3.5" fill="#FF6B8A" opacity="0.6"/>
                            <circle cx="206" cy="193" r="2.5" fill="#FF8FAA" opacity="0.5"/>
                            <circle cx="198" cy="200" r="2" fill="#FFB3C6" opacity="0.4"/>
                            <circle cx="750" cy="295" r="3.5" fill="#FFD700" opacity="0.55"/>
                            <circle cx="756" cy="299" r="2" fill="#FFE44D" opacity="0.4"/>
                            <circle cx="744" cy="300" r="2.5" fill="#FFD700" opacity="0.35"/>
                            <circle cx="300" cy="495" r="3" fill="#FF6B8A" opacity="0.5"/>
                            <circle cx="305" cy="500" r="2" fill="#FFB3C6" opacity="0.35"/>
                            <circle cx="650" cy="545" r="3.5" fill="#E8A0FF" opacity="0.45"/>
                            <circle cx="655" cy="550" r="2" fill="#D08FFF" opacity="0.35"/>
                            <circle cx="400" cy="175" r="2.5" fill="#FFD700" opacity="0.45"/>
                            <circle cx="830" cy="445" r="3" fill="#FF6B8A" opacity="0.4"/>
                            <circle cx="180" cy="395" r="2.5" fill="#E8A0FF" opacity="0.35"/>
                            <circle cx="550" cy="200" r="2" fill="#FF8FAA" opacity="0.3"/>
                            <circle cx="700" cy="550" r="2.5" fill="#FFD700" opacity="0.3"/>
                            <circle cx="350" cy="580" r="2" fill="#FF6B8A" opacity="0.35"/>
                        </g>

                        <!-- Grass tufts — more numerous -->
                        <g opacity="0.3">
                            <path d="M250,245 Q253,233 256,245" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M253,248 Q255,236 258,248" stroke="#2D6020" stroke-width="1.5" fill="none"/>
                            <path d="M700,395 Q703,383 706,395" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M400,575 Q403,563 406,575" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M550,245 Q553,233 556,245" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M150,445 Q153,433 156,445" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M820,345 Q823,333 826,345" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M350,300 Q353,290 356,300" stroke="#2D6020" stroke-width="1.5" fill="none"/>
                            <path d="M620,480 Q623,470 626,480" stroke="#3D7228" stroke-width="1.5" fill="none"/>
                            <path d="M450,150 Q453,140 456,150" stroke="#3D7228" stroke-width="1.5" fill="none"/>
                            <path d="M780,520 Q783,510 786,520" stroke="#2D6020" stroke-width="1.5" fill="none"/>
                        </g>

                        <!-- Rocky outcrops near shore -->
                        <g opacity="0.3">
                            <ellipse cx="100" cy="400" rx="15" ry="10" fill="#8B7355" transform="rotate(-20 100 400)"/>
                            <ellipse cx="900" cy="350" rx="12" ry="8" fill="#7A6548" transform="rotate(15 900 350)"/>
                            <ellipse cx="180" cy="650" rx="10" ry="7" fill="#8B7355" transform="rotate(-10 180 650)"/>
                            <ellipse cx="820" cy="680" rx="14" ry="9" fill="#7A6548"/>
                        </g>
                    </svg>

                    <!-- Island land -->
                    <div class="island-land" id="island-land">
                        <!-- Premium Hut -->
                        <div class="island-hut" style="left:42%;top:2%">
                            <div class="hut-chimney">
                                <div class="smoke s1"></div>
                                <div class="smoke s2"></div>
                                <div class="smoke s3"></div>
                            </div>
                            <div class="hut-structure">
                                <div class="hut-roof">
                                    <div class="hut-flag">🚩</div>
                                </div>
                                <div class="hut-wall">
                                    <div class="hut-window"></div>
                                    <div class="hut-window"></div>
                                </div>
                                <div class="hut-door"><div class="hut-knob"></div></div>
                            </div>
                            <div class="hut-label">🏠 小屋</div>
                        </div>

                        <!-- Harbor (click to open harbor panel) -->
                        <div class="island-harbor" style="left:82%;top:76%" id="harbor-building" title="港口 — 点击管理船只和探索">
                            <div class="harbor-building"></div>
                            <div class="harbor-label">⚓ 港口</div>
                            <div style="position:absolute;bottom:-18px;left:-15px;font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));animation:boatBob 3s ease-in-out infinite">⛵</div>
                        </div>

                        <!-- ═══ Dense Jungle Edge Trees ═══ -->
                        <!-- Left jungle cluster -->
                        <img class="deco-tree jungle-tree" src="/img/trees/palm.svg" style="left:-8%;top:5%;width:58px;opacity:.8">
                        <img class="deco-tree jungle-tree" src="/img/trees/oak.svg"  style="left:-4%;top:14%;width:48px;opacity:.7">
                        <img class="deco-tree jungle-tree" src="/img/trees/pine.svg" style="left:-2%;top:28%;width:42px;opacity:.65">
                        <img class="deco-tree jungle-tree" src="/img/trees/palm.svg" style="left:-6%;top:38%;width:52px;opacity:.7">
                        <img class="deco-tree jungle-tree" src="/img/trees/oak.svg"  style="left:0%;top:52%;width:44px;opacity:.6">
                        <img class="deco-tree jungle-tree" src="/img/trees/pine.svg" style="left:-3%;top:65%;width:46px;opacity:.55">

                        <!-- Right jungle cluster -->
                        <img class="deco-tree jungle-tree" src="/img/trees/palm.svg" style="left:94%;top:8%;width:54px;opacity:.75">
                        <img class="deco-tree jungle-tree" src="/img/trees/oak.svg"  style="left:96%;top:22%;width:46px;opacity:.65">
                        <img class="deco-tree jungle-tree" src="/img/trees/pine.svg" style="left:92%;top:38%;width:44px;opacity:.6">
                        <img class="deco-tree jungle-tree" src="/img/trees/palm.svg" style="left:95%;top:50%;width:50px;opacity:.65">
                        <img class="deco-tree jungle-tree" src="/img/trees/oak.svg"  style="left:93%;top:62%;width:42px;opacity:.55">

                        <!-- Bottom jungle cluster -->
                        <img class="deco-tree jungle-tree" src="/img/trees/pine.svg" style="left:15%;top:82%;width:44px;opacity:.6">
                        <img class="deco-tree jungle-tree" src="/img/trees/oak.svg"  style="left:38%;top:86%;width:40px;opacity:.55">
                        <img class="deco-tree jungle-tree" src="/img/trees/palm.svg" style="left:52%;top:84%;width:48px;opacity:.6">
                        <img class="deco-tree jungle-tree" src="/img/trees/pine.svg" style="left:72%;top:82%;width:42px;opacity:.55">

                        <!-- Top edge trees -->
                        <img class="deco-tree jungle-tree" src="/img/trees/oak.svg"  style="left:18%;top:-2%;width:40px;opacity:.6">
                        <img class="deco-tree jungle-tree" src="/img/trees/pine.svg" style="left:70%;top:-1%;width:38px;opacity:.55">

                        <!-- ═══ Beach Palms (prominent, swaying) ═══ -->
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:-7%;top:22%;width:66px;opacity:.88">
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:97%;top:18%;width:62px;opacity:.82">
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:25%;top:91%;width:56px;opacity:.78">
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:65%;top:89%;width:60px;opacity:.8">
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:-10%;top:70%;width:58px;opacity:.75">
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:88%;top:78%;width:52px;opacity:.7">

                        <!-- ═══ Flowers & bushes (more, larger) ═══ -->
                        <div class="deco-flower" style="left:14%;top:18%">🌺</div>
                        <div class="deco-flower" style="left:86%;top:28%">🌸</div>
                        <div class="deco-flower" style="left:8%;top:48%">🌼</div>
                        <div class="deco-flower" style="left:76%;top:52%">🌺</div>
                        <div class="deco-flower" style="left:33%;top:76%">🌸</div>
                        <div class="deco-flower" style="left:60%;top:80%">🌼</div>
                        <div class="deco-flower" style="left:88%;top:44%">🌺</div>
                        <div class="deco-flower" style="left:5%;top:32%">🌸</div>

                        <!-- ═══ Rocks (varied, natural) ═══ -->
                        <div class="deco-rock" style="left:4%;top:88%;font-size:30px">🪨</div>
                        <div class="deco-rock" style="left:88%;top:84%;font-size:26px">🪨</div>
                        <div class="deco-rock" style="left:95%;top:36%;font-size:18px">🪨</div>
                        <div class="deco-rock" style="left:2%;top:44%;font-size:16px">🪨</div>
                        <div class="deco-rock" style="left:55%;top:92%;font-size:20px">🪨</div>
                        <div class="deco-rock" style="left:-3%;top:58%;font-size:14px">🪨</div>

                        <!-- ═══ Beach details ═══ -->
                        <div class="deco-flower" style="left:10%;top:90%;font-size:11px;animation:none;opacity:0.5">🐚</div>
                        <div class="deco-flower" style="left:78%;top:92%;font-size:10px;animation:none;opacity:0.45">⭐</div>
                        <div class="deco-flower" style="left:45%;top:94%;font-size:9px;animation:none;opacity:0.4">🐚</div>

                        <!-- Ambient particles (butterflies/leaves/fireflies) -->
                        <div class="ambient-particle p2">🍃</div>
                        <div class="ambient-particle p4">🍃</div>
                        <div class="ambient-particle p1">🦋</div>
                        <div class="ambient-particle p3">🦋</div>
                        <div class="ambient-particle p5">✨</div>

                        <!-- Interactive Plots -->
                        ${this.plots.map((plot, i) => {
            const p = PP[i] || [50, 50];
            return this.renderIslandPlot(plot, p[0], p[1]);
        }).join('')}
                    </div>
                </div>
            </div>

            ${this.selectedTree ? this.renderPlantingToolbar() : ''}

            <div class="island-stats-bar">
                <span>🌱 ${plantedCount} 种植</span>
                <span>📦 ${typesCollected} 种类</span>
                <span>⛏️ ${clearedCount} 开垦</span>
            </div>
        `;

        this.bindGardenEvents();
        this.initDrag();
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
        world.style.transform = `scale(${this._zoom}) perspective(1200px) rotateX(28deg)`;
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
            plotEl.addEventListener('click', async () => {
                const plotId = parseInt(plotEl.dataset.plotId);
                const plot = this.plots.find(p => p.id === plotId);
                if (!plot) return;

                if (plot.status === 'wasteland') {
                    await this.clearPlot(plotId, plot.obstacle_type);
                } else if (plot.status === 'cleared' && this.selectedTree) {
                    await this.plantOnPlot(plotId);
                }
            });
        });
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
        const CAT = { raft: { name: '小木筏', cost: 200, icon: '🛶', dur: 30 }, sailboat: { name: '帆船', cost: 500, icon: '⛵', dur: 15 }, galleon: { name: '大帆船', cost: 1000, icon: '🚢', dur: 5 } };
        const charName = this.assignee === '潘潘' ? '小八 🐱' : '乌撒奇 🐰';
        const activeExp = this.expeditions.find(e => e.status === 'sailing');

        let expHtml = '';
        if (activeExp) {
            const start = new Date(activeExp.started_at.replace(' ', 'T'));
            const elapsed = Math.floor((Date.now() - start.getTime()) / 60000);
            const pct = Math.min(100, Math.round(elapsed / activeExp.duration_min * 100));
            const rem = Math.max(0, activeExp.duration_min - elapsed);
            expHtml = `<div class="expedition-active"><div class="expedition-header"><div class="expedition-char">${this.assignee === '潘潘' ? '🐱' : '🐰'}</div><div class="expedition-info"><div class="expedition-dest">${activeExp.character} 正在探索未知海域...</div><div class="expedition-time">剩余约 ${rem} 分钟</div></div></div><div class="expedition-bar"><div class="expedition-bar-fill" style="width:${pct}%"></div></div></div>`;
        }

        const myBoats = this.boats.length ? this.boats.map(b => {
            const s = CAT[b.boat_type] || CAT.raft;
            return `<div class="boat-card ${b.status === 'sailing' ? 'sailing' : ''}" data-boat-id="${b.id}"><div class="boat-card-icon">${s.icon}</div><div class="boat-card-info"><div class="boat-card-name">${s.name}</div><div class="boat-card-status">${b.status === 'sailing' ? '⛵ 航行中' : '停泊中'} · ${s.dur}分/次</div></div>${b.status === 'docked' && !activeExp ? `<button class="boat-card-action explore" data-sail="${b.id}">🧭 探索</button>` : ''}</div>`;
        }).join('') : '<div style="color:rgba(255,255,255,0.3);font-size:13px;padding:8px">还没有船只，先买一艘吧！</div>';

        const shop = Object.entries(CAT).map(([t, s]) => `<div class="boat-card"><div class="boat-card-icon">${s.icon}</div><div class="boat-card-info"><div class="boat-card-name">${s.name}</div><div class="boat-card-status">${s.cost} 喵喵币 · ${s.dur}分钟</div></div><button class="boat-card-action buy" data-buy="${t}">购买</button></div>`).join('');

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
    },

    renderShop() {
        const el = document.getElementById('view-shop');
        if (!el) return;

        el.innerHTML = `
            <div class="shop-view-header">
                <div class="garden-balance">
                    <img src="/img/meow-coin.png" alt="喵喵币" class="cat-coin-icon">
                    <strong>${this.shopBalance}</strong> 喵喵币
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
                        <div class="shop-card-price">${item.cost === 0 ? '免费' : `<img src="/img/meow-coin.png" class="cat-coin-icon" style="width:16px;height:16px"> ${item.cost}`}</div>
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
                    <div class="tree-detail-cost">${item.cost === 0 ? '免费' : `<img src="/img/meow-coin.png" class="cat-coin-icon" style="width:20px;height:20px"> ${item.cost} 喵喵币`}</div>
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
        const bal = App.currentView === 'shop' ? this.shopBalance : this.balance;
        el.textContent = bal;
    },

    async earnFromPomodoro(assignee, focusMinutes) {
        let amount = 10;
        if (focusMinutes >= 60) amount = 30;
        else if (focusMinutes >= 45) amount = 20;
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
                    App.showToast(`+${amount} 喵喵币 · ${name} 成长了！(${label})`, 'success');
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
