/* ── Garden Island View Extensions ── */
Object.assign(GardenView, {
    /* ═══════════════════════════════
       GARDEN VIEW (rectangular island layout)
       ═══════════════════════════════ */
    async open() {
        const el = document.getElementById('view-garden');
        if (!el) return;

        // If we already have a rendered island, show it immediately
        // while we refresh data in the background
        const hasCachedView = this._staticRendered && el.innerHTML.trim().length > 0;

        // Fetch all data in parallel instead of sequential awaits
        const [balanceResult, islandsResult] = await Promise.allSettled([
            API.getCoins(this.assignee),
            API.fetch(`/garden/islands/${encodeURIComponent(this.assignee)}`).then(r => r.json()),
        ]);

        if (balanceResult.status === 'fulfilled') {
            this.balance = balanceResult.value.balance;
        }
        if (islandsResult.status === 'fulfilled') {
            this.islands = islandsResult.value;
            if (!this.currentIsland) {
                this.currentIsland = this.islands.find(i => i.island_type === 'starter') || this.islands[0];
            }
        } else {
            this.islands = this.islands.length ? this.islands : [];
        }

        // Second parallel batch (depends on currentIsland from first batch)
        const [plotsResult, boatsResult, expResult] = await Promise.allSettled([
            this.currentIsland
                ? API.fetch(`/garden/plots/${encodeURIComponent(this.assignee)}/${this.currentIsland.id}`).then(r => r.json())
                : API.getPlots(this.assignee),
            API.fetch(`/garden/boats/${encodeURIComponent(this.assignee)}`).then(r => r.json()),
            API.fetch(`/garden/expeditions/${encodeURIComponent(this.assignee)}`).then(r => r.json()),
        ]);

        if (plotsResult.status === 'fulfilled') this.plots = plotsResult.value;
        else if (!this.plots.length) this.plots = [];

        if (boatsResult.status === 'fulfilled') this.boats = boatsResult.value.boats || [];
        else if (!this.boats.length) this.boats = [];

        if (expResult.status === 'fulfilled') this.expeditions = expResult.value;
        else if (!this.expeditions.length) this.expeditions = [];

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
                    <img class="island-shape" src="/img/island-bg.png" alt="" draggable="false">

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
    _minZoom: 0.5,
    _maxZoom: 2.6,

    initDrag() {
        const vp = document.getElementById('island-viewport');
        const world = document.getElementById('island-world');
        if (!vp || !world) return;
        if (!this._dragState) {
            this._dragState = { active: false, sx: 0, sy: 0, px: 0, py: 0 };
        }
        const dragState = this._dragState;

        // Initial center
        requestAnimationFrame(() => {
            this._centerViewport(vp, world);
        });

        // ── Mouse drag ──
        vp.addEventListener('mousedown', e => {
            if (e.target.closest('.iplot,.boom-house,.boom-harbor,.zoom-controls,.plot-menu')) return;
            this.closePlotMenu();
            dragState.active = true;
            dragState.sx = e.pageX;
            dragState.sy = e.pageY;
            dragState.px = this._panX;
            dragState.py = this._panY;
            vp.style.cursor = 'grabbing';
        });

        if (!this._dragInitialized) {
            this._dragInitialized = true;
            document.addEventListener('mousemove', e => {
                if (!this._dragState?.active) return;
                e.preventDefault();
                const worldEl = document.getElementById('island-world');
                const vpEl = document.getElementById('island-viewport');
                if (!worldEl || !vpEl) return;
                this._panX = this._dragState.px + (e.pageX - this._dragState.sx);
                this._panY = this._dragState.py + (e.pageY - this._dragState.sy);
                this._clampPan(vpEl, worldEl);
                this._applyWorldTransform(worldEl);
            });
            document.addEventListener('mouseup', () => {
                if (this._dragState) this._dragState.active = false;
                const vpEl = document.getElementById('island-viewport');
                if (vpEl) vpEl.style.cursor = 'grab';
            });
        }

        // ── Wheel zoom ──
        vp.addEventListener('wheel', e => {
            e.preventDefault();
            this.closePlotMenu();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, this._zoom + delta));
            this._clampPan(vp, world);
            this._applyWorldTransform(world);
            this._updateZoomDisplay();
        }, { passive: false });

        // ── Touch drag & pinch zoom ──
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
                dragState.px = this._panX;
                dragState.py = this._panY;
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
                this._clampPan(vp, world);
                this._applyWorldTransform(world);
                this._updateZoomDisplay();
                lastPinchDist = dist;
            } else if (dragState.active && e.touches.length === 1) {
                this._panX = dragState.px + (e.touches[0].pageX - dragState.sx);
                this._panY = dragState.py + (e.touches[0].pageY - dragState.sy);
                this._clampPan(vp, world);
                this._applyWorldTransform(world);
            }
        }, { passive: true });

        vp.addEventListener('touchend', e => {
            if (e.touches.length < 2) pinching = false;
            if (e.touches.length === 0) dragState.active = false;
        });

        // ── Zoom buttons ──
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this._zoom = Math.min(this._maxZoom, this._zoom + 0.15);
            this._clampPan(vp, world);
            this._applyWorldTransform(world);
            this._updateZoomDisplay();
        });
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this._zoom = Math.max(this._minZoom, this._zoom - 0.15);
            this._clampPan(vp, world);
            this._applyWorldTransform(world);
            this._updateZoomDisplay();
        });
        document.getElementById('zoom-reset-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this._zoom = 1;
            this._centerViewport(vp, world);
            this._updateZoomDisplay();
        });
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
