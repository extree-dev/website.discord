const { Events } = require('discord.js');

module.exports = {
    name: Events.Debug,
    async execute(info) {
        try {
            // Rate limits и предупреждения
            if (info.includes('rate limit') || info.includes('429')) {
                global.botLogger.logSystemEvent('rate_limit', {
                    info: info,
                    severity: 'high'
                });
                console.log(`⚠️ Rate limit: ${info}`);
            }

            // WebSocket события
            else if (info.includes('WebSocket') || info.includes('Heartbeat')) {
                global.botLogger.logSystemEvent('websocket', {
                    info: info,
                    severity: 'low'
                });
                // Не логируем в консоль чтобы не засорять
            }

            // Другие важные debug события
            else if (info.includes('Session') || info.includes('Resume') || info.includes('Invalid')) {
                global.botLogger.logSystemEvent('discord_api', {
                    info: info,
                    severity: 'medium'
                });
                console.log(`🔧 Discord API: ${info}`);
            }

        } catch (error) {
            console.error('Error in debug event:', error);
        }
    },
};