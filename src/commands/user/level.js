const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');
const UserLevel = require('../../models/UserLevel');

module.exports = {
    data: {
        name: 'level',
        aliases: ['rank', 'lvl'],
        description: 'Displays a high-stability rank card.'
    },
    async execute(message, args, client, config) {
        const targetMember = message.mentions.members.first() || message.member;
        
        try {
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            const progressData = getXpProgress(userLevel.xp, userLevel.level);
            const allUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const rank = allUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // 1. CANVAS SETUP (900x270 is a stable ratio)
            const canvas = createCanvas(900, 270);
            const ctx = canvas.getContext('2d');

            // 2. FORCE BACKGROUND (This prevents the "Black Box" issue)
            ctx.fillStyle = '#111214'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const themeColor = config.embedColor || '#5865F2';

            // 3. DRAW TEXT (Using 'serif' fallback for Linux/Render)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 40px serif';
            ctx.fillText(targetMember.user.username.toUpperCase(), 280, 80);

            ctx.font = '30px serif';
            ctx.fillText(`LEVEL ${userLevel.level}  |  RANK #${rank}`, 280, 130);

            // 4. PROGRESS BAR (Rectangles only - arc/roundRect often fail on Render)
            ctx.fillStyle = '#2C2F33'; // Track
            ctx.fillRect(280, 170, 580, 40);

            ctx.fillStyle = themeColor; // Fill
            const fillWidth = (progressData.progress / 100) * 580;
            ctx.fillRect(280, 170, Math.max(fillWidth, 10), 40);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '20px serif';
            ctx.fillText(`${userLevel.xp.toLocaleString()} XP`, 280, 240);

            // 5. AVATAR (Try/Catch to prevent crashes if Discord is slow)
            try {
                const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png', size: 256 }));
                ctx.drawImage(avatar, 40, 40, 190, 190);
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 5;
                ctx.strokeRect(40, 40, 190, 190);
            } catch (e) {
                ctx.fillStyle = themeColor;
                ctx.fillRect(40, 40, 190, 190);
            }

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
            return await message.reply({ 
                content: `📊 **Rank card for ${targetMember.user.username}**`, 
                files: [attachment] 
            });

        } catch (error) {
            console.error('Canvas Error:', error);
            message.reply("❌ There was a rendering error on the server.");
        }
    }
};
