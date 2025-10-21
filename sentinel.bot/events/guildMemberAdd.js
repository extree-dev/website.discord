// events/guildMemberAdd.js
const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.guild.id !== process.env.GUILD_ID) return;

        console.log(`🟢 User joined: ${member.user.tag} (${member.guild.name})`);

        try {
            // 1. ОБНОВЛЯЕМ СТАТИСТИКУ
            if (global.statsCollector) {
                setTimeout(() => {
                    global.statsCollector.saveServerStats(member.guild);
                }, 1000);
            }

            // 2. ПРОВЕРКА НА РЕЙД-АТАКУ (главный приоритет)
            if (global.alertSystem) {
                await global.alertSystem.detectRaidProtection(member.guild, member);
            }

            // 3. ПРОВЕРКА НА ПОДОЗРИТЕЛЬНЫЕ АККАУНТЫ
            if (global.alertSystem) {
                await global.alertSystem.detectSuspiciousAccount(member);
            }

            // 4. Старая проверка массового входа (для совместимости)
            if (global.alertSystem) {
                await global.alertSystem.detectMassJoin(member);
            }

            // 5. ДОПОЛНИТЕЛЬНАЯ ЛОГИКА ПРИВЕТСТВИЯ
            await sendWelcomeMessage(member);

        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};

// Функция приветственного сообщения (опционально)
async function sendWelcomeMessage(member) {
    try {
        const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
        if (!welcomeChannelId) return;

        const channel = await member.guild.channels.fetch(welcomeChannelId);
        if (channel && channel.isTextBased()) {
            await channel.send({
                content: `👋 Добро пожаловать, ${member}! Рады видеть тебя на сервере!`,
                allowedMentions: { users: [member.id] }
            });
        }
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
}