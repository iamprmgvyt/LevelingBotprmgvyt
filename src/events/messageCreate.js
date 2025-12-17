const { getGuildConfig, getUserLevel } = require('../utils/database');
const { calculateLevel } = require('../utils/xpCalculator');
const LevelingManager = require('../utils/LevelingManager');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. SYSTEM FILTERS
        if (message.author.bot || !message.guild) return;

        // 2. FETCH CONFIGURATION
        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || '?'; 

        // --- 3. COMMAND HANDLER SECTION ---
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

            if (command) {
                try {
                    // Check Admin Permissions
                    if (command.data.adminOnly && !message.member.permissions.has('Administrator')) {
                        return message.reply('❌ Administrators only.');
                    }
                    
                    await command.execute(message, args, client, config);
                    
                    // CRITICAL: Stop everything here so XP logic doesn't run
                    return; 
                } catch (error) {
                    console.error(`Command Error:`, error);
                    return;
                }
            }
        }

        // --- 4. XP & LEVELING SECTION ---
        if (!config.levelingEnabled) return;

        try {
            const userLevel = await getUserLevel(message.author.id, message.guild.id);
            const now = Date.now();
            const lastMsgTime = userLevel.lastMessage ? new Date(userLevel.lastMessage).getTime() : 0;
            
            if (now - lastMsgTime > 60000) { // 1 minute cooldown
                let multiplier = config.xpRate || 1.0;
                const xpToAdd = Math.floor((Math.random() * 11 + 15) * multiplier);
                
                const oldLevel = userLevel.level;
                userLevel.xp += xpToAdd;
                userLevel.lastMessage = now;

                const newLevel = calculateLevel(userLevel.xp);

                if (newLevel > oldLevel) {
                    userLevel.level = newLevel;
                    await userLevel.save();
                    // Announce Level Up
                    await LevelingManager.handleLevelUp(message.member, newLevel, config);
                } else {
                    await userLevel.save();
                }
            }
        } catch (err) {
            console.error('XP Error:', err);
        }
    },
};
