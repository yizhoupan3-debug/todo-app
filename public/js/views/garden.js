/**
 * Garden View — 花园 + 商城 + 喵喵币
 */
const GardenView = {
    assignee: '潘潘',
    balance: 0,
    trees: [],
    shopOpen: false,

    // Tree catalog (frontend-defined)
    catalog: [
        { type: 'sprout', icon: '🌱', name: '小草', cost: 0, desc: '万物起始' },
        { type: 'sunflower', icon: '🌻', name: '向日葵', cost: 10, desc: '追逐阳光' },
        { type: 'tulip', icon: '🌷', name: '郁金香', cost: 20, desc: '优雅绽放' },
        { type: 'sakura', icon: '🌸', name: '樱花树', cost: 30, desc: '浪漫满开' },
        { type: 'pine', icon: '🌲', name: '松树', cost: 50, desc: '四季常青' },
        { type: 'oak', icon: '🌳', name: '落叶树', cost: 50, desc: '枝繁叶茂' },
        { type: 'palm', icon: '🌴', name: '棕榈树', cost: 80, desc: '热带风情' },
        { type: 'christmas', icon: '🎄', name: '圣诞树', cost: 80, desc: '节日快乐' },
        { type: 'cactus', icon: '🌵', name: '仙人掌', cost: 100, desc: '沙漠之花' },
        { type: 'rose', icon: '🌹', name: '玫瑰', cost: 100, desc: '爱的承诺' },
        { type: 'clover', icon: '🍀', name: '四叶草', cost: 150, desc: '幸运降临' },
        { type: 'lavender', icon: '🪻', name: '彩虹花', cost: 200, desc: '传说之花' },
    ],

    init() {
        // nothing needed at init
    },

    async open() {
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [coinsData, treesData] = await Promise.all([
                API.getCoins(this.assignee),
                API.getGardenTrees(this.assignee),
            ]);
            this.balance = coinsData.balance;
            this.trees = treesData;
        } catch (e) {
            console.error('Garden load error:', e);
        }
    },

    render() {
        const container = document.getElementById('view-garden');
        if (!container) return;

        // Mark trees older than 1 hour as "grown"
        const now = Date.now();

        container.innerHTML = `
            <div class="garden-header">
                <div class="garden-coin-display">
                    <span class="coin-icon">🪙</span>
                    <span class="coin-balance" id="garden-balance">${this.balance}</span>
                    <span class="coin-label">喵喵币</span>
                </div>
                <div class="garden-actions">
                    <button class="garden-btn" id="btn-garden-history">📊 记录</button>
                    <button class="garden-btn primary" id="btn-garden-shop">🛒 商城</button>
                </div>
            </div>

            <div class="garden-person-filter">
                <button class="filter-pill ${this.assignee === '潘潘' ? 'active' : ''}" data-assignee="潘潘">
                    <img class="filter-avatar" src="/img/panpan.png" alt=""> 潘潘
                </button>
                <button class="filter-pill ${this.assignee === '蒲蒲' ? 'active' : ''}" data-assignee="蒲蒲">
                    <img class="filter-avatar" src="/img/pupu.png" alt=""> 蒲蒲
                </button>
            </div>

            <div class="garden-canvas" id="garden-canvas">
                <div class="garden-ground"></div>
                ${this.trees.length === 0 ? `
                    <div class="garden-empty">
                        <div class="garden-empty-icon">🌱</div>
                        <div class="garden-empty-text">花园还是空的</div>
                        <div class="garden-empty-sub">完成番茄钟或打卡赚取喵喵币，去商城种一棵树吧！</div>
                    </div>
                ` : this.renderTrees()}
            </div>

            <div class="garden-stats">
                <div class="garden-stat">
                    <span class="garden-stat-num">${this.trees.length}</span>
                    <span class="garden-stat-label">已种植物</span>
                </div>
                <div class="garden-stat">
                    <span class="garden-stat-num">${new Set(this.trees.map(t => t.tree_type)).size}</span>
                    <span class="garden-stat-label">种类收集</span>
                </div>
                <div class="garden-stat">
                    <span class="garden-stat-num">${this.catalog.length}</span>
                    <span class="garden-stat-label">图鉴总数</span>
                </div>
            </div>

            <!-- Shop Modal -->
            <div class="garden-shop hidden" id="garden-shop">
                <div class="garden-shop-header">
                    <h3>🛒 树木商城</h3>
                    <div class="garden-shop-balance">🪙 <span id="shop-balance">${this.balance}</span></div>
                    <button class="garden-shop-close" id="garden-shop-close">×</button>
                </div>
                <div class="garden-shop-grid">
                    ${this.catalog.map(item => `
                        <div class="shop-card ${this.balance >= item.cost ? '' : 'locked'}" data-type="${item.type}" data-cost="${item.cost}">
                            <div class="shop-card-icon">${item.icon}</div>
                            <div class="shop-card-name">${item.name}</div>
                            <div class="shop-card-desc">${item.desc}</div>
                            <button class="shop-buy-btn" ${this.balance < item.cost && item.cost > 0 ? 'disabled' : ''}>
                                ${item.cost === 0 ? '免费种植' : `🪙 ${item.cost}`}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- History Modal -->
            <div class="garden-history hidden" id="garden-history">
                <div class="garden-shop-header">
                    <h3>📊 喵喵币记录</h3>
                    <button class="garden-shop-close" id="garden-history-close">×</button>
                </div>
                <div class="garden-history-list" id="garden-history-list">
                    <div class="garden-empty-text">加载中...</div>
                </div>
            </div>
        `;

        this.bindEvents();
    },

    renderTrees() {
        return this.trees.map((tree, i) => {
            const catItem = this.catalog.find(c => c.type === tree.tree_type);
            const icon = catItem ? catItem.icon : '🌱';
            const x = tree.position_x || (10 + (i % 8) * 11);
            const y = tree.position_y || (20 + Math.floor(i / 8) * 15);
            const age = Date.now() - new Date(tree.planted_at).getTime();
            const grown = age > 3600000; // 1 hour
            return `
                <div class="garden-tree ${grown ? 'grown' : 'growing'}"
                     style="left:${x}%;top:${y}%"
                     title="${catItem ? catItem.name : tree.tree_type}">
                    <span class="garden-tree-icon">${icon}</span>
                </div>
            `;
        }).join('');
    },

    bindEvents() {
        // Person filter
        document.querySelectorAll('#view-garden .filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                this.assignee = btn.dataset.assignee;
                this.open();
            });
        });

        // Shop toggle
        document.getElementById('btn-garden-shop')?.addEventListener('click', () => {
            document.getElementById('garden-shop').classList.remove('hidden');
        });
        document.getElementById('garden-shop-close')?.addEventListener('click', () => {
            document.getElementById('garden-shop').classList.add('hidden');
        });

        // History toggle
        document.getElementById('btn-garden-history')?.addEventListener('click', async () => {
            document.getElementById('garden-history').classList.remove('hidden');
            await this.loadHistory();
        });
        document.getElementById('garden-history-close')?.addEventListener('click', () => {
            document.getElementById('garden-history').classList.add('hidden');
        });

        // Buy buttons
        document.querySelectorAll('.shop-card').forEach(card => {
            const buyBtn = card.querySelector('.shop-buy-btn');
            if (buyBtn && !buyBtn.disabled) {
                buyBtn.addEventListener('click', () => {
                    this.buyTree(card.dataset.type, parseInt(card.dataset.cost));
                });
            }
        });
    },

    async buyTree(treeType, cost) {
        try {
            const result = await API.plantTree({
                assignee: this.assignee,
                tree_type: treeType,
                cost: cost,
            });
            this.balance = result.balance;
            App.showToast(`🌱 种下了一棵${this.catalog.find(c => c.type === treeType)?.name || '植物'}！`, 'success');
            // Close shop and refresh garden
            document.getElementById('garden-shop').classList.add('hidden');
            await this.open();
            // Update header coin display
            this.updateHeaderCoins();
        } catch (e) {
            App.showToast(e.message || '购买失败', 'error');
        }
    },

    async loadHistory() {
        try {
            const rows = await API.getCoinHistory(this.assignee, 30);
            const list = document.getElementById('garden-history-list');
            if (!list) return;
            if (rows.length === 0) {
                list.innerHTML = '<div class="garden-empty-text">暂无记录</div>';
                return;
            }
            const reasonMap = {
                pomodoro: '🍅 番茄钟',
                checkin: '✅ 打卡',
                streak: '🔥 连续奖励',
                purchase: '🌳 种树',
            };
            list.innerHTML = rows.map(r => `
                <div class="history-row">
                    <div class="history-info">
                        <span class="history-reason">${reasonMap[r.reason] || r.reason}</span>
                        <span class="history-detail">${r.detail || ''}</span>
                    </div>
                    <div class="history-amount ${r.amount > 0 ? 'earn' : 'spend'}">
                        ${r.amount > 0 ? '+' : ''}${r.amount} 🪙
                    </div>
                    <div class="history-time">${new Date(r.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            `).join('');
        } catch (e) {
            console.error('History load error:', e);
        }
    },

    updateHeaderCoins() {
        const el = document.getElementById('header-coins');
        if (el) el.textContent = this.balance;
    },

    // Called from Pomodoro when a focus round completes
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
            this.balance = result.balance;
            this.updateHeaderCoins();
            App.showToast(`+${amount} 🪙 喵喵币！`, 'success');
        } catch (e) { /* silent */ }
    },

    // Called from Checkin
    async earnFromCheckin(assignee, type) {
        const amount = 5;
        try {
            const result = await API.earnCoins({
                assignee,
                amount,
                reason: 'checkin',
                detail: type,
            });
            this.balance = result.balance;
            this.updateHeaderCoins();
        } catch (e) { /* silent */ }
    },
};
