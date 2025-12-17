/**
 * ==========================================
 * EVENT: messageCreate
 * DESCRIPTION: Handles commands and XP leveling logic.
 * FIXES: Double-message generation and command conflicts.
 * ==========================================
 */

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
        // 1. SYSTEM FILTERS
        // Immediately ignore bots and messages outside of servers (DMs)
        if (message.author.bot || !message.guild) return;

        // 2. FETCH SERVER CONFIGURATION
        // Get prefix, leveling status, and custom colors
        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || ',';

        // --- 3. COMMAND HANDLER SECTION ---
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Find command by name or alias
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

            if (command) {
                try {
                    // Check for Admin-Only restriction
                    if (command.data.adminOnly && !message.member.permissions.has('Administrator')) {
                        return message.reply('❌ This command is restricted to **Administrators**.');
                    }
                    
                    // Execute the command code
                    await command.execute(message, args, client, config);
                    
                    /**
                     * CRITICAL FIX: The 'return' below stops the code from continuing.
                     * This prevents the bot from giving you XP for the command message,
                     * which is what causes the "double generation" of rank cards.
                     */
                    return; 
                } catch (error) {
                    console.error(`[Command Error] ${commandName}:`, error);
                    return; 
                }
            }
        }

        // --- 4. XP & LEVELING SECTION ---
        // This section only runs if the message was NOT a command
        if (!config.levelingEnabled) return;

        // Blacklist Checks (Channels and Roles)
        const blacklistedChannels = config.blacklistedChannels || [];
        const blacklistedRoles = config.blacklistedRoles || [];

        if (blacklistedChannels.includes(message.channel.id)) return;
        if (message.member.roles.cache.some(role => blacklistedRoles.includes(role.id))) return;

        try {
            // Fetch user data from database
            const userLevel = await getUserLevel(message.author.id, message.guild.id);
            const now = Date.now();
            const cooldown = 60000; // 1 minute cooldown to prevent spam

            // Check if the user is on cooldown
            const lastMsgTime = userLevel.lastMessage ? new Date(userLevel.lastMessage).getTime() : 0;
            
            if (now - lastMsgTime > cooldown) {
                
                // Calculate multipliers (e.g., Server Boosters get more XP)
                let multiplier = config.xpRate || 1.0;
                if (message.member.premiumSince) multiplier *= 1.5;

                // Generate random XP (15-25 range)
                const xpToAdd = Math.floor((Math.random() * 11 + 15) * multiplier);
                
                const oldLevel = userLevel.level;
                userLevel.xp += xpToAdd;
                userLevel.lastMessage = now;

                // Calculate if user reached a new level
                const newLevel = calculateLevel(userLevel.xp);

                if (newLevel > oldLevel) {
                    userLevel.level = newLevel;
                    
                    // Save to DB before announcing to ensure data consistency
                    await userLevel.save();

                    // Trigger Level-Up Announcement and Role Rewards
                    await LevelingManager.handleLevelUp(message.member, newLevel, config);
                } else {
                    // Just save the new XP
                    await userLevel.save();
                }
            }
        } catch (error) {
            console.error('[XP Processing Error]:', error);
        }
    },
};
