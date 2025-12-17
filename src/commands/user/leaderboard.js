/**
 * ==========================================
 * COMMAND: leaderboard
 * DESCRIPTION: Interactive paginated server leaderboard.
 * FEATURES: User fetching, Rank Emojis, "Your Rank" highlight.
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
const { getGuildConfig, getUserLevel } = require('../../utils/database');

// Configuration Constants
const ITEMS_PER_PAGE = 10;
const MAX_FETCH = 100; // Limit for performance

module.exports = {
    data: {
        name: 'leaderboard',
        aliases: ['lb', 'top', 'levels'],
        description: 'Shows the top users in the server by level and XP.',
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
            // We fetch the top 100 users to allow pagination
            const topUsers = await UserLevel.find({ guildId })
                .sort({ level: -1, xp: -1 }) 
                .limit(MAX_FETCH);

            if (!topUsers || topUsers.length === 0) {
                return message.reply('❌ The leaderboard is currently empty. Start chatting to earn XP!');
            }

            // 2. USER RANK FETCHING
            // Find the message author's specific rank in the full list
            const authorData = await UserLevel.findOne({ userId: message.author.id, guildId });
            const allGuildUsers = await UserLevel.find({ guildId }).sort({ level: -1, xp: -1 });
            const authorRank = allGuildUsers.findIndex(u => u.userId === message.author.id) + 1;

            // 3. PAGINATION MATH
            const maxPages = Math.ceil(topUsers.length / ITEMS_PER_PAGE);
            let currentPage = 1;

            // 4. EMBED GENERATION FUNCTION
            const generateEmbed = async (page) => {
                const start = (page - 1) * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                const currentUsers = topUsers.slice(start, end);

                // Build the list strings
                const leaderboardEntries = await Promise.all(currentUsers.map(async (user, index) => {
                    const rank = start + index + 1;
                    
                    // Fetch user from cache or API
                    let userObj = client.users.cache.get(user.userId);
                    if (!userObj) {
                        try {
                            userObj = await client.users.fetch(user.userId);
                        } catch {
                            userObj = null;
                        }
                    }

                    const name = userObj ? userObj.username : `Unknown (${user.userId})`;
                    
                    // Rank Styling
                    let medal = '▪️';
                    if (rank === 1) medal = '🥇';
                    else if (rank === 2) medal = '🥈';
                    else if (rank === 3) medal = '🥉';

                    return `${medal} **#${rank}** \`${name}\`\n╰ Level: **${user.level}** • XP: **${user.xp.toLocaleString()}**`;
                }));

                const description = leaderboardEntries.join('\n\n');

                // CREATE THE EMBED
                const embed = new EmbedBuilder()
                    .setTitle(`🏆 ${message.guild.name} Leaderboard`)
                    // --- CRITICAL FIX: The Fallback Color ---
                    .setColor(config.embedColor || '#6366f1') 
                    .setThumbnail(message.guild.iconURL({ dynamic: true }))
                    .setDescription(description || 'No users found.')
                    .setTimestamp();

                // Add "Your Rank" if the user exists in the database
                if (authorData) {
                    embed.addFields({
                        name: 'Your Position',
                        value: `You are currently **#${authorRank}** with Level **${authorData.level}**`
                    });
                }

                embed.setFooter({ 
                    text: `Page ${page} of ${maxPages} • Total Players: ${topUsers.length}` 
                });

                return embed;
            };

            // 5. BUTTON GENERATION FUNCTION
            const createButtons = (page) => {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_prev')
                        .setLabel('Previous')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId('lb_next')
                        .setLabel('Next')
                        .setEmoji('➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === maxPages)
                );
                return row;
            };

            // 6. INITIAL SEND
            const initialEmbed = await generateEmbed(currentPage);
            const msg = await message.reply({
                embeds: [initialEmbed],
                components: maxPages > 1 ? [createButtons(currentPage)] : []
            });

            if (maxPages <= 1) return;

            // 7. INTERACTION COLLECTOR
            const collector = msg.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                componentType: ComponentType.Button,
                time: 120000 // 2 minutes
            });

            collector.on('collect', async (interaction) => {
                // Update page number
                if (interaction.customId === 'lb_prev') {
                    if (currentPage > 1) currentPage--;
                } else if (interaction.customId === 'lb_next') {
                    if (currentPage < maxPages) currentPage++;
                }

                // Edit the original message
                const newEmbed = await generateEmbed(currentPage);
                await interaction.update({
                    embeds: [newEmbed],
                    components: [createButtons(currentPage)]
                });
            });

            collector.on('end', async () => {
                // Disable buttons after timeout to prevent errors
                const finalRow = createButtons(currentPage);
                finalRow.components.forEach(btn => btn.setDisabled(true));
                
                await msg.edit({ components: [finalRow] }).catch(() => null);
            });

        } catch (error) {
            console.error('LEADERBOARD_EXECUTION_ERROR:', error);
            message.reply('❌ An error occurred while generating the leaderboard.');
        }
    }
};
