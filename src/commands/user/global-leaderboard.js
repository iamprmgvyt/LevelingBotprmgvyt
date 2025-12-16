const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const UserLevel = require('../../models/UserLevel');
const { getGuildConfig } = require('../../utils/database');

const ITEMS_PER_PAGE = 10;
const MAX_FETCH = 200; // Fetch a larger set globally for better representation

module.exports = {
    data: {
        name: 'global-leaderboard',
        aliases: ['glb'],
        description: 'Shows the top users across all servers the bot is in.',
        usage: '[,global-leaderboard]',
        adminOnly: false
    },
    /**
     * Executes the global leaderboard command with interactive pagination.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        const config = await getGuildConfig(message.guild.id);

        // Fetch top users globally, sorted by level (desc) then xp (desc)
        // NOTE: We do NOT filter by guildId here
        const topUsers = await UserLevel.find({}) 
            .sort({ level: -1, xp: -1 }) // Sort: highest level first, then highest XP
            .limit(MAX_FETCH);

        if (topUsers.length === 0) {
            return message.reply('❌ The global ranking is empty! Start chatting in any server to gain XP.');
        }

        const maxPages = Math.ceil(topUsers.length / ITEMS_PER_PAGE);
        let currentPage = 1;

        // Function to dynamically generate the global leaderboard embed for the current page
        const generateEmbed = (page) => {
            const start = (page - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentUsers = topUsers.slice(start, end);

            const leaderboardText = currentUsers.map((user, index) => {
                const rank = start + index + 1;
                
                // Try to get the user's tag from the client's cache (across all guilds)
                const cachedUser = client.users.cache.get(user.userId);
                const userTag = cachedUser ? cachedUser.tag : `[User ID: ${user.userId}]`;
                
                // Find the guild the user belongs to (optional: can be ignored)
                // const guild = client.guilds.cache.get(user.guildId);
                // const guildName = guild ? ` in ${guild.name}` : '';

                const emoji = rank === 1 ? '👑' : rank === 2 ? '🌟' : rank === 3 ? '💫' : '🌎';

                return `${emoji} **#${rank}** - **${userTag}** (Lvl: ${user.level} | XP: ${user.xp})`;
            }).join('\n');

            return new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle(`🌍 Global Leveling Leaderboard`)
                .setDescription(leaderboardText || 'No users to display on this page.')
                .setFooter({ text: `Page ${page}/${maxPages} | Worldwide Ranking` });
        };

        // Function to create the interactive pagination buttons
        const createButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_glb')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId('next_glb')
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === maxPages)
            );
        };

        // Send initial message
        const msg = await message.reply({ 
            embeds: [generateEmbed(currentPage)], 
            components: maxPages > 1 ? [createButtons(currentPage)] : [] 
        });

        if (maxPages <= 1) return;

        // Collector for handling button interactions
        const filter = i => ['prev_glb', 'next_glb'].includes(i.customId) && i.user.id === message.author.id;
        const collector = msg.createMessageComponentCollector({ 
            filter, 
            componentType: ComponentType.Button,
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'prev_glb' && currentPage > 1) {
                currentPage--;
            } else if (i.customId === 'next_glb' && currentPage < maxPages) {
                currentPage++;
            }

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