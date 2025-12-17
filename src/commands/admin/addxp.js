const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getUserLevel } = require('../../utils/database');
const { calculateLevel } = require('../../utils/xpCalculator'); // FIXED: Matches new utility name
const LevelingManager = require('../../utils/LevelingManager');

module.exports = {
    data: {
        name: 'addxp',
        description: 'Manually adds a specified amount of XP to a user.',
        usage: '[,addxp <@user> <amount>]',
        adminOnly: true 
    },
    /**
     * @param {Message} message 
     * @param {string[]} args 
     * @param {Client} client 
     * @param {Object} config - Passed from messageCreate.js
     */
    async execute(message, args, client, config) {
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
            // We use the config passed from the event handler for better performance
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            
            const oldLevel = userLevel.level;
            const oldXp = userLevel.xp;

            // Update XP
            userLevel.xp += xpAmount;
            
            // FIXED: Using calculateLevel (the name from your fixed xpCalculator.js)
            const newLevel = calculateLevel(userLevel.xp);
            userLevel.level = newLevel;

            // Check if level up occurred
            let levelUpNotification = '';
            if (newLevel > oldLevel) {
                // Check if LevelingManager has these specific split functions or a single handler
                try {
                    if (LevelingManager.handleLevelUpAnnouncement) {
                        await LevelingManager.handleLevelUpAnnouncement(targetMember, newLevel, config);
                        await LevelingManager.handleRoleRewards(targetMember, newLevel, config);
                    } else {
                        await LevelingManager.handleLevelUp(targetMember, newLevel, config);
                    }
                    levelUpNotification = `\n\n🎉 **${targetMember.user.username} leveled up to Level ${newLevel}!**`;
                } catch (mgrError) {
                    console.error("LevelingManager error in addxp:", mgrError);
                }
            }

            await userLevel.save();

            const embed = new EmbedBuilder()
                // FIXED: Color fallback to prevent CombinedError
                .setColor(config.embedColor || '#2ecc71') 
                .setTitle('➕ XP Added Successfully')
                .setDescription(`${targetMember.toString()} was granted **${xpAmount.toLocaleString()} XP** manually by ${message.author.toString()}.`)
                .addFields(
                    { name: 'Old XP / Level', value: `**${oldXp.toLocaleString()}** XP / Lvl **${oldLevel}**`, inline: true },
                    { name: 'New XP / Level', value: `**${userLevel.xp.toLocaleString()}** XP / Lvl **${newLevel}**`, inline: true }
                )
                .setFooter({ text: `Adjusted by ${message.author.tag}` })
                .setTimestamp();
                
            await message.reply({ content: levelUpNotification, embeds: [embed] });

        } catch (error) {
            console.error(`Error adding XP for user ${targetMember.id}:`, error);
            message.reply('❌ An error occurred while updating the database.');
        }
    },
};
