const { Events } = require('discord.js');

module.exports = {
    name: Events.Error,
    async execute(error) {
        try {
            global.botLogger.logSystemEvent('api_error', {
                error: error.message,
                stack: error.stack,
                severity: 'high'
            });

            console.error(`❌ Discord API Error:`, error);

        } catch (logError) {
            console.error('Error logging API error:', logError);
        }
    },
};