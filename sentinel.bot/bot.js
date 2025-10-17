require('dotenv').config({ path: '../.env' });
import { PrismaClient, Prisma } from "@prisma/client"; // Добавлен Prisma
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

console.log('🤖 Starting Sentinel bot...');

// Проверяем переменные окружения
console.log('🔍 Environment check:');
console.log('DISCORD_BOT_TOKEN exists:', !!process.env.DISCORD_BOT_TOKEN);
console.log('DISCORD_BOT_TOKEN length:', process.env.DISCORD_BOT_TOKEN?.length);
console.log('DISCORD_BOT_TOKEN starts with:', process.env.DISCORD_BOT_TOKEN?.substring(0, 10));
console.log('GUILD_ID:', process.env.DISCORD_GUILD_ID);
console.log('CLIENT_ID:', process.env.DISCORD_CLIENT_ID);

if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN not found in .env file');
    process.exit(1);
}

// КЛАСС ДЛЯ ТРЕКИНГА КОМАНД
class CommandTracker {
    constructor() {
        this.commandStats = new Map();
        this.startTime = Date.now();
        this.prisma = new PrismaClient();
    }

    async recordCommand(commandName, success, responseTime, guildId, userId, error = null) {
        // Проверяем обязательные поля
        if (!guildId || !userId) {
            console.log('⚠️ Missing guildId or userId for command tracking');
            return;
        }

        // Сохраняем в память для быстрого доступа
        if (!this.commandStats.has(commandName)) {
            this.commandStats.set(commandName, {
                usage: 0,
                success: 0,
                totalResponseTime: 0,
                lastUsed: Date.now(),
                type: this.getCommandType(commandName)
            });
        }

        const stats = this.commandStats.get(commandName);
        stats.usage++;
        stats.totalResponseTime += responseTime;
        if (success) stats.success++;
        stats.lastUsed = Date.now();

        // Сохраняем в базу через Prisma
        try {
            await this.prisma.commandStats.create({
                data: {
                    command: commandName,
                    guildId: guildId,        // Обязательное поле
                    userId: userId,          // Обязательное поле
                    success: success,
                    executionTime: responseTime,
                    error: error,
                    timestamp: new Date()
                }
            });
            console.log(`💾 Saved to DB: ${commandName}, guild: ${guildId}, user: ${userId}`);
        } catch (dbError) {
            console.error('❌ Error saving command stats to DB:', dbError.message);
        }

        console.log(`📝 Command tracked: ${commandName}, success: ${success}, time: ${responseTime}ms`);
    }

    getCommandType(commandName) {
        const moderationCommands = ['ban', 'mute', 'warn', 'kick', 'timeout', 'lock', 'unlock', 'clear', 'slowmode'];
        const utilityCommands = ['userinfo', 'serverinfo', 'avatar', 'help', 'ping', 'stats', 'banner'];

        if (moderationCommands.some(cmd => commandName.includes(cmd))) return 'moderation';
        if (utilityCommands.some(cmd => commandName.includes(cmd))) return 'utility';
        return 'other';
    }

    getStats(period = '24h', filter = 'all') {
        const stats = [];
        const now = Date.now();

        const periodMs = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        }[period] || 24 * 60 * 60 * 1000;

        for (const [commandName, data] of this.commandStats) {
            if (data.lastUsed < now - periodMs) continue;
            if (filter !== 'all' && data.type !== filter) continue;

            const successRate = data.usage > 0 ? Math.round((data.success / data.usage) * 100) : 0;
            const avgResponseTime = data.usage > 0 ? Math.round(data.totalResponseTime / data.usage) : 0;

            stats.push({
                name: commandName,
                usage: data.usage,
                success: data.success,
                successRate: successRate,
                avgResponseTime: avgResponseTime,
                type: data.type,
                lastUsed: this.formatTimeAgo(data.lastUsed)
            });
        }

        stats.sort((a, b) => b.usage - a.usage);
        return stats;
    }

    formatTimeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
    }

    getTotalStats() {
        let totalUsage = 0;
        let totalSuccess = 0;
        let totalResponseTime = 0;

        for (const [_, data] of this.commandStats) {
            totalUsage += data.usage;
            totalSuccess += data.success;
            totalResponseTime += data.totalResponseTime;
        }

        const overallSuccessRate = totalUsage > 0 ? Math.round((totalSuccess / totalUsage) * 100) : 0;
        const avgResponse = totalUsage > 0 ? Math.round(totalResponseTime / totalUsage) : 0;

        return {
            totalUsage,
            overallSuccessRate,
            avgResponse,
            uniqueCommands: this.commandStats.size
        };
    }
}

// Создаем глобальный трекер
global.commandTracker = new CommandTracker();

// Создаем клиент Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Коллекция для команд
client.commands = new Collection();

// Загружаем команды
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`🔧 Loaded command: /${command.data.name}`);
    } else {
        console.log(`⚠️ Command ${filePath} is missing required properties`);
    }
}

// ФУНКЦИЯ АВТОМАТИЧЕСКОЙ РЕГИСТРАЦИИ КОМАНД
async function registerCommands() {
    try {
        const commands = [];

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }

        console.log(`🔄 Starting automatic command registration for ${commands.length} commands...`);

        const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

        // 1. Сначала регистрируем команды для гильдии (сервера)
        try {
            console.log('🏠 Registering guild commands...');
            const guildData = await rest.put(
                Routes.applicationGuildCommands(
                    process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID,
                    process.env.GUILD_ID || process.env.DISCORD_GUILD_ID
                ),
                { body: commands }
            );
            console.log(`✅ Successfully registered ${guildData.length} guild commands.`);
            guildData.forEach(cmd => console.log(`   - /${cmd.name}`));
        } catch (guildError) {
            console.log('❌ Guild command registration failed:', guildError.message);
        }

        // 2. Затем регистрируем ГЛОБАЛЬНЫЕ команды (для значка)
        try {
            console.log('🌍 Registering GLOBAL commands for badge...');
            const globalData = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ Global commands registered successfully! ${globalData.length} commands.`);
            console.log('🎉 Badge "Supports Slash Commands" should appear within 24 hours!');
        } catch (globalError) {
            console.log('❌ Global command registration failed:', globalError.message);
            console.log('💡 This may affect the badge appearance, but bot will continue working.');
        }

    } catch (error) {
        console.error('❌ Error during command registration:', error);
        console.log('💡 But continuing bot startup...');
    }
}

// Загружаем обработчики событий
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }

    console.log(`🎯 Loaded event: ${event.name}`);
}

// Запускаем API
const { startAPI } = require('./api.js');
startAPI();

// Пробуем подключиться к боту
console.log('🔐 Attempting to login to Discord...');
client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => {
        console.log('✅ Bot logged in successfully');

        // ЗАПУСКАЕМ АВТОМАТИЧЕСКУЮ РЕГИСТРАЦИЮ ПОСЛЕ УСПЕШНОГО ЛОГИНА
        registerCommands();
    })
    .catch(error => {
        console.error('❌ Bot login failed:', error.message);
        console.log('💡 But API is still running!');
    });

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down...');
    const finalStats = global.commandTracker.getTotalStats();
    console.log(`📊 Final stats: ${finalStats.totalUsage} commands tracked`);
    client.destroy();
    process.exit(0);
});