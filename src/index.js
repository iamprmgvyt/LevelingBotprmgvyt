require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { connectDB } = require('./utils/database');
const { startDashboard } = require('./web/server'); // Import the dashboard
const fs = require('fs');
const path = require('path');

// Initialize Client and Collections
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Added for role rewards and avatar cards
    ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

// --- Command Handler (Your Original Logic) ---
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
                if (command.data.aliases && Array.isArray(command.data.aliases)) {
                    command.data.aliases.forEach(alias => client.commands.set(alias, command));
                }
            }
        }
    }
};

loadCommands(path.join(__dirname, 'commands'));
console.log(`Loaded ${client.commands.size} commands.`);

// --- Event Handler (Your Original Logic) ---
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}
console.log(`Loaded ${eventFiles.length} events.`);

// --- Startup Logic ---
// We start both the Bot and the Dashboard inside this block
const init = async () => {
    try {
        await connectDB();
        console.log('✅ Database connected.');

        // Login the bot
        await client.login(process.env.DISCORD_TOKEN);
        
        // CRITICAL: Start the web server for Render
        // This ensures Render sees an open port (3000/10000)
        startDashboard(); 
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        process.exit(1);
    }
};

init();

module.exports = client;
