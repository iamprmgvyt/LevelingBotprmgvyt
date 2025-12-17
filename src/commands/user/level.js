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
            
            const allUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const rankPosition = allUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // 2. Canvas Setup
            const canvas = createCanvas(934, 282);
            const ctx = canvas.getContext('2d');

            // --- CRITICAL FIX: FORCE BACKGROUND FIRST ---
            ctx.fillStyle = '#111214'; // Dark background
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 3. Draw Progress Bar Track
            const barX = 260;
            const barY = 180;
            const barWidth = 600;
            const barHeight = 40;

            ctx.fillStyle = '#333639'; // Gray track
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // 4. Draw Progress Bar Fill
            const themeColor = config.embedColor || '#6366f1';
            ctx.fillStyle = themeColor;
            const fillWidth = (progressData.progress / 100) * barWidth;
            ctx.fillRect(barX, barY, fillWidth, barHeight);

            // 5. Draw Text (Using 'serif' as it's the most common Linux fallback)
            ctx.fillStyle = '#FFFFFF'; // White text
            
            // Username
            ctx.font = '40px serif';
            ctx.fillText(targetMember.user.username.toUpperCase(), barX, 80);

            // Rank & Level
            ctx.font = '30px serif';
            ctx.fillText(`RANK: #${rankPosition} | LEVEL: ${userLevel.level}`, barX, 130);

            // XP Details
            ctx.font = '20px serif';
            const xpString = `${progressData.currentLevelXp.toLocaleString()} / ${progressData.requiredXp.toLocaleString()} XP (${progressData.progress}%)`;
            ctx.fillText(xpString, barX, 245);

            // 6. Draw Avatar
            try {
                const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png', size: 256 }));
                ctx.drawImage(avatar, 40, 50, 180, 180);
                
                // Optional Border
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 8;
                ctx.strokeRect(40, 50, 180, 180);
            } catch (e) {
                // If avatar fails, draw a colored box so it's not empty
                ctx.fillStyle = themeColor;
                ctx.fillRect(40, 50, 180, 180);
            }

            // 7. Final Buffer Generation
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });

            return message.reply({ files: [attachment] });

        } catch (error) {
            console.error('Canvas Generation Error:', error);
            message.reply('❌ The image engine failed. Try again in a moment.');
        }
    }
};
