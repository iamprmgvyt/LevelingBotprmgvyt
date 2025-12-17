/**
 * LEVEL COMMAND - STABILITY VERSION
 * This version uses zero complex shapes to ensure compatibility with Render/Linux.
 * Lines: 150+
 */

const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');
const UserLevel = require('../../models/UserLevel');

module.exports = {
    data: {
        name: 'level',
        description: 'Displays a high-compatibility rank card.',
        aliases: ['rank', 'lvl']
    },
    async execute(message, args, client, config) {
        // Prevent double execution if triggered by another event
        if (message.author.bot) return;

        const targetMember = message.mentions.members.first() || message.member;
        
        try {
            // 1. DATA GATHERING
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            const progressData = getXpProgress(userLevel.xp, userLevel.level);
            
            // Calculate Rank by sorting all users in the guild
            const allUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const rank = allUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // 2. CANVAS CORE SETUP
            // We use a large canvas to ensure text isn't cramped
            const canvas = createCanvas(1000, 350);
            const ctx = canvas.getContext('2d');

            // 3. LAYER: BACKGROUND
            // We fill the entire canvas with a solid color immediately
            ctx.fillStyle = '#0F1012'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 4. LAYER: ACCENT BORDER
            // Adds a 10px theme border to the left side
            const themeColor = config.embedColor || '#00D2FF';
            ctx.fillStyle = themeColor;
            ctx.fillRect(0, 0, 15, canvas.height);

            // 5. LAYER: AVATAR (Safe Mode)
            // We use a square avatar first to ensure it draws, then apply a stroke
            try {
                const avatarUrl = targetMember.user.displayAvatarURL({ extension: 'png', size: 256 });
                const avatarImage = await loadImage(avatarUrl);
                
                // Draw a shadow/glow box for the avatar
                ctx.fillStyle = '#1A1C1E';
                ctx.fillRect(45, 45, 210, 210);
                
                // Draw the actual avatar
                ctx.drawImage(avatarImage, 50, 50, 200, 200);
                
                // Draw a theme-colored frame around the avatar
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 5;
                ctx.strokeRect(50, 50, 200, 200);
            } catch (e) {
                // Fail-safe: Draw a colored box if Discord avatar fails to load
                ctx.fillStyle = themeColor;
                ctx.fillRect(50, 50, 200, 200);
            }

            // 6. LAYER: TEXT RENDERING
            // We use standard fonts and high-contrast colors
            const textLeft = 300;
            
            // USERNAME
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 50px sans-serif';
            ctx.fillText(targetMember.user.username.toUpperCase(), textLeft, 100);

            // LEVEL AND RANK LINE
            ctx.fillStyle = themeColor;
            ctx.font = 'bold 35px sans-serif';
            ctx.fillText(`LEVEL: ${userLevel.level}`, textLeft, 160);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '35px sans-serif';
            // We calculate width to place Rank after Level
            const levelWidth = ctx.measureText(`LEVEL: ${userLevel.level}`).width;
            ctx.fillText(` | RANK: #${rank}`, textLeft + levelWidth + 20, 160);

            // 7. LAYER: PROGRESS BAR (Rectangle Primitive)
            const barX = textLeft;
            const barY = 210;
            const barWidth = 630;
            const barHeight = 50;

            // Bar Background (The Track)
            ctx.fillStyle = '#2C2F33';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Bar Fill (The Progress)
            ctx.fillStyle = themeColor;
            const progressPercent = progressData.progress / 100;
            const fillWidth = barWidth * progressPercent;
            // Ensure at least 5px of fill is visible if they have > 0 XP
            ctx.fillRect(barX, barY, Math.max(fillWidth, 5), barHeight);

            // 8. LAYER: XP LABELS
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '22px sans-serif';
            
            // Current XP (Left side of bar)
            ctx.textAlign = 'left';
            ctx.fillText(`${userLevel.xp.toLocaleString()} TOTAL XP`, barX, 300);

            // Progress XP (Right side of bar)
            ctx.textAlign = 'right';
            const xpNeeded = progressData.requiredXp - progressData.currentLevelXp;
            ctx.fillText(`${progressData.progress}% PROGRESS`, barX + barWidth, 300);

            // 9. LAYER: SERVER FOOTER
            ctx.textAlign = 'right';
            ctx.fillStyle = '#555555';
            ctx.font = '18px sans-serif';
            ctx.fillText(message.guild.name.toUpperCase(), 970, 330);

            // 10. FINAL BUFFER EXPORT
            // We use 'image/png' explicitly for high quality
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: `rank-${targetMember.id}.png` });

            // Ensure we only reply once
            return await message.reply({ 
                content: `📊 **Rank Statistics for ${targetMember.user.username}**`,
                files: [attachment] 
            });

        } catch (error) {
            console.error('LEVEL_COMMAND_ERROR:', error);
            
            // Fallback: If Canvas fails entirely, send a clean Embed
            const { EmbedBuilder } = require('discord.js');
            const fallbackEmbed = new EmbedBuilder()
                .setColor(config.embedColor || '#FF0000')
                .setTitle(`Rank: ${targetMember.user.username}`)
                .setDescription('The image engine is currently restarting. Here are your stats:')
                .addFields(
                    { name: 'Level', value: `${userLevel?.level || 0}`, inline: true },
                    { name: 'Total XP', value: `${userLevel?.xp?.toLocaleString() || 0}`, inline: true }
                );
                
            return message.reply({ embeds: [fallbackEmbed] });
        }
    }
};
