/* ── Garden & Shop View ── */
const GardenView = {
    plots: [],
    trees: [],
    balance: 0,
    shopBalance: 0,
    assignee: '潘潘',
    shopAssignee: '潘潘',
    selectedTree: null, // for planting

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
            type: 'sunflower', icon: '🌻', name: '向日葵', cost: 10, desc: '追逐阳光',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/sunflower_growing.svg', mature: '/img/trees/sunflower.svg' }
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
            type: 'mint', icon: '🌿', name: '薄荷', cost: 60, desc: '清凉一夏',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/mint_growing.svg', mature: '/img/trees/mint.svg' }
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
            type: 'cactus', icon: '🌵', name: '仙人掌', cost: 100, desc: '沙漠之花',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/cactus_growing.svg', mature: '/img/trees/cactus.svg' }
        },
        {
            type: 'rose', icon: '🌹', name: '玫瑰', cost: 100, desc: '爱的承诺',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/rose_growing.svg', mature: '/img/trees/rose.svg' }
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
        } catch (e) { }

        // Load plots
        try {
            this.plots = await API.getPlots(this.assignee);
        } catch (e) {
            this.plots = [];
        }

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

        el.innerHTML = `
            <!-- Floating HUD -->
            <div class="island-hud">
                <div class="island-hud-left">
                    <div class="garden-balance">
                    <img src="/img/cat-coin.png" alt="喵喵币" class="cat-coin-icon">
                    <strong>${this.balance}</strong> 喵喵币
                </div>
                </div>
                <div class="island-hud-center">
                    <button class="filter-pill ${this.assignee === '潘潘' ? 'active' : ''}" data-person="潘潘">
                        <img src="/img/panpan.png" alt="" style="width:16px;height:16px;border-radius:50%"> 潘潘
                    </button>
                    <button class="filter-pill ${this.assignee === '蒲蒲' ? 'active' : ''}" data-person="蒲蒲">
                        <img src="/img/pupu.png" alt="" style="width:16px;height:16px;border-radius:50%"> 蒲蒲
                    </button>
                </div>
                <div class="island-hud-right">
                    <button class="hud-btn" id="garden-history-btn" title="记录">📊</button>
                </div>
            </div>

            <!-- Draggable island world -->
            <div class="island-viewport" id="island-viewport">
                <div class="island-world" id="island-world">
                    <!-- Ocean effects -->
                    <div class="ocean-foam-ring"></div>
                    <div class="ocean-caustics"></div>
                    <div class="ocean-wave w1"></div>
                    <div class="ocean-wave w2"></div>
                    <div class="ocean-wave w3"></div>
                    <div class="ocean-wave w4"></div>

                    <!-- Drifting clouds -->
                    <div class="cloud cloud-1">☁️</div>
                    <div class="cloud cloud-2">⛅</div>
                    <div class="cloud cloud-3">☁️</div>

                    <!-- Island SVG shape (detailed) -->
                    <svg class="island-shape" viewBox="0 0 1000 750">
                        <defs>
                            <filter id="ishadow"><feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="rgba(0,0,0,0.4)"/></filter>
                            <filter id="inner-glow"><feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur"/>
                                <feFlood flood-color="#7BC67E" flood-opacity="0.3" result="color"/>
                                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                                <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <radialGradient id="sandG" cx="50%" cy="50%">
                                <stop offset="0%" stop-color="#E8D48A"/>
                                <stop offset="60%" stop-color="#D4C07A"/>
                                <stop offset="100%" stop-color="#BDA862"/>
                            </radialGradient>
                            <radialGradient id="grassG" cx="45%" cy="35%">
                                <stop offset="0%" stop-color="#6DB845"/>
                                <stop offset="40%" stop-color="#5AA038"/>
                                <stop offset="70%" stop-color="#4A8830"/>
                                <stop offset="100%" stop-color="#3D7228"/>
                            </radialGradient>
                            <pattern id="grassTex" patternUnits="userSpaceOnUse" width="40" height="40">
                                <circle cx="10" cy="8" r="1.5" fill="#5EA03B" opacity="0.3"/>
                                <circle cx="30" cy="15" r="1" fill="#4A8830" opacity="0.25"/>
                                <circle cx="20" cy="30" r="1.2" fill="#6DB845" opacity="0.2"/>
                                <circle cx="5" cy="35" r="0.8" fill="#5EA03B" opacity="0.2"/>
                                <circle cx="35" cy="5" r="1" fill="#4A8830" opacity="0.15"/>
                            </pattern>
                            <linearGradient id="waterEdge" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#8EC9D0" stop-opacity="0.4"/>
                                <stop offset="100%" stop-color="#0B6A8A" stop-opacity="0"/>
                            </linearGradient>
                        </defs>
                        <!-- Water edge glow -->
                        <path d="M70,70 C190,10 390,-10 610,0 810,10 960,90 980,200 1000,360 990,510 930,610 850,710 660,750 510,740 310,730 110,690 40,590 0,510 -10,360 10,230 20,140 40,90 70,70Z"
                              fill="url(#waterEdge)" opacity="0.5"/>
                        <!-- Beach/sand -->
                        <path d="M80,80 C200,20 400,0 600,10 800,20 950,100 970,200 990,350 980,500 920,600 840,700 650,740 500,730 300,720 120,680 50,580 10,500 0,350 20,220 30,140 50,100 80,80Z"
                              fill="url(#sandG)" filter="url(#ishadow)"/>
                        <!-- Sand texture dots -->
                        <g opacity="0.15">
                            <circle cx="150" cy="100" r="2" fill="#A08850"/><circle cx="850" cy="150" r="2.5" fill="#A08850"/>
                            <circle cx="100" cy="600" r="2" fill="#A08850"/><circle cx="800" cy="650" r="1.5" fill="#A08850"/>
                            <circle cx="400" cy="710" r="2" fill="#A08850"/><circle cx="950" cy="400" r="1.5" fill="#A08850"/>
                        </g>
                        <!-- Grass island -->
                        <path d="M120,120 C250,60 420,45 580,50 760,60 890,130 910,230 930,360 920,470 870,560 790,650 620,690 480,680 310,670 160,640 100,550 60,480 50,340 65,240 75,170 90,140 120,120Z"
                              fill="url(#grassG)" filter="url(#inner-glow)"/>
                        <!-- Grass texture overlay -->
                        <path d="M120,120 C250,60 420,45 580,50 760,60 890,130 910,230 930,360 920,470 870,560 790,650 620,690 480,680 310,670 160,640 100,550 60,480 50,340 65,240 75,170 90,140 120,120Z"
                              fill="url(#grassTex)"/>
                        <!-- Elevation contour lines -->
                        <path d="M180,180 C300,120 450,100 580,110 730,120 830,180 850,260 870,370 860,440 820,510 750,590 600,630 490,620 340,610 210,580 160,510 130,450 120,340 130,270 140,210 155,190 180,180Z"
                              fill="none" stroke="#5EA03B" stroke-width="1.5" opacity="0.2" stroke-dasharray="8,4"/>
                        <!-- Dirt paths (more detailed) -->
                        <path d="M250,350 Q350,310 500,330 Q650,350 750,320" stroke="#8B7355" stroke-width="10" fill="none" opacity="0.2" stroke-linecap="round"/>
                        <path d="M490,180 Q510,300 500,400 Q490,530 510,620" stroke="#8B7355" stroke-width="7" fill="none" opacity="0.15" stroke-linecap="round"/>
                        <path d="M200,450 Q300,430 400,440" stroke="#8B7355" stroke-width="5" fill="none" opacity="0.12" stroke-linecap="round"/>
                        <!-- Small flowers on grass -->
                        <g class="island-flowers">
                            <circle cx="200" cy="200" r="3" fill="#FF6B8A" opacity="0.6"/>
                            <circle cx="205" cy="198" r="2.5" fill="#FF8FAA" opacity="0.5"/>
                            <circle cx="750" cy="300" r="3" fill="#FFD700" opacity="0.5"/>
                            <circle cx="755" cy="303" r="2" fill="#FFE44D" opacity="0.4"/>
                            <circle cx="300" cy="500" r="2.5" fill="#FF6B8A" opacity="0.5"/>
                            <circle cx="650" cy="550" r="3" fill="#E8A0FF" opacity="0.4"/>
                            <circle cx="400" cy="180" r="2" fill="#FFD700" opacity="0.45"/>
                            <circle cx="830" cy="450" r="2.5" fill="#FF6B8A" opacity="0.4"/>
                            <circle cx="180" cy="400" r="2" fill="#E8A0FF" opacity="0.35"/>
                        </g>
                        <!-- Grass tufts -->
                        <g opacity="0.3">
                            <path d="M250,250 Q253,240 256,250" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M700,400 Q703,390 706,400" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M400,580 Q403,570 406,580" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M550,250 Q553,240 556,250" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M150,450 Q153,440 156,450" stroke="#3D7228" stroke-width="2" fill="none"/>
                            <path d="M820,350 Q823,340 826,350" stroke="#3D7228" stroke-width="2" fill="none"/>
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

                        <!-- Dock/Pier (future boat module) -->
                        <div class="island-dock" style="left:82%;top:76%">
                            <div class="dock-planks">
                                <div class="dock-plank"></div>
                                <div class="dock-plank"></div>
                                <div class="dock-plank"></div>
                                <div class="dock-plank"></div>
                                <div class="dock-plank"></div>
                            </div>
                            <div class="dock-post"></div>
                            <div class="dock-post right"></div>
                            <div class="dock-label">⚓ 码头</div>
                        </div>

                        <!-- Rich decorative trees -->
                        <img class="deco-tree" src="/img/trees/palm.svg" style="left:0%;top:6%;width:52px;opacity:.7;filter:brightness(.85)saturate(.8)">
                        <img class="deco-tree" src="/img/trees/palm.svg" style="left:91%;top:10%;width:48px;opacity:.65;filter:brightness(.8)saturate(.75)">
                        <img class="deco-tree" src="/img/trees/oak.svg"  style="left:93%;top:46%;width:42px;opacity:.55;filter:brightness(.82)saturate(.65)">
                        <img class="deco-tree" src="/img/trees/pine.svg" style="left:2%;top:62%;width:40px;opacity:.6;filter:brightness(.8)saturate(.7)">
                        <img class="deco-tree" src="/img/trees/palm.svg" style="left:89%;top:66%;width:48px;opacity:.55;filter:brightness(.78)saturate(.65)">
                        <img class="deco-tree" src="/img/trees/pine.svg" style="left:48%;top:83%;width:38px;opacity:.5;filter:brightness(.82)saturate(.6)">
                        <img class="deco-tree" src="/img/trees/oak.svg"  style="left:78%;top:82%;width:36px;opacity:.5;filter:brightness(.8)saturate(.6)">

                        <!-- Beach palms (larger, more prominent) -->
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:-5%;top:26%;width:62px;opacity:.85">
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:96%;top:22%;width:58px;opacity:.8">
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:28%;top:90%;width:52px;opacity:.75">
                        <img class="deco-tree beach-palm" src="/img/trees/palm.svg" style="left:68%;top:88%;width:56px;opacity:.78">

                        <!-- Flowers & bushes -->
                        <div class="deco-flower" style="left:15%;top:20%">🌺</div>
                        <div class="deco-flower" style="left:85%;top:30%">🌸</div>
                        <div class="deco-flower" style="left:10%;top:50%">🌼</div>
                        <div class="deco-flower" style="left:75%;top:55%">🌺</div>
                        <div class="deco-flower" style="left:35%;top:78%">🌸</div>

                        <!-- Rocks (varied sizes) -->
                        <div class="deco-rock" style="left:6%;top:88%;font-size:28px">🪨</div>
                        <div class="deco-rock" style="left:87%;top:83%;font-size:24px">🪨</div>
                        <div class="deco-rock" style="left:94%;top:38%;font-size:16px">🪨</div>
                        <div class="deco-rock" style="left:3%;top:42%;font-size:14px">🪨</div>
                        <div class="deco-rock" style="left:55%;top:90%;font-size:18px">🪨</div>

                        <!-- Ambient particles (butterflies/leaves) -->
                        <div class="ambient-particle p1">🦋</div>
                        <div class="ambient-particle p2">🍃</div>
                        <div class="ambient-particle p3">🦋</div>
                        <div class="ambient-particle p4">🍃</div>

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

    initDrag() {
        const vp = document.getElementById('island-viewport');
        const world = document.getElementById('island-world');
        if (!vp || !world) return;
        let drag = false, sx, sy, sl, st;

        // Center island
        requestAnimationFrame(() => {
            vp.scrollLeft = (world.offsetWidth - vp.offsetWidth) / 2;
            vp.scrollTop = (world.offsetHeight - vp.offsetHeight) / 2.5;
        });

        vp.addEventListener('mousedown', e => {
            if (e.target.closest('.iplot,.island-hut')) return;
            drag = true; sx = e.pageX; sy = e.pageY; sl = vp.scrollLeft; st = vp.scrollTop;
            vp.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', e => {
            if (!drag) return; e.preventDefault();
            vp.scrollLeft = sl - (e.pageX - sx);
            vp.scrollTop = st - (e.pageY - sy);
        });
        document.addEventListener('mouseup', () => { drag = false; if (vp) vp.style.cursor = 'grab'; });

        vp.addEventListener('touchstart', e => {
            if (e.target.closest('.iplot,.island-hut') || e.touches.length !== 1) return;
            drag = true; sx = e.touches[0].pageX; sy = e.touches[0].pageY; sl = vp.scrollLeft; st = vp.scrollTop;
        }, { passive: true });
        vp.addEventListener('touchmove', e => {
            if (!drag || e.touches.length !== 1) return;
            vp.scrollLeft = sl - (e.touches[0].pageX - sx);
            vp.scrollTop = st - (e.touches[0].pageY - sy);
        }, { passive: true });
        vp.addEventListener('touchend', () => { drag = false; });
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
                await this.open();
            });
        });

        // History button
        document.getElementById('garden-history-btn')?.addEventListener('click', () => {
            this.showHistory();
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
                cost: item.cost,
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
        } catch (e) { }
    },

    /* ═══════════════════════════════
       SHOP VIEW (standalone)
       ═══════════════════════════════ */
    async openShop() {
        try {
            const { balance } = await API.getCoins(this.shopAssignee);
            this.shopBalance = balance;
        } catch (e) { }
        this.renderShop();
    },

    renderShop() {
        const el = document.getElementById('view-shop');
        if (!el) return;

        el.innerHTML = `
            <div class="shop-view-header">
                <div class="garden-balance">
                    <img src="/img/cat-coin.png" alt="喵喵币" class="cat-coin-icon">
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
                        <div class="shop-card-price">${item.cost === 0 ? '免费' : `<img src="/img/cat-coin.png" class="cat-coin-icon" style="width:16px;height:16px"> ${item.cost}`}</div>
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
                    <div class="tree-detail-cost">${item.cost === 0 ? '免费' : `<img src="/img/cat-coin.png" class="cat-coin-icon" style="width:20px;height:20px"> ${item.cost} 喵喵币`}</div>
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
        } catch (e) { /* silent */ }
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
        } catch (e) { /* silent */ }
    },
};
