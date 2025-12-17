/**
 * STABILITY VERSION: Level Command
 * Optimized for Render/Linux environments.
 */
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');
const UserLevel = require('../../models/UserLevel');

module.exports = {
    data: {
        name: 'level',
        aliases: ['rank', 'lvl'],
        description: 'Check your current XP and Level.'
    },

    async execute(message, args, client, config) {
        const targetMember = message.mentions.members.first() || message.member;

        try {
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            const progressData = getXpProgress(userLevel.xp, userLevel.level);
            
            const allUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const rank = allUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // 1. CANVAS INITIALIZATION
            const canvas = createCanvas(900, 270);
            const ctx = canvas.getContext('2d');

            // 2. DRAW BACKGROUND (Must be first)
            ctx.fillStyle = '#111214'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const themeColor = config.embedColor || '#00d2ff';

            // 3. DRAW TEXT (Using 'serif' as it is a safe fallback on Linux)
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            
            // Username
            ctx.font = 'bold 42px serif';
            ctx.fillText(targetMember.user.username.toUpperCase(), 280, 85);

            // Level & Rank Info
            ctx.font = '30px serif';
            ctx.fillText(`LEVEL ${userLevel.level}  |  RANK #${rank}`, 280, 135);

            // XP Details
            ctx.font = '22px serif';
            const xpInfo = `${userLevel.xp.toLocaleString()} / ${progressData.requiredXp.toLocaleString()} XP (${progressData.progress}%)`;
            ctx.fillText(xpInfo, 280, 250);

            // 4. PROGRESS BAR
            // Background bar
            ctx.fillStyle = '#2C2F33';
            ctx.fillRect(280, 180, 580, 45);

            // Progress fill
            ctx.fillStyle = themeColor;
            const fillWidth = (progressData.progress / 100) * 580;
            ctx.fillRect(280, 180, Math.max(fillWidth, 5), 45);

            // 5. AVATAR
            try {
                const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png', size: 256 }));
                
                // Draw a colored frame
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 10;
                ctx.strokeRect(45, 40, 190, 190);
                
                // Draw the avatar inside the frame
                ctx.drawImage(avatar, 45, 40, 190, 190);
            } catch (e) {
                // If avatar fails, draw a theme box
                ctx.fillStyle = themeColor;
                ctx.fillRect(45, 40, 190, 190);
            }

            const buffer = canvas.toBuffer();
            const attachment = new AttachmentBuilder(buffer, { name: 'rank-card.png' });

            return await message.reply({ 
                content: `📊 **Rank Statistics for ${targetMember.user.username}**`, 
                files: [attachment] 
            });

        } catch (error) {
            console.error('CRITICAL DRAWING ERROR:', error);
            message.reply("❌ There was a system error rendering your image.");
        }
    }
};
