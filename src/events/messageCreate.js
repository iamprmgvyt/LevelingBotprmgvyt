const { getGuildConfig, getUserLevel } = require('../utils/database');
const { getRandomXp, getLevelFromXp } = require('../utils/xpCalculator');
const LevelingManager = require('../utils/LevelingManager');
const { PermissionsBitField } = require('discord.js');

const EXP_COOLDOWN = 60000; // 60 seconds cooldown for XP gain

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || process.env.BOT_PREFIX || ',';

        // --- 1. Prefix Command Handler ---
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = client.commands.get(commandName);

            if (!command) return;

            // Simple permission check (admin only)
            if (command.data.adminOnly && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply('❌ You must be an **Administrator** to use this command.');
            }
            
            try {
                await command.execute(message, args, client);
            } catch (error) {
                console.error(`Error executing command ${commandName}:`, error);
                message.reply('There was an error trying to execute that command!');
            }
            return; 
        }

        // --- 2. XP & Leveling System ---
        if (!config.levelingEnabled) return;

        // Blacklist checks
        if (config.blacklistedChannels.includes(message.channel.id) || 
            message.member.roles.cache.some(role => config.blacklistedRoles.includes(role.id))) {
            return;
        }

        const userLevel = await getUserLevel(message.author.id, message.guild.id);

        // Anti-spam Cooldown Check
        const now = Date.now();
        if (now - userLevel.lastMessage < EXP_COOLDOWN) {
            return;
        }

        // Gain XP
        const xpGain = Math.floor(getRandomXp() * config.xpRate);
        const oldLevel = userLevel.level;
        userLevel.xp += xpGain;
        userLevel.lastMessage = now;
        
        // Check for Level Up
        const newLevel = getLevelFromXp(userLevel.xp);
        
        if (newLevel > oldLevel) {
            userLevel.level = newLevel;

            await LevelingManager.handleLevelUpAnnouncement(message.member, newLevel, config);
            await LevelingManager.handleRoleRewards(message.member, newLevel, config);
        }

        await userLevel.save();
    },
};