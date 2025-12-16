const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

module.exports = {
    data: {
        name: 'blacklistchannel',
        description: 'Adds or removes a channel from the XP blacklist. No XP is gained in blacklisted channels.',
        usage: '[,blacklistchannel <#channel>]',
        adminOnly: true
    },
    /**
     * Executes the blacklistchannel command.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        // Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ **Permission Denied.** You must be an **Administrator** to use this command.');
        }

        const channel = message.mentions.channels.first();

        if (!channel || channel.type !== ChannelType.GuildText) {
            // Fetch current config to list existing blacklisted channels
            const config = await getGuildConfig(message.guild.id);
            const currentBlacklist = config.blacklistedChannels.map(id => `<#${id}>`).join(', ') || 'None';
            
            return message.reply(`❌ Invalid channel. Please mention a text channel to toggle its blacklist status.\n\n**Current Blacklist:** ${currentBlacklist}`);
        }

        try {
            const config = await getGuildConfig(message.guild.id);
            const channelId = channel.id;
            const index = config.blacklistedChannels.indexOf(channelId);
            let action;

            if (index > -1) {
                // Channel is already blacklisted, so remove it
                config.blacklistedChannels.splice(index, 1);
                action = 'Removed From';
            } else {
                // Channel is not blacklisted, so add it
                config.blacklistedChannels.push(channelId);
                action = 'Added To';
            }

            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor(index > -1 ? '#2ecc71' : '#e74c3c') // Green for removal, Red for addition
                .setTitle(`🚫 Channel Blacklist Updated`)
                .setDescription(`${channel} has been **${action}** the XP blacklist.`)
                .addFields({
                    name: 'Status',
                    value: `Users will ${index > -1 ? 'now' : 'no longer'} gain XP in ${channel}.`,
                    inline: true
                })
                .setFooter({ text: `Toggle status by using the command again.` })
                .setTimestamp();
                
            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error toggling channel blacklist for guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to update the channel blacklist in the database.');
        }
    },
};