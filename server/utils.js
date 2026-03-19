/**
 * Server-side utility functions — shared helpers to avoid duplication.
 */

/**
 * Format a Date object as 'YYYY-MM-DD' string.
 * @param {Date} [date] - defaults to now
 * @returns {string}
 */
function formatDateStr(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format a Date object as 'HH:MM' string.
 * @param {Date} [date] - defaults to now
 * @returns {string}
 */
function formatTimeStr(date) {
    const d = date || new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Get today's date as 'YYYY-MM-DD' string.
 * @returns {string}
 */
function todayStr() {
    return formatDateStr(new Date());
}

module.exports = { formatDateStr, formatTimeStr, todayStr };
