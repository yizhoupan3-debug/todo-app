/**
 * Shared utility functions — avoids duplication across modules.
 */
const Utils = {
    assetVersion() {
        if (typeof window === 'undefined') return 'dev';
        return window.__PANPU_ASSET_VERSION__ || 'dev';
    },

    assetUrl(assetPath, { version = true } = {}) {
        if (!assetPath) return assetPath;

        const rawPath = String(assetPath);
        if (/^(?:[a-z]+:)?\/\//i.test(rawPath) || rawPath.startsWith('data:') || rawPath.startsWith('blob:')) {
            return rawPath;
        }

        const [basePath, queryString = ''] = rawPath.split('?');
        const params = new URLSearchParams(queryString);
        if (version) {
            params.set('v', this.assetVersion());
        }

        const nextQuery = params.toString();
        return nextQuery ? `${basePath}?${nextQuery}` : basePath;
    },

    personaAvatarUrl(persona) {
        const map = {
            '潘潘': '/img/panpan.png',
            '蒲蒲': '/img/pupu.png',
            'all': '/img/all.png',
        };
        return this.assetUrl(map[persona] || map['潘潘']);
    },

    coinIconSrc() {
        return this.assetUrl('/img/meow-coin.png');
    },

    headerCoinMarkup(balance = 0) {
        return `${this.coinSvg()} <span id="header-coins">${this.formatCoinBalance(balance)}</span> <span class="coin-label">喵喵币</span>`;
    },

    roundCoin(balance) {
        return Math.round((Number(balance) || 0) * 10) / 10;
    },

    getPomodoroBaseReward(focusMinutes) {
        let amount = 0.5;
        if (focusMinutes >= 60) amount = 3;
        else if (focusMinutes >= 45) amount = 2;
        else if (focusMinutes >= 25) amount = 1;
        return amount;
    },

    /**
     * Escape HTML to prevent XSS when inserting user-supplied text.
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Return an inline HTML string for the cat coin icon (PNG image).
     * @param {string} [cls='cat-coin-icon'] — CSS class(es)
     * @param {string} [style=''] — inline style override
     */
    coinSvg(cls = 'cat-coin-icon', style = '') {
        return `<img class="${cls}" ${style ? `style="${style}"` : ''} src="${this.coinIconSrc()}" alt="喵喵币">`;
    },

    formatCoinBalance(balance) {
        const n = Number(balance);
        if (!Number.isFinite(n)) return '0';
        return Number.isInteger(n) ? String(n) : n.toFixed(1);
    },

    /**
     * Animate a modal overlay closed (fade out + scale down), then apply cleanup.
     * @param {HTMLElement|string} overlayEl — overlay element or its ID
     * @param {Function} [onDone] — callback after animation finishes
     */
    closeModalAnimated(overlayEl, onDone) {
        const el = typeof overlayEl === 'string' ? document.getElementById(overlayEl) : overlayEl;
        if (!el) return;

        const isMobile = window.innerWidth <= 768;
        const modal = el.querySelector('.modal, .widget-modal, .ics-modal, [class*="modal-box"]');

        el.style.transition = 'opacity 0.25s ease';
        el.style.opacity = '0';

        if (modal) {
            if (isMobile) {
                // Mobile: slide the sheet back down
                modal.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 1, 1)';
                modal.style.transform = 'translateY(100%)';
            } else {
                // Desktop: fade + scale down
                modal.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
                modal.style.transform = 'translateY(20px) scale(0.95)';
                modal.style.opacity = '0';
            }
        }

        const cleanup = () => {
            el.classList.add('hidden');
            el.style.transition = '';
            el.style.opacity = '';
            if (modal) {
                modal.style.transition = '';
                modal.style.transform = '';
                modal.style.opacity = '';
            }
            if (onDone) onDone();
        };

        el.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 320); // fallback
    },

    /** Show the top loading progress bar */
    showLoading() {
        const bar = document.getElementById('loading-bar');
        if (bar) bar.classList.add('active');
    },

    /** Hide the top loading progress bar */
    hideLoading() {
        const bar = document.getElementById('loading-bar');
        if (bar) bar.classList.remove('active');
    },

    /**
     * Animate a number counter from 0 → end.
     * @param {HTMLElement} el - target element
     * @param {number|string} end - final value (can include units like 'L', 'ml')
     * @param {number} duration - ms (default 600)
     */
    animateCounter(el, end, duration = 600) {
        if (!el) return;
        // Extract numeric part and suffix
        const match = String(end).match(/^([\d.]+)(.*)$/);
        if (!match) { el.textContent = end; return; }

        const target = parseFloat(match[1]);
        const suffix = match[2] || '';
        const isFloat = match[1].includes('.');
        const start = performance.now();

        el.classList.add('count-animate');

        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = target * ease;
            el.textContent = (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    },

    /** Haptic feedback (vibration API) */
    haptic(style = 'light') {
        if (!navigator.vibrate) return;
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 50, 20],
            error: [30, 50, 30, 50, 30],
        };
        navigator.vibrate(patterns[style] || patterns.light);
    },

    /** Mini confetti burst */
    confetti(container) {
        const colors = ['#f59e0b', '#22c55e', '#6366f1', '#ec4899', '#3b82f6', '#ef4444'];
        const count = 30;
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10000;overflow:hidden;';

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const x = 40 + Math.random() * 20; // 40-60% from left
            const size = 6 + Math.random() * 6;
            const angle = -70 - Math.random() * 40; // upward spread
            const distance = 300 + Math.random() * 400;
            const rotation = Math.random() * 720 - 360;
            const dx = Math.cos(angle * Math.PI / 180) * distance * (Math.random() > 0.5 ? 1 : -1);
            const dy = Math.sin(angle * Math.PI / 180) * distance;

            particle.style.cssText = `
                position:absolute;left:${x}%;top:60%;width:${size}px;height:${size}px;
                background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
                opacity:1;pointer-events:none;
                animation:confettiBurst 1s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
                --dx:${dx}px;--dy:${dy}px;--rot:${rotation}deg;
                animation-delay:${Math.random() * 0.15}s;
            `;
            wrapper.appendChild(particle);
        }

        (container || document.body).appendChild(wrapper);
        setTimeout(() => wrapper.remove(), 1500);
    },

    /** Pull-to-refresh for mobile views */
    initPullToRefresh(el, onRefresh) {
        if (!el || !('ontouchstart' in window)) return;

        let startY = 0, pulling = false, pullDist = 0;
        const MAX_PULL = 80;
        const TRIGGER = 60;

        // Create pull indicator
        const indicator = document.createElement('div');
        indicator.className = 'pull-indicator';
        indicator.innerHTML = '↓ 下拉刷新';
        el.style.position = 'relative';
        el.prepend(indicator);

        el.addEventListener('touchstart', (e) => {
            if (el.scrollTop > 5) return; // only at top
            startY = e.touches[0].clientY;
            pulling = true;
            pullDist = 0;
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (!pulling) return;
            const dy = e.touches[0].clientY - startY;
            if (dy < 0) { pulling = false; return; }

            pullDist = Math.min(dy * 0.5, MAX_PULL); // resistance
            indicator.style.transform = `translateY(${pullDist - 40}px)`;
            indicator.style.opacity = Math.min(pullDist / TRIGGER, 1);

            if (pullDist >= TRIGGER) {
                indicator.innerHTML = '↑ 松开刷新';
                indicator.classList.add('ready');
            } else {
                indicator.innerHTML = '↓ 下拉刷新';
                indicator.classList.remove('ready');
            }
        }, { passive: true });

        el.addEventListener('touchend', () => {
            if (!pulling) return;
            pulling = false;

            if (pullDist >= TRIGGER) {
                indicator.innerHTML = '⟳ 刷新中...';
                indicator.style.transform = 'translateY(0)';
                this.haptic('medium');
                if (onRefresh) onRefresh();
                setTimeout(() => {
                    indicator.style.transform = 'translateY(-40px)';
                    indicator.style.opacity = '0';
                    indicator.classList.remove('ready');
                }, 800);
            } else {
                indicator.style.transform = 'translateY(-40px)';
                indicator.style.opacity = '0';
                indicator.classList.remove('ready');
            }
        }, { passive: true });
    },
};
