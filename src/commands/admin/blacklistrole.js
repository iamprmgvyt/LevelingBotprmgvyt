const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

module.exports = {
    data: {
        name: 'blacklistrole',
        description: 'Adds or removes a role from the XP blacklist. Users with this role will not gain XP.',
        usage: '[,blacklistrole <@role>]',
        adminOnly: true
    },
    /**
     * Executes the blacklistrole command.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        // Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ **Permission Denied.** You must be an **Administrator** to use this command.');
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

        if (!role) {
            // Fetch current config to list existing blacklisted roles
            const config = await getGuildConfig(message.guild.id);
            const currentBlacklist = config.blacklistedRoles.map(id => `<@&${id}>`).join(', ') || 'None';
            
            return message.reply(`❌ Invalid role. Please mention a role to toggle its blacklist status.\n\n**Current Blacklist:** ${currentBlacklist}`);
        }

        // Prevent blacklisting the @everyone role, which is typically not intended for XP blacklisting
        if (role.id === message.guild.id) {
            return message.reply('❌ You cannot blacklist the `@everyone` role.');
        }

        try {
            const config = await getGuildConfig(message.guild.id);
            const roleId = role.id;
            const index = config.blacklistedRoles.indexOf(roleId);
            let action;

            if (index > -1) {
                // Role is already blacklisted, so remove it
                config.blacklistedRoles.splice(index, 1);
                action = 'Removed From';
            } else {
                // Role is not blacklisted, so add it
                config.blacklistedRoles.push(roleId);
                action = 'Added To';
            }

            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor(index > -1 ? '#2ecc71' : '#e74c3c') // Green for removal, Red for addition
                .setTitle(`🚫 Role Blacklist Updated`)
                .setDescription(`${role.toString()} has been **${action}** the XP blacklist.`)
                .addFields({
                    name: 'Status',
                    value: `Users with this role will ${index > -1 ? 'now' : 'no longer'} gain XP.`,
                    inline: true
                })
                .setFooter({ text: `Toggle status by using the command again.` })
                .setTimestamp();
                
            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error toggling role blacklist for guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to update the role blacklist in the database.');
        }
    },
};