const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

module.exports = {
    data: {
        name: 'togglelevel',
        description: 'Toggles the XP and leveling system ON or OFF for this server.',
        usage: '[,togglelevel]',
        adminOnly: true // Crucial permission flag
    },
    /**
     * Executes the togglelevel command.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments (not required).
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        // Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ **Permission Denied.** You must be an **Administrator** to use this command.', ephemeral: true });
        }

        try {
            const config = await getGuildConfig(message.guild.id);
            const newState = !config.levelingEnabled; // Toggle the current state

            config.levelingEnabled = newState;
            await config.save();

            const statusEmoji = newState ? '🟢' : '🔴';
            const statusText = newState ? 'Enabled' : 'Disabled';
            const description = newState 
                ? 'The leveling system is now **ON**! Users will start gaining XP by sending messages.'
                : 'The leveling system is now **OFF**. No XP will be gained until it is re-enabled.';

            const embed = new EmbedBuilder()
                .setColor(newState ? '#2ecc71' : '#e74c3c') // Green for ON, Red for OFF
                .setTitle(`${statusEmoji} Leveling System Toggled`)
                .setDescription(description)
                .addFields({
                    name: 'Current Status',
                    value: `Leveling is now set to **${statusText}** for **${message.guild.name}**.`,
                    inline: true
                })
                .setFooter({ text: `Configuration stored in MongoDB for Guild ID: ${message.guild.id}` });

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error toggling leveling for guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to toggle the leveling status in the database.');
        }
    },
};