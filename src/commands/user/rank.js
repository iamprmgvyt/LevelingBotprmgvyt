const { EmbedBuilder } = require('discord.js');
const { getGuildConfig, getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
    data: {
        name: 'rank',
        aliases: ['level', 'xp'],
        description: 'Shows your (or another user\'s) current level and XP status in this server.',
        usage: '[,rank] or [,rank @user]',
        adminOnly: false
    },
    /**
     * Executes the rank command.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        // Determine the target user (mentioned user or message author)
        const target = message.mentions.users.first() || message.author;
        const targetMember = message.guild.members.cache.get(target.id);
        const guildId = message.guild.id;

        // Fetch configuration and user level data simultaneously
        const [config, userLevel] = await Promise.all([
            getGuildConfig(guildId),
            getUserLevel(target.id, guildId)
        ]);
        
        // Calculate detailed XP progress
        const { currentLevelXp, requiredXp, progress } = getXpProgress(userLevel.xp, userLevel.level);
        
        // --- Create Progress Bar Visual ---
        const barLength = 10;
        const filled = '█'; // Filled block emoji/character
        const empty = '░'; // Empty block emoji/character
        
        const filledSegments = Math.floor(progress / barLength);
        const emptySegments = barLength - filledSegments;
        
        const progressBar = `${filled.repeat(filledSegments)}${empty.repeat(emptySegments)}`;
        
        const xpToNext = requiredXp - currentLevelXp;

        // --- Build Embed ---
        const rankEmbed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setAuthor({ 
                name: `${target.username}'s Rank`, 
                iconURL: target.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(`**Level:** ${userLevel.level} 🏅\n**Total XP:** ${userLevel.xp} ✨`)
            .addFields(
                { 
                    name: `Progress to Level ${userLevel.level + 1}`, 
                    value: `\`[${progressBar}]\` **${progress}%**`,
                    inline: false 
                },
                { 
                    name: 'Current Level XP', 
                    value: `${currentLevelXp} / ${requiredXp}`, 
                    inline: true 
                },
                { 
                    name: 'XP Remaining', 
                    value: `${xpToNext} XP`, 
                    inline: true 
                }
            )
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Server: ${message.guild.name} | XP Rate: ${config.xpRate}x` });

        await message.reply({ embeds: [rankEmbed] });
    },
};