const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig, getUserLevel } = require('../../utils/database');
const { totalXpRequiredForLevel } = require('../../utils/xpCalculator');

module.exports = {
    data: {
        name: 'setlevel',
        description: 'Manually sets a user\'s level, adjusting XP to the minimum required for that level.',
        usage: '[,setlevel <@user> <level>]',
        adminOnly: true // Crucial permission flag
    },
    /**
     * Executes the setlevel command.
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
        const levelArgument = args[1];

        if (!targetMember || !levelArgument) {
            return message.reply(`Usage: \`${this.data.usage}\``);
        }

        const newLevel = parseInt(levelArgument);

        if (isNaN(newLevel) || newLevel < 0 || newLevel > 500) { // Limit level to prevent database strain
            return message.reply('❌ Please provide a valid, positive level number (max 500).');
        }

        try {
            const config = await getGuildConfig(message.guild.id);
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            
            const oldLevel = userLevel.level;
            const oldXp = userLevel.xp;

            // Calculate the minimum XP required for the new level
            const requiredXp = totalXpRequiredForLevel(newLevel);

            // Update database record
            userLevel.level = newLevel;
            userLevel.xp = requiredXp;
            await userLevel.save();

            const embed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle('⬆️ User Level Manually Adjusted')
                .setDescription(`${targetMember.toString()}'s leveling data has been updated.`)
                .addFields(
                    { name: 'Previous Level / XP', value: `Lvl **${oldLevel}** / **${oldXp}** XP`, inline: true },
                    { name: 'New Level / XP', value: `Lvl **${newLevel}** / **${requiredXp}** XP`, inline: true }
                )
                .setFooter({ text: `Adjusted by ${message.author.tag}` })
                .setTimestamp();

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error setting level for user ${targetMember.id} in guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to update the user\'s level in the database.');
        }
    },
};