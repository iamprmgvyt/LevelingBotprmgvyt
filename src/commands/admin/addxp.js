const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig, getUserLevel } = require('../../utils/database');
const { getLevelFromXp } = require('../../utils/xpCalculator');
const LevelingManager = require('../../utils/LevelingManager'); // Needed for level up announcement/roles

module.exports = {
    data: {
        name: 'addxp',
        description: 'Manually adds a specified amount of XP to a user.',
        usage: '[,addxp <@user> <amount>]',
        adminOnly: true // Crucial permission flag
    },
    /**
     * Executes the addxp command.
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
            return message.reply('❌ Please provide a valid, positive number for the XP amount.');
        }

        try {
            const config = await getGuildConfig(message.guild.id);
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            
            const oldLevel = userLevel.level;
            const oldXp = userLevel.xp;

            // Update XP
            userLevel.xp += xpAmount;
            
            // Recalculate level based on new XP total
            const newLevel = getLevelFromXp(userLevel.xp);
            userLevel.level = newLevel;

            // Check if level up occurred
            let levelUpNotification = '';
            if (newLevel > oldLevel) {
                // Manually trigger the level up handlers if a level was gained
                await LevelingManager.handleLevelUpAnnouncement(targetMember, newLevel, config);
                await LevelingManager.handleRoleRewards(targetMember, newLevel, config);
                levelUpNotification = `\n\n🎉 **${targetMember.user.username} leveled up to Level ${newLevel}!** (Automatic announcement sent)`;
            }

            await userLevel.save();

            const embed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle('➕ XP Added Successfully')
                .setDescription(`${targetMember.toString()} was granted **${xpAmount} XP** manually by ${message.author.toString()}.`)
                .addFields(
                    { name: 'Old XP / Level', value: `**${oldXp}** XP / Lvl **${oldLevel}**`, inline: true },
                    { name: 'New XP / Level', value: `**${userLevel.xp}** XP / Lvl **${newLevel}**`, inline: true }
                )
                .setFooter({ text: `Adjusted by ${message.author.tag}` })
                .setTimestamp();
                
            await message.reply({ content: levelUpNotification, embeds: [embed] });

        } catch (error) {
            console.error(`Error adding XP for user ${targetMember.id} in guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to update the user\'s XP in the database.');
        }
    },
};