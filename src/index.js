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

// 2. Setup Collections
client.commands = new Collection();
client.cooldowns = new Collection();

// 3. Recursive Command Loader (Fixed to ensure no duplicates)
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(filePath);
        } else if (file.name.endsWith('.js')) {
            delete require.cache[require.resolve(filePath)]; // Clear cache for clean reload
            const command = require(filePath);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
            }
        }
    }
};

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    loadCommands(commandsPath);
    console.log(`📂 Loaded ${client.commands.size} commands.`);
}

// 4. Event Loader (STABILITY FIX: Prevents double attaching)
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    // Clear existing listeners to prevent double execution on hot-reloads
    client.removeAllListeners(); 

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = `./events/${file}`;
        delete require.cache[require.resolve(filePath)];
        const event = require(filePath);
        
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

        // Step A: Connect to MongoDB
        await connectDB();
        console.log('✅ MongoDB connected.');

        // Step B: Login to Discord
        await client.login(process.env.DISCORD_TOKEN);
        console.log(`🤖 Logged in as ${client.user.tag}`);

        // Step C: Launch Web Dashboard
        // NOTE: If Render restarts your app due to port timeout, 
        // this can sometimes cause a second login. 
        startDashboard(client);

    } catch (error) {
        console.error('❌ Critical Startup Error:', error);
        process.exit(1); 
    }
};

init();

module.exports = client;
