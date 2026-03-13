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
     * Return an inline SVG string for the cat coin icon.
     * Bolder design with thicker strokes so the cat face is visible at small sizes.
     * @param {string} [cls='cat-coin-icon'] — CSS class(es)
     * @param {string} [style=''] — inline style override
     */
    coinSvg(cls = 'cat-coin-icon', style = '') {
        const id = Math.random().toString(36).slice(2, 8);
        return `<svg class="${cls}" ${style ? `style="${style}"` : ''} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cG${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFE066"/><stop offset="50%" stop-color="#FFB800"/><stop offset="100%" stop-color="#FF9500"/></linearGradient><radialGradient id="cS${id}" cx="30%" cy="25%" r="50%"><stop offset="0%" stop-color="rgba(255,255,255,0.7)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="50" cy="50" r="48" fill="#C8900A"/><circle cx="50" cy="50" r="42" fill="url(#cG${id})"/><circle cx="50" cy="50" r="42" fill="url(#cS${id})"/><polygon points="24,36 16,10 38,28" fill="#FF9500" stroke="#C8900A" stroke-width="2"/><polygon points="76,36 84,10 62,28" fill="#FF9500" stroke="#C8900A" stroke-width="2"/><polygon points="26,32 20,14 36,28" fill="#FFD166" opacity="0.6"/><polygon points="74,32 80,14 64,28" fill="#FFD166" opacity="0.6"/><circle cx="36" cy="44" r="6" fill="#3D2B1F"/><circle cx="64" cy="44" r="6" fill="#3D2B1F"/><circle cx="38" cy="42" r="2.5" fill="#FFF"/><circle cx="66" cy="42" r="2.5" fill="#FFF"/><ellipse cx="50" cy="54" rx="4" ry="3" fill="#FF6B81"/><path d="M44,55 Q50,62 56,55" fill="none" stroke="#3D2B1F" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="48" x2="32" y2="50" stroke="#3D2B1F" stroke-width="1.5" opacity="0.6"/><line x1="18" y1="56" x2="32" y2="54" stroke="#3D2B1F" stroke-width="1.5" opacity="0.6"/><line x1="82" y1="48" x2="68" y2="50" stroke="#3D2B1F" stroke-width="1.5" opacity="0.6"/><line x1="82" y1="56" x2="68" y2="54" stroke="#3D2B1F" stroke-width="1.5" opacity="0.6"/></svg>`;
    },
};
