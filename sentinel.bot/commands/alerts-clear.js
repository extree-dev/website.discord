const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alerts-clear')
        .setDescription('Очистить все тестовые алерты')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Тип алертов для очистки (опционально)')
                .setRequired(false)
                .addChoices(
                    { name: 'Все тестовые', value: 'test' },
                    { name: 'Только спам', value: 'spam_attack' },
                    { name: 'Только массовые входы', value: 'mass_join' }
                )),

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

            const filterType = interaction.options.getString('type');
            let message = '';

            if (filterType === 'test') {
                // Очищаем все тестовые алерты
                const testAlerts = await global.alertSystem.getActiveAlerts(interaction.guild.id);
                const testAlertsCount = testAlerts.filter(alert => alert.data?.test).length;

                for (const alert of testAlerts) {
                    if (alert.data?.test) {
                        await global.alertSystem.resolveAlert(alert.id, interaction.user.tag);
                    }
                }

                message = `✅ Очищено ${testAlertsCount} тестовых алертов`;
            } else if (filterType) {
                // Очищаем по типу
                const typeAlerts = await global.alertSystem.getActiveAlerts(interaction.guild.id);
                const filteredAlerts = typeAlerts.filter(alert =>
                    alert.type === filterType && alert.data?.test
                );

                for (const alert of filteredAlerts) {
                    await global.alertSystem.resolveAlert(alert.id, interaction.user.tag);
                }

                message = `✅ Очищено ${filteredAlerts.length} алертов типа: ${filterType}`;
            } else {
                // Очищаем все алерты
                const allAlerts = await global.alertSystem.getActiveAlerts(interaction.guild.id);

                for (const alert of allAlerts) {
                    await global.alertSystem.resolveAlert(alert.id, interaction.user.tag);
                }

                message = `✅ Очищено все активные алерты (${allAlerts.length})`;
            }

            // Логируем использование команды
            if (global.commandTracker) {
                await global.commandTracker.recordCommand(
                    'alerts-clear',
                    true,
                    0,
                    interaction.guild.id,
                    interaction.user.id
                );
            }

            await interaction.reply({
                content: message,
                flags: 64
            });

        } catch (error) {
            console.error('Error in alerts-clear command:', error);

            if (global.commandTracker) {
                await global.commandTracker.recordCommand(
                    'alerts-clear',
                    false,
                    0,
                    interaction.guild.id,
                    interaction.user.id,
                    error.message
                );
            }

            await interaction.reply({
                content: '❌ Произошла ошибка при очистке алертов',
                flags: 64
            });
        }
    }
};