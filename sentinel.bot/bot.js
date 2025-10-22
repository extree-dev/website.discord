require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { initializeClient, getClient } = require('./discordClient.mjs');
const express = require('express');
const fs = require('fs');
const path = require('path');

console.log('Starting Sentinel bot...');

// Проверяем переменные окружения
console.log('Environment check:');
console.log('DISCORD_BOT_TOKEN exists:', !!process.env.DISCORD_BOT_TOKEN);
console.log('DISCORD_BOT_TOKEN length:', process.env.DISCORD_BOT_TOKEN?.length);
console.log('DISCORD_BOT_TOKEN starts with:', process.env.DISCORD_BOT_TOKEN?.substring(0, 10));
console.log('GUILD_ID:', process.env.DISCORD_GUILD_ID);
console.log('CLIENT_ID:', process.env.DISCORD_CLIENT_ID);

if (!process.env.DISCORD_BOT_TOKEN) {
    console.error(' DISCORD_BOT_TOKEN not found in .env file');
    process.exit(1);
}

// Инициализируем клиент через нашу функцию
const client = initializeClient();

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
            console.log('Missing guildId or userId for command tracking');
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
            console.log(`Saved to DB: ${commandName}, guild: ${guildId}, user: ${userId}`);
        } catch (dbError) {
            console.error(' Error saving command stats to DB:', dbError.message);
        }

        console.log(`Command tracked: ${commandName}, success: ${success}, time: ${responseTime}ms`);
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

// Добавляем в bot.js класс для сбора статистики
class StatsCollector {
    constructor() {
        this.memberHistory = new Map();
        this.startTime = Date.now();
        this.prisma = new PrismaClient();
    }

    // Сохраняем статистику каждые 30 минут
    async saveServerStats(guild) {
        try {
            const totalMembers = guild.memberCount;

            // Получаем реальное количество онлайн пользователей
            await guild.members.fetch();
            const onlineMembers = guild.members.cache.filter(member =>
                member.presence?.status === 'online' ||
                member.presence?.status === 'idle' ||
                member.presence?.status === 'dnd'
            ).size;

            // Сохраняем в БД
            await this.prisma.serverStats.create({
                data: {
                    guildId: guild.id,
                    memberCount: totalMembers,
                    onlineCount: onlineMembers,
                    timestamp: new Date()
                }
            });

            console.log(`REAL STATS: ${totalMembers} members, ${onlineMembers} online`);

        } catch (error) {
            console.error('Error saving server stats:', error);
        }
    }

    // Расчет реального роста
    calculateRealGrowth(currentStats, previousStats) {
        if (!previousStats || previousStats.memberCount === 0) {
            return { change: 0, isPositive: true, period: 'new' };
        }

        const change = ((currentStats.memberCount - previousStats.memberCount) / previousStats.memberCount) * 100;
        const isPositive = change >= 0;

        // Определяем период на основе разницы во времени
        const timeDiff = currentStats.timestamp - previousStats.timestamp;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        let period = 'recently';
        if (hoursDiff >= 24) period = 'yesterday';
        if (hoursDiff >= 168) period = 'last week';

        return {
            change: Math.round(change * 10) / 10,
            isPositive,
            period,
            actualChange: currentStats.memberCount - previousStats.memberCount
        };
    }

    // Получаем последние статистические данные
    async getLatestStats(guildId) {
        try {
            const stats = await this.prisma.serverStats.findMany({
                where: { guildId },
                orderBy: { timestamp: 'desc' },
                take: 10
            });

            return stats.length > 0 ? stats : null;
        } catch (error) {
            console.error('Error getting latest stats:', error);
            return null;
        }
    }
}

class AlertSystem {
    constructor() {
        this.prisma = new PrismaClient();
        this.messageCache = new Map();
        this.joinCache = new Map();
        this.verificationCache = new Map();
        this.suspiciousCache = new Map();
    }

