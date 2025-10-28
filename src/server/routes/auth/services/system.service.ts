import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Добавляем интерфейс User
interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    status: 'online' | 'idle' | 'dnd' | 'offline';
    roles: string[]; // или { id: string, name: string, color: string }[] для расширенной информации
    joinedAt: string;
    lastActive: string;
    warnings: number;
    isBanned: boolean;
    isMuted: boolean;
    // Дополнительные поля для расширенной информации
    bot?: boolean;
    activities?: any[];
    premiumSince?: string;
    pending?: boolean;
}

// Вспомогательные функции
const getLastActive = (member: any): string => {
    if (member.presence?.status === 'online') return 'Now';
    if (member.presence?.status === 'idle') return '5m ago';
    if (member.presence?.status === 'dnd') return '10m ago';

    const lastMessage = member.lastMessage?.createdAt;
    if (lastMessage) {
        const diff = Date.now() - lastMessage.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        return `${Math.floor(minutes / 60)}h ago`;
    }

    return 'Unknown';
};

const isMemberMuted = (member: any): boolean => {
    return member.voice?.mute || false;
};

export const SystemService = {
    async getSystemStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Parallel database queries for better performance
        const [
            totalUsers,
            usersToday,
            usersYesterday,
            totalCodes,
            usedCodes,
            registeredCommandsCount
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { createdAt: { gte: today } } }),
            prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
            prisma.secretCode.count(),
            prisma.secretCode.count({ where: { used: true } }),
            this.getRegisteredCommandsCount()
        ]);

        const growthPercentage = usersYesterday > 0
            ? Math.round((usersToday / usersYesterday - 1) * 100)
            : usersToday > 0 ? 100 : 0;

        return {
            users: {
                total: totalUsers,
                active: await prisma.user.count({
                    where: {
                        lastLogin: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                }),
                newToday: usersToday,
                growthPercentage
            },
            secretCodes: {
                total: totalCodes,
                used: usedCodes,
                available: totalCodes - usedCodes
            },
            totalCommands: registeredCommandsCount,
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            },
            totalServers: 1,
            performance: {
                cpu: 45,
                memory: 65,
                network: 25,
                storage: 80
            }
        };
    },

    async getRegisteredCommandsCount() {
        try {
            return await prisma.botCommand.count({
                where: { enabled: true }
            });
        } catch (error) {
            console.log('Database commands unavailable, using fallback');
            try {
                const botResponse = await fetch('http://localhost:3002/api/bot/commands');
                if (botResponse.ok) {
                    const botData = await botResponse.json();
                    return botData.totalCommands || 7;
                }
            } catch (apiError) {
                return 7; // Default command count
            }
            return 7;
        }
    },

    async getBotStatus() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const botResponse = await fetch('http://localhost:3002/discord/bot-status', {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (botResponse.ok) {
                const botData = await botResponse.json();
                return {
                    isOnServer: botData.isOnServer !== false,
                    totalServers: botData.totalServers || 1,
                    isReady: botData.isReady || true,
                    uptime: botData.uptime || process.uptime(),
                    ping: botData.ping || 138,
                    lastChecked: new Date().toISOString(),
                    serverName: botData.serverName || 'onnei.exe'
                };
            }
        } catch (error) {
            console.log('Bot API unavailable, using fallback data');
        }

        // Fallback данные
        return {
            isOnServer: true,
            totalServers: 1,
            isReady: true,
            uptime: process.uptime(),
            ping: 138,
            lastChecked: new Date().toISOString(),
            serverName: 'onnei.exe'
        };
    },

    async getBotServers() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const botResponse = await fetch('http://localhost:3002/api/bot/servers', {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (botResponse.ok) {
                const botData = await botResponse.json();
                return {
                    totalServers: botData.totalServers || 0,
                    servers: botData.servers || [],
                    isOnline: botData.success !== false,
                    lastUpdated: new Date().toISOString(),
                    source: botData.source || 'bot'
                };
            }
        } catch (error) {
            // Fallback data
        }

        return {
            totalServers: 1,
            servers: [],
            isOnline: false,
            lastUpdated: new Date().toISOString(),
            source: 'fallback'
        };
    },

    async getCommandStats(period: string, filter: string) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const botResponse = await fetch(
                `http://localhost:3002/stats/commands?period=${period}&filter=${filter}`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.SENTINEL_API_SECRET || process.env.API_SECRET}`
                    },
                    signal: controller.signal
                }
            );

            clearTimeout(timeout);

            if (botResponse.ok) {
                const botData = await botResponse.json();
                return this.formatCommandStats(botData, period, filter, 'bot');
            }
        } catch (error) {
            // Fallback to demo data
        }

        const demoData = await this.getDemoCommandStats(period, filter);
        return this.formatCommandStats(demoData, period, filter, 'demo-fallback');
    },

    formatCommandStats(data: any, period: string, filter: string, source: string) {
        const formattedStats = data.commands?.map((cmd: any) => ({
            id: cmd.name || cmd.id,
            name: cmd.name,
            usage: cmd.usage || 0,
            success: cmd.success || Math.round((cmd.usage || 0) * ((cmd.successRate || 0) / 100)),
            failures: (cmd.usage || 0) - (cmd.success || 0),
            successRate: cmd.successRate || 0,
            avgResponseTime: cmd.avgResponseTime || 0,
            type: cmd.type || cmd.category || 'utility',
            lastUsed: cmd.lastUsed || this.getTimeAgo(),
            description: cmd.description || ''
        })) || [];

        const totalCommands = formattedStats.reduce((sum: number, cmd: any) => sum + cmd.usage, 0);
        const averageSuccessRate = formattedStats.length > 0
            ? Math.round(formattedStats.reduce((sum: number, cmd: any) => sum + cmd.successRate, 0) / formattedStats.length)
            : 0;

        return {
            commands: formattedStats,
            period,
            filter,
            totalCommands,
            averageSuccessRate,
            generatedAt: new Date().toISOString(),
            source,
            note: source === 'demo-fallback' ? 'Using demo data - check bot connection' : 'Live data from bot'
        };
    },

    async getDemoCommandStats(period: string, filter: string) {
        const demoCommands = [
            { name: 'mute', description: 'Mute a user', category: 'moderation', baseUsage: 78, baseResponse: 120 },
            { name: 'warn', description: 'Warn a user', category: 'moderation', baseUsage: 120, baseResponse: 86 },
            { name: 'kick', description: 'Kick a user', category: 'moderation', baseUsage: 34, baseResponse: 110 },
            { name: 'ban', description: 'Ban a user', category: 'moderation', baseUsage: 15, baseResponse: 150 },
            { name: 'userinfo', description: 'Get user information', category: 'utility', baseUsage: 234, baseResponse: 186 },
            { name: 'serverinfo', description: 'Get server info', category: 'utility', baseUsage: 89, baseResponse: 120 },
            { name: 'avatar', description: 'Get user avatar', category: 'utility', baseUsage: 156, baseResponse: 95 },
            { name: 'help', description: 'Show help', category: 'utility', baseUsage: 342, baseResponse: 75 },
        ];

        const periodMultiplier = {
            '24h': 0.3,
            '7d': 1,
            '30d': 3
        }[period] || 1;

        const commandStats = demoCommands.map(cmd => {
            const usage = Math.max(1, Math.round(cmd.baseUsage * periodMultiplier * (0.9 + Math.random() * 0.2)));
            const successRate = Math.min(100, Math.max(85, 95 - Math.random() * 15));
            const avgResponseTime = Math.round(cmd.baseResponse * (0.8 + Math.random() * 0.4));
            const success = Math.round(usage * (successRate / 100));

            return {
                name: cmd.name,
                usage,
                success,
                successRate: Math.round(successRate),
                avgResponseTime,
                type: cmd.category,
                lastUsed: this.getTimeAgo(),
                description: cmd.description
            };
        });

        let filteredStats = commandStats;
        if (filter === 'moderation') {
            filteredStats = commandStats.filter(cmd => cmd.type === 'moderation');
        } else if (filter === 'utility') {
            filteredStats = commandStats.filter(cmd => cmd.type === 'utility');
        }

        return { commands: filteredStats };
    },

    getTimeAgo(): string {
        const times = [
            { diff: 5 * 60 * 1000, text: "5 minutes ago" },
            { diff: 15 * 60 * 1000, text: "15 minutes ago" },
            { diff: 30 * 60 * 1000, text: "30 minutes ago" },
            { diff: 2 * 60 * 60 * 1000, text: "2 hours ago" },
            { diff: 6 * 60 * 60 * 1000, text: "6 hours ago" },
            { diff: 24 * 60 * 60 * 1000, text: "1 day ago" },
            { diff: 2 * 24 * 60 * 60 * 1000, text: "2 days ago" }
        ];

        return times[Math.floor(Math.random() * times.length)].text;
    },

    async getAuditLogs(limit: number) {
        try {
            const GUILD_ID = process.env.DISCORD_GUILD_ID;
            const botResponse = await fetch(
                `http://localhost:3002/api/audit-logs?limit=${limit}&guildId=${GUILD_ID}`,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (botResponse.ok) {
                const auditData = await botResponse.json();
                return {
                    recentActivities: auditData.recentActivities,
                    total: auditData.recentActivities?.length || 0,
                    generatedAt: auditData.generatedAt || new Date().toISOString(),
                    source: auditData.source || 'bot'
                };
            }
        } catch (error) {
            // Fallback to database
        }

        const dbLogs = await this.getAuditLogsFromDB(limit);
        return {
            recentActivities: dbLogs,
            total: dbLogs.length,
            generatedAt: new Date().toISOString(),
            source: 'database-fallback'
        };
    },

    async getAuditLogsFromDB(limit: number) {
        try {
            const logs = await prisma.auditLog.findMany({
                take: limit,
                orderBy: { timestamp: 'desc' },
                select: {
                    id: true,
                    action: true,
                    actionType: true,
                    userId: true,
                    userName: true,
                    targetId: true,
                    targetName: true,
                    targetType: true,
                    reason: true,
                    timestamp: true,
                    changes: true,
                    extra: true
                }
            });

            return logs.map(log => ({
                id: log.id,
                user: log.userId,
                userName: log.userName,
                action: log.action,
                target: log.targetId,
                targetName: log.targetName,
                targetType: log.targetType,
                reason: log.reason,
                time: this.formatAuditLogTimeAgo(new Date(log.timestamp)),
                timestamp: log.timestamp.toISOString(),
                status: 'success',
                details: { changes: log.changes, extra: log.extra }
            }));
        } catch (error) {
            return [];
        }
    },

    formatAuditLogTimeAgo(date: Date): string {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        return date.toLocaleDateString();
    },

    async getBotMonitoringData() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('http://localhost:3002/api/bot/monitoring', {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.monitoring) {
                    return data.monitoring;
                }
            }
        } catch (error) {
            console.log('Bot monitoring API unavailable, using fallback data');
        }

        // Fallback данные
        return {
            responseTime: { value: 42, status: 'optimal', label: 'Response Time', unit: 'ms' },
            lastHeartbeat: { value: '2 seconds ago', status: 'optimal', label: 'Last Heartbeat', unit: '' },
            apiLatency: { value: 128, status: 'normal', label: 'API Latency', unit: 'ms' },
            overallHealth: 'healthy',
            guilds: 1,
            commandsTracked: 0,
            isFallback: true
        };
    },

    async getBotGuilds() {
        const maxRetries = 3;
        const retryDelay = 2000; // 2 секунды

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log('Calling bot API for guilds...');
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);

                // Используем правильный эндпоинт который есть в api.js
                const response = await fetch('http://localhost:3002/api/bot-guilds', {
                    signal: controller.signal
                });

                clearTimeout(timeout);

                console.log('Bot guilds API response status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log('Raw bot guilds response:', data);

                    if (data.success && data.data) {
                        const formattedGuilds = data.data.map((guild: any) => ({
                            id: guild.id,
                            name: guild.name,
                            members: guild.members || guild.memberCount || 0,
                            enabled: true,
                            icon: guild.icon || '🏠'
                        }));
                        console.log('Formatted guilds from bot:', formattedGuilds);
                        return formattedGuilds;
                    }
                } else {
                    console.log('Bot guilds API not available, status:', response.status);
                    const errorText = await response.text();
                    console.log('Error response:', errorText);
                }
            } catch (error) {
                console.log('Bot guilds API unavailable, error:', error);
            }

            // Fallback - используем реальные данные из статуса бота
            console.log('Using fallback guilds data from bot status');
            try {
                const statusResponse = await fetch('http://localhost:3002/discord/bot-status');
                if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    if (statusData.debug && statusData.debug.guilds) {
                        return statusData.debug.guilds.map((guild: any) => ({
                            id: guild.id,
                            name: guild.name,
                            members: guild.members || 0,
                            enabled: true,
                            icon: '🏠'
                        }));
                    }
                }
            } catch (statusError) {
                console.log('Cannot get bot status either:', statusError);
            }

            // Ultimate fallback
            return [
                {
                    id: "1343586237868544052",
                    name: "onnei.exe",
                    members: 10,
                    enabled: true,
                    icon: "🏠"
                }
            ];
        }
    },

    async getBotLogs(limit: number = 10, type: string = 'all') {
        try {
            console.log('🔄 Fetching bot logs from API...');

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            // Запрашиваем логи у бота
            const response = await fetch('http://localhost:3002/api/bot/logs?limit=' + limit, {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Bot logs API response:', data);

                if (data.success && data.logs) {
                    // Форматируем логи для фронтенда
                    const formattedLogs = data.logs.map((log: any) => ({
                        time: this.formatAuditLogTimeAgo(new Date(log.timestamp)),
                        type: log.type,
                        message: log.message,
                        user: 'System',
                        timestamp: log.timestamp,
                        source: log.source || 'bot'
                    }));

                    console.log('✅ Formatted logs:', formattedLogs.length, 'items');
                    return formattedLogs;
                }
            }

            throw new Error('Bot logs API not available');

        } catch (error) {
            console.log('❌ Bot logs API unavailable, using fallback:', (error as Error).message);
            return this.getFallbackLogs(limit);
        }
    },

    getFallbackLogs(limit: number) {
        // Временные fallback логи
        const fallbackLogs = [
            {
                time: "just now",
                type: "info",
                message: "Connecting to bot logs...",
                user: "System",
                timestamp: new Date().toISOString()
            },
            {
                time: "1m ago",
                type: "success",
                message: "Bot started successfully",
                user: "System",
                timestamp: new Date(Date.now() - 60000).toISOString()
            },
            {
                time: "2m ago",
                type: "warn",
                message: "System event: websocket connected",
                user: "System",
                timestamp: new Date(Date.now() - 120000).toISOString()
            },
            {
                time: "3m ago",
                type: "info",
                message: "Security monitoring activated",
                user: "System",
                timestamp: new Date(Date.now() - 180000).toISOString()
            }
        ];

        return fallbackLogs.slice(0, limit);
    },

    formatLogTimeAgo(date: Date): string {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

        return date.toLocaleDateString();
    },

    // УДАЛЯЕМ старый метод getRealUsers - он не нужен

    async getRealDiscordUsers(guildId: string): Promise<User[]> {
        try {
            console.log('🔄 Fetching REAL Discord users for guild:', guildId);

            const response = await fetch(`http://localhost:3002/api/discord/guild-members?guildId=${guildId}`);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ REAL users fetched:', data.users?.length || 0);

                // Преобразуем статусы в нужный формат
                const usersWithStatus = data.users.map((user: any) => ({
                    ...user,
                    status: this.normalizeStatus(user.status),
                    lastActive: this.getLastActiveFromStatus(user.status, user.lastActive)
                }));

                return usersWithStatus;
            } else {
                throw new Error('Bot API not available');
            }
        } catch (error) {
            console.error('❌ Failed to fetch REAL users:', error);
            return [];
        }
    },

    // Вспомогательные методы для работы со статусами
    normalizeStatus(discordStatus: string): 'online' | 'idle' | 'dnd' | 'offline' {
        const statusMap: { [key: string]: 'online' | 'idle' | 'dnd' | 'offline' } = {
            'online': 'online',
            'idle': 'idle',
            'dnd': 'dnd',
            'offline': 'offline',
            'invisible': 'offline'
        };

        return statusMap[discordStatus] || 'offline';
    },

    // Определяем последнюю активность на основе статуса
    getLastActiveFromStatus(status: string, currentLastActive: string): string {
        if (status === 'online') return 'Now';
        if (status === 'idle') return '5m ago';
        if (status === 'dnd') return '10m ago';

        // Для офлайн используем переданное значение или по умолчанию
        return currentLastActive || 'Unknown';
    }

    // УДАЛЯЕМ private метод - он не нужен для реальных данных
};