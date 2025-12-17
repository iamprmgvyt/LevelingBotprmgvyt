const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { totalXpRequiredForLevel } = require('./xpCalculator');
const UserLevel = require('../models/UserLevel');
const { createCanvas, loadImage } = require('canvas');

/**
 * Generates a high-quality level-up image banner.
 */
async function generateLevelUpImage(member, newLevel) {
    const width = 700;
    const height = 250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background
    ctx.fillStyle = '#1e2025';
    ctx.fillRect(0, 0, width, height);

    // 2. Avatar Drawing Logic
    try {
        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarURL);
        
        ctx.save(); // Save state for clipping
        ctx.beginPath();
        ctx.arc(100, 125, 75, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 25, 50, 150, 150);
        ctx.restore(); // Restore to remove clipping for text
    } catch (e) {
        console.error("Canvas Avatar Load Error:", e);
    }

    // 3. Text & Styling
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('LEVEL UP!', 200, 90);

    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#2ecc71'; 
    ctx.fillText(`Reached Level ${newLevel}`, 200, 150);

    ctx.font = '25px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(member.user.tag, 200, 185);

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
        if (!config.levelChannelId) return;

        const channel = member.guild.channels.cache.get(config.levelChannelId);
        if (!channel) return;

        const attachment = await generateLevelUpImage(member, newLevel);
        const xpForNextLevel = totalXpRequiredForLevel(newLevel + 1);
        
        const messageContent = (config.levelMessage || 'GG {user}, you reached **Level {level}**!')
            .replace('{user}', member.toString())
            .replace('{level}', newLevel);

        const embed = new EmbedBuilder()
            .setColor(config.embedColor || '#0099ff')
            .setTitle('🌟 Level Up Success! 🥳')
            .setDescription(`**${messageContent}**\n\n🎉 You've unlocked new potential!`)
            .setImage('attachment://level-up.png')
            .addFields({
                name: '📈 Next Challenge',
                value: `Reach **Level ${newLevel + 1}** at **${xpForNextLevel} total XP**!`,
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
                    // Remove old rewards first (Role Removal Logic)
                    const oldRewards = rewards.filter(r => r.level < newLevel);
                    for (const old of oldRewards) {
                        if (member.roles.cache.has(old.roleId)) {
                            await member.roles.remove(old.roleId, 'Removing lower level reward.');
                        }
                    }
                    // Add new reward
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

module.exports = LevelingManager;
