const { Events } = require('discord.js');

module.exports = {
    name: Events.Warn,
    async execute(info) {
        try {
            global.botLogger.logSystemEvent('warning', {
                info: info,
                severity: 'medium'
            });

            console.log(`⚠️ Discord Warning: ${info}`);

        } catch (error) {
            console.error('Error in warn event:', error);
        }
    },
};