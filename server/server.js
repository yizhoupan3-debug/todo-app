// Fix timezone for auto-complete timer (deployed servers may use UTC)
process.env.TZ = 'Asia/Shanghai';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const compression = require('compression');

const app = express();
const server = http.createServer(app);
const configuredOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : null;
const ioCorsOrigin = configuredOrigins && configuredOrigins.length
    ? configuredOrigins
    : true;

const io = new Server(server, {
    cors: {
        origin: ioCorsOrigin,
    }
});

function appendVary(existing, value) {
    if (!existing) return value;
    return existing.includes(value) ? existing : `${existing}, ${value}`;
}

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowAll = !configuredOrigins || configuredOrigins.length === 0;
    const allowOrigin = allowAll
        ? origin || '*'
        : (origin && configuredOrigins.includes(origin) ? origin : '');

    if (allowOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowOrigin);
        res.setHeader('Vary', appendVary(res.getHeader('Vary'), 'Origin'));
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

// Middleware
app.use(compression()); // Gzip all responses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Service worker must NEVER be cached by browser
app.get('/sw.js', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(__dirname, '..', 'public', 'sw.js'));
});
app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: '1d',          // Cache static assets for 1 day
    etag: true,            // Enable ETag for cache validation
    lastModified: true,
    setHeaders: (res, filePath) => {
        // JS and CSS should revalidate more often
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.set('Cache-Control', 'public, max-age=0, must-revalidate');
        }
    }
}));

// API Routes
const tasksRouter = require('./routes/tasks');
const categoriesRouter = require('./routes/categories');
const importRouter = require('./routes/import');
const checkinRouter = require('./routes/checkin');
const statsRouter = require('./routes/stats');
const gardenRouter = require('./routes/garden');

app.use('/api/tasks', tasksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/import', importRouter);
app.use('/api/checkin', checkinRouter);
app.use('/api/stats', statsRouter);
app.use('/api/garden', gardenRouter);

// Socket.io for real-time sync
io.on('connection', (socket) => {
    console.log('📱 Client connected:', socket.id);

    socket.on('task:created', (task) => {
        socket.broadcast.emit('task:created', task);
    });

    socket.on('task:updated', (task) => {
        socket.broadcast.emit('task:updated', task);
    });

    socket.on('task:deleted', (data) => {
        socket.broadcast.emit('task:deleted', data);
    });

    socket.on('task:imported', (data) => {
        socket.broadcast.emit('task:imported', data);
    });

    socket.on('disconnect', () => {
        console.log('📴 Client disconnected:', socket.id);
    });
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Auto-complete timer — check every 60 seconds
const db = require('./db');
const { TASK_REWARD } = require('./routes/garden-shared');
setInterval(() => {
    try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Find tasks to auto-complete (need their info for coin rewards)
        const tasksToComplete = db.prepare(`
            SELECT id, assignee, title FROM tasks
            WHERE auto_complete = 1 AND status = 'todo' AND due_date = ? AND due_time IS NOT NULL AND due_time <= ?
        `).all(todayStr, timeStr);

        if (tasksToComplete.length > 0) {
            const completeAndReward = db.transaction(() => {
                for (const task of tasksToComplete) {
                    db.prepare(`UPDATE tasks SET status = 'done', updated_at = datetime('now', 'localtime') WHERE id = ?`)
                        .run(task.id);
                    // Award coins — same as manual completion in tasks.js PUT route
                    try {
                        db.prepare('UPDATE coin_accounts SET balance = balance + ? WHERE assignee = ?')
                            .run(TASK_REWARD, task.assignee);
                        db.prepare('INSERT INTO coin_transactions (assignee, amount, reason, detail) VALUES (?, ?, ?, ?)')
                            .run(task.assignee, TASK_REWARD, 'task_done', task.title);
                    } catch (e) { console.error('Auto-complete coin reward error:', e.message); }
                }
            });
            completeAndReward();
            console.log(`⏰ 自动完成了 ${tasksToComplete.length} 个任务 (+${TASK_REWARD} 币/个)`);
            io.emit('task:updated', { autoCompleted: true });
        }
    } catch (err) {
        console.error('Auto-complete error:', err.message);
    }
}, 60000); // every 60 seconds

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let localIP = 'localhost';
    // Prefer WiFi/Ethernet interfaces (en0, en1) over VPN/virtual interfaces
    const preferred = ['en0', 'en1', 'eth0', 'wlan0'];
    const candidates = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                candidates.push({ name, address: iface.address });
            }
        }
    }
    const pick = candidates.find(c => preferred.includes(c.name)) || candidates[0];
    if (pick) localIP = pick.address;
    console.log('');
    console.log('⚔️ 峡谷讨伐日记 已启动!');
    console.log(`   本机访问: http://localhost:${PORT}`);
    console.log(`   局域网访问: http://${localIP}:${PORT}`);
    console.log('');
});
