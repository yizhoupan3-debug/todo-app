const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/stats — aggregate statistics
router.get('/', (req, res) => {
    const { range, assignee } = req.query;
    const days = range === 'month' ? 30 : 7;

    // Build date range
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    const assigneeFilter = (assignee && assignee !== 'all') ? assignee : null;

    try {
        // 1. Task completions per day
        let taskSql = `
            SELECT due_date as date, COUNT(*) as count
            FROM tasks
            WHERE status = 'done' AND due_date >= ? AND due_date <= ?
              AND (is_recurring = 0 OR recurring_parent_id IS NOT NULL)
        `;
        const taskParams = [startDate, endDate];
        if (assigneeFilter) {
            taskSql += ' AND assignee = ?';
            taskParams.push(assigneeFilter);
        }
        taskSql += ' GROUP BY due_date ORDER BY due_date';
        const taskRows = db.prepare(taskSql).all(...taskParams);

        // 2. Water intake per day
        let waterSql = `
            SELECT date, SUM(amount) as total
            FROM checkin_records
            WHERE type = 'water' AND date >= ? AND date <= ?
        `;
        const waterParams = [startDate, endDate];
        if (assigneeFilter) {
            waterSql += ' AND assignee = ?';
            waterParams.push(assigneeFilter);
        }
        waterSql += ' GROUP BY date ORDER BY date';
        const waterRows = db.prepare(waterSql).all(...waterParams);

        // 3. Water goal
        let waterGoal = 2000;
        if (assigneeFilter) {
            const goalRow = db.prepare('SELECT goal FROM checkin_goals WHERE type = ? AND assignee = ?')
                .get('water', assigneeFilter);
            if (goalRow) waterGoal = goalRow.goal;
        }

        // 4. Wakeup checkin per day
        let wakeupSql = `
            SELECT date, MIN(created_at) as first_checkin
            FROM checkin_records
            WHERE type = 'wakeup' AND date >= ? AND date <= ?
        `;
        const wakeupParams = [startDate, endDate];
        if (assigneeFilter) {
            wakeupSql += ' AND assignee = ?';
            wakeupParams.push(assigneeFilter);
        }
        wakeupSql += ' GROUP BY date ORDER BY date';
        const wakeupRows = db.prepare(wakeupSql).all(...wakeupParams);

        // 5. Pomodoro sessions per day
        let pomodoroSql = `
            SELECT date, SUM(focus_minutes) as total_minutes, SUM(rounds) as total_rounds
            FROM pomodoro_sessions
            WHERE date >= ? AND date <= ?
        `;
        const pomodoroParams = [startDate, endDate];
        if (assigneeFilter) {
            pomodoroSql += ' AND assignee = ?';
            pomodoroParams.push(assigneeFilter);
        }
        pomodoroSql += ' GROUP BY date ORDER BY date';
        const pomodoroRows = db.prepare(pomodoroSql).all(...pomodoroParams);

        // Build response with all dates filled
        const taskMap = Object.fromEntries(taskRows.map(r => [r.date, r.count]));
        const waterMap = Object.fromEntries(waterRows.map(r => [r.date, r.total]));
        const wakeupMap = Object.fromEntries(wakeupRows.map(r => [r.date, r.first_checkin]));
        const pomodoroMap = {};
        for (const r of pomodoroRows) {
            pomodoroMap[r.date] = { minutes: r.total_minutes, rounds: r.total_rounds };
        }

        const result = {
            dates,
            tasks: dates.map(d => taskMap[d] || 0),
            water: dates.map(d => waterMap[d] || 0),
            waterGoal,
            wakeup: dates.map(d => wakeupMap[d] || null),
            pomodoro: dates.map(d => pomodoroMap[d] || { minutes: 0, rounds: 0 }),
        };

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/stats/pomodoro — record a pomodoro session
router.post('/pomodoro', (req, res) => {
    const { assignee, focus_minutes, rounds, task_title } = req.body;
    if (!assignee || !focus_minutes) {
        return res.status(400).json({ error: 'assignee and focus_minutes are required' });
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    try {
        const result = db.prepare(`
            INSERT INTO pomodoro_sessions (assignee, focus_minutes, rounds, task_title, date)
            VALUES (?, ?, ?, ?, ?)
        `).run(assignee, focus_minutes, rounds || 1, task_title || null, today);

        const session = db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?')
            .get(result.lastInsertRowid);

        // ── Award coins based on focus duration ──
        let coinsEarned = 0;
        const mins = parseInt(focus_minutes);
        if (mins >= 60) coinsEarned = 8;
        else if (mins >= 45) coinsEarned = 5;
        else if (mins >= 25) coinsEarned = 3;

        if (coinsEarned > 0) {
            try {
                db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                    .run(coinsEarned, assignee);
                db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                    .run(assignee, coinsEarned, 'pomodoro', `${mins}min 专注`);
            } catch (e) { /* ignore */ }
        }

        res.status(201).json({ ...session, coinsEarned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
