const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        try {
            // 1. Fetch live config from Database
            let config = await GuildConfig.findOne({ guildId: message.guild.id });
            
            // 2. Set the ONLY active prefix
            const prefix = config ? config.prefix : ',';

            // 3. Strict Check: If it doesn't start with the DB prefix, QUIT.
            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = client.commands.get(commandName) || 
                            client.commands.find(c => c.data.aliases && c.data.aliases.includes(commandName));

            if (command) {
                await command.execute(message, args, client, config);
            }
        } catch (error) { console.error('Message Error:', error); }
    }
};
