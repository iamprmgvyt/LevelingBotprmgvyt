require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { connectDB } = require('./utils/database'); // FIXED: Added curly braces
const { startDashboard } = require('./web/server');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Command & Event Loading Logic
client.commands = new Collection();
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) loadCommands(filePath);
        else if (file.name.endsWith('.js')) {
            const command = require(filePath);
            if (command.data) client.commands.set(command.data.name, command);
        }
    }
};

loadCommands(path.join(__dirname, 'commands'));

const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
    else client.on(event.name, (...args) => event.execute(...args, client));
}

// Fixed Startup Sequence
const init = async () => {
    try {
        console.log('📂 Loaded commands and events.');
        
        // 1. Connect to DB
        await connectDB();
        console.log('✅ MongoDB connected successfully.');

        // 2. Login to Discord
        await client.login(process.env.DISCORD_TOKEN);
        
        // 3. Start Web Dashboard
        startDashboard(client);
        
    } catch (error) {
        console.error('❌ Critical Startup Error:', error);
        process.exit(1);
    }
};

init();