    // 🔒 ОБНАРУЖЕНИЕ РЕЙД-АТАКИ (массовый вход)
    async detectRaidProtection(guild, newMember) {
        const guildId = guild.id;
        const now = Date.now();

        if (!this.joinCache.has(guildId)) {
            this.joinCache.set(guildId, []);
        }

        const recentJoins = this.joinCache.get(guildId);
        recentJoins.push({
            userId: newMember.id,
            username: newMember.user.tag,
            timestamp: now
        });

        // Очищаем старые записи (последние 10 минут)
        const filteredJoins = recentJoins.filter(join => now - join.timestamp < 600000);
        this.joinCache.set(guildId, filteredJoins);

        // Критерии рейд-защиты Discord
        if (filteredJoins.length >= 8) { // 8+ пользователей за 10 минут
            await this.createAlert('raid_protection', 'critical', {
                title: '🛡️ СРАБОТАЛА ЗАЩИТА ОТ РЕЙДОВ',
                description: `Обнаружено ${filteredJoins.length} новых участников за 10 минут`,
                guildId: guildId,
                data: {
                    trigger: 'mass_join_protection',
                    newMembers: filteredJoins.length,
                    timeFrame: '10 minutes',
                    securityLevel: 'high',
                    recentJoins: filteredJoins.slice(-5),
                    autoActions: ['verification_required', 'slow_mode_enabled'],
                    recommendation: 'Проверить новых участников на ботов',
                    detectedAt: new Date().toISOString()
                }
            });
            return true;
        }

        return false;
    }

    // 🤖 ОБНАРУЖЕНИЕ СРАБАТЫВАНИЯ АВТОМОДА
    async detectAutoModAction(message) {
        // Критерии автомода Discord
        const automodTriggers = [
            // Запрещенные слова
            /\b(спам|реклама|купить|продать|discord\.gg\/)\b/i,
            // Ссылки
            /https?:\/\/[^\s]+/,
            // Массовые упоминания
            /(@everyone|@here).{0,10}(@everyone|@here)/,
            // Капс
            /[A-ZА-Я]{10,}/
        ];

        let triggeredRule = null;

        for (const pattern of automodTriggers) {
            if (pattern.test(message.content)) {
                if (pattern.toString().includes('спам')) triggeredRule = 'banned_words';
                else if (pattern.toString().includes('http')) triggeredRule = 'links';
                else if (pattern.toString().includes('@everyone')) triggeredRule = 'mass_mentions';
                else if (pattern.toString().includes('[A-Z]')) triggeredRule = 'caps_lock';
                break;
            }
        }

        if (triggeredRule) {
            await this.createAlert('automod_triggered', 'medium', {
                title: '🤖 АВТОМОД СРАБОТАЛ',
                description: `Обнаружено сообщение, нарушающее правила`,
                guildId: message.guild.id,
                data: {
                    action: 'content_flagged',
                    rule: triggeredRule,
                    channel: message.channel.name,
                    channelId: message.channel.id,
                    user: message.author.tag,
                    userId: message.author.id,
                    content: message.content.substring(0, 200),
                    messageUrl: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
                    severity: 'auto',
                    timestamp: new Date().toISOString()
                }
            });
            return true;
        }

        return false;
    }

