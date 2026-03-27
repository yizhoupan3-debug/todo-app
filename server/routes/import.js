const express = require('express');
const multer = require('multer');
const { parseICS } = require('../services/ics-parser');
const db = require('../db');
const {
    VALID_RECURRING_TYPES,
    isValidAssignee,
    isValidDateString,
    isValidTimeString,
    isOneOf,
    parseBooleanLike,
    parseInteger,
} = require('../validation');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

// POST /api/import/ics — upload and parse ICS file
router.post('/ics', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const icsString = req.file.buffer.toString('utf-8');
        const parsedTasks = parseICS(icsString);
        res.json({ tasks: parsedTasks, filename: req.file.originalname });
    } catch (err) {
        res.status(400).json({ error: 'Failed to parse ICS file: ' + err.message });
    }
});

function normalizeImportedTask(task, index) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) {
        return { error: `tasks[${index}] must be an object` };
    }

    const title = typeof task.title === 'string' ? task.title.trim() : '';
    if (!title) {
        return { error: `tasks[${index}].title is required` };
    }

    if (task.due_date !== undefined && task.due_date !== null && task.due_date !== '' && !isValidDateString(task.due_date)) {
        return { error: `tasks[${index}].due_date must use YYYY-MM-DD` };
    }

    if (task.due_time !== undefined && task.due_time !== null && task.due_time !== '' && !isValidTimeString(task.due_time)) {
        return { error: `tasks[${index}].due_time must use HH:MM` };
    }

    if (task.recurring_type !== undefined && task.recurring_type !== null && task.recurring_type !== '' && !isOneOf(task.recurring_type, VALID_RECURRING_TYPES)) {
        return { error: `tasks[${index}].recurring_type must be one of: daily, weekly, monthly, custom` };
    }

    if (task.recurring_interval !== undefined && task.recurring_interval !== null && task.recurring_interval !== '') {
        const recurringInterval = parseInteger(task.recurring_interval);
        if (recurringInterval === null || recurringInterval <= 0) {
            return { error: `tasks[${index}].recurring_interval must be a positive integer` };
        }
    }

    if (task.recurring_end_date !== undefined && task.recurring_end_date !== null && task.recurring_end_date !== '' && !isValidDateString(task.recurring_end_date)) {
        return { error: `tasks[${index}].recurring_end_date must use YYYY-MM-DD` };
    }

    if (task.is_recurring !== undefined) {
        const recurringFlag = parseBooleanLike(task.is_recurring);
        if (recurringFlag === null) {
            return { error: `tasks[${index}].is_recurring must be a boolean` };
        }
    }

    return {
        value: {
            title,
            description: typeof task.description === 'string' ? task.description : '',
            due_date: task.due_date || null,
            due_time: task.due_time || null,
            is_recurring: parseBooleanLike(task.is_recurring) === true,
            recurring_type: task.recurring_type || null,
            recurring_interval: task.recurring_interval === undefined ? 1 : parseInteger(task.recurring_interval),
            recurring_end_date: task.recurring_end_date || null,
        },
    };
}

// POST /api/import/ics/confirm — actually insert parsed tasks
router.post('/ics/confirm', (req, res) => {
    const { tasks, assignee } = req.body;
    if (!tasks || !Array.isArray(tasks) || !assignee) {
        return res.status(400).json({ error: 'tasks array and assignee are required' });
    }
    if (!isValidAssignee(assignee)) {
        return res.status(400).json({ error: 'assignee must be one of: 潘潘, 蒲蒲' });
    }

    const normalizedTasks = [];
    for (const [index, task] of tasks.entries()) {
        const normalized = normalizeImportedTask(task, index);
        if (normalized.error) {
            return res.status(400).json({ error: normalized.error });
        }
        normalizedTasks.push(normalized.value);
    }

    const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, assignee, due_date, due_time,
      is_recurring, recurring_type, recurring_interval, recurring_end_date, status, auto_complete)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

    try {
        const now = new Date();
        const insertMany = db.transaction((items) => {
            const inserted = [];
            for (const task of items) {
                // Auto-complete if due date+time has passed
                let status = 'todo';
                if (task.due_date && task.due_time) {
                    const taskDateTime = new Date(`${task.due_date}T${task.due_time}`);
                    if (taskDateTime <= now) status = 'done';
                } else if (task.due_date && !task.due_time) {
                    // Date-only: mark done if date is in the past
                    const taskDate = new Date(task.due_date + 'T23:59:59');
                    if (taskDate < now) status = 'done';
                }
                const result = insertTask.run(
                    task.title,
                    task.description || '',
                    assignee,
                    task.due_date || null,
                    task.due_time || null,
                    task.is_recurring ? 1 : 0,
                    task.recurring_type || null,
                    task.recurring_interval || 1,
                    task.recurring_end_date || null,
                    status
                );
                inserted.push(result.lastInsertRowid);
            }
            return inserted;
        });

        const ids = insertMany(normalizedTasks);
        res.json({ success: true, count: ids.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
