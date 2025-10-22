const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alerts-test')
        .setDescription('Создать тестовый алерт для проверки системы')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Тип алерта для тестирования')
                .setRequired(true)
                .addChoices(
                    { name: '🚨 Спам атака', value: 'spam_attack' },
                    { name: '👥 Массовый вход', value: 'mass_join' },
                    { name: '📈 Высокая нагрузка', value: 'high_traffic' },
                    { name: '🕵️ Подозрительная активность', value: 'suspicious_activity' },
                    { name: '⚠️ Нарушение правил', value: 'rule_violation' }
                )),

    async execute(interaction) {
        try {
            // Проверка роли (1399388382492360908 - Chief Administrator)
            const allowedRoleId = '1399388382492360908';
            if (!interaction.member.roles.cache.has(allowedRoleId)) {
                return await interaction.reply({
                    content: '❌ У вас нет прав для использования этой команды. Требуется роль Chief Administrator.',
                    flags: 64
                });
            }

            const alertType = interaction.options.getString('type');

            // Создаем тестовый алерт
            const alert = await global.alertSystem.createAlert(alertType, getSeverityByType(alertType), {
                title: getAlertTitle(alertType),
                description: getAlertDescription(alertType),
                guildId: interaction.guild.id,
                data: {
                    test: true,
                    triggeredBy: interaction.user.tag,
                    triggeredById: interaction.user.id,
                    triggeredAt: new Date().toISOString(),
                    note: 'Тестовый алерт создан через команду /alert-test'
                }
            });

            // Логируем использование команды
            if (global.commandTracker) {
                await global.commandTracker.recordCommand(
                    'alert-test',
                    true,
                    0,
                    interaction.guild.id,
                    interaction.user.id
                );
            }

            await interaction.reply({
                content: `✅ Тестовый алерт создан! Тип: **${getAlertTypeName(alertType)}**\n📊 Проверьте дашборд для просмотра.`,
                flags: 64
            });

        } catch (error) {
            console.error('Error in alert-test command:', error);

            // Логируем ошибку
            if (global.commandTracker) {
                await global.commandTracker.recordCommand(
                    'alert-test',
                    false,
                    0,
                    interaction.guild.id,
                    interaction.user.id,
                    error.message
                );
            }

            await interaction.reply({
                content: '❌ Произошла ошибка при создании тестового алерта',
                flags: 64
            });
        }
    }
};

// Вспомогательные функции
function getSeverityByType(type) {
    const severityMap = {
        'spam_attack': 'high',
        'mass_join': 'medium',
        'high_traffic': 'medium',
        'suspicious_activity': 'high',
        'rule_violation': 'critical'
    };
    return severityMap[type] || 'medium';
}

function getAlertTitle(type) {
    const titleMap = {
        'spam_attack': '🚨 СПАМ АТАКА ОБНАРУЖЕНА',
        'mass_join': '👥 МАССОВЫЙ ВХОД ПОЛЬЗОВАТЕЛЕЙ',
        'high_traffic': '📈 ВЫСОКАЯ НАГРУЗКА НА СЕРВЕР',
        'suspicious_activity': '🕵️ ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ',
        'rule_violation': '⚠️ СЕРЬЕЗНОЕ НАРУШЕНИЕ ПРАВИЛ'
    };
    return titleMap[type] || '🔔 ТЕСТОВЫЙ АЛЕРТ';
}

function getAlertDescription(type) {
    const descriptionMap = {
        'spam_attack': 'Обнаружена массовая рассылка сообщений',
        'mass_join': 'Необычное количество новых участников за короткий период',
        'high_traffic': 'Пиковая активность в текстовых каналах',
        'suspicious_activity': 'Множественные нарушения правил одновременно',
        'rule_violation': 'Повторяющиеся серьезные нарушения пользователем'
    };
    return descriptionMap[type] || 'Тестовый алерт для проверки системы';
}

function getAlertTypeName(type) {
    const nameMap = {
        'spam_attack': 'Спам атака',
        'mass_join': 'Массовый вход',
        'high_traffic': 'Высокая нагрузка',
        'suspicious_activity': 'Подозрительная активность',
        'rule_violation': 'Нарушение правил'
    };
    return nameMap[type] || 'Неизвестный тип';
}