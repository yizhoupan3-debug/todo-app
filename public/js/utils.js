/**
 * Shared utility functions — avoids duplication across modules.
 */
const Utils = {
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
        return `<img class="${cls}" ${style ? `style="${style}"` : ''} src="/img/meow-coin.png?v=2" alt="喵喵币">`;
    },

    formatCoinBalance(balance) {
        return Number.isInteger(balance) ? String(balance) : balance.toFixed(1);
    },
};
