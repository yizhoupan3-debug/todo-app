const express = require('express');
const db = require('../db');
const { generateRecurringInstances } = require('../services/recurring');
const { TASK_REWARD } = require('./garden-shared');
const {
    VALID_TASK_PRIORITIES,
    VALID_TASK_STATUSES,
    VALID_RECURRING_TYPES,
    isValidAssignee,
    isValidDateString,
    isValidMonthString,
    isValidTimeString,
    isOneOf,
    isPositiveInteger,
    parseBooleanLike,
    parseInteger,
} = require('../validation');

const router = express.Router();

function normalizeTaskPayload(input, { partial = false } = {}) {
    const normalized = {};
    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(input, key);

    if (!partial || hasOwn('title')) {
        const title = typeof input.title === 'string' ? input.title.trim() : '';
        if (!title) return { error: 'title is required' };
        normalized.title = title;
    }

    if (!partial || hasOwn('description')) {
        if (input.description === undefined || input.description === null) {
            normalized.description = '';
        } else if (typeof input.description !== 'string') {
            return { error: 'description must be a string' };
        } else {
            normalized.description = input.description;
        }
    }

    if (!partial || hasOwn('assignee')) {
        if (!isValidAssignee(input.assignee)) {
            return { error: 'assignee must be one of: 潘潘, 蒲蒲' };
        }
        normalized.assignee = input.assignee;
    }

    if (hasOwn('category_id')) {
        if (input.category_id === null || input.category_id === '') {
            normalized.category_id = null;
        } else {
            const categoryId = parseInteger(input.category_id);
            if (categoryId === null || categoryId <= 0) {
                return { error: 'category_id must be a positive integer' };
            }
            normalized.category_id = categoryId;
        }
    } else if (!partial) {
        normalized.category_id = null;
    }

    if (!partial || hasOwn('priority')) {
        const priority = input.priority === undefined ? 2 : parseInteger(input.priority);
        if (!VALID_TASK_PRIORITIES.includes(priority)) {
            return { error: 'priority must be one of: 1, 2, 3' };
        }
        normalized.priority = priority;
    }

    if (hasOwn('due_date')) {
        if (input.due_date === null || input.due_date === '') {
            normalized.due_date = null;
        } else if (!isValidDateString(input.due_date)) {
            return { error: 'due_date must use YYYY-MM-DD' };
        } else {
            normalized.due_date = input.due_date;
        }
    } else if (!partial) {
        normalized.due_date = null;
    }

    if (hasOwn('due_time')) {
        if (input.due_time === null || input.due_time === '') {
            normalized.due_time = null;
        } else if (!isValidTimeString(input.due_time)) {
            return { error: 'due_time must use HH:MM' };
        } else {
            normalized.due_time = input.due_time;
        }
    } else if (!partial) {
        normalized.due_time = null;
    }

    if (hasOwn('end_time')) {
        if (input.end_time === null || input.end_time === '') {
            normalized.end_time = null;
        } else if (!isValidTimeString(input.end_time)) {
            return { error: 'end_time must use HH:MM' };
        } else {
            normalized.end_time = input.end_time;
        }
    } else if (!partial) {
        normalized.end_time = null;
    }

    if (hasOwn('status')) {
        if (!isOneOf(input.status, VALID_TASK_STATUSES)) {
            return { error: 'status must be one of: todo, in_progress, done' };
        }
        normalized.status = input.status;
    }

    if (!partial || hasOwn('is_recurring')) {
        const recurringFlag = input.is_recurring === undefined ? false : parseBooleanLike(input.is_recurring);
        if (recurringFlag === null) {
            return { error: 'is_recurring must be a boolean' };
        }
        normalized.is_recurring = recurringFlag;
    }

    if (hasOwn('recurring_type')) {
        if (input.recurring_type === null || input.recurring_type === '') {
            normalized.recurring_type = null;
        } else if (!isOneOf(input.recurring_type, VALID_RECURRING_TYPES)) {
            return { error: 'recurring_type must be one of: daily, weekly, monthly, custom' };
        } else {
            normalized.recurring_type = input.recurring_type;
        }
    } else if (!partial) {
        normalized.recurring_type = null;
    }

    if (!partial || hasOwn('recurring_interval')) {
        const recurringInterval = input.recurring_interval === undefined ? 1 : parseInteger(input.recurring_interval);
        if (recurringInterval === null || recurringInterval <= 0) {
            return { error: 'recurring_interval must be a positive integer' };
        }
        normalized.recurring_interval = recurringInterval;
    }

    if (hasOwn('recurring_end_date')) {
        if (input.recurring_end_date === null || input.recurring_end_date === '') {
            normalized.recurring_end_date = null;
        } else if (!isValidDateString(input.recurring_end_date)) {
            return { error: 'recurring_end_date must use YYYY-MM-DD' };
        } else {
            normalized.recurring_end_date = input.recurring_end_date;
        }
    } else if (!partial) {
        normalized.recurring_end_date = null;
    }

    if (hasOwn('auto_complete')) {
        const autoComplete = parseBooleanLike(input.auto_complete);
        if (autoComplete === null) {
            return { error: 'auto_complete must be a boolean' };
        }
        normalized.auto_complete = autoComplete;
    }

    return { value: normalized };
}

