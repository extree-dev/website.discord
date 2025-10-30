import express from "express";
import { SystemService } from "./services/system.service";
import { verifyToken } from "@/utils/jwt";

const router = express.Router();

// Все endpoints требуют аутентификации
/*router.use((req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }
    try {
        verifyToken(token);
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
});*/

// Системная статистика
router.get("/stats", async (req, res) => {
    try {
        const stats = await SystemService.getSystemStats();
        res.json(stats);
    } catch (error) {
        console.error('System stats error:', error);
        res.status(500).json({
            error: "Failed to fetch system statistics",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.get("/system-stats", async (req, res) => {
    try {
        const stats = await SystemService.getSystemStats();
        res.json({
            success: true,
            ...stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('System stats error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch system statistics"
        });
    }
});

router.get("/system/stats", async (req, res) => {
    try {
        const stats = await SystemService.getSystemStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('System stats error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch system statistics",
            data: null
        });
    }
});

// Статус бота
router.get("/bot/status", async (req, res) => {
    try {
        const status = await SystemService.getBotStatus();
        res.json(status);
    } catch (error) {
        console.error('Bot status check error:', error);
        res.json({
            isOnServer: false,
            totalServers: 0,
            isReady: false,
            uptime: 0,
            ping: -1,
            lastChecked: new Date().toISOString(),
            serverName: 'Discord Server'
        });
    }
});

// Серверы бота
router.get("/bot/servers", async (req, res) => {
    try {
        const servers = await SystemService.getBotServers();
        res.json(servers);
    } catch (error) {
        console.error('Bot servers fetch error:', error);
        res.status(500).json({
            error: "Failed to fetch bot servers",
            totalServers: 0,
            servers: [],
            isOnline: false
        });
    }
});

// Статистика команд
router.get("/discord/command-stats", async (req, res) => {
    try {
        const period = req.query.period as string || '24h';
        const filter = req.query.filter as string || 'all';

        const stats = await SystemService.getCommandStats(period, filter);
        res.json(stats);
    } catch (error) {
        console.error('Command stats error:', error);
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : 'Unknown error',
            source: 'error'
        });
    }
});

// Audit logs
router.get("/discord/audit-logs", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const logs = await SystemService.getAuditLogs(limit);
        res.json(logs);
    } catch (error) {
        console.error('Audit log fetch error:', error);
        res.status(500).json({ error: "Failed to fetch audit logs" });
    }
});

router.get("/bot/monitoring", async (req, res) => {
    try {
        // Если в SystemService есть метод getBotMonitoringData, используем его
        const monitoring = await SystemService.getBotMonitoringData?.() || await getFallbackMonitoring();

        res.json({
            success: true,
            monitoring
        });
    } catch (error) {
        console.error('Bot monitoring error:', error);
        res.json({
            success: true,
            monitoring: getFallbackMonitoring()
        });
    }
});

router.get("/bot/guilds", async (req, res) => {
    try {
        console.log('Fetching bot guilds...');
        const guilds = await SystemService.getBotGuilds();
        console.log('Bot guilds result:', guilds);

        res.json({
            success: true,
            guilds,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Bot guilds fetch error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch bot guilds",
            guilds: []
        });
    }
});

router.get("/bot/logs", async (req, res) => {
    try {
        const { limit = 10, type = 'all' } = req.query;
        console.log('📋 Fetching bot logs, limit:', limit);

        // Используем SystemService для получения логов
        const logs = await SystemService.getBotLogs(
            parseInt(limit as string),
            type as string
        );

        console.log('✅ Bot logs fetched:', logs.length, 'items');

        res.json({
            success: true,
            logs: logs,
            total: logs.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Bot logs error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch bot logs",
            logs: []
        });
    }
});

router.get("/discord/users", async (req, res) => {
    try {
        const { guildId } = req.query;

        if (!guildId) {
            return res.status(400).json({
                success: false,
                error: "guildId is required"
            });
        }

        console.log('📥 Fetching REAL Discord users for guild:', guildId);
        const users = await SystemService.getRealDiscordUsers(guildId as string);

        res.json({
            success: true,
            users: users,
            total: users.length,
            source: 'discord-api',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ REAL Discord users error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch REAL Discord users",
            users: [], // ВОЗВРАЩАЕМ ПУСТОЙ МАССИВ
            source: 'error'
        });
    }
});

// Диагностика интеграции
router.get("/discord/diagnostics", async (req, res) => {
    try {
        const { guildId } = req.query;

        // Проверяем статус бота
        const botStatus = await SystemService.getBotStatus();

        // Проверяем доступность API
        let apiAvailable = false;
        try {
            const apiResponse = await fetch('http://localhost:3002/health');
            apiAvailable = apiResponse.ok;
        } catch (error) {
            apiAvailable = false;
        }

        // Пробуем получить пользователей
        let users = [];
        try {
            const usersResponse = await SystemService.getRealDiscordUsers(guildId as string);
            users = usersResponse;
        } catch (error) {
            users = [];
        }

        res.json({
            success: true,
            diagnostics: {
                bot: {
                    status: botStatus.isReady ? 'online' : 'offline',
                    guilds: botStatus.totalServers,
                    uptime: botStatus.uptime
                },
                api: {
                    available: apiAvailable,
                    url: 'http://localhost:3002'
                },
                users: {
                    count: users.length,
                    source: users.length > 0 ? 'discord-api' : 'fallback'
                },
                guildId: guildId,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Diagnostics failed"
        });
    }
});

router.get("/discord/banned-users", async (req, res) => {
    try {
        const { guildId } = req.query;

        if (!guildId) {
            return res.status(400).json({
                success: false,
                error: "guildId is required"
            });
        }

        const bannedUsers = await SystemService.getBannedUsers(guildId as string);

        res.json({
            success: true,
            bannedUsers: bannedUsers,
            total: bannedUsers.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to fetch banned users"
        });
    }
});

// Статистика банов
router.get("/discord/ban-stats", async (req, res) => {
    try {
        const { guildId } = req.query;

        if (!guildId) {
            return res.status(400).json({
                success: false,
                error: "guildId is required"
            });
        }

        const banStats = await SystemService.getBanStats(guildId as string);

        res.json({
            success: true,
            stats: banStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to fetch ban statistics"
        });
    }
});

// Фолбэк данные для мониторинга
function getFallbackMonitoring() {
    return {
        responseTime: {
            value: 42,
            status: 'optimal',
            label: 'Response Time',
            unit: 'ms'
        },
        lastHeartbeat: {
            value: '2 seconds ago',
            status: 'optimal',
            label: 'Last Heartbeat',
            unit: ''
        },
        apiLatency: {
            value: 128,
            status: 'normal',
            label: 'API Latency',
            unit: 'ms'
        },
        overallHealth: 'healthy',
        guilds: 1,
        commandsTracked: 0,
        isFallback: true
    };
}

export default router;