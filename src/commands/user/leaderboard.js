/**
 * ==========================================
 * COMMAND: leaderboard
 * DESCRIPTION: Professional interactive server leaderboard.
 * FEATURES: Pagination, Rank Emojis, Auto-Color Fallback, Your Rank.
 * ==========================================
 */

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require('discord.js');
const UserLevel = require('../../models/UserLevel');
const { getGuildConfig } = require('../../utils/database');

// Constants for performance and layout
const ITEMS_PER_PAGE = 10;
const MAX_FETCH = 100; 

module.exports = {
    data: {
        name: 'leaderboard',
        aliases: ['lb', 'top'],
        description: 'Shows the top 100 users in the server by level and XP.',
        usage: '[,leaderboard]',
        adminOnly: false
    },

    /**
     * @param {Message} message 
     * @param {string[]} args 
     * @param {Client} client 
     * @param {Object} config
     */
    async execute(message, args, client, config) {
        const guildId = message.guild.id;

        try {
            // 1. DATA FETCHING
            // We fetch the top 100 users sorted by level then XP
            const topUsers = await UserLevel.find({ guildId })
                .sort({ level: -1, xp: -1 }) 
                .limit(MAX_FETCH);

            if (!topUsers || topUsers.length === 0) {
                return message.reply('❌ The leaderboard is currently empty. Start chatting to earn XP!');
            }

            // 2. FETCH PERSONAL RANK
            // We find the index of the message author in the full list
            const allGuildUsers = await UserLevel.find({ guildId }).sort({ level: -1, xp: -1 });
            const authorRank = allGuildUsers.findIndex(u => u.userId === message.author.id) + 1;
            const authorData = allGuildUsers.find(u => u.userId === message.author.id);

            // 3. PAGINATION LOGIC
            const maxPages = Math.ceil(topUsers.length / ITEMS_PER_PAGE);
            let currentPage = 1;

            // 4. EMBED BUILDER FUNCTION
            const generateEmbed = async (page) => {
                const start = (page - 1) * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                const currentUsers = topUsers.slice(start, end);

                // Build the list with medals and formatting
                const leaderboardEntries = await Promise.all(currentUsers.map(async (user, index) => {
                    const rank = start + index + 1;
                    
                    // Fetch user details safely
                    let userObj = client.users.cache.get(user.userId);
                    if (!userObj) {
                        try {
                            userObj = await client.users.fetch(user.userId);
                        } catch {
                            userObj = null;
                        }
                    }

                    const username = userObj ? userObj.username : `User Left (${user.userId})`;
                    
                    // Assign Emojis
                    let medal = '▪️';
                    if (rank === 1) medal = '🥇';
                    else if (rank === 2) medal = '🥈';
                    else if (rank === 3) medal = '🥉';

                    return `${medal} **#${rank}** \`${username}\`\n╰ Level: **${user.level}** • XP: **${user.xp.toLocaleString()}**`;
                }));

                const description = leaderboardEntries.join('\n\n');

                const embed = new EmbedBuilder()
                    .setTitle(`🏆 ${message.guild.name} Leaderboard`)
                    // --- CRITICAL FIX: The Fallback Color ---
                    // This prevents CombinedError (3) if config.embedColor is undefined
                    .setColor(config.embedColor || '#6366f1') 
                    .setThumbnail(message.guild.iconURL({ dynamic: true }))
                    .setDescription(description || 'No data on this page.')
                    .setTimestamp();

                // Add "Your Position" at the bottom
                if (authorData) {
                    embed.addFields({
                        name: '⭐ Your Position',
                        value: `You are currently **#${authorRank}** (Level **${authorData.level}**)`
                    });
                }

                embed.setFooter({ 
                    text: `Page ${page} / ${maxPages} • Top ${topUsers.length} Players` 
                });

                return embed;
            };

            // 5. BUTTONS BUILDER FUNCTION
            const createButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_prev')
                        .setLabel('Previous')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId('lb_next')
                        .setLabel('Next')
                        .setEmoji('➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === maxPages)
                );
            };

            // 6. INITIAL RESPONSE
            const initialEmbed = await generateEmbed(currentPage);
            const msg = await message.reply({
                embeds: [initialEmbed],
                components: maxPages > 1 ? [createButtons(currentPage)] : []
            });

            if (maxPages <= 1) return;

            // 7. COLLECTOR FOR PAGINATION
            const collector = msg.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                componentType: ComponentType.Button,
                time: 60000 // 1 Minute timeout
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'lb_prev') {
                    currentPage--;
                } else if (interaction.customId === 'lb_next') {
                    currentPage++;
                }

                const newEmbed = await generateEmbed(currentPage);
                await interaction.update({
                    embeds: [newEmbed],
                    components: [createButtons(currentPage)]
                });
            });

            collector.on('end', async () => {
                // Disable buttons after timeout
                const disabledRow = createButtons(currentPage);
                disabledRow.components.forEach(btn => btn.setDisabled(true));
                await msg.edit({ components: [disabledRow] }).catch(() => null);
            });

        } catch (error) {
            console.error('LEADERBOARD_ERROR:', error);
            message.reply('❌ An error occurred while generating the leaderboard.');
        }
    }
};
