const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');
const LevelingManager = require('../../utils/LevelingManager'); // Use the utility manager for the reset logic

module.exports = {
    data: {
        name: 'resetxp',
        description: 'Resets a user\'s level and XP back to Level 0 with 0 XP.',
        usage: '[,resetxp <@user>]',
        adminOnly: true // Crucial permission flag
    },
    /**
     * Executes the resetxp command.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        // Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ **Permission Denied.** You must be an **Administrator** to use this command.');
        }

        const targetMember = message.mentions.members.first();

        if (!targetMember) {
            return message.reply(`Usage: \`${this.data.usage}\``);
        }

        // Confirmation Check (Good practice for destructive commands)
        const confirmationMessage = await message.reply(`⚠️ **CONFIRMATION REQUIRED:** Are you sure you want to completely reset the XP and level for **${targetMember.user.tag}**? Reply with \`confirm\` within 15 seconds.`);
        
        const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
        
        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
            
            // If confirmed
            await confirmationMessage.delete(); // Delete confirmation message
            
            const config = await getGuildConfig(message.guild.id);
            
            // Use the LevelingManager utility to perform the reset
            await LevelingManager.resetUserLevel(targetMember.id, message.guild.id);
            
            const embed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle('♻️ User Level Reset')
                .setDescription(`The leveling progress for ${targetMember.toString()} has been completely reset to **Level 0** with **0 XP** in this server.`)
                .setFooter({ text: `Reset by ${message.author.tag}` })
                .setTimestamp();
                
            await message.reply({ embeds: [embed] });

        } catch (error) {
            // If the error is a timeout (user didn't reply 'confirm') or another issue
            if (error.size === 0) { // Timeout
                 await confirmationMessage.edit({ content: `✅ **Reset Cancelled.** XP reset for ${targetMember.user.tag} was cancelled due to timeout.` });
            } else {
                 console.error(`Error resetting XP for user ${targetMember.id} in guild ${message.guild.id}:`, error);
                 await confirmationMessage.edit({ content: '❌ An error occurred during the reset process.' });
            }
        }
    },
};