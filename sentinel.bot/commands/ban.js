// commands/ban.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Забанить пользователя на сервере')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для бана')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина бана')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Количество дней для удаления сообщений (0-7)')
                .setMinValue(0)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const startTime = Date.now();

        try {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const deleteDays = interaction.options.getInteger('days') || 0;

            // Проверяем права
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return await interaction.reply({
                    content: '❌ У вас нет прав для бана пользователей',
                    flags: 64
                });
            }

            // Проверяем можно ли забанить этого пользователя
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            if (targetMember) {
                if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                    return await interaction.reply({
                        content: '❌ Вы не можете забанить пользователя с равной или высшей ролью',
                        flags: 64
                    });
                }
            }

            // Баним пользователя
            await interaction.guild.members.ban(targetUser.id, {
                deleteMessageSeconds: deleteDays * 24 * 60 * 60,
                reason: reason
            });

            // Сохраняем в базу данных
            await prisma.bannedUser.create({
                data: {
                    discordId: targetUser.id,
                    username: targetUser.username,
                    discriminator: targetUser.discriminator,
                    avatar: targetUser.avatar,
                    guildId: interaction.guild.id,
                    bannedBy: interaction.user.id,
                    bannedByUsername: interaction.user.username,
                    reason: reason,
                    deleteDays: deleteDays,
                    bannedAt: new Date()
                }
            });

            const responseTime = Date.now() - startTime;

            // Сохраняем статистику команды
            await prisma.commandStats.create({
                data: {
                    command: 'ban',
                    guildId: interaction.guild.id,
                    userId: targetUser.id,
                    success: true,
                    executionTime: responseTime,
                    timestamp: new Date()
                }
            });

            // Сохраняем в трекер памяти
            if (global.commandTracker) {
                global.commandTracker.recordCommand(
                    'ban',
                    true,
                    responseTime,
                    interaction.guild.id,
                    targetUser.id
                );
            }

            await interaction.reply({
                content: `✅ Пользователь ${targetUser} был забанен\n📝 Причина: ${reason}\n🗑️ Удалено сообщений: ${deleteDays} дней`,
                flags: 64
            });

        } catch (error) {
            console.error('Error in ban command:', error);

            // Сохраняем ошибку в базу
            await prisma.commandStats.create({
                data: {
                    command: 'ban',
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    success: false,
                    executionTime: 0,
                    error: error.message,
                    timestamp: new Date()
                }
            });

            await interaction.reply({
                content: '❌ Произошла ошибка при выполнении команды',
                flags: 64
            });
        }
    }
};