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
            type: 'sunflower', icon: '🌻', name: '向日葵', cost: 10, desc: '追逐阳光',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/sunflower_growing.svg', mature: '/img/trees/sunflower.svg' }
        },
        {
            type: 'tulip', icon: '🌷', name: '郁金香', cost: 20, desc: '优雅绽放',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/tulip_growing.svg', mature: '/img/trees/tulip.svg' }
        },
        {
            type: 'sakura', icon: '🌸', name: '樱花树', cost: 30, desc: '浪漫满开',
            stages: { seed: '/img/trees/seed.svg', sprout: '/img/trees/sprout_stage.svg', growing: '/img/trees/sakura_growing.svg', mature: '/img/trees/sakura.svg' }
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

        el.innerHTML = `
            <div class="garden-header">
                <div class="garden-balance">
                    <img src="/img/icons/潘潘.png" alt="" style="width:28px;height:28px;border-radius:50%;margin-right:6px">
                    <strong>${this.balance}</strong> 喵喵币
                </div>
                <div class="filter-pills">
                    <button class="filter-pill ${this.assignee === '潘潘' ? 'active' : ''}" data-person="潘潘">
                        <img src="/img/icons/潘潘.png" alt="" style="width:18px;height:18px;border-radius:50%"> 潘潘
                    </button>
                    <button class="filter-pill ${this.assignee === '蒲蒲' ? 'active' : ''}" data-person="蒲蒲">
                        <img src="/img/icons/蒲蒲.png" alt="" style="width:18px;height:18px;border-radius:50%"> 蒲蒲
                    </button>
                </div>
                <button class="btn-history" id="garden-history-btn">📊 记录</button>
            </div>
            <div class="island-container">
                <div class="island-grid">
                    ${this.renderGrid()}
                </div>
            </div>
            ${this.selectedTree ? this.renderPlantingToolbar() : ''}
            <div class="garden-stats">
                <div class="garden-stat"><div class="garden-stat-num">${plantedCount}</div><div>已种植物</div></div>
                <div class="garden-stat"><div class="garden-stat-num">${typesCollected}</div><div>种类收集</div></div>
                <div class="garden-stat"><div class="garden-stat-num">${clearedCount}</div><div>已开垦</div></div>
            </div>
        `;

        this.bindGardenEvents();
    },

    renderGrid() {
        return this.plots.map(plot => {
            if (plot.status === 'wasteland') {
                return this.renderWastelandPlot(plot);
            } else if (plot.status === 'cleared') {
                return this.renderClearedPlot(plot);
            } else {
                return this.renderPlantedPlot(plot);
            }
        }).join('');
    },

    renderWastelandPlot(plot) {
        const obs = this.obstacleMap[plot.obstacle_type] || this.obstacleMap.rock;
        return `
            <div class="island-plot wasteland" data-plot-id="${plot.id}" title="${obs.name} · 开荒 ${obs.cost}🪙">
                <img class="plot-obstacle" src="${obs.img}" alt="${obs.name}">
                <div class="plot-clear-cost">⛏️ ${obs.cost}</div>
            </div>
        `;
    },

    renderClearedPlot(plot) {
        const isSelected = this.selectedTree;
        return `
            <div class="island-plot cleared ${isSelected ? 'plantable' : ''}" data-plot-id="${plot.id}" title="空地 · ${isSelected ? '点击种植' : '在商城选树'}">
                ${isSelected ? '<div class="plot-plant-hint">🌱</div>' : '<div class="plot-empty-hint">空</div>'}
            </div>
        `;
    },

    renderPlantedPlot(plot) {
        const catItem = this.catalog.find(c => c.type === plot.tree_type);
        const gm = plot.growth_minutes || 0;
        const stage = this.getGrowthStage(gm);
        const label = this.getGrowthLabel(gm);
        const pct = Math.min(100, Math.round(gm / 150 * 100));

        let imgSrc = '/img/trees/seed.svg';
        if (catItem && catItem.stages) {
            imgSrc = catItem.stages[stage] || catItem.stages.mature;
        }

        return `
            <div class="island-plot planted stage-${stage}" data-plot-id="${plot.id}"
                 title="${catItem ? catItem.name : plot.tree_type} · ${label} (${gm}分钟)">
                <img class="plot-tree-img" src="${imgSrc}" alt="${catItem ? catItem.name : ''}">
                <div class="tree-growth-bar"><div class="tree-growth-fill" style="width:${pct}%"></div></div>
            </div>
        `;
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
        document.querySelectorAll('.island-plot').forEach(plotEl => {
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
            App.showToast(`喵喵币不足！需要 ${obs.cost}🪙`, 'error');
            return;
        }
        if (!confirm(`开荒: 清除${obs.name}，花费 ${obs.cost}🪙？`)) return;

        try {
            const result = await API.clearPlot({ assignee: this.assignee, plot_id: plotId });
            this.balance = result.balance;
            this.updateHeaderCoins();
            App.showToast(`⛏️ 开荒成功！-${result.cost}🪙`, 'success');
            await this.open();
        } catch (e) {
            App.showToast(e.message || '开荒失败', 'error');
        }
    },

    async plantOnPlot(plotId) {
        const item = this.catalog.find(c => c.type === this.selectedTree);
        if (!item) return;
        if (this.balance < item.cost) {
            App.showToast(`喵喵币不足！需要 ${item.cost}🪙`, 'error');
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
                    <img src="/img/icons/${this.shopAssignee}.png" alt="" style="width:28px;height:28px;border-radius:50%;margin-right:6px">
                    <strong>${this.shopBalance}</strong> 喵喵币
                </div>
                <div class="filter-pills">
                    <button class="filter-pill ${this.shopAssignee === '潘潘' ? 'active' : ''}" data-person="潘潘">
                        <img src="/img/icons/潘潘.png" alt="" style="width:18px;height:18px;border-radius:50%"> 潘潘
                    </button>
                    <button class="filter-pill ${this.shopAssignee === '蒲蒲' ? 'active' : ''}" data-person="蒲蒲">
                        <img src="/img/icons/蒲蒲.png" alt="" style="width:18px;height:18px;border-radius:50%"> 蒲蒲
                    </button>
                </div>
            </div>
            <div class="shop-full-grid">
                ${this.catalog.map(item => `
                    <div class="shop-card ${this.shopBalance >= item.cost ? '' : 'locked'}" data-type="${item.type}" data-cost="${item.cost}">
                        <img class="shop-card-img" src="${item.stages.mature}" alt="${item.name}">
                        <div class="shop-card-name">${item.name}</div>
                        <div class="shop-card-price">${item.cost === 0 ? '免费' : `🪙 ${item.cost}`}</div>
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
                    <div class="tree-detail-cost">${item.cost === 0 ? '免费' : `🪙 ${item.cost} 喵喵币`}</div>
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
                    App.showToast(`+${amount} 🪙 · ${name} 成长了！(${label})`, 'success');
                } else {
                    App.showToast(`+${amount} 🪙 喵喵币！`, 'success');
                }
            } catch (e) {
                App.showToast(`+${amount} 🪙 喵喵币！`, 'success');
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
            App.showToast(`+${amount} 🪙 喵喵币！`, 'success');
        } catch (e) { /* silent */ }
    },
};
