const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { totalXpRequiredForLevel } = require('./xpCalculator');
const UserLevel = require('../models/UserLevel');
const { createCanvas, loadImage } = require('canvas');

/**
 * --- Level Up Image Generation ---
 * Generates a simple level-up image banner using the 'canvas' library.
 * @param {GuildMember} member - The member who leveled up.
 * @param {number} newLevel - The new level.
 * @returns {Promise<AttachmentBuilder>} A promise that resolves to the Discord AttachmentBuilder.
 */
async function generateLevelUpImage(member, newLevel) {
    const width = 700;
    const height = 250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background (Dark color for contrast)
    ctx.fillStyle = '#1e2025';
    ctx.fillRect(0, 0, width, height);

    // 2. Load and Draw Avatar
    try {
        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 128 }));
        
        // Draw rounded avatar circle
        ctx.beginPath();
        ctx.arc(100, 125, 75, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 25, 50, 150, 150);
        
        // Reset clipping
        canvas.width = width; 
    } catch (e) {
        console.error("Could not load user avatar for canvas:", e);
    }

    // 3. Draw Text
    ctx.fillStyle = '#ffffff';
    
    // Level Up Title
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('LEVEL UP!', 200, 90);

    // Level Number
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#2ecc71'; // Green color for level
    ctx.fillText(`Reached Level ${newLevel}`, 200, 150);

    // User Tag
    ctx.font = '25px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(member.user.tag, 200, 185);

    // 4. Return as Attachment
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'level-up.png' });
    return attachment;
}
// ----------------------------------------------------


/**
 * Handles all level-up related database and Discord actions: 
 * announcements, role rewards, and user resets.
 */
class LevelingManager {

    /**
     * Announces the level up in the configured channel, including a custom image and emojis.
     * @param {GuildMember} member - The member who leveled up.
     * @param {number} newLevel - The new level.
     * @param {object} config - The guild configuration object.
     */
    static async handleLevelUpAnnouncement(member, newLevel, config) {
        if (!config.levelupChannelId) return;

        const channel = member.guild.channels.cache.get(config.levelupChannelId);
        if (!channel) return;

        // Generate the custom level-up image attachment
        const attachment = await generateLevelUpImage(member, newLevel);
        
        const messageContent = config.levelupMessage
            .replace('{user}', member.toString())
            .replace('{level}', newLevel);

        // --- UPDATED: Embed with Emojis ---
        const xpForNextLevel = totalXpRequiredForLevel(newLevel);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('🌟 Level Up Success! 🥳')
            .setDescription(`**${messageContent}**\n\n🎉 You've unlocked new potential! Check your rank with \`,rank\`.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true })) // Keep a small thumbnail too
            .setImage('attachment://level-up.png') // Reference the attached image
            .addFields({
                name: '📈 Next Challenge',
                value: `Reach **${xpForNextLevel} total XP** to hit **Level ${newLevel + 1}**!`,
                inline: true
            })
            .setFooter({ 
                text: `Bot by Gemini | Rank Up!`, 
                iconURL: member.guild.iconURL({ dynamic: true }) 
            })
            .setTimestamp();
        // ----------------------------------

        try {
            await channel.send({ 
                content: member.toString(), 
                embeds: [embed],
                files: [attachment] // Send the image file
            });
        } catch (error) {
            console.error(`Error sending level-up message in guild ${member.guild.id}:`, error);
        }
    }

    /**
     * Manages giving and removing level-up role rewards based on guild configuration.
     * @param {GuildMember} member - The member who leveled up.
     * @param {number} newLevel - The new level.
     * @param {object} config - The guild configuration object.
     */
    static async handleRoleRewards(member, newLevel, config) {
        if (!config.roleRewards || config.roleRewards.length === 0) return;

        const newReward = config.roleRewards.find(r => r.level === newLevel);

        if (newReward) {
            const role = member.guild.roles.cache.get(newReward.roleId);
            if (role) {
                try {
                    // Find and remove previous reward roles (levels < newLevel)
                    const previousRewards = config.roleRewards.filter(r => r.level < newLevel);
                    const rolesToRemove = previousRewards
                        .map(r => r.roleId)
                        .filter(id => member.roles.cache.has(id));
                    
                    if (rolesToRemove.length > 0) {
                        // Ensure the bot has permissions and the role is not higher than the bot's highest role
                        await member.roles.remove(rolesToRemove, `Level up to ${newLevel} - removing previous level roles.`);
                    }

                    // Add the new reward role
                    if (!member.roles.cache.has(role.id)) {
                        await member.roles.add(role, `Level up to ${newLevel}`);
                    }
                } catch (error) {
                    console.error(`Error managing level role rewards for ${member.user.tag}:`, error);
                }
            }
        }
    }

    /**
     * Resets a user's XP and Level in the database.
     * @param {string} userId - The user's ID.
     * @param {string} guildId - The guild's ID.
     */
    static async resetUserLevel(userId, guildId) {
        const userLevel = await UserLevel.findOne({ userId, guildId });
        if (userLevel) {
            userLevel.level = 0;
            userLevel.xp = 0;
            userLevel.lastMessage = new Date(0); // Reset cooldown
            await userLevel.save();
        }
    }
}

module.exports = LevelingManager;