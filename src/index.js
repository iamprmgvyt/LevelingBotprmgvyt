require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { connectDB } = require('./utils/database'); // Destructured correctly
const { startDashboard } = require('./web/server');
const fs = require('fs');
const path = require('path');

// 1. Initialize Discord Client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 2. Setup Collections
client.commands = new Collection();
client.cooldowns = new Collection();

// 3. Recursive Command Loader
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(filePath);
        } else if (file.name.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            }
        }
    }
};

// Start loading
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    loadCommands(commandsPath);
    console.log(`📂 Loaded ${client.commands.size} commands.`);
}

// 4. Event Loader
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(`./events/${file}`);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
    console.log(`🔔 Loaded ${eventFiles.length} events.`);
}

// 5. Secure Startup Sequence
const init = async () => {
    try {
        console.log('🚀 Starting Leveling Bot...');

        // Step A: Connect to MongoDB (Crucial for Dashboard)
        // This will now use the MONGODB_URI you set in Render
        await connectDB();
        console.log('✅ MongoDB connected.');

        // Step B: Login to Discord
        await client.login(process.env.DISCORD_TOKEN);
        console.log(`🤖 Logged in as ${client.user.tag}`);

        // Step C: Launch Web Dashboard
        // We pass 'client' so the web server can fetch guild info
        startDashboard(client);

    } catch (error) {
        console.error('❌ Critical Startup Error:', error);
        // Exit process so Render knows to try a restart
        process.exit(1); 
    }
};

init();

// Export client for use in other modules (like dashboard routes)
module.exports = client;
