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
                return await interaction.reply({
                    content: 'Command not found!',
                    ephemeral: true
                });
            }

            const startTime = Date.now();

            try {
                console.log(`🚀 Executing command: /${interaction.commandName}`);
                await command.execute(interaction);
                const responseTime = Date.now() - startTime;

                // Записываем успешное выполнение
                if (global.commandTracker) {
                    global.commandTracker.recordCommand(
                        interaction.commandName,
                        true,
                        responseTime,
                        interaction.guild.id,           // guildId
                        interaction.user.id,            // userId
                        null                            // error
                    );
                }

                console.log(`✅ Command executed: /${interaction.commandName}, time: ${responseTime}ms`);

            } catch (error) {
                const responseTime = Date.now() - startTime;

                // Записываем неудачное выполнение
                if (global.commandTracker) {
                    global.commandTracker.recordCommand(
                        interaction.commandName,
                        false,
                        responseTime,
                        interaction.guild.id,           // guildId  
                        interaction.user.id,            // userId
                        error.message                   // error
                    );
                }

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
                }
            }
            return;
        }

        // Обрабатываем кнопки
        if (interaction.isButton()) {
            console.log(`🔘 Button clicked: ${interaction.customId}`);
            // Ваш существующий код для кнопок
        }
    },
};