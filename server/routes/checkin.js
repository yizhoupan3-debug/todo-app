const express = require('express');
const db = require('../db');
const { CHECKIN_DAILY_REWARD, CHECKIN_STREAK_3_BONUS, CHECKIN_STREAK_7_BONUS } = require('./garden-shared');

const router = express.Router();
const WAKEUP_REWARD_DEADLINE_HOUR = 9;
const GOOUT_REWARD_DEADLINE_HOUR = 9;
const GOOUT_REWARD_DEADLINE_MIN = 30;

/** Default goals per check-in type. */
const DEFAULT_GOALS = { water: 2000, wakeup: 1, goout: 1, skincare: 1, steps: 10000 };

/**
 * Check if a check-in of the given type is eligible for coin reward.
 * @param {string} checkinType - wakeup | goout | ...
 * @param {Date} [now] - current time (defaults to now)
 * @returns {boolean}
 */
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

/**
 * Get the goal for a given type + assignee.
 * @param {string} type
 * @param {string} assignee
 * @returns {number}
 */
function getGoalFor(type, assignee) {
    const goalRow = db.prepare('SELECT goal FROM checkin_goals WHERE type = ? AND assignee = ?')
        .get(type, assignee);
    return goalRow ? goalRow.goal : (DEFAULT_GOALS[type] || 1);
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

    const VALID_TYPES = ['water', 'wakeup', 'goout', 'skincare', 'steps'];
    if (!VALID_TYPES.includes(checkinType)) {
        return res.status(400).json({ error: `invalid type: ${checkinType}. Valid: ${VALID_TYPES.join(', ')}` });
    }

    try {
        const rewardEligible = isRewardEligible(checkinType, now);

        // Wrap insert + reward logic in a single transaction to prevent
        // concurrent double-reward from multiple devices
        const txResult = db.transaction(() => {
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
            let streakWasReset = false;

            const goal = getGoalFor(checkinType, assignee);

            if (total >= goal && rewardEligible) {
                const streak = db.prepare('SELECT * FROM checkin_streaks WHERE assignee = ? AND type = ?')
                    .get(assignee, checkinType);

                const alreadyRewardedToday = streak && streak.last_date === today;

                if (!alreadyRewardedToday) {
                    coinsEarned = CHECKIN_DAILY_REWARD;
                    db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                        .run(CHECKIN_DAILY_REWARD, assignee);
                    db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                        .run(assignee, CHECKIN_DAILY_REWARD, 'checkin_daily', `${checkinType} 达标`);

                    let newStreak = 1;
                    if (streak) {
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
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

                    if (newStreak >= 7 && newStreak % 7 === 0 && updatedStreak.reward_7_claimed !== today) {
                        streakBonus += CHECKIN_STREAK_7_BONUS;
                        db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?').run(CHECKIN_STREAK_7_BONUS, assignee);
                        db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                            .run(assignee, CHECKIN_STREAK_7_BONUS, 'checkin_streak_7', `${checkinType} 连续${newStreak}天`);
                        db.prepare('UPDATE checkin_streaks SET reward_7_claimed = ? WHERE assignee = ? AND type = ?')
                            .run(today, assignee, checkinType);

                        db.prepare('UPDATE checkin_streaks SET current_streak = 0 WHERE assignee = ? AND type = ?')
                            .run(assignee, checkinType);
                        currentStreak = 0;
                        streakWasReset = true;
                    }
                }

                // Only fall back to previous streak value if not already set and streak was not reset
                if (streak && !currentStreak && !streakWasReset) currentStreak = streak.current_streak;
            }

            return { record, total, coinsEarned: coinsEarned + streakBonus, currentStreak, streakBonus };
        })();

        res.json({
            ...txResult,
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

// GET /api/checkin/goal — get goal for type + assignee
// IMPORTANT: Must be registered BEFORE DELETE /:id to prevent Express matching '/goal' as id='goal'
router.get('/goal', (req, res) => {
    const { type, assignee } = req.query;
    if (!assignee) return res.status(400).json({ error: 'assignee is required' });
    try {
        const t = type || 'water';
        res.json({ goal: getGoalFor(t, assignee) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/checkin/goal — set goal for type + assignee
// IMPORTANT: Must be registered BEFORE DELETE /:id
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

/**
 * GET /api/checkin/history-batch
 * Returns the past N days of records for a single check-in type.
 * Replaces 7 parallel API calls from the frontend with 1 query.
 * Query: ?assignee=&type=&days=7
 */
router.get('/history-batch', (req, res) => {
    const { assignee, type, days } = req.query;
    if (!assignee || !type) return res.status(400).json({ error: 'assignee and type are required' });

    const numDays = Math.min(30, Math.max(1, parseInt(days || '7', 10)));
    try {
        // Build a list of date strings for the past numDays days (server local time)
        const dates = [];
        for (let i = 0; i < numDays; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }

        // Single query using composite index (date, type, assignee)
        const placeholders = dates.map(() => '?').join(', ');
        const records = db.prepare(
            `SELECT date, created_at, amount FROM checkin_records
             WHERE assignee = ? AND type = ? AND date IN (${placeholders})
             ORDER BY date DESC, created_at DESC`
        ).all(assignee, type, ...dates);

        // Group by date
        const byDate = {};
        for (const r of records) {
            if (!byDate[r.date]) byDate[r.date] = [];
            byDate[r.date].push(r);
        }

        // Return ordered list from newest to oldest
        const result = dates.map(date => ({
            date,
            records: byDate[date] || [],
        }));

        res.json({ days: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/checkin/landing-summary
 * Returns today's status for all 5 check-in cards in a single round-trip.
 * Query: ?assignee=
 */
router.get('/landing-summary', (req, res) => {
    const { assignee } = req.query;
    if (!assignee) return res.status(400).json({ error: 'assignee is required' });

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    try {
        // All 5 types in a single query (uses composite index)
        const TYPES = ['water', 'wakeup', 'goout', 'skincare', 'steps'];
        const records = db.prepare(
            `SELECT type, amount, created_at FROM checkin_records
             WHERE assignee = ? AND date = ?
             ORDER BY created_at ASC`
        ).all(assignee, today);

        // Fetch all goals in one query
        const goalRows = db.prepare(
            'SELECT type, goal FROM checkin_goals WHERE assignee = ?'
        ).all(assignee);
        const DEFAULT_GOALS = { water: 2000, wakeup: 1, goout: 1, skincare: 1, steps: 10000 };
        const goals = {};
        for (const t of TYPES) {
            const row = goalRows.find(g => g.type === t);
            goals[t] = row ? row.goal : DEFAULT_GOALS[t];
        }

        // Aggregate totals and first timestamp per type
        const summary = {};
        for (const t of TYPES) {
            summary[t] = { total: 0, firstRecord: null };
        }
        for (const r of records) {
            if (!summary[r.type]) continue;
            summary[r.type].total += r.amount;
            if (!summary[r.type].firstRecord) {
                summary[r.type].firstRecord = r.created_at;
            }
        }

        // Build per-type response
        const result = {};
        for (const t of TYPES) {
            const { total, firstRecord } = summary[t];
            const goal = goals[t];
            const reached = total >= goal;
            const firstTime = firstRecord ? firstRecord.split(' ')[1]?.slice(0, 5) : null;
            result[t] = { total, goal, reached, firstTime };
        }

        res.json({ today, summary: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// DELETE /api/checkin/:id — undo a check-in (with coin rollback)
router.delete('/:id', (req, res) => {
    try {
        const record = db.prepare('SELECT * FROM checkin_records WHERE id = ?').get(req.params.id);
        if (!record) return res.status(404).json({ error: 'not found' });

        const txResult = db.transaction(() => {
            // Delete the record first
            db.prepare('DELETE FROM checkin_records WHERE id = ?').run(req.params.id);

            // Recalculate total after deletion
            const { total } = db.prepare(
                'SELECT COALESCE(SUM(amount), 0) as total FROM checkin_records WHERE date = ? AND type = ? AND assignee = ?'
            ).get(record.date, record.type, record.assignee);

            const goal = getGoalFor(record.type, record.assignee);
            let coinsRolledBack = 0;

            // If total dropped below goal AND coins were awarded today, roll back
            if (total < goal) {
                const streak = db.prepare('SELECT * FROM checkin_streaks WHERE assignee = ? AND type = ?')
                    .get(record.assignee, record.type);

                if (streak && streak.last_date === record.date) {
                    // Roll back daily reward
                    coinsRolledBack += CHECKIN_DAILY_REWARD;
                    db.prepare('UPDATE coin_accounts SET balance = MAX(0, balance - ?) WHERE assignee = ?')
                        .run(CHECKIN_DAILY_REWARD, record.assignee);
                    db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                        .run(record.assignee, -CHECKIN_DAILY_REWARD, 'checkin_undo', `${record.type} 撤销打卡`);

                    // Roll back streak bonuses if they were awarded today
                    if (streak.reward_3_claimed === record.date) {
                        coinsRolledBack += CHECKIN_STREAK_3_BONUS;
                        db.prepare('UPDATE coin_accounts SET balance = MAX(0, balance - ?) WHERE assignee = ?')
                            .run(CHECKIN_STREAK_3_BONUS, record.assignee);
                        db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                            .run(record.assignee, -CHECKIN_STREAK_3_BONUS, 'checkin_undo', `${record.type} 连续奖励撤销`);
                        db.prepare('UPDATE checkin_streaks SET reward_3_claimed = NULL WHERE assignee = ? AND type = ?')
                            .run(record.assignee, record.type);
                    }
                    if (streak.reward_7_claimed === record.date) {
                        coinsRolledBack += CHECKIN_STREAK_7_BONUS;
                        db.prepare('UPDATE coin_accounts SET balance = MAX(0, balance - ?) WHERE assignee = ?')
                            .run(CHECKIN_STREAK_7_BONUS, record.assignee);
                        db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                            .run(record.assignee, -CHECKIN_STREAK_7_BONUS, 'checkin_undo', `${record.type} 连续奖励撤销`);
                        db.prepare('UPDATE checkin_streaks SET reward_7_claimed = NULL WHERE assignee = ? AND type = ?')
                            .run(record.assignee, record.type);
                    }

                    // Reset streak: decrement or clear last_date so it won't be double-counted
                    if (streak.current_streak > 1) {
                        // Decrement streak and reset last_date to yesterday
                        const prevDate = new Date(record.date);
                        prevDate.setDate(prevDate.getDate() - 1);
                        const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
                        db.prepare('UPDATE checkin_streaks SET current_streak = current_streak - 1, last_date = ? WHERE assignee = ? AND type = ?')
                            .run(prevDateStr, record.assignee, record.type);
                    } else {
                        // Reset streak entirely
                        db.prepare('UPDATE checkin_streaks SET current_streak = 0, last_date = NULL WHERE assignee = ? AND type = ?')
                            .run(record.assignee, record.type);
                    }
                }
            }

            return { total, coinsRolledBack };
        })();

        res.json({ success: true, ...txResult });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