// GET /api/tasks — list tasks with optional filters
router.get('/', (req, res) => {
    const { assignee, date, month, status } = req.query;

    let where = [];
    let params = [];

    if (assignee && assignee !== 'all') {
        if (!isValidAssignee(assignee)) {
            return res.status(400).json({ error: 'assignee must be one of: 潘潘, 蒲蒲, all' });
        }
        where.push('t.assignee = ?');
        params.push(assignee);
    }

    if (date) {
        if (!isValidDateString(date)) {
            return res.status(400).json({ error: 'invalid date format (YYYY-MM-DD)' });
        }
        // Generate recurring instances for this date range
        generateRecurringInstances(date, date);
        where.push('t.due_date = ?');
        params.push(date);
    }

    if (month) {
        if (!isValidMonthString(month)) {
            return res.status(400).json({ error: 'invalid month format (YYYY-MM)' });
        }
        // month is YYYY-MM format
        const start = `${month}-01`;
        const [y, m] = month.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const end = `${month}-${String(lastDay).padStart(2, '0')}`;
        generateRecurringInstances(start, end);
        where.push('t.due_date >= ? AND t.due_date <= ?');
        params.push(start, end);
    }

    if (status) {
        if (!isOneOf(status, VALID_TASK_STATUSES)) {
            return res.status(400).json({ error: 'status must be one of: todo, in_progress, done' });
        }
        where.push('t.status = ?');
        params.push(status);
    }

    // Exclude recurring parents from results (show only instances)
    where.push('(t.is_recurring = 0 OR t.recurring_parent_id IS NOT NULL)');

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const sql = `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    ${whereClause}
    ORDER BY 
      CASE t.status 
        WHEN 'in_progress' THEN 1
        WHEN 'todo' THEN 2
        WHEN 'done' THEN 3
      END,
      CASE t.priority
        WHEN 1 THEN 1
        WHEN 2 THEN 2
        WHEN 3 THEN 3
      END,
      t.due_time ASC,
      t.created_at DESC
  `;

    try {
        const tasks = db.prepare(sql).all(...params);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/tasks/month-summary — get task counts per day for a month
router.get('/month-summary', (req, res) => {
    const { month, assignee } = req.query;
    if (!month) return res.status(400).json({ error: 'month param required (YYYY-MM)' });
    if (!isValidMonthString(month)) {
        return res.status(400).json({ error: 'invalid month format (YYYY-MM)' });
    }
    if (assignee && assignee !== 'all' && !isValidAssignee(assignee)) {
        return res.status(400).json({ error: 'assignee must be one of: 潘潘, 蒲蒲, all' });
    }

    const start = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${month}-${String(lastDay).padStart(2, '0')}`;

    generateRecurringInstances(start, end);

    let where = "t.due_date >= ? AND t.due_date <= ? AND (t.is_recurring = 0 OR t.recurring_parent_id IS NOT NULL)";
    let params = [start, end];

    if (assignee && assignee !== 'all') {
        where += ' AND t.assignee = ?';
        params.push(assignee);
    }

    const sql = `
    SELECT t.due_date, t.status, COUNT(*) as count, 
           c.color as category_color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE ${where}
    GROUP BY t.due_date, t.status, c.color
    ORDER BY t.due_date
  `;

    try {
        const rows = db.prepare(sql).all(...params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/tasks/clear-done — delete all done tasks for a date
router.delete('/clear-done', (req, res) => {
    const { date, assignee } = req.query;
    if (!date) return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });
    if (!isValidDateString(date)) {
        return res.status(400).json({ error: 'invalid date format (YYYY-MM-DD)' });
    }
    if (assignee && assignee !== 'all' && !isValidAssignee(assignee)) {
        return res.status(400).json({ error: 'assignee must be one of: 潘潘, 蒲蒲, all' });
    }

    let where = "status = 'done' AND due_date = ? AND (is_recurring = 0 OR recurring_parent_id IS NOT NULL)";
    let params = [date];

    if (assignee && assignee !== 'all') {
        where += ' AND assignee = ?';
        params.push(assignee);
    }

    try {
        const result = db.prepare(`DELETE FROM tasks WHERE ${where}`).run(...params);
        res.json({ success: true, deleted: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/tasks — create task
router.post('/', (req, res) => {
    const normalized = normalizeTaskPayload(req.body, { partial: false });
    if (normalized.error) {
        return res.status(400).json({ error: normalized.error });
    }
    const taskInput = normalized.value;

    try {
        const result = db.prepare(`
      INSERT INTO tasks (title, description, assignee, category_id, priority, due_date, due_time, end_time,
        is_recurring, recurring_type, recurring_interval, recurring_end_date, auto_complete)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            taskInput.title,
            taskInput.description,
            taskInput.assignee,
            taskInput.category_id,
            taskInput.priority,
            taskInput.due_date,
            taskInput.due_time,
            taskInput.end_time,
            taskInput.is_recurring ? 1 : 0,
            taskInput.recurring_type,
            taskInput.recurring_interval,
            taskInput.recurring_end_date,
            taskInput.due_time ? (taskInput.auto_complete !== undefined ? (taskInput.auto_complete ? 1 : 0) : 1) : 0
        );

        const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/tasks/:id — update task
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const taskId = parseInteger(id);
    if (taskId === null || taskId <= 0) {
        return res.status(400).json({ error: 'Task id must be a positive integer' });
    }

    const normalized = normalizeTaskPayload(req.body, { partial: true });
    if (normalized.error) {
        return res.status(400).json({ error: normalized.error });
    }
    const fields = normalized.value;

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
        updates.push(`${key} = ?`);
        values.push(['is_recurring', 'auto_complete'].includes(key) ? (value ? 1 : 0) : value);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push("updated_at = datetime('now', 'localtime')");
    values.push(taskId);

    try {
        const prevTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        if (!prevTask) return res.status(404).json({ error: 'Task not found' });

        db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(taskId);

        if (!task) return res.status(404).json({ error: 'Task not found' });

        // ── Award coins when task completed ──
        let coinsEarned = 0;
        if (fields.status === 'done' && prevTask.status !== 'done') {
            try {
                db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                    .run(TASK_REWARD, task.assignee);
                db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                    .run(task.assignee, TASK_REWARD, 'task_done', task.title);
                coinsEarned = TASK_REWARD;
            } catch (e) { console.error('Coin reward error:', e); }
        }
        // ── Deduct coins when task un-completed (done → todo/in_progress) ──
        let coinsDeducted = 0;
        if (prevTask.status === 'done' && fields.status && fields.status !== 'done') {
            try {
                db.prepare('UPDATE coin_accounts SET balance = MAX(0, balance - ?) WHERE assignee = ?')
                    .run(TASK_REWARD, task.assignee);
                db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                    .run(task.assignee, -TASK_REWARD, 'task_undone', task.title);
                coinsDeducted = TASK_REWARD;
            } catch (e) { console.error('Coin rollback error:', e); }
        }

        res.json({ ...task, coinsEarned, coinsDeducted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/tasks/:id — delete task
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const { delete_series } = req.query;

    try {
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        if (delete_series === 'true' && task.is_recurring && !task.recurring_parent_id) {
            // Delete the parent and all instances
            db.prepare('DELETE FROM tasks WHERE recurring_parent_id = ?').run(id);
            db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        } else if (delete_series === 'true' && task.recurring_parent_id) {
            // Delete parent and all siblings
            db.prepare('DELETE FROM tasks WHERE recurring_parent_id = ?').run(task.recurring_parent_id);
            db.prepare('DELETE FROM tasks WHERE id = ?').run(task.recurring_parent_id);
        } else {
            db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