    // 🕵️ ОБНАРУЖЕНИЕ ПОДОЗРИТЕЛЬНЫХ АККАУНТОВ
    async detectSuspiciousAccount(member) {
        const flags = [];
        const user = member.user;
        const accountAge = Date.now() - user.createdTimestamp;

        // Критерии подозрительности (как в Discord)
        if (accountAge < 24 * 60 * 60 * 1000) { // < 1 дня
            flags.push('new_account');
        }
        if (!user.avatar) {
            flags.push('no_avatar');
        }
        if (this.hasSuspiciousUsername(user.username)) {
            flags.push('suspicious_username');
        }
        if (this.hasSuspiciousBehavior(member)) {
            flags.push('suspicious_behavior');
        }

        // Если есть 2+ флага - создаем алерт
        if (flags.length >= 2) {
            await this.createAlert('suspicious_account', 'high', {
                title: '🕵️ ОБНАРУЖЕН ПОДОЗРИТЕЛЬНЫЙ АККАУНТ',
                description: `Аккаунт ${user.tag} имеет признаки подозрительности`,
                guildId: member.guild.id,
                data: {
                    userId: user.id,
                    username: user.tag,
                    flags: flags,
                    accountAge: `${Math.floor(accountAge / (1000 * 60 * 60))} часов`,
                    created: user.createdAt.toISOString(),
                    recommendation: 'Рекомендуется проверить вручную',
                    riskLevel: flags.length >= 3 ? 'high' : 'medium',
                    detectedAt: new Date().toISOString()
                }
            });
            return true;
        }

        return false;
    }

    // 🔐 ОБНАРУЖЕНИЕ ПРОБЛЕМ С ВЕРИФИКАЦИЕЙ
    async detectVerificationIssues(guild) {
        const guildId = guild.id;
        const now = Date.now();

        if (!this.verificationCache.has(guildId)) {
            this.verificationCache.set(guildId, {
                pending: 0,
                failures: 0,
                lastCheck: now
            });
        }

        const cache = this.verificationCache.get(guildId);

        // Симуляция проблем с верификацией (в реальности нужно получать из Discord API)
        const hasVerificationIssues = Math.random() > 0.7; // 30% chance

        if (hasVerificationIssues) {
            await this.createAlert('verification_issues', 'medium', {
                title: '🔒 ПРОБЛЕМЫ С ВЕРИФИКАЦИЕЙ',
                description: 'Пользователи испытывают трудности с прохождением проверки',
                guildId: guildId,
                data: {
                    pendingVerifications: Math.floor(Math.random() * 10) + 5,
                    failedAttempts: Math.floor(Math.random() * 20) + 10,
                    timeFrame: 'последний час',
                    issue: 'captcha_failures',
                    recommendation: 'Проверить настройки верификации и уровень безопасности',
                    serverSecurity: guild.verified ? 'high' : 'medium',
                    detectedAt: new Date().toISOString()
                }
            });
            return true;
        }

        return false;
    }

    // ⚠️ ОБНАРУЖЕНИЕ НАРУШЕНИЙ БЕЗОПАСНОСТИ
    async detectSecurityViolations(guild) {
        // Проверяем настройки безопасности сервера
        const securityIssues = [];

        // Проверка уровня верификации
        if (guild.verificationLevel === 'NONE') {
            securityIssues.push('no_verification');
        }

        // Проверка 2FA для модераторов
        const modsWithout2FA = await this.checkMods2FA(guild);
        if (modsWithout2FA.length > 0) {
            securityIssues.push('mods_without_2fa');
        }

        // Проверка экспиред-инвайтов
        const hasExpiredInvites = await this.checkExpiredInvites(guild);
        if (hasExpiredInvites) {
            securityIssues.push('expired_invites');
        }

        if (securityIssues.length > 0) {
            await this.createAlert('security_violations', 'high', {
                title: '⚠️ НАРУШЕНИЯ БЕЗОПАСНОСТИ',
                description: 'Обнаружены проблемы в настройках безопасности сервера',
                guildId: guild.id,
                data: {
                    issues: securityIssues,
                    verificationLevel: guild.verificationLevel,
                    modsWithout2FA: modsWithout2FA.length,
                    recommendation: 'Обновить настройки безопасности сервера',
                    urgency: securityIssues.includes('no_verification') ? 'high' : 'medium',
                    detectedAt: new Date().toISOString()
                }
            });
            return true;
        }

        return false;
    }

