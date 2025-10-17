// sentinel.bot\utils\commandHandler.js
class CommandHandler {
    static async executeWithTracking(interaction, command) {
        const startTime = Date.now();
        
        try {
            // Выполняем команду
            await command.execute(interaction);
            const responseTime = Date.now() - startTime;
            
            // Записываем успешное выполнение
            if (global.commandTracker) {
                global.commandTracker.recordCommand(
                    interaction.commandName, 
                    true, 
                    responseTime
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
                    responseTime
                );
            }
            
            console.error(`❌ Command failed: /${interaction.commandName}`, error);
            throw error; // Пробрасываем ошибку дальше для обработки в основном обработчике
        }
    }
}

module.exports = CommandHandler;