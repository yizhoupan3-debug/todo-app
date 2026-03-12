const ICAL = require('ical.js');

/**
 * Parse an ICS file string and return an array of task objects.
 */
function parseICS(icsString) {
    const jcalData = ICAL.parse(icsString);
    const comp = new ICAL.Component(jcalData);
    const events = comp.getAllSubcomponents('vevent');
    const tasks = [];

    for (const event of events) {
        const vevent = new ICAL.Event(event);
        const task = {
            title: vevent.summary || 'Untitled',
            description: vevent.description || '',
            due_date: null,
            due_time: null,
            is_recurring: false,
            recurring_type: null,
            recurring_interval: 1,
            recurring_end_date: null,
        };

        // Extract date
        const dtstart = vevent.startDate;
        if (dtstart) {
            task.due_date = formatICALDate(dtstart);
            // If it has a time component (not all-day event)
            if (!dtstart.isDate) {
                task.due_time = formatICALTime(dtstart);
            }
        }

        // Extract recurrence
        const rruleProp = event.getFirstProperty('rrule');
        if (rruleProp) {
            const rrule = rruleProp.getFirstValue();
            task.is_recurring = true;

            const freq = rrule.freq;
            switch (freq) {
                case 'DAILY':
                    task.recurring_type = 'daily';
                    break;
                case 'WEEKLY':
                    task.recurring_type = 'weekly';
                    break;
                case 'MONTHLY':
                    task.recurring_type = 'monthly';
                    break;
                default:
                    task.recurring_type = 'custom';
            }

            task.recurring_interval = rrule.interval || 1;

            if (rrule.until) {
                task.recurring_end_date = formatICALDate(rrule.until);
            }
        }

        tasks.push(task);
    }

    // Also parse VTODO components
    const vtodos = comp.getAllSubcomponents('vtodo');
    for (const vtodo of vtodos) {
        const summary = vtodo.getFirstPropertyValue('summary') || 'Untitled';
        const description = vtodo.getFirstPropertyValue('description') || '';
        const due = vtodo.getFirstPropertyValue('due');

        const task = {
            title: summary,
            description: description,
            due_date: due ? formatICALDate(due) : null,
            due_time: due && !due.isDate ? formatICALTime(due) : null,
            is_recurring: false,
            recurring_type: null,
            recurring_interval: 1,
            recurring_end_date: null,
        };

        tasks.push(task);
    }

    return tasks;
}

function formatICALDate(icalDate) {
    const jsDate = icalDate.toJSDate();
    const y = jsDate.getFullYear();
    const m = String(jsDate.getMonth() + 1).padStart(2, '0');
    const d = String(jsDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatICALTime(icalDate) {
    const jsDate = icalDate.toJSDate();
    const h = String(jsDate.getHours()).padStart(2, '0');
    const min = String(jsDate.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
}

module.exports = { parseICS };
