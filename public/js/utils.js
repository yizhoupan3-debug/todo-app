/**
 * Shared utility functions — avoids duplication across modules.
 */
const Utils = {
    coinIconSrc() {
        return '/img/meow-coin.png?v=4';
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
};
