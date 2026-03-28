// Fix timezone for auto-complete timer (deployed servers may use UTC)
process.env.TZ = 'Asia/Shanghai';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const compression = require('compression');
const { createAssetPipeline } = require('./assets');
const { getJournalUploadDir } = require('./app-data');

const app = express();
const server = http.createServer(app);
const publicDir = path.join(__dirname, '..', 'public');
const socketClientScript = path.join(__dirname, '..', 'node_modules', 'socket.io', 'client-dist', 'socket.io.min.js');
const defaultBackendOrigin = process.env.DEFAULT_BACKEND_ORIGIN || '';
const assets = createAssetPipeline({ publicDir, defaultBackendOrigin });
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
let autoCompleteTimer = null;

function appendVary(existing, value) {
    if (!existing) return value;
    return existing.includes(value) ? existing : `${existing}, ${value}`;
}

app.use((req, res, next) => {
    // Timeout Configuration: 15 seconds
    req.setTimeout(15000, () => {
        if (!res.headersSent) {
            res.status(408).json({ error: 'Request Timeout (Client connection too slow)' });
        }
    });
    res.setTimeout(15000, () => {
        if (!res.headersSent) {
            res.status(504).json({ error: 'Gateway Timeout (Server processing took too long)' });
        }
    });

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

function sendAppShell(res) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.type('html').send(assets.renderIndex());
}

// Service worker must NEVER be cached by browser
app.get('/sw.js', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.type('application/javascript').send(assets.renderServiceWorker());
});
app.get('/manifest.json', (req, res) => {
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
    res.type('application/manifest+json').send(assets.renderManifest());
});
app.get('/vendor/socket.io.js', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
    res.type('application/javascript');
    res.sendFile(socketClientScript, (error) => {
        if (error) next(error);
    });
});
app.get(['/', '/index.html'], (req, res) => {
    sendAppShell(res);
});
app.use(express.static(publicDir, {
    index: false,
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
const journalRouter = require('./routes/journal');

app.use('/api/tasks', tasksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/import', importRouter);
app.use('/api/checkin', checkinRouter);
app.use('/api/stats', statsRouter);
app.use('/api/garden', gardenRouter);
app.use('/api/journal', journalRouter);

// Serve uploaded journal photos
app.use('/uploads/journal', express.static(getJournalUploadDir(), {
    maxAge: '7d',
    etag: true,
}));

app.use((err, req, res, next) => {
    console.error(`[server] ${req.method} ${req.originalUrl}:`, err?.stack || err);
    if (res.headersSent) {
        return next(err);
    }

    const isAssetRequest = /\/(?:css|js|img|vendor|socket\.io|manifest\.json|favicon\.ico|sw\.js)/.test(req.path);
    if (isAssetRequest) {
        if (req.path.endsWith('.js')) {
            res.status(500).type('application/javascript').send(`console.error(${JSON.stringify(`Asset load failed: ${req.path}`)});`);
            return;
        }
        res.status(500).type('text/plain').send('Asset load failed');
        return;
    }

    res.status(500).json({ error: err?.message || 'Internal Server Error' });
});

// Socket.io for real-time sync — room-based filtering by assignee
io.on('connection', (socket) => {
    console.log('📱 Client connected:', socket.id);

    // Client joins an assignee room so broadcasts are scoped
    socket.on('join:assignee', (assignee) => {
        // Leave any previous assignee rooms
        for (const room of socket.rooms) {
            if (room !== socket.id && room.startsWith('assignee:')) {
                socket.leave(room);
            }
        }
        if (assignee) {
            socket.join(`assignee:${assignee}`);
        }
    });

    socket.on('task:created', (task) => {
        if (task?.assignee) {
            socket.to(`assignee:${task.assignee}`).emit('task:created', task);
        }
    });

    socket.on('task:updated', (task) => {
        if (task?.assignee) {
            socket.to(`assignee:${task.assignee}`).emit('task:updated', task);
        }
    });

    socket.on('task:deleted', (data) => {
        // Deleted tasks may affect any view, broadcast to all rooms
        socket.broadcast.emit('task:deleted', data);
    });

    socket.on('task:imported', (data) => {
        socket.broadcast.emit('task:imported', data);
    });

    // Journal is shared between both users, always broadcast
    socket.on('journal:updated', (data) => {
        socket.broadcast.emit('journal:updated', data);
    });

    socket.on('disconnect', () => {
        console.log('📴 Client disconnected:', socket.id);
    });
});

// SPA fallback
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found' });
        return;
    }
    sendAppShell(res);
});

const db = require('./db');
const { formatDateStr, formatTimeStr } = require('./utils');
const { TASK_REWARD } = require('./routes/garden-shared');
function runAutoCompleteSweep() {
    try {
        const now = new Date();
        const todayStr = formatDateStr(now);
        const timeStr = formatTimeStr(now);

        // Find tasks to auto-complete: use end_time if set, else due_time
        const tasksToComplete = db.prepare(`
            SELECT id, assignee, title FROM tasks
            WHERE auto_complete = 1 AND status = 'todo' AND due_date = ?
              AND (due_time IS NOT NULL OR end_time IS NOT NULL)
              AND COALESCE(end_time, due_time) <= ?
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
}

function ensureAutoCompleteTimer() {
    if (!autoCompleteTimer) {
        autoCompleteTimer = setInterval(runAutoCompleteSweep, 60000);
    }
}

function logStartup(port) {
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
    console.log(`[startup] dataDir=${db.dataDir} dbPath=${db.dbPath}`);
    console.log('');
    console.log('⚔️ 峡谷讨伐日记 已启动!');
    console.log(`   本机访问: http://localhost:${port}`);
    console.log(`   局域网访问: http://${localIP}:${port}`);
    console.log('');
}

function startServer({ port = process.env.PORT || 3000, host = '0.0.0.0' } = {}) {
    ensureAutoCompleteTimer();
    return new Promise((resolve, reject) => {
        if (server.listening) {
            resolve(server);
            return;
        }

        const onError = (err) => {
            server.off('listening', onListening);
            reject(err);
        };
        const onListening = () => {
            server.off('error', onError);
            const address = server.address();
            const actualPort = typeof address === 'object' && address ? address.port : port;
            logStartup(actualPort);
            resolve(server);
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, host);
    });
}

function stopServer() {
    return new Promise((resolve, reject) => {
        if (autoCompleteTimer) {
            clearInterval(autoCompleteTimer);
            autoCompleteTimer = null;
        }
        if (!server.listening) {
            resolve();
            return;
        }
        const finalizeClose = () => {
            if (!server.listening) {
                resolve();
                return;
            }
            server.close((err) => {
                if (err) {
                    if (err.code === 'ERR_SERVER_NOT_RUNNING') {
                        resolve();
                        return;
                    }
                    reject(err);
                    return;
                }
                resolve();
            });
        };

        io.close(finalizeClose);
    });
}

if (require.main === module) {
    startServer().catch((err) => {
        console.error('Server failed to start:', err);
        process.exit(1);
    });
}

module.exports = {
    app,
    server,
    io,
    startServer,
    stopServer,
};
