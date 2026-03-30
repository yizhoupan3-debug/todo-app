if (typeof App === 'undefined') {
    console.warn('App boot incomplete; skipping app-theme extension.');
} else Object.assign(App, {
    themes: ['indigo', 'sakura', 'ocean', 'forest', 'sunset', 'lavender', 'mocha', 'rosegold'],

    initTheme() {
        const savedMode = localStorage.getItem('panpu-mode') || 'auto';
        const savedTheme = localStorage.getItem('panpu-theme') || 'indigo';
        this.applyMode(savedMode);
        this.applyTheme(savedTheme);

        const settingsBtn = document.getElementById('btn-settings');
        const settingsPanel = document.getElementById('settings-panel');
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle('hidden');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ attrs: {}, node: settingsPanel });
            }
        });
        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
                settingsPanel.classList.add('hidden');
            }
        });

        // Mode radio group instead of single toggle
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyMode(btn.dataset.mode);
            });
        });

        // Listen for system theme changes if in auto mode
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (localStorage.getItem('panpu-mode') === 'auto') {
                this._updateVisualMode('auto');
            }
        });

        this.querySelectorAll = (selector) => document.querySelectorAll(selector); // helper

        this.initBackendSettings();

        const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
        const platformBtns = document.querySelectorAll('.platform-btn');
        if (!isMac) {
            document.getElementById('platform-mac').classList.remove('active');
            document.getElementById('platform-win').classList.add('active');
        }
        platformBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                platformBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        const mobileTheme = document.getElementById('mobile-theme-toggle');
        if (mobileTheme) {
            mobileTheme.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-mode');
                this.applyMode(current === 'dark' ? 'light' : 'dark');
            });
        }
    },

    applyMode(mode) {
        localStorage.setItem('panpu-mode', mode);
        this._updateVisualMode(mode);
        
        // Mark the correct button as active in settings
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    },

    _updateVisualMode(mode) {
        let visualMode = mode;
        if (mode === 'auto') {
            visualMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-mode', visualMode);
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('panpu-theme', theme);
        document.querySelectorAll('.theme-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.theme === theme));
    },

    initBackendSettings() {
        const input = document.getElementById('backend-origin-input');
        const saveBtn = document.getElementById('btn-save-backend-origin');
        const clearBtn = document.getElementById('btn-clear-backend-origin');
        const status = document.getElementById('backend-origin-status');
        if (!input || !saveBtn || !clearBtn || !status || typeof API === 'undefined') return;

        const renderStatus = () => {
            const mode = typeof API.getBackendMode === 'function'
                ? API.getBackendMode()
                : (localStorage.getItem(API.backendModeKey) || 'local');
            const customOrigin = typeof API.getStoredCustomBackendOrigin === 'function'
                ? API.getStoredCustomBackendOrigin()
                : API.getBackendOrigin();
            input.value = mode === 'custom' ? customOrigin : '';
            if (mode === 'custom' && customOrigin) {
                status.textContent = `当前共享后端：${customOrigin}`;
                return;
            }
            status.textContent = '当前使用本地后端';
        };

        saveBtn.addEventListener('click', () => {
            const nextOrigin = API.setBackendOrigin(input.value);
            status.textContent = nextOrigin
                ? `已切到共享后端：${nextOrigin}，页面即将刷新`
                : '已恢复本地后端，页面即将刷新';
            setTimeout(() => window.location.reload(), 120);
        });

        clearBtn.addEventListener('click', () => {
            API.setBackendOrigin('', { forceLocal: true });
            status.textContent = '已恢复本地后端，页面即将刷新';
            setTimeout(() => window.location.reload(), 120);
        });

        renderStatus();
    },
});
