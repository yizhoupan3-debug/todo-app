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
            // Allow full scroll range — no padding restriction
            return {
                left: left - width * 0.05,
                right: left + width * 1.05,
                top: top - height * 0.06,
                bottom: top + height * 1.02,
            };
        }
        const width = world.offsetWidth || 0;
        const height = world.offsetHeight || 0;
        return {
            left: 0,
            right: width,
            top: 0,
            bottom: height,
        };
    },

    _clampViewport(vp, world) {
        if (!vp || !world) return;
        // Don't clamp aggressively — just ensure we don't scroll
        // beyond the world boundaries
        const maxScrollLeft = vp.scrollWidth - vp.clientWidth;
        const maxScrollTop = vp.scrollHeight - vp.clientHeight;
        vp.scrollLeft = Math.max(0, Math.min(maxScrollLeft, vp.scrollLeft));
        vp.scrollTop = Math.max(0, Math.min(maxScrollTop, vp.scrollTop));
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
