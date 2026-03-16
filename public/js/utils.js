/**
 * Shared utility functions — avoids duplication across modules.
 */
const Utils = {
    assetVersion() {
        if (typeof window === 'undefined') return 'dev';
        return window.__PANPU_ASSET_VERSION__ || 'dev';
    },

    coinIconSrc() {
        return `/img/meow-coin.png?v=${this.assetVersion()}`;
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
};
