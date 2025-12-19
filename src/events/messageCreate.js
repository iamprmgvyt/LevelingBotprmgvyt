const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        try {
            // 1. Fetch the server's specific configuration
            let config = await GuildConfig.findOne({ guildId: message.guild.id });
            
            // 2. Determine the ONLY valid prefix
            // If the DB has one, use it. Otherwise, use ','
            const activePrefix = config ? config.prefix : ',';

            // 3. STRICT CHECK: Does it start with the active prefix?
            // This prevents the bot from responding to the old prefix.
            if (!message.content.startsWith(activePrefix)) return;

            // 4. Parse Command
            const args = message.content.slice(activePrefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

            if (command) {
                await command.execute(message, args, client, config);
            }
        } catch (error) {
            console.error('Prefix Sync Error:', error);
        }
    }
};
