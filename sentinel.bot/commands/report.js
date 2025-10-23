const { SlashCommandBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Отправить жалобу на пользователя')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Пользователь для жалобы')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Причина жалобы')
        .setRequired(true)),

  async execute(interaction) {
    const startTime = Date.now(); // ← Начало измерения

    try {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const reportChannelId = process.env.REPORT_CHANNEL_ID;

      if (!reportChannelId) {
        throw new Error('Report channel not configured');
      }

      const reportChannel = await interaction.guild.channels.fetch(reportChannelId);

      if (!reportChannel) {
        throw new Error('Report channel not found');
      }

      // Отправляем репорт в канал
      await reportChannel.send({
        embeds: [{
          title: '🚨 Новая жалоба',
          fields: [
            { name: 'Жалоба от', value: `${interaction.user} (${interaction.user.id})`, inline: true },
            { name: 'На пользователя', value: `${targetUser} (${targetUser.id})`, inline: true },
            { name: 'Причина', value: reason }
          ],
          timestamp: new Date().toISOString(),
          color: 0xff0000
        }]
      });

      const responseTime = Date.now() - startTime; // ← Конец измерения

      // Сохраняем в базу через Prisma
      await prisma.commandStats.create({
        data: {
          command: 'report',
          guildId: interaction.guild.id,
          userId: targetUser.id,
          success: true,
          executionTime: responseTime, // ← Реальное время
          timestamp: new Date()
        }
      });

      // Также сохраняем в трекер памяти
      if (global.commandTracker) {
        global.commandTracker.recordCommand(
          'report',
          true,
          responseTime,
          interaction.guild.id,
          targetUser.id
        );
      }

      await interaction.reply({
        content: '✅ Ваша жалоба отправлена модераторам',
        flags: 64
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('Error in report command:', error);

      // Сохраняем ошибку в базу
      await prisma.commandStats.create({
        data: {
          command: 'report',
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          success: false,
          executionTime: responseTime,
          error: error.message,
          timestamp: new Date()
        }
      });

      await interaction.reply({
        content: '❌ Произошла ошибка при отправке жалобы',
        flags: 64
      });
    }
  }
};