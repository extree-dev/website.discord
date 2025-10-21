// commands/test-automod.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-automod')
        .setDescription('Тестирование системы алертов автомода')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Тип тестового сообщения')
                .setRequired(true)
                .addChoices(
                    { name: 'Запрещенное слово', value: 'forbidden' },
                    { name: 'Ссылка', value: 'link' },
                    { name: 'Спам', value: 'spam' }
                )),

    async execute(interaction) {
        const allowedRoleId = '1399388382492360908';
        if (!interaction.member.roles.cache.has(allowedRoleId)) {
            return await interaction.reply({
                content: '❌ У вас нет прав для использования этой команды.',
                flags: 64
            });
        }

        const type = interaction.options.getString('type');
        let testMessage = '';

        switch (type) {
            case 'forbidden':
                testMessage = 'Это тестовое сообщение со словом спам для проверки автомода';
                break;
            case 'link':
                testMessage = 'Проверяем ссылку: https://example.com';
                break;
            case 'spam':
                testMessage = 'test '.repeat(10);
                break;
        }

        // Создаем алерт вручную для тестирования
        if (global.alertSystem) {
            await global.alertSystem.createAlert('automod_test', 'medium', {
                title: '🧪 ТЕСТ АВТОМОДА',
                description: `Тестовое срабатывание системы: ${type}`,
                guildId: interaction.guild.id,
                data: {
                    action: 'test_execution',
                    rule: type,
                    content: testMessage,
                    user: interaction.user.tag,
                    userId: interaction.user.id,
                    channel: interaction.channel.name,
                    test: true,
                    timestamp: new Date().toISOString()
                }
            });
        }

        await interaction.reply({
            content: `✅ Тестовый алерт автомода создан! Тип: ${type}\nПроверьте дашборд.`,
            flags: 64
        });
    }
};