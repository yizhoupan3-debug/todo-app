const express = require('express');
const db = require('../db');
const { generateRecurringInstances } = require('../services/recurring');
const { TASK_REWARD } = require('./garden-shared');

const router = express.Router();

// Valid date format: YYYY-MM-DD
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const VALID_ASSIGNEES = ['潘潘', '蒲蒲'];

// GET /api/tasks — list tasks with optional filters
router.get('/', (req, res) => {
    const { assignee, date, month, status } = req.query;

    let where = [];
    let params = [];

    if (assignee && assignee !== 'all') {
        where.push('t.assignee = ?');
        params.push(assignee);
    }

    if (date) {
        if (!DATE_RE.test(date) || isNaN(new Date(date + 'T00:00:00').getTime())) {
            return res.status(400).json({ error: 'invalid date format (YYYY-MM-DD)' });
        }
        // Generate recurring instances for this date range
        generateRecurringInstances(date, date);
        where.push('t.due_date = ?');
        params.push(date);
    }

    if (month) {
        if (!MONTH_RE.test(month)) {
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
    const { title, description, assignee, category_id, priority, due_date, due_time, end_time,
        is_recurring, recurring_type, recurring_interval, recurring_end_date, auto_complete } = req.body;

    if (!title || !assignee) {
        return res.status(400).json({ error: 'title and assignee are required' });
    }
    if (!VALID_ASSIGNEES.includes(assignee)) {
        return res.status(400).json({ error: `assignee must be one of: ${VALID_ASSIGNEES.join(', ')}` });
    }

    try {
        const result = db.prepare(`
      INSERT INTO tasks (title, description, assignee, category_id, priority, due_date, due_time, end_time,
        is_recurring, recurring_type, recurring_interval, recurring_end_date, auto_complete)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            title,
            description || '',
            assignee,
            category_id || null,
            priority || 2,
            due_date || null,
            due_time || null,
            end_time || null,
            is_recurring ? 1 : 0,
            recurring_type || null,
            recurring_interval || 1,
            recurring_end_date || null,
            due_time ? (auto_complete !== undefined ? (auto_complete ? 1 : 0) : 1) : 0
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
    const fields = req.body;

    const allowedFields = ['title', 'description', 'assignee', 'category_id', 'priority',
        'due_date', 'due_time', 'end_time', 'status', 'is_recurring', 'recurring_type',
        'recurring_interval', 'recurring_end_date', 'auto_complete'];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
        if (allowedFields.includes(key)) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push("updated_at = datetime('now', 'localtime')");
    values.push(id);

    try {
        const prevTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        if (!prevTask) return res.status(404).json({ error: 'Task not found' });

        db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

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
