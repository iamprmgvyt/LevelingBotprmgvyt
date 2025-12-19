const GuildConfig = require('../models/GuildConfig');
const UserLevel = require('../models/UserLevel');
const { calculateLevel } = require('../utils/xpCalculator');
const LevelingManager = require('../utils/LevelingManager');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Filter out bots and DM messages
        if (message.author.bot || !message.guild) return;

        try {
            // 2. LIVE CONFIG FETCH
            // This ensures that if you change the prefix on the web, 
            // the bot responds to the NEW prefix immediately.
            let config = await GuildConfig.findOne({ guildId: message.guild.id });
            
            // If the server has no config in the DB yet, default to ','
            const prefix = config ? config.prefix : ',';

            // 3. COMMAND HANDLER
            if (message.content.startsWith(prefix)) {
                const args = message.content.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();

                const command = client.commands.get(commandName) || 
                                client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

                if (command) {
                    // Check for Admin-only commands
                    if (command.data.adminOnly && !message.member.permissions.has('Administrator')) {
                        return message.reply('❌ This command requires **Administrator** permissions.');
                    }

                    // Run the command and STOP (so we don't give XP for a command)
                    await command.execute(message, args, client, config);
                    return; 
                }
            }

            // 4. XP & LEVELING SYSTEM
            // Don't give XP if leveling is disabled on the dashboard
            if (config && !config.levelingEnabled) return;

            const userId = message.author.id;
            const guildId = message.guild.id;

            let userLevel = await UserLevel.findOne({ userId, guildId });
            if (!userLevel) {
                userLevel = new UserLevel({ userId, guildId, xp: 0, level: 0 });
            }

            // 1-minute XP cooldown
            const now = Date.now();
            const lastMsgTime = userLevel.lastMessage ? new Date(userLevel.lastMessage).getTime() : 0;

            if (now - lastMsgTime > 60000) {
                const multiplier = config ? config.xpRate : 1.0;
                const xpToAdd = Math.floor((Math.random() * 11 + 15) * multiplier);
                
                const oldLevel = userLevel.level;
                userLevel.xp += xpToAdd;
                userLevel.lastMessage = now;

                const newLevel = calculateLevel(userLevel.xp);

                if (newLevel > oldLevel) {
                    userLevel.level = newLevel;
                    await userLevel.save();
                    await LevelingManager.handleLevelUp(message.member, newLevel, config);
                } else {
                    await userLevel.save();
                }
            }
        } catch (error) {
            console.error('Error in messageCreate:', error);
        }
    }
};
