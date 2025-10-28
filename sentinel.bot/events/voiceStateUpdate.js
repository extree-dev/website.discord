const { Events } = require('discord.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        try {
            // Бот подключился к голосовому каналу
            if (newState.member?.id === newState.client.user.id && newState.channelId) {
                global.botLogger.logVoiceConnection('join', newState.channelId, newState.guild.id);
                console.log(`🎤 Bot joined voice channel: ${newState.channelId}`);
            }
            
            // Бот отключился от голосового канала
            if (oldState.member?.id === oldState.client.user.id && !newState.channelId) {
                global.botLogger.logVoiceConnection('leave', oldState.channelId, oldState.guild.id);
                console.log(`🎤 Bot left voice channel: ${oldState.channelId}`);
            }

            // Бот переключился между каналами
            if (oldState.member?.id === oldState.client.user.id && 
                newState.member?.id === newState.client.user.id && 
                oldState.channelId !== newState.channelId) {
                global.botLogger.logVoiceConnection('switch', newState.channelId, newState.guild.id, {
                    from: oldState.channelId,
                    to: newState.channelId
                });
                console.log(`🎤 Bot switched voice channel: ${oldState.channelId} -> ${newState.channelId}`);
            }

        } catch (error) {
            console.error('Error in voiceStateUpdate event:', error);
            global.botLogger.logSystemEvent('voice_error', {
                error: error.message,
                guildId: newState?.guild?.id || oldState?.guild?.id
            });
        }
    },
};