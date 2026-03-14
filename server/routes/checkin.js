const express = require('express');
const db = require('../db');
const { CHECKIN_DAILY_REWARD, CHECKIN_STREAK_3_BONUS, CHECKIN_STREAK_7_BONUS } = require('./garden-shared');

const router = express.Router();
const WAKEUP_REWARD_DEADLINE_HOUR = 9;
const GOOUT_REWARD_DEADLINE_HOUR = 9;
const GOOUT_REWARD_DEADLINE_MIN = 30;

function isRewardEligible(checkinType, now = new Date()) {
    if (checkinType === 'wakeup') {
        return now.getHours() < WAKEUP_REWARD_DEADLINE_HOUR;
    }
    if (checkinType === 'goout') {
        const h = now.getHours();
        const m = now.getMinutes();
        return h < GOOUT_REWARD_DEADLINE_HOUR || (h === GOOUT_REWARD_DEADLINE_HOUR && m < GOOUT_REWARD_DEADLINE_MIN);
    }
    return true;
}

// GET /api/checkin — get records for a date + assignee
router.get('/', (req, res) => {
    const { date, assignee, type } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });

    let sql = 'SELECT * FROM checkin_records WHERE date = ?';
    const params = [date];

    if (assignee) {
        sql += ' AND assignee = ?';
        params.push(assignee);
    }
    if (type) {
        sql += ' AND type = ?';
        params.push(type);
    }

    sql += ' ORDER BY created_at DESC';

    try {
        const records = db.prepare(sql).all(...params);
        // Also return daily total
        let totalSql = 'SELECT COALESCE(SUM(amount), 0) as total FROM checkin_records WHERE date = ? AND type = ?';
        const totalParams = [date, type || 'water'];
        if (assignee) {
            totalSql += ' AND assignee = ?';
            totalParams.push(assignee);
        }
        const { total } = db.prepare(totalSql).get(...totalParams);
        res.json({ records, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/checkin — add a check-in record
router.post('/', (req, res) => {
    const { type, amount, assignee, date } = req.body;
    if (!assignee || !amount) {
        return res.status(400).json({ error: 'assignee and amount are required' });
    }

    const now = new Date();
    const today = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const checkinType = type || 'water';

    try {
        const result = db.prepare(`
            INSERT INTO checkin_records (type, amount, assignee, date)
            VALUES (?, ?, ?, ?)
        `).run(checkinType, amount, assignee, today);

        const record = db.prepare('SELECT * FROM checkin_records WHERE id = ?').get(result.lastInsertRowid);

        // Return updated total
        const { total } = db.prepare(
            'SELECT COALESCE(SUM(amount), 0) as total FROM checkin_records WHERE date = ? AND type = ? AND assignee = ?'
        ).get(today, checkinType, assignee);

        // ── Check-in coin rewards ──
        let coinsEarned = 0;
        let streakBonus = 0;
        let currentStreak = 0;

        // Get goal for this type
        const goalRow = db.prepare('SELECT goal FROM checkin_goals WHERE type = ? AND assignee = ?')
            .get(checkinType, assignee);
        // Default goal by type
        const defaultGoals = { water: 2000, wakeup: 1, goout: 1, skincare: 1, steps: 10000 };
        const goal = goalRow ? goalRow.goal : (defaultGoals[checkinType] || 1);

        const rewardEligible = isRewardEligible(checkinType, now);

        if (total >= goal && rewardEligible) {
            // Daily goal reached — check if already rewarded today
            const streak = db.prepare('SELECT * FROM checkin_streaks WHERE assignee = ? AND type = ?')
                .get(assignee, checkinType);

            const alreadyRewardedToday = streak && streak.last_date === today;

            if (!alreadyRewardedToday) {
                // +0.5 daily reward
                coinsEarned = CHECKIN_DAILY_REWARD;
                db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                    .run(CHECKIN_DAILY_REWARD, assignee);
                db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                    .run(assignee, CHECKIN_DAILY_REWARD, 'checkin_daily', `${checkinType} 达标`);

                // Update streak
                let newStreak = 1;
                if (streak) {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().slice(0, 10);
                    if (streak.last_date === yesterdayStr) {
                        newStreak = streak.current_streak + 1;
                    }
                }

                db.prepare(`
                    INSERT INTO checkin_streaks (assignee, type, current_streak, last_date)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(assignee, type) DO UPDATE SET current_streak = ?, last_date = ?
                `).run(assignee, checkinType, newStreak, today, newStreak, today);

                currentStreak = newStreak;

                // 3-day streak bonus
                const updatedStreak = db.prepare('SELECT * FROM checkin_streaks WHERE assignee = ? AND type = ?')
                    .get(assignee, checkinType);
                if (newStreak >= 3 && newStreak % 3 === 0 && updatedStreak.reward_3_claimed !== today) {
                    streakBonus += CHECKIN_STREAK_3_BONUS;
                    db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?').run(CHECKIN_STREAK_3_BONUS, assignee);
                    db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                        .run(assignee, CHECKIN_STREAK_3_BONUS, 'checkin_streak_3', `${checkinType} 连续${newStreak}天`);
                    db.prepare('UPDATE checkin_streaks SET reward_3_claimed = ? WHERE assignee = ? AND type = ?')
                        .run(today, assignee, checkinType);
                }

                // 7-day streak bonus + reset
                if (newStreak >= 7 && newStreak % 7 === 0 && updatedStreak.reward_7_claimed !== today) {
                    streakBonus += CHECKIN_STREAK_7_BONUS;
                    db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?').run(CHECKIN_STREAK_7_BONUS, assignee);
                    db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                        .run(assignee, CHECKIN_STREAK_7_BONUS, 'checkin_streak_7', `${checkinType} 连续${newStreak}天`);
                    db.prepare('UPDATE checkin_streaks SET reward_7_claimed = ? WHERE assignee = ? AND type = ?')
                        .run(today, assignee, checkinType);

                    // Reset streak after 7-day cycle
                    db.prepare('UPDATE checkin_streaks SET current_streak = 0 WHERE assignee = ? AND type = ?')
                        .run(assignee, checkinType);
                    currentStreak = 0;
                }
            }

            if (streak && !currentStreak) currentStreak = streak.current_streak;
        }

        res.json({
            record,
            total,
            coinsEarned: coinsEarned + streakBonus,
            currentStreak,
            streakBonus,
            rewardEligible,
            rewardBlockedReason: !rewardEligible
                ? (checkinType === 'wakeup'
                    ? `起床打卡需在 ${WAKEUP_REWARD_DEADLINE_HOUR}:00 前才有喵喵币`
                    : checkinType === 'goout'
                        ? `出门打卡需在 ${GOOUT_REWARD_DEADLINE_HOUR}:${String(GOOUT_REWARD_DEADLINE_MIN).padStart(2,'0')} 前才有喵喵币`
                        : null)
                : null,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/checkin/:id — undo a check-in
router.delete('/:id', (req, res) => {
    try {
        const record = db.prepare('SELECT * FROM checkin_records WHERE id = ?').get(req.params.id);
        if (!record) return res.status(404).json({ error: 'not found' });

        db.prepare('DELETE FROM checkin_records WHERE id = ?').run(req.params.id);

        const { total } = db.prepare(
            'SELECT COALESCE(SUM(amount), 0) as total FROM checkin_records WHERE date = ? AND type = ? AND assignee = ?'
        ).get(record.date, record.type, record.assignee);

        res.json({ success: true, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/checkin/goal — get goal for type + assignee
router.get('/goal', (req, res) => {
    const { type, assignee } = req.query;
    if (!assignee) return res.status(400).json({ error: 'assignee is required' });
    try {
        const row = db.prepare('SELECT goal FROM checkin_goals WHERE type = ? AND assignee = ?')
            .get(type || 'water', assignee);
        const defaultGoals = { water: 2000, wakeup: 1, goout: 1, skincare: 1, steps: 10000 };
        const t = type || 'water';
        res.json({ goal: row ? row.goal : (defaultGoals[t] || 1) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/checkin/goal — set goal for type + assignee
router.put('/goal', (req, res) => {
    const { type, assignee, goal } = req.body;
    if (!assignee || !goal) return res.status(400).json({ error: 'assignee and goal are required' });
    try {
        db.prepare(`
            INSERT INTO checkin_goals (type, assignee, goal) VALUES (?, ?, ?)
            ON CONFLICT(type, assignee) DO UPDATE SET goal = excluded.goal
        `).run(type || 'water', assignee, goal);
        res.json({ success: true, goal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
