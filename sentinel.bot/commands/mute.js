const { SlashCommandBuilder } = require('discord.js');
const config = require('../utils/config');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Замутить пользователя')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Пользователь для мута')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Длительность мута в минутах')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Причина мута')),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'Не указана';

    // Проверка прав
    if (!interaction.member.permissions.has('MODERATE_MEMBERS')) {
      return interaction.reply({
        content: '❌ У вас нет прав для использования этой команды!',
        ephemeral: true
      });
    }

    const muteRole = interaction.guild.roles.cache.get(config.moderation.muteRoleId);
    if (!muteRole) {
      return interaction.reply({
        content: '❌ Роль для мута не найдена!',
        ephemeral: true
      });
    }

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      await member.roles.add(muteRole, `Мут на ${duration} минут. Причина: ${reason}`);

      await interaction.reply({
        content: `🔇 ${targetUser.tag} был замучен на ${duration} минут. Причина: ${reason}`,
        ephemeral: false
      });

      // Автоматическое снятие мута
      setTimeout(async () => {
        try {
          await member.roles.remove(muteRole, 'Автоматическое снятие мута');
          const channel = interaction.channel;
          if (channel) {
            await channel.send(`🔊 ${targetUser.tag} был размучен автоматически`);
          }
        } catch (e) {
          logger.error(`Ошибка при автоматическом снятии мута: ${e}`);
        }
      }, duration * 60 * 1000);

    } catch (error) {
      logger.error(`Ошибка при выдаче мута: ${error}`);
      throw error; // Пробрасываем ошибку для трекинга
    }
  }
};