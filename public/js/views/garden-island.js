/* ── Garden Island View Extensions ── */
Object.assign(GardenView, {
    /* ═══════════════════════════════
       GARDEN VIEW (rectangular island layout)
       ═══════════════════════════════ */
    async open() {
        const el = document.getElementById('view-garden');
        if (!el) return;

        // Single consolidated API call instead of 5 separate requests
        try {
            const islandParam = this.currentIsland ? `?island=${this.currentIsland.id}` : '';
            const data = await API.fetch(`/garden/all/${encodeURIComponent(this.assignee)}${islandParam}`).then(r => r.json());

            this.balance = data.balance ?? 0;
            this.islands = data.islands ?? [];
            this.boats = data.boats ?? [];
            this.expeditions = data.expeditions ?? [];

            if (!this.currentIsland) {
                this.currentIsland = this.islands.find(i => i.island_type === 'starter') || this.islands[0];
            }

            this.plots = data.plots ?? [];
            this._syncCurrentIslandGridFromPlots();
        } catch (e) {
            console.error('Garden load error:', e);
            // Keep existing data on error
        }

        this.render();
        this.updateHeaderCoins();
    },

    renderBackdropDecor() {
        return `
            <div class="scene-nearshore" aria-hidden="true">
                <span class="shore-palm shore-palm-left"></span>
                <span class="shore-palm shore-palm-left small"></span>
                <span class="shore-palm shore-palm-right"></span>
                <span class="shore-palm shore-palm-right small"></span>
                <span class="shore-rock shore-rock-left"></span>
                <span class="shore-rock shore-rock-right"></span>
                <span class="nearshore-foam foam-1"></span>
                <span class="nearshore-foam foam-2"></span>
                <span class="nearshore-foam foam-3"></span>
            </div>
            <button class="island-harbor scene-harbor" id="scene-harbor-btn" type="button" title="港口">
                <span class="harbor-building"></span>
                <span class="harbor-label">港口</span>
            </button>
        `;
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
                    <button class="hud-btn" id="world-map-btn" title="世界地图" style="font-size:14px">\u{1F5FA}\uFE0F</button>
                    <button class="hud-btn" id="garden-harbor-btn" title="港口">\u26F5</button>
                </div>
            </div>

            <div class="island-viewport" id="island-viewport">
                <div class="island-world" id="island-world">
                    <img class="scene-backdrop" src="/img/boom_beach_island_bg_v2.png" alt="" draggable="false">
                    <div class="scene-sea-glow"></div>
                    <div class="scene-surf scene-surf-1"></div>
                    <div class="scene-surf scene-surf-2"></div>
                    <div class="scene-surf scene-surf-3"></div>
                    ${this.renderBackdropDecor()}

                    <div class="island-land" id="island-land">
                        <div class="scene-land-shadow"></div>

                        ${this._renderGroundDecor()}
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
        removeWhiteBg(el);
        this._staticRendered = true;
        this._renderSignature = renderSignature;
    },

    renderIslandPlot(plot, layout) {
        const { left, top, zone, scale, zIndex, tilt, sway, spriteScale, depth } = layout || {};
        const isSelected = this._selectedPlotId === plot.id;
        const style = [
            `left:${left ?? 50}%`,
            `top:${top ?? 60}%`,
            `--plot-scale:${scale ?? 1}`,
            `--plot-tilt:${tilt ?? 0}deg`,
            `--plot-sway:${sway ?? 1}`,
            `--plot-sprite-scale:${spriteScale ?? 1}`,
            `--plot-depth:${depth ?? 0}`,
            `z-index:${zIndex ?? 8}`,
        ].join(';');
        const zoneClass = zone ? `zone-${zone}` : '';
        if (plot.status === 'wasteland') {
            const obs = this.getObstacleVisual(plot);
            /* Wasteland: show obstacle image; when selected show clear button */
            return `<div class="iplot wasteland ${zoneClass} obstacle-${plot.obstacle_type || 'rock'} ${isSelected ? 'selected' : ''}" data-zone="${zone || ''}" data-plot-id="${plot.id}" style="${style}" title="">
                <img src="${obs.img}" alt="${obs.name}" class="iplot-img">
                ${isSelected ? `<button class="iplot-action" data-action="clear" title="开荒">⛏️</button>` : ''}
            </div>`;
        }
        if (plot.status === 'cleared') {
            const sel = this.selectedTree;
            return `<div class="iplot cleared ${zoneClass} ${sel ? 'plantable' : ''} ${isSelected ? 'selected' : ''}" data-zone="${zone || ''}" data-plot-id="${plot.id}" style="${style}" title="">
                <img src="/img/garden/tilled_land.png?v=4" alt="" class="iplot-tilled">
                ${isSelected && sel ? '<button class="iplot-action" data-action="plant" title="">🌱</button>' : ''}
            </div>`;
        }
        const catItem = this.catalog.find(c => c.type === plot.tree_type);
        const gm = plot.growth_minutes || 0;
        const stage = this.getGrowthStage(gm);
        const pct = Math.min(100, Math.round(gm / 150 * 100));
        let imgSrc = catItem?.stages?.[stage] || '/img/trees/seed.png';
        return `<div class="iplot planted ${zoneClass} stage-${stage} ${isSelected ? 'selected' : ''}" data-zone="${zone || ''}" data-plot-id="${plot.id}" style="${style}" title="">
            <img src="${imgSrc}" alt="" class="iplot-img">
            <div class="iplot-bar"><div class="iplot-bar-fill" style="width:${pct}%"></div></div>
            ${isSelected ? '<button class="iplot-action" data-action="menu" title="">⋯</button>' : ''}
        </div>`;
    },

    _zoom: 1,
    _minZoom: 0.5,
    _maxZoom: 2.6,

    initDrag() {
        const vp = document.getElementById('island-viewport');
        const world = document.getElementById('island-world');
        if (!vp || !world) return;
        if (!this._dragState) {
            this._dragState = { active: false, sx: 0, sy: 0, px: 0, py: 0, lastX: 0, lastY: 0, lastT: 0, vx: 0, vy: 0 };
        }
        const dragState = this._dragState;
        const stopInertia = () => {
            if (this._inertiaFrame) {
                cancelAnimationFrame(this._inertiaFrame);
                this._inertiaFrame = null;
            }
        };
        const startInertia = () => {
            stopInertia();
            let vx = dragState.vx || 0;
            let vy = dragState.vy || 0;
            const step = () => {
                const liveWorld = document.getElementById('island-world');
                const liveViewport = document.getElementById('island-viewport');
                if (!liveWorld || !liveViewport) {
                    this._inertiaFrame = null;
                    return;
                }
                vx *= 0.92;
                vy *= 0.92;
                if (Math.abs(vx) < 0.18 && Math.abs(vy) < 0.18) {
                    this._inertiaFrame = null;
                    return;
                }
                this._panX += vx;
                this._panY += vy;
                this._clampPan(liveViewport, liveWorld);
                this._applyWorldTransform(liveWorld);
                this._inertiaFrame = requestAnimationFrame(step);
            };
            if (Math.abs(vx) > 0.18 || Math.abs(vy) > 0.18) {
                this._inertiaFrame = requestAnimationFrame(step);
            }
        };
        const trackVelocity = (pageX, pageY) => {
            const now = performance.now();
            if (dragState.lastT) {
                const dt = Math.max(1, now - dragState.lastT);
                const instantVX = (pageX - dragState.lastX) / dt * 16;
                const instantVY = (pageY - dragState.lastY) / dt * 16;
                dragState.vx = dragState.vx * 0.45 + instantVX * 0.55;
                dragState.vy = dragState.vy * 0.45 + instantVY * 0.55;
            }
            dragState.lastX = pageX;
            dragState.lastY = pageY;
            dragState.lastT = now;
        };

        // Initial center
        requestAnimationFrame(() => {
            this._centerViewport(vp, world);
            this._updateZoomDisplay();
        });

        if (!this._viewportResizeBound) {
            this._viewportResizeBound = true;
            window.addEventListener('resize', () => {
                const liveViewport = document.getElementById('island-viewport');
                const liveWorld = document.getElementById('island-world');
                if (!liveViewport || !liveWorld) return;
                this._clampPan(liveViewport, liveWorld);
                this._applyWorldTransform(liveWorld);
                this._updateZoomDisplay();
            });
        }

        // ── Mouse drag ──
        vp.addEventListener('mousedown', e => {
            if (e.target.closest('.iplot,.zoom-controls,.plot-menu,.island-harbor')) return;
            this.closePlotMenu();
            stopInertia();
            dragState.active = true;
            dragState.sx = e.pageX;
            dragState.sy = e.pageY;
            dragState.px = this._panX;
            dragState.py = this._panY;
            dragState.lastX = e.pageX;
            dragState.lastY = e.pageY;
            dragState.lastT = performance.now();
            dragState.vx = 0;
            dragState.vy = 0;
            vp.style.cursor = 'grabbing';
        });

        if (!this._dragInitialized) {
            this._dragInitialized = true;
            document.addEventListener('mousemove', e => {
                if (!this._dragState?.active) return;
                e.preventDefault();
                // Buffer the position — only commit to DOM on next animation frame
                this._dragState._pendingX = this._dragState.px + (e.pageX - this._dragState.sx);
                this._dragState._pendingY = this._dragState.py + (e.pageY - this._dragState.sy);
                trackVelocity(e.pageX, e.pageY);
                if (!this._dragRafPending) {
                    this._dragRafPending = true;
                    requestAnimationFrame(() => {
                        this._dragRafPending = false;
                        if (!this._dragState?.active) return;
                        const worldEl = document.getElementById('island-world');
                        const vpEl = document.getElementById('island-viewport');
                        if (!worldEl || !vpEl) return;
                        this._panX = this._dragState._pendingX;
                        this._panY = this._dragState._pendingY;
                        this._clampPan(vpEl, worldEl);
                        this._applyWorldTransform(worldEl);
                    });
                }
            });
            document.addEventListener('mouseup', () => {
                const shouldGlide = !!(this._dragState?.active && (Math.abs(this._dragState.vx) > 0.18 || Math.abs(this._dragState.vy) > 0.18));
                if (this._dragState) this._dragState.active = false;
                const vpEl = document.getElementById('island-viewport');
                if (vpEl) vpEl.style.cursor = 'grab';
                if (shouldGlide) startInertia();
            });
        }

        // ── Wheel zoom ──
        vp.addEventListener('wheel', e => {
            e.preventDefault();
            this.closePlotMenu();
            stopInertia();
            const factor = e.deltaY > 0 ? 0.92 : 1.08;
            this._zoomAtPoint(vp, world, this._zoom * factor, e.clientX, e.clientY);
            this._updateZoomDisplay();
        }, { passive: false });

        // ── Touch drag & pinch zoom ──
        let lastPinchDist = 0;
        let pinching = false;

        vp.addEventListener('touchstart', e => {
            if (e.touches.length === 2) {
                this.closePlotMenu();
                stopInertia();
                pinching = true;
                dragState.active = false;
                lastPinchDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            } else if (e.touches.length === 1 && !pinching) {
                if (e.target.closest('.iplot,.zoom-controls,.plot-menu,.island-harbor')) return;
                this.closePlotMenu();
                stopInertia();
                dragState.active = true;
                dragState.sx = e.touches[0].pageX;
                dragState.sy = e.touches[0].pageY;
                dragState.px = this._panX;
                dragState.py = this._panY;
                dragState.lastX = e.touches[0].pageX;
                dragState.lastY = e.touches[0].pageY;
                dragState.lastT = performance.now();
                dragState.vx = 0;
                dragState.vy = 0;
            }
        }, { passive: true });

        vp.addEventListener('touchmove', e => {
            if (pinching && e.touches.length === 2) {
                e.preventDefault();
                const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const nextZoom = lastPinchDist ? this._zoom * (dist / lastPinchDist) : this._zoom;
                this._zoomAtPoint(vp, world, nextZoom, centerX, centerY);
                this._updateZoomDisplay();
                lastPinchDist = dist;
            } else if (dragState.active && e.touches.length === 1) {
                e.preventDefault();
                dragState._pendingX = dragState.px + (e.touches[0].pageX - dragState.sx);
                dragState._pendingY = dragState.py + (e.touches[0].pageY - dragState.sy);
                trackVelocity(e.touches[0].pageX, e.touches[0].pageY);
                if (!this._dragRafPending) {
                    this._dragRafPending = true;
                    requestAnimationFrame(() => {
                        this._dragRafPending = false;
                        if (!dragState.active) return;
                        this._panX = dragState._pendingX;
                        this._panY = dragState._pendingY;
                        this._clampPan(vp, world);
                        this._applyWorldTransform(world);
                    });
                }
            }
        }, { passive: false });

        vp.addEventListener('touchend', e => {
            if (e.touches.length < 2) pinching = false;
            if (e.touches.length === 0) {
                const shouldGlide = dragState.active && (Math.abs(dragState.vx) > 0.18 || Math.abs(dragState.vy) > 0.18);
                dragState.active = false;
                if (shouldGlide) startInertia();
            }
        });

        // ── Zoom buttons ──
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            const rect = vp.getBoundingClientRect();
            this._zoomAtPoint(vp, world, this._zoom + 0.15, rect.left + rect.width / 2, rect.top + rect.height / 2);
            this._updateZoomDisplay();
        });
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            const rect = vp.getBoundingClientRect();
            this._zoomAtPoint(vp, world, this._zoom - 0.15, rect.left + rect.width / 2, rect.top + rect.height / 2);
            this._updateZoomDisplay();
        });
        document.getElementById('zoom-reset-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
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



        document.getElementById('world-map-btn')?.addEventListener('click', () => {
            this.closePlotMenu();
            this.showWorldMap();
        });

        const openHarbor = () => {
            this.closePlotMenu();
            this.showHarborPanel();
        };

        document.getElementById('garden-harbor-btn')?.addEventListener('click', openHarbor);
        document.getElementById('scene-harbor-btn')?.addEventListener('click', openHarbor);

        document.getElementById('cancel-plant-btn')?.addEventListener('click', () => {
            this.selectedTree = null;
            this._updateDynamicContent();
        });

        document.getElementById('island-viewport')?.addEventListener('click', (e) => {
            if (!e.target.closest('.plot-menu') && !e.target.closest('.iplot')) {
                this.closePlotMenu();
                if (this._selectedPlotId != null) {
                    this._selectedPlotId = null;
                    this._updateDynamicContent();
                }
            }
        });
    },

    _movingPlotId: null,

    showWastelandMenu(plotId, plotEl) {
        this.closePlotMenu();
        this._selectedPlotId = plotId;
        const plot = this.plots.find(p => p.id === plotId);
        if (!plot) return;

        const obs = this.getObstacleVisual(plot);
        const glyph = plot.obstacle_type === 'wild_tree' ? '🪓' : '⛏';

        const menu = document.createElement('div');
        menu.className = 'plot-menu wasteland-menu';
        menu.innerHTML = `
            <div class="plot-menu-header">
                <img src="${obs.img}" alt="" class="wasteland-menu-img">
                <strong>${obs.name}</strong>
                <small>清除费用: ${obs.cost} 喵喵币</small>
            </div>
            <div class="plot-menu-actions">
                <button class="pm-btn pm-clear" data-action="clear" title="清除">
                    ${glyph}
                    <span>开荒<br><small>${obs.cost}币</small></span>
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
        document.addEventListener('mousedown', outsideHandler, true);
        this._plotMenuCleanup = () => {
            document.removeEventListener('mousedown', outsideHandler, true);
            this._activePlotMenu = null;
            this._plotMenuCleanup = null;
        };

        menu.querySelector('.pm-clear')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.clearPlot(plotId, plot.obstacle_type);
        });
    },

    showPlotMenu(plotId, plotEl) {
        this.closePlotMenu();
        this._selectedPlotId = plotId;
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
            this._selectedPlotId = null;
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
            this._selectedPlotId = null;
            this.selectedTree = null;
            this._updateDynamicContent();
            this._flashPlot(plotId, 'plot-planted');
            App.showToast(`🌱 种下了${item.name}！`, 'success');
        } catch (e) {
            App.showToast(e.message || '种植失败', 'error');
        }
    },
    _renderGroundDecor() {
        const islandId = Number(this.currentIsland?.id) || 1;
        const DECOR_ITEMS = ['🌾', '🌿', '🍃', '🌼', '🍀', '🌸', '🍄', '🌻', '🦋', '💮', '☘️', '🪻'];
        const COUNT = 20;
        let html = '';
        /* ── Emoji scatter ── */
        for (let i = 0; i < COUNT; i++) {
            const seed  = Math.sin((i + 1) * 127.1 + islandId * 311.7) * 43758.5453;
            const n  = seed  - Math.floor(seed);
            const seed2 = Math.sin((i + 1) * 269.3 + islandId * 183.1) * 29387.2137;
            const n2 = seed2 - Math.floor(seed2);
            const seed3 = Math.sin((i + 1) * 419.7 + islandId * 97.3)  * 17291.8413;
            const n3 = seed3 - Math.floor(seed3);
            const left = 4 + n * 92;       // 4%–96%
            const top  = 8 + n2 * 82;      // 8%–90%
            const emoji = DECOR_ITEMS[Math.floor(n3 * DECOR_ITEMS.length)];
            const size = 18 + Math.floor(n * 20);   // 18–38px
            const opacity = 0.45 + n2 * 0.35;       // 0.45–0.80
            const rotate = Math.floor((n3 - 0.5) * 50); // ±25°
            const delay = (n * 6).toFixed(1);
            html += `<span class="ground-decor ground-decor-${i % 4}" style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;font-size:${size}px;opacity:${opacity.toFixed(2)};--gd-rotate:${rotate}deg;animation-delay:${delay}s" aria-hidden="true">${emoji}</span>`;
        }
        /* ── Grass texture patches — varied tones to break up flat grass ── */
        const PATCHES = 14;
        for (let j = 0; j < PATCHES; j++) {
            const ps = Math.sin((j + 1) * 331.7 + islandId * 73.9) * 51293.1;
            const pn = ps - Math.floor(ps);
            const ps2 = Math.sin((j + 1) * 197.3 + islandId * 157.1) * 38291.7;
            const pn2 = ps2 - Math.floor(ps2);
            const pl = 5 + pn * 88;
            const pt = 8 + pn2 * 82;
            const pw = 80 + Math.floor(pn * 100);
            const ph = 60 + Math.floor(pn2 * 70);
            const warm = j % 3 === 0 ? ' grass-patch-warm' : '';
            html += `<span class="grass-patch${warm}" style="left:${pl.toFixed(1)}%;top:${pt.toFixed(1)}%;width:${pw}px;height:${ph}px" aria-hidden="true"></span>`;
        }
        return html;
    },

});
