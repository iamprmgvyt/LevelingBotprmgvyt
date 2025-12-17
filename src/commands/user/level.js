const { EmbedBuilder } = require('discord.js');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');

module.exports = {
    data: {
        name: 'level',
        description: 'Check your current level and XP progress.',
        aliases: ['lvl', 'rank'],
        usage: '[,level [@user]]'
    },
    /**
     * @param {Message} message 
     * @param {string[]} args 
     * @param {Client} client 
     * @param {Object} config - Passed from messageCreate.js
     */
    async execute(message, args, client, config) {
        // 1. Determine target user (self or mentioned user)
        const targetMember = message.mentions.members.first() || message.member;
        
        try {
            // 2. Fetch data from DB
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            
            // 3. Calculate progress using your XP formula
            const progressData = getXpProgress(userLevel.xp, userLevel.level);
            
            // 4. Create a simple text-based progress bar
            const progress = progressData.progress; // 0-100
            const totalBars = 10;
            const filledBars = Math.floor(progress / totalBars);
            const emptyBars = totalBars - filledBars;
            const progressBar = '🟦'.repeat(filledBars) + '⬜'.repeat(emptyBars);

            // 5. Build the embed
            const embed = new EmbedBuilder()
                .setAuthor({ 
                    name: targetMember.user.username, 
                    iconURL: targetMember.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTitle('📊 Level Progress')
                .setColor(config.embedColor || '#6366f1') // Safe fallback
                .addFields(
                    { name: 'Level', value: `\`${userLevel.level}\``, inline: true },
                    { name: 'Total XP', value: `\`${userLevel.xp.toLocaleString()}\``, inline: true },
                    { name: 'Progress', value: `${progressBar} **${progress}%**\n\`${progressData.currentLevelXp.toLocaleString()} / ${progressData.requiredXp.toLocaleString()} XP\`` }
                )
                .setFooter({ text: `Server: ${message.guild.name}` })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error in level command:`, error);
            message.reply('❌ An error occurred while fetching level data.');
        }
    }
};