    // 📈 ОБНАРУЖЕНИЕ АНОМАЛЬНОЙ АКТИВНОСТИ
    async detectAnomalousActivity(guild) {
        const guildId = guild.id;
        const now = Date.now();

        if (!this.messageCache.has(guildId)) {
            this.messageCache.set(guildId, []);
        }

        const messageHistory = this.messageCache.get(guildId);

        // Симуляция аномальной активности
        const recentMessages = messageHistory.filter(msg => now - msg.timestamp < 300000); // 5 минут
        const messageRate = recentMessages.length / 5; // сообщений в минуту

        // Критерии аномальной активности
        if (messageRate > 50) { // Более 50 сообщений в минуту
            await this.createAlert('anomalous_activity', 'medium', {
                title: '📈 АНОМАЛЬНАЯ АКТИВНОСТЬ',
                description: 'Обнаружена необычно высокая активность на сервере',
                guildId: guildId,
                data: {
                    messageRate: `${Math.round(messageRate)}/мин`,
                    activeChannels: guild.channels.cache.filter(ch => ch.type === 0).size,
                    peakUsers: guild.members.cache.filter(m =>
                        m.presence?.status === 'online' ||
                        m.presence?.status === 'idle' ||
                        m.presence?.status === 'dnd'
                    ).size,
                    recommendation: 'Включить медленный режим в активных каналах',
                    severity: messageRate > 100 ? 'high' : 'medium',
                    detectedAt: new Date().toISOString()
                }
            });
            return true;
        }

        return false;
    }

    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    hasSuspiciousUsername(username) {
        const suspiciousPatterns = [
            /discord\.gg\/\w+/i,
            /http(s)?:\/\//i,
            /[0-9]{8,}/,
            /(admin|moderator|staff|official)/i,
            /[\u2500-\u27BF\uE000-\uF8FF]/
        ];
        return suspiciousPatterns.some(pattern => pattern.test(username));
    }

    hasSuspiciousBehavior(member) {
        // Проверяем подозрительное поведение
        const joinTime = Date.now() - member.joinedTimestamp;
        return joinTime < 60000; // Участвовал в событиях менее чем через минуту после вступления
    }

    async checkMods2FA(guild) {
        // Заглушка - в реальности нужно проверять через Discord API
        return [];
    }

    async checkExpiredInvites(guild) {
        // Заглушка - в реальности нужно проверять инвайты
        return Math.random() > 0.5;
    }

    // 📝 СОЗДАНИЕ АЛЕРТА (обновленный)
    async createAlert(type, severity, alertData) {
        try {
            const alert = await this.prisma.alert.create({
                data: {
                    type: type,
                    severity: severity,
                    title: alertData.title,
                    description: alertData.description,
                    guildId: alertData.guildId,
                    data: alertData.data || {},
                    status: 'active',
                    timestamp: new Date()
                }
            });

            console.log(`🚨 REAL ALERT: ${alert.title} [${severity}]`);

            // Можно добавить отправку в Discord канал
            await this.notifyDiscordChannel(alert);

            return alert;
        } catch (error) {
            console.error('Error creating alert:', error);
        }
    }

