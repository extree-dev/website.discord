const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`📝 Registering command: /${command.data.name}`);
    }
}

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log(`🔄 Registering ${commands.length} application commands...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(
                process.env.DISCORD_CLIENT_ID,
                process.env.DISCORD_GUILD_ID
            ),
            { body: commands }
        );

        console.log(`✅ Successfully registered ${data.length} application commands.`);
        console.log('📋 Commands registered:');
        data.forEach(cmd => console.log(`   - /${cmd.name}`));
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();