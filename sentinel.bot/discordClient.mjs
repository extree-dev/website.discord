// discordClient.js
import { Client, GatewayIntentBits } from 'discord.js';

let clientInstance = null;

export const getClient = () => {
    if (!clientInstance) {
        clientInstance = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildPresences
            ]
        });
        clientInstance.login(process.env.DISCORD_TOKEN);
    }
    return clientInstance;
};