const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');
const UserLevel = require('../../models/UserLevel');

module.exports = {
    data: {
        name: 'level',
        description: 'Shows your rank card',
        aliases: ['rank', 'lvl']
    },
    async execute(message, args, client, config) {
        const targetMember = message.mentions.members.first() || message.member;

        try {
            // 1. Data Fetching
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            const progressData = getXpProgress(userLevel.xp, userLevel.level);
            
            // Calculate Rank
            const allUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const rankPosition = allUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // 2. Canvas Setup
            const canvas = createCanvas(934, 282);
            const ctx = canvas.getContext('2d');

            // --- DRAWING SECTION ---

            // 3. Background (Dark Gray/Black)
            ctx.fillStyle = '#111214';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 4. Progress Bar Container (The "Track")
            const barX = 260;
            const barY = 180;
            const barWidth = 600;
            const barHeight = 40;

            ctx.fillStyle = '#484b4e'; // Gray background for the bar
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 20);
            ctx.fill();

            // 5. Progress Bar Fill
            const themeColor = config.embedColor || '#6366f1'; // Defaults to Indigo
            ctx.fillStyle = themeColor;
            
            // Ensure width is at least the height for a rounded look even at 0%
            const fillWidth = Math.max(barHeight, (progressData.progress / 100) * barWidth);
            ctx.beginPath();
            ctx.roundRect(barX, barY, fillWidth, barHeight, 20);
            ctx.fill();

            // 6. Text Elements (Drawing in WHITE for visibility)
            ctx.fillStyle = '#FFFFFF';
            
            // Username
            ctx.font = 'bold 42px sans-serif';
            ctx.fillText(targetMember.user.username, barX, 80);

            // Rank & Level (Drawn near the top right)
            ctx.font = 'bold 30px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`RANK #${rankPosition}  |  LEVEL ${userLevel.level}`, 860, 80);

            // XP Numbers (Drawn above the bar)
            ctx.font = '24px sans-serif';
            const xpText = `${progressData.currentLevelXp.toLocaleString()} / ${progressData.requiredXp.toLocaleString()} XP`;
            ctx.fillText(xpText, 860, 165);

            // 7. Avatar (Circle Clip)
            ctx.textAlign = 'left'; // Reset alignment
            try {
                const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png', size: 256 }));
                
                ctx.save();
                ctx.beginPath();
                ctx.arc(130, 141, 90, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 40, 51, 180, 180);
                ctx.restore();

                // Avatar Border
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(130, 141, 90, 0, Math.PI * 2, true);
                ctx.stroke();
            } catch (e) {
                console.error("Avatar Load Failed:", e);
                // Draw a simple circle if avatar fails
                ctx.fillStyle = themeColor;
                ctx.beginPath();
                ctx.arc(130, 141, 90, 0, Math.PI * 2, true);
                ctx.fill();
            }

            // 8. Final Export
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank-card.png' });
            return message.reply({ files: [attachment] });

        } catch (error) {
            console.error('Canvas Error:', error);
            message.reply('❌ Error generating rank card. Make sure the bot has "Attach Files" permissions.');
        }
    }
};
