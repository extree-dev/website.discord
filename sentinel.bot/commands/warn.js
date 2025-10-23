const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Выдать предупреждение пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для предупреждения')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина предупреждения')
                .setRequired(true)),

    async execute(interaction) {
        const startTime = Date.now(); // ← Начало измерения
        try {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const responseTime = Date.now() - startTime;

            // Сохраняем в базу через Prisma
            await prisma.commandStats.create({
                data: {
                    command: 'warn',
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
                    'warn',
                    true,
                    responseTime,
                    interaction.guild.id,
                    targetUser.id
                );
            }


            await interaction.reply({
                content: `✅ Пользователю ${targetUser} выдано предупреждение по причине: ${reason}`,
                flags: 64
            });

        } catch (error) {
            console.error('Error in warn command:', error);

            // Сохраняем ошибку в базу
            await prisma.commandStats.create({
                data: {
                    command: 'warn',
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