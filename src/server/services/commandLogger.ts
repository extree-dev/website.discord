import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CommandLog {
    guildId: string;
    command: string;
    userId: string;
    success: boolean;
    executionTime: number;
    error?: string;
    channelId?: string;
}

export class CommandLogger {
    static async logCommandUsage(log: CommandLog) {
        try {
            await prisma.commandUsage.create({
                data: {
                    guildId: log.guildId,
                    command: log.command,
                    userId: log.userId,
                    success: log.success,
                    executionTime: log.executionTime,
                    error: log.error,
                    channelId: log.channelId,
                    timestamp: new Date()
                }
            });
            console.log(`✅ Command logged: ${log.command} by ${log.userId}`);
        } catch (error) {
            console.error('❌ Failed to log command usage:', error);
        }
    }

    static async getCommandStats(guildId: string, days: number = 30) {
        try {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - days);

            // Получаем сырые данные
            const rawStats = await prisma.commandUsage.groupBy({
                by: ['command'],
                where: {
                    guildId,
                    timestamp: {
                        gte: sinceDate
                    }
                },
                _count: {
                    _all: true
                },
                _sum: {
                    executionTime: true
                },
                _avg: {
                    executionTime: true
                }
            });

            // Получаем успешные выполнения
            const successCounts = await prisma.commandUsage.groupBy({
                by: ['command'],
                where: {
                    guildId,
                    success: true,
                    timestamp: {
                        gte: sinceDate
                    }
                },
                _count: {
                    _all: true
                }
            });

            // Создаем мапу для быстрого доступа
            const successMap = new Map(
                successCounts.map(stat => [stat.command, stat._count._all])
            );

            // Форматируем статистику
            const stats = rawStats.map(stat => {
                const totalUsage = stat._count._all;
                const successCount = successMap.get(stat.command) || 0;
                const successRate = totalUsage > 0 ? Math.round((successCount / totalUsage) * 100) : 0;
                const avgResponseTime = Math.round(stat._avg.executionTime || 0);

                return {
                    name: stat.command,
                    usage: totalUsage,
                    success: successCount,
                    failures: totalUsage - successCount,
                    successRate,
                    avgResponseTime,
                    totalExecutionTime: stat._sum.executionTime || 0
                };
            });

            // Сортируем по использованию (самые популярные сверху)
            return stats.sort((a, b) => b.usage - a.usage);

        } catch (error) {
            console.error('❌ Failed to get command stats:', error);
            return [];
        }
    }

    static async getTopCommands(guildId: string, limit: number = 10, days: number = 30) {
        const stats = await this.getCommandStats(guildId, days);
        return stats.slice(0, limit);
    }

    static async getCommandUsageOverTime(guildId: string, command: string, days: number = 30) {
        try {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - days);

            const usageData = await prisma.commandUsage.groupBy({
                by: ['timestamp'],
                where: {
                    guildId,
                    command,
                    timestamp: {
                        gte: sinceDate
                    }
                },
                _count: {
                    _all: true
                },
                orderBy: {
                    timestamp: 'asc'
                }
            });

            return usageData.map(day => ({
                date: day.timestamp,
                count: day._count._all
            }));
        } catch (error) {
            console.error('❌ Failed to get command usage over time:', error);
            return [];
        }
    }

    static async cleanupOldLogs(days: number = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const result = await prisma.commandUsage.deleteMany({
                where: {
                    timestamp: {
                        lt: cutoffDate
                    }
                }
            });

            console.log(`🧹 Cleaned up ${result.count} old command logs`);
            return result.count;
        } catch (error) {
            console.error('❌ Failed to cleanup old logs:', error);
            return 0;
        }
    }
}