const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
const tasksRouter = require('./routes/tasks');
const categoriesRouter = require('./routes/categories');
const importRouter = require('./routes/import');

app.use('/api/tasks', tasksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/import', importRouter);

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
