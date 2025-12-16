const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const UserLevel = require('../../models/UserLevel');
const { getGuildConfig } = require('../../utils/database');

const ITEMS_PER_PAGE = 10;
const MAX_FETCH = 100; // Limit the database fetch for performance

module.exports = {
    data: {
        name: 'leaderboard',
        aliases: ['lb'],
        description: 'Shows the top 10 users in the server by level and XP.',
        usage: '[,leaderboard]',
        adminOnly: false
    },
    /**
     * Executes the leaderboard command with interactive pagination.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const config = await getGuildConfig(guildId);

        // Fetch top users for this guild, sorted by level (desc) then xp (desc)
        const topUsers = await UserLevel.find({ guildId })
            .sort({ level: -1, xp: -1 }) // Sort: highest level first, then highest XP
            .limit(MAX_FETCH);

        if (topUsers.length === 0) {
            return message.reply('❌ The leaderboard is empty! Start chatting to gain XP.');
        }

        const maxPages = Math.ceil(topUsers.length / ITEMS_PER_PAGE);
        let currentPage = 1;

        // Function to dynamically generate the leaderboard embed for the current page
        const generateEmbed = (page) => {
            const start = (page - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentUsers = topUsers.slice(start, end);

            const leaderboardText = currentUsers.map((user, index) => {
                const rank = start + index + 1;
                // Attempt to get the member's tag, defaulting if they've left
                const member = message.guild.members.cache.get(user.userId);
                const userTag = member ? member.user.tag : `[User Left - ID: ${user.userId}]`;
                
                const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '▪️';

                return `${emoji} **#${rank}** - **${userTag}** (Lvl: ${user.level} | XP: ${user.xp})`;
            }).join('\n');

            return new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle(`🏆 ${message.guild.name} Server Leaderboard`)
                .setDescription(leaderboardText || 'No users to display on this page.')
                .setFooter({ text: `Page ${page}/${maxPages} | Use ,global-leaderboard for worldwide rank.` });
        };

        // Function to create the interactive pagination buttons
        const createButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_lb')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId('next_lb')
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === maxPages)
            );
        };

        // Send initial message
        const msg = await message.reply({ 
            embeds: [generateEmbed(currentPage)], 
            components: maxPages > 1 ? [createButtons(currentPage)] : [] // Only show buttons if multi-page
        });

        if (maxPages <= 1) return;

        // Collector for handling button interactions
        const filter = i => ['prev_lb', 'next_lb'].includes(i.customId) && i.user.id === message.author.id;
        const collector = msg.createMessageComponentCollector({ 
            filter, 
            componentType: ComponentType.Button,
            time: 60000 // 60 seconds timeout
        });

        collector.on('collect', async i => {
            if (i.customId === 'prev_lb' && currentPage > 1) {
                currentPage--;
            } else if (i.customId === 'next_lb' && currentPage < maxPages) {
                currentPage++;
            }

            // Update the message with the new embed and button states
            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [createButtons(currentPage)]
            });
        });

        collector.on('end', () => {
            // Disable buttons after the timeout
            msg.edit({ 
                components: maxPages > 1 ? [createButtons(currentPage).components.map(btn => btn.setDisabled(true))] : [] 
            }).catch(() => {});
        });
    },
};