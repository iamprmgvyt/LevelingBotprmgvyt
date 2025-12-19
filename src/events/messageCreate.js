const GuildConfig = require('../models/GuildConfig');
const UserLevel = require('../models/UserLevel');
const { calculateLevel } = require('../utils/xpCalculator');
const LevelingManager = require('../utils/LevelingManager');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. SECURITY FILTERS
        // Ignore bots and DM messages to prevent errors and loops
        if (message.author.bot || !message.guild) return;

        try {
            // 2. FETCH SERVER CONFIGURATION
            // This ensures the bot "remembers" the prefix set on the dashboard
            let config = await GuildConfig.findOne({ guildId: message.guild.id });
            if (!config) {
                // Create default config if it doesn't exist yet
                config = await GuildConfig.create({ guildId: message.guild.id, prefix: ',' });
            }

            const prefix = config.prefix || ',';

            // 3. COMMAND HANDLER SECTION
            if (message.content.startsWith(prefix)) {
                const args = message.content.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();

                // Find the command by name or alias
                const command = client.commands.get(commandName) || 
                                client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

                if (command) {
                    // Check for Admin-only commands
                    if (command.data.adminOnly && !message.member.permissions.has('Administrator')) {
                        return message.reply('❌ This command is restricted to **Administrators**.');
                    }

                    // Execute the command
                    await command.execute(message, args, client, config);

                    // IMPORTANT: We return here so the XP logic below does NOT run for commands.
                    // This prevents the "Double Message" bug.
                    return;
                }
            }

            // 4. XP & LEVELING SECTION
            // Only run if leveling is enabled in the dashboard settings
            if (!config.levelingEnabled) return;

            // Optional: Check for blacklisted channels/roles here if you added them to your schema
            
            const userId = message.author.id;
            const guildId = message.guild.id;

            // Find or Create User Data
            let userLevel = await UserLevel.findOne({ userId, guildId });
            if (!userLevel) {
                userLevel = new UserLevel({ userId, guildId, xp: 0, level: 0 });
            }

            // XP Cooldown Logic (Prevent spamming)
            const now = Date.now();
            const cooldown = 60000; // 1 minute
            const lastMsgTime = userLevel.lastMessage ? new Date(userLevel.lastMessage).getTime() : 0;

            if (now - lastMsgTime > cooldown) {
                // Calculate XP to add (random between 15-25) multiplied by your dashboard rate
                const baseXP = Math.floor(Math.random() * 11) + 15;
                const multiplier = config.xpRate || 1.0;
                const xpToAdd = Math.floor(baseXP * multiplier);

                const oldLevel = userLevel.level;
                userLevel.xp += xpToAdd;
                userLevel.lastMessage = now;

                // Determine if they reached a new level
                const newLevel = calculateLevel(userLevel.xp);

                if (newLevel > oldLevel) {
                    userLevel.level = newLevel;
                    await userLevel.save();

                    // Send the Level Up announcement (Image or Text)
                    await LevelingManager.handleLevelUp(message.member, newLevel, config);
                } else {
                    await userLevel.save();
                }
            }

        } catch (error) {
            console.error('CRITICAL ERROR in messageCreate:', error);
        }
    },
};
