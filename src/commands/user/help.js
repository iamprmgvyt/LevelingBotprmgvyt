const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'help',
        aliases: ['h', 'commands', 'info'],
        description: 'Lists all available commands or gives info about a specific one.'
    },
    async execute(message, args, client, config) {
        const prefix = config.prefix || ',';
        const themeColor = config.embedColor || '#5865F2';

        // 1. General Help Menu (No arguments provided)
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setTitle('📖 Command Menu')
                .setThumbnail(client.user.displayAvatarURL())
                .setColor(themeColor)
                .setDescription(`My current prefix is: \`${prefix}\`\nUse \`${prefix}help [command]\` for specific details.`)
                .setTimestamp();

            // Format the list of commands
            const commandList = client.commands.map(cmd => {
                return `**${prefix}${cmd.data.name}** - ${cmd.data.description}`;
            }).join('\n');

            helpEmbed.addFields({ 
                name: '✨ Available Commands', 
                value: commandList || 'No commands found.' 
            });

            return message.reply({ embeds: [helpEmbed] });
        }

        // 2. Specific Command Detail (e.g., ,help level)
        const query = args[0].toLowerCase();
        const command = client.commands.get(query) || 
                        client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(query));

        if (!command) {
            return message.reply(`❌ I couldn't find a command called \`${query}\`.`);
        }

        const detailEmbed = new EmbedBuilder()
            .setTitle(`Command Details: ${command.data.name}`)
            .setColor(themeColor)
            .addFields(
                { name: 'Description', value: command.data.description || 'No description provided.' },
                { name: 'Aliases', value: command.data.aliases ? `\`${command.data.aliases.join(', ')}\`` : 'None' },
                { name: 'Usage', value: `\`${prefix}${command.data.name}\`` }
            );

        return message.reply({ embeds: [detailEmbed] });
    }
};
