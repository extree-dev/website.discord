// commands/unban.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Разбанить пользователя')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('ID пользователя для разбана')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина разбана')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const startTime = Date.now();

        try {
            const userId = interaction.options.getString('user_id');
            const reason = interaction.options.getString('reason') || 'Причина не указана';

            // Проверяем права
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return await interaction.reply({
                    content: '❌ У вас нет прав для разбана пользователей',
                    flags: 64
                });
            }

            // Разбаниваем пользователя
            await interaction.guild.members.unban(userId, reason);

            // Обновляем запись в базе данных
            await prisma.bannedUser.updateMany({
                where: {
                    discordId: userId,
                    guildId: interaction.guild.id,
                    unbannedAt: null
                },
                data: {
                    unbannedAt: new Date(),
                    unbannedBy: interaction.user.id,
                    unbannedByUsername: interaction.user.username,
                    unbanReason: reason
                }
            });

            const responseTime = Date.now() - startTime;

            // Сохраняем статистику команды
            await prisma.commandStats.create({
                data: {
                    command: 'unban',
                    guildId: interaction.guild.id,
                    userId: userId,
                    success: true,
                    executionTime: responseTime,
                    timestamp: new Date()
                }
            });

            // Сохраняем в трекер памяти
            if (global.commandTracker) {
                global.commandTracker.recordCommand(
                    'unban',
                    true,
                    responseTime,
                    interaction.guild.id,
                    userId
                );
            }

            await interaction.reply({
                content: `✅ Пользователь с ID ${userId} был разбанен\n📝 Причина: ${reason}`,
                flags: 64
            });

        } catch (error) {
            console.error('Error in unban command:', error);

            // Сохраняем ошибку в базу
            await prisma.commandStats.create({
                data: {
                    command: 'unban',
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    success: false,
                    executionTime: 0,
                    error: error.message,
                    timestamp: new Date()
                }
            });

            await interaction.reply({
                content: '❌ Произошла ошибка при разбане пользователя. Убедитесь, что ID правильный.',
                flags: 64
            });
        }
    }
};