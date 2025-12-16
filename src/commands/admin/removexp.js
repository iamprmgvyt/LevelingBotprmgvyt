const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig, getUserLevel } = require('../../utils/database');
const { getLevelFromXp, totalXpRequiredForLevel } = require('../../utils/xpCalculator');

module.exports = {
    data: {
        name: 'removexp',
        description: 'Manually removes a specified amount of XP from a user.',
        usage: '[,removexp <@user> <amount>]',
        adminOnly: true // Crucial permission flag
    },
    /**
     * Executes the removexp command.
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
        const xpArgument = args[1];

        if (!targetMember || !xpArgument) {
            return message.reply(`Usage: \`${this.data.usage}\``);
        }

        const xpAmount = parseInt(xpArgument);

        if (isNaN(xpAmount) || xpAmount <= 0) {
            return message.reply('❌ Please provide a valid, positive number for the XP amount to remove.');
        }

        try {
            const config = await getGuildConfig(message.guild.id);
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            
            const oldLevel = userLevel.level;
            const oldXp = userLevel.xp;

            // Calculate new XP, ensuring it doesn't go below zero
            let newXp = Math.max(0, userLevel.xp - xpAmount);
            userLevel.xp = newXp;
            
            // Recalculate level based on new XP total
            const newLevel = getLevelFromXp(userLevel.xp);
            userLevel.level = newLevel;

            // Ensure the user has at least the minimum XP for their new level (important for edge cases after deduction)
            const minXpForNewLevel = totalXpRequiredForLevel(newLevel);
            if (userLevel.xp < minXpForNewLevel) {
                 userLevel.xp = minXpForNewLevel;
            }

            await userLevel.save();

            // Check if level down occurred
            let levelChangeMessage = '';
            if (newLevel < oldLevel) {
                levelChangeMessage = `\n\n⬇️ **${targetMember.user.username} leveled down to Level ${newLevel}.**`;
            } else if (newLevel === oldLevel) {
                 levelChangeMessage = `\n\n➡️ **${targetMember.user.username} remains at Level ${newLevel}.**`;
            }

            const embed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle('➖ XP Removed Successfully')
                .setDescription(`${targetMember.toString()} had **${xpAmount} XP** deducted manually by ${message.author.toString()}.`)
                .addFields(
                    { name: 'Old XP / Level', value: `**${oldXp}** XP / Lvl **${oldLevel}**`, inline: true },
                    { name: 'New XP / Level', value: `**${userLevel.xp}** XP / Lvl **${newLevel}**`, inline: true }
                )
                .setFooter({ text: `Adjusted by ${message.author.tag}` })
                .setTimestamp();
                
            await message.reply({ content: levelChangeMessage, embeds: [embed] });

        } catch (error) {
            console.error(`Error removing XP for user ${targetMember.id} in guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to update the user\'s XP in the database.');
        }
    },
};