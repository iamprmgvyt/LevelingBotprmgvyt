require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { connectDB } = require('./utils/database');
const fs = require('fs');
const path = require('path');

const PREFIX = process.env.BOT_PREFIX || ','; // Default prefix from .env

// Initialize Client and Collections
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
client.commands = new Collection();
client.cooldowns = new Collection(); // Cooldown system for XP

// --- Command Handler ---
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(filePath); // Recurse into subdirectories (e.g., admin, user)
        } else if (file.name.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                // Use the file name as the command name if not specified
                const commandName = command.data.name || file.name.replace('.js', '');
                client.commands.set(commandName, command);
                // Handle aliases
                if (command.data.aliases && Array.isArray(command.data.aliases)) {
                    command.data.aliases.forEach(alias => {
                        client.commands.set(alias, command);
                    });
                }
            } else {
                console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
};

loadCommands(path.join(__dirname, 'commands'));
console.log(`Loaded ${client.commands.size} commands.`);

// --- Event Handler ---
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

// --- Database Connection & Bot Login ---
connectDB().then(() => {
    client.login(process.env.DISCORD_TOKEN);
});

module.exports = client;