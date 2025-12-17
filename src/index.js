require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { connectDB } = require('./utils/database');
const { startDashboard } = require('./web/server');
const fs = require('fs');
const path = require('path');

// 1. Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 2. Collections for Commands and Cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// 3. Command Handler (Recursive Loader)
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(filePath);
        } else if (file.name.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                const commandName = command.data.name || file.name.replace('.js', '');
                client.commands.set(commandName, command);
                
                // Handle Alises
                if (command.data.aliases && Array.isArray(command.data.aliases)) {
                    command.data.aliases.forEach(alias => client.commands.set(alias, command));
                }
            }
        }
    }
};

loadCommands(path.join(__dirname, 'commands'));
console.log(`📂 Loaded ${client.commands.size} commands.`);

// 4. Event Handler
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}
console.log(`🔔 Loaded ${eventFiles.length} events.`);

// 5. Bot Startup & Web Server Initialization
const init = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        console.log('✅ MongoDB connected successfully.');

        // Login to Discord
        await client.login(process.env.DISCORD_TOKEN);
        
        // Start the Express Dashboard once the bot is ready
        // We pass 'client' so the dashboard can access server data
        startDashboard(client);
        
    } catch (error) {
        console.error('❌ Critical Startup Error:', error);
        process.exit(1);
    }
};

init();

// Export client for use in other files if necessary
module.exports = client;
