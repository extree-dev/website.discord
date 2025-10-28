const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        console.log(`🔧 Interaction received: ${interaction.type}`);

        // Обрабатываем slash-команды
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ No command matching ${interaction.commandName} was found.`);

                // ЛОГИРУЕМ НЕНАЙДЕННУЮ КОМАНДУ
                global.botLogger.addLog('error', `Command not found: ${interaction.commandName}`, {
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    channelId: interaction.channel?.id
                });

                return await interaction.reply({
                    content: 'Command not found!',
                    ephemeral: true
                });
            }

            const startTime = Date.now();

            try {
                console.log(`🚀 Executing command: /${interaction.commandName}`);

                // ЛОГИРУЕМ НАЧАЛО ВЫПОЛНЕНИЯ КОМАНДЫ
                global.botLogger.addLog('info', `Command execution started: /${interaction.commandName}`, {
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    channelId: interaction.channel?.id
                });

                await command.execute(interaction);
                const responseTime = Date.now() - startTime;

                // Записываем успешное выполнение
                if (global.commandTracker) {
                    global.commandTracker.recordCommand(
                        interaction.commandName,
                        true,
                        responseTime,
                        interaction.guild?.id,
                        interaction.user.id,
                        null
                    );
                }

                // ЛОГИРУЕМ УСПЕШНОЕ ВЫПОЛНЕНИЕ
                global.botLogger.addLog('success', `Command executed successfully: /${interaction.commandName}`, {
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    responseTime: responseTime
                });

                console.log(`✅ Command executed: /${interaction.commandName}, time: ${responseTime}ms`);

            } catch (error) {
                const responseTime = Date.now() - startTime;

                // Записываем неудачное выполнение
                if (global.commandTracker) {
                    global.commandTracker.recordCommand(
                        interaction.commandName,
                        false,
                        responseTime,
                        interaction.guild?.id,
                        interaction.user.id,
                        error.message
                    );
                }

                // ЛОГИРУЕМ ОШИБКУ КОМАНДЫ
                global.botLogger.logCommandError(
                    interaction.commandName,
                    error,
                    interaction.user.id,
                    interaction.guild?.id
                );

                console.error(`❌ Command failed: /${interaction.commandName}`, error);

                try {
                    const errorMessage = {
                        content: 'There was an error while executing this command!',
                        ephemeral: true
                    };

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                } catch (replyError) {
                    console.error('Failed to send error message:', replyError);
                    global.botLogger.logSystemEvent('interaction_reply_error', {
                        command: interaction.commandName,
                        error: replyError.message
                    });
                }
            }
            return;
        }

        // Обрабатываем кнопки
        if (interaction.isButton()) {
            console.log(`🔘 Button clicked: ${interaction.customId}`);

            // ЛОГИРУЕМ НАЖАТИЕ КНОПКИ
            global.botLogger.addLog('info', `Button interaction: ${interaction.customId}`, {
                userId: interaction.user.id,
                guildId: interaction.guild?.id,
                channelId: interaction.channel?.id
            });

            // Ваш существующий код для кнопок
        }
    },
};