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
        // Ignore bots and DM messages immediately
        if (message.author.bot || !message.guild) return;

        // 2. FETCH CONFIGURATION
        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || ',';

        // --- 3. COMMAND HANDLER SECTION ---
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

            if (command) {
                try {
                    // Administrator check for adminOnly commands
                    if (command.data.adminOnly && !message.member.permissions.has('Administrator')) {
                        return message.reply('❌ This command is restricted to **Administrators**.');
                    }
                    
                    // Execute the command
                    await command.execute(message, args, client, config);
                    
                    // CRITICAL: Stop here so XP logic doesn't trigger on a command message
                    // This prevents the "Double Message" issue
                    return; 
                } catch (error) {
                    console.error(`Command Error (${commandName}):`, error);
                    return; // Stop on error too
                }
            }
        }

        // --- 4. XP & LEVELING SECTION ---
        // This part only runs if the message was NOT a command
        if (!config.levelingEnabled) return;

        // Blacklist Checks
        const blacklistedChannels = config.blacklistedChannels || [];
        const blacklistedRoles = config.blacklistedRoles || [];

        if (blacklistedChannels.includes(message.channel.id)) return;
        if (message.member.roles.cache.some(role => blacklistedRoles.includes(role.id))) return;

        try {
            const userLevel = await getUserLevel(message.author.id, message.guild.id);
            const now = Date.now();
            const cooldown = 60000; // 1 minute cooldown

            const lastMsgTime = userLevel.lastMessage ? new Date(userLevel.lastMessage).getTime() : 0;
            
            if (now - lastMsgTime > cooldown) {
                
                let multiplier = config.xpRate || 1.0;
                if (message.member.premiumSince) multiplier *= 1.5; // Nitro Bonus

                const xpToAdd = Math.floor((Math.random() * 11 + 15) * multiplier);
                
                const oldLevel = userLevel.level;
                userLevel.xp += xpToAdd;
                userLevel.lastMessage = now;

                const newLevel = calculateLevel(userLevel.xp);

                if (newLevel > oldLevel) {
                    userLevel.level = newLevel;
                    await userLevel.save();

                    // Level Up Announcement
                    await LevelingManager.handleLevelUp(message.member, newLevel, config);
                } else {
                    await userLevel.save();
                }
            }
        } catch (error) {
            console.error('XP Processing Error:', error);
        }
    },
};
