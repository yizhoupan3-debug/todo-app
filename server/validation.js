const VALID_ASSIGNEES = Object.freeze(['潘潘', '蒲蒲']);
const VALID_TASK_STATUSES = Object.freeze(['todo', 'in_progress', 'done']);
const VALID_TASK_PRIORITIES = Object.freeze([1, 2, 3]);
const VALID_RECURRING_TYPES = Object.freeze(['daily', 'weekly', 'monthly', 'custom']);
const VALID_CHECKIN_TYPES = Object.freeze(['water', 'wakeup', 'goout', 'skincare', 'steps']);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function parseInteger(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
        return Number(value);
    }
    return null;
}

function parseBooleanLike(value) {
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;
    return null;
}

function isValidAssignee(value) {
    return VALID_ASSIGNEES.includes(value);
}

function isValidDateString(value) {
    if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime())
        && date.getFullYear() === year
        && date.getMonth() + 1 === month
        && date.getDate() === day;
}

function isValidMonthString(value) {
    if (typeof value !== 'string' || !MONTH_RE.test(value)) return false;
    const [, month] = value.split('-').map(Number);
    return month >= 1 && month <= 12;
}

function isValidTimeString(value) {
    if (typeof value !== 'string' || !TIME_RE.test(value)) return false;
    const [hours, minutes] = value.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function isPositiveInteger(value) {
    const parsed = parseInteger(value);
    return parsed !== null && parsed > 0;
}

function isOneOf(value, choices) {
    return choices.includes(value);
}

module.exports = {
    VALID_ASSIGNEES,
    VALID_TASK_STATUSES,
    VALID_TASK_PRIORITIES,
    VALID_RECURRING_TYPES,
    VALID_CHECKIN_TYPES,
    parseInteger,
    parseBooleanLike,
    isValidAssignee,
    isValidDateString,
    isValidMonthString,
    isValidTimeString,
    isPositiveInteger,
    isOneOf,
};
