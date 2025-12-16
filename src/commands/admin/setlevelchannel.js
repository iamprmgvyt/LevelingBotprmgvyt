const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

module.exports = {
    data: {
        name: 'setlevelchannel',
        description: 'Sets the channel where level-up announcements will be posted.',
        usage: '[,setlevelchannel <#channel | off>]',
        adminOnly: true // Crucial permission flag
    },
    /**
     * Executes the setlevelchannel command.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        // Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ **Permission Denied.** You must be an **Administrator** to use this command.' });
        }

        const channelArgument = args[0];
        const config = await getGuildConfig(message.guild.id);
        const embedColor = config.embedColor;
        let responseMessage = '';
        
        // --- Option 1: Disable Announcements ---
        if (channelArgument && channelArgument.toLowerCase() === 'off') {
            config.levelupChannelId = null;
            await config.save();
            responseMessage = '📣 Level-up announcements have been **disabled**. No channel is currently set.';
            
            const disableEmbed = new EmbedBuilder()
                .setColor('#f39c12')
                .setTitle('Level-Up Announcements Disabled')
                .setDescription(responseMessage);
            
            return message.reply({ embeds: [disableEmbed] });
        }
        
        // --- Option 2: Set a Channel ---
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(channelArgument);

        if (!channel || channel.type !== ChannelType.GuildText) {
            const currentChannel = config.levelupChannelId ? `<#${config.levelupChannelId}>` : 'None';
            return message.reply(`❌ Invalid channel or channel type. Please mention a text channel (e.g., \`,setlevelchannel #announcements\`). Current channel: **${currentChannel}**`);
        }
        
        // Check if bot can send messages in the channel
        const botPermissions = channel.permissionsFor(client.user);
        if (!botPermissions || !botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
            return message.reply(`❌ I do not have permission to send messages in ${channel}. Please adjust my permissions.`);
        }

        try {
            config.levelupChannelId = channel.id;
            await config.save();
            
            responseMessage = `Level-up announcements will now be posted in ${channel}.`;

            const successEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('✅ Level-Up Channel Set')
                .setDescription(responseMessage)
                .addFields({
                    name: 'Testing Announcement',
                    value: `I will now send announcements to ${channel} when a user levels up!`
                })
                .setFooter({ text: `Set by ${message.author.tag}` });
                
            // Send the confirmation to the channel where the command was run
            await message.reply({ embeds: [successEmbed] });

            // Optional: Send a test message to the newly set channel
            try {
                await channel.send(`👋 This channel has been set for level-up announcements by **${message.author.tag}**!`);
            } catch (e) {
                console.error(`Could not send test message to ${channel.name}:`, e);
            }

        } catch (error) {
            console.error(`Error setting level channel for guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to save the level-up channel ID to the database.');
        }
    },
};