const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');
const UserLevel = require('../../models/UserLevel'); // Needed to calculate rank

module.exports = {
    data: {
        name: 'level',
        description: 'Check your current level with a visual Rank Card.',
        aliases: ['rank', 'lvl']
    },
    async execute(message, args, client, config) {
        const targetMember = message.mentions.members.first() || message.member;
        
        try {
            // 1. Fetch Data
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            const progressData = getXpProgress(userLevel.xp, userLevel.level);
            const themeColor = config.embedColor || '#6366f1';

            // 2. Calculate Global/Server Rank
            const allUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const rank = allUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // 3. Canvas Setup (Higher Resolution)
            const canvas = createCanvas(900, 300);
            const ctx = canvas.getContext('2d');

            // Background - Dark Charcoal
            ctx.fillStyle = '#1a1c21';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 4. Draw Avatar with Glow
            const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png', size: 256 }));
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(150, 150, 105, 0, Math.PI * 2, true);
            ctx.fillStyle = themeColor;
            ctx.fill(); // This creates a colored border/glow

            ctx.beginPath();
            ctx.arc(150, 150, 100, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 50, 50, 200, 200);
            ctx.restore();

            // 5. Draw Text Information
            const textX = 300;
            
            // Username
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 45px sans-serif';
            ctx.fillText(targetMember.user.username, textX, 100);

            // Rank Number (Top Right)
            ctx.textAlign = 'right';
            ctx.fillStyle = themeColor;
            ctx.font = 'bold 40px sans-serif';
            ctx.fillText(`#${rank}`, 850, 100);
            ctx.textAlign = 'left';

            // Level Info
            ctx.fillStyle = '#ffffff';
            ctx.font = '30px sans-serif';
            ctx.fillText(`LEVEL ${userLevel.level}`, textX, 155);

            // XP Percent (Above the bar, right aligned)
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${progressData.progress}%`, 850, 205);
            ctx.textAlign = 'left';

            // 6. Progress Bar
            const barX = textX;
            const barY = 220;
            const barWidth = 550;
            const barHeight = 35;

            // Bar Shadow
            ctx.fillStyle = '#33363b';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(barX, barY, barWidth, barHeight, 20);
            } else {
                ctx.rect(barX, barY, barWidth, barHeight);
            }
            ctx.fill();

            // Bar Fill
            ctx.fillStyle = themeColor;
            const fillWidth = Math.max(35, (progressData.progress / 100) * barWidth);
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(barX, barY, fillWidth, barHeight, 20);
            } else {
                ctx.rect(barX, barY, fillWidth, barHeight);
            }
            ctx.fill();

            // 7. XP Text (Inside or below bar)
            ctx.fillStyle = '#ffffff';
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            const xpString = `${progressData.currentLevelXp.toLocaleString()} / ${progressData.requiredXp.toLocaleString()} XP`;
            ctx.fillText(xpString, barX + (barWidth / 2), barY + 25);

            // Final Attachment
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
            return message.reply({ files: [attachment] });

        } catch (error) {
            console.error('Error in rank card generation:', error);
            message.reply('❌ Could not generate your rank card.');
        }
    }
};
