const { getGuildConfig, getUserLevel } = require('../utils/database');
const { calculateLevel } = require('../utils/xpCalculator');
const LevelingManager = require('../utils/LevelingManager');

module.exports = {
    name: 'messageCreate',
    /**
     * @param {Message} message 
     * @param {Client} client 
     */
    async execute(message, client) {
        // Ignore bots and DM messages
        if (message.author.bot || !message.guild) return;

        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || ',';

        // --- 1. HANDLE COMMANDS ---
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = client.commands.get(commandName);

            if (command) {
                try {
                    // Check if command is admin-only
                    if (command.data.adminOnly && !message.member.permissions.has('Administrator')) {
                        return message.reply('❌ This command is for Administrators only.');
                    }
                    return await command.execute(message, args, client);
                } catch (error) {
                    console.error(`Error executing command ${commandName}:`, error);
                    return message.reply('❌ There was an error executing that command.');
                }
            }
        }

        // --- 2. XP SYSTEM LOGIC ---
        if (!config.levelingEnabled) return;

        // Check if channel is blacklisted
        if (config.blacklistedChannels.includes(message.channel.id)) return;

        // Check if user has a blacklisted role
        const hasBlacklistedRole = message.member.roles.cache.some(role => 
            config.blacklistedRoles.includes(role.id)
        );
        if (hasBlacklistedRole) return;

        try {
            const userLevel = await getUserLevel(message.author.id, message.guild.id);
            const now = Date.now();
            const cooldown = 60000; // 1 minute cooldown between XP gains

            // Only give XP if cooldown has passed
            if (now - userLevel.lastMessage.getTime() > cooldown) {
                
                // Calculate Multipliers
                let multiplier = config.xpRate || 1.0;

                // Nitro Booster Bonus (1.5x)
                if (message.member.premiumSince) {
                    multiplier *= 1.5;
                }

                // VIP/Staff Role Bonus (1.2x) - Replace with your actual Role ID or load from config
                const vipRoleId = 'YOUR_VIP_ROLE_ID_HERE'; 
                if (message.member.roles.cache.has(vipRoleId)) {
                    multiplier *= 1.2;
                }

                // Random XP between 15-25, multiplied by rate
                const xpToAdd = Math.floor((Math.random() * 11 + 15) * multiplier);
                
                const oldLevel = userLevel.level;
                userLevel.xp += xpToAdd;
                userLevel.lastMessage = new Date(now);

                // Check for Level Up
                const newLevel = calculateLevel(userLevel.xp);

                if (newLevel > oldLevel) {
                    userLevel.level = newLevel;
                    // Trigger the LevelingManager (Canvas Image + Role Rewards)
                    await LevelingManager.handleLevelUp(message.member, newLevel, config);
                }

                await userLevel.save();
            }
        } catch (error) {
            console.error('Error in XP processing:', error);
        }
    },
};
