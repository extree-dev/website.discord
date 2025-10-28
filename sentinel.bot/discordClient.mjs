// В sentinel.bot/discordClient.js
const { Client, GatewayIntentBits } = require('discord.js');

let discordClient = null;

function initializeClient() {
    if (!discordClient) {
        discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.AutoModerationConfiguration,
                GatewayIntentBits.AutoModerationExecution,
                GatewayIntentBits.GuildPresences,
            ]
        });
    }
    return discordClient;
}

function getClient() {
    if (!discordClient) {
        throw new Error('Discord client not initialized. Call initializeClient first.');
    }
    return discordClient;
}

module.exports = {
    initializeClient,
    getClient
};