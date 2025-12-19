const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Basic Safety: Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        try {
            // 2. LIVE FETCH FROM DATABASE
            // This is the "Sync Bridge". We check MongoDB for the prefix set via the dashboard.
            let config = await GuildConfig.findOne({ guildId: message.guild.id });
            
            // If no config exists in the DB yet, fallback to the default comma
            const prefix = config ? config.prefix : ',';

            // 3. PREFIX DETECTION
            if (!message.content.startsWith(prefix)) return;

            // 4. ARGUMENT PARSING
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // 5. COMMAND EXECUTION
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

            if (command) {
                // Execute command and pass 'config' so the command knows the server's settings
                await command.execute(message, args, client, config);
            }

        } catch (error) {
            console.error('Error in messageCreate sync:', error);
        }
    },
};
