// events/guildMemberRemove.js  
const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        if (member.guild.id !== process.env.GUILD_ID) return;

        console.log(`🔴 User left: ${member.user.tag} (${member.guild.name})`);

        try {
            // 1. ОБНОВЛЯЕМ СТАТИСТИКУ
            if (global.statsCollector) {
                setTimeout(() => {
                    global.statsCollector.saveServerStats(member.guild);
                }, 1000);
            }

            // 2. ПРОВЕРЯЕМ НА МАССОВЫЙ ВЫХОД (новый алерт)
            await checkMassLeave(member);

            // 3. ЛОГИРУЕМ В БАЗУ ДАННЫХ
            await logMemberLeave(member);

        } catch (error) {
            console.error('Error in guildMemberRemove event:', error);
        }
    },
};

// Проверка массового выхода пользователей
async function checkMassLeave(member) {
    try {
        // Можно добавить логику для обнаружения массового выхода
        // Например, если много пользователей ушло за короткое время
        const recentLeaves = await getRecentLeaves(member.guild.id);

        if (recentLeaves.length >= 5) { // 5+ уходов за 10 минут
            if (global.alertSystem) {
                await global.alertSystem.createAlert('mass_leave', 'medium', {
                    title: '👥 МАССОВЫЙ ВЫХОД ПОЛЬЗОВАТЕЛЕЙ',
                    description: `Обнаружено ${recentLeaves.length} уходов за 10 минут`,
                    guildId: member.guild.id,
                    data: {
                        leaveCount: recentLeaves.length,
                        timeFrame: '10 minutes',
                        recentLeaves: recentLeaves.slice(-3),
                        recommendation: 'Проверить возможные причины',
                        detectedAt: new Date().toISOString()
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error checking mass leave:', error);
    }
}

// Логирование ухода пользователя
async function logMemberLeave(member) {
    try {
        if (global.commandTracker && global.commandTracker.prisma) {
            await global.commandTracker.prisma.memberLeave.create({
                data: {
                    userId: member.id,
                    username: member.user.tag,
                    guildId: member.guild.id,
                    joinedAt: member.joinedAt,
                    leftAt: new Date(),
                    wasKicked: false, // Нужно проверять через аудит логи
                    wasBanned: false
                }
            });
        }
    } catch (error) {
        console.error('Error logging member leave:', error);
    }
}

// Получение недавних уходов (заглушка)
async function getRecentLeaves(guildId) {
    return [];
}