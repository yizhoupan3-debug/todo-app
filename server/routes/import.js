const express = require('express');
const multer = require('multer');
const { parseICS } = require('../services/ics-parser');
const db = require('../db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// POST /api/import/ics/confirm — actually insert parsed tasks
router.post('/ics/confirm', (req, res) => {
    const { tasks, assignee } = req.body;
    if (!tasks || !Array.isArray(tasks) || !assignee) {
        return res.status(400).json({ error: 'tasks array and assignee are required' });
    }

    const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, assignee, due_date, due_time,
      is_recurring, recurring_type, recurring_interval, recurring_end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    try {
        const insertMany = db.transaction((items) => {
            const inserted = [];
            for (const task of items) {
                const result = insertTask.run(
                    task.title,
                    task.description || '',
                    assignee,
                    task.due_date || null,
                    task.due_time || null,
                    task.is_recurring ? 1 : 0,
                    task.recurring_type || null,
                    task.recurring_interval || 1,
                    task.recurring_end_date || null
                );
                inserted.push(result.lastInsertRowid);
            }
            return inserted;
        });

        const ids = insertMany(tasks);
        res.json({ success: true, count: ids.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
