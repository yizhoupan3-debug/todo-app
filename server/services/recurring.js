const db = require('../db');

/**
 * Generate recurring task instances for a given date range.
 * Called when querying tasks — checks recurring parents and creates
 * child instances if they don't already exist.
 */
function generateRecurringInstances(startDate, endDate) {
    const recurringTasks = db.prepare(`
    SELECT * FROM tasks 
    WHERE is_recurring = 1 
      AND recurring_parent_id IS NULL
      AND (recurring_end_date IS NULL OR recurring_end_date >= ?)
  `).all(startDate);

    const insertInstance = db.prepare(`
    INSERT OR IGNORE INTO tasks 
      (title, description, assignee, category_id, priority, due_date, due_time, status, recurring_parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?)
  `);

    const checkExisting = db.prepare(`
    SELECT id FROM tasks 
    WHERE recurring_parent_id = ? AND due_date = ?
  `);

    const generate = db.transaction(() => {
        for (const task of recurringTasks) {
            const dates = getOccurrences(task, startDate, endDate);
            for (const date of dates) {
                // Skip if instance already exists
                const existing = checkExisting.get(task.id, date);
                if (!existing) {
                    insertInstance.run(
                        task.title,
                        task.description,
                        task.assignee,
                        task.category_id,
                        task.priority,
                        date,
                        task.due_time,
                        task.id
                    );
                }
            }
        }
    });

    generate();
}

/**
 * Calculate occurrence dates for a recurring task within a date range.
 */
function getOccurrences(task, startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const taskStart = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
    const interval = task.recurring_interval || 1;
    const recurEnd = task.recurring_end_date ? new Date(task.recurring_end_date) : null;

    let current = new Date(taskStart);

    // Math jump: skip directly to the query range instead of iterating
    if (current < start) {
        const msPerDay = 86400000;
        const daysGap = Math.floor((start - current) / msPerDay);
        switch (task.recurring_type) {
            case 'daily':
            case 'custom': {
                const cycles = Math.floor(daysGap / interval);
                current.setDate(current.getDate() + cycles * interval);
                break;
            }
            case 'weekly': {
                const weekInterval = 7 * interval;
                const cycles = Math.floor(daysGap / weekInterval);
                current.setDate(current.getDate() + cycles * weekInterval);
                break;
            }
            case 'monthly': {
                const monthsGap = (start.getFullYear() - current.getFullYear()) * 12 + (start.getMonth() - current.getMonth());
                const cycles = Math.floor(monthsGap / interval);
                if (cycles > 0) current.setMonth(current.getMonth() + cycles * interval);
                break;
            }
        }
        // Fine-tune: advance until we're in range
        while (current < start) {
            advanceDate(current, task.recurring_type, interval);
        }
    }

    while (current <= end) {
        if (recurEnd && current > recurEnd) break;

        const dateStr = formatDate(current);
        // Don't generate for the original task's date (it already exists)
        if (dateStr !== task.due_date) {
            dates.push(dateStr);
        }

        advanceDate(current, task.recurring_type, interval);
    }

    return dates;
}

function advanceDate(date, type, interval) {
    switch (type) {
        case 'daily':
            date.setDate(date.getDate() + interval);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7 * interval);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + interval);
            break;
        case 'custom':
            date.setDate(date.getDate() + interval);
            break;
    }
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

module.exports = { generateRecurringInstances, formatDate };
