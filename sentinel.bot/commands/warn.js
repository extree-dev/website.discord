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
        try {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            
            // Сохраняем в базу через Prisma
            await prisma.commandStats.create({
                data: {
                    command: 'warn',
                    guildId: interaction.guild.id,
                    userId: targetUser.id,
                    success: true,
                    executionTime: 0,
                    timestamp: new Date()
                }
            });

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