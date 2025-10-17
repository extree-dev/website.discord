const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = 3002;

// Создаем HTTP сервер для Express и WebSocket
const server = http.createServer(app);

app.use(express.json());

// Middleware для проверки аутентификации
/*
app.use((req, res, next) => {
    if (req.path === '/ws' && req.headers.upgrade === 'websocket') {
        return next();
    }

    const authToken = req.headers.authorization;
    if (authToken === `Bearer ${process.env.API_SECRET}`) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});
*/

app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next(); // Разрешаем все запросы
});

// Настройка WebSocket
function setupWebSocket(server) {
    const wss = new WebSocket.Server({
        server,
        path: '/ws'
    });

    wss.on('connection', (ws, req) => {
        console.log('🔌 Client connected to stats WebSocket');

        // Проверяем аутентификацию для WebSocket
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
            console.log('❌ Unauthorized WebSocket connection');
            ws.close(1008, 'Unauthorized');
            return;
        }

        // Отправляем приветственное сообщение
        ws.send(JSON.stringify({
            type: 'CONNECTED',
            message: 'WebSocket connected successfully',
            timestamp: new Date().toISOString()
        }));

        // Функция для отправки обновлений статистики
        const sendStatsUpdate = () => {
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    const stats = global.commandTracker ? global.commandTracker.getStats() : [];
                    const totalStats = global.commandTracker ? global.commandTracker.getTotalStats() : {};

                    ws.send(JSON.stringify({
                        type: 'STATS_UPDATE',
                        data: {
                            commands: stats,
                            totalUsage: totalStats.totalUsage || 0,
                            overallSuccessRate: totalStats.overallSuccessRate || 0,
                            avgResponseTime: totalStats.avgResponse || 0,
                            uniqueCommands: totalStats.uniqueCommands || 0,
                            timestamp: new Date().toISOString()
                        }
                    }));
                }
            } catch (error) {
                console.error('Error sending WebSocket update:', error);
            }
        };

        // Отправляем обновления каждые 3 секунды
        const interval = setInterval(sendStatsUpdate, 3000);

        // Отправляем статистику сразу при подключении
        sendStatsUpdate();

        // Обработка сообщений от клиента
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('📨 WebSocket message received:', data);

                if (data.type === 'PING') {
                    ws.send(JSON.stringify({
                        type: 'PONG',
                        timestamp: new Date().toISOString()
                    }));
                }

                if (data.type === 'REQUEST_STATS') {
                    sendStatsUpdate();
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`🔌 Client disconnected from WebSocket. Code: ${code}, Reason: ${reason}`);
            clearInterval(interval);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            clearInterval(interval);
        });
    });

    console.log('🔌 WebSocket server setup completed');
    return wss;
}

// Инициализируем WebSocket
const wss = setupWebSocket(server);

// Статистика команд
app.get('/stats/commands', (req, res) => {
    const { period = '24h', filter = 'all' } = req.query;

    // Используем реальную статистику из трекера
    let commands = [];
    let totalUsage = 0;

    if (global.commandTracker) {
        commands = global.commandTracker.getStats(period, filter);
        const totalStats = global.commandTracker.getTotalStats();
        totalUsage = totalStats.totalUsage;
    } else {
        // Fallback на демо-данные если трекер не доступен
        commands = [
            { name: '/ban', usage: 45, successRate: 95, avgResponseTime: 150, type: 'moderation' },
            { name: '/mute', usage: 78, successRate: 92, avgResponseTime: 120, type: 'moderation' },
            { name: '/warn', usage: 120, successRate: 98, avgResponseTime: 80, type: 'moderation' },
            { name: '/userinfo', usage: 234, successRate: 99, avgResponseTime: 100, type: 'utility' },
        ];

        if (filter === 'moderation') {
            commands = commands.filter(cmd => cmd.type === 'moderation');
        } else if (filter === 'utility') {
            commands = commands.filter(cmd => cmd.type === 'utility');
        }

        totalUsage = commands.reduce((sum, cmd) => sum + cmd.usage, 0);
    }

    res.json({
        commands: commands,
        period,
        filter,
        totalUsage: totalUsage,
        source: global.commandTracker ? 'live-tracker' : 'demo-data',
        generatedAt: new Date().toISOString()
    });
});

// Эндпоинт для WebSocket информации
app.get('/websocket-info', (req, res) => {
    const wsInfo = {
        enabled: true,
        url: `ws://localhost:${PORT}/ws`,
        authentication: 'Bearer token required',
        messageTypes: ['STATS_UPDATE', 'PING', 'PONG', 'REQUEST_STATS'],
        updateInterval: '3 seconds'
    };

    res.json(wsInfo);
});

// Информация о сервере
app.get('/server/info', (req, res) => {
    const client = require('./discordClient.mjs').getClient();
    const guild = client.guilds.cache.get(process.env.GUILD_ID);

    if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
    }

    res.json({
        name: guild.name,
        members: guild.memberCount,
        online: guild.members.cache.filter(m => m.presence?.status !== 'offline').size,
        channels: guild.channels.cache.size,
        roles: guild.roles.cache.size,
        created: guild.createdAt
    });
});

// Health check с информацией о WebSocket
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        websocket: {
            clients: wss.clients.size,
            enabled: true
        },
        tracker: {
            initialized: !!global.commandTracker,
            totalCommands: global.commandTracker ? global.commandTracker.getTotalStats().totalUsage : 0
        }
    };

    res.json(health);
});

// Запуск API сервера
function startAPI() {
    server.listen(PORT, () => {
        console.log(`🌐 Sentinel API running on port ${PORT}`);
        console.log(`🔌 WebSocket available at: ws://localhost:${PORT}/ws`);
        console.log(`📊 Stats: http://localhost:${PORT}/stats/commands`);
        console.log(`❤️ Health: http://localhost:${PORT}/health`);
        console.log(`🔗 WebSocket info: http://localhost:${PORT}/websocket-info`);
    });
}

module.exports = { startAPI, setupWebSocket };