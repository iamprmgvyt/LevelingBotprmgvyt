const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { totalXpRequiredForLevel } = require('./xpCalculator');
const UserLevel = require('../models/UserLevel');
const { createCanvas, loadImage } = require('canvas');

/**
 * Generates a high-quality level-up image banner.
 */
async function generateLevelUpImage(member, newLevel, config) {
    const width = 700;
    const height = 250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background
    ctx.fillStyle = '#1e2025';
    ctx.fillRect(0, 0, width, height);

    // Add a side accent bar using the bot's theme color
    ctx.fillStyle = config.embedColor || '#2ecc71';
    ctx.fillRect(0, 0, 15, height);

    // 2. Avatar Drawing Logic
    try {
        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarURL);
        
        ctx.save(); 
        ctx.beginPath();
        ctx.arc(125, 125, 80, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 45, 45, 160, 160);
        ctx.restore(); 
    } catch (e) {
        console.error("Canvas Avatar Load Error:", e);
    }

    // 3. Text & Styling
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('LEVEL UP!', 240, 90);

    ctx.font = '40px sans-serif';
    ctx.fillStyle = config.embedColor || '#2ecc71'; 
    ctx.fillText(`Reached Level ${newLevel}`, 240, 150);

    ctx.font = '25px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    // Using username instead of tag for Discord's new naming system
    ctx.fillText(member.user.username, 240, 195);

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'level-up.png' });
}

class LevelingManager {
    /**
     * Main entry point for leveling actions
     */
    static async handleLevelUp(member, newLevel, config) {
        await this.handleLevelUpAnnouncement(member, newLevel, config);
        await this.handleRoleRewards(member, newLevel, config);
    }

    static async handleLevelUpAnnouncement(member, newLevel, config) {
        // Ensure this field name matches your database schema (levelUpChannel)
        const channelId = config.levelUpChannel || config.levelChannelId;
        if (!channelId) return;

        const channel = member.guild.channels.cache.get(channelId);
        if (!channel) return;

        const attachment = await generateLevelUpImage(member, newLevel, config);
        const xpForNextLevel = totalXpRequiredForLevel(newLevel + 1);
        
        const messageContent = (config.levelMessage || 'GG {user}, you reached **Level {level}**!')
            .replace('{user}', member.toString())
            .replace('{level}', newLevel);

        const embed = new EmbedBuilder()
            // FIXED: Safe fallback color to prevent CombinedError
            .setColor(config.embedColor || '#2ecc71')
            .setTitle('🌟 Level Up Success! 🥳')
            .setDescription(`**${messageContent}**\n\n🎉 You've unlocked new potential!`)
            .setImage('attachment://level-up.png')
            .addFields({
                name: '📈 Next Challenge',
                value: `Reach **Level ${newLevel + 1}** at **${xpForNextLevel.toLocaleString()} total XP**!`,
                inline: true
            })
            .setFooter({ text: `Server Leveling System`, iconURL: member.guild.iconURL() })
            .setTimestamp();

        try {
            await channel.send({ 
                content: member.toString(), 
                embeds: [embed], 
                files: [attachment] 
            });
        } catch (error) {
            console.error("Announcement Error:", error);
        }
    }

    static async handleRoleRewards(member, newLevel, config) {
        if (!config.roleRewards || config.roleRewards.length === 0) return;

        const rewards = [...config.roleRewards].sort((a, b) => b.level - a.level);
        const currentReward = rewards.find(r => r.level === newLevel);

        if (currentReward) {
            const roleToAdd = member.guild.roles.cache.get(currentReward.roleId);
            if (roleToAdd) {
                try {
                    // Logic to stack roles or remove old ones
                    const oldRewards = rewards.filter(r => r.level < newLevel);
                    for (const old of oldRewards) {
                        if (member.roles.cache.has(old.roleId)) {
                            await member.roles.remove(old.roleId, 'Removing lower level reward.');
                        }
                    }
                    await member.roles.add(roleToAdd, `Reached Level ${newLevel}`);
                } catch (err) {
                    console.error("Role Reward Error:", err);
                }
            }
        }
    }

    static async resetUserLevel(userId, guildId) {
        await UserLevel.findOneAndUpdate(
            { userId, guildId },
            { xp: 0, level: 0, lastDaily: null },
            { upsert: true }
        );
    }
}

module.exports = LevelingManager;
