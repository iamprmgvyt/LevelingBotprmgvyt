const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

module.exports = {
    data: {
        name: 'help',
        aliases: ['commands'],
        description: 'Displays a list of all available bot commands.',
        usage: '[,help]',
        adminOnly: false
    },
    /**
     * Executes the help command.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        // Fetch the guild configuration to get the current prefix and embed color
        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix;
        
        // Check if the user is an administrator
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        // Separate commands into categories
        const userCommands = [];
        const adminCommands = [];

        // Iterate through all loaded commands
        client.commands.forEach(command => {
            // Avoid adding aliases multiple times, only check the main command file
            if (command.data.name && !userCommands.some(c => c.name === command.data.name) && !adminCommands.some(c => c.name === command.data.name)) {
                if (command.data.adminOnly) {
                    adminCommands.push(command.data);
                } else {
                    userCommands.push(command.data);
                }
            }
        });

        // --- Format Commands ---
        
        // 1. User Commands
        const userCommandList = userCommands
            .map(cmd => {
                const aliases = cmd.aliases ? ` (Aliases: ${cmd.aliases.map(a => `\`${prefix}${a}\``).join(', ')})` : '';
                return `**\`${prefix}${cmd.name}\`**: ${cmd.description}${aliases}`;
            })
            .join('\n');

        // 2. Admin Commands (Only include if the user is an admin)
        let adminCommandList = '';
        if (isAdmin) {
            adminCommandList = adminCommands
                .map(cmd => `**\`${prefix}${cmd.name}\`**: ${cmd.description} (\`Admin Only\`)`)
                .join('\n');
        }

        // --- Build Embed ---
        const helpEmbed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`📚 Leveling Bot Commands`)
            .setDescription(`Hello! My prefix on this server is **\`${prefix}\`**.\n\nUse \`${prefix}help <command>\` for more detail (if available).`)
            .addFields(
                {
                    name: '👤 User Commands (Leveling & Rank)',
                    value: userCommandList || 'No user commands available.',
                    inline: false,
                }
            );

        // Add admin field only if the user is an admin or if the admin list is not empty
        if (isAdmin && adminCommandList) {
            helpEmbed.addFields({
                name: '🛠️ Administrator Commands (Configuration)',
                value: adminCommandList,
                inline: false,
            });
        } else if (!isAdmin && adminCommands.length > 0) {
            // Inform non-admins that admin commands exist
            helpEmbed.setFooter({ text: `You must be an Administrator to see ${adminCommands.length} configuration commands.` });
        }
        
        await message.reply({ embeds: [helpEmbed] });
    },
};