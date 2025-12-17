const { getGuildConfig, getUserLevel } = require('../utils/database');
const { calculateLevel } = require('../utils/xpCalculator');
const LevelingManager = require('../utils/LevelingManager');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Filter out bots and DM messages
        if (message.author.bot || !message.guild) return;

        // 2. Fetch Guild Configuration
        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || ',';

        // --- SECTION A: COMMAND HANDLER ---
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

            if (command) {
                try {
                    // Check for Admin-only commands
                    if (command.data.adminOnly && !message.member.permissions.has('Administrator')) {
                        return message.reply('❌ This command requires **Administrator** permissions.');
                    }
                    
                    // Execute the command
                    await command.execute(message, args, client, config);
                    
                    /** * STABILITY FIX: We return here so the XP logic below 
                     * NEVER runs for a command message. This stops double-posting.
                     */
                    return; 
                } catch (error) {
                    console.error(`Command Execution Error [${commandName}]:`, error);
                    return;
                }
            }
        }

        // --- SECTION B: XP & LEVELING SYSTEM ---
        // This part only executes if the message was NOT a command
        if (!config.levelingEnabled) return;

        // Check for blacklisted channels or roles
        const isBlacklistedChannel = config.blacklistedChannels?.includes(message.channel.id);
        const hasBlacklistedRole = message.member.roles.cache.some(role => config.blacklistedRoles?.includes(role.id));

        if (isBlacklistedChannel || hasBlacklistedRole) return;

        try {
            const userLevel = await getUserLevel(message.author.id, message.guild.id);
            const now = Date.now();
            const cooldown = 60000; // 1 minute XP cooldown

            const lastMsgTime = userLevel.lastMessage ? new Date(userLevel.lastMessage).getTime() : 0;
            
            if (now - lastMsgTime > cooldown) {
                // Apply XP Multipliers (Standard 1.0 or custom rate)
                let multiplier = config.xpRate || 1.0;
                const xpToAdd = Math.floor((Math.random() * 11 + 15) * multiplier);
                
                const oldLevel = userLevel.level;
                userLevel.xp += xpToAdd;
                userLevel.lastMessage = now;

                // Check if the user leveled up
                const newLevel = calculateLevel(userLevel.xp);

                if (newLevel > oldLevel) {
                    userLevel.level = newLevel;
                    await userLevel.save();

                    // Send level-up announcement via the Manager
                    await LevelingManager.handleLevelUp(message.member, newLevel, config);
                } else {
                    // Just save the new XP amount
                    await userLevel.save();
                }
            }
        } catch (error) {
            console.error('XP Processing Error:', error);
        }
    },
};
