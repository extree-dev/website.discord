import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
            const timeout = setTimeout(() => controller.abort(), 3000);

            const botResponse = await fetch('http://localhost:3002/api/bot/status', {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (botResponse.ok) {
                const botStatus = await botResponse.json();
                return {
                    isOnServer: botStatus.success && botStatus.totalServers > 0,
                    totalServers: botStatus.totalServers || 0,
                    isReady: botStatus.isReady || false,
                    uptime: botStatus.uptime || 0,
                    ping: botStatus.ping || -1,
                    lastChecked: new Date().toISOString(),
                    serverName: botStatus.serverName || 'Discord Server'
                };
            }
        } catch (error) {
            // Fallback if bot is unavailable
        }

        return {
            isOnServer: false,
            totalServers: 0,
            isReady: false,
            uptime: 0,
            ping: -1,
            lastChecked: new Date().toISOString(),
            serverName: 'Discord Server'
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
                time: this.formatTimeAgo(new Date(log.timestamp)),
                timestamp: log.timestamp.toISOString(),
                status: 'success',
                details: { changes: log.changes, extra: log.extra }
            }));
        } catch (error) {
            return [];
        }
    },

    formatTimeAgo(date: Date): string {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        return date.toLocaleDateString();
    }
};