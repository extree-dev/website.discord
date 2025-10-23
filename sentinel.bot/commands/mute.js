const { SlashCommandBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const config = require('../utils/config');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

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
    const startTime = Date.now(); // ← Начало измерения

    try {
      const targetUser = interaction.options.getUser('user');
      const duration = interaction.options.getInteger('duration');
      const reason = interaction.options.getString('reason') || 'Не указана';

      // Проверка прав
      if (!interaction.member.permissions.has('MODERATE_MEMBERS')) {
        const responseTime = Date.now() - startTime;
        // Сохраняем попытку без прав
        await prisma.commandStats.create({
          data: {
            command: 'mute',
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            success: false,
            executionTime: responseTime,
            error: 'Insufficient permissions',
            timestamp: new Date()
          }
        });

        return interaction.reply({
          content: '❌ У вас нет прав для использования этой команды!',
          ephemeral: true
        });
      }

      const muteRole = interaction.guild.roles.cache.get(config.moderation.muteRoleId);
      if (!muteRole) {
        const responseTime = Date.now() - startTime;
        await prisma.commandStats.create({
          data: {
            command: 'mute',
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            success: false,
            executionTime: responseTime,
            error: 'Mute role not found',
            timestamp: new Date()
          }
        });

        return interaction.reply({
          content: '❌ Роль для мута не найдена!',
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(targetUser.id);
      await member.roles.add(muteRole, `Мут на ${duration} минут. Причина: ${reason}`);

      const responseTime = Date.now() - startTime; // ← Конец измерения

      // Сохраняем успешное выполнение
      await prisma.commandStats.create({
        data: {
          command: 'mute',
          guildId: interaction.guild.id,
          userId: targetUser.id,
          success: true,
          executionTime: responseTime,
          timestamp: new Date()
        }
      });

      // Также сохраняем в трекер памяти
      if (global.commandTracker) {
        global.commandTracker.recordCommand(
          'mute',
          true,
          responseTime,
          interaction.guild.id,
          targetUser.id
        );
      }

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
      const responseTime = Date.now() - startTime;
      logger.error(`Ошибка при выдаче мута: ${error}`);

      // Сохраняем ошибку
      await prisma.commandStats.create({
        data: {
          command: 'mute',
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          success: false,
          executionTime: responseTime,
          error: error.message,
          timestamp: new Date()
        }
      });

      throw error;
    }
  }
};