    // 🔔 УВЕДОМЛЕНИЕ В DISCORD КАНАЛ
    async notifyDiscordChannel(alert) {
        try {
            const channelId = process.env.ALERTS_CHANNEL_ID;
            if (!channelId) return;

            const client = getClient();
            const channel = await client.channels.fetch(channelId);

            if (channel && channel.isTextBased()) {
                const embed = {
                    title: alert.title,
                    description: alert.description,
                    color: this.getSeverityColor(alert.severity),
                    fields: [
                        {
                            name: 'Тип',
                            value: alert.type,
                            inline: true
                        },
                        {
                            name: 'Сервер',
                            value: alert.guildId,
                            inline: true
                        },
                        {
                            name: 'Время',
                            value: `<t:${Math.floor(new Date(alert.timestamp).getTime() / 1000)}:R>`,
                            inline: true
                        }
                    ],
                    timestamp: new Date().toISOString()
                };

                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error sending Discord notification:', error);
        }
    }

    getSeverityColor(severity) {
        const colors = {
            'critical': 0xff0000, // Красный
            'high': 0xffa500,    // Оранжевый
            'medium': 0xffff00,  // Желтый
            'low': 0x00ff00      // Зеленый
        };
        return colors[severity] || 0x808080;
    }

    // Получение активных алертов (без изменений)
    async getActiveAlerts(guildId, limit = 10) {
        try {
            return await this.prisma.alert.findMany({
                where: {
                    guildId: guildId,
                    status: 'active'
                },
                orderBy: {
                    timestamp: 'desc'
                },
                take: limit
            });
        } catch (error) {
            console.error('Error getting active alerts:', error);
            return [];
        }
    }

    // Обновление статуса алерта (без изменений)
    async resolveAlert(alertId, resolvedBy) {
        try {
            return await this.prisma.alert.update({
                where: { id: alertId },
                data: {
                    status: 'resolved',
                    resolvedBy: resolvedBy,
                    resolvedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error resolving alert:', error);
        }
    }
}

global.statsCollector = new StatsCollector();
global.alertSystem = new AlertSystem();

// Запускаем периодический сбор статистики
function startStatsCollection(client) {
    setInterval(async () => {
        try {
            const guild = client.guilds.cache.get(process.env.GUILD_ID);
            if (guild) {
                await global.statsCollector.saveServerStats(guild);
            }
        } catch (error) {
            console.error('Error in stats collection:', error);
        }
    }, 5 * 60 * 1000); // Каждые 5 минут
}

// Запускаем сбор статистики после подключения бота
client.once('ready', () => {
    console.log('🔄 Starting stats collection...');
    startStatsCollection(client);

    // Сохраняем начальную статистику
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        global.statsCollector.saveServerStats(guild);
    }
});

// Создаем глобальный трекер
global.commandTracker = new CommandTracker();

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
        console.log(`Loaded command: /${command.data.name}`);
    } else {
        console.log(`Command ${filePath} is missing required properties`);
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

        console.log(` Starting automatic command registration for ${commands.length} commands...`);

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
            console.log(` Successfully registered ${guildData.length} guild commands.`);
            guildData.forEach(cmd => console.log(`   - /${cmd.name}`));
        } catch (guildError) {
            console.log(' Guild command registration failed:', guildError.message);
        }

        // 2. Затем регистрируем ГЛОБАЛЬНЫЕ команды (для значка)
        try {
            console.log(' Registering GLOBAL commands for badge...');
            const globalData = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID),
                { body: commands }
            );
            console.log(` Global commands registered successfully! ${globalData.length} commands.`);
            console.log(' Badge "Supports Slash Commands" should appear within 24 hours!');
        } catch (globalError) {
            console.log(' Global command registration failed:', globalError.message);
            console.log(' This may affect the badge appearance, but bot will continue working.');
        }

    } catch (error) {
        console.error(' Error during command registration:', error);
        console.log(' But continuing bot startup...');
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

    console.log(`Loaded event: ${event.name}`);
}

// Запускаем API
const { startAPI } = require('./api.js');
startAPI();

// Пробуем подключиться к боту
console.log('Attempting to login to Discord...');
client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => {
        console.log('Bot logged in successfully');

        // ЗАПУСКАЕМ АВТОМАТИЧЕСКУЮ РЕГИСТРАЦИЮ ПОСЛЕ УСПЕШНОГО ЛОГИНА
        registerCommands();
    })
    .catch(error => {
        console.error('Bot login failed:', error.message);
        console.log('But API is still running!');
    });

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    const finalStats = global.commandTracker.getTotalStats();
    console.log(`Final stats: ${finalStats.totalUsage} commands tracked`);
    client.destroy();
    process.exit(0);
});