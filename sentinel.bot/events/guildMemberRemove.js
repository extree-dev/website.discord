// guildMemberRemove.js  
const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        // Мгновенно обновляем статистику при уходе участника
        if (global.statsCollector && member.guild.id === process.env.GUILD_ID) {
            setTimeout(() => {
                global.statsCollector.saveServerStats(member.guild);
            }, 1000);
        }
    },
};