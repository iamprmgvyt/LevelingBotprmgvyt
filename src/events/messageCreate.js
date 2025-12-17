const { getGuildConfig, getUserLevel } = require('../utils/database');
const { calculateLevel } = require('../utils/xpCalculator');
const LevelingManager = require('../utils/LevelingManager');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. SYSTEM FILTERS
        if (message.author.bot || !message.guild) return;

        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || ',';

        // 2. CHECK IF MESSAGE IS A COMMAND
        const isCommand = message.content.startsWith(prefix);

        if (isCommand) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

            if (command) {
                try {
                    await command.execute(message, args, client, config);
                    // --- THE KILL SWITCH ---
                    return; 
                } catch (error) {
                    console.error(error);
                    return;
                }
            }
        }

        // 3. XP LOGIC (Only runs if 'return' was NOT triggered above)
        if (!config.levelingEnabled) return;

        try {
            const userLevel = await getUserLevel(message.author.id, message.guild.id);
            const now = Date.now();
            const lastMsgTime = userLevel.lastMessage ? new Date(userLevel.lastMessage).getTime() : 0;
            
            // 1-minute cooldown
            if (now - lastMsgTime > 60000) {
                const xpToAdd = Math.floor(Math.random() * 11 + 15);
                const oldLevel = userLevel.level;
                
                userLevel.xp += xpToAdd;
                userLevel.lastMessage = now;
                userLevel.level = calculateLevel(userLevel.xp);

                if (userLevel.level > oldLevel) {
                    await userLevel.save();
                    // This is where the 2nd message usually comes from!
                    await LevelingManager.handleLevelUp(message.member, userLevel.level, config);
                } else {
                    await userLevel.save();
                }
            }
        } catch (err) {
            console.error('XP Error:', err);
        }
    },
};
    },
};
