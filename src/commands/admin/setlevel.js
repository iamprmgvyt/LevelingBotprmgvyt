const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getUserLevel } = require('../../utils/database');
const { totalXpRequiredForLevel } = require('../../utils/xpCalculator');

module.exports = {
    data: {
        name: 'setlevel',
        description: 'Instantly sets a user to a specific level by adjusting their total XP.',
        usage: '[,setlevel <@user> <level>]',
        adminOnly: true
    },
    /**
     * @param {Message} message 
     * @param {string[]} args 
     * @param {Client} client 
     * @param {Object} config - Passed from messageCreate.js
     */
    async execute(message, args, client, config) {
        // 1. Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ **Permission Denied.** You must be an **Administrator** to use this command.');
        }

        const targetMember = message.mentions.members.first();
        const levelArgument = args[1];

        if (!targetMember || !levelArgument) {
            return message.reply(`Usage: \`${this.data.usage}\``);
        }

        const newLevel = parseInt(levelArgument);

        if (isNaN(newLevel) || newLevel < 0) {
            return message.reply('❌ Please provide a valid level number (0 or higher).');
        }

        try {
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            
            const oldLevel = userLevel.level;
            const oldXp = userLevel.xp;

            // 2. Set the Level and Calculate the exact XP required for that level
            // This uses your totalXpRequiredForLevel formula from xpCalculator.js
            userLevel.level = newLevel;
            userLevel.xp = totalXpRequiredForLevel(newLevel);

            await userLevel.save();

            // 3. Build response embed
            const embed = new EmbedBuilder()
                // FIXED: Color fallback to prevent CombinedError
                .setColor(config.embedColor || '#3498db') 
                .setTitle('🆙 Level Adjusted')
                .setDescription(`${targetMember.toString()} has been manually set to **Level ${newLevel}**.`)
                .addFields(
                    { name: 'Previous Stats', value: `Lvl **${oldLevel}** (${oldXp.toLocaleString()} XP)`, inline: true },
                    { name: 'New Stats', value: `Lvl **${newLevel}** (${userLevel.xp.toLocaleString()} XP)`, inline: true }
                )
                .setFooter({ text: `Set by ${message.author.tag}` })
                .setTimestamp();
                
            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error setting level for user ${targetMember.id}:`, error);
            message.reply('❌ An error occurred while trying to update the level in the database.');
        }
    },
};
