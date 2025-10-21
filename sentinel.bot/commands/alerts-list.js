const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alerts-list')
        .setDescription('Показать активные алерты системы'),

    async execute(interaction) {
        try {
            // Проверка роли
            const allowedRoleId = '1399388382492360908';
            if (!interaction.member.roles.cache.has(allowedRoleId)) {
                return await interaction.reply({
                    content: '❌ У вас нет прав для использования этой команды. Требуется роль Chief Administrator.',
                    flags: 64
                });
            }

            // Получаем активные алерты
            const alerts = await global.alertSystem.getActiveAlerts(interaction.guild.id, 5);

            if (alerts.length === 0) {
                return await interaction.reply({
                    content: '✅ Активных алертов нет. Все системы работают нормально.',
                    flags: 64
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🚨 АКТИВНЫЕ АЛЕРТЫ')
                .setColor(0xff0000)
                .setTimestamp();

            alerts.forEach((alert, index) => {
                const severityEmoji = {
                    'critical': '🔴',
                    'high': '🟠',
                    'medium': '🟡',
                    'low': '🔵'
                }[alert.severity] || '⚪';

                embed.addFields({
                    name: `${severityEmoji} ${alert.title}`,
                    value: `**Описание:** ${alert.description}\n**Тип:** ${alert.type}\n**Создан:** <t:${Math.floor(new Date(alert.timestamp).getTime() / 1000)}:R>`,
                    inline: false
                });
            });

            embed.setFooter({
                text: `Всего активных алертов: ${alerts.length}`
            });

            // Логируем использование команды
            if (global.commandTracker) {
                await global.commandTracker.recordCommand(
                    'alerts-list',
                    true,
                    0,
                    interaction.guild.id,
                    interaction.user.id
                );
            }

            await interaction.reply({
                embeds: [embed],
                flags: 64
            });

        } catch (error) {
            console.error('Error in alerts-list command:', error);

            if (global.commandTracker) {
                await global.commandTracker.recordCommand(
                    'alerts-list',
                    false,
                    0,
                    interaction.guild.id,
                    interaction.user.id,
                    error.message
                );
            }

            await interaction.reply({
                content: '❌ Произошла ошибка при получении списка алертов',
                flags: 64
            });
        }
    }
};