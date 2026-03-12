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
};
