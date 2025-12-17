const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'setlevelchannel',
        description: 'Sets the channel where level-up announcements will be posted.',
        usage: '[,setlevelchannel <#channel | off>]',
        adminOnly: true 
    },
    /**
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     * @param {Object} config - The Guild Config from database.
     */
    async execute(message, args, client, config) {
        // 1. Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ **Permission Denied.** You must be an **Administrator** to use this command.' });
        }

        const channelArgument = args[0];
        // FIXED: Always ensure embedColor has a value to prevent CombinedError
        const embedColor = config.embedColor || '#5865F2'; 
        let responseMessage = '';
        
        // --- Option 1: Disable Announcements ---
        if (channelArgument && channelArgument.toLowerCase() === 'off') {
            config.levelUpChannel = null; // Use the same field name as your Schema
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
            const currentChannel = config.levelUpChannel ? `<#${config.levelUpChannel}>` : 'None';
            return message.reply(`❌ Invalid channel or channel type. Please mention a text channel (e.g., \`,setlevelchannel #announcements\`). Current channel: **${currentChannel}**`);
        }
        
        // Check if bot can send messages in the channel
        const botPermissions = channel.permissionsFor(client.user);
        if (!botPermissions || !botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
            return message.reply(`❌ I do not have permission to send messages in ${channel}. Please adjust my permissions.`);
        }

        try {
            // Update the config field (ensure this matches your GuildConfig Schema)
            config.levelUpChannel = channel.id;
            await config.save();
            
            responseMessage = `Level-up announcements will now be posted in ${channel}.`;

            const successEmbed = new EmbedBuilder()
                .setColor(embedColor) // FIXED: Will now be '#5865F2' if DB is empty
                .setTitle('✅ Level-Up Channel Set')
                .setDescription(responseMessage)
                .addFields({
                    name: 'Testing Announcement',
                    value: `I will now send announcements to ${channel} when a user levels up!`
                })
                .setFooter({ text: `Set by ${message.author.tag}` });
                
            await message.reply({ embeds: [successEmbed] });

            // Optional: Send a test message to the newly set channel
            try {
                await channel.send(`👋 This channel has been set for level-up announcements by **${message.author.tag}**!`);
            } catch (e) {
                console.error(`Could not send test message to ${channel.name}:`, e);
            }

        } catch (error) {
            console.error(`Error setting level channel for guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to save to the database.');
        }
    },
};
