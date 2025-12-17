const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');
const UserLevel = require('../../models/UserLevel');

// Path: src/commands/user/level.js
module.exports = {
    data: {
        name: 'level',
        description: 'Check your current rank with a working visual card.',
        aliases: ['rank', 'lvl']
    },
    async execute(message, args, client, config) {
        const targetMember = message.mentions.members.first() || message.member;

        try {
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            const progressData = getXpProgress(userLevel.xp, userLevel.level);
            
            const allUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const rank = allUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // CANVAS SETUP
            const canvas = createCanvas(900, 270);
            const ctx = canvas.getContext('2d');

            // 1. BASE BACKGROUND (Force it to render first)
            ctx.fillStyle = '#111214'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. THEME COLOR
            const themeColor = config.embedColor || '#00d2ff';

            // 3. AVATAR DRAWING
            try {
                const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png', size: 256 }));
                ctx.save();
                ctx.beginPath();
                ctx.arc(135, 135, 100, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 35, 35, 200, 200);
                ctx.restore();
                
                // Avatar Border
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 10;
                ctx.strokeRect(35, 35, 200, 200); 
            } catch (e) {
                ctx.fillStyle = themeColor;
                ctx.fillRect(35, 35, 200, 200);
            }

            // 4. PROGRESS BAR
            const barX = 280, barY = 180, barWidth = 580, barHeight = 40;
            
            ctx.fillStyle = '#333639'; // Gray Background
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = themeColor; // Progress Fill
            const fillWidth = (progressData.progress / 100) * barWidth;
            ctx.fillRect(barX, barY, fillWidth, barHeight);

            // 5. TEXT RENDERING (The Critical Fix)
            // Using 'Arial' or 'sans-serif' specifically for Linux compatibility
            ctx.fillStyle = '#FFFFFF';
            
            // Username
            ctx.font = 'bold 40px sans-serif';
            ctx.fillText(targetMember.user.username.toUpperCase(), barX, 80);

            // Stats
            ctx.font = '30px sans-serif';
            ctx.fillText(`LEVEL ${userLevel.level}  |  RANK #${rank}`, barX, 135);

            // XP String
            ctx.font = '20px sans-serif';
            const xpText = `${progressData.currentLevelXp.toLocaleString()} / ${progressData.requiredXp.toLocaleString()} XP (${progressData.progress}%)`;
            ctx.fillText(xpText, barX, 250);

            // EXPORT
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
            return message.reply({ content: `📊 **Rank card for ${targetMember.user.username}**`, files: [attachment] });

        } catch (err) {
            console.error(err);
            message.reply("❌ Rendering engine error. Reverting to text: Level " + userLevel.level);
        }
    }
};
