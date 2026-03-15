/* ── Garden Shop & Backpack Extensions ── */
Object.assign(GardenView, {
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
                App.setPersona(this.shopAssignee, { refresh: false });
                App.switchView('garden');
                App.showToast('👆 点击空地种植', 'info');
            });
        }
    },

    bindShopEvents() {
        const shopView = document.getElementById('view-shop');
        if (!shopView) return;

        shopView.onclick = async (e) => {
            const personBtn = e.target.closest('.filter-pill[data-person]');
            if (personBtn) {
                App.setPersona(personBtn.dataset.person, { refresh: false });
                this.shopAssignee = personBtn.dataset.person;
                await this.openShop();
                return;
            }

            if (e.target.closest('#shop-backpack-btn')) {
                this.showBackpack(this.shopAssignee);
                return;
            }

            const card = e.target.closest('.shop-card');
            if (card) {
                this.showTreeDetail(card.dataset.type);
            }
        };
    },

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
            const data = await API.fetch(`/garden/backpack/${encodeURIComponent(assignee)}`).then(r => r.json());
            plants = data.plants || [];
        } catch (e) {
            App.showToast('加载背包失败', 'error');
            return;
        }

        this._backpackPlants = plants;
        this._backpackSort = { by: 'price', order: 'asc' };
        this._backpackSearch = '';

        const totalValue = plants.reduce((s, p) => s + p.price, 0);
        const matureCount = plants.filter(p => p.growth_minutes >= 150).length;
        const maturePct = plants.length ? Math.round(matureCount / plants.length * 100) : 0;
        const typesCount = new Set(plants.map(p => p.tree_type)).size;

        const overlay = document.createElement('div');
        overlay.className = 'backpack-overlay';
        overlay.innerHTML = `
            <div class="backpack-modal">
                <div class="backpack-header">
                    <div class="backpack-header-main">
                        <h3>\u{1F392} 背包</h3>
                        <div class="backpack-persona-switch" role="tablist" aria-label="背包角色切换">
                            <button class="backpack-persona-btn ${assignee === '潘潘' ? 'active' : ''}" data-person="潘潘">潘潘</button>
                            <button class="backpack-persona-btn ${assignee === '蒲蒲' ? 'active' : ''}" data-person="蒲蒲">蒲蒲</button>
                        </div>
                    </div>
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
        this._backpackOverlayEl = overlay;
        this._backpackContentEl = overlay.querySelector('#backpack-content');
        this._backpackSearchInputEl = overlay.querySelector('#backpack-search');

        const closeOverlay = () => {
            overlay.classList.remove('active');
            this._backpackOverlayEl = null;
            this._backpackContentEl = null;
            this._backpackSearchInputEl = null;
            setTimeout(() => overlay.remove(), 200);
        };
        document.getElementById('backpack-close')?.addEventListener('click', closeOverlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });

        overlay.querySelectorAll('.backpack-persona-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const nextAssignee = btn.dataset.person;
                if (!nextAssignee || nextAssignee === assignee) return;
                App.setPersona(nextAssignee, { refresh: false });
                if (App.currentView === 'shop') {
                    this.shopAssignee = nextAssignee;
                    await this.openShop();
                } else {
                    this.assignee = nextAssignee;
                    this.currentIsland = null;
                    this._staticRendered = false;
                    await this.open();
                }
                await this.showBackpack(nextAssignee);
            });
        });

        this._backpackSearchInputEl?.addEventListener('input', () => {
            this._backpackSearch = this._backpackSearchInputEl.value.trim();
            this._queueBackpackRender();
        });

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
                this._queueBackpackRender();
            });
        });

        requestAnimationFrame(() => this._backpackSearchInputEl?.focus({ preventScroll: true }));

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
            const imgSrc = catItem?.stages?.[stage] || '/img/trees/seed.png';
            const name = catItem?.name || plant.tree_type;
            const icon = catItem?.icon || '\u{1F331}';
            const rarity = this._getPlantRarity(plant.price);
            const plantedDate = this._formatPlantedDate(plant.planted_at);
            const delay = Math.min(idx * 40, 400);

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
});
