Object.assign(App, {
    themes: ['indigo', 'sakura', 'ocean', 'forest', 'sunset', 'lavender', 'mocha', 'rosegold'],

    initTheme() {
        const savedMode = localStorage.getItem('panpu-mode') || 'light';
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

        document.getElementById('mode-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-mode');
            this.applyMode(current === 'dark' ? 'light' : 'dark');
        });

        document.querySelectorAll('.theme-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                this.applyTheme(swatch.dataset.theme);
            });
        });

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
        document.documentElement.setAttribute('data-mode', mode);
        localStorage.setItem('panpu-mode', mode);
        const label = document.getElementById('mode-label');
        const toggleBtn = document.getElementById('mode-toggle');
        if (label) label.textContent = mode === 'dark' ? '暗色模式' : '亮色模式';
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', mode === 'dark' ? 'moon' : 'sun');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ attrs: {}, node: toggleBtn });
            }
        }
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('panpu-theme', theme);
        document.querySelectorAll('.theme-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.theme === theme));
    },
});
