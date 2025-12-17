const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator'); // Import fixed
const UserLevel = require('../../models/UserLevel');

module.exports = {
    data: {
        name: 'level',
        aliases: ['rank', 'lvl'],
        description: 'Shows your rank card.'
    },
    async execute(message, args, client, config) {
        const targetMember = message.mentions.members.first() || message.member;

        try {
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            
            // This now works because of the fix in xpCalculator.js
            const progressData = getXpProgress(userLevel.xp, userLevel.level);

            const allUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const rank = allUsers.findIndex(u => u.userId === targetMember.id) + 1;

            const canvas = createCanvas(900, 270);
            const ctx = canvas.getContext('2d');

            // 1. Fill Background (Fixes blank image)
            ctx.fillStyle = '#111214'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const themeColor = config?.embedColor || '#5865F2';

            // 2. Draw Text (Safe Serif Font)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 40px serif';
            ctx.fillText(targetMember.user.username.toUpperCase(), 280, 80);

            ctx.font = '30px serif';
            ctx.fillText(`LEVEL ${userLevel.level}  |  RANK #${rank}`, 280, 130);

            // 3. Progress Bar
            ctx.fillStyle = '#2C2F33'; 
            ctx.fillRect(280, 175, 580, 40);

            ctx.fillStyle = themeColor;
            const fillWidth = (progressData.progress / 100) * 580;
            ctx.fillRect(280, 175, Math.max(fillWidth, 10), 40);

            // 4. Avatar
            try {
                const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png', size: 256 }));
                ctx.drawImage(avatar, 40, 40, 190, 190);
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 6;
                ctx.strokeRect(40, 40, 190, 190);
            } catch (e) {
                ctx.fillStyle = themeColor;
                ctx.fillRect(40, 40, 190, 190);
            }

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
            return message.reply({ files: [attachment] });

        } catch (error) {
            console.error('Canvas Error:', error);
            message.reply("❌ There was an error rendering the rank card.");
        }
    }
};
