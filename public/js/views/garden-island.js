/* ── Garden Island View Extensions ── */
Object.assign(GardenView, {
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
            this.islands = await API.fetch(`/garden/islands/${encodeURIComponent(this.assignee)}`).then(r => r.json());
            if (!this.currentIsland) {
                this.currentIsland = this.islands.find(i => i.island_type === 'starter') || this.islands[0];
            }
        } catch (e) {
            this.islands = [];
        }

        // Load plots for current island
        try {
            if (this.currentIsland) {
                this.plots = await API.fetch(`/garden/plots/${encodeURIComponent(this.assignee)}/${this.currentIsland.id}`).then(r => r.json());
            } else {
                this.plots = await API.getPlots(this.assignee);
            }
        } catch (e) {
            this.plots = [];
        }

        // Load boats & expeditions
        try {
            const boatData = await API.fetch(`/garden/boats/${encodeURIComponent(this.assignee)}`).then(r => r.json());
            this.boats = boatData.boats || [];
        } catch (e) { this.boats = []; }
        try {
            this.expeditions = await API.fetch(`/garden/expeditions/${encodeURIComponent(this.assignee)}`).then(r => r.json());
        } catch (e) { this.expeditions = []; }

        this.render();
        this.updateHeaderCoins();
    },

    render() {
        const el = document.getElementById('view-garden');
        if (!el) return;

        const islandName = this.currentIsland ? this.currentIsland.name : '起始岛';
        const discoveredCount = this.islands.filter(i => i.discovered).length;
        const totalCount = this.islands.length;
        const renderSignature = [
            this.assignee,
            this.currentIsland?.id || 'none',
            discoveredCount,
            totalCount,
        ].join('|');

        if (this._staticRendered) {
            if (this._renderSignature === renderSignature) {
                this._updateDynamicContent();
                return;
            }
            this._staticRendered = false;
        }

        const clearedCount = this.plots.filter(p => p.status !== 'wasteland').length;
        const plantedCount = this.plots.filter(p => p.status === 'planted').length;
        const typesCollected = new Set(this.plots.filter(p => p.tree_type).map(p => p.tree_type)).size;
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
                    <div class="ocean-waves">
                        <div class="wave-ring w1"></div>
                        <div class="wave-ring w2"></div>
                        <div class="wave-ring w3"></div>
                    </div>
                    <svg class="island-shape" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <defs>
                            <filter id="ishadow"><feDropShadow dx="0" dy="14" stdDeviation="28" flood-color="rgba(0,0,0,0.42)"/></filter>
                            <filter id="softGlow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                            <!-- Reef & shallow water -->
                            <radialGradient id="reefG" cx="50%" cy="50%"><stop offset="0%" stop-color="#4ed8e4"/><stop offset="35%" stop-color="#38c0d4"/><stop offset="70%" stop-color="#22a0b8"/><stop offset="100%" stop-color="#14809b"/></radialGradient>
                            <radialGradient id="shallowsG" cx="50%" cy="48%"><stop offset="0%" stop-color="rgba(140,255,245,0.55)"/><stop offset="50%" stop-color="rgba(109,220,225,0.25)"/><stop offset="100%" stop-color="rgba(20,128,155,0)"/></radialGradient>
                            <!-- Sand -->
                            <linearGradient id="sandG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#faf0d5"/><stop offset="30%" stop-color="#f0dba0"/><stop offset="65%" stop-color="#e2c47a"/><stop offset="100%" stop-color="#c9a25e"/></linearGradient>
                            <!-- Grass -->
                            <linearGradient id="grassG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7ade56"/><stop offset="35%" stop-color="#5cb838"/><stop offset="70%" stop-color="#45922a"/><stop offset="100%" stop-color="#357422"/></linearGradient>
                            <!-- Forest -->
                            <linearGradient id="forestG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#14381a"/><stop offset="40%" stop-color="#1e4e20"/><stop offset="100%" stop-color="#2d6828"/></linearGradient>
                            <!-- Cliffs -->
                            <linearGradient id="cliffG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9a8460"/><stop offset="50%" stop-color="#7a6444"/><stop offset="100%" stop-color="#5c4830"/></linearGradient>
                            <linearGradient id="cliffFaceG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ab9068"/><stop offset="50%" stop-color="#886c48"/><stop offset="100%" stop-color="#644e32"/></linearGradient>
                            <!-- Dirt farmland -->
                            <radialGradient id="dirtG" cx="50%" cy="45%"><stop offset="0%" stop-color="#8c6a47"/><stop offset="55%" stop-color="#785737"/><stop offset="100%" stop-color="#5d422a"/></radialGradient>
                            <!-- Yard -->
                            <linearGradient id="yardG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#bce090"/><stop offset="40%" stop-color="#98c460"/><stop offset="100%" stop-color="#72a040"/></linearGradient>
                            <!-- Fog -->
                            <radialGradient id="fogG" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(180,210,230,0.65)"/><stop offset="60%" stop-color="rgba(160,190,210,0.22)"/><stop offset="100%" stop-color="rgba(160,190,210,0)"/></radialGradient>
                        </defs>
                        <g filter="url(#ishadow)">
                            <!-- Reef platform -->
                            <path d="M38,660 Q18,510 65,280 L120,132 Q168,34 358,26 L948,42 Q1098,62 1152,240 L1164,698 Q1156,858 982,886 L176,890 Q54,878 38,660 Z" fill="url(#reefG)" opacity="0.94"/>
                            <!-- Shallow water glow -->
                            <ellipse cx="186" cy="748" rx="324" ry="240" fill="url(#shallowsG)" opacity="0.94"/>
                            <ellipse cx="1008" cy="692" rx="294" ry="188" fill="url(#shallowsG)" opacity="0.80"/>
                            <ellipse cx="1104" cy="420" rx="132" ry="100" fill="url(#shallowsG)" opacity="0.52"/>
                            <ellipse cx="300" cy="200" rx="180" ry="120" fill="url(#shallowsG)" opacity="0.36"/>

                            <!-- Sand beach -->
                            <path d="M102,648 Q78,520 114,332 L156,184 Q200,90 344,84 L912,86 Q1026,94 1074,248 L1102,634 Q1100,782 950,846 L210,856 Q124,846 102,648 Z" fill="url(#sandG)"/>
                            <!-- Beach foam lines -->
                            <path d="M108,650 Q168,792 324,838" stroke="rgba(255,255,255,0.38)" stroke-width="14" fill="none" stroke-linecap="round"/>
                            <path d="M116,620 Q190,770 348,828" stroke="rgba(255,255,255,0.18)" stroke-width="8" fill="none" stroke-linecap="round"/>
                            <path d="M878,820 Q1034,784 1098,688" stroke="rgba(255,255,255,0.34)" stroke-width="12" fill="none" stroke-linecap="round"/>
                            <path d="M890,808 Q1042,770 1088,672" stroke="rgba(255,255,255,0.16)" stroke-width="6" fill="none" stroke-linecap="round"/>
                            <!-- Wet sand highlights -->
                            <path d="M102,656 Q114,796 224,848 L162,854 Q120,846 102,656 Z" fill="#fbf2d6" opacity="0.88"/>
                            <path d="M908,728 Q992,736 1066,672 L1078,754 Q1022,828 936,844 L858,838 Q906,796 908,728 Z" fill="#edd89c" opacity="0.80"/>

                            <!-- Main grass area -->
                            <path d="M244,600 Q222,492 244,354 L272,242 Q300,170 396,162 L846,164 Q940,174 986,290 L1000,616 Q1004,720 908,778 L340,790 Q262,784 244,600 Z" fill="url(#grassG)"/>
                            <!-- Grass texture highlights -->
                            <ellipse cx="520" cy="620" rx="240" ry="100" fill="rgba(140,230,100,0.12)"/>
                            <ellipse cx="780" cy="540" rx="120" ry="80" fill="rgba(160,240,120,0.10)"/>

                            <!-- Cliff ridge (upper) -->
                            <path d="M260,320 L272,242 Q300,170 396,162 L846,164 Q940,174 986,290 L996,336 Q932,314 846,324 Q748,298 650,328 Q550,302 452,334 Q350,304 260,320 Z" fill="url(#cliffG)"/>
                            <!-- Cliff face texture -->
                            <path d="M254,332 Q368,280 496,292 Q618,268 720,298 Q834,274 962,322 L972,368 Q848,340 726,360 Q600,334 476,364 Q358,338 248,366 Z" fill="url(#cliffFaceG)" opacity="0.55"/>
                            <!-- Mountain peaks -->
                            <path d="M114,438 L136,240 L232,80 L318,176 L300,344 L244,438 Z" fill="#8c7250"/>
                            <path d="M208,302 L316,148 L436,70 L508,194 L450,332 Z" fill="#7b6546"/>
                            <path d="M438,306 L562,66 L696,210 L644,340 Z" fill="#6b563a"/>
                            <path d="M680,312 L808,96 L940,220 L880,346 Z" fill="#7a6647"/>
                            <path d="M910,412 L952,216 L1042,158 L1094,306 L1058,454 Z" fill="#6d583c"/>
                            <!-- Snow caps on peaks -->
                            <polygon points="558,84 566,66 576,88" fill="rgba(255,255,255,0.62)"/>
                            <polygon points="802,114 812,96 824,116" fill="rgba(255,255,255,0.48)"/>
                            <polygon points="228,96 236,80 244,98" fill="rgba(255,255,255,0.42)"/>
                            <!-- Waterfalls -->
                            <rect x="166" y="158" width="18" height="172" rx="9" fill="rgba(172,235,255,0.70)"/>
                            <rect x="192" y="150" width="12" height="186" rx="7" fill="rgba(122,220,255,0.58)"/>
                            <rect x="178" y="332" width="14" height="40" rx="7" fill="rgba(172,235,255,0.45)"/>
                            <!-- Mountain mist -->
                            <g opacity="0.24">
                                <ellipse cx="278" cy="306" rx="170" ry="32" fill="rgba(210,220,235,0.25)"/>
                                <ellipse cx="842" cy="296" rx="210" ry="36" fill="rgba(210,220,235,0.22)"/>
                            </g>

                            <!-- Dense forest canopy (back layer — darkest) -->
                            <path d="M206,442 Q282,346 390,338 L768,344 Q902,352 984,438 L974,524 Q898,560 812,554 Q722,572 626,566 Q524,582 414,566 Q308,582 216,542 Z" fill="url(#forestG)"/>
                            <g opacity="0.98">
                                <circle cx="224" cy="390" r="58" fill="#143218"/>
                                <circle cx="318" cy="376" r="66" fill="#163a18"/>
                                <circle cx="426" cy="366" r="74" fill="#113214"/>
                                <circle cx="548" cy="360" r="82" fill="#163618"/>
                                <circle cx="674" cy="364" r="78" fill="#183a1c"/>
                                <circle cx="800" cy="376" r="72" fill="#153618"/>
                                <circle cx="910" cy="394" r="64" fill="#163618"/>
                            </g>
                            <!-- Forest mid layer -->
                            <g opacity="0.92">
                                <circle cx="186" cy="450" r="46" fill="#234c24"/>
                                <circle cx="282" cy="444" r="54" fill="#285826"/>
                                <circle cx="398" cy="438" r="56" fill="#2e6228"/>
                                <circle cx="526" cy="436" r="58" fill="#265426"/>
                                <circle cx="652" cy="440" r="56" fill="#326a2c"/>
                                <circle cx="774" cy="446" r="52" fill="#2a5c28"/>
                                <circle cx="890" cy="458" r="48" fill="#326a2c"/>
                            </g>
                            <!-- Forest front layer — lighter -->
                            <g opacity="0.80">
                                <circle cx="224" cy="506" r="38" fill="#4a9a36"/>
                                <circle cx="348" cy="504" r="42" fill="#52a83a"/>
                                <circle cx="490" cy="502" r="42" fill="#60b240"/>
                                <circle cx="638" cy="502" r="44" fill="#5aa43c"/>
                                <circle cx="780" cy="508" r="40" fill="#4e9434"/>
                                <circle cx="904" cy="520" r="36" fill="#5aa43c"/>
                            </g>
                            <!-- Scattered small trees at forest edge -->
                            <g opacity="0.55">
                                <circle cx="196" cy="536" r="18" fill="#6ab84a"/>
                                <circle cx="934" cy="542" r="16" fill="#5eac42"/>
                                <circle cx="260" cy="540" r="14" fill="#72c252"/>
                                <circle cx="852" cy="538" r="15" fill="#68b648"/>
                            </g>

                            <!-- Yard/clearing near house -->
                            <ellipse cx="830" cy="554" rx="172" ry="112" fill="url(#yardG)" opacity="0.94"/>
                            <ellipse cx="830" cy="554" rx="140" ry="78" fill="rgba(255,248,220,0.14)"/>
                            <!-- Central meadow glow -->
                            <ellipse cx="618" cy="606" rx="340" ry="144" fill="rgba(255,255,255,0.06)"/>

                            <!-- Farmland/dirt area -->
                            <path d="M296,624 Q278,564 308,516 Q376,468 456,474 L576,482 Q644,488 684,526 Q694,580 670,650 Q636,728 586,768 L394,778 Q340,772 312,726 Q286,682 296,624 Z" fill="url(#dirtG)" opacity="0.92"/>
                            <!-- Furrow lines -->
                            <path d="M320,576 Q400,544 488,548 Q566,552 642,580" stroke="rgba(104,66,34,0.26)" stroke-width="8" fill="none" stroke-linecap="round"/>
                            <path d="M314,624 Q408,594 504,598 Q588,602 650,628" stroke="rgba(104,66,34,0.22)" stroke-width="7" fill="none" stroke-linecap="round"/>
                            <path d="M330,674 Q416,650 512,654 Q582,658 632,682" stroke="rgba(104,66,34,0.18)" stroke-width="6" fill="none" stroke-linecap="round"/>
                            <path d="M356,718 Q428,698 510,702 Q568,706 610,722" stroke="rgba(104,66,34,0.14)" stroke-width="5" fill="none" stroke-linecap="round"/>

                            <!-- Path to dock -->
                            <path d="M836,594 Q910,638 980,714" stroke="rgba(139,105,68,0.36)" stroke-width="30" fill="none" stroke-linecap="round"/>
                            <path d="M976,712 Q1042,730 1114,694" stroke="rgba(139,105,68,0.32)" stroke-width="20" fill="none" stroke-linecap="round"/>
                            <!-- Dock planks -->
                            <rect x="978" y="710" width="146" height="20" rx="6" fill="#8a6849"/>
                            <rect x="1012" y="726" width="14" height="60" rx="4" fill="#6d5037"/>
                            <rect x="1068" y="726" width="14" height="60" rx="4" fill="#6d5037"/>
                            <!-- Dock ropes -->
                            <path d="M1018,732 Q1024,740 1018,748" stroke="rgba(180,150,100,0.5)" stroke-width="2" fill="none"/>
                            <path d="M1074,732 Q1080,740 1074,748" stroke="rgba(180,150,100,0.5)" stroke-width="2" fill="none"/>

                            <!-- Rock details -->
                            <ellipse cx="196" cy="480" rx="72" ry="58" fill="rgba(68,92,76,0.56)"/>
                            <ellipse cx="1004" cy="628" rx="36" ry="30" fill="rgba(112,132,144,0.55)"/>
                            <ellipse cx="1074" cy="356" rx="28" ry="20" fill="rgba(126,102,72,0.65)"/>
                            <ellipse cx="156" cy="600" rx="22" ry="16" fill="rgba(90,110,90,0.40)"/>
                            <!-- Beach wave line at bottom -->
                            <path d="M114,686 Q162,788 254,832" stroke="rgba(255,255,255,0.24)" stroke-width="7" fill="none" stroke-linecap="round"/>
                        </g>
                        <!-- Atmospheric fog around island -->
                        <ellipse cx="600" cy="858" rx="564" ry="96" fill="url(#fogG)" opacity="0.82"/>
                        <ellipse cx="104" cy="476" rx="114" ry="274" fill="rgba(160,190,210,0.22)"/>
                        <ellipse cx="1096" cy="462" rx="130" ry="260" fill="rgba(160,190,210,0.18)"/>
                        <ellipse cx="600" cy="88" rx="498" ry="82" fill="rgba(160,190,210,0.14)"/>
                    </svg>

                    <div class="island-land" id="island-land">
                        <div class="boom-house" style="left:80%;top:54%">
                            <svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
                                <!-- Foundation -->
                                <rect x="16" y="190" width="208" height="18" rx="3" fill="#7B6340"/>
                                <rect x="20" y="192" width="200" height="14" rx="2" fill="#8B7355"/>
                                <!-- Walls with wood grain -->
                                <rect x="30" y="88" width="180" height="108" rx="4" fill="#E8D8B0"/>
                                <rect x="30" y="88" width="90" height="108" fill="#F0E0C0" opacity="0.3"/>
                                <g stroke="#C4B090" stroke-width="0.8" opacity="0.25">
                                    <line x1="30" y1="106" x2="210" y2="106"/>
                                    <line x1="30" y1="124" x2="210" y2="124"/>
                                    <line x1="30" y1="142" x2="210" y2="142"/>
                                    <line x1="30" y1="160" x2="210" y2="160"/>
                                    <line x1="30" y1="178" x2="210" y2="178"/>
                                    <line x1="120" y1="88" x2="120" y2="196"/>
                                </g>
                                <!-- Roof -->
                                <polygon points="6,90 120,22 234,90" fill="#B83224"/>
                                <polygon points="6,90 120,22 120,90" fill="#D04838" opacity="0.4"/>
                                <polygon points="120,22 234,90 120,90" fill="#8C261C" opacity="0.3"/>
                                <line x1="6" y1="90" x2="234" y2="90" stroke="#6A1810" stroke-width="4"/>
                                <line x1="120" y1="22" x2="120" y2="90" stroke="#6A1810" stroke-width="1.5" opacity="0.3"/>
                                <!-- Roof edge overhang -->
                                <path d="M4,90 Q120,96 236,90" stroke="#6A1810" stroke-width="2" fill="none" opacity="0.4"/>
                                <!-- Chimney + smoke -->
                                <rect x="170" y="28" width="18" height="48" rx="2" fill="#8B6914"/>
                                <rect x="168" y="24" width="22" height="8" rx="2" fill="#A07018"/>
                                <circle cx="179" cy="18" r="5" fill="rgba(200,200,200,0.5)"><animate attributeName="cy" values="18;2;-14" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.3;0" dur="3s" repeatCount="indefinite"/></circle>
                                <circle cx="184" cy="12" r="4" fill="rgba(200,200,200,0.4)"><animate attributeName="cy" values="12;-4;-18" dur="3.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.2;0" dur="3.5s" repeatCount="indefinite"/></circle>
                                <circle cx="174" cy="20" r="3.5" fill="rgba(200,200,200,0.3)"><animate attributeName="cy" values="20;6;-8" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.15;0" dur="4s" repeatCount="indefinite"/></circle>
                                <!-- Windows with warm glow -->
                                <rect x="46" y="104" width="34" height="34" rx="3" fill="#87CEEB" stroke="#8B6914" stroke-width="2.5"/>
                                <line x1="63" y1="104" x2="63" y2="138" stroke="#8B6914" stroke-width="2"/>
                                <line x1="46" y1="121" x2="80" y2="121" stroke="#8B6914" stroke-width="2"/>
                                <rect x="46" y="104" width="34" height="34" rx="3" fill="rgba(255,220,100,0.15)"/>
                                <rect x="158" y="104" width="34" height="34" rx="3" fill="#87CEEB" stroke="#8B6914" stroke-width="2.5"/>
                                <line x1="175" y1="104" x2="175" y2="138" stroke="#8B6914" stroke-width="2"/>
                                <line x1="158" y1="121" x2="192" y2="121" stroke="#8B6914" stroke-width="2"/>
                                <rect x="158" y="104" width="34" height="34" rx="3" fill="rgba(255,220,100,0.15)"/>
                                <!-- Door -->
                                <rect x="93" y="138" width="54" height="58" rx="4" fill="#6B4410"/>
                                <rect x="97" y="142" width="46" height="52" rx="3" fill="#8B5E14"/>
                                <path d="M93,138 Q120,124 147,138" fill="#5A3A0C" opacity="0.4"/>
                                <circle cx="135" cy="170" r="3.5" fill="#DAA520"/><circle cx="135" cy="170" r="2" fill="#FFD700"/>
                                <!-- Window boxes with flowers -->
                                <rect x="46" y="138" width="34" height="6" rx="1" fill="#6B4410"/>
                                <circle cx="52" cy="136" r="4" fill="#FF6B8A"/><circle cx="63" cy="135" r="3.5" fill="#FFD700"/><circle cx="74" cy="136" r="4" fill="#FF8FAA"/>
                                <rect x="158" y="138" width="34" height="6" rx="1" fill="#6B4410"/>
                                <circle cx="164" cy="136" r="4" fill="#FFD700"/><circle cx="175" cy="135" r="3.5" fill="#FF6B8A"/><circle cx="186" cy="136" r="4" fill="#FFD700"/>
                                <!-- Lantern -->
                                <rect x="84" y="144" width="6" height="14" rx="1" fill="#DAA520"/>
                                <circle cx="87" cy="141" r="5" fill="rgba(255,200,50,0.6)"><animate attributeName="opacity" values="0.35;0.75;0.35" dur="2.5s" repeatCount="indefinite"/></circle>
                            </svg>
                            <div class="hut-label">\u{1F3E0} 小屋</div>
                        </div>

                        <div class="boom-harbor" id="harbor-building" style="left:92%;top:79%" title="港口 — 点击管理">
                            <span class="harbor-icon">\u26F5</span>
                            <div class="hut-label">\u2693 港口</div>
                        </div>

                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:10%;top:86%;width:78px;opacity:0.94">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:16%;top:83%;width:56px;opacity:0.78">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:24%;top:88%;width:50px;opacity:0.72">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:89%;top:83%;width:62px;opacity:0.88">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:84%;top:86%;width:44px;opacity:0.70">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:52%;top:29%;width:40px;opacity:0.50">
                        <img class="deco-palm" src="/img/trees/palm.svg" style="left:36%;top:31%;width:36px;opacity:0.44">
                        <img class="deco-rock" src="/img/trees/obstacle_rock.svg" alt="" style="left:18%;top:82%;width:74px;opacity:0.78">
                        <img class="deco-rock" src="/img/trees/obstacle_rock.svg" alt="" style="left:83%;top:58%;width:58px;opacity:0.58">
                        <img class="deco-rock" src="/img/trees/obstacle_rock.svg" alt="" style="left:68%;top:26%;width:46px;opacity:0.44">
                        <img class="deco-rock" src="/img/trees/obstacle_rock.svg" alt="" style="left:30%;top:80%;width:38px;opacity:0.50">

                        <div class="ambient-particle p1" style="font-size:12px">\u{1F54A}\uFE0F</div>
                        <div class="ambient-particle p3" style="font-size:11px">\u{1F54A}\uFE0F</div>
                        <div class="ambient-particle p2">\u{1F343}</div>
                        <div class="ambient-particle p4">\u{1F98B}</div>
                        <div class="ambient-particle p5" style="font-size:9px">\u{1F343}</div>

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
        this._bindPlotInteractions(el);
        this.initDrag();
        this._staticRendered = true;
        this._renderSignature = renderSignature;
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

        this._applyTransform(world);

        requestAnimationFrame(() => {
            this._centerViewport(vp, world);
        });

        vp.addEventListener('scroll', () => {
            this._clampViewport(vp, world);
            if (this._activePlotMenu?.menuEl && this._activePlotMenu?.plotEl) {
                this._positionPlotMenu(this._activePlotMenu.menuEl, this._activePlotMenu.plotEl);
            }
        }, { passive: true });

        vp.addEventListener('mousedown', e => {
            if (e.target.closest('.iplot,.boom-house,.boom-harbor,.zoom-controls,.plot-menu')) return;
            this.closePlotMenu();
            dragState.active = true;
            dragState.sx = e.pageX;
            dragState.sy = e.pageY;
            dragState.sl = vp.scrollLeft;
            dragState.st = vp.scrollTop;
            vp.style.cursor = 'grabbing';
        });

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

        if (!this._zoomRaf) this._zoomRaf = null;
        const scheduleViewportSync = () => {
            if (this._zoomRaf) cancelAnimationFrame(this._zoomRaf);
            this._zoomRaf = requestAnimationFrame(() => {
                this._clampViewport(vp, world);
                if (this._activePlotMenu?.menuEl && this._activePlotMenu?.plotEl) {
                    this._positionPlotMenu(this._activePlotMenu.menuEl, this._activePlotMenu.plotEl);
                }
                this._zoomRaf = null;
            });
        };

        vp.addEventListener('wheel', e => {
            e.preventDefault();
            this.closePlotMenu();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, this._zoom + delta));
            this._applyTransform(world);
            this._updateZoomDisplay();
            scheduleViewportSync();
        }, { passive: false });

        let lastPinchDist = 0;
        let pinching = false;

        vp.addEventListener('touchstart', e => {
            if (e.touches.length === 2) {
                this.closePlotMenu();
                pinching = true;
                dragState.active = false;
                lastPinchDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            } else if (e.touches.length === 1 && !pinching) {
                if (e.target.closest('.iplot,.boom-house,.boom-harbor,.zoom-controls,.plot-menu')) return;
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
                scheduleViewportSync();
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

        document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this._zoom = Math.min(this._maxZoom, this._zoom + 0.15);
            this._applyTransform(world);
            this._updateZoomDisplay();
            scheduleViewportSync();
        });
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this._zoom = Math.max(this._minZoom, this._zoom - 0.15);
            this._applyTransform(world);
            this._updateZoomDisplay();
            scheduleViewportSync();
        });
        document.getElementById('zoom-reset-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this._zoom = 1;
            this._applyTransform(world);
            this._updateZoomDisplay();
            requestAnimationFrame(() => {
                this._centerViewport(vp, world);
                if (this._activePlotMenu?.menuEl && this._activePlotMenu?.plotEl) {
                    this._positionPlotMenu(this._activePlotMenu.menuEl, this._activePlotMenu.plotEl);
                }
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
                <span>正在种植: <strong>${item.name}</strong> · 点击空地立即种下</span>
                <button class="btn-cancel-plant" id="cancel-plant-btn">✕ 取消</button>
            </div>
        `;
    },

    bindGardenEvents() {
        document.querySelectorAll('#view-garden .filter-pill').forEach(btn => {
            btn.addEventListener('click', async () => {
                App.setPersona(btn.dataset.person, { refresh: false });
                this.assignee = btn.dataset.person;
                this.currentIsland = null;
                this._staticRendered = false;
                await this.open();
            });
        });

        document.getElementById('garden-backpack-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this.showBackpack(this.assignee);
        });

        document.getElementById('garden-history-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this.showHistory();
        });

        document.getElementById('world-map-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this.showWorldMap();
        });

        document.getElementById('harbor-building')?.addEventListener('click', () => {
            this.closePlotMenu();
            this.showHarborPanel();
        });

        document.getElementById('cancel-plant-btn')?.addEventListener('click', () => {
            this.selectedTree = null;
            this._updateDynamicContent();
        });

        document.getElementById('island-viewport')?.addEventListener('click', (e) => {
            if (!e.target.closest('.plot-menu') && !e.target.closest('.iplot')) {
                this.closePlotMenu();
            }
        });
    },

    _movingPlotId: null,

    showPlotMenu(plotId, plotEl) {
        this.closePlotMenu();
        const plot = this.plots.find(p => p.id === plotId);
        if (!plot) return;

        const catItem = this.catalog.find(c => c.type === plot.tree_type);
        const gm = plot.growth_minutes || 0;
        const harvestedToday = plot.last_harvested === this._todayString();
        const canCollect = gm >= 150 && !harvestedToday;

        const menu = document.createElement('div');
        menu.className = 'plot-menu';
        menu.innerHTML = `
            <div class="plot-menu-header">
                <span>${catItem?.icon || '🌱'}</span>
                <strong>${catItem?.name || plot.tree_type}</strong>
                <small>${harvestedToday ? '今日已收' : this.getGrowthLabel(gm)}</small>
            </div>
            <div class="plot-menu-actions">
                <button class="pm-btn pm-collect ${canCollect ? '' : 'disabled'}" data-action="collect" title="收取金币">
                    💰
                    <span>${harvestedToday ? '已收' : '收取'}</span>
                </button>
                <button class="pm-btn pm-speedup ${gm >= 150 ? 'disabled' : ''}" data-action="speedup" title="花费 5 喵喵币加速">
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

        menu.style.position = 'fixed';

        document.body.appendChild(menu);
        this._positionPlotMenu(menu, plotEl);
        this._activePlotMenu = { plotId, plotEl, menuEl: menu };

        const outsideHandler = (e) => {
            if (e.target.closest('.plot-menu')) return;
            if (e.target.closest(`.iplot[data-plot-id="${plotId}"]`)) return;
            this.closePlotMenu();
        };
        const viewportChangeHandler = () => {
            const livePlotEl = document.querySelector(`.iplot[data-plot-id="${plotId}"]`);
            if (!livePlotEl || !document.body.contains(menu)) {
                this.closePlotMenu();
                return;
            }
            this._activePlotMenu = { plotId, plotEl: livePlotEl, menuEl: menu };
            this._positionPlotMenu(menu, livePlotEl);
        };
        const viewport = document.getElementById('island-viewport');
        document.addEventListener('mousedown', outsideHandler, true);
        window.addEventListener('resize', viewportChangeHandler);
        viewport?.addEventListener('scroll', viewportChangeHandler, { passive: true });
        this._plotMenuCleanup = () => {
            document.removeEventListener('mousedown', outsideHandler, true);
            window.removeEventListener('resize', viewportChangeHandler);
            viewport?.removeEventListener('scroll', viewportChangeHandler);
            this._activePlotMenu = null;
            this._plotMenuCleanup = null;
        };

        menu.querySelectorAll('.pm-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'collect') await this.collectPlot(plotId);
                else if (action === 'remove') await this.removePlot(plotId);
                else if (action === 'move') this.startMovePlot(plotId);
                else if (action === 'speedup') await this.speedupPlot(plotId);
                else if (action === 'items') App.showToast('🧪 道具功能即将上线！');
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
            const data = await API.harvestTree({ assignee: this.assignee, tree_id: plot.tree_id });
            App.syncCoins({ assignee: this.assignee, balance: data.balance, delta: data.reward, animate: data.reward > 0 });
            this.balance = data.balance;
            this._patchPlot(plotId, { last_harvested: this._todayString() });
            this._updateDynamicContent();
            this._flashPlot(plotId, 'plot-harvested');
            App.showToast(`💰 收获 ${data.reward} 喵喵币！`, 'success');
        } catch (e) { App.showToast(e.message || '收取失败'); }
    },

    async removePlot(plotId) {
        this.closePlotMenu();
        const plot = this.plots.find(p => p.id === plotId);
        const catItem = this.catalog.find(c => c.type === plot?.tree_type);
        if (!confirm(`确定要铲除 ${catItem?.name || '这株植物'} 吗？\n（不会返还喵喵币）`)) return;
        try {
            const res = await API.fetch('/garden/plots/remove', {
                method: 'POST',
                body: JSON.stringify({ assignee: this.assignee, plot_id: plotId })
            });
            const data = await res.json();
            if (!res.ok) { App.showToast(data.error || '铲除失败'); return; }
            App.showToast('🗑️ 已铲除', 'success');
            this._staticRendered = false;
            await this.open();
        } catch (e) { App.showToast('网络错误'); }
    },

    startMovePlot(plotId) {
        this.closePlotMenu();
        this._movingPlotId = plotId;
        document.querySelectorAll('.iplot.cleared').forEach(el => {
            el.classList.add('move-target');
        });
        App.showToast('🔄 点击一个空地块来移动植物', 'info');
    },

    async executeMoveToPlot(targetPlotId) {
        if (!this._movingPlotId) return;
        try {
            const res = await API.fetch('/garden/plots/move', {
                method: 'POST',
                body: JSON.stringify({
                    assignee: this.assignee,
                    from_plot_id: this._movingPlotId,
                    to_plot_id: targetPlotId
                })
            });
            const data = await res.json();
            if (!res.ok) { App.showToast(data.error || '移动失败'); return; }
            App.showToast('🔄 移动成功！', 'success');
            this._movingPlotId = null;
            this._staticRendered = false;
            await this.open();
        } catch (e) { App.showToast('网络错误'); }
    },

    async speedupPlot(plotId) {
        this.closePlotMenu();
        try {
            const res = await API.fetch('/garden/plots/speedup', {
                method: 'POST',
                body: JSON.stringify({ assignee: this.assignee, plot_id: plotId })
            });
            const data = await res.json();
            if (!res.ok) { App.showToast(data.error || '加速失败'); return; }
            App.syncCoins({ assignee: this.assignee, balance: data.balance });
            App.showToast(`⏩ 加速成功！花费 ${data.cost} 喵喵币`, 'success');
            this._staticRendered = false;
            await this.open();
        } catch (e) { App.showToast('网络错误'); }
    },

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
                const id = parseInt(node.dataset.islandId, 10);
                const island = this.islands.find(i => i.id === id);
                if (island && island.discovered) {
                    this.currentIsland = island;
                    overlay.remove();
                    await this.open();
                }
            });
        });
    },

    async showHarborPanel() {
        try {
            const bd = await API.fetch(`/garden/boats/${encodeURIComponent(this.assignee)}`).then(r => r.json());
            this.boats = bd.boats || [];
        } catch (e) { /* keep */ }
        try {
            this.expeditions = await API.fetch(`/garden/expeditions/${encodeURIComponent(this.assignee)}`).then(r => r.json());
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
        p.querySelectorAll('[data-sail]').forEach(b => b.addEventListener('click', async () => { await this.startExpedition(parseInt(b.dataset.sail, 10)); p.remove(); }));
    },

    async buyBoat(type) {
        try {
            const r = await API.fetch('/garden/boats/buy', { method: 'POST', body: JSON.stringify({ assignee: this.assignee, boat_type: type }) }).then(r => { if (!r.ok) throw r; return r.json(); });
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
            const r = await API.fetch('/garden/expeditions/start', { method: 'POST', body: JSON.stringify({ assignee: this.assignee, boat_id: boatId }) }).then(r => { if (!r.ok) throw r; return r.json(); });
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
            this.balance = result.balance;
            this._patchPlot(plotId, {
                status: 'cleared',
                obstacle_type: null,
                tree_id: null,
                tree_type: null,
                growth_minutes: 0,
                tree_status: null,
                planted_at: null,
                last_harvested: null,
            });
            this._updateDynamicContent();
            this._flashPlot(plotId, 'plot-cleared');
            const followup = this.selectedTree ? ' 现在点这块空地就能种下去。' : ' 现在它已经是可种植空地了。';
            App.showToast(`⛏️ 开荒成功！-${result.cost} 喵喵币。${followup}`, 'success');
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
            this.balance = result.balance;
            this._patchPlot(plotId, {
                status: 'planted',
                tree_id: result.tree.id,
                tree_type: result.tree.tree_type,
                growth_minutes: result.tree.growth_minutes || 0,
                tree_status: result.tree.status,
                planted_at: result.tree.planted_at,
                last_harvested: result.tree.last_harvested || null,
                obstacle_type: null,
            });
            this.selectedTree = null;
            this._updateDynamicContent();
            this._flashPlot(plotId, 'plot-planted');
            App.showToast(`🌱 种下了${item.name}！`, 'success');
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
});
