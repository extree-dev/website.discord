const { Events } = require('discord.js');
const TEMP_ROLE_ID = process.env.TEMP_ROLE_ID;

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            const role = member.guild.roles.cache.get(TEMP_ROLE_ID);
            if (!role) return console.error('Роль верификации не найдена!');

            await member.roles.add(role);
            console.log(`Выдана временная роль пользователю ${member.user.tag}`);
        } catch (error) {
            console.error('Ошибка при выдаче роли:', error);
        }
    },
};