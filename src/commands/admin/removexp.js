const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getUserLevel } = require('../../utils/database');
const { calculateLevel, totalXpRequiredForLevel } = require('../../utils/xpCalculator');

module.exports = {
    data: {
        name: 'removexp',
        description: 'Manually removes a specified amount of XP from a user.',
        usage: '[,removexp <@user> <amount>]',
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
        const xpArgument = args[1];

        if (!targetMember || !xpArgument) {
            return message.reply(`Usage: \`${this.data.usage}\``);
        }

        const xpAmount = parseInt(xpArgument);

        if (isNaN(xpAmount) || xpAmount <= 0) {
            return message.reply('❌ Please provide a valid, positive number for the XP amount to remove.');
        }

        try {
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            
            const oldLevel = userLevel.level;
            const oldXp = userLevel.xp;

            // 2. Calculate new XP, ensuring it doesn't go below zero
            let newXp = Math.max(0, userLevel.xp - xpAmount);
            userLevel.xp = newXp;
            
            // 3. Recalculate level (FIXED: Uses calculateLevel instead of getLevelFromXp)
            const newLevel = calculateLevel(userLevel.xp);
            userLevel.level = newLevel;

            // 4. Safety: Ensure user has at least the minimum XP for their new level
            const minXpForNewLevel = totalXpRequiredForLevel(newLevel);
            if (userLevel.xp < minXpForNewLevel) {
                 userLevel.xp = minXpForNewLevel;
            }

            await userLevel.save();

            // 5. Level change feedback
            let levelChangeMessage = '';
            if (newLevel < oldLevel) {
                levelChangeMessage = `\n\n⬇️ **${targetMember.user.username} leveled down to Level ${newLevel}.**`;
            } else {
                 levelChangeMessage = `\n\n➡️ **${targetMember.user.username} remains at Level ${newLevel}.**`;
            }

            // 6. Build response embed
            const embed = new EmbedBuilder()
                // FIXED: Color fallback to prevent CombinedError
                .setColor(config.embedColor || '#e74c3c') 
                .setTitle('➖ XP Removed Successfully')
                .setDescription(`${targetMember.toString()} had **${xpAmount.toLocaleString()} XP** deducted manually by ${message.author.toString()}.`)
                .addFields(
                    { name: 'Old XP / Level', value: `**${oldXp.toLocaleString()}** / Lvl **${oldLevel}**`, inline: true },
                    { name: 'New XP / Level', value: `**${userLevel.xp.toLocaleString()}** / Lvl **${newLevel}**`, inline: true }
                )
                .setFooter({ text: `Adjusted by ${message.author.tag}` })
                .setTimestamp();
                
            await message.reply({ content: levelChangeMessage, embeds: [embed] });

        } catch (error) {
            console.error(`Error removing XP for user ${targetMember.id}:`, error);
            message.reply('❌ An error occurred while trying to update the database.');
        }
    },
};